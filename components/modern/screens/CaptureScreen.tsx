/**
 * Capture Screen Component - Retro Palm Pilot Style
 *
 * Main idea capture interface:
 * - Retro header with "IDEALIST V1.0" and subtitle
 * - Retro-styled textarea (monospace placeholder, inset border)
 * - Action buttons row: ✓ Unsorted (beveled primary), others (flat secondary)
 * - Recently Captured section with retro cards and entity color borders
 * - Auto-focus on mount
 * - Clear and refocus after successful capture
 */

'use client'

import React, { useState, useRef, useEffect } from 'react'
import { EntityType } from '@/lib/entity-colors'
import { formatDistanceToNow } from 'date-fns'
import { motion } from 'framer-motion'
import { useSpeechRecognition } from '@/lib/useSpeechRecognition'
import { AISuggestion } from '@/types'
import { AISuggestionPanel } from '@/components/ui/AISuggestionPanel'

interface RecentItem {
  id: string
  text: string
  entityType?: Exclude<EntityType, 'idea'> | null
  createdAt: Date | string
}

interface CaptureScreenProps {
  onCapture: (text: string, entityType?: Exclude<EntityType, 'idea'> | null, subtype?: string) => void
  onAICapture?: (text: string) => void
  recentItems?: RecentItem[]
  className?: string
  // Phase 3: AI Suggestion Preview
  aiSuggestion?: AISuggestion | null
  isAnalyzing?: boolean
  isCreatingItem?: boolean
  creationError?: string | null
  onAcceptSuggestion?: (overrideType?: Exclude<EntityType, 'idea'>) => void
  onDismissSuggestion?: () => void
  // Task 4.4: Override & Edit handlers
  onAcceptAndSave?: (suggestion: AISuggestion) => Promise<void>
  onAcceptAndEdit?: (suggestion: AISuggestion) => void
  onOverrideAndEdit?: () => void
}

