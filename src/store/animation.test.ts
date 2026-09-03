import { beforeEach, describe, expect, it } from 'vitest'
import { useProjectStore } from './project'
import { computeAnimatedTransform, useAnimationStore, type AnimationStore } from './animation'
import { createDefaultProject, createRingLayer } from '../utils/factories'
import type { Transform } from '../types/layer'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getAnim = () => useAnimationStore.getState()

const BASE_TRANSFORM: Transform = { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 }
const BASE_TRANSFORM_OFFSET: Transform = { x: 10, y: -5, rotation: 45, scaleX: 2, scaleY: 0.5 }

// ─── Reset store before each test ─────────────────────────────────────────────

beforeEach(() => {
  useAnimationStore.setState({
    isPlaying: false,
    elapsedMs: 0,
    configs: {},
  } as AnimationStore)
  useProjectStore.setState({ project: createDefaultProject() })
})

// ─── computeAnimatedTransform — pure function ──────────────────────────────────

describe('computeAnimatedTransform', () => {
  it('returns base transform when all config values are zero', () => {
    const result = computeAnimatedTransform(
      BASE_TRANSFORM,
      { rotationSpeed: 0, pulseSpeed: 0, pulseAmplitude: 0 },
      1000
    )
    expect(result.rotation).toBe(0)
    expect(result.scaleX).toBe(1)
    expect(result.scaleY).toBe(1)
    expect(result.x).toBe(0)
    expect(result.y).toBe(0)
  })

  it('applies rotation offset: rotationSpeed=360 at t=1000ms → rotation offset 360°', () => {
    const result = computeAnimatedTransform(
      BASE_TRANSFORM,
      { rotationSpeed: 360, pulseSpeed: 0, pulseAmplitude: 0 },
      1000
    )
    expect(result.rotation).toBeCloseTo(360)
  })

  it('applies rotation offset: rotationSpeed=30 at t=12000ms → rotation offset 360°', () => {
    const result = computeAnimatedTransform(
      BASE_TRANSFORM,
      { rotationSpeed: 30, pulseSpeed: 0, pulseAmplitude: 0 },
      12000
    )
    expect(result.rotation).toBeCloseTo(360)
  })

  it('adds rotation offset on top of base rotation', () => {
    const result = computeAnimatedTransform(
      BASE_TRANSFORM_OFFSET,
      { rotationSpeed: 90, pulseSpeed: 0, pulseAmplitude: 0 },
      2000
    )
    expect(result.rotation).toBeCloseTo(45 + 180)
  })

  it('preserves base x and y unchanged', () => {
    const result = computeAnimatedTransform(
      BASE_TRANSFORM_OFFSET,
      { rotationSpeed: 360, pulseSpeed: 1, pulseAmplitude: 0.5 },
      500
    )
    expect(result.x).toBe(10)
    expect(result.y).toBe(-5)
  })

  it('pulse: at t=0 pulseScale is 1 (sin(0)=0)', () => {
    const result = computeAnimatedTransform(
      BASE_TRANSFORM,
      { rotationSpeed: 0, pulseSpeed: 1, pulseAmplitude: 0.5 },
      0
    )
    expect(result.scaleX).toBeCloseTo(1)
    expect(result.scaleY).toBeCloseTo(1)
  })

  it('pulse: at quarter cycle (t=250ms, speed=1Hz) pulseScale is 1 + amplitude', () => {
    const result = computeAnimatedTransform(
      BASE_TRANSFORM,
      { rotationSpeed: 0, pulseSpeed: 1, pulseAmplitude: 0.5 },
      250
    )
    // sin(2π × 1 × 0.25) = sin(π/2) = 1 → pulseScale = 1 + 0.5 = 1.5
    expect(result.scaleX).toBeCloseTo(1.5)
    expect(result.scaleY).toBeCloseTo(1.5)
  })

  it('pulse: scales are applied on top of base scale', () => {
    const result = computeAnimatedTransform(
      BASE_TRANSFORM_OFFSET,
      { rotationSpeed: 0, pulseSpeed: 1, pulseAmplitude: 1 },
      250
    )
    // pulseScale = 1 + sin(π/2) = 2
    // scaleX = 2 * 2 = 4, scaleY = 0.5 * 2 = 1
    expect(result.scaleX).toBeCloseTo(4)
    expect(result.scaleY).toBeCloseTo(1)
  })

  it('negative rotationSpeed rotates in the opposite direction', () => {
    const result = computeAnimatedTransform(
      BASE_TRANSFORM,
      { rotationSpeed: -90, pulseSpeed: 0, pulseAmplitude: 0 },
      1000
    )
    expect(result.rotation).toBeCloseTo(-90)
  })
})

