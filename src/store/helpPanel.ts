import { create } from 'zustand'

interface HelpPanelState {
  isOpen: boolean
}
interface HelpPanelActions {
  open: () => void
  close: () => void
}

export const useHelpPanelStore = create<HelpPanelState & HelpPanelActions>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}))
