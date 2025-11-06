'use client'

interface RetroIconProps {
  type: 'idea' | 'note' | 'task' | 'project' | 'list' | 'delete' | 'archive' | 'ai' | 'settings' | 'back'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export const RetroIcon: React.FC<RetroIconProps> = ({ type, size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  }

  const icons = {
    // Enhanced pixelated lightbulb with thick outline
    idea: (
      <svg viewBox="0 0 24 24" fill="none" className={sizeClasses[size]}>
        <path d="M12 2C8 2 5 5 5 9C5 12 7 14 8 15V18H16V15C17 14 19 12 19 9C19 5 16 2 12 2Z" 
              fill="currentColor" stroke="currentColor" strokeWidth="2"/>
        <path d="M8 20H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <path d="M10 22H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <path d="M12 6V10M12 14H12.5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    
    // Enhanced pixelated notepad with thick outline
    note: (
      <svg viewBox="0 0 24 24" fill="none" className={sizeClasses[size]}>
        <rect x="4" y="2" width="16" height="20" rx="1" 
              fill="currentColor" stroke="currentColor" strokeWidth="2"/>
        <path d="M8 7H16M8 11H16M8 15H12" 
              stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M18 6L20 4L20 8L18 6Z" 
              fill="currentColor" stroke="currentColor" strokeWidth="2"/>
      </svg>
    ),
    
    // Enhanced pixelated checkbox with thick outline
    task: (
      <svg viewBox="0 0 24 24" fill="none" className={sizeClasses[size]}>
        <rect x="3" y="3" width="18" height="18" rx="2" 
              fill="currentColor" stroke="currentColor" strokeWidth="2"/>
        <path d="M7 12L10 15L17 8" 
              stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    
    // Enhanced pixelated folder with thick outline
    project: (
      <svg viewBox="0 0 24 24" fill="none" className={sizeClasses[size]}>
        <path d="M3 3H9L11 5H21C21.5 5 22 5.5 22 6V20C22 20.5 21.5 21 21 21H3C2.5 21 2 20.5 2 20V4C2 3.5 2.5 3 3 3Z" 
              fill="currentColor" stroke="currentColor" strokeWidth="2"/>
        <path d="M8 12H16M8 16H16" 
              stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    
    // Enhanced pixelated list with thick outline
    list: (
      <svg viewBox="0 0 24 24" fill="none" className={sizeClasses[size]}>
        <rect x="3" y="4" width="3" height="3" fill="currentColor"/>
        <rect x="3" y="10.5" width="3" height="3" fill="currentColor"/>
        <rect x="3" y="17" width="3" height="3" fill="currentColor"/>
        <path d="M9 5.5H21M9 12H21M9 18.5H21" 
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
      </svg>
    ),
    
    // Enhanced pixelated trash with thick outline
    delete: (
      <svg viewBox="0 0 24 24" fill="none" className={sizeClasses[size]}>
        <path d="M3 6H5H21" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M8 6V4C8 3 9 2 10 2H14C15 2 16 3 16 4V6M19 6V20C19 21 18 22 17 22H7C6 22 5 21 5 20V6H19Z" 
              fill="currentColor" stroke="currentColor" strokeWidth="2"/>
        <path d="M10 11V17M14 11V17" 
              stroke="white" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
    
    // Enhanced pixelated archive box with thick outline
    archive: (
      <svg viewBox="0 0 24 24" fill="none" className={sizeClasses[size]}>
        <path d="M3 9L12 2L21 9V20C21 21 20 22 19 22H5C4 22 3 21 3 20V9Z" 
              fill="currentColor" stroke="currentColor" strokeWidth="2"/>
        <path d="M9 22V12H15V22" 
              stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    
    // Enhanced pixelated robot head with thick outline
    ai: (
      <svg viewBox="0 0 24 24" fill="none" className={sizeClasses[size]}>
        <rect x="4" y="8" width="16" height="12" rx="2" 
              fill="currentColor" stroke="currentColor" strokeWidth="2"/>
        <rect x="6" y="4" width="12" height="6" rx="1" 
              fill="currentColor" stroke="currentColor" strokeWidth="2"/>
        <circle cx="9" cy="7" r="1.5" fill="white"/>
        <circle cx="15" cy="7" r="1.5" fill="white"/>
        <rect x="10" y="11" width="4" height="2" rx="1" fill="white"/>
        <path d="M7 16H17" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    
    // Enhanced pixelated gear with thick outline
    settings: (
      <svg viewBox="0 0 24 24" fill="none" className={sizeClasses[size]}>
        <path d="M12 15C13.7 15 15 13.7 15 12C15 10.3 13.7 9 12 9C10.3 9 9 10.3 9 12C9 13.7 10.3 15 12 15Z" 
              fill="currentColor" stroke="currentColor" strokeWidth="2"/>
        <path d="M19.4 15C19.3 15.3 19.2 15.6 19.1 15.9L20.5 17.3C20.7 17.5 20.7 17.8 20.5 18L19 20.5C18.8 20.7 18.5 20.7 18.3 20.5L16.9 19.1C16.6 19.2 16.3 19.3 16 19.4V21.3C16 21.6 15.8 21.8 15.5 21.8H8.5C8.2 21.8 8 21.6 8 21.3V19.4C7.7 19.3 7.4 19.2 7.1 19.1L5.7 20.5C5.5 20.7 5.2 20.7 5 20.5L3.5 18C3.3 17.8 3.3 17.5 3.5 17.3L4.9 15.9C4.8 15.6 4.7 15.3 4.6 15H2.7C2.4 15 2.2 14.8 2.2 14.5V9.5C2.2 9.2 2.4 9 2.7 9H4.6C4.7 8.7 4.8 8.4 4.9 8.1L3.5 6.7C3.3 6.5 3.3 6.2 3.5 6L5 3.5C5.2 3.3 5.5 3.3 5.7 3.5L7.1 4.9C7.4 4.8 7.7 4.7 8 4.6V2.7C8 2.4 8.2 2.2 8.5 2.2H14.5C14.8 2.2 15 2.4 15 2.7V4.6C15.3 4.7 15.6 4.8 15.9 4.9L17.3 3.5C17.5 3.3 17.8 3.3 18 3.5L19.5 6C19.7 6.2 19.7 6.5 19.5 6.7L18.1 8.1C18.2 8.4 18.3 8.7 18.4 9H20.3C20.6 9 20.8 9.2 20.8 9.5V14.5C20.8 14.8 20.6 15 20.3 15H19.4Z" 
              fill="currentColor" stroke="currentColor" strokeWidth="2"/>
      </svg>
    ),
    
    // Enhanced pixelated back arrow with thick outline
    back: (
      <svg viewBox="0 0 24 24" fill="none" className={sizeClasses[size]}>
        <path d="M19 12H5M5 12L12 19M5 12L12 5" 
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    )
  }

  return (
    <div className={`text-current ${className}`}>
      {icons[type]}
    </div>
  )
}
