import { create } from 'zustand'
import { generateId } from '../utils/id'

export type NotificationType = 'error' | 'warning' | 'info'

export interface AppNotification {
  id: string
  type: NotificationType
  message: string
}

interface NotificationsState {
  notifications: AppNotification[]
}

interface NotificationsActions {
  push: (type: NotificationType, message: string) => void
  dismiss: (id: string) => void
}

const AUTO_DISMISS_MS = 6000

export const useNotificationsStore = create<NotificationsState & NotificationsActions>((set) => ({
  notifications: [],

  push: (type, message) => {
    const id = generateId()
    set((state) => ({ notifications: [...state.notifications, { id, type, message }] }))
    setTimeout(() => {
      useNotificationsStore.getState().dismiss(id)
    }, AUTO_DISMISS_MS)
  },

  dismiss: (id) =>
    set((state) => ({ notifications: state.notifications.filter((n) => n.id !== id) })),
}))

export function notify(type: NotificationType, message: string): void {
  useNotificationsStore.getState().push(type, message)
}
