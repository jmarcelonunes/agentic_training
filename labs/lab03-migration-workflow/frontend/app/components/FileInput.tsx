'use client'

import { useState } from 'react'

interface FileInputProps {
  index: number
  filename: string
  code: string
  onFilenameChange: (index: number, value: string) => void
  onCodeChange: (index: number, value: string) => void
  onRemove: (index: number) => void
  canRemove: boolean
}

export default function FileInput({
  index,
  filename,
  code,
  onFilenameChange,
  onCodeChange,
  onRemove,
  canRemove,
}: FileInputProps) {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex-1 mr-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Filename
          </label>
          <input
            type="text"
            value={filename}
            onChange={(e) => onFilenameChange(index, e.target.value)}
            placeholder="e.g. controllers/UserController.java"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        {canRemove && (
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="mt-6 p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
            title="Remove file"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Source Code
        </label>
        <textarea
          value={code}
          onChange={(e) => onCodeChange(index, e.target.value)}
          placeholder="Paste your Java source code here..."
          rows={12}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-mono bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
        />
      </div>
    </div>
  )
}
