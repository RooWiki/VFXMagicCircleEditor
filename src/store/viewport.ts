import { create } from 'zustand'
import { VIEWPORT_FIT_PADDING } from '../constants'
import { calcFitView, clampZoom, panByScreenDelta, zoomAroundPoint } from '../utils/viewport'

interface ViewportState {
  centerX: number
  centerY: number
  zoom: number
  /** Current CSS-pixel dimensions of the SVG viewport container. */
  viewportWidth: number
  viewportHeight: number
}

interface ViewportActions {
  setCenter: (x: number, y: number) => void
  setZoom: (zoom: number) => void
  /** Update stored viewport container dimensions (called by ResizeObserver). */
  setViewportSize: (width: number, height: number) => void
  /** Pan by a screen-space pointer delta. */
  pan: (deltaScreenX: number, deltaScreenY: number) => void
  /** Zoom around a screen-space point (cursor-anchored). */
  zoomAtPoint: (newZoom: number, screenX: number, screenY: number) => void
  /** Fit the canvas to the current viewport with padding. */
  fitView: (canvasWidth: number, canvasHeight: number) => void
  reset: () => void
}

export type ViewportStore = ViewportState & ViewportActions

const DEFAULT_STATE: ViewportState = {
  centerX: 0,
  centerY: 0,
  zoom: 1,
  viewportWidth: 0,
  viewportHeight: 0,
}

export const useViewportStore = create<ViewportStore>((set, get) => ({
  ...DEFAULT_STATE,

  setCenter: (x, y) => set({ centerX: x, centerY: y }),

  setZoom: (zoom) => set({ zoom: clampZoom(zoom) }),

  setViewportSize: (width, height) => set({ viewportWidth: width, viewportHeight: height }),

  pan: (deltaScreenX, deltaScreenY) =>
    set((state) =>
      panByScreenDelta(state.centerX, state.centerY, state.zoom, deltaScreenX, deltaScreenY)
    ),

  zoomAtPoint: (newZoom, screenX, screenY) =>
    set((state) =>
      zoomAroundPoint(
        state.zoom,
        newZoom,
        screenX,
        screenY,
        state.centerX,
        state.centerY,
        state.viewportWidth,
        state.viewportHeight
      )
    ),

  fitView: (canvasWidth, canvasHeight) => {
    const { viewportWidth, viewportHeight } = get()
    set(calcFitView(canvasWidth, canvasHeight, viewportWidth, viewportHeight, VIEWPORT_FIT_PADDING))
  },

  reset: () => set({ ...DEFAULT_STATE }),
}))
