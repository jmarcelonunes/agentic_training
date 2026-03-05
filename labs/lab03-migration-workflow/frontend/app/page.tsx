'use client'

import { useState, useEffect } from 'react'
import FileInput from './components/FileInput'
import CodeBlock from './components/CodeBlock'
import PhaseIndicator from './components/PhaseIndicator'

interface FileEntry {
  filename: string
  code: string
}

interface StepResult {
  id: number
  description: string
  status: string
}

interface MigrationResponse {
  success: boolean
  migrated_files: Record<string, string>
  plan_executed: StepResult[]
  verification: Record<string, unknown>
  errors: string[]
}

interface Framework {
  name: string
  language: string
}

const SAMPLE_FILES: FileEntry[] = [
  {
    filename: 'controllers/UserController.java',
    code: `package com.example.demo.controllers;

import com.example.demo.models.User;
import com.example.demo.services.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    private UserService userService;

    @GetMapping
    public ResponseEntity<List<User>> getAllUsers() {
        return ResponseEntity.ok(userService.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<User> getUserById(@PathVariable Long id) {
        return userService.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<User> createUser(@RequestBody User user) {
        User created = userService.save(user);
        return ResponseEntity.status(201).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<User> updateUser(@PathVariable Long id, @RequestBody User user) {
        return userService.findById(id)
                .map(existing -> {
                    user.setId(id);
                    return ResponseEntity.ok(userService.save(user));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        if (userService.findById(id).isPresent()) {
            userService.deleteById(id);
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }
}`,
  },
  {
    filename: 'services/UserService.java',
    code: `package com.example.demo.services;

import com.example.demo.models.User;
import com.example.demo.repositories.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class UserService {

    @Autowired
    private UserRepository userRepository;

    public List<User> findAll() {
        return userRepository.findAll();
    }

    public Optional<User> findById(Long id) {
        return userRepository.findById(id);
    }

    public User save(User user) {
        return userRepository.save(user);
    }

    public void deleteById(Long id) {
        userRepository.deleteById(id);
    }
}`,
  },
  {
    filename: 'models/User.java',
    code: `package com.example.demo.models;

import jakarta.persistence.*;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String email;

    @Column
    private String role;

    public User() {}

    public User(String name, String email, String role) {
        this.name = name;
        this.email = email;
        this.role = role;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
}`,
  },
]

