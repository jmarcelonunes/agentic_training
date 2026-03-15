'use client'

import { useState, useEffect } from 'react'
import { runTask, getHealth, type TaskResponse, type HealthResponse } from '@/lib/api'

export default function Home() {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [task, setTask] = useState('')
  const [maxIterations, setMaxIterations] = useState(5)
  const [result, setResult] = useState<TaskResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getHealth()
      .then(setHealth)
      .catch(() => setHealth(null))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!task.trim()) return

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const res = await runTask({ task: task.trim(), max_iterations: maxIterations })
      setResult(res)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Health Status */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            className={`inline-block w-3 h-3 rounded-full ${health ? 'bg-green-400' : 'bg-red-400'}`}
          />
          <span className="text-sm font-medium text-gray-300">
            Backend: {health ? 'Healthy' : 'Offline'}
          </span>
        </div>
        {health && (
          <span className="text-sm text-gray-500">Provider: {health.provider}</span>
        )}
      </div>

      {/* Task Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="task" className="block text-sm font-medium text-gray-300 mb-2">
            Task
          </label>
          <textarea
            id="task"
            value={task}
            onChange={(e) => setTask(e.target.value)}
            placeholder="Describe a task for the multi-agent system..."
            rows={4}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical"
          />
        </div>

        <div className="flex items-end gap-4">
          <div>
            <label htmlFor="iterations" className="block text-sm font-medium text-gray-300 mb-2">
              Max Iterations
            </label>
            <input
              id="iterations"
              type="number"
              min={1}
              max={10}
              value={maxIterations}
              onChange={(e) => setMaxIterations(Number(e.target.value))}
              className="w-24 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !task.trim()}
            className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Processing...
              </span>
            ) : (
              'Run'
            )}
          </button>
        </div>
      </form>

      {/* Error */}
      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-200 rounded-lg p-4">
          {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Result</h2>
            <span className="text-sm text-gray-500">
              {result.steps_taken} step{result.steps_taken !== 1 ? 's' : ''} taken
            </span>
          </div>
          <div className="text-gray-300 whitespace-pre-wrap leading-relaxed">
            {result.result}
          </div>
        </div>
      )}
    </div>
  )
}
