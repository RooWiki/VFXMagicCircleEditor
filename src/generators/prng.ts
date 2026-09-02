export function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h, 31) + s.charCodeAt(i)
    h = h | 0
  }
  return h >>> 0
}

export function mulberry32(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let z = Math.imul(s ^ (s >>> 15), 1 | s)
    z = (z + Math.imul(z ^ (z >>> 7), 61 | z)) ^ z
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296
  }
}

export function seededRng(seedString: string): () => number {
  return mulberry32(hashString(seedString))
}

const SEED_PREFIXES = ['magic', 'circle', 'vfx', 'ring', 'arc'] as const

export function createRandomSeed(): string {
  const prefix = SEED_PREFIXES[Math.floor(Math.random() * SEED_PREFIXES.length)]
  const bytes = new Uint8Array(3)
  try {
    crypto.getRandomValues(bytes)
  } catch {
    // fallback for environments without Web Crypto (e.g. some CI runners)
    bytes[0] = Math.floor(Math.random() * 256)
    bytes[1] = Math.floor(Math.random() * 256)
    bytes[2] = Math.floor(Math.random() * 256)
  }
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${prefix}-${hex}`
}

export function prngUuid(rng: () => number): string {
  const bytes = Array.from({ length: 16 }, () => Math.floor(rng() * 256))
  bytes[6] = (bytes[6] & 0x0f) | 0x40 // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80 // variant 10xx
  const hex = bytes.map((b) => b.toString(16).padStart(2, '0'))
  return [
    hex.slice(0, 4).join(''),
    hex.slice(4, 6).join(''),
    hex.slice(6, 8).join(''),
    hex.slice(8, 10).join(''),
    hex.slice(10, 16).join(''),
  ].join('-')
}
