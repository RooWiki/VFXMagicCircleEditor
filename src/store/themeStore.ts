import { create } from 'zustand'
import { loadPreferences, savePreferences } from './preferences'

export type Theme = 'light' | 'dark'

interface ThemeStore {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

function applyThemeToDom(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme)
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
  theme: 'dark',

  setTheme: (theme) => {
    applyThemeToDom(theme)
    savePreferences({ theme })
    set({ theme })
  },

  toggleTheme: () => {
    get().setTheme(get().theme === 'dark' ? 'light' : 'dark')
  },
}))

// Initialize from saved preferences on module load
const saved = loadPreferences().theme ?? 'dark'
useThemeStore.getState().setTheme(saved)
