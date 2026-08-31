import { VIEWPORT_FIT_PADDING, VIEWPORT_ZOOM_MAX, VIEWPORT_ZOOM_MIN } from '../constants'

export function clampZoom(zoom: number): number {
  return Math.max(VIEWPORT_ZOOM_MIN, Math.min(VIEWPORT_ZOOM_MAX, zoom))
}

export interface ViewBox {
  x: number
  y: number
  width: number
  height: number
}

/** Derive the SVG viewBox from logical viewport center and zoom. */
export function calcViewBox(
  centerX: number,
  centerY: number,
  zoom: number,
  viewportWidth: number,
  viewportHeight: number
): ViewBox {
  if (viewportWidth <= 0 || viewportHeight <= 0 || zoom <= 0) {
    return { x: -500, y: -500, width: 1000, height: 1000 }
  }
  const logicalWidth = viewportWidth / zoom
  const logicalHeight = viewportHeight / zoom
  return {
    x: centerX - logicalWidth / 2,
    y: centerY - logicalHeight / 2,
    width: logicalWidth,
    height: logicalHeight,
  }
}

/**
 * Convert a screen-space point to a logical project coordinate.
 *
 * Screen origin is the top-left corner of the SVG element.
 * Derivation: world_x = center_x + (screen_x - viewportWidth/2) / zoom
 */
export function screenToWorld(
  screenX: number,
  screenY: number,
  centerX: number,
  centerY: number,
  zoom: number,
  viewportWidth: number,
  viewportHeight: number
): { x: number; y: number } {
  if (viewportWidth <= 0 || viewportHeight <= 0 || zoom <= 0) {
    return { x: 0, y: 0 }
  }
  return {
    x: centerX + (screenX - viewportWidth / 2) / zoom,
    y: centerY + (screenY - viewportHeight / 2) / zoom,
  }
}

/**
 * Convert a logical project coordinate to a screen-space point.
 *
 * Inverse of screenToWorld.
 */
export function worldToScreen(
  worldX: number,
  worldY: number,
  centerX: number,
  centerY: number,
  zoom: number,
  viewportWidth: number,
  viewportHeight: number
): { x: number; y: number } {
  if (viewportWidth <= 0 || viewportHeight <= 0 || zoom <= 0) {
    return { x: 0, y: 0 }
  }
  return {
    x: (worldX - centerX) * zoom + viewportWidth / 2,
    y: (worldY - centerY) * zoom + viewportHeight / 2,
  }
}

/**
 * Pan the viewport by a screen-space delta.
 *
 * Dragging right (positive deltaScreenX) moves the viewport center left,
 * causing visible artwork to shift right on screen.
 */
export function panByScreenDelta(
  centerX: number,
  centerY: number,
  zoom: number,
  deltaScreenX: number,
  deltaScreenY: number
): { centerX: number; centerY: number } {
  return {
    centerX: centerX - deltaScreenX / zoom,
    centerY: centerY - deltaScreenY / zoom,
  }
}

/**
 * Zoom around a specific screen point (cursor-anchored zoom).
 *
 * The logical coordinate under the cursor remains stationary after zooming.
 * Derivation:
 *   world_x = center_x + (screen_x - vw/2) / zoom
 *   Keeping world_x constant: center_new = center_old + (screen_x - vw/2) * (1/zoom_old - 1/zoom_new)
 */
export function zoomAroundPoint(
  currentZoom: number,
  rawNewZoom: number,
  screenX: number,
  screenY: number,
  centerX: number,
  centerY: number,
  viewportWidth: number,
  viewportHeight: number
): { zoom: number; centerX: number; centerY: number } {
  const newZoom = clampZoom(rawNewZoom)
  if (viewportWidth <= 0 || viewportHeight <= 0 || currentZoom <= 0) {
    return { zoom: newZoom, centerX, centerY }
  }
  const dx = screenX - viewportWidth / 2
  const dy = screenY - viewportHeight / 2
  return {
    zoom: newZoom,
    centerX: centerX + dx * (1 / currentZoom - 1 / newZoom),
    centerY: centerY + dy * (1 / currentZoom - 1 / newZoom),
  }
}

/**
 * Calculate the zoom and center that fit the canvas exactly in the viewport
 * with equal padding on all sides.
 */
export function calcFitView(
  canvasWidth: number,
  canvasHeight: number,
  viewportWidth: number,
  viewportHeight: number,
  padding: number = VIEWPORT_FIT_PADDING
): { zoom: number; centerX: number; centerY: number } {
  if (viewportWidth <= 0 || viewportHeight <= 0) {
    return { zoom: 1, centerX: 0, centerY: 0 }
  }
  const available = Math.min(viewportWidth - padding * 2, viewportHeight - padding * 2)
  if (available <= 0) {
    return { zoom: VIEWPORT_ZOOM_MIN, centerX: 0, centerY: 0 }
  }
  const zoomX = (viewportWidth - padding * 2) / canvasWidth
  const zoomY = (viewportHeight - padding * 2) / canvasHeight
  const zoom = clampZoom(Math.min(zoomX, zoomY))
  return { zoom, centerX: 0, centerY: 0 }
}

/** Format a zoom value as a rounded percentage string. */
export function formatZoomPercent(zoom: number): string {
  return `${Math.round(zoom * 100)}%`
}
