import type { Layer } from './layer'

export interface ProjectMeta {
  title: string
  created: string
  modified: string
}

export interface CanvasConfig {
  width: number
  height: number
}

export interface ProjectFile {
  __magic_circle__: true
  version: string
  meta: ProjectMeta
  canvas: CanvasConfig
  layers: Layer[]
}