export default function Home() {
  const [files, setFiles] = useState<FileEntry[]>([{ filename: '', code: '' }])
  const [sourceFramework, setSourceFramework] = useState('spring-boot')
  const [targetFramework, setTargetFramework] = useState('dotnet-webapi')
  const [frameworks, setFrameworks] = useState<Framework[]>([])
  const [loading, setLoading] = useState(false)
  const [currentPhase, setCurrentPhase] = useState<string | null>(null)
  const [result, setResult] = useState<MigrationResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

  useEffect(() => {
    fetch(`${API_URL}/frameworks`)
      .then((res) => res.json())
      .then((data) => setFrameworks(data.supported || []))
      .catch(() => {
        // Use defaults if backend not reachable
        setFrameworks([
          { name: 'express', language: 'javascript' },
          { name: 'fastapi', language: 'python' },
          { name: 'flask', language: 'python' },
          { name: 'django', language: 'python' },
          { name: 'nestjs', language: 'typescript' },
          { name: 'hono', language: 'typescript' },
          { name: 'spring-boot', language: 'java' },
          { name: 'dotnet-webapi', language: 'csharp' },
        ])
      })
  }, [API_URL])

  const handleFilenameChange = (index: number, value: string) => {
    const updated = [...files]
    updated[index] = { ...updated[index], filename: value }
    setFiles(updated)
  }

  const handleCodeChange = (index: number, value: string) => {
    const updated = [...files]
    updated[index] = { ...updated[index], code: value }
    setFiles(updated)
  }

  const handleRemoveFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index))
  }

  const handleAddFile = () => {
    setFiles([...files, { filename: '', code: '' }])
  }

  const handleLoadSample = () => {
    setFiles(SAMPLE_FILES)
    setSourceFramework('spring-boot')
    setTargetFramework('dotnet-webapi')
  }

  const handleMigrate = async () => {
    setError(null)
    setResult(null)

    // Validate
    const validFiles = files.filter((f) => f.filename.trim() && f.code.trim())
    if (validFiles.length === 0) {
      setError('Please add at least one file with a filename and code.')
      return
    }

    setLoading(true)
    setCurrentPhase('analysis')

    // Simulate phase progression (the backend does it all in one call)
    const phaseTimer = setInterval(() => {
      setCurrentPhase((prev) => {
        if (prev === 'analysis') return 'planning'
        if (prev === 'planning') return 'execution'
        if (prev === 'execution') return 'verification'
        return prev
      })
    }, 3000)

    try {
      const filesMap: Record<string, string> = {}
      validFiles.forEach((f) => {
        filesMap[f.filename.trim()] = f.code
      })

      const response = await fetch(`${API_URL}/migrate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_framework: sourceFramework,
          target_framework: targetFramework,
          files: filesMap,
        }),
      })

      clearInterval(phaseTimer)

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.detail || errData.error || `Request failed (${response.status})`)
      }

      const data: MigrationResponse = await response.json()
      setResult(data)
      setCurrentPhase('complete')

      if (data.errors.length > 0) {
        setError(`Migration completed with errors: ${data.errors.join(', ')}`)
      }
    } catch (err) {
      clearInterval(phaseTimer)
      setCurrentPhase(null)
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('An unexpected error occurred')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadAll = async () => {
    if (!result || Object.keys(result.migrated_files).length === 0) return

    const JSZip = (await import('jszip')).default
    const zip = new JSZip()

    for (const [filename, code] of Object.entries(result.migrated_files)) {
      zip.file(filename, code)
    }

    const blob = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `migrated-${targetFramework}.zip`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleReset = () => {
    setResult(null)
    setError(null)
    setCurrentPhase(null)
    setFiles([{ filename: '', code: '' }])
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 pt-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Migration Workflow
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            AI-powered code migration — paste your source code, get migrated output
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 space-y-6">
          {/* Framework Selectors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Source Framework
              </label>
              <select
                value={sourceFramework}
                onChange={(e) => setSourceFramework(e.target.value)}
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
              >
                {frameworks.map((fw) => (
                  <option key={fw.name} value={fw.name}>
                    {fw.name} ({fw.language})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Target Framework
              </label>
              <select
                value={targetFramework}
                onChange={(e) => setTargetFramework(e.target.value)}
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
              >
                {frameworks.map((fw) => (
                  <option key={fw.name} value={fw.name}>
                    {fw.name} ({fw.language})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Source Files */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Source Files
              </h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleLoadSample}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium rounded-md bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/50 disabled:opacity-50 transition-colors"
                >
                  Load Sample (Spring Boot)
                </button>
                <button
                  type="button"
                  onClick={handleAddFile}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium rounded-md bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50 disabled:opacity-50 transition-colors"
                >
                  + Add File
                </button>
              </div>
            </div>

            {files.map((file, index) => (
              <FileInput
                key={index}
                index={index}
                filename={file.filename}
                code={file.code}
                onFilenameChange={handleFilenameChange}
                onCodeChange={handleCodeChange}
                onRemove={handleRemoveFile}
                canRemove={files.length > 1}
              />
            ))}
          </div>

          {/* Phase Indicator */}
          <PhaseIndicator currentPhase={currentPhase} isLoading={loading} />

          {/* Actions */}
          <div className="flex justify-center gap-4">
            <button
              onClick={handleMigrate}
              disabled={loading}
              className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors shadow-md"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Migrating...
                </span>
              ) : (
                'Migrate'
              )}
            </button>
            {result && (
              <button
                onClick={handleReset}
                className="px-8 py-3 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
              >
                Reset
              </button>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
            </div>
          )}

          {/* Results */}
          {result && result.success && (
            <div className="space-y-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Migrated Files
                </h2>
                <button
                  onClick={handleDownloadAll}
                  className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-md flex items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  Download All as ZIP
                </button>
              </div>

              {/* Plan Summary */}
              {result.plan_executed.length > 0 && (
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Migration Plan Executed
                  </h3>
                  <ol className="space-y-1">
                    {result.plan_executed.map((step) => (
                      <li key={step.id} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <span className={`w-2 h-2 rounded-full ${step.status === 'completed' ? 'bg-green-500' : 'bg-gray-400'}`} />
                        {step.description}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Migrated Files */}
              <div className="space-y-4">
                {Object.entries(result.migrated_files).map(([filename, code]) => (
                  <CodeBlock key={filename} filename={filename} code={code} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6 pb-8">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Lab 03 — Migration Workflow Agent | Agentic AI Training
          </p>
        </div>
      </div>
    </main>
  )
}
