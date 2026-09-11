/** Built-in vector sigils, centered inside a 100 × 100 design space. */
export const EXTRA_SYMBOLS = {
  fire: { label: 'Fire', path: 'M 0 -44 L 39 32 L -39 32 Z' },
  water: { label: 'Water', path: 'M -39 -32 L 39 -32 L 0 44 Z' },
  air: { label: 'Air', path: 'M 0 -44 L 39 32 L -39 32 Z M -28 10 L 28 10' },
  earth: { label: 'Earth', path: 'M -39 -32 L 39 -32 L 0 44 Z M -28 -10 L 28 -10' },
  eye: {
    label: 'Mystic eye',
    path: 'M -46 0 Q 0 -43 46 0 Q 0 43 -46 0 Z M 14 0 A 14 14 0 1 0 -14 0 A 14 14 0 1 0 14 0 Z M 0 -31 L 0 -45 M -29 -24 L -37 -36 M 29 -24 L 37 -36',
  },
  pentagram: { label: 'Pentagram', path: 'M 0 -46 L 27 37 L -44 -14 L 44 -14 L -27 37 Z' },
  hexagram: { label: 'Hexagram', path: 'M 0 -46 L 40 23 L -40 23 Z M 0 46 L -40 -23 L 40 -23 Z' },
  trident: {
    label: 'Trident',
    path: 'M 0 46 L 0 -45 M -10 -32 L 0 -45 L 10 -32 M -32 -32 L -32 -8 Q -32 12 0 12 Q 32 12 32 -8 L 32 -32 M -41 -22 L -32 -34 L -23 -22 M 23 -22 L 32 -34 L 41 -22 M -16 35 L 16 35',
  },
  lightning: { label: 'Lightning', path: 'M 7 -46 L -31 7 L -5 7 L -14 46 L 33 -12 L 7 -12 Z' },
  infinity: { label: 'Infinity', path: 'M 0 0 C -60 -66 -60 66 0 0 C 60 -66 60 66 0 0 Z' },
  hourglass: {
    label: 'Hourglass',
    path: 'M -30 -43 L 30 -43 L -30 43 L 30 43 Z M -37 -43 L 37 -43 M -37 43 L 37 43',
  },
  crystal: {
    label: 'Crystal',
    path: 'M 0 -47 L 29 -19 L 29 22 L 0 47 L -29 22 L -29 -19 Z M 0 -47 L -12 -17 L -12 19 L 0 47 L 12 19 L 12 -17 Z M -29 -19 L -12 -17 L 12 -17 L 29 -19 M -29 22 L -12 19 L 12 19 L 29 22',
  },
  eclipse: {
    label: 'Eclipse',
    path: 'M 30 0 A 30 30 0 1 0 -30 0 A 30 30 0 1 0 30 0 Z M 0 -30 Q -28 0 0 30 Q 28 0 0 -30 Z M 0 -39 L 0 -48 M 0 39 L 0 48 M -39 0 L -48 0 M 39 0 L 48 0',
  },
  spiral: {
    label: 'Spiral',
    path: 'M 0 0 C 12 -12 24 10 10 20 C -15 38 -40 9 -26 -17 C -8 -50 41 -33 44 0 C 46 19 38 34 24 43',
  },
} as const

export const SYMBOL_IDS = [
  'sun',
  'moon',
  'cross',
  'rune',
  'diamond',
  'custom',
  'fire',
  'water',
  'air',
  'earth',
  'eye',
  'pentagram',
  'hexagram',
  'trident',
  'lightning',
  'infinity',
  'hourglass',
  'crystal',
  'eclipse',
  'spiral',
] as const
