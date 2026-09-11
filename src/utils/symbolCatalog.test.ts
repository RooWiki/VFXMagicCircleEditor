import { describe, expect, it } from 'vitest'
import { EXTRA_SYMBOLS } from './symbolCatalog'
import { createDefaultProject, createSymbolLayer } from './factories'
import { parseProjectFileStrict } from '../schema/project'
import { buildExportSvgString } from './export'
import type { SymbolLayer } from '../types/layer'

describe('additional magic symbols', () => {
  it.each(Object.entries(EXTRA_SYMBOLS))(
    '%s survives project loading and exports its own colored geometry',
    (id, symbol) => {
      const layer: SymbolLayer = {
        ...createSymbolLayer(),
        symbol: id as SymbolLayer['symbol'],
        color: '#22d3ee',
        glowBlur: 3,
        glowColor: '#a78bfa',
      }
      const project = { ...createDefaultProject(), layers: [layer] }
      const parsed = parseProjectFileStrict(JSON.parse(JSON.stringify(project)))
      expect(parsed.ok).toBe(true)
      if (!parsed.ok) throw new Error('Project failed to load')
      const svg = buildExportSvgString(parsed.project, {
        widthPx: 512,
        heightPx: 512,
        backgroundColor: null,
        marginPercent: 0,
        selectedLayerId: null,
      })
      expect(svg).toContain(`d="${symbol.path}"`)
      expect(svg).toContain('stroke="#22d3ee"')
      expect(svg).toContain('flood-color="#a78bfa"')
      expect(svg).not.toMatch(/NaN|undefined/)
    }
  )
})
