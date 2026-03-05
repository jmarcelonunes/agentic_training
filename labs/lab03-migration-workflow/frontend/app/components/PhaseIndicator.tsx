'use client'

const PHASES = [
  { key: 'analysis', label: 'Analysis' },
  { key: 'planning', label: 'Planning' },
  { key: 'execution', label: 'Execution' },
  { key: 'verification', label: 'Verification' },
  { key: 'complete', label: 'Done' },
]

interface PhaseIndicatorProps {
  currentPhase: string | null
  isLoading: boolean
}

export default function PhaseIndicator({ currentPhase, isLoading }: PhaseIndicatorProps) {
  if (!isLoading && !currentPhase) return null

  const currentIndex = PHASES.findIndex((p) => p.key === currentPhase)

  return (
    <div className="flex items-center justify-center gap-2 py-4">
      {PHASES.map((phase, index) => {
        const isActive = index === currentIndex && isLoading
        const isComplete = index < currentIndex || currentPhase === 'complete'

        return (
          <div key={phase.key} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300
                  ${isComplete
                    ? 'bg-green-500 text-white'
                    : isActive
                      ? 'bg-blue-500 text-white animate-pulse'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                  }
                `}
              >
                {isComplete ? '✓' : index + 1}
              </div>
              <span
                className={`text-xs mt-1 ${
                  isActive
                    ? 'text-blue-600 dark:text-blue-400 font-semibold'
                    : isComplete
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-gray-400 dark:text-gray-500'
                }`}
              >
                {phase.label}
              </span>
            </div>
            {index < PHASES.length - 1 && (
              <div
                className={`w-8 h-0.5 mx-1 mb-5 ${
                  isComplete ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
