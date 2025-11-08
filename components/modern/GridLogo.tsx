'use client'

import React, { useState, useEffect } from 'react'
import { EntityType } from '@/lib/entity-colors'

interface GridLogoProps {
  className?: string
}

type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

export const GridLogo: React.FC<GridLogoProps> = ({ className = '' }) => {
  const [flashingCorner, setFlashingCorner] = useState<Corner | null>(null)
  const [flashColor, setFlashColor] = useState<string>('')
  const [isAiFlash, setIsAiFlash] = useState(false)

  // Expose flash methods via event
  useEffect(() => {
    const handleFlash = (event: CustomEvent<{ entityType: EntityType; isAi?: boolean }>) => {
      const { entityType, isAi = false } = event.detail

      // Map entity type to corner
      const cornerMap: Record<EntityType, Corner> = {
        idea: 'top-left',      // Capture/Unsorted
        task: 'bottom-left',   // Ready
        note: 'bottom-right',  // Files
        project: 'bottom-right',
        list: 'bottom-right',
      }

      const entityColors = {
        task: '#6B8B9E',
        note: '#9E8B6B',
        project: '#7B9E6B',
        list: '#8B6B9E',
        idea: '#8B9E8B',
      }

      setFlashingCorner(cornerMap[entityType])
      setFlashColor(entityColors[entityType] || '#8B9E8B')
      setIsAiFlash(isAi)

      setTimeout(() => {
        setFlashingCorner(null)
        setIsAiFlash(false)
      }, isAi ? 1200 : 600)
    }

    window.addEventListener('grid-logo-flash' as any, handleFlash as EventListener)
    return () => window.removeEventListener('grid-logo-flash' as any, handleFlash as EventListener)
  }, [])

  const getSquareClass = (corner: Corner) => {
    const baseClass = 'grid-square'
    if (isAiFlash) {
      return `${baseClass} grid-square-ai-flash`
    }
    if (flashingCorner === corner) {
      return `${baseClass} grid-square-flash`
    }
    return baseClass
  }

  const getSquareStyle = (corner: Corner) => {
    if (flashingCorner === corner) {
      return { backgroundColor: flashColor }
    }
    return {}
  }

  return (
    <div className={`retro-grid-logo ${className}`}>
      <div className={getSquareClass('top-left')} style={getSquareStyle('top-left')} />
      <div className={getSquareClass('top-right')} style={getSquareStyle('top-right')} />
      <div className={getSquareClass('bottom-left')} style={getSquareStyle('bottom-left')} />
      <div className={getSquareClass('bottom-right')} style={getSquareStyle('bottom-right')} />
    </div>
  )
}

// Helper function to trigger flash
export const triggerGridFlash = (entityType: EntityType, isAi: boolean = false) => {
  window.dispatchEvent(new CustomEvent('grid-logo-flash', {
    detail: { entityType, isAi }
  }))
}
