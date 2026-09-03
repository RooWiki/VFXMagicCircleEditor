/**
 * Generates PNG thumbnails for all bundled templates at 512×512.
 *
 * Uses Playwright (already a project dev-dep) to rasterize the same SVG
 * geometry produced by the Phase 11 export pipeline, ensuring thumbnails are
 * visually identical to what the app would export.
 *
 * Run with: node scripts/generate-thumbnails.mjs
 */

import { readdirSync, readFileSync, unlinkSync } from 'fs'
import { dirname, join, basename } from 'path'
import { fileURLToPath } from 'url'
import { chromium } from '@playwright/test'

const __dirname = dirname(fileURLToPath(import.meta.url))
const TEMPLATES_DIR = join(__dirname, '..', 'public', 'templates')
const THUMBNAILS_DIR = join(TEMPLATES_DIR, 'thumbnails')
const SIZE = 512
const BG = '#09090b'

// ─── Geometry (mirrors src/utils/geometry.ts computeRadialLines) ──────────────

function computeLines(count, innerRadius, outerRadius, startAngle) {
  const lines = []
  for (let i = 0; i < count; i++) {
    const angleDeg = startAngle + i * (360 / count)
    const angleRad = (angleDeg * Math.PI) / 180
    lines.push({
      x1: +(innerRadius * Math.sin(angleRad)).toFixed(2),
      y1: +(-innerRadius * Math.cos(angleRad)).toFixed(2),
      x2: +(outerRadius * Math.sin(angleRad)).toFixed(2),
      y2: +(-outerRadius * Math.cos(angleRad)).toFixed(2),
    })
  }
  return lines
}

// ─── SVG builder (mirrors src/utils/export.ts buildExportSvgString) ───────────

function buildThumbnailSvg(project) {
  const parts = []

  // Background rect (same as export pipeline's backgroundColor option)
  parts.push(`<rect x="-500" y="-500" width="1000" height="1000" fill="${BG}"/>`)

  for (const layer of project.layers) {
    if (!layer.visible) continue

    const { x, y, rotation, scaleX, scaleY } = layer.transform
    const tf = `translate(${x},${y}) rotate(${rotation}) scale(${scaleX},${scaleY})`
    const op = layer.opacity ?? 1

    if (layer.type === 'ring') {
      parts.push(
        `<circle cx="0" cy="0" r="${layer.radius}" fill="none" ` +
          `stroke="${layer.color}" stroke-width="${layer.strokeWidth}" ` +
          `opacity="${op}" transform="${tf}"/>`
      )
    } else if (layer.type === 'radial-lines') {
      const segs = computeLines(layer.count, layer.innerRadius, layer.outerRadius, layer.startAngle)
      const linesSvg = segs
        .map(
          (s) =>
            `<line x1="${s.x1}" y1="${s.y1}" x2="${s.x2}" y2="${s.y2}" ` +
            `stroke="${layer.color}" stroke-width="${layer.strokeWidth}" stroke-linecap="round"/>`
        )
        .join('')
      parts.push(`<g opacity="${op}" transform="${tf}">${linesSvg}</g>`)
    }
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" ` +
    `width="${SIZE}" height="${SIZE}" viewBox="-500 -500 1000 1000">` +
    `<g>${parts.join('')}</g>` +
    `</svg>`
  )
}

// ─── Rasterise via Playwright ─────────────────────────────────────────────────

async function renderToPng(svgContent, outputPath) {
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage()
    await page.setViewportSize({ width: SIZE, height: SIZE })
    await page.setContent(
      `<!DOCTYPE html>` +
        `<html><head>` +
        `<style>* { margin:0; padding:0; } html,body { width:${SIZE}px; height:${SIZE}px; overflow:hidden; background:#000; }</style>` +
        `</head><body>${svgContent}</body></html>`
    )
    await page.screenshot({
      path: outputPath,
      type: 'png',
      clip: { x: 0, y: 0, width: SIZE, height: SIZE },
    })
  } finally {
    await browser.close()
  }
}

// ─── Remove stale SVG thumbnails ──────────────────────────────────────────────

function removeOldSvgs() {
  const svgs = readdirSync(THUMBNAILS_DIR).filter((f) => f.endsWith('.svg'))
  for (const f of svgs) {
    const p = join(THUMBNAILS_DIR, f)
    unlinkSync(p)
    console.log(`Removed stale SVG: ${p}`)
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // Remove old SVG thumbnails first
  removeOldSvgs()

  const templateFiles = readdirSync(TEMPLATES_DIR).filter((f) => f.endsWith('.mce.json'))

  for (const file of templateFiles) {
    const slug = basename(file, '.mce.json')
    const project = JSON.parse(readFileSync(join(TEMPLATES_DIR, file), 'utf-8'))
    const svgContent = buildThumbnailSvg(project)
    const outPath = join(THUMBNAILS_DIR, `${slug}.png`)
    await renderToPng(svgContent, outPath)
    console.log(`Generated PNG: ${outPath}`)
  }

  console.log('Done.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
