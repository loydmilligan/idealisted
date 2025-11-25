import './globals.css'
import '../styles/retro.css'
import '../styles/modern.css'
import type { Metadata } from 'next'
import '@/lib/init'

export const metadata: Metadata = {
  title: 'IdeaListed - Idea Capture & Task Management',
  description: 'Capture, sort, and track your ideas with retro Palm Pilot style',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
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
