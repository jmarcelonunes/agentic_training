'use client'

import { useState, useEffect } from 'react'
import { getStats, getHealth, StatsResponse, HealthResponse } from '@/lib/api'

export default function Dashboard() {
  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      getStats().catch(() => null),
      getHealth().catch(() => null),
    ]).then(([s, h]) => {
      if (s) setStats(s)
      if (h) setHealth(h)
      if (!s && !h) setError('Cannot connect to backend. Is the API server running?')
    })
  }, [])

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-white">Codebase RAG System</h1>
        <p className="mt-2 text-gray-400">
          Point to a public GitHub repo and ask questions about it using AI-powered retrieval.
        </p>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-200 rounded-lg p-4">
          {error}
        </div>
      )}

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide">Backend Status</h3>
          <p className="mt-2 text-2xl font-bold">
            {health ? (
              <span className="text-green-400">● Healthy</span>
            ) : (
              <span className="text-red-400">● Offline</span>
            )}
          </p>
          {health && (
            <p className="mt-1 text-sm text-gray-500">Provider: {health.provider}</p>
          )}
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide">Indexed Chunks</h3>
          <p className="mt-2 text-2xl font-bold text-white">
            {stats ? stats.count : '—'}
          </p>
          {stats && (
            <p className="mt-1 text-sm text-gray-500">Collection: {stats.name}</p>
          )}
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide">Quick Actions</h3>
          <div className="mt-3 flex flex-col gap-2">
            <a href="/index-code" className="text-blue-400 hover:text-blue-300 text-sm">
              → Index a GitHub repo
            </a>
            <a href="/query" className="text-blue-400 hover:text-blue-300 text-sm">
              → Query the codebase
            </a>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-4">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <div>
            <h3 className="font-medium text-blue-400 mb-2">1. Index</h3>
            <p className="text-gray-400">
              Point to a public GitHub repo. The system downloads the code, chunks it intelligently
              (by functions, classes, etc.) and creates vector embeddings for each chunk.
            </p>
          </div>
          <div>
            <h3 className="font-medium text-green-400 mb-2">2. Query</h3>
            <p className="text-gray-400">
              Ask questions about your codebase in natural language. The system retrieves the
              most relevant code chunks and uses an LLM to generate an accurate answer.
            </p>
          </div>
        </div>
      </div>

      {/* Architecture */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Architecture</h2>
        <pre className="text-gray-400 text-xs font-mono overflow-x-auto">{`
  GitHub Repo → Download → Chunk → Embed → Store (ChromaDB)
                                                ↓
  Question → Embed → Search → Retrieve Top-K → LLM Generate → Answer
                                                ↓
  Eval Examples → RAG Pipeline → Compare Ground Truth → Metrics
        `}</pre>
      </div>
    </div>
  )
}
