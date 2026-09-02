import { useNotificationsStore, type AppNotification } from '../store/notifications'

const TYPE_CLASSES: Record<AppNotification['type'], string> = {
  error: 'bg-red-900/90 border-red-700 text-red-200',
  warning: 'bg-amber-900/90 border-amber-700 text-amber-200',
  info: 'bg-neutral-800/90 border-neutral-600 text-neutral-200',
}

export default function NotificationBar() {
  const notifications = useNotificationsStore((s) => s.notifications)
  const dismiss = useNotificationsStore((s) => s.dismiss)

  if (notifications.length === 0) return null

  return (
    <div
      aria-live="polite"
      aria-label="Notifications"
      className="fixed top-4 left-1/2 -translate-x-1/2 z-40 flex flex-col gap-2 min-w-72 max-w-xl"
    >
      {notifications.map((n) => (
        <div
          key={n.id}
          role="alert"
          className={[
            'flex items-start gap-3 px-4 py-3 rounded-lg border text-sm shadow-xl',
            TYPE_CLASSES[n.type],
          ].join(' ')}
        >
          <span className="flex-1 leading-relaxed">{n.message}</span>
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={() => dismiss(n.id)}
            className="shrink-0 opacity-70 hover:opacity-100 text-lg leading-none -mt-0.5"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
