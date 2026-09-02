import { create } from 'zustand'

interface ExportModalState {
  isOpen: boolean
}

interface ExportModalActions {
  open: () => void
  close: () => void
}

export const useExportModalStore = create<ExportModalState & ExportModalActions>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}))
