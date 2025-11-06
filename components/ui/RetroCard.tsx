import React from 'react'
import { cn } from '@/lib/utils'

interface RetroCardProps extends React.HTMLAttributes<HTMLDivElement> {
  inset?: boolean
}

export const RetroCard = React.forwardRef<HTMLDivElement, RetroCardProps>(
  ({ className, inset = false, children, ...props }, ref) => {
    return (
      <div
        className={cn(
          'palm-card',
          inset && 'inset',
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </div>
    )
  }
)

RetroCard.displayName = 'RetroCard'
