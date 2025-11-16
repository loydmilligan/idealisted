'use client'

import { useState, useEffect } from 'react'
import { RetroCard } from './RetroCard'
import { RetroButton } from './RetroButton'
import { RetroIcon } from './RetroIcon'
import { AISuggestion } from '@/types'

interface AISuggestionPanelProps {
  suggestion: AISuggestion | null
  isLoading: boolean
  isCreating?: boolean
  onApplySuggestion: (type: 'todo' | 'note' | 'task' | 'project' | 'list') => void
  onDismiss: () => void
}

export function AISuggestionPanel({
  suggestion,
  isLoading,
  isCreating = false,
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
      case 'todo': return '✓'
      case 'note': return '📝'
      case 'task': return '✓'
      case 'project': return '📁'
      case 'list': return '📋'
      default: return '💡'
    }
  }

  const getTypeLabel = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1)
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
          </div>
          <RetroButton
            onClick={onDismiss}
            variant="danger"
            size="sm"
            disabled={isCreating}
            title="Dismiss suggestion"
          >
            ✕
          </RetroButton>
        </div>

        {/* Confidence Bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-retro-text-secondary uppercase">Confidence</span>
            <span className="font-mono font-semibold">{Math.round(suggestion.confidence * 100)}%</span>
          </div>
          <div
            className="h-2 border border-retro-border overflow-hidden"
            style={{ background: 'var(--retro-screen-dark)' }}
          >
            <div
              className="h-full transition-all duration-300"
              style={{
                width: `${suggestion.confidence * 100}%`,
                background: suggestion.confidence >= 0.7
                  ? 'var(--retro-primary)'
                  : suggestion.confidence >= 0.5
                  ? '#F59E0B'
                  : '#EF4444'
              }}
            />
          </div>
          {suggestion.confidence < 0.5 && (
            <p className="text-xs mt-1" style={{ color: '#EF4444' }}>
              ⚠️ Low confidence - review carefully
            </p>
          )}
        </div>

        {/* Processed Text */}
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-wide">Suggested Text:</p>
          <p className="text-sm bg-retro-surface p-2 rounded border border-retro-border">
            {suggestion.processed_text}
          </p>
        </div>

        {/* Tags */}
        <div className="mb-4">
          <div className="text-xs font-semibold mb-2 text-retro-text-secondary uppercase">Tags</div>
          {suggestion.tags && suggestion.tags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {suggestion.tags.map((tag, i) => (
                <span
                  key={i}
                  className="px-2 py-1 text-xs rounded"
                  style={{
                    background: 'var(--retro-primary)',
                    color: 'var(--retro-bg)',
                  }}
                >
                  #{tag}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-retro-text-secondary italic">
              No tags suggested
            </p>
          )}
        </div>

        {/* Additional Fields */}
        {suggestion.additional_fields && Object.keys(suggestion.additional_fields).length > 0 && (
          <div className="mb-4">
            <div className="text-xs font-semibold mb-2 text-retro-text-secondary uppercase">Extracted Details</div>
            <div className="retro-card p-3 space-y-2">
              {suggestion.additional_fields.priority && (
                <div className="flex items-center gap-2">
                  <span className="text-retro-text-secondary text-xs w-24">Priority:</span>
                  <span className="font-semibold text-sm">
                    {'⭐'.repeat(suggestion.additional_fields.priority)}
                    <span className="text-retro-text-secondary ml-1">
                      ({suggestion.additional_fields.priority}/5)
                    </span>
                  </span>
                </div>
              )}

              {suggestion.additional_fields.due_date && (
                <div className="flex items-center gap-2">
                  <span className="text-retro-text-secondary text-xs w-24">Due Date:</span>
                  <span className="font-semibold text-sm">
                    📅 {(() => {
                      const date = new Date(suggestion.additional_fields.due_date)
                      return isNaN(date.getTime())
                        ? String(suggestion.additional_fields.due_date)
                        : date.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })
                    })()}
                  </span>
                </div>
              )}

              {suggestion.additional_fields.deadline && (
                <div className="flex items-center gap-2">
                  <span className="text-retro-text-secondary text-xs w-24">Deadline:</span>
                  <span className="font-semibold text-sm">
                    📅 {(() => {
                      const date = new Date(suggestion.additional_fields.deadline)
                      return isNaN(date.getTime())
                        ? String(suggestion.additional_fields.deadline)
                        : date.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })
                    })()}
                  </span>
                </div>
              )}

              {suggestion.additional_fields.estimated_time && (
                <div className="flex items-center gap-2">
                  <span className="text-retro-text-secondary text-xs w-24">Est. Time:</span>
                  <span className="font-semibold text-sm">
                    ⏱️ {suggestion.additional_fields.estimated_time} hour{suggestion.additional_fields.estimated_time > 1 ? 's' : ''}
                  </span>
                </div>
              )}

              {suggestion.additional_fields.status && (
                <div className="flex items-center gap-2">
                  <span className="text-retro-text-secondary text-xs w-24">Status:</span>
                  <span className="font-semibold text-sm capitalize">
                    {suggestion.additional_fields.status === 'pending' ? '⏳' :
                     suggestion.additional_fields.status === 'in-progress' ? '▶️' :
                     suggestion.additional_fields.status === 'completed' ? '✅' : ''}
                    {' '}{suggestion.additional_fields.status.replace('-', ' ')}
                  </span>
                </div>
              )}

              {suggestion.additional_fields.category && (
                <div className="flex items-center gap-2">
                  <span className="text-retro-text-secondary text-xs w-24">Category:</span>
                  <span className="font-semibold text-sm capitalize">
                    📂 {suggestion.additional_fields.category}
                  </span>
                </div>
              )}

              {suggestion.additional_fields.list_name && (
                <div className="flex items-center gap-2">
                  <span className="text-retro-text-secondary text-xs w-24">List Name:</span>
                  <span className="font-semibold text-sm">
                    📝 {suggestion.additional_fields.list_name}
                  </span>
                </div>
              )}

              {suggestion.additional_fields.list_items && suggestion.additional_fields.list_items.length > 0 && (
                <div className="flex items-start gap-2">
                  <span className="text-retro-text-secondary text-xs w-24">Items:</span>
                  <ul className="text-sm space-y-1 flex-1">
                    {suggestion.additional_fields.list_items.map((item: string, i: number) => (
                      <li key={i} className="flex items-start gap-1">
                        <span className="text-retro-text-secondary">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

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
              disabled={isCreating}
              className="flex items-center justify-center gap-1"
            >
              <span className="flex items-center justify-center gap-1">
                {getTypeIcon(suggestion.suggested_type)} {getTypeLabel(suggestion.suggested_type)}
              </span>
            </RetroButton>

            {/* Other conversion options */}
            {(['todo', 'note', 'task', 'project', 'list'] as const)
              .filter(type => type !== suggestion.suggested_type)
              .map(type => (
                <RetroButton
                  key={type}
                  onClick={() => onApplySuggestion(type)}
                  variant="secondary"
                  size="sm"
                  disabled={isCreating}
                  className="flex items-center justify-center gap-1"
                >
                  <span className="flex items-center justify-center gap-1">
                    {getTypeIcon(type)} {getTypeLabel(type)}
                  </span>
                </RetroButton>
              ))}
          </div>
        </div>
      </div>
    </RetroCard>
  )
}