// ─── Store — initial state ─────────────────────────────────────────────────────

describe('animation store — initial state', () => {
  it('isPlaying is false', () => {
    expect(getAnim().isPlaying).toBe(false)
  })

  it('elapsedMs is 0', () => {
    expect(getAnim().elapsedMs).toBe(0)
  })

  it('configs is an empty record', () => {
    expect(getAnim().configs).toEqual({})
  })
})

// ─── Store — play / pause ──────────────────────────────────────────────────────

describe('animation store — play / pause', () => {
  it('play() sets isPlaying to true', () => {
    getAnim().play()
    expect(getAnim().isPlaying).toBe(true)
  })

  it('pause() sets isPlaying to false', () => {
    getAnim().play()
    getAnim().pause()
    expect(getAnim().isPlaying).toBe(false)
  })

  it('pause() does not change elapsedMs', () => {
    getAnim().play()
    getAnim().tick(500)
    getAnim().pause()
    expect(getAnim().elapsedMs).toBe(500)
  })
})

// ─── Store — tick ─────────────────────────────────────────────────────────────

describe('animation store — tick', () => {
  it('tick() while playing advances elapsedMs', () => {
    getAnim().play()
    getAnim().tick(1000)
    expect(getAnim().elapsedMs).toBe(1000)
  })

  it('tick() while paused does not advance elapsedMs', () => {
    getAnim().tick(500)
    expect(getAnim().elapsedMs).toBe(0)
  })

  it('multiple ticks accumulate', () => {
    getAnim().play()
    getAnim().tick(200)
    getAnim().tick(300)
    getAnim().tick(500)
    expect(getAnim().elapsedMs).toBe(1000)
  })

  // ── ROADMAP required test 1 ─────────────────────────────────────────────────
  it('after tick(1000) with rotationSpeed=360, animated rotation offset is 360°', () => {
    const layerId = 'test-layer'
    getAnim().setLayerConfig(layerId, { rotationSpeed: 360, pulseSpeed: 0, pulseAmplitude: 0 })
    getAnim().play()
    getAnim().tick(1000)

    const config = getAnim().configs[layerId]!
    const animated = computeAnimatedTransform(BASE_TRANSFORM, config, getAnim().elapsedMs)
    expect(animated.rotation - BASE_TRANSFORM.rotation).toBeCloseTo(360)
  })

  // ── ROADMAP required test 3 ─────────────────────────────────────────────────
  it('play() followed by tick(0) does not change the project store', () => {
    const before = useProjectStore.getState().project
    getAnim().play()
    getAnim().tick(0)
    expect(useProjectStore.getState().project).toBe(before)
  })
})

// ─── Store — reset ─────────────────────────────────────────────────────────────

describe('animation store — reset', () => {
  // ── ROADMAP required test 2 ─────────────────────────────────────────────────
  it('reset() returns elapsedMs to 0', () => {
    getAnim().play()
    getAnim().tick(5000)
    getAnim().reset()
    expect(getAnim().elapsedMs).toBe(0)
  })

  it('reset() stops playback', () => {
    getAnim().play()
    getAnim().reset()
    expect(getAnim().isPlaying).toBe(false)
  })

  it('reset() preserves existing configs', () => {
    getAnim().setLayerConfig('layer-1', { rotationSpeed: 90, pulseSpeed: 0, pulseAmplitude: 0 })
    getAnim().play()
    getAnim().tick(2000)
    getAnim().reset()
    expect(getAnim().configs['layer-1']).toBeDefined()
    expect(getAnim().configs['layer-1']!.rotationSpeed).toBe(90)
  })

  it('after reset all animated transforms equal base transforms', () => {
    const layerId = 'test-layer'
    getAnim().setLayerConfig(layerId, { rotationSpeed: 360, pulseSpeed: 1, pulseAmplitude: 0.5 })
    getAnim().play()
    getAnim().tick(3000)
    getAnim().reset()

    const config = getAnim().configs[layerId]!
    const animated = computeAnimatedTransform(BASE_TRANSFORM, config, getAnim().elapsedMs)
    // At elapsedMs=0: rotationOffset=0, pulseScale=1
    expect(animated.rotation).toBeCloseTo(BASE_TRANSFORM.rotation)
    expect(animated.scaleX).toBeCloseTo(BASE_TRANSFORM.scaleX)
    expect(animated.scaleY).toBeCloseTo(BASE_TRANSFORM.scaleY)
  })
})

