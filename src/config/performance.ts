/**
 * Performance Configuration
 * Centralized debounce values and performance settings for the application
 */

/**
 * Debounce Delays (in milliseconds)
 */
export const DEBOUNCE = {
  /** Search inputs - fast response needed */
  SEARCH: 250,
  
  /** Form inputs - balance between responsiveness and API calls */
  FORM_INPUT: 500,
  
  /** Preview generation - avoid excessive LLM calls */
  PREVIEW: 1000,
  
  /** Auto-save - prevent excessive writes */
  AUTO_SAVE: 1000,
} as const;

/**
 * ARIA Live Region Durations (in milliseconds)
 */
export const ARIA = {
  /** Quick announcements (column resize, toggle) */
  SHORT: 1000,
  
  /** Standard announcements (module reorder, save confirmation) */
  STANDARD: 5000,
  
  /** Important announcements (errors, warnings) */
  LONG: 8000,
} as const;

/**
 * Animation Durations (in milliseconds)
 */
export const ANIMATION = {
  /** Smooth transitions */
  TRANSITION: 300,
  
  /** Toast notifications */
  TOAST: 3000,
  
  /** Loading indicators */
  LOADING: 500,
} as const;

/**
 * Undo System Configuration
 */
export const UNDO = {
  /** Maximum number of undo states to keep in memory */
  MAX_HISTORY: 10,
  
  /** Time window for undo actions (in milliseconds) */
  WINDOW: 30000, // 30 seconds
} as const;

/**
 * Batch Processing Configuration
 */
export const BATCH = {
  /** Number of items to process concurrently */
  CHUNK_SIZE: 5,
  
  /** Delay between chunks (in milliseconds) */
  CHUNK_DELAY: 100,
} as const;
