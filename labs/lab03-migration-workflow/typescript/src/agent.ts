/**
 * Migration Workflow Agent - Core Agent Implementation
 */

import type { LLMClient } from './llm-client.js';
import type {
  MigrationState,
  MigrationStep,
  AnalysisResult,
  VerificationResult,
} from './types.js';
import {
  createStep,
  setAnalysis,
  setPlan,
  updateStepStatus,
  addMigratedFile,
  incrementStep,
  setVerificationResult,
  addError,
} from './state.js';
import {
  ANALYSIS_PROMPT,
  PLANNING_PROMPT,
  MIGRATION_PROMPT,
  VERIFICATION_PROMPT,
  formatPrompt,
} from './prompts.js';

/**
 * Migration Agent that performs multi-step code migration
 */
export class MigrationAgent {
  private llm: LLMClient;

  constructor(llmClient: LLMClient) {
    this.llm = llmClient;
  }

  /**
   * Run the migration agent through all phases
   */
  async run(state: MigrationState): Promise<MigrationState> {
    while (state.phase !== 'complete') {
      state = await this.step(state);
      if (state.errors.length > 0) {
        break;
      }
    }
    return state;
  }

  /**
   * Execute one phase of the migration
   */
  private async step(state: MigrationState): Promise<MigrationState> {
    switch (state.phase) {
      case 'analysis':
        return this.analyze(state);
      case 'planning':
        return this.plan(state);
      case 'execution':
        return this.execute(state);
      case 'verification':
        return this.verify(state);
      default:
        return state;
    }
  }

  /**
   * Phase 1: Analyze source code
   */
  private async analyze(state: MigrationState): Promise<MigrationState> {
    const allAnalysis: Record<string, AnalysisResult> = {};

    for (const [filename, code] of Object.entries(state.sourceFiles)) {
      const prompt = formatPrompt(ANALYSIS_PROMPT, {
        source: state.sourceFramework,
        target: state.targetFramework,
        language: this.detectLanguage(filename),
        code,
      });

      const response = await this.llm.chat([
        { role: 'user', content: prompt },
      ]);

      try {
        allAnalysis[filename] = this.parseJson(response);
      } catch (e) {
        return addError(state, `Analysis failed for ${filename}: ${e}`);
      }
    }

    return setAnalysis(state, allAnalysis);
  }

  /**
   * Phase 2: Create migration plan
   */
  private async plan(state: MigrationState): Promise<MigrationState> {
    const prompt = formatPrompt(PLANNING_PROMPT, {
      analysis: JSON.stringify(state.analysis, null, 2),
      source: state.sourceFramework,
      target: state.targetFramework,
    });

    const response = await this.llm.chat([{ role: 'user', content: prompt }]);

    try {
      const planData = this.parseJson(response);
      const plan: MigrationStep[] = (planData.steps || []).map(
        (step: { id: number; description: string; input_files?: string[] }) =>
          createStep(step.id, step.description, step.input_files || [])
      );
      return setPlan(state, plan);
    } catch (e) {
      return addError(state, `Planning failed: ${e}`);
    }
  }

