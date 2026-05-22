'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'dark' | 'light'
interface ThemeContextType { theme: Theme; toggleTheme: () => void }

const ThemeContext = createContext<ThemeContextType>({ theme: 'light', toggleTheme: () => {} })

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // SSR'da light, client'ta localStorage'dan oku
  const [theme, setTheme] = useState<Theme>('light')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Sadece client'ta çalışır — flash yok çünkü inline script zaten class'ı ayarladı
    const saved = localStorage.getItem('ssh-theme') as Theme | null
    const resolved = saved ?? 'light'
    setTheme(resolved)
    setMounted(true)
    document.documentElement.classList.remove('light-pre')
    document.body.classList.toggle('light', resolved === 'light')
  }, [])

  useEffect(() => {
    if (!mounted) return
    document.body.classList.toggle('light', theme === 'light')
  }, [theme, mounted])

  const toggleTheme = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('ssh-theme', next)
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
