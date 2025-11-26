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
  error?: string | null
  onApplySuggestion: (type: 'todo' | 'note' | 'task' | 'project' | 'list') => void
  onDismiss: () => void
  onAcceptAndSave: (suggestion: AISuggestion) => Promise<void>
  onAcceptAndEdit: (suggestion: AISuggestion) => void
  onOverrideAndEdit: () => void
  isProcessing?: boolean
}

export function AISuggestionPanel({
  suggestion,
  isLoading,
  isCreating = false,
  error = null,
  onApplySuggestion,
  onDismiss,
  onAcceptAndSave,
  onAcceptAndEdit,
  onOverrideAndEdit,
  isProcessing = false
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
          <div className="text-center text-xs">
            <div className="animate-pulse mb-2">
              <RetroIcon type="ai" size="md" />
            </div>
            <p className="font-semibold mb-1">🤖 AI is analyzing...</p>
            <p className="text-xs opacity-70">Extracting metadata and suggestions</p>
          </div>
        </div>
      </RetroCard>
    )
  }

  if (!suggestion) {
    return null
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

        {/* Error Message */}
        {error && (
          <div className="mb-3 p-3 border-2 border-red-500 bg-red-50 rounded">
            <div className="flex items-start gap-2">
              <span className="text-red-500 text-lg">⚠️</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-700 mb-1">Error</p>
                <p className="text-xs text-red-600">{error}</p>
              </div>
            </div>
          </div>
        )}

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

        {/* Sprint 2 Phase 5: Existing Entity Found Banner */}
        {suggestion.suggested_action === 'append_to_list' && suggestion.target_entity_name && (
          <div className="mb-3 p-3 border-2 border-green-500 bg-green-50 rounded">
            <div className="flex items-start gap-2">
              <span className="text-green-600 text-lg">📋</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-green-700 mb-1">
                  Found Existing List
                </p>
                <p className="text-xs text-green-600 mb-2">
                  &quot;{suggestion.target_entity_name}&quot;
                </p>
                {suggestion.append_items && suggestion.append_items.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs font-semibold text-green-700 mb-1">
                      Items to add ({suggestion.append_items.length}):
                    </p>
                    <ul className="text-xs space-y-1">
                      {suggestion.append_items.map((item, i) => (
                        <li key={i} className="flex items-start gap-1 text-green-600">
                          <span>•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {suggestion.suggested_action === 'add_to_project' && suggestion.target_entity_name && (
          <div className="mb-3 p-3 border-2 border-blue-500 bg-blue-50 rounded">
            <div className="flex items-start gap-2">
              <span className="text-blue-600 text-lg">📁</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-blue-700 mb-1">
                  Found Existing Project
                </p>
                <p className="text-xs text-blue-600">
                  &quot;{suggestion.target_entity_name}&quot;
                </p>
                <p className="text-xs text-blue-600 mt-2">
                  This could be added as a task or note within the project.
                </p>
              </div>
            </div>
          </div>
        )}

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
          {/* Sprint 2 Phase 5: Different buttons for append actions */}
          {suggestion.suggested_action === 'append_to_list' && suggestion.target_entity_id ? (
            <>
              <RetroButton
                onClick={() => onAcceptAndSave(suggestion)}
                variant="primary"
                size="md"
                disabled={isProcessing || isCreating}
                className="w-full"
              >
                ✓ Add to List
              </RetroButton>
              <RetroButton
                onClick={() => onAcceptAndEdit(suggestion)}
                variant="secondary"
                size="md"
                disabled={isProcessing || isCreating}
                className="w-full"
              >
                📋 View List & Add
              </RetroButton>
              <RetroButton
                onClick={() => {
                  // Remove append fields to force create new
                  const newSuggestion = {
                    ...suggestion,
                    suggested_action: 'create_new' as const,
                    target_entity_id: undefined,
                    target_entity_name: undefined
                  }
                  onAcceptAndEdit(newSuggestion)
                }}
                variant="secondary"
                size="md"
                disabled={isProcessing || isCreating}
                className="w-full"
              >
                ➕ Create New List Instead
              </RetroButton>
            </>
          ) : suggestion.suggested_action === 'add_to_project' && suggestion.target_entity_id ? (
            <>
              <RetroButton
                onClick={() => onAcceptAndEdit(suggestion)}
                variant="primary"
                size="md"
                disabled={isProcessing || isCreating}
                className="w-full"
              >
                📁 Add to Project
              </RetroButton>
              <RetroButton
                onClick={() => {
                  // Remove append fields to force create new
                  const newSuggestion = {
                    ...suggestion,
                    suggested_action: 'create_new' as const,
                    target_entity_id: undefined,
                    target_entity_name: undefined
                  }
                  onAcceptAndEdit(newSuggestion)
                }}
                variant="secondary"
                size="md"
                disabled={isProcessing || isCreating}
                className="w-full"
              >
                ➕ Create New Instead
              </RetroButton>
            </>
          ) : (
            <>
              <RetroButton
                onClick={() => onAcceptAndSave(suggestion)}
                variant="primary"
                size="md"
                disabled={isProcessing || isCreating}
                className="w-full"
              >
                ✓ Accept & Save
              </RetroButton>

              <RetroButton
                onClick={() => onAcceptAndEdit(suggestion)}
                variant="secondary"
                size="md"
                disabled={isProcessing || isCreating}
                className="w-full"
              >
                ✏️ Accept & Edit
              </RetroButton>

              <RetroButton
                onClick={() => onOverrideAndEdit()}
                variant="secondary"
                size="md"
                disabled={isProcessing || isCreating}
                className="w-full"
              >
                🔄 Override & Edit
              </RetroButton>
            </>
          )}
        </div>
      </div>
    </RetroCard>
  )
}
