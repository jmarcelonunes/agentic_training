'use client'

import { useState } from 'react'
import { indexFiles, indexGitHub, clearIndex } from '@/lib/api'

interface FileEntry {
  filename: string
  content: string
}

export default function IndexCodePage() {
  const [mode, setMode] = useState<'github' | 'files'>('github')
  const [repoUrl, setRepoUrl] = useState('')
  const [branch, setBranch] = useState('main')
  const [extensions, setExtensions] = useState('.py,.js,.ts,.jsx,.tsx')
  const [files, setFiles] = useState<FileEntry[]>([{ filename: '', content: '' }])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState('')

  const addFile = () => setFiles([...files, { filename: '', content: '' }])
  const removeFile = (i: number) => setFiles(files.filter((_, idx) => idx !== i))
  const updateFile = (i: number, field: keyof FileEntry, value: string) => {
    const updated = [...files]
    updated[i] = { ...updated[i], [field]: value }
    setFiles(updated)
  }

  const handleIndexGitHub = async () => {
    setError('')
    setResult(null)
    if (!repoUrl.trim()) {
      setError('Enter a GitHub repository URL.')
      return
    }
    setLoading(true)
    try {
      const exts = extensions.split(',').map(e => e.trim()).filter(Boolean)
      const res = await indexGitHub(repoUrl.trim(), branch || 'main', exts.length > 0 ? exts : undefined)
      setResult(`Indexed ${res.indexed_chunks} chunks from ${res.repo} (branch: ${res.branch})`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to index repository')
    } finally {
      setLoading(false)
    }
  }

  const handleIndexFiles = async () => {
    setError('')
    setResult(null)
    const fileMap: Record<string, string> = {}
    for (const f of files) {
      if (f.filename.trim() && f.content.trim()) {
        fileMap[f.filename.trim()] = f.content
      }
    }
    if (Object.keys(fileMap).length === 0) {
      setError('Add at least one file with a name and content.')
      return
    }
    setLoading(true)
    try {
      const res = await indexFiles(fileMap)
      setResult(`Indexed ${res.indexed_chunks} chunks from ${res.files.length} file(s): ${res.files.join(', ')}`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to index files')
    } finally {
      setLoading(false)
    }
  }

  const handleClear = async () => {
    if (!confirm('Clear all indexed data?')) return
    try {
      await clearIndex()
      setResult('Index cleared successfully.')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to clear index')
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Index Code</h1>
          <p className="text-gray-400 text-sm mt-1">Point to a GitHub repo or paste code files</p>
        </div>
        <button
          onClick={handleClear}
          className="px-4 py-2 bg-red-900/50 border border-red-700 text-red-300 rounded-lg hover:bg-red-800/50 text-sm transition-colors"
        >
          Clear Index
        </button>
      </div>

      {/* Mode Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setMode('github')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === 'github'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:text-white'
          }`}
        >
          GitHub Repo
        </button>
        <button
          onClick={() => setMode('files')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === 'files'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:text-white'
          }`}
        >
          Paste Files
        </button>
      </div>

      {/* GitHub Mode */}
      {mode === 'github' && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Repository URL</label>
            <input
              type="text"
              placeholder="https://github.com/owner/repo"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleIndexGitHub()}
              className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Branch</label>
              <input
                type="text"
                placeholder="main"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">File Extensions</label>
              <input
                type="text"
                value={extensions}
                onChange={(e) => setExtensions(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
          <button
            onClick={handleIndexGitHub}
            disabled={loading || !repoUrl.trim()}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                Cloning &amp; Indexing...
              </span>
            ) : (
              'Index Repository'
            )}
          </button>
          <p className="text-xs text-gray-600">
            Works with any public GitHub repository. The repo is downloaded, chunked, and embedded.
          </p>
        </div>
      )}

      {/* Files Mode */}
      {mode === 'files' && (
        <div className="space-y-4">
          {files.map((file, i) => (
            <div key={i} className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder="filename.py"
                  value={file.filename}
                  onChange={(e) => updateFile(i, 'filename', e.target.value)}
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
                {files.length > 1 && (
                  <button
                    onClick={() => removeFile(i)}
                    className="text-gray-500 hover:text-red-400 text-sm"
                  >
                    Remove
                  </button>
                )}
              </div>
              <textarea
                placeholder="Paste your code here..."
                value={file.content}
                onChange={(e) => updateFile(i, 'content', e.target.value)}
                rows={8}
                className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-white text-sm font-mono placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-y"
              />
            </div>
          ))}
          <div className="flex gap-3">
            <button
              onClick={addFile}
              className="px-4 py-2 bg-gray-800 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-700 text-sm transition-colors"
            >
              + Add File
            </button>
            <button
              onClick={handleIndexFiles}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
            >
              {loading ? 'Indexing...' : 'Index Files'}
            </button>
          </div>
        </div>
      )}

      {/* Result / Error */}
      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-200 rounded-lg p-4 text-sm">
          {error}
        </div>
      )}
      {result && (
        <div className="bg-green-900/50 border border-green-700 text-green-200 rounded-lg p-4 text-sm">
          {result}
        </div>
      )}
    </div>
  )
}