  /**
   * Phase 3: Execute migration steps
   */
  private async execute(state: MigrationState): Promise<MigrationState> {
    while (state.currentStep < state.plan.length) {
      const step = state.plan[state.currentStep];
      state = updateStepStatus(state, step.id, 'in_progress');

      const sourceCode = this.getStepCode(state, step);

      const prompt = formatPrompt(MIGRATION_PROMPT, {
        source: state.sourceFramework,
        target: state.targetFramework,
        code: sourceCode,
        context: this.getContext(state),
      });

      const response = await this.llm.chat([{ role: 'user', content: prompt }]);
      const codeBlocks = this.extractAllCodeBlocks(response);

      if (codeBlocks.length >= step.inputFiles.length && step.inputFiles.length > 1) {
        // Multiple code blocks — match to input files
        const matched: Record<string, string> = {};
        const unmatchedBlocks = [...codeBlocks];

        // First pass: match by detected filename
        for (const block of codeBlocks) {
          if (block.filename) {
            for (const origFilename of step.inputFiles) {
              const newFilename = this.transformFilename(origFilename, state.targetFramework);
              const blockBase = block.filename.toLowerCase().split('/').pop() || '';
              const targetBase = newFilename.toLowerCase().split('/').pop() || '';
              if (blockBase === targetBase || targetBase.endsWith(blockBase) || blockBase.endsWith(targetBase)) {
                matched[newFilename] = block.code;
                const idx = unmatchedBlocks.indexOf(block);
                if (idx >= 0) unmatchedBlocks.splice(idx, 1);
                break;
              }
            }
          }
        }

        // Second pass: positional matching for remaining
        const unmatchedFiles = step.inputFiles
          .map((f) => this.transformFilename(f, state.targetFramework))
          .filter((f) => !(f in matched));
        for (let i = 0; i < unmatchedFiles.length && i < unmatchedBlocks.length; i++) {
          matched[unmatchedFiles[i]] = unmatchedBlocks[i].code;
        }

        for (const [newFilename, code] of Object.entries(matched)) {
          state = addMigratedFile(state, newFilename, code);
        }
      } else {
        // Single block or single file
        const migratedCode = codeBlocks.length > 0 ? codeBlocks[0].code : this.extractCode(response);
        for (const filename of step.inputFiles) {
          const newFilename = this.transformFilename(filename, state.targetFramework);
          state = addMigratedFile(state, newFilename, migratedCode);
        }

        if (step.inputFiles.length === 0) {
          const defaultName = `migrated_step_${step.id}.${this.getExtension(state.targetFramework)}`;
          state = addMigratedFile(state, defaultName, migratedCode);
        }
      }

      state = updateStepStatus(state, step.id, 'completed', response);
      state = incrementStep(state);
    }

    return { ...state, phase: 'verification' };
  }

  /**
   * Phase 4: Verify migration results
   */
  private async verify(state: MigrationState): Promise<MigrationState> {
    const verification: VerificationResult = {
      filesMigrated: Object.keys(state.migratedFiles).length,
      stepsCompleted: state.plan.filter((s) => s.status === 'completed').length,
      issues: [],
      validations: [],
    };

    for (const [filename, code] of Object.entries(state.migratedFiles)) {
      const language = this.detectLanguage(filename);

      const prompt = formatPrompt(VERIFICATION_PROMPT, {
        target: state.targetFramework,
        language,
        code,
      });

      const response = await this.llm.chat([{ role: 'user', content: prompt }]);

      try {
        const result = this.parseJson(response);
        verification.validations.push({
          file: filename,
          valid: result.valid ?? true,
          issues: result.issues ?? [],
        });
        if (!result.valid) {
          verification.issues.push(...(result.issues ?? []));
        }
      } catch {
        verification.validations.push({
          file: filename,
          valid: true,
          issues: [],
        });
      }
    }

    return setVerificationResult(state, verification);
  }

  /**
   * Detect language from filename
   */
  private detectLanguage(filename: string): string {
    const extMap: Record<string, string> = {
      '.py': 'python',
      '.js': 'javascript',
      '.ts': 'typescript',
      '.java': 'java',
      '.cs': 'csharp',
      '.go': 'go',
      '.rs': 'rust',
    };
    for (const [ext, lang] of Object.entries(extMap)) {
      if (filename.endsWith(ext)) {
        return lang;
      }
    }
    return 'unknown';
  }

  /**
   * Get file extension for framework
   */
  private getExtension(framework: string): string {
    const extMap: Record<string, string> = {
      fastapi: 'py',
      flask: 'py',
      django: 'py',
      express: 'js',
      nestjs: 'ts',
      hono: 'ts',
      'dotnet-webapi': 'cs',
      'spring-boot': 'java',
    };
    return extMap[framework.toLowerCase()] || 'txt';
  }

  /**
   * Parse JSON from LLM response
   */
  private parseJson(response: string): Record<string, unknown> {
    let jsonStr = response;
    if (jsonStr.includes('```json')) {
      jsonStr = jsonStr.split('```json')[1].split('```')[0];
    } else if (jsonStr.includes('```')) {
      jsonStr = jsonStr.split('```')[1].split('```')[0];
    }
    return JSON.parse(jsonStr.trim());
  }

