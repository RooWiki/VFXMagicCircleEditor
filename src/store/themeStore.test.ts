import { beforeEach, describe, expect, it } from 'vitest'
import { useEditorStore } from './editor'
import { useProjectStore } from './project'
import { useThemeStore } from './themeStore'
import { createDefaultProject } from '../utils/factories'

// ─── Reset ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
  useThemeStore.setState({ theme: 'dark' })
  useProjectStore.setState({ project: createDefaultProject() })
  useEditorStore.setState({ previewBackground: 'dark' })
})

// ─── Initial state ────────────────────────────────────────────────────────────

describe('themeStore — initial state', () => {
  it('default theme is dark', () => {
    expect(useThemeStore.getState().theme).toBe('dark')
  })
})

// ─── setTheme ─────────────────────────────────────────────────────────────────

describe('themeStore — setTheme', () => {
  it('setTheme("light") updates store state', () => {
    useThemeStore.getState().setTheme('light')
    expect(useThemeStore.getState().theme).toBe('light')
  })

  it('setTheme("dark") updates store state', () => {
    useThemeStore.getState().setTheme('light')
    useThemeStore.getState().setTheme('dark')
    expect(useThemeStore.getState().theme).toBe('dark')
  })

  it('setTheme("light") sets html[data-theme="light"]', () => {
    useThemeStore.getState().setTheme('light')
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })

  it('setTheme("dark") sets html[data-theme="dark"]', () => {
    useThemeStore.getState().setTheme('dark')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  it('setTheme persists to localStorage via preferences', () => {
    useThemeStore.getState().setTheme('light')
    const raw = localStorage.getItem('magic-circle-editor:preferences')
    const parsed = JSON.parse(raw ?? '{}') as Record<string, unknown>
    expect(parsed.theme).toBe('light')
  })
})

// ─── toggleTheme ──────────────────────────────────────────────────────────────

describe('themeStore — toggleTheme', () => {
  it('toggleTheme flips dark → light', () => {
    useThemeStore.setState({ theme: 'dark' })
    useThemeStore.getState().toggleTheme()
    expect(useThemeStore.getState().theme).toBe('light')
  })

  it('toggleTheme flips light → dark', () => {
    useThemeStore.getState().setTheme('light')
    useThemeStore.getState().toggleTheme()
    expect(useThemeStore.getState().theme).toBe('dark')
  })

  it('toggleTheme updates DOM attribute', () => {
    useThemeStore.setState({ theme: 'dark' })
    useThemeStore.getState().toggleTheme()
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })
})

// ─── Isolation — project store not affected ───────────────────────────────────

describe('themeStore — project store isolation', () => {
  it('setTheme does not modify the project store', () => {
    const before = useProjectStore.getState().project
    useThemeStore.getState().setTheme('light')
    expect(useProjectStore.getState().project).toBe(before)
  })

  it('toggleTheme does not modify the project store', () => {
    const before = useProjectStore.getState().project
    useThemeStore.getState().toggleTheme()
    expect(useProjectStore.getState().project).toBe(before)
  })
})

// ─── Isolation — previewBackground not affected ────────────────────────────────

describe('themeStore — previewBackground independence', () => {
  it('setTheme does not change previewBackground', () => {
    useEditorStore.setState({ previewBackground: 'dark' })
    useThemeStore.getState().setTheme('light')
    expect(useEditorStore.getState().previewBackground).toBe('dark')
  })

  it('toggleTheme does not change previewBackground', () => {
    useEditorStore.setState({ previewBackground: 'light' })
    useThemeStore.getState().toggleTheme()
    expect(useEditorStore.getState().previewBackground).toBe('light')
  })

  it('setPreviewBackground does not change theme', () => {
    useThemeStore.getState().setTheme('dark')
    useEditorStore.getState().setPreviewBackground('light')
    expect(useThemeStore.getState().theme).toBe('dark')
  })

  it('all six theme+preview combinations are independently settable', () => {
    const themes = ['dark', 'light'] as const
    const previews = ['dark', 'light', 'transparent'] as const
    for (const theme of themes) {
      for (const preview of previews) {
        useThemeStore.getState().setTheme(theme)
        useEditorStore.getState().setPreviewBackground(preview)
        expect(useThemeStore.getState().theme).toBe(theme)
        expect(useEditorStore.getState().previewBackground).toBe(preview)
      }
    }
  })
})
