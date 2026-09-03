import { importProjectFile, parseProjectFileStrict } from '../schema/project'
import { markProjectSaved, resetDirtyState } from './autosave'
import { showConfirm } from '../store/confirm'
import { notify } from '../store/notifications'
import { useAnimationStore } from '../store/animation'
import { useEditorStore } from '../store/editor'
import { useHistoryStore } from '../store/history'
import { useProjectStore } from '../store/project'
import { createDefaultProject } from '../utils/factories'
import type { ProjectFile } from '../types/project'

// ─── Guards ───────────────────────────────────────────────────────────────────

function needsConfirmation(project: ProjectFile, dirty: boolean): boolean {
  return project.layers.length > 0 && dirty
}

// ─── Download Project ─────────────────────────────────────────────────────────

export function downloadProject(): void {
  const project = useProjectStore.getState().project
  const now = new Date().toISOString()

  // Update modified timestamp only in the serialized representation
  const toSave: ProjectFile = {
    ...project,
    meta: { ...project.meta, modified: now },
  }

  const check = parseProjectFileStrict(toSave)
  if (!check.ok) {
    notify('error', 'Cannot save: project validation failed.')
    return
  }

  const json = JSON.stringify(toSave, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const safeName =
    project.meta.title
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/\s+/g, '_') || 'untitled'
  a.href = url
  a.download = `${safeName}.mce.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)

  markProjectSaved()
}

// ─── Open Project ─────────────────────────────────────────────────────────────

export async function openProject(file: File, isDirty: boolean): Promise<void> {
  const currentProject = useProjectStore.getState().project

  if (needsConfirmation(currentProject, isDirty)) {
    const confirmed = await showConfirm(
      'You have unsaved changes. Opening a new project will discard them. Continue?'
    )
    if (!confirmed) return
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(await file.text())
  } catch {
    notify('error', 'Could not read file: invalid JSON.')
    return
  }

  const result = importProjectFile(parsed)
  if (!result.ok) {
    notify('error', `Could not open project: ${result.error}`)
    return
  }

  if (result.skippedLayers > 0) {
    notify(
      'warning',
      `${result.skippedLayers} unsupported layer type${result.skippedLayers === 1 ? '' : 's'} were skipped.`
    )
  }

  useProjectStore.getState().setProject(result.project)
  useEditorStore.getState().clearSelection()
  useHistoryStore.getState().initHistory(result.project)
  useAnimationStore.getState().clearConfigs()
  resetDirtyState()
}

// ─── New Project ──────────────────────────────────────────────────────────────

export async function newProject(isDirty: boolean): Promise<void> {
  const currentProject = useProjectStore.getState().project

  if (needsConfirmation(currentProject, isDirty)) {
    const confirmed = await showConfirm(
      'You have unsaved changes. Creating a new project will discard them. Continue?'
    )
    if (!confirmed) return
  }

  const blank = createDefaultProject()
  useProjectStore.getState().setProject(blank)
  useEditorStore.getState().clearSelection()
  useHistoryStore.getState().initHistory(blank)
  useAnimationStore.getState().clearConfigs()
  resetDirtyState()
}
