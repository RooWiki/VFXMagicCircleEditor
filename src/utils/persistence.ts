import type { PreviewBackground } from '../store/editor'
import type { ProjectFile } from '../types/project'

export const AUTOSAVE_KEY = 'magic-circle-editor:autosave'
export const PREFERENCES_KEY = 'magic-circle-editor:preferences'

export interface Preferences {
  gridVisible: boolean
  guidesVisible: boolean
  previewBackground: PreviewBackground
}

const VALID_BACKGROUNDS = new Set<string>(['dark', 'light', 'transparent'])

export function loadRawAutosave(): string | null {
  try {
    return localStorage.getItem(AUTOSAVE_KEY)
  } catch {
    return null
  }
}

export function saveAutosave(project: ProjectFile): void {
  try {
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(project))
  } catch {
    // Storage quota exceeded or unavailable — silently ignore
  }
}

export function clearAutosave(): void {
  try {
    localStorage.removeItem(AUTOSAVE_KEY)
  } catch {
    // Unavailable — silently ignore
  }
}

export function loadPreferences(): Preferences | null {
  try {
    const raw = localStorage.getItem(PREFERENCES_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (typeof parsed !== 'object' || parsed === null) return null
    const obj = parsed as Record<string, unknown>
    if (
      typeof obj.gridVisible !== 'boolean' ||
      typeof obj.guidesVisible !== 'boolean' ||
      typeof obj.previewBackground !== 'string' ||
      !VALID_BACKGROUNDS.has(obj.previewBackground)
    ) {
      return null
    }
    return {
      gridVisible: obj.gridVisible,
      guidesVisible: obj.guidesVisible,
      previewBackground: obj.previewBackground as PreviewBackground,
    }
  } catch {
    return null
  }
}

export function savePreferences(prefs: Preferences): void {
  try {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(prefs))
  } catch {
    // Storage quota exceeded — silently ignore
  }
}

export function sanitizeFilename(title: string): string {
  const sanitized = title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '')
  return sanitized || 'untitled'
}