// ─── Store — setLayerConfig ────────────────────────────────────────────────────

describe('animation store — setLayerConfig', () => {
  it('creates a new config with defaults for unset fields', () => {
    getAnim().setLayerConfig('a', { rotationSpeed: 45 })
    const cfg = getAnim().configs['a']!
    expect(cfg.rotationSpeed).toBe(45)
    expect(cfg.pulseSpeed).toBe(0)
    expect(cfg.pulseAmplitude).toBe(0)
  })

  it('merges partial patches into existing config', () => {
    getAnim().setLayerConfig('a', { rotationSpeed: 45, pulseSpeed: 1, pulseAmplitude: 0.3 })
    getAnim().setLayerConfig('a', { pulseAmplitude: 0.7 })
    const cfg = getAnim().configs['a']!
    expect(cfg.rotationSpeed).toBe(45)
    expect(cfg.pulseSpeed).toBe(1)
    expect(cfg.pulseAmplitude).toBe(0.7)
  })

  it('does not affect configs for other layers', () => {
    getAnim().setLayerConfig('a', { rotationSpeed: 10 })
    getAnim().setLayerConfig('b', { rotationSpeed: 20 })
    expect(getAnim().configs['a']!.rotationSpeed).toBe(10)
    expect(getAnim().configs['b']!.rotationSpeed).toBe(20)
  })
})

// ─── Store — removeLayerConfig ────────────────────────────────────────────────

describe('animation store — removeLayerConfig', () => {
  it('removes a config by layer ID', () => {
    getAnim().setLayerConfig('a', { rotationSpeed: 90 })
    getAnim().removeLayerConfig('a')
    expect(getAnim().configs['a']).toBeUndefined()
  })

  it('does not remove other configs', () => {
    getAnim().setLayerConfig('a', { rotationSpeed: 90 })
    getAnim().setLayerConfig('b', { rotationSpeed: 30 })
    getAnim().removeLayerConfig('a')
    expect(getAnim().configs['b']).toBeDefined()
  })

  it('is a no-op when layer has no config', () => {
    expect(() => getAnim().removeLayerConfig('nonexistent')).not.toThrow()
    expect(getAnim().configs).toEqual({})
  })
})

// ─── Store — clearConfigs ─────────────────────────────────────────────────────

describe('animation store — clearConfigs', () => {
  it('removes all configs', () => {
    getAnim().setLayerConfig('a', { rotationSpeed: 90 })
    getAnim().setLayerConfig('b', { rotationSpeed: 30 })
    getAnim().clearConfigs()
    expect(getAnim().configs).toEqual({})
  })

  it('stops playback', () => {
    getAnim().play()
    getAnim().clearConfigs()
    expect(getAnim().isPlaying).toBe(false)
  })

  it('resets elapsedMs to 0', () => {
    getAnim().play()
    getAnim().tick(3000)
    getAnim().clearConfigs()
    expect(getAnim().elapsedMs).toBe(0)
  })
})

// ─── Store isolation — project store not mutated by animation ────────────────

describe('animation store — project store isolation', () => {
  it('play() does not modify the project store', () => {
    const ring = createRingLayer()
    useProjectStore.getState().addLayer(ring)
    const before = useProjectStore.getState().project.layers[0]!.transform

    getAnim().setLayerConfig(ring.id, { rotationSpeed: 360, pulseSpeed: 0, pulseAmplitude: 0 })
    getAnim().play()
    getAnim().tick(2000)

    const after = useProjectStore.getState().project.layers[0]!.transform
    expect(after).toStrictEqual(before)
  })

  it('reset() does not modify the project store', () => {
    const ring = createRingLayer()
    useProjectStore.getState().addLayer(ring)
    getAnim().setLayerConfig(ring.id, { rotationSpeed: 360, pulseSpeed: 0, pulseAmplitude: 0 })
    getAnim().play()
    getAnim().tick(1000)

    const before = useProjectStore.getState().project.layers[0]!.transform.rotation
    getAnim().reset()
    expect(useProjectStore.getState().project.layers[0]!.transform.rotation).toBe(before)
  })

  it('clearConfigs() does not modify the project store', () => {
    const ring = createRingLayer()
    useProjectStore.getState().addLayer(ring)
    getAnim().setLayerConfig(ring.id, { rotationSpeed: 180 })
    getAnim().play()
    getAnim().tick(500)

    const before = useProjectStore.getState().project
    getAnim().clearConfigs()
    expect(useProjectStore.getState().project).toBe(before)
  })
})
