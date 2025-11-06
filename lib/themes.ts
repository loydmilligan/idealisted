export interface RetroTheme {
  name: string
  id: string
  colors: {
    primary: string
    secondary: string
    background: string
    surface: string
    text: string
    textSecondary: string
    border: string
    buttonFace: string
    buttonBorder: string
    buttonHighlight: string
    buttonShadow: string
    statusBg: string
    statusText: string
  }
}

export const retroThemes: RetroTheme[] = [
  {
    name: 'Classic Green',
    id: 'classic-green',
    colors: {
      primary: '#8B956D',
      secondary: '#7A835C',
      background: '#C5B99A',
      surface: '#D4C8A8',
      text: '#1A1F0F',
      textSecondary: '#4A5133',
      border: '#5A6143',
      buttonFace: '#9A8B70',
      buttonBorder: '#7A6B50',
      buttonHighlight: '#AA9B80',
      buttonShadow: '#6A5B40',
      statusBg: '#8B956D',
      statusText: '#1A1F0F'
    }
  },
  {
    name: 'Monochrome',
    id: 'monochrome',
    colors: {
      primary: '#666666',
      secondary: '#555555',
      background: '#E0E0E0',
      surface: '#F0F0F0',
      text: '#000000',
      textSecondary: '#333333',
      border: '#444444',
      buttonFace: '#CCCCCC',
      buttonBorder: '#999999',
      buttonHighlight: '#DDDDDD',
      buttonShadow: '#AAAAAA',
      statusBg: '#666666',
      statusText: '#FFFFFF'
    }
  },
  {
    name: 'Dark Mode',
    id: 'dark-mode',
    colors: {
      primary: '#2A2A2A',
      secondary: '#1A1A1A',
      background: '#0A0A0A',
      surface: '#1A1A1A',
      text: '#FFFFFF',
      textSecondary: '#CCCCCC',
      border: '#333333',
      buttonFace: '#333333',
      buttonBorder: '#555555',
      buttonHighlight: '#444444',
      buttonShadow: '#222222',
      statusBg: '#1A1A1A',
      statusText: '#FFFFFF'
    }
  }
]

export function applyTheme(theme: RetroTheme) {
  const root = document.documentElement
  
  Object.entries(theme.colors).forEach(([key, value]) => {
    root.style.setProperty(`--retro-${key}`, value)
  })
  
  // Store theme preference
  localStorage.setItem('retro-theme', theme.id)
}

export function getStoredTheme(): string {
  return typeof window !== 'undefined' 
    ? localStorage.getItem('retro-theme') || 'classic-green'
    : 'classic-green'
}

export function getThemeById(id: string): RetroTheme | undefined {
  return retroThemes.find(theme => theme.id === id)
}
