import { create } from 'zustand'

interface TemplateGalleryState {
  isOpen: boolean
}

interface TemplateGalleryActions {
  open: () => void
  close: () => void
}

export const useTemplateGalleryStore = create<TemplateGalleryState & TemplateGalleryActions>(
  (set) => ({
    isOpen: false,
    open: () => set({ isOpen: true }),
    close: () => set({ isOpen: false }),
  })
)
