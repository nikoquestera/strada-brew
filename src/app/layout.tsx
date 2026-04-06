import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Strada Coffee — Karir & Lowongan Kerja',
  description: 'Bergabunglah bersama tim Strada Coffee Indonesia. Lihat posisi terbuka dan daftarkan dirimu sekarang.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className={inter.className}>{children}</body>
    </html>
  )
}