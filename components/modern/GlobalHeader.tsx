'use client'

import React, { useState, useEffect } from 'react'
import { Settings } from 'lucide-react'
import { GridLogo } from './GridLogo'

interface GlobalHeaderProps {
  activeTab: 'capture' | 'unsorted' | 'ready' | 'files' | 'planner'
  unsortedCount?: number
  readyCount?: number
  onSettingsClick: () => void
  subHeaderText?: string
}

export const GlobalHeader: React.FC<GlobalHeaderProps> = ({
  activeTab,
  unsortedCount = 0,
  readyCount = 0,
  onSettingsClick,
  subHeaderText,
}) => {
  const [time, setTime] = useState(new Date())
  const [isFlashing, setIsFlashing] = useState(false)
  const [prevReadyCount, setPrevReadyCount] = useState(readyCount)

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 60000) // Update every minute
    return () => clearInterval(timer)
  }, [])

  // Flash animation when Ready count increases
  useEffect(() => {
    if (readyCount > prevReadyCount && prevReadyCount > 0) {
      setIsFlashing(true)
      setTimeout(() => setIsFlashing(false), 1200)
    }
    setPrevReadyCount(readyCount)
  }, [readyCount])

  const formatTime = (date: Date) => {
    const hours = date.getHours()
    const minutes = date.getMinutes()
    const ampm = hours >= 12 ? 'PM' : 'AM'
    const displayHours = hours % 12 || 12
    return `${displayHours}:${minutes.toString().padStart(2, '0')}${ampm.toLowerCase()}`
  }

  const formatDate = (date: Date) => {
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
    return `${months[date.getMonth()]} ${date.getDate()}`
  }

  const getSubheaderText = () => {
    switch (activeTab) {
      case 'capture':
        return 'CAPTURE'
      case 'unsorted':
        return `UNSORTED (${unsortedCount})`
      case 'ready':
        return `READY (${readyCount})`
      case 'files':
        return 'FILES'
      default:
        return ''
    }
  }

  return (
    <div className="retro-global-header">
      {/* Main header row */}
      <div className="retro-header-main">
        <div className="retro-header-left">
          <h1 className="retro-app-title">IDEALISTED V1.0</h1>
        </div>
        <div className="retro-header-right">
          <span className="retro-clock">{formatTime(time)}</span>
          <span className="retro-date">{formatDate(time)}</span>
          <button className="retro-settings-btn" onClick={onSettingsClick}>
            <Settings size={18} />
          </button>
          <GridLogo />
        </div>
      </div>

      {/* Tagline row */}
      <div className="retro-header-tagline">
        CAPTURE • SORT • TRACK • LEARN
      </div>

      {/* Dynamic subheader */}
      <div className={`retro-header-subheader ${isFlashing && activeTab === 'ready' ? 'flash-ready' : ''}`}>
        {getSubheaderText()}
      </div>
    </div>
  )
}
