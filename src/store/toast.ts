import { create } from 'zustand'
import { generateId } from '../utils/id'

export type ToastKind = 'success' | 'error' | 'warning'

export interface Toast {
  id: string
  kind: ToastKind
  message: string
}

interface ToastState {
  toasts: Toast[]
}

interface ToastActions {
  addToast: (kind: ToastKind, message: string) => void
  removeToast: (id: string) => void
}

export type ToastStore = ToastState & ToastActions

const TOAST_DURATION_MS = 5000

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],

  addToast: (kind, message) => {
    const id = generateId()
    set((state) => ({ toasts: [...state.toasts, { id, kind, message }] }))
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
    }, TOAST_DURATION_MS)
  },

  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
  },
}))
