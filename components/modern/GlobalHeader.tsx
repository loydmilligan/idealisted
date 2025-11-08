'use client'

import React, { useState, useEffect } from 'react'
import { Settings } from 'lucide-react'

interface GlobalHeaderProps {
  activeTab: 'capture' | 'unsorted' | 'ready' | 'files'
  unsortedCount?: number
  readyCount?: number
  onSettingsClick: () => void
}

export const GlobalHeader: React.FC<GlobalHeaderProps> = ({
  activeTab,
  unsortedCount = 0,
  readyCount = 0,
  onSettingsClick,
}) => {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 60000) // Update every minute
    return () => clearInterval(timer)
  }, [])

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
          <div className="retro-grid-logo">
            <div className="grid-square" />
            <div className="grid-square" />
            <div className="grid-square" />
            <div className="grid-square" />
          </div>
        </div>
      </div>

      {/* Tagline row */}
      <div className="retro-header-tagline">
        CAPTURE • SORT • TRACK • LEARN
      </div>

      {/* Dynamic subheader */}
      <div className="retro-header-subheader">
        {getSubheaderText()}
      </div>
    </div>
  )
}
