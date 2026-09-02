/**
 * bench-inbrowser-timing.mjs
 *
 * Measures PAN GESTURE RENDER COST using in-browser PointerEvent dispatch,
 * so performance.now() captures ACTUAL JS execution + style recalculation,
 * not Playwright IPC round-trip overhead.
 *
 * Also:
 *   - PerformanceObserver longtask detection (tasks > 50ms)
 *   - SvgCanvas render-count proxy via viewport store subscription count
 *   - "New Project" cycle test: pan 100 → New Project → pan 100, compare cost
 *
 * Usage:
 *   node bench-inbrowser-timing.mjs
 */

import { chromium } from 'playwright'

const PORT = 5173
const BASE_URL = `http://localhost:${PORT}`
const MOVES_PER_TIMING_RUN = 100

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--enable-precise-memory-info'],
  })

  try {
    const page = await browser.newPage()

    // ── INJECT: longtask observer + viewport update counter ────────────────
    await page.addInitScript(() => {
      window.__longTasks = []
      window.__vpUpdateCount = 0

      const obs = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          window.__longTasks.push({ duration: entry.duration, start: entry.startTime })
        }
      })
      try {
        obs.observe({ entryTypes: ['longtask'] })
      } catch {
        // not all headless versions support longtask
      }

      window.__hookVpStore = async () => {
        try {
          const { useViewportStore } = await import('/src/store/viewport.ts')
          let prevX = useViewportStore.getState().centerX
          useViewportStore.subscribe((s) => {
            if (s.centerX !== prevX) {
              window.__vpUpdateCount++
              prevX = s.centerX
            }
          })
          window.__vpStoreHooked = true
        } catch (e) {
          window.__vpStoreHooked = false
        }
      }

      window.__hookHistoryStore = async () => {
        try {
          const { useHistoryStore } = await import('/src/store/history.ts')
          window.__getHistLen = () => useHistoryStore.getState().snapshots.length
          window.__histStoreHooked = true
        } catch {
          window.__histStoreHooked = false
          window.__getHistLen = () => -1
        }
      }
    })

    await page.goto(BASE_URL)
    await page.waitForSelector('[data-testid="svg-viewport"]', { timeout: 10000 })
    await page.waitForTimeout(800)

    await page.evaluate(() => Promise.all([window.__hookVpStore(), window.__hookHistoryStore()]))
    await page.waitForTimeout(200)

    const hooked = await page.evaluate(() => ({ vp: window.__vpStoreHooked, hist: window.__histStoreHooked }))
    console.log(`\n[bench] VP store hook: ${hooked.vp ? 'OK' : 'FAILED'}`)
    console.log(`[bench] History store hook: ${hooked.hist ? 'OK' : 'FAILED'}`)

    // ── In-browser timing function ────────────────────────────────────────
    // Dispatches MOVES_PER_TIMING_RUN pointermove events inside the browser
    // and measures JS time per event (including React render + style flush).
    // Returns { median, p95, max, vpUpdates, allTimes } in milliseconds.
    async function measureInBrowserTiming(label) {
      const vpBefore = await page.evaluate(() => window.__vpUpdateCount)
      const longsBefore = await page.evaluate(() => window.__longTasks.length)

      const result = await page.evaluate(async (moves) => {
        const svg = document.querySelector('[data-testid="svg-viewport"]')
        if (!svg) return null
        const rect = svg.getBoundingClientRect()
        const cx = rect.left + rect.width / 2
        const cy = rect.top + rect.height / 2

        // Start pan with middle button
        svg.dispatchEvent(new PointerEvent('pointerdown', {
          bubbles: true, cancelable: true,
          clientX: cx, clientY: cy,
          button: 1, buttons: 4, pointerId: 99,
        }))

        // Wait one microtask to ensure React processes pointerdown
        await new Promise(r => setTimeout(r, 0))

        const times = []
        for (let i = 0; i < moves; i++) {
          const t0 = performance.now()
          svg.dispatchEvent(new PointerEvent('pointermove', {
            bubbles: true, cancelable: true,
            clientX: cx + ((i % 40) - 20) * 2,
            clientY: cy + ((i % 20) - 10),
            button: 1, buttons: 4, pointerId: 99,
          }))
          // Force style recalculation to include layout cost
          void svg.getBoundingClientRect()
          const t1 = performance.now()
          times.push(t1 - t0)
        }

        svg.dispatchEvent(new PointerEvent('pointerup', {
          bubbles: true, cancelable: true,
          clientX: cx, clientY: cy,
          button: 1, buttons: 0, pointerId: 99,
        }))

        await new Promise(r => setTimeout(r, 0))

        const sorted = [...times].sort((a, b) => a - b)
        const median = sorted[Math.floor(sorted.length / 2)]
        const p95 = sorted[Math.floor(sorted.length * 0.95)]
        const max = sorted[sorted.length - 1]
        const mean = times.reduce((a, b) => a + b, 0) / times.length
        return { median, p95, max, mean, allTimes: times }
      }, MOVES_PER_TIMING_RUN)

      const vpAfter = await page.evaluate(() => window.__vpUpdateCount)
      const longsAfter = await page.evaluate(() => window.__longTasks.length)

      return {
        label,
        median: result?.median,
        p95: result?.p95,
        max: result?.max,
        mean: result?.mean,
        vpUpdates: vpAfter - vpBefore,
        longTaskCount: longsAfter - longsBefore,
        allTimes: result?.allTimes,
      }
    }

    // ── Perform N gestures quickly (Playwright-dispatched) ────────────────
    async function doGestures(count) {
      const svgBox = await page.locator('[data-testid="svg-viewport"]').boundingBox()
      const cx = svgBox.x + svgBox.width / 2
      const cy = svgBox.y + svgBox.height / 2

      for (let i = 0; i < count; i++) {
        await page.mouse.move(cx + (i % 3) * 3, cy)
        await page.mouse.down({ button: 'middle' })
        for (let j = 0; j < 8; j++) {
          await page.mouse.move(cx + (i % 3) * 3 + (j + 1) * 5, cy, { steps: 1 })
        }
        await page.mouse.up({ button: 'middle' })
      }
    }

    // ── Trigger "New Project" ─────────────────────────────────────────────
    async function triggerNewProject() {
      // Click the "New" button in TopBar
      await page.click('button[title="New Project"]')
      // If there's a confirm dialog (dirty check), click confirm
      const confirmBtn = page.locator('button', { hasText: 'Continue' })
      const confirmVisible = await confirmBtn.isVisible().catch(() => false)
      if (confirmVisible) await confirmBtn.click()
      await page.waitForTimeout(200)
    }

    // ═══════════════════════════════════════════════════════════════════
    console.log('\n' + '═'.repeat(68))
    console.log('  SECTION 1 — In-Browser Timing Across Gesture Milestones')
    console.log('═'.repeat(68))
    console.log(`  (${MOVES_PER_TIMING_RUN} moves dispatched from JS; ms/move = JS+layout, no IPC)`)
    console.log()

    const milestoneResults = []

    // Fresh measurement
    const fresh = await measureInBrowserTiming('fresh (0 gestures)')
    milestoneResults.push({ milestone: 0, ...fresh })
    console.log(`  fresh:       median=${fresh.median?.toFixed(3)}ms  p95=${fresh.p95?.toFixed(3)}ms  max=${fresh.max?.toFixed(3)}ms  vpUpdates=${fresh.vpUpdates}  longTasks=${fresh.longTaskCount}`)

    // Milestones
    let done = 0
    for (const target of [10, 50, 100, 250, 500]) {
      await doGestures(target - done)
      done = target
      const m = await measureInBrowserTiming(`after ${target} gestures`)
      milestoneResults.push({ milestone: target, ...m })
      console.log(`  ${String(target).padStart(3)} gestures: median=${m.median?.toFixed(3)}ms  p95=${m.p95?.toFixed(3)}ms  max=${m.max?.toFixed(3)}ms  vpUpdates=${m.vpUpdates}  longTasks=${m.longTaskCount}`)
    }

    // Degradation analysis
    const freshMedian = milestoneResults[0].median ?? 1
    console.log('\n  Ratio to fresh:')
    for (const r of milestoneResults) {
      const ratio = (r.median ?? 0) / freshMedian
      const flag = ratio > 2 ? ' ← DEGRADED' : ratio > 1.3 ? ' ~ higher' : ' ✓'
      console.log(`    ${String(r.milestone).padStart(3)} gestures: ${ratio.toFixed(2)}×${flag}`)
    }

    // ═══════════════════════════════════════════════════════════════════
    console.log('\n' + '═'.repeat(68))
    console.log('  SECTION 2 — New Project Cycle Test')
    console.log('  (100 gestures → New Project → 100 gestures → measure)')
    console.log('═'.repeat(68))

    // Do 100 gestures to "warm up" the lag scenario
    await doGestures(100)
    const preNew = await measureInBrowserTiming('pre-New (100 gestures)')
    console.log(`\n  Pre-New:    median=${preNew.median?.toFixed(3)}ms  p95=${preNew.p95?.toFixed(3)}ms`)

    // Trigger New Project
    await triggerNewProject()
    const postNew = await measureInBrowserTiming('post-New')
    console.log(`  Post-New:   median=${postNew.median?.toFixed(3)}ms  p95=${postNew.p95?.toFixed(3)}ms`)

    const cycleRatio = (postNew.median ?? 1) / (preNew.median ?? 1)
    if (Math.abs(cycleRatio - 1) < 0.2) {
      console.log(`\n  ✓ New Project does NOT change timing (${cycleRatio.toFixed(2)}×) — lag is NOT from project state`)
    } else if (cycleRatio < 0.8) {
      console.log(`\n  ✓ New Project RESTORES timing (${cycleRatio.toFixed(2)}×) — lag IS from project-related state`)
    } else {
      console.log(`\n  ~ Ambiguous result: ratio=${cycleRatio.toFixed(2)}×`)
    }

    // ═══════════════════════════════════════════════════════════════════
    console.log('\n' + '═'.repeat(68))
    console.log('  SECTION 3 — Viewport Update Count Verification')
    console.log('  (expected: 1 update per pointermove)')
    console.log('═'.repeat(68))

    for (const r of milestoneResults) {
      const perMove = r.vpUpdates / MOVES_PER_TIMING_RUN
      const flag = perMove > 1.1 ? ` ← MULTIPLICITY: ${perMove.toFixed(1)}×` : ' ✓'
      console.log(`  ${String(r.milestone).padStart(3)} gestures: ${r.vpUpdates} updates / ${MOVES_PER_TIMING_RUN} moves = ${perMove.toFixed(2)}${flag}`)
    }

    // ═══════════════════════════════════════════════════════════════════
    console.log('\n' + '═'.repeat(68))
    console.log('  SECTION 4 — Long Task Report (tasks > 50ms)')
    console.log('═'.repeat(68))
    const allLongTasks = await page.evaluate(() => window.__longTasks)
    if (allLongTasks.length === 0) {
      console.log('\n  ✓ No long tasks detected during benchmark')
    } else {
      console.log(`\n  ⚠ ${allLongTasks.length} long tasks detected:`)
      for (const t of allLongTasks.sort((a, b) => b.duration - a.duration).slice(0, 10)) {
        console.log(`    ${t.duration.toFixed(1)}ms at t=${t.start.toFixed(0)}ms`)
      }
    }

    // ═══════════════════════════════════════════════════════════════════
    console.log('\n' + '═'.repeat(68))
    console.log('  SECTION 5 — History Snapshot Count After Panning')
    console.log('═'.repeat(68))
    const histLen = await page.evaluate(() => window.__getHistLen())
    console.log(`\n  snapshots.length after all panning = ${histLen} (expected: 1)`)
    if (histLen === 1) console.log('  ✓ History not recording pan gestures')
    else if (histLen > 1) console.log('  ⚠ HISTORY LEAK — panning recorded undo snapshots')

    // ═══════════════════════════════════════════════════════════════════
    console.log('\n' + '═'.repeat(68))
    console.log('  SECTION 6 — Per-Move Time Distribution at fresh vs 500')
    console.log('═'.repeat(68))

    const freshTimes = milestoneResults[0].allTimes ?? []
    const times500 = milestoneResults[milestoneResults.length - 1].allTimes ?? []

    function percentiles(times, label) {
      const s = [...times].sort((a, b) => a - b)
      const pct = (p) => s[Math.floor(s.length * p)]
      console.log(`  ${label}:`)
      console.log(`    p50=${pct(0.50)?.toFixed(3)}ms  p75=${pct(0.75)?.toFixed(3)}ms  p95=${pct(0.95)?.toFixed(3)}ms  p99=${pct(0.99)?.toFixed(3)}ms  max=${s[s.length-1]?.toFixed(3)}ms`)
    }

    console.log()
    percentiles(freshTimes, 'Fresh (0 gestures)')
    percentiles(times500, 'After 500 gestures')

    console.log('\n' + '═'.repeat(68))
    console.log('  BENCHMARK COMPLETE')
    console.log('═'.repeat(68) + '\n')

  } finally {
    await browser.close()
  }
}

main().catch((err) => {
  console.error('Benchmark failed:', err)
  process.exit(1)
})
