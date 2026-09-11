export const TEXTURE_IDS = [
  'solid',
  'grain',
  'worn',
  'fibers',
  'hatching',
  'crosshatch',
  'dots',
  'scales',
  'cracks',
  'thorns',
] as const
export const TEXTURE_LABELS: Record<(typeof TEXTURE_IDS)[number], string> = {
  solid: 'Solid',
  grain: 'Grain',
  worn: 'Worn ink',
  fibers: 'Fibers',
  hatching: 'Hatching',
  crosshatch: 'Crosshatch',
  dots: 'Dots',
  scales: 'Scales',
  cracks: 'Cracks',
  thorns: 'Thorns',
}
