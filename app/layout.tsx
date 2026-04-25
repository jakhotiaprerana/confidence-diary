import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: "Prerana's Story Diary",
  description: 'Your moments, beautifully told',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'My Diary',
  },
  icons: {
    apple: '/icon.svg',
  },
}

export const viewport: Viewport = {
  themeColor: '#fb7185',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-rose-50 min-h-screen`}>{children}</body>
    </html>
  )
}
