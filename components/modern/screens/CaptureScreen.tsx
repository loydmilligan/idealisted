/**
 * Capture Screen Component - Retro Palm Pilot Style
 */

'use client'

import React, { useState, useRef, useEffect, useMemo } from 'react'
import { EntityType } from '@/lib/entity-colors'
import { formatDistanceToNow } from 'date-fns'
import { useSpeechRecognition } from '@/lib/useSpeechRecognition'
import { AISuggestion } from '@/types'
import { AISuggestionPanel } from '@/components/ui/AISuggestionPanel'
import { Bot, Loader2, Mic, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react'

// Types for recap data from API
interface RecapData {
  summary?: string[]
  quote?: { text: string; author?: string }
  fallback: boolean
  stats?: { tasks: number; notes: number; ideas: number }
  cached?: boolean
  error?: boolean
}

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
  onUnsortedConvert?: (id: string, targetType: Exclude<EntityType, 'idea'>, subtype?: string) => void
  onUnsortedDelete?: (id: string) => void
  onJournalSave?: (text: string) => void
  onMediaSave?: (payload: { url: string; type: 'Image' | 'Audio' | 'Video'; caption: string }) => void
  journalEntry?: { text: string; date: string; streak: number }
  mediaEntry?: { url: string; type: 'Image' | 'Audio' | 'Video'; caption: string; date: string; streak: number }
  className?: string
  aiSuggestion?: AISuggestion | null
  isAnalyzing?: boolean
  isCreatingItem?: boolean
  creationError?: string | null
  onAcceptSuggestion?: (overrideType?: Exclude<EntityType, 'idea'>) => void
  onDismissSuggestion?: () => void
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
  journalEntry,
  mediaEntry,
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
  const [aiEnabled, setAiEnabled] = useState(false)
  const [recap, setRecap] = useState<RecapData | null>(null)
  const [recapLoading, setRecapLoading] = useState(false)
  const [recapError, setRecapError] = useState<string | null>(null)
  const [isUnsortedOpen, setIsUnsortedOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('unsorted_expanded') === 'true'
    }
    return false
  })
  const [journalText, setJournalText] = useState('')
  const [mediaUrl, setMediaUrl] = useState('')
  const [mediaType, setMediaType] = useState<'Image' | 'Audio' | 'Video'>('Image')
  const [mediaCaption, setMediaCaption] = useState('')
  const [noteMenuOpen, setNoteMenuOpen] = useState(false)
  const [listMenuOpen, setListMenuOpen] = useState(false)
  const [inlineNoteMenuId, setInlineNoteMenuId] = useState<string | null>(null)
  const [inlineListMenuId, setInlineListMenuId] = useState<string | null>(null)
  const [unsortedFlash, setUnsortedFlash] = useState(false)
  const prevUnsortedCount = useRef<number>(unsortedItems.length)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const streakStyle = useMemo(() => {
    const outline = (days: number) => Math.min(days / 7, 1) * 4
    return {
      journal: journalEntry ? outline(journalEntry.streak) : 0,
      media: mediaEntry ? outline(mediaEntry.streak) : 0,
    }
  }, [journalEntry, mediaEntry])

  const { isListening, transcript, startListening, resetTranscript, isSupported } = useSpeechRecognition()

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => setAiEnabled(data.settings?.ai_config?.enabled ?? false))
      .catch(() => setAiEnabled(false))
  }, [])

  // Fetch recap on mount
  const loadRecap = async () => {
    setRecapLoading(true)
    setRecapError(null)
    try {
      const res = await fetch('/api/ai/recap', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setRecap({
          summary: data.summary,
          quote: data.quote,
          fallback: data.fallback,
          stats: data.stats,
          cached: data.cached,
          error: data.error
        })
      } else {
        // API returned success: false - recap might be disabled
        setRecapError(data.error || 'Recap unavailable')
      }
    } catch (e) {
      console.error('Failed to load recap:', e)
      setRecapError('Failed to load recap')
    }
    setRecapLoading(false)
  }

  useEffect(() => {
    loadRecap()
  }, [])

  useEffect(() => {
    if (transcript) {
      setInputText(prev => prev ? `${prev} ${transcript}` : transcript)
      resetTranscript()
    }
  }, [transcript, resetTranscript])

  // Flash inline inbox when new items arrive and auto-expand
  useEffect(() => {
    const prev = prevUnsortedCount.current
    if (unsortedItems.length > prev) {
      setIsUnsortedOpen(true)
      localStorage.setItem('unsorted_expanded', 'true')
      setUnsortedFlash(true)
      setTimeout(() => setUnsortedFlash(false), 350)
    }
    prevUnsortedCount.current = unsortedItems.length
  }, [unsortedItems.length])

  const handleCapture = (entityType?: Exclude<EntityType, 'idea'> | null, subtype?: string) => {
    if (!inputText.trim()) return
    onCapture(inputText, entityType, subtype)
    setInputText('')
    textareaRef.current?.focus()
    setIsUnsortedOpen(true)
    localStorage.setItem('unsorted_expanded', 'true')
  }

  const handleAIAction = () => {
    if (!inputText.trim()) return
    if (onAICapture) {
      onAICapture(inputText)
      setInputText('')
      textareaRef.current?.focus()
    }
  }

  const handleVoiceInput = () => startListening()

  const toggleUnsorted = () => {
    const newState = !isUnsortedOpen
    setIsUnsortedOpen(newState)
    localStorage.setItem('unsorted_expanded', String(newState))
  }

  const renderJournal = () => {
    if (journalEntry) {
      return (
        <div
          className="retro-card"
          style={{ padding: '12px', borderWidth: `${streakStyle.journal}px`, borderColor: 'var(--palm-border-light)' }}
        >
          <div className="text-sm font-semibold mb-1">Journal</div>
          <div className="text-xs opacity-60 mb-2">{journalEntry.date} — Streak {journalEntry.streak}d</div>
          <p className="text-sm whitespace-pre-wrap">{journalEntry.text}</p>
        </div>
      )
    }

    return (
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
    )
  }

  const renderMedia = () => {
    if (mediaEntry) {
      return (
        <div
          className="retro-card"
          style={{ padding: '12px', borderWidth: `${streakStyle.media}px`, borderColor: 'var(--palm-border-light)' }}
        >
          <div className="text-sm font-semibold mb-1">Media</div>
          <div className="text-xs opacity-60 mb-2">{mediaEntry.date} — Streak {mediaEntry.streak}d</div>
          <div className="text-sm mb-1">{mediaEntry.caption || 'Media Note'}</div>
          <div className="text-xs opacity-70">Type: {mediaEntry.type}</div>
          <a className="text-xs underline" href={mediaEntry.url} target="_blank" rel="noreferrer">Open media</a>
        </div>
      )
    }

    return (
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
              onMediaSave?.({ url: mediaUrl.trim(), type: mediaType, caption: mediaCaption.trim() })
              setMediaUrl('')
              setMediaCaption('')
            }}
          >
            Save Media
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex flex-col h-full pb-20 ${className}`}>
      {/* Capture box (primary) */}
      <div className="px-4 pt-4" style={{ paddingBottom: '12px' }}>
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
                paddingRight: isSupported ? '52px' : undefined,
              }}
            />
            {isSupported && (
              <button
                onClick={handleVoiceInput}
                disabled={isListening}
                className="retro-btn retro-btn-secondary tap-target"
                aria-label="Voice input"
                title={isListening ? "Listening..." : "Voice input"}
                style={{
                  position: 'absolute',
                  right: '4px',
                  top: '4px',
                  width: '44px',
                  height: '44px',
                  padding: '8px',
                  fontSize: '16px',
                  minWidth: '44px',
                  minHeight: '44px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  touchAction: 'manipulation',
                }}
              >
                {isListening ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <Mic size={20} />
                )}
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              onClick={() => handleCapture(null)}
              disabled={!inputText.trim() || isAnalyzing || isCreatingItem}
              className="retro-btn retro-btn-primary tap-target"
              aria-label="Save as unsorted"
              title="Save as unsorted"
              style={{
                width: '44px',
                height: '44px',
                padding: '8px',
                fontSize: '18px',
                minWidth: '44px',
                minHeight: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                touchAction: 'manipulation',
              }}
            >
              ✓
            </button>

            {aiEnabled && (
              <button
                onClick={handleAIAction}
                disabled={!inputText.trim() || isAnalyzing || isCreatingItem}
                className="retro-btn retro-btn-secondary tap-target"
                aria-label="AI analyze"
                title={isAnalyzing ? "Analyzing..." : "AI analyze"}
                style={{
                  width: '44px',
                  height: '44px',
                  padding: '8px',
                  fontSize: '18px',
                  minWidth: '44px',
                  minHeight: '44px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  touchAction: 'manipulation',
                }}
              >
                {isAnalyzing ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <Bot size={20} />
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Quick sort buttons */}
      <div className="px-4 pb-3">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {[
            { type: 'task', label: 'Task' },
            { type: 'note', label: 'Note ▾' },
            { type: 'project', label: 'Project' },
            { type: 'list', label: 'List ▾' },
          ].map((btn) => {
            const accentClass = btn.type ? `retro-btn-accent-${btn.type}` : ''
            const disabled = !inputText.trim() || isAnalyzing || isCreatingItem
            return (
              <button
                key={btn.label}
                onClick={() => {
                  if (btn.type === 'note') {
                    setNoteMenuOpen(prev => !prev)
                  } else if (btn.type === 'list') {
                    setListMenuOpen(prev => !prev)
                  } else {
                    handleCapture(btn.type as Exclude<EntityType, 'idea'>)
                  }
                }}
                disabled={disabled}
                className={`retro-btn retro-btn-secondary ${accentClass} whitespace-nowrap flex-shrink-0`}
              >
                {btn.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Note subtype dropdown */}
      {noteMenuOpen && (
        <div className="px-4 pb-3">
          <div className="retro-card" style={{ padding: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[
              { label: 'Note', subtype: 'generic' },
              { label: 'Meeting', subtype: 'meeting' },
              { label: 'Research', subtype: 'research' },
              { label: 'Media', subtype: 'media' },
              { label: 'YouTube', subtype: 'youtube' },
            ].map(opt => (
              <button
                key={opt.label}
                className="retro-btn retro-btn-secondary retro-btn-sm"
                onClick={() => {
                  handleCapture('note', opt.subtype)
                  setNoteMenuOpen(false)
                }}
                disabled={!inputText.trim()}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* List subtype dropdown */}
      {listMenuOpen && (
        <div className="px-4 pb-3">
          <div className="retro-card" style={{ padding: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[
              { label: 'Bulleted', subtype: 'bulleted' },
              { label: 'Numbered', subtype: 'numbered' },
              { label: 'TaskList', subtype: 'tasklist' },
              { label: 'Shopping', subtype: 'shopping' },
            ].map(opt => (
              <button
                key={opt.label}
                className="retro-btn retro-btn-secondary retro-btn-sm"
                onClick={() => {
                  handleCapture('list', opt.subtype)
                  setListMenuOpen(false)
                }}
                disabled={!inputText.trim()}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* AI suggestion panel (inline near capture) */}
      {(aiSuggestion || isAnalyzing) && (
        <div className="px-4 pb-3">
          <AISuggestionPanel
            suggestion={aiSuggestion}
            isLoading={isAnalyzing || false}
            isCreating={isCreatingItem}
            error={creationError}
            onApplySuggestion={(type) => onAcceptSuggestion?.(type as Exclude<EntityType, 'idea'>)}
            onDismiss={() => onDismissSuggestion?.()}
            onAcceptAndSave={onAcceptAndSave || (async () => {})}
            onAcceptAndEdit={onAcceptAndEdit || (() => {})}
            onOverrideAndEdit={onOverrideAndEdit || (() => {})}
          />
        </div>
      )}

      {/* Unsorted Inbox (collapsed by default) */}
      <div className="px-4">
        <button
          className="retro-btn retro-btn-secondary w-full mb-2 flex items-center justify-center gap-2"
          onClick={toggleUnsorted}
          aria-expanded={isUnsortedOpen}
          aria-controls="unsorted-inbox-container"
        >
          {isUnsortedOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          <span>Inbox ({unsortedItems.length})</span>
        </button>
        <div
          id="unsorted-inbox-container"
          className="inbox-container"
          style={{
            maxHeight: isUnsortedOpen ? '220px' : '0',
            opacity: isUnsortedOpen ? 1 : 0,
            overflow: 'hidden',
            transition: 'max-height 250ms ease-out, opacity 200ms ease-out',
          }}
        >
          <div
            className="retro-card"
            style={{
              padding: '12px',
              maxHeight: '220px',
              overflowY: 'auto',
              boxShadow: unsortedFlash ? '0 0 0 3px rgba(255,255,255,0.6)' : undefined,
              transition: 'box-shadow 0.3s ease',
            }}
          >
            {unsortedItems.length === 0 && (
              <div className="text-xs opacity-60">No unsorted items.</div>
            )}
            {unsortedItems.map(item => (
              <div key={item.id} className="py-2 border-b border-dashed border-black/10 last:border-none">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold">{item.text}</div>
                    <div className="text-[10px] opacity-60">
                      {typeof item.createdAt === 'string'
                        ? item.createdAt
                        : new Date(item.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <button
                    className="retro-btn retro-btn-secondary retro-btn-sm"
                    onClick={() => onUnsortedDelete?.(item.id)}
                    aria-label="Delete"
                  >
                    ✕
                  </button>
                </div>
                <div className="flex gap-2 flex-wrap mt-2">
                  {[
                    { type: 'task', label: 'Task' },
                    { type: 'note', label: 'Note ▾' },
                    { type: 'project', label: 'Project' },
                    { type: 'list', label: 'List ▾' },
                  ].map((btn) => {
                    const accentClass = btn.type ? `retro-btn-accent-${btn.type}` : ''
                    return (
                      <button
                        key={`${item.id}-${btn.type}`}
                        className={`retro-btn retro-btn-secondary retro-btn-sm ${accentClass}`}
                        onClick={() => {
                          if (btn.type === 'note') {
                            setInlineNoteMenuId(prev => (prev === item.id ? null : item.id))
                            setInlineListMenuId(null)
                          } else if (btn.type === 'list') {
                            setInlineListMenuId(prev => (prev === item.id ? null : item.id))
                            setInlineNoteMenuId(null)
                          } else {
                            onUnsortedConvert?.(item.id, btn.type as Exclude<EntityType, 'idea'>)
                          }
                        }}
                      >
                        {btn.label}
                      </button>
                    )
                  })}
                </div>
                {inlineNoteMenuId === item.id && (
                  <div className="mt-2 flex gap-2 flex-wrap">
                    {[
                      { label: 'Note', subtype: 'generic' },
                      { label: 'Meeting', subtype: 'meeting' },
                      { label: 'Research', subtype: 'research' },
                      { label: 'Media', subtype: 'media' },
                      { label: 'YouTube', subtype: 'youtube' },
                    ].map(opt => (
                      <button
                        key={opt.label}
                        className="retro-btn retro-btn-secondary retro-btn-sm"
                        onClick={() => {
                          onUnsortedConvert?.(item.id, 'note', opt.subtype)
                          setInlineNoteMenuId(null)
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
                {inlineListMenuId === item.id && (
                  <div className="mt-2 flex gap-2 flex-wrap">
                    {[
                      { label: 'Bulleted', subtype: 'bulleted' },
                      { label: 'Numbered', subtype: 'numbered' },
                      { label: 'TaskList', subtype: 'tasklist' },
                      { label: 'Shopping', subtype: 'shopping' },
                    ].map(opt => (
                      <button
                        key={opt.label}
                        className="retro-btn retro-btn-secondary retro-btn-sm"
                        onClick={() => {
                          onUnsortedConvert?.(item.id, 'list', opt.subtype)
                          setInlineListMenuId(null)
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderJournal()}
          {renderMedia()}
        </div>

        {/* AI Recap Card */}
        <div className="retro-card" style={{ padding: '12px' }}>
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-xs font-mono opacity-70 uppercase">
                {recapLoading ? 'Loading...' : recap?.fallback ? 'Daily Quote' : 'AI Recap'}
              </div>
              <div className="text-sm font-semibold">
                {recap?.fallback ? 'Inspiration' : 'Yesterday\u2019s Activity'}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {recap?.cached && (
                <span className="text-[10px] opacity-50">cached</span>
              )}
              <button
                onClick={loadRecap}
                disabled={recapLoading}
                className="retro-btn retro-btn-secondary tap-target"
                style={{
                  width: '36px',
                  height: '36px',
                  padding: '8px',
                  minWidth: '36px',
                  minHeight: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  touchAction: 'manipulation',
                }}
                aria-label="Refresh recap"
                title="Refresh recap"
              >
                <RefreshCw size={16} className={recapLoading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Loading state */}
          {recapLoading && !recap && (
            <div className="flex items-center gap-2 py-4">
              <Loader2 size={16} className="animate-spin opacity-60" />
              <span className="text-sm opacity-60">Loading recap...</span>
            </div>
          )}

          {/* Error state */}
          {recapError && !recap && (
            <div className="text-sm opacity-60 py-2">
              {recapError}
            </div>
          )}

          {/* Quote display (fallback mode) */}
          {recap?.fallback && recap.quote && (
            <blockquote className="border-l-2 border-current pl-3 py-1 my-2 italic">
              <p className="text-sm">&ldquo;{recap.quote.text}&rdquo;</p>
              {recap.quote.author && (
                <cite className="text-xs opacity-70 not-italic block mt-1">
                  &mdash; {recap.quote.author}
                </cite>
              )}
            </blockquote>
          )}

          {/* AI Summary bullets (normal mode) */}
          {!recap?.fallback && recap?.summary && recap.summary.length > 0 && (
            <ul className="list-disc list-inside space-y-1 my-2">
              {recap.summary.map((bullet, i) => (
                <li key={i} className="text-sm">{bullet}</li>
              ))}
            </ul>
          )}

          {/* Stats footer */}
          {recap?.stats && (
            <div className="text-xs opacity-60 mt-3 pt-2 border-t border-dashed border-current/20">
              {recap.stats.tasks} task{recap.stats.tasks !== 1 ? 's' : ''} completed
              {' · '}
              {recap.stats.notes} note{recap.stats.notes !== 1 ? 's' : ''}
              {' · '}
              {recap.stats.ideas} idea{recap.stats.ideas !== 1 ? 's' : ''}
            </div>
          )}

          {/* AI error indicator */}
          {recap?.error && (
            <div className="text-[10px] opacity-50 mt-1">
              AI unavailable, showing quote
            </div>
          )}
        </div>
      </div>

      <hr className="retro-separator" style={{ marginLeft: '16px', marginRight: '16px' }} />

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
            {recentItems.slice(0, 5).map((item) => {
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

      {/* Note picker modal removed; note/list subtypes handled inline */}
    </div>
  )
}
