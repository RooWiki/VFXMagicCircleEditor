/**
 * Pure transform-math utilities for Phase 6 canvas interactions.
 *
 * All functions operate in logical project coordinates (+X right, +Y down).
 * None of these functions touch React, stores, or browser APIs.
 */

// ─── Angle utilities ──────────────────────────────────────────────────────────

/**
 * Compute the angle (radians) from pivot to pointer in project space.
 * Returns 0 for zero-length vectors instead of NaN.
 */
export function angleRadians(
  pointerX: number,
  pointerY: number,
  pivotX: number,
  pivotY: number
): number {
  const dx = pointerX - pivotX
  const dy = pointerY - pivotY
  if (dx === 0 && dy === 0) return 0
  return Math.atan2(dy, dx)
}

/**
 * Convert radians to degrees.
 */
export function radToDeg(rad: number): number {
  return rad * (180 / Math.PI)
}

/**
 * Compute the new rotation (degrees) for a rotate gesture.
 *
 * @param startAngleRad  Angle at pointerdown (radians)
 * @param currentAngleRad  Angle at current pointermove (radians)
 * @param startRotationDeg  Layer rotation at gesture start (degrees)
 */
export function calcRotation(
  startAngleRad: number,
  currentAngleRad: number,
  startRotationDeg: number
): number {
  const deltaDeg = radToDeg(currentAngleRad - startAngleRad)
  return startRotationDeg + deltaDeg
}

// ─── Vector rotation ──────────────────────────────────────────────────────────

/**
 * Apply the INVERSE rotation of angleDeg to a vector (i.e., rotate by -angleDeg).
 *
 * This maps world-space vectors into layer-local-axis coordinates by undoing
 * the layer's rotation. Pass layerRotationDeg (positive) to convert from world
 * to local; pass -layerRotationDeg to convert from local to world (forward rotation).
 *
 * Convention: SVG rotate(deg) in +Y-down space.
 */
export function rotateVec(x: number, y: number, angleDeg: number): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  return {
    x: x * cos + y * sin,
    y: -x * sin + y * cos,
  }
}

// ─── Move utilities ───────────────────────────────────────────────────────────

/**
 * Compute new layer X/Y from a move gesture.
 * Always derived from gesture-start state to prevent drift.
 */
export function calcMoveTransform(
  startX: number,
  startY: number,
  startWorldX: number,
  startWorldY: number,
  currentWorldX: number,
  currentWorldY: number
): { x: number; y: number } {
  return {
    x: startX + (currentWorldX - startWorldX),
    y: startY + (currentWorldY - startWorldY),
  }
}

// ─── Scale utilities ──────────────────────────────────────────────────────────

/** Minimum allowed scale magnitude to prevent division by near-zero. */
const SCALE_MIN = 0.001

/**
 * Compute new scaleX/scaleY from a corner-handle drag.
 *
 * Strategy:
 * 1. Convert the current pointer to layer-local coordinates (translate then inverse-rotate).
 * 2. Divide by the local vector at gesture start to get scale factors.
 * 3. Guard near-zero denominators.
 *
 * @param layerX  Layer pivot X in world space
 * @param layerY  Layer pivot Y in world space
 * @param layerRotationDeg  Current layer rotation (degrees)
 * @param startScaleX  scaleX at gesture start
 * @param startScaleY  scaleY at gesture start
 * @param startLocalX  X in layer-local space at gesture start (before scaling)
 * @param startLocalY  Y in layer-local space at gesture start (before scaling)
 * @param currentWorldX  Current pointer X in world space
 * @param currentWorldY  Current pointer Y in world space
 * @param shiftConstrained  Whether to preserve aspect ratio
 */
export function calcScaleTransform(
  layerX: number,
  layerY: number,
  layerRotationDeg: number,
  startScaleX: number,
  startScaleY: number,
  startLocalX: number,
  startLocalY: number,
  currentWorldX: number,
  currentWorldY: number,
  shiftConstrained: boolean
): { scaleX: number; scaleY: number } {
  // Convert current pointer to layer-local space (translate, inverse-rotate).
  // rotateVec(v, layerRotationDeg) undoes the layer's rotation (inverse = rotate by -deg).
  const worldRelX = currentWorldX - layerX
  const worldRelY = currentWorldY - layerY
  const localVec = rotateVec(worldRelX, worldRelY, layerRotationDeg)

  // Guard near-zero denominators (Math.sign(0)=0 would give 0; use ±SCALE_MIN instead)
  const denomX =
    Math.abs(startLocalX) < SCALE_MIN ? (startLocalX < 0 ? -SCALE_MIN : SCALE_MIN) : startLocalX
  const denomY =
    Math.abs(startLocalY) < SCALE_MIN ? (startLocalY < 0 ? -SCALE_MIN : SCALE_MIN) : startLocalY

  let scaleX = (localVec.x / denomX) * startScaleX
  let scaleY = (localVec.y / denomY) * startScaleY

  // Prevent exactly-zero scale (would make the layer invisible and unrecoverable)
  if (!Number.isFinite(scaleX) || Math.abs(scaleX) < SCALE_MIN) {
    scaleX = Math.sign(scaleX || startScaleX) * SCALE_MIN
  }
  if (!Number.isFinite(scaleY) || Math.abs(scaleY) < SCALE_MIN) {
    scaleY = Math.sign(scaleY || startScaleY) * SCALE_MIN
  }

  if (shiftConstrained) {
    // Determine dominant axis by fractional change from start
    const fracX = Math.abs(scaleX / startScaleX)
    const fracY = Math.abs(scaleY / startScaleY)
    const aspectRatio = Math.abs(startScaleY) > SCALE_MIN ? startScaleX / startScaleY : 1
    if (fracX >= fracY) {
      scaleY = scaleX / aspectRatio
    } else {
      scaleX = scaleY * aspectRatio
    }
    // Re-guard after constraint
    if (!Number.isFinite(scaleX) || Math.abs(scaleX) < SCALE_MIN)
      scaleX = Math.sign(scaleX || startScaleX) * SCALE_MIN
    if (!Number.isFinite(scaleY) || Math.abs(scaleY) < SCALE_MIN)
      scaleY = Math.sign(scaleY || startScaleY) * SCALE_MIN
  }

  return { scaleX, scaleY }
}

/**
 * Compute the layer-local position of a corner handle given the ring radius
 * and which corner (nw/ne/sw/se).
 *
 * The local position before scaling is the raw geometric corner; scaling is
 * already baked into the layer's scaleX/scaleY transform.
 * We use radius as the half-extent, so handles sit at the ring's bounding corners.
 */
export type CornerHandle = 'nw' | 'ne' | 'sw' | 'se'

export function cornerLocalPosition(
  radius: number,
  handle: CornerHandle
): { x: number; y: number } {
  const hx = handle === 'ne' || handle === 'se' ? radius : -radius
  const hy = handle === 'sw' || handle === 'se' ? radius : -radius
  return { x: hx, y: hy }
}
