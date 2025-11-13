import './globals.css'
import '../styles/retro.css'
import type { Metadata } from 'next'
import '@/lib/init'  // Initialize server-side services (scheduler, etc.)

export const metadata: Metadata = {
  title: 'IdeaListed',
  description: 'Capture ideas and convert them into todos, notes, and projects',
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
