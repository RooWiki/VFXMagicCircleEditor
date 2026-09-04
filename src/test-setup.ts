import '@testing-library/jest-dom'

// jsdom v26+ does not provide localStorage unless a storage file is configured.
// Provide a simple in-memory implementation so persistence tests work.
if (typeof globalThis.localStorage === 'undefined') {
  const _store: Record<string, string> = {}
  globalThis.localStorage = {
    getItem: (key: string) => _store[key] ?? null,
    setItem: (key: string, value: string) => {
      _store[key] = value
    },
    removeItem: (key: string) => {
      delete _store[key]
    },
    clear: () => {
      Object.keys(_store).forEach((k) => delete _store[k])
    },
    get length() {
      return Object.keys(_store).length
    },
    key: (index: number) => Object.keys(_store)[index] ?? null,
  } as Storage
}

// jsdom does not implement ResizeObserver — provide a no-op stub so components
// that use it can mount without throwing.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}

// jsdom does not implement URL.createObjectURL / revokeObjectURL.
// Provide no-op stubs so tests that import browser-export code don't crash
// on setup. Tests that need specific behavior should override these with vi.fn().
if (typeof URL.createObjectURL === 'undefined') {
  URL.createObjectURL = () => 'blob:stub-url'
}
if (typeof URL.revokeObjectURL === 'undefined') {
  URL.revokeObjectURL = () => {}
}

// jsdom may not expose PointerEvent globally. Extend MouseEvent so that
// dispatchEvent(new PointerEvent(...)) works in unit tests.
if (typeof globalThis.PointerEvent === 'undefined') {
  class PointerEvent extends MouseEvent {
    pointerId: number
    isPrimary: boolean
    constructor(type: string, init: PointerEventInit & MouseEventInit = {}) {
      super(type, init)
      this.pointerId = init.pointerId ?? 0
      this.isPrimary = init.isPrimary ?? true
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(globalThis as any).PointerEvent = PointerEvent
}
