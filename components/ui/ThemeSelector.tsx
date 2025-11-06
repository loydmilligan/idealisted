'use client'

import { useState, useEffect } from 'react'
import { RetroButton } from './RetroButton'
import { RetroCard } from './RetroCard'
import { retroThemes, applyTheme, getStoredTheme, RetroTheme } from '@/lib/themes'

interface ThemeSelectorProps {
  onThemeChange?: (theme: RetroTheme) => void
}

export function ThemeSelector({ onThemeChange }: ThemeSelectorProps) {
  const [currentTheme, setCurrentTheme] = useState<string>(getStoredTheme())

  useEffect(() => {
    const theme = getThemeById(currentTheme)
    if (theme) {
      applyTheme(theme)
    }
  }, [currentTheme])

  const handleThemeChange = (themeId: string) => {
    setCurrentTheme(themeId)
    const theme = getThemeById(themeId)
    if (theme) {
      applyTheme(theme)
      onThemeChange?.(theme)
    }
  }

  const getThemeById = (id: string): RetroTheme | undefined => {
    return retroThemes.find(theme => theme.id === id)
  }

  return (
    <RetroCard inset>
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wide">THEME</h4>
        <div className="space-y-2">
          {retroThemes.map((theme) => (
            <div key={theme.id} className="flex items-center gap-2">
              <input
                type="radio"
                name="theme"
                checked={currentTheme === theme.id}
                onChange={() => handleThemeChange(theme.id)}
                className="palm-checkbox"
              />
              <label className="text-sm flex-1 cursor-pointer">
                {theme.name}
              </label>
              <div className="flex gap-1">
                <div 
                  className="w-4 h-4 rounded border border-retro-border"
                  style={{ backgroundColor: theme.colors.primary }}
                  title="Primary"
                />
                <div 
                  className="w-4 h-4 rounded border border-retro-border"
                  style={{ backgroundColor: theme.colors.background }}
                  title="Background"
                />
                <div 
                  className="w-4 h-4 rounded border border-retro-border"
                  style={{ backgroundColor: theme.colors.buttonFace }}
                  title="Button"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </RetroCard>
  )
}