export const CaptureScreen: React.FC<CaptureScreenProps> = ({
  onCapture,
  onAICapture,
  recentItems = [],
  className = '',
  aiSuggestion,
  isAnalyzing,
  isCreatingItem,
  creationError,
  onAcceptSuggestion,
  onDismissSuggestion,
  onAcceptAndSave,
  onAcceptAndEdit,
  onOverrideAndEdit,
}) => {
  const [inputText, setInputText] = useState('')
  const [showNoteMenu, setShowNoteMenu] = useState(false)
  const [aiEnabled, setAiEnabled] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Voice input using Web Speech API
  const { isListening, transcript, startListening, resetTranscript, isSupported } = useSpeechRecognition()

  // Auto-focus on mount
  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  // Fetch AI config on mount to check if AI is enabled
  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => setAiEnabled(data.settings?.ai_config?.enabled ?? false))
      .catch(() => setAiEnabled(false))
  }, [])

  // Update input text when speech transcript is available
  useEffect(() => {
    if (transcript) {
      setInputText(prev => prev ? `${prev} ${transcript}` : transcript)
      resetTranscript()
    }
  }, [transcript, resetTranscript])

  const handleCapture = (entityType?: Exclude<EntityType, 'idea'> | null, subtype?: string) => {
    if (!inputText.trim()) return

    onCapture(inputText, entityType, subtype)
    setInputText('')
    textareaRef.current?.focus()
  }

  const handleAIAction = () => {
    if (!inputText.trim()) return

    if (onAICapture) {
      onAICapture(inputText)
      setInputText('')
      textareaRef.current?.focus()
    }
  }

  const handleVoiceInput = () => {
    startListening()
  }

  const entityButtons: Array<{
    type: Exclude<EntityType, 'idea'> | null
    label: string
    hasDropdown?: boolean
  }> = [
    { type: 'task', label: 'Task' },
    { type: 'note', label: 'Note ▾', hasDropdown: true },
    { type: 'project', label: 'Project' },
    { type: 'list', label: 'List' },
  ]

  return (
    <div className={`flex flex-col h-full pb-20 ${className}`}>
      {/* Input Container with inline buttons */}
      <div className="px-4 mb-4" style={{ paddingTop: '16px' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type your idea..."
              className="retro-textarea"
              style={{
                minHeight: '96px',
                maxHeight: '40vh',
                paddingRight: isSupported ? '48px' : undefined,
              }}
            />
            {/* Voice Input Button - only show in supported browsers */}
            {isSupported && (
              <button
                onClick={handleVoiceInput}
                disabled={isListening}
                className="retro-btn retro-btn-secondary"
                aria-label="Voice input"
                title={isListening ? "Listening..." : "Voice input"}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '8px',
                  width: '32px',
                  height: '32px',
                  padding: '4px',
                  fontSize: '16px',
                  minWidth: 'unset',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {isListening ? '🔴' : '🎤'}
              </button>
            )}
          </div>

          {/* Right-side action buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {/* Unsorted button */}
            <button
              onClick={() => handleCapture(null)}
              disabled={!inputText.trim() || isAnalyzing || isCreatingItem}
              className="retro-btn retro-btn-primary"
              aria-label="Save as unsorted"
              title="Save as unsorted"
              style={{
                width: '40px',
                height: '40px',
                padding: '4px',
                fontSize: '18px',
                minWidth: 'unset',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ✓
            </button>

            {/* AI button - only show if AI is enabled */}
            {aiEnabled && (
              <button
                onClick={handleAIAction}
                disabled={!inputText.trim() || isAnalyzing || isCreatingItem}
                className="retro-btn retro-btn-secondary"
                aria-label="AI analyze"
                title={isAnalyzing ? "Analyzing..." : "AI analyze"}
                style={{
                  width: '40px',
                  height: '40px',
                  padding: '4px',
                  fontSize: '18px',
                  minWidth: 'unset',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {isAnalyzing ? '⏳' : '🤖'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Entity Type Buttons Row */}
      <div className="px-4 mb-6">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {entityButtons.map((btn) => {
            // Add entity color accent for entity type buttons
            const accentClass = btn.type ? `retro-btn-accent-${btn.type}` : ''
            return (
              <button
                key={btn.label}
                onClick={() => {
                  if (btn.hasDropdown) {
                    setShowNoteMenu(!showNoteMenu)
                  } else {
                    handleCapture(btn.type)
                  }
                }}
                disabled={!inputText.trim() || isAnalyzing || isCreatingItem}
                className={`retro-btn retro-btn-secondary ${accentClass} whitespace-nowrap flex-shrink-0`}
              >
                {btn.label}
              </button>
            )
          })}
        </div>

        {/* Note Template Dropdown */}
        {showNoteMenu && (
          <div className="relative mt-2">
            <div className="absolute z-10 w-40" style={{
              background: 'var(--palm-screen-light)',
              border: '1px solid var(--palm-border)',
              boxShadow: '2px 2px 0 rgba(0,0,0,0.2)'
            }}>
              {[
                { label: 'Note', subtype: 'general' },
                { label: 'Research', subtype: 'research' },
                { label: 'Video', subtype: 'video' },
                { label: 'Link', subtype: 'link' },
                { label: 'File', subtype: 'file' },
                { label: 'Meeting', subtype: 'meeting' },
              ].map((template, idx) => (
                <button
                  key={template.label}
                  onClick={() => {
                    handleCapture('note', template.subtype)
                    setShowNoteMenu(false)
                  }}
                  className="w-full px-4 text-left"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '12px',
                    textTransform: 'uppercase',
                    height: '40px',
                    background: 'transparent',
                    border: 'none',
                    borderTop: idx > 0 ? '1px solid var(--palm-border)' : 'none',
                    color: 'var(--palm-text-dark)',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--palm-screen-base)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  {template.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Phase 3: AI Suggestion Panel */}
      {(aiSuggestion || isAnalyzing) && (
        <div className="px-4 mb-4">
          <AISuggestionPanel
            suggestion={aiSuggestion}
            isLoading={isAnalyzing || false}
            isCreating={isCreatingItem}
            error={creationError}
            onApplySuggestion={(type) => {
              onAcceptSuggestion?.(type as Exclude<EntityType, 'idea'>)
            }}
            onDismiss={() => {
              onDismissSuggestion?.()
            }}
            onAcceptAndSave={onAcceptAndSave || (async () => {})}
            onAcceptAndEdit={onAcceptAndEdit || (() => {})}
            onOverrideAndEdit={onOverrideAndEdit || (() => {})}
          />
        </div>
      )}

      {/* Divider */}
      <hr className="retro-separator" style={{ marginLeft: '16px', marginRight: '16px' }} />

      {/* Recently Captured Section */}
      <div className="px-4 flex-1 overflow-y-auto">
        <h2 className="retro-header retro-header-sm" style={{ marginBottom: '12px' }}>
          Recently Captured
        </h2>

        {recentItems.length === 0 ? (
          <div className="retro-empty">
            <div className="retro-empty-icon">📥</div>
            <p className="retro-empty-title">Nothing here yet</p>
            <p className="retro-empty-message">Start capturing ideas!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {recentItems.slice(0, 5).map((item, index) => {
              const timestamp = typeof item.createdAt === 'string' ? new Date(item.createdAt) : item.createdAt
              const timeAgo = formatDistanceToNow(timestamp, { addSuffix: true })
              const entityClass = item.entityType ? `retro-card-${item.entityType}` : ''
              const entityDotClass = item.entityType ? `retro-entity-dot retro-entity-dot-${item.entityType}` : ''

              return (
                <div
                  key={item.id}
                  className={`retro-card ${entityClass}`}
                  style={{ cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '4px' }}>
                    {/* Entity color dot indicator */}
                    {item.entityType && <span className={entityDotClass} style={{ marginTop: '6px' }} />}
                    <p className="retro-item-title" style={{
                      margin: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flex: 1
                    }}>
                      {item.text}
                    </p>
                  </div>
                  <p className="retro-timestamp">{timeAgo}</p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
