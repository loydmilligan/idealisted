/// <reference types="next" />
/// <reference types="next/image-types/global" />

// Global type declarations
declare module '@/*' {
  const content: any
  export default content
}

// Environment variable types
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      OPENROUTER_API_KEY: string
      OPENROUTER_FREE_MODEL: string
      OPENROUTER_PAID_MODEL: string
      NEXT_PUBLIC_APP_URL: string
      NTFY_SERVER: string
      NTFY_TOPIC: string
      NTFY_USERNAME?: string
      NTFY_PASSWORD?: string
    }
  }
}

export {}
