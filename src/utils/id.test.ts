import { describe, expect, it } from 'vitest'

describe('crypto.randomUUID', () => {
  it('returns a string', () => {
    expect(typeof crypto.randomUUID()).toBe('string')
  })

  it('returns a valid UUID v4 format', () => {
    const uuid = crypto.randomUUID()
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
  })

  it('generates unique values on consecutive calls', () => {
    const a = crypto.randomUUID()
    const b = crypto.randomUUID()
    expect(a).not.toBe(b)
  })
})
