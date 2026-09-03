import { resetDirtyState } from '../persistence/autosave'
import { importProjectFile } from '../schema/project'
import { showConfirm } from '../store/confirm'
import { useEditorStore } from '../store/editor'
import { useHistoryStore } from '../store/history'
import { useProjectStore } from '../store/project'
import type { Layer } from '../types/layer'
import { generateId } from '../utils/id'
import type { TemplateDefinition } from './templates'

function needsConfirmation(layerCount: number, isDirty: boolean): boolean {
  return layerCount > 0 && isDirty
}

export async function loadTemplate(
  template: TemplateDefinition,
  isDirty: boolean
): Promise<boolean> {
  const currentProject = useProjectStore.getState().project

  if (needsConfirmation(currentProject.layers.length, isDirty)) {
    const confirmed = await showConfirm(
      'You have unsaved changes. Loading a template will discard them. Continue?'
    )
    if (!confirmed) return false
  }

  let raw: unknown
  try {
    const response = await fetch(template.file)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    raw = (await response.json()) as unknown
  } catch (err) {
    throw new Error(
      `Could not fetch template "${template.name}": ${err instanceof Error ? err.message : String(err)}`
    )
  }

  const result = importProjectFile(raw)
  if (!result.ok) {
    throw new Error(`Invalid template file: ${result.error}`)
  }

  const now = new Date().toISOString()

  const freshLayers: Layer[] = result.project.layers.map((layer) => ({
    ...layer,
    id: generateId(),
  }))

  const project = {
    ...result.project,
    meta: {
      title: result.project.meta.title,
      created: now,
      modified: now,
    },
    layers: freshLayers,
  }

  useProjectStore.getState().setProject(project)
  useEditorStore.getState().clearSelection()
  useHistoryStore.getState().initHistory(project)
  resetDirtyState()

  return true
}
