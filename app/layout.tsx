import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Arazzo Visualization Tool',
  description: 'Visualize and explore Arazzo API workflow specifications',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="font-sans">{children}</body>
    </html>
  )
}
