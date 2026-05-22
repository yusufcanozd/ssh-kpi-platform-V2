import type { Metadata } from 'next'
import { DM_Sans, DM_Mono } from 'next/font/google'
import { AuthProvider } from '@/context/AuthContext'
import { ThemeProvider } from '@/context/ThemeContext'
import './globals.css'

const dmSans = DM_Sans({ subsets:['latin'], variable:'--font-dm-sans', display:'swap' })
const dmMono = DM_Mono({ subsets:['latin'], weight:['400','500'], variable:'--font-dm-mono', display:'swap' })

export const metadata: Metadata = {
  title: 'SSH KPI Platform | Türkiye Otomotiv Sektörü',
  description: 'Satış Sonrası Hizmetler Rekabet Analizi Platformu',
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        {/* Tema flash'ını önle — paint öncesi çalışır */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){
            try {
              var t = localStorage.getItem('ssh-theme') || 'light';
              var root = document.documentElement;
              if (t === 'dark') {
                root.classList.add('dark');
                root.classList.remove('light');
              } else {
                root.classList.add('light');
                root.classList.remove('dark');
              }
            } catch(e) {
              document.documentElement.classList.add('light');
            }
          })();
        `}} />
      </head>
      <body className={`${dmSans.variable} ${dmMono.variable}`}>
        <ThemeProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
