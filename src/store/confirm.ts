import { create } from 'zustand'

// Promise-based confirmation dialog — call showConfirm() from anywhere;
// the ConfirmDialog component resolves it when the user responds.

type ResolveFn = (confirmed: boolean) => void

interface ConfirmState {
  isOpen: boolean
  message: string
  _resolve: ResolveFn | null
}

interface ConfirmActions {
  _open: (message: string, resolve: ResolveFn) => void
  respond: (confirmed: boolean) => void
}

export const useConfirmStore = create<ConfirmState & ConfirmActions>((set, get) => ({
  isOpen: false,
  message: '',
  _resolve: null,

  _open: (message, resolve) => set({ isOpen: true, message, _resolve: resolve }),

  respond: (confirmed) => {
    const resolve = get()._resolve
    set({ isOpen: false, message: '', _resolve: null })
    resolve?.(confirmed)
  },
}))

export function showConfirm(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    useConfirmStore.getState()._open(message, resolve)
  })
}
