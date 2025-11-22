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
import { Bot, Loader2, Mic } from 'lucide-react'
import { Template } from '@/types'

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
  onRecentItemClick?: (id: string) => void
  unsortedItems?: { id: string; text: string; createdAt: Date | string }[]
  onUnsortedConvert?: (id: string) => void
  onUnsortedDelete?: (id: string) => void
  onJournalSave?: (text: string) => void
  onMediaSave?: (payload: { url: string; type: 'Image' | 'Audio' | 'Video'; caption: string }) => void
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
  onRecentItemClick,
  unsortedItems = [],
  onUnsortedConvert,
  onUnsortedDelete,
  onJournalSave,
  onMediaSave,
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
  const [notePickerOpen, setNotePickerOpen] = useState(false)
  const [noteTemplates, setNoteTemplates] = useState<Template[]>([])
  const [loadingNotes, setLoadingNotes] = useState(false)
  const [aiEnabled, setAiEnabled] = useState(false)
  const [isUnsortedOpen, setIsUnsortedOpen] = useState(false)
  const [journalText, setJournalText] = useState('')
  const [mediaUrl, setMediaUrl] = useState('')
  const [mediaType, setMediaType] = useState<'Image' | 'Audio' | 'Video'>('Image')
  const [mediaCaption, setMediaCaption] = useState('')
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

  // Fetch note templates once for picker
  useEffect(() => {
    const fetchNoteTemplates = async () => {
      try {
        setLoadingNotes(true)
        const res = await fetch('/api/templates')
        const data = await res.json()
        if (data.success && Array.isArray(data.data)) {
          setNoteTemplates(data.data.filter((t: Template) => t.entity_type === 'note'))
        }
      } catch (err) {
        console.error('Failed to load note templates', err)
      } finally {
        setLoadingNotes(false)
      }
    }

    fetchNoteTemplates()
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
    { type: 'note', label: 'Note', hasDropdown: true },
    { type: 'project', label: 'Project' },
    { type: 'list', label: 'List' },
  ]

  return (
    <div className={`flex flex-col h-full pb-20 ${className}`}>
      {/* Today Surface */}
      <div className="px-4 pt-4 space-y-4">
        <div className="retro-card" style={{ padding: '12px' }}>
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-xs font-mono opacity-70 uppercase">Today</div>
              <div className="text-base font-semibold">Quick Actions</div>
            </div>
            <div className="text-xs font-mono opacity-60">Streak: —</div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {['Task', 'Note', 'Project', 'List'].map((label, idx) => (
              <button
                key={label}
                onClick={() => {
                  if (label === 'Note') {
                    setNotePickerOpen(true)
                  } else {
                    handleCapture((['task', 'note', 'project', 'list'][idx] as Exclude<EntityType, 'idea'>))
                  }
                }}
                disabled={!inputText.trim() && label !== 'Note'}
                className="retro-btn retro-btn-secondary"
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="retro-card" style={{ padding: '12px' }}>
            <div className="text-sm font-semibold mb-2">Journal</div>
            <textarea
              className="retro-textarea"
              placeholder="Capture a thought for today..."
              value={journalText}
              onChange={(e) => setJournalText(e.target.value)}
              style={{ minHeight: '80px' }}
            />
            <div className="flex justify-end mt-2">
              <button
                className="retro-btn retro-btn-primary"
                disabled={!journalText.trim() || !onJournalSave}
                onClick={() => {
                  onJournalSave?.(journalText.trim())
                  setJournalText('')
                }}
              >
                Save Journal
              </button>
            </div>
          </div>

          <div className="retro-card" style={{ padding: '12px' }}>
            <div className="text-sm font-semibold mb-2">Media of the Day</div>
            <input
              type="url"
              className="retro-input mb-2"
              placeholder="Media URL"
              value={mediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
            />
            <input
              type="text"
              className="retro-input mb-2"
              placeholder="Caption"
              value={mediaCaption}
              onChange={(e) => setMediaCaption(e.target.value)}
            />
            <select
              className="retro-input mb-2"
              value={mediaType}
              onChange={(e) => setMediaType(e.target.value as any)}
            >
              <option>Image</option>
              <option>Audio</option>
              <option>Video</option>
            </select>
            <div className="flex justify-end">
              <button
                className="retro-btn retro-btn-primary"
                disabled={!mediaUrl.trim() || !onMediaSave}
                onClick={() => {
                  onMediaSave?.({
                    url: mediaUrl.trim(),
                    type: mediaType,
                    caption: mediaCaption.trim()
                  })
                  setMediaUrl('')
                  setMediaCaption('')
                }}
              >
                Save Media
              </button>
            </div>
          </div>
        </div>

        <div className="retro-card" style={{ padding: '12px' }}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-mono opacity-70 uppercase">AI Recap</div>
              <div className="text-sm font-semibold">Yesterday Summary</div>
            </div>
            <span className="text-xs opacity-60">Coming soon</span>
          </div>
          <p className="text-xs opacity-60 mt-2">AI-generated recap placeholder (non-blocking).</p>
        </div>
      </div>

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
                title={isListening ? "Listening..." : "Voice input"}
              >
                {isListening ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Mic size={18} />
                )}
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
                {isAnalyzing ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Bot size={18} />
                )}
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
                    setNotePickerOpen(true)
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

        {/* Note Type Picker Bottom Sheet */}
        {notePickerOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/60 z-[1002]"
              onClick={() => setNotePickerOpen(false)}
            />
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed left-0 right-0 bottom-0 z-[1003]"
            >
              <div
                className="retro-card"
                style={{
                  background: 'var(--palm-bg-primary)',
                  border: '3px solid var(--palm-border-dark)',
                  boxShadow: '4px 4px 0 var(--palm-border-dark)',
                  borderRadius: '16px 16px 0 0',
                  overflow: 'hidden',
                }}
              >
                <div
                  className="retro-sheet-header"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 16px',
                  }}
                >
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', letterSpacing: '0.05em' }}>
                    Select Note Type
                  </span>
                  <button
                    onClick={() => setNotePickerOpen(false)}
                    className="retro-close-btn"
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>
                <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(noteTemplates.length ? noteTemplates : [
                    { id: 'note-generic', name: 'Note', subtype: 'generic' } as Template,
                    { id: 'note-youtube', name: 'YouTube', subtype: 'youtube' } as Template,
                  ]).map((template) => (
                    <button
                      key={template.id}
                      onClick={() => {
                        handleCapture('note', (template as any).subtype || 'generic')
                        setNotePickerOpen(false)
                      }}
                      className="retro-btn retro-btn-secondary w-full"
                      style={{ justifyContent: 'flex-start' }}
                    >
                      {template.name}
                    </button>
                  ))}
                  {loadingNotes && (
                    <div className="text-xs opacity-60" style={{ fontFamily: 'var(--font-mono)' }}>
                      Loading note templates...
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
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

      {/* Unsorted Inbox (collapsed by default) */}
      <div className="px-4">
        <button
          className="retro-btn retro-btn-secondary w-full mb-2"
          onClick={() => setIsUnsortedOpen(prev => !prev)}
        >
          {isUnsortedOpen ? 'Hide Inbox' : 'Show Inbox'} ({unsortedItems.length})
        </button>
        {isUnsortedOpen && (
          <div className="retro-card" style={{ padding: '12px', maxHeight: '220px', overflowY: 'auto' }}>
            {unsortedItems.length === 0 && (
              <div className="text-xs opacity-60">No unsorted items.</div>
            )}
            {unsortedItems.map(item => (
              <div key={item.id} className="flex items-center justify-between py-1 border-b border-dashed border-black/10 last:border-none">
                <div>
                  <div className="text-sm font-semibold">{item.text}</div>
                  <div className="text-[10px] opacity-60">
                    {typeof item.createdAt === 'string'
                      ? item.createdAt
                      : new Date(item.createdAt).toLocaleString()}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="retro-btn retro-btn-secondary retro-btn-sm" onClick={() => onUnsortedConvert?.(item.id)}>Convert</button>
                  <button className="retro-btn retro-btn-secondary retro-btn-sm" onClick={() => onUnsortedDelete?.(item.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
                  style={{ cursor: onRecentItemClick ? 'pointer' : 'default' }}
                  onClick={() => onRecentItemClick?.(item.id)}
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
