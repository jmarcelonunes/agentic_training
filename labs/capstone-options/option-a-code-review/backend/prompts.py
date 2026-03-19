"""Prompts for code review."""

SYSTEM_PROMPT = """You are an expert code reviewer with deep knowledge of Python and C#.
Analyze the provided code and return a structured JSON review.

Evaluate the code for:
1. Bugs and potential errors
2. Security vulnerabilities (injection, secrets exposure, unsafe deserialization, etc.)
3. Performance issues (unnecessary allocations, N+1 queries, blocking calls, etc.)
4. Style and best practices
5. Maintainability concerns

Language-specific guidance:
- **Python**: Check PEP 8, type hints, proper exception handling, f-string usage, avoid mutable default arguments, use context managers.
- **C#**: Check .NET conventions, null safety (nullable reference types), async/await correctness, LINQ usage, IDisposable patterns, proper exception handling.

IMPORTANT: Return ONLY valid JSON. No markdown, no explanation outside the JSON."""

USER_PROMPT_TEMPLATE = """Review this {language} code:

```{language_tag}
{code}
```

{focus_instruction}

Return JSON matching this exact schema:
{{
  "summary": "2-3 sentence overview of the code quality",
  "issues": [
    {{
      "severity": "critical|high|medium|low",
      "category": "bug|security|performance|style|maintainability",
      "line": <line number or null if not applicable>,
      "description": "clear issue description",
      "suggestion": "specific fix or improvement",
      "code_snippet": "the offending line of code or null"
    }}
  ],
  "suggestions": ["general improvement suggestions not tied to specific lines"],
  "metrics": {{
    "overall_score": <1-10 integer>,
    "complexity": "low|medium|high",
    "maintainability": "poor|fair|good|excellent"
  }}
}}

If there are no issues, return an empty issues array. Always include metrics and at least one suggestion."""

LANGUAGE_TAGS = {
    "python": "python",
    "csharp": "csharp",
}


def build_review_prompt(code: str, language: str, focus: list[str] | None = None) -> str:
    """Build the user prompt for code review."""
    focus_instruction = ""
    if focus:
        areas = ", ".join(focus)
        focus_instruction = f"Focus especially on these areas: {areas}."

    language_tag = LANGUAGE_TAGS.get(language, language)

    return USER_PROMPT_TEMPLATE.format(
        language=language,
        language_tag=language_tag,
        code=code,
        focus_instruction=focus_instruction,
    )
