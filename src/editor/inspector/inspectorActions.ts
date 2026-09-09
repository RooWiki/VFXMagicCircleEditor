import { useHistoryStore } from '../../store/history'
export const controlStyle = {
  background: 'var(--rw-bg-control)',
  color: 'var(--rw-text-primary)',
  border: '1px solid var(--rw-border-default)',
}
export function commitAction(action: () => void) {
  useHistoryStore.getState().beginInspectorEdit()
  action()
  useHistoryStore.getState().commitInspectorEdit()
}
