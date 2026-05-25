'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'dark' | 'light'
interface ThemeContextType { theme: Theme; toggleTheme: () => void }

const ThemeContext = createContext<ThemeContextType>({ theme: 'light', toggleTheme: () => {} })

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // SSR: 'light' default — flash önleme script'i ile sync (bkz. app/layout.tsx)
  const [theme, setTheme] = useState<Theme>('light')

  useEffect(() => {
    // Client'ta localStorage'dan oku
    const saved = localStorage.getItem('ssh-theme') as Theme | null
    const resolved = saved ?? 'light'
    setTheme(resolved)
    applyTheme(resolved)
  }, [])

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

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

function applyTheme(theme: Theme) {
  // html ve body her ikisine de uygula — CSS var'ların her iki selector'da çalışması için
  const root = document.documentElement
  const body = document.body
  if (theme === 'light') {
    root.classList.add('light')
    root.classList.remove('dark')
    body.classList.add('light')
    body.classList.remove('dark')
  } else {
    root.classList.add('dark')
    root.classList.remove('light')
    body.classList.add('dark')
    body.classList.remove('light')
  }
}

export const useTheme = () => useContext(ThemeContext)
