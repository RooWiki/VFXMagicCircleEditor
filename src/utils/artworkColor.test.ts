import { expect, it } from 'vitest'
import { adjustColor } from './artworkColor'

it('adjusts hue, saturation and lightness independently', () => {
  expect(adjustColor('#ff0000', 120, 0, 0)).toBe('#00ff00')
  expect(adjustColor('#0000ff', -120, 0, 0)).toBe('#00ff00')
  expect(adjustColor('#ff0000', 0, -100, 0)).toBe('#808080')
  expect(adjustColor('#000000', 0, 0, 50)).toBe('#808080')
  expect(adjustColor('#fff', 0, 0, 0)).toBe('#fff')
  expect(adjustColor('none', 120, 50, 20)).toBe('none')
})
