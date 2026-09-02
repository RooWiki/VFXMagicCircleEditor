import { describe, expect, it } from 'vitest'
import { DEFAULT_PARAMS, generateCircle } from '../generators/generator'
import { createRandomSeed } from '../generators/prng'
import { useGeneratorStore } from './generatorStore'

const SEED_FORMAT_RE = /^(magic|circle|vfx|ring|arc)-[0-9a-f]{6}$/

// ─── createRandomSeed ────────────────────────────────────────────────────────

describe('createRandomSeed', () => {
  it('returns a non-empty string', () => {
    expect(createRandomSeed().length).toBeGreaterThan(0)
  })

  it('never returns the hardcoded "magic-circle" string', () => {
    for (let i = 0; i < 10; i++) {
      expect(createRandomSeed()).not.toBe('magic-circle')
    }
  })

  it('matches the expected prefix-hex format', () => {
    for (let i = 0; i < 10; i++) {
      expect(createRandomSeed()).toMatch(SEED_FORMAT_RE)
    }
  })

  it('produces different values on consecutive calls', () => {
    // Probability of collision is 1/(16^6) ≈ 1 in 16.7M per prefix — negligible
    const seeds = new Set(Array.from({ length: 20 }, () => createRandomSeed()))
    expect(seeds.size).toBeGreaterThan(1)
  })
})

// ─── generatorStore — initial seed ──────────────────────────────────────────

describe('useGeneratorStore — initial seed', () => {
  it('initial seed is not the hardcoded "magic-circle"', () => {
    expect(useGeneratorStore.getState().seed).not.toBe('magic-circle')
  })

  it('initial seed is non-empty', () => {
    expect(useGeneratorStore.getState().seed.length).toBeGreaterThan(0)
  })

  it('initial seed matches the expected format', () => {
    expect(useGeneratorStore.getState().seed).toMatch(SEED_FORMAT_RE)
  })
})

// ─── generatorStore — seed stability across modal open/close ────────────────

describe('useGeneratorStore — seed stability across modal open/close', () => {
  it('open() does not change the seed', () => {
    const before = useGeneratorStore.getState().seed
    useGeneratorStore.getState().open()
    expect(useGeneratorStore.getState().seed).toBe(before)
    useGeneratorStore.getState().close()
  })

  it('close() does not change the seed', () => {
    useGeneratorStore.getState().open()
    const before = useGeneratorStore.getState().seed
    useGeneratorStore.getState().close()
    expect(useGeneratorStore.getState().seed).toBe(before)
  })

  it('open() → close() → open() preserves the seed', () => {
    const before = useGeneratorStore.getState().seed
    useGeneratorStore.getState().open()
    useGeneratorStore.getState().close()
    useGeneratorStore.getState().open()
    expect(useGeneratorStore.getState().seed).toBe(before)
    useGeneratorStore.getState().close()
  })
})

// ─── generateCircle determinism — unchanged ──────────────────────────────────

describe('generateCircle determinism — unchanged by seed format change', () => {
  it('same explicit seed + same params produces deep-equal Layer[]', () => {
    const seed = 'explicit-test-seed'
    const a = generateCircle(DEFAULT_PARAMS, seed)
    const b = generateCircle(DEFAULT_PARAMS, seed)
    expect(a).toEqual(b)
  })

  it('different explicit seeds produce different outputs', () => {
    const a = generateCircle(DEFAULT_PARAMS, 'seed-X')
    const b = generateCircle(DEFAULT_PARAMS, 'seed-Y')
    expect(a).not.toEqual(b)
  })

  it('a createRandomSeed() value used as seed produces consistent output', () => {
    const seed = createRandomSeed()
    const a = generateCircle(DEFAULT_PARAMS, seed)
    const b = generateCircle(DEFAULT_PARAMS, seed)
    expect(a).toEqual(b)
  })
})
