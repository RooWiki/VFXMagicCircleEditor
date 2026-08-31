import '@testing-library/jest-dom'

// jsdom does not implement ResizeObserver — provide a no-op stub so components
// that use it can mount without throwing.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}
