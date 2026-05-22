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
        {/* Tema flash'ını önle — sayfa boyandıktan önce çalışır */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){
            try {
              var t = localStorage.getItem('ssh-theme');
              // Default: light. Sadece 'dark' kaydedilmişse dark uygula.
              if (t === 'dark') {
                document.body && document.body.classList.remove('light');
              } else {
                // light veya kayıt yoksa — light class'ını body'e hemen ekle
                document.addEventListener('DOMContentLoaded', function() {
                  document.body.classList.add('light');
                });
              }
            } catch(e) {}
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
