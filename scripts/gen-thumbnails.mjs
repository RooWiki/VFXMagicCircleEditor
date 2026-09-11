#!/usr/bin/env node
/**
 * Generates SVG thumbnails from template JSON files and converts them to 512×512 PNGs.
 * Requires: rsvg-convert (pacman -S librsvg)
 * Usage: node scripts/gen-thumbnails.mjs [template-id ...]
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { execSync } from 'child_process'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dir, '..')
const TMPL_DIR = join(ROOT, 'public', 'templates')
const THUMB_DIR = join(TMPL_DIR, 'thumbnails')

mkdirSync(THUMB_DIR, { recursive: true })

// ─── Symbol path data (100×100 design space, centered) ──────────────────────
const SYMBOL_PATHS = {
  sun:       'M 0 -40 A 40 40 0 1 1 -0.01 -40 Z M 0 -18 A 18 18 0 1 0 0.01 -18 Z M 0 -50 L 0 -45 M 0 50 L 0 45 M -50 0 L -45 0 M 50 0 L 45 0 M -35 -35 L -31 -31 M 35 -35 L 31 -31 M -35 35 L -31 31 M 35 35 L 31 31',
  moon:      'M 17.5 11.5 A 37.5 37.5 0 0 1 8.5 -37.5 A 37.5 37.5 0 1 0 17.5 11.5 Z',
  cross:     'M -5 -46 L 5 -46 L 5 -5 L 46 -5 L 46 5 L 5 5 L 5 46 L -5 46 L -5 5 L -46 5 L -46 -5 L -5 -5 Z',
  rune:      'M -20 -46 L 0 0 L 20 -46 M -20 46 L 0 0 L 20 46 M -20 -46 L -20 46 M 20 -46 L 20 46',
  diamond:   'M 0 -46 L 33 0 L 0 46 L -33 0 Z',
  fire:      'M 0 -44 L 39 32 L -39 32 Z',
  water:     'M -39 -32 L 39 -32 L 0 44 Z',
  eye:       'M -46 0 Q 0 -43 46 0 Q 0 43 -46 0 Z M 14 0 A 14 14 0 1 0 -14 0 A 14 14 0 1 0 14 0 Z',
  pentagram: 'M 0 -46 L 27 37 L -44 -14 L 44 -14 L -27 37 Z',
  hexagram:  'M 0 -46 L 40 23 L -40 23 Z M 0 46 L -40 -23 L 40 -23 Z',
  lightning: 'M 7 -46 L -31 7 L -5 7 L -14 46 L 33 -12 L 7 -12 Z',
  infinity:  'M 0 0 C -60 -66 -60 66 0 0 C 60 -66 60 66 0 0 Z',
  eclipse:   'M 0 -46 A 46 46 0 1 0 0 46 A 46 46 0 1 0 0 -46 Z M 15 -40 A 46 46 0 0 1 15 40 A 40 40 0 0 0 15 -40 Z',
  spiral:    'M 0 0 C 0 -20 20 -20 20 0 C 20 20 -20 20 -20 0 C -20 -30 30 -30 30 0 C 30 40 -40 40 -40 0 C -40 -46 46 -46 46 0',
  crystal:   'M 0 -46 L 24 -12 L 0 46 L -24 -12 Z M -24 -12 L 24 -12',
  hourglass: 'M -30 -46 L 30 -46 L 0 0 L 30 46 L -30 46 L 0 0 Z',
  trident:   'M 0 46 L 0 -45 M -10 -32 L 0 -45 L 10 -32 M -32 -32 L -32 -8 Q -32 12 0 12 Q 32 12 32 -8 L 32 -32',
  air:       'M 0 -44 L 39 32 L -39 32 Z M -28 10 L 28 10',
  earth:     'M -39 -32 L 39 -32 L 0 44 Z M -28 -10 L 28 -10',
  custom:    '',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const deg2rad = d => (d * Math.PI) / 180

function polarX(r, angleDeg) { return r * Math.cos(deg2rad(angleDeg - 90)) }
function polarY(r, angleDeg) { return r * Math.sin(deg2rad(angleDeg - 90)) }

function arcPath(r, startDeg, sweepDeg) {
  const end = startDeg + sweepDeg
  const x1 = polarX(r, startDeg), y1 = polarY(r, startDeg)
  const x2 = polarX(r, end),       y2 = polarY(r, end)
  const large = sweepDeg > 180 ? 1 : 0
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`
}

function starPath(points, outerR, innerR, rotation = 0) {
  let d = ''
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR
    const angle = (i * 180) / points + rotation - 90
    const x = r * Math.cos(deg2rad(angle))
    const y = r * Math.sin(deg2rad(angle))
    d += `${i === 0 ? 'M' : 'L'} ${x} ${y} `
  }
  return d + 'Z'
}

function polygonPath(points, r, rotation = 0) {
  let d = ''
  for (let i = 0; i < points; i++) {
    const angle = (i * 360) / points + rotation - 90
    const x = r * Math.cos(deg2rad(angle))
    const y = r * Math.sin(deg2rad(angle))
    d += `${i === 0 ? 'M' : 'L'} ${x} ${y} `
  }
  return d + 'Z'
}

// ─── Layer → SVG elements ────────────────────────────────────────────────────

function renderLayer(layer, opacity = 1) {
  const op = (layer.opacity ?? 1) * opacity
  const col = layer.color ?? '#ffffff'
  const sw = layer.strokeWidth ?? 2
  const fill = layer.fill && layer.fill !== 'none' ? layer.fill : 'none'

  const attrs = (overrideFill) => {
    const f = overrideFill !== undefined ? overrideFill : fill
    return `opacity="${op}" stroke="${col}" stroke-width="${sw}" fill="${f}"`
  }

  switch (layer.type) {
    case 'ring': {
      const r = layer.radius
      const style = layer.style ?? 'simple'
      const parts = []

      if (style === 'arc') {
        const start = layer.startAngle ?? 0
        const sweep = layer.sweepAngle ?? 360
        if (sweep >= 360) {
          parts.push(`<circle cx="0" cy="0" r="${r}" ${attrs()} />`)
        } else {
          parts.push(`<path d="${arcPath(r, start, sweep)}" ${attrs('none')} />`)
        }
      } else if (style === 'concentric') {
        const count = layer.ringCount ?? 3
        const spacing = layer.spacing ?? 15
        for (let i = 0; i < count; i++) {
          const ri = r - i * spacing
          if (ri > 0) parts.push(`<circle cx="0" cy="0" r="${ri}" ${attrs()} />`)
        }
      } else if (style === 'divided') {
        parts.push(`<circle cx="0" cy="0" r="${r}" ${attrs()} />`)
        const divs = layer.divisions ?? 8
        const dw = layer.dividerWidth ?? 1.5
        for (let i = 0; i < divs; i++) {
          const angle = (i * 360) / divs + (layer.startAngle ?? 0)
          const x2 = polarX(r, angle), y2 = polarY(r, angle)
          parts.push(`<line x1="0" y1="0" x2="${x2}" y2="${y2}" stroke="${col}" stroke-width="${dw}" opacity="${op * 0.5}" fill="none" />`)
        }
      } else {
        parts.push(`<circle cx="0" cy="0" r="${r}" ${attrs()} />`)
      }
      return parts.join('\n')
    }

    case 'radial-lines': {
      const count = layer.count ?? 8
      const ir = layer.innerRadius ?? 0
      const or = layer.outerRadius ?? 300
      const sa = layer.startAngle ?? 0
      const twist = layer.twistAngle ?? 0
      const majorEvery = layer.majorEvery
      const minorLen = layer.minorLength ?? 1
      const lines = []
      for (let i = 0; i < count; i++) {
        const angle = sa + (i * 360) / count
        const fraction = majorEvery && (i % majorEvery !== 0) ? minorLen : 1
        const innerAng = angle
        const outerAng = angle + twist
        const actualOr = ir + (or - ir) * fraction
        const x1 = polarX(ir, innerAng), y1 = polarY(ir, innerAng)
        const x2 = polarX(actualOr, outerAng), y2 = polarY(actualOr, outerAng)
        lines.push(`<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="${col}" stroke-width="${sw}" opacity="${op}" fill="none" />`)
      }
      return lines.join('\n')
    }

    case 'shape': {
      const r = layer.radius
      const ir = layer.innerRadius ?? r * 0.4
      const pts = layer.points ?? 5
      const d = layer.shape === 'star' ? starPath(pts, r, ir) : polygonPath(pts, r)
      return `<path d="${d}" ${attrs()} />`
    }

    case 'symbol': {
      const r = layer.radius
      const scale = r / 50
      const path = SYMBOL_PATHS[layer.symbol] ?? ''
      if (!path) return ''
      const symbolFill = layer.fill && layer.fill !== 'none' ? layer.fill : 'none'
      return `<g transform="scale(${scale})" opacity="${op}" stroke="${col}" stroke-width="${sw / scale}" fill="${symbolFill}" stroke-linecap="round" stroke-linejoin="round"><path d="${path}" /></g>`
    }

    case 'circular-text': {
      // Render as a simple ring placeholder
      const r = layer.radius
      return `<circle cx="0" cy="0" r="${r}" stroke="${col}" stroke-width="1" fill="none" opacity="${op * 0.3}" stroke-dasharray="4 6" />`
    }

    case 'group': {
      const count = layer.repeatCount ?? 1
      const groupRadius = layer.repeatRadius ?? 0
      const startAng = layer.startAngle ?? 0
      const parts = []
      for (let i = 0; i < count; i++) {
        const angle = startAng + (i * 360) / count
        const tx = groupRadius > 0 ? polarX(groupRadius, angle) : 0
        const ty = groupRadius > 0 ? polarY(groupRadius, angle) : 0
        const rot = layer.orientation === 'radial' ? angle : layer.orientation === 'tangent' ? angle + 90 : 0
        const childSvg = layer.children.map(c => renderLayer(c)).join('\n')
        parts.push(`<g transform="translate(${tx},${ty}) rotate(${rot})">${childSvg}</g>`)
      }
      return parts.join('\n')
    }

    default:
      return ''
  }
}

// ─── Template → SVG ──────────────────────────────────────────────────────────

function templateToSvg(template) {
  const size = 512
  const bg = '#141416'
  const layers = [...(template.layers ?? [])].reverse() // bottom-up in SVG = last layer first

  const elements = layers.map(l => renderLayer(l)).filter(Boolean).join('\n')

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="-500 -500 1000 1000">
  <rect x="-500" y="-500" width="1000" height="1000" fill="${bg}" />
  <g stroke-linecap="round" stroke-linejoin="round">
${elements}
  </g>
</svg>`
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const targets = process.argv.slice(2)

// Discover all .mce.json files
import { readdirSync } from 'fs'
const allFiles = readdirSync(TMPL_DIR).filter(f => f.endsWith('.mce.json'))

const toProcess = allFiles.filter(f => {
  const id = f.replace('.mce.json', '')
  return targets.length === 0 || targets.includes(id)
})

for (const file of toProcess) {
  const id = file.replace('.mce.json', '')
  const tmplPath = join(TMPL_DIR, file)
  const template = JSON.parse(readFileSync(tmplPath, 'utf8'))

  const svg = templateToSvg(template)
  const svgPath = join(THUMB_DIR, `${id}.svg`)
  const pngPath = join(THUMB_DIR, `${id}.png`)

  writeFileSync(svgPath, svg)

  try {
    execSync(`rsvg-convert -w 512 -h 512 "${svgPath}" -o "${pngPath}"`)
    // Clean up SVG
    execSync(`rm "${svgPath}"`)
    console.log(`✓ ${id}`)
  } catch (e) {
    console.error(`✗ ${id}: ${e.message}`)
  }
}

console.log('Done.')