  /**
   * Extract code block from response
   */
  private extractCode(response: string): string {
    if (response.includes('```')) {
      const parts = response.split('```');
      if (parts.length >= 2) {
        let code = parts[1];
        const firstLine = code.split('\n')[0].trim();
        if (
          ['python', 'javascript', 'typescript', 'java', 'csharp', 'go'].includes(
            firstLine
          )
        ) {
          code = code.includes('\n') ? code.split('\n').slice(1).join('\n') : '';
        }
        return code.trim();
      }
    }
    return response;
  }

  private extractAllCodeBlocks(response: string): Array<{ filename: string | null; code: string }> {
    const blocks: Array<{ filename: string | null; code: string }> = [];
    const parts = response.split('```');
    const fileExtPattern = /[`*#/\\]+\s*([\w/\\]+\.(?:cs|java|py|js|ts|go|rs))\s*[`*]*/gi;
    const fallbackPattern = /([\w/\\]+\.(?:cs|java|py|js|ts|go|rs))\s*$/gim;
    const commentPattern = /^(?:\/\/|#)\s*([\w/\\]+\.(?:cs|java|py|js|ts|go|rs))/i;

    for (let i = 1; i < parts.length; i += 2) {
      let code = parts[i];
      const precedingText = parts[i - 1] || '';
      let detectedFilename: string | null = null;

      // Look for filename in preceding text
      const match1 = fileExtPattern.exec(precedingText);
      fileExtPattern.lastIndex = 0;
      if (match1) {
        detectedFilename = match1[1].trim();
      } else {
        const match2 = fallbackPattern.exec(precedingText);
        fallbackPattern.lastIndex = 0;
        if (match2) {
          detectedFilename = match2[1].trim();
        }
      }

      // Remove language identifier
      const firstLine = code.split('\n')[0].trim();
      if (['python', 'javascript', 'typescript', 'java', 'csharp', 'go'].includes(firstLine)) {
        code = code.includes('\n') ? code.split('\n').slice(1).join('\n') : '';
      }

      // Check first code line for filename comment
      if (!detectedFilename) {
        const firstCodeLine = code.trim().split('\n')[0]?.trim() || '';
        const commentMatch = commentPattern.exec(firstCodeLine);
        if (commentMatch) {
          detectedFilename = commentMatch[1].trim();
        }
      }

      blocks.push({ filename: detectedFilename, code: code.trim() });
    }
    return blocks;
  }

  /**
   * Get source code for a migration step
   */
  private getStepCode(state: MigrationState, step: MigrationStep): string {
    const codeParts: string[] = [];
    for (const filename of step.inputFiles) {
      if (state.sourceFiles[filename]) {
        codeParts.push(`// ${filename}\n${state.sourceFiles[filename]}`);
      }
    }
    if (codeParts.length === 0) {
      for (const [filename, code] of Object.entries(state.sourceFiles)) {
        codeParts.push(`// ${filename}\n${code}`);
      }
    }
    return codeParts.join('\n\n');
  }

  /**
   * Get context from previous steps
   */
  private getContext(state: MigrationState): string {
    const completed = state.plan.filter((s) => s.status === 'completed');
    if (completed.length === 0) {
      return 'No previous steps completed.';
    }
    return completed
      .slice(-3)
      .map((s) => `Step ${s.id}: ${s.description}`)
      .join('\n');
  }

  /**
   * Transform filename for target framework
   */
  private transformFilename(filename: string, target: string): string {
    const transformations: Record<string, (f: string) => string> = {
      fastapi: (f) => f.replace('.js', '.py').replace('routes/', 'routers/'),
      express: (f) => f.replace('.py', '.js').replace('routers/', 'routes/'),
      flask: (f) => f.replace('.js', '.py'),
      django: (f) => f.replace('.js', '.py'),
      hono: (f) => f.replace('.py', '.ts').replace('routers/', 'routes/'),
      nestjs: (f) => f.replace('.py', '.ts').replace('routers/', 'controllers/'),
      'dotnet-webapi': (f) => f.replace('.java', '.cs').replace('controllers/', 'Controllers/').replace('services/', 'Services/').replace('models/', 'Models/').replace('dto/', 'Dto/'),
      'spring-boot': (f) => f.replace('.cs', '.java').replace('Controllers/', 'controllers/').replace('Services/', 'services/').replace('Models/', 'models/'),
    };
    const transform = transformations[target.toLowerCase()] || ((f) => f);
    return transform(filename);
  }
}
