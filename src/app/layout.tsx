// src/app/layout.tsx
import type { Metadata, Viewport } from 'next'
import { Playfair_Display, DM_Sans } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import { PWAProvider } from '@/components/pwa/PWAProvider'
import './globals.css'

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'IKA UPK-Kr FT UNSRAT | Platform Konseling Alumni',
  description:
    'Platform konseling dan komunitas rohani Ikatan Alumni UPK-Kr Fakultas Teknik Universitas Sam Ratulangi.',
  manifest: '/manifest.json',
  icons: {
    // Pakai berkas yang BENAR-BENAR ada di public/ — sebelumnya menunjuk
    // /favicon.ico dan /apple-touch-icon.png yang tidak pernah ada sehingga
    // setiap halaman menghasilkan 404.
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/apple-icon.png',
    shortcut: '/favicon.ico',
  },
  openGraph: {
    title: 'IKA UPK-Kr FT UNSRAT',
    description: 'Ruang aman untuk berbagi, berdoa, dan bertumbuh bersama',
    type: 'website',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#4A3020',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${playfair.variable} ${dmSans.variable}`}>
      <body>
        {children}
        <PWAProvider />
        <Toaster
          position="bottom-center"
          toastOptions={{
            style: {
              background: '#4A3020',
              color: '#FDF8F2',
              fontFamily: 'var(--font-dm-sans)',
              fontSize: '14px',
              borderRadius: '10px',
              padding: '12px 16px',
            },
          }}
        />
      </body>
    </html>
  )
}
