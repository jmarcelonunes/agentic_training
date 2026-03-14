import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Codebase RAG System',
  description: 'RAG system for querying codebases with evaluation',
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
    >
      {children}
    </a>
  )
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <nav className="bg-gray-900 border-b border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <a href="/" className="text-xl font-bold text-white">
                🔍 Codebase RAG
              </a>
              <div className="flex space-x-2">
                <NavLink href="/">Dashboard</NavLink>
                <NavLink href="/index-code">Index</NavLink>
                <NavLink href="/query">Query</NavLink>
              </div>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </body>
    </html>
  )
}
