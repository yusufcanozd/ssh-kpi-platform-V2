'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'dark' | 'light'
interface ThemeContextType { theme: Theme; toggleTheme: () => void }

const ThemeContext = createContext<ThemeContextType>({ theme: 'light', toggleTheme: () => {} })

function applyTheme(t: Theme) {
  // html elementine uygula — body'den önce paint ediliyor
  const root = document.documentElement
  if (t === 'light') {
    root.classList.add('light')
    root.classList.remove('dark')
    document.body.classList.add('light')
    document.body.classList.remove('dark')
  } else {
    root.classList.add('dark')
    root.classList.remove('light')
    document.body.classList.remove('light')
    document.body.classList.add('dark')
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light')

  useEffect(() => {
    const saved = (localStorage.getItem('ssh-theme') as Theme) ?? 'light'
    setTheme(saved)
    applyTheme(saved)
  }, [])

  const toggleTheme = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('ssh-theme', next)
    applyTheme(next)
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
