import type { PreviewBackground } from './editor'

// User preferences — persisted separately from project data.
// Stored under a dedicated localStorage key; never embedded in project files.

const PREFS_KEY = 'magic-circle-editor:preferences'

export interface StoredPreferences {
  previewBackground?: PreviewBackground
  theme?: 'light' | 'dark'
}

export function loadPreferences(): StoredPreferences {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (typeof parsed !== 'object' || parsed === null) return {}
    return parsed as StoredPreferences
  } catch {
    return {}
  }
}

export function savePreferences(prefs: Partial<StoredPreferences>): void {
  try {
    const existing = loadPreferences()
    localStorage.setItem(PREFS_KEY, JSON.stringify({ ...existing, ...prefs }))
  } catch {
    // QuotaExceededError or similar — fail silently
  }
}
