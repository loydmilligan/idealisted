'use client'

import { useState, useEffect } from 'react'
import { RetroCard } from './RetroCard'
import { RetroButton } from './RetroButton'
import { RetroIcon } from './RetroIcon'
import { AISuggestion } from '@/types'

interface AISuggestionPanelProps {
  suggestion: AISuggestion | null
  isLoading: boolean
  onApplySuggestion: (type: 'todo' | 'note' | 'task' | 'project' | 'list') => void
  onDismiss: () => void
}

export function AISuggestionPanel({
  suggestion,
  isLoading,
  onApplySuggestion,
  onDismiss
}: AISuggestionPanelProps) {
  const [featureEnabled, setFeatureEnabled] = useState(false)
  const [featureCheckComplete, setFeatureCheckComplete] = useState(false)

  // Check if suggestion_panel feature is enabled
  useEffect(() => {
    fetch('/api/ai-features')
      .then(res => res.json())
      .then(data => {
        const feature = data.features?.find((f: any) => f.feature_name === 'suggestion_panel')
        setFeatureEnabled(feature?.enabled === 1)
        setFeatureCheckComplete(true)
      })
      .catch(() => {
        console.log('Failed to check suggestion_panel feature flag')
        setFeatureEnabled(false)
        setFeatureCheckComplete(true)
      })
  }, [])

  // Don't render anything until feature check is complete
  if (!featureCheckComplete) {
    return null
  }

  // Hide panel if feature is disabled
  if (!featureEnabled) {
    console.log('AI suggestion panel hidden: feature disabled')
    return null
  }

  if (isLoading) {
    return (
      <RetroCard className="palm-ai-suggestion">
        <div className="flex items-center justify-center py-4">
          <div className="text-center text-xs opacity-70">
            <RetroIcon type="ai" size="md" />
            <p className="mt-2">🤖 AI is analyzing...</p>
          </div>
        </div>
      </RetroCard>
    )
  }

  if (!suggestion) {
    return null
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'todo': return <RetroIcon type="task" size="sm" />
      case 'note': return <RetroIcon type="note" size="sm" />
      case 'task': return <RetroIcon type="task" size="sm" />
      case 'project': return <RetroIcon type="project" size="sm" />
      default: return <RetroIcon type="idea" size="sm" />
    }
  }

  const getTypeLabel = (type: string) => {
    return type.toUpperCase()
  }

  return (
    <RetroCard className="palm-ai-suggestion">
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RetroIcon type="ai" size="sm" />
            <span className="text-xs font-bold uppercase tracking-wide">
              AI SUGGESTION
            </span>
            <span className="text-xs opacity-70">
              {Math.round(suggestion.confidence * 100)}% confidence
            </span>
          </div>
          <RetroButton
            onClick={onDismiss}
            variant="danger"
            size="sm"
            title="Dismiss suggestion"
          >
            ✕
          </RetroButton>
        </div>

        {/* Processed Text */}
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-wide">Suggested Text:</p>
          <p className="text-sm bg-retro-surface p-2 rounded border border-retro-border">
            {suggestion.processed_text}
          </p>
        </div>

        {/* Tags */}
        {suggestion.tags.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wide">Tags:</p>
            <div className="flex flex-wrap gap-1">
              {suggestion.tags.map((tag, index) => (
                <span 
                  key={index}
                  className="text-xs bg-retro-primary text-retro-status-text px-2 py-1 rounded border border-retro-border"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Additional Fields */}
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-wide">Details:</p>
          <div className="text-xs space-y-1">
            {suggestion.additional_fields.priority && (
              <p>• Priority: {suggestion.additional_fields.priority}/3</p>
            )}
            {suggestion.additional_fields.due_date && (
              <p>• Due: {suggestion.additional_fields.due_date}</p>
            )}
            {suggestion.additional_fields.category && (
              <p>• Category: {suggestion.additional_fields.category}</p>
            )}
            {suggestion.additional_fields.estimated_time && (
              <p>• Est. Time: {suggestion.additional_fields.estimated_time}h</p>
            )}
            {suggestion.additional_fields.deadline && (
              <p>• Deadline: {suggestion.additional_fields.deadline}</p>
            )}
            {suggestion.additional_fields.status && (
              <p>• Status: {suggestion.additional_fields.status}</p>
            )}
          </div>
        </div>

        {/* Reasoning */}
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-wide">Why:</p>
          <p className="text-xs opacity-80 italic">{suggestion.reasoning}</p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide">Convert to:</p>
          <div className="grid grid-cols-2 gap-2">
            <RetroButton
              onClick={() => onApplySuggestion(suggestion.suggested_type)}
              variant="primary"
              size="sm"
              className="flex items-center gap-1"
            >
              {getTypeIcon(suggestion.suggested_type)}
              {getTypeLabel(suggestion.suggested_type)}
            </RetroButton>
            
            {/* Other conversion options */}
            {(['todo', 'note', 'task', 'project'] as const)
              .filter(type => type !== suggestion.suggested_type)
              .map(type => (
                <RetroButton
                  key={type}
                  onClick={() => onApplySuggestion(type)}
                  variant="secondary"
                  size="sm"
                  className="flex items-center gap-1"
                >
                  {getTypeIcon(type)}
                  {getTypeLabel(type)}
                </RetroButton>
              ))}
          </div>
        </div>
      </div>
    </RetroCard>
  )
}
