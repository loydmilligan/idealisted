import React from 'react'
import { cn } from '@/lib/utils'

interface RetroInputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const RetroInput = React.forwardRef<HTMLInputElement, RetroInputProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        className={cn('palm-input', className)}
        ref={ref}
        {...props}
      />
    )
  }
)

RetroInput.displayName = 'RetroInput'

interface RetroTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const RetroTextarea = React.forwardRef<HTMLTextAreaElement, RetroTextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn('palm-textarea', className)}
        ref={ref}
        {...props}
      />
    )
  }
)

RetroTextarea.displayName = 'RetroTextarea'
