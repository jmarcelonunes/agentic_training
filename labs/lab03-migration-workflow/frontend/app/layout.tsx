import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Migration Workflow — Java to .NET',
  description: 'AI-powered code migration from Spring Boot to ASP.NET Web API',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
