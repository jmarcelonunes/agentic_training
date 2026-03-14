'use client'

import { useState } from 'react'
import { queryCodebase, QueryResponse } from '@/lib/api'

export default function QueryPage() {
  const [question, setQuestion] = useState('')
  const [nResults, setNResults] = useState(5)
  const [filterLanguage, setFilterLanguage] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<QueryResponse | null>(null)
  const [showContext, setShowContext] = useState(false)
  const [error, setError] = useState('')

  const handleQuery = async () => {
    if (!question.trim()) return
    setError('')
    setResult(null)
    setLoading(true)
    try {
      const res = await queryCodebase(
        question.trim(),
        nResults,
        filterLanguage || undefined
      )
      setResult(res)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Query failed')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleQuery()
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Query Codebase</h1>
        <p className="text-gray-400 text-sm mt-1">Ask questions about your indexed code</p>
      </div>

      {/* Query Input */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-4">
        <textarea
          placeholder="How does authentication work? What does the login function do?"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={3}
          className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-y"
        />
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Results</label>
            <input
              type="number"
              min={1}
              max={20}
              value={nResults}
              onChange={(e) => setNResults(parseInt(e.target.value) || 5)}
              className="w-20 bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Language Filter</label>
            <select
              value={filterLanguage}
              onChange={(e) => setFilterLanguage(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="">All</option>
              <option value="python">Python</option>
              <option value="javascript">JavaScript</option>
              <option value="typescript">TypeScript</option>
              <option value="java">Java</option>
              <option value="go">Go</option>
            </select>
          </div>
          <button
            onClick={handleQuery}
            disabled={loading || !question.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                Querying...
              </span>
            ) : (
              'Ask'
            )}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-200 rounded-lg p-4 text-sm">
          {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4 animate-fade-in">
          {/* Answer */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-3">Answer</h2>
            <div className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">
              {result.answer}
            </div>
          </div>

          {/* Sources */}
          {result.sources.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-3">
                Sources ({result.sources.length})
              </h2>
              <div className="space-y-2">
                {result.sources.map((source, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between bg-gray-800 rounded-md px-4 py-2 text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-gray-500 font-mono text-xs w-6">#{i + 1}</span>
                      <span className="text-blue-400 font-mono">{source.file}</span>
                      {source.name && (
                        <span className="text-gray-400">
                          {source.type}: <span className="text-yellow-400">{source.name}</span>
                        </span>
                      )}
                      {source.line && (
                        <span className="text-gray-600 text-xs">L{source.line}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-gray-700 rounded-full h-1.5">
                        <div
                          className="bg-green-500 h-1.5 rounded-full"
                          style={{ width: `${(source.relevance) * 100}%` }}
                        />
                      </div>
                      <span className="text-gray-500 text-xs w-12 text-right">
                        {(source.relevance * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Context Used (collapsible) */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg">
            <button
              onClick={() => setShowContext(!showContext)}
              className="w-full flex items-center justify-between p-4 text-sm font-medium text-gray-400 hover:text-white transition-colors"
            >
              <span>Context Used</span>
              <span>{showContext ? '▲' : '▼'}</span>
            </button>
            {showContext && (
              <div className="px-4 pb-4">
                <pre className="code-block text-gray-400 text-xs whitespace-pre-wrap">
                  {result.context_used}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
