'use client'

import { useState, useCallback, useRef, useEffect } from 'react'

interface SpeechRecognitionHook {
  isListening: boolean
  transcript: string
  startListening: () => void
  stopListening: () => void
  resetTranscript: () => void
  isSupported: boolean
}

export function useSpeechRecognition(): SpeechRecognitionHook {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const recognitionRef = useRef<any>(null)

  // Check browser support
  const isSupported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort()
      }
    }
  }, [])

  const startListening = useCallback(() => {
    if (!isSupported) {
      alert('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.')
      return
    }

    // Get the SpeechRecognition API (with webkit prefix for Safari)
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SpeechRecognition()

    // Configuration
    recognition.continuous = false // Stop automatically after speech ends
    recognition.interimResults = false // Only return final results
    recognition.lang = 'en-US'
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      setIsListening(true)
    }

    recognition.onend = () => {
      setIsListening(false)
      recognitionRef.current = null
    }

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error)
      setIsListening(false)
      recognitionRef.current = null

      if (event.error === 'no-speech') {
        alert('No speech detected. Please try again.')
      } else if (event.error === 'not-allowed' || event.error === 'permission-denied') {
        alert('Microphone access denied. Please grant microphone permissions in your browser settings.')
      } else if (event.error === 'aborted') {
        // Silently ignore aborted errors (user stopped listening)
      } else {
        alert(`Speech recognition error: ${event.error}`)
      }
    }

    recognition.onresult = (event: any) => {
      const transcriptText = event.results[0][0].transcript
      setTranscript(transcriptText)
    }

    try {
      recognition.start()
      recognitionRef.current = recognition
    } catch (error) {
      console.error('Failed to start speech recognition:', error)
      setIsListening(false)
      alert('Failed to start voice input. Please try again.')
    }
  }, [isSupported])

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
    setIsListening(false)
  }, [])

  const resetTranscript = useCallback(() => {
    setTranscript('')
  }, [])

  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    resetTranscript,
    isSupported
  }
}
