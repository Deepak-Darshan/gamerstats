import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'GamerStats',
  description: 'Social stats dashboard for gamers',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`h-full ${inter.className}`}>
      <body className="min-h-full bg-[#080B14] text-[#F1F5F9]">{children}</body>
    </html>
  )
}
