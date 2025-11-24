/**
 * Welcome Modal Component
 *
 * First-launch greeting modal that introduces users to IdeaListed
 * and offers to start the onboarding tour.
 *
 * Features:
 * - Centered modal with retro styling
 * - "Take Tour" and "Skip for now" buttons
 * - "Don't show again" checkbox
 * - LocalStorage-based first-launch detection
 * - Framer-motion scale animation
 * - SSR-safe implementation
 */

'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

const STORAGE_KEY = 'idealisted-welcome-shown'

interface WelcomeModalProps {
  isOpen: boolean
  onClose: () => void
  onStartTour: () => void
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({
  isOpen,
  onClose,
  onStartTour
}) => {
  const [dontShowAgain, setDontShowAgain] = useState(false)

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleSkip()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  const handleSkip = () => {
    if (dontShowAgain) {
      localStorage.setItem(STORAGE_KEY, 'true')
    }
    onClose()
  }

  const handleTakeTour = () => {
    // Always mark as shown when taking tour
    localStorage.setItem(STORAGE_KEY, 'true')
    onClose()
    onStartTour()
  }

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleSkip}
            className="fixed inset-0 bg-black/60 z-[1002] flex items-center justify-center"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-[500px] z-[1003]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="retro-card" style={{
              background: 'var(--palm-bg-primary)',
              border: '3px solid var(--palm-border-dark)',
              boxShadow: '4px 4px 0 var(--palm-border-dark)',
            }}>
              {/* Header */}
              <div className="retro-sheet-header" style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                background: 'var(--palm-screen-dark)',
                color: 'var(--palm-bg-primary)',
                borderBottom: '2px solid var(--palm-border-dark)',
              }}>
                <h2 style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  margin: 0,
                }}>
                  Welcome to IdeaListed!
                </h2>
                <button
                  onClick={handleSkip}
                  className="retro-close-btn"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--palm-bg-primary)',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Content */}
              <div style={{
                padding: '24px 20px',
              }}>
                <p style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: '14px',
                  lineHeight: '1.6',
                  color: 'var(--palm-text-primary)',
                  marginBottom: '16px',
                }}>
                  IdeaListed is your retro-themed idea capture and task management app.
                  Quickly capture thoughts, organize them with AI assistance, and track tasks
                  with a nostalgic Palm/Blackberry interface.
                </p>

                <p style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: '14px',
                  lineHeight: '1.6',
                  color: 'var(--palm-text-primary)',
                  marginBottom: '24px',
                }}>
                  Would you like a quick tour to get started?
                </p>

                {/* Checkbox */}
                <label className="retro-checkbox-label" style={{
                  display: 'flex',
                  alignItems: 'center',
                  fontFamily: 'var(--font-sans)',
                  fontSize: '13px',
                  color: 'var(--palm-text-primary)',
                  marginBottom: '24px',
                  cursor: 'pointer',
                }}>
                  <input
                    type="checkbox"
                    className="retro-checkbox"
                    checked={dontShowAgain}
                    onChange={(e) => setDontShowAgain(e.target.checked)}
                    style={{
                      width: '16px',
                      height: '16px',
                      marginRight: '8px',
                    }}
                  />
                  <span>Don&apos;t show this again</span>
                </label>

                {/* Action Buttons */}
                <div style={{
                  display: 'flex',
                  gap: '12px',
                  justifyContent: 'flex-end',
                }}>
                  <button
                    onClick={handleSkip}
                    className="retro-btn retro-btn-secondary"
                    style={{
                      padding: '10px 20px',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    Skip for now
                  </button>
                  <button
                    onClick={handleTakeTour}
                    className="retro-btn retro-btn-primary"
                    style={{
                      padding: '10px 20px',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    Take Tour
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
