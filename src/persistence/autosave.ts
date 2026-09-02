import { parseProjectFileStrict } from '../schema/project'
import { useHistoryStore } from '../store/history'
import { useProjectStore } from '../store/project'
import type { ProjectFile } from '../types/project'

const AUTOSAVE_KEY = 'magic-circle-editor:autosave'
const DEBOUNCE_MS = 2000

// ─── Dirty tracking via history pointer (O(1), undo-aware) ───────────────────
//
// Instead of a boolean flag that can't revert through undo, we record the
// history pointer at the last save/load boundary. isDirty = current pointer
// differs from that saved pointer. Undoing back to the saved pointer correctly
// returns isDirty to false without any extra subscription work.

let savedHistoryPointer: number | null = null
let autosaveTimer: ReturnType<typeof setTimeout> | null = null

export function isProjectDirty(): boolean {
  if (savedHistoryPointer === null) return false
  return useHistoryStore.getState().pointer !== savedHistoryPointer
}

export function markProjectSaved(): void {
  savedHistoryPointer = useHistoryStore.getState().pointer
}

// ─── Autosave write ───────────────────────────────────────────────────────────

function doAutosave(): void {
  autosaveTimer = null
  const project = useProjectStore.getState().project
  try {
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(project))
  } catch (e) {
    console.error('[autosave] Write failed:', e)
  }
}

function scheduleAutosave(): void {
  if (autosaveTimer !== null) clearTimeout(autosaveTimer)
  autosaveTimer = setTimeout(doAutosave, DEBOUNCE_MS)
}

function cancelAutosave(): void {
  if (autosaveTimer !== null) {
    clearTimeout(autosaveTimer)
    autosaveTimer = null
  }
}

// ─── Restore ──────────────────────────────────────────────────────────────────

export function tryRestoreFromAutosave(): ProjectFile | null {
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    const result = parseProjectFileStrict(parsed)
    if (!result.ok) {
      console.error('[autosave] Restore validation failed:', result.error)
      return null
    }
    return result.project
  } catch (e) {
    console.error('[autosave] Restore parse error:', e)
    return null
  }
}

// ─── Subscription start ───────────────────────────────────────────────────────

// Call AFTER any initial project restore so the restore itself doesn't mark dirty.
// Returns an unsubscribe function.
export function startAutosaveSubscription(): () => void {
  return useProjectStore.subscribe((state, prevState) => {
    if (state.project !== prevState.project) {
      scheduleAutosave()
    }
  })
}

// Cancel any in-flight autosave and record the current history pointer as the
// clean baseline. Call after load/restore/new so the freshly loaded state is
// treated as clean.
export function resetDirtyState(): void {
  cancelAutosave()
  savedHistoryPointer = useHistoryStore.getState().pointer
}
