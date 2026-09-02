/**
 * bench-listener-leak.mjs
 *
 * Instruments EventTarget.prototype before app load, then measures:
 *   1. Native listener accumulation (adds - removes) by event type
 *   2. Pan-call multiplicity: how many times pan() fires per pointermove
 *   3. History snapshot growth after repeated gestures
 *   4. Heap memory growth
 *   5. Render timing degradation across gesture milestones
 *
 * Milestones: fresh, 10, 50, 100, 250, 500 gestures
 *
 * Usage:
 *   node /tmp/bench-listener-leak.mjs
 */

import { chromium } from 'playwright'

const PORT = 5173
const BASE_URL = `http://localhost:${PORT}`

// A "gesture" = pointerdown → 10 pointermove events (5px each) → pointerup
const MOVES_PER_GESTURE = 10
const GESTURE_MILESTONES = [0, 10, 50, 100, 250, 500]

// ── helpers ──────────────────────────────────────────────────────────────────

function fmt(n) {
  return String(n).padStart(6)
}

function fmtMs(n) {
  return (typeof n === 'number' ? n.toFixed(2) : '?').padStart(8)
}

// ── main ─────────────────────────────────────────────────────────────────────

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--enable-precise-memory-info'],
  })

  try {
    const page = await browser.newPage()

    // ── INJECT INSTRUMENTATION BEFORE APP LOADS ────────────────────────────
    await page.addInitScript(() => {
      // -------------------------------------------------------------------
      // 1. EventTarget.prototype listener tracker
      // -------------------------------------------------------------------
      window.__listenerTracker = {
        byType: {},
        totalAdds: 0,
        totalRemoves: 0,
        snapshot() {
          const result = { totalAdds: this.totalAdds, totalRemoves: this.totalRemoves, byType: {} }
          for (const [type, rec] of Object.entries(this.byType)) {
            result.byType[type] = { adds: rec.adds, removes: rec.removes, net: rec.net }
          }
          return result
        },
        delta(before, after) {
          const byType = {}
          const allTypes = new Set([...Object.keys(before.byType), ...Object.keys(after.byType)])
          for (const type of allTypes) {
            const bNet = before.byType[type]?.net ?? 0
            const aNet = after.byType[type]?.net ?? 0
            if (aNet !== bNet) byType[type] = aNet - bNet
          }
          return {
            totalAdds: after.totalAdds - before.totalAdds,
            totalRemoves: after.totalRemoves - before.totalRemoves,
            netNew: after.totalAdds - after.totalRemoves - (before.totalAdds - before.totalRemoves),
            byType,
          }
        },
      }

      const _add = EventTarget.prototype.addEventListener
      const _remove = EventTarget.prototype.removeEventListener

      EventTarget.prototype.addEventListener = function (type, fn, options) {
        const t = window.__listenerTracker
        t.totalAdds++
        if (!t.byType[type]) t.byType[type] = { adds: 0, removes: 0, net: 0 }
        t.byType[type].adds++
        t.byType[type].net++
        return _add.call(this, type, fn, options)
      }

      EventTarget.prototype.removeEventListener = function (type, fn, options) {
        const t = window.__listenerTracker
        t.totalRemoves++
        if (!t.byType[type]) t.byType[type] = { adds: 0, removes: 0, net: 0 }
        t.byType[type].removes++
        t.byType[type].net--
        return _remove.call(this, type, fn, options)
      }

      // -------------------------------------------------------------------
      // 2. Pan-call multiplicity counter
      //    Hooked into useViewportStore.subscribe after stores are ready.
      //    We expose a promise + resolver so the benchmark can wait.
      // -------------------------------------------------------------------
      window.__panCalls = 0
      window.__panCallsThisMove = 0
      window.__storeHooked = false
      window.__hookStores = async () => {
        if (window.__storeHooked) return
        try {
          const vp = await import('/src/store/viewport.ts')
          const store = vp.useViewportStore
          // Count each centerX/centerY update as a pan() call
          let prevX = store.getState().centerX
          store.subscribe((state) => {
            if (state.centerX !== prevX) {
              window.__panCalls++
              window.__panCallsThisMove++
              prevX = state.centerX
            }
          })
          window.__storeHooked = true
          console.log('[bench] viewport store hooked for pan-call counting')
        } catch (err) {
          console.warn('[bench] could not hook viewport store:', err.message)
        }
      }

      // -------------------------------------------------------------------
      // 3. History snapshot counter
      // -------------------------------------------------------------------
      window.__getHistorySnapshotCount = async () => {
        try {
          const h = await import('/src/store/history.ts')
          return h.useHistoryStore.getState().snapshots.length
        } catch {
          return -1
        }
      }

      // -------------------------------------------------------------------
      // 4. Heap measurement helper
      // -------------------------------------------------------------------
      window.__heapMB = () => {
        if (performance.memory) return (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2)
        return '(no memory API)'
      }
    })

    // ── Navigate ──────────────────────────────────────────────────────────
    await page.goto(BASE_URL)
    await page.waitForSelector('[data-testid="svg-viewport"]', { timeout: 10000 })
    await page.waitForTimeout(800) // let React settle

    // Hook viewport store (dynamic import inside page)
    await page.evaluate(() => window.__hookStores())
    await page.waitForTimeout(200)

    const storeHooked = await page.evaluate(() => window.__storeHooked)
    console.log(`\n[bench] Store hook: ${storeHooked ? 'OK' : 'FAILED (timing fallback active)'}`)

    // Get SVG center for gesture dispatch
    const svgBox = await page.locator('[data-testid="svg-viewport"]').boundingBox()
    const cx = svgBox.x + svgBox.width / 2
    const cy = svgBox.y + svgBox.height / 2

    // ── Measurement helpers ───────────────────────────────────────────────

    async function takeSnapshot(label) {
      const [listenerSnap, historyLen, heapMB] = await page.evaluate(async () => [
        window.__listenerTracker.snapshot(),
        await window.__getHistorySnapshotCount(),
        window.__heapMB(),
      ])
      return { label, listenerSnap, historyLen, heapMB }
    }

    async function performGesture(gestureIdx) {
      const startX = cx + (gestureIdx % 5) * 2 // slight variation to avoid no-op
      const startY = cy

      await page.mouse.move(startX, startY)
      await page.mouse.down({ button: 'middle' })
      for (let i = 0; i < MOVES_PER_GESTURE; i++) {
        await page.mouse.move(startX + (i + 1) * 5, startY, { steps: 1 })
      }
      await page.mouse.up({ button: 'middle' })
      // Short delay to let React flush
      await page.waitForTimeout(2)
    }

    // ── Measure pan-call multiplicity for ONE pointermove ─────────────────

    async function measureMultiplicity() {
      if (!storeHooked) return null

      // Reset counter
      await page.evaluate(() => { window.__panCallsThisMove = 0 })

      // Start pan
      await page.mouse.move(cx, cy)
      await page.mouse.down({ button: 'middle' })
      await page.waitForTimeout(10)

      // ONE move
      await page.evaluate(() => { window.__panCallsThisMove = 0 })
      await page.mouse.move(cx + 5, cy, { steps: 1 })
      await page.waitForTimeout(20)

      const count = await page.evaluate(() => window.__panCallsThisMove)

      // End pan
      await page.mouse.up({ button: 'middle' })
      await page.waitForTimeout(10)

      return count
    }

    // ── Timing: time N moves during a single gesture ──────────────────────

    async function measureGestureTiming() {
      const TIMED_MOVES = 50
      await page.mouse.move(cx, cy)
      await page.mouse.down({ button: 'middle' })

      const t0 = await page.evaluate(() => performance.now())
      for (let i = 0; i < TIMED_MOVES; i++) {
        await page.mouse.move(cx + (i % 20) * 3 - 30, cy + (i % 10) * 2 - 10, { steps: 1 })
      }
      const t1 = await page.evaluate(() => performance.now())

      await page.mouse.up({ button: 'middle' })
      await page.waitForTimeout(10)

      return (t1 - t0) / TIMED_MOVES // ms per move
    }

    // ── Perform gesture runs at each milestone ────────────────────────────

    console.log('\n' + '═'.repeat(72))
    console.log('  Magic Circle Editor — Listener Leak & Multiplicity Benchmark')
    console.log('═'.repeat(72))

    let snapshots = []
    let totalGesturesDone = 0
    const snapshotAtMilestone = new Map()

    // Snapshot at fresh load (0 gestures)
    {
      const snap = await takeSnapshot('fresh (0 gestures)')
      const mult = await measureMultiplicity()
      const timing = await measureGestureTiming()
      snapshotAtMilestone.set(0, { snap, mult, timing })
      console.log(`\n[Milestone: fresh] heap=${snap.heapMB}MB  historyLen=${snap.historyLen}  mult=${mult ?? 'N/A'}  timing=${fmtMs(timing)}ms/move`)
    }

    // Work through milestones
    const milestonesRemaining = [...GESTURE_MILESTONES.filter(m => m > 0)]
    for (const milestone of milestonesRemaining) {
      const gesturesToDo = milestone - totalGesturesDone
      for (let i = 0; i < gesturesToDo; i++) {
        await performGesture(totalGesturesDone + i)
      }
      totalGesturesDone = milestone

      const snap = await takeSnapshot(`after ${milestone} gestures`)
      const mult = await measureMultiplicity()
      const timing = await measureGestureTiming()
      snapshotAtMilestone.set(milestone, { snap, mult, timing })
      console.log(`[Milestone: ${milestone} gestures] heap=${snap.heapMB}MB  historyLen=${snap.historyLen}  mult=${mult ?? 'N/A'}  timing=${fmtMs(timing)}ms/move`)
    }

    // ── Final report ──────────────────────────────────────────────────────

    console.log('\n' + '═'.repeat(72))
    console.log('  SECTION A — Listener Net Count (adds - removes) by Event Type')
    console.log('═'.repeat(72))

    const baseSnap = snapshotAtMilestone.get(0).snap.listenerSnap
    const finalSnap = snapshotAtMilestone.get(500).snap.listenerSnap

    // Collect all types
    const allTypes = new Set([
      ...Object.keys(baseSnap.byType),
      ...Object.keys(finalSnap.byType),
    ])

    const header = `${'event type'.padEnd(20)} ${'net@0'.padStart(8)} ${'net@500'.padStart(8)} ${'delta'.padStart(8)}`
    console.log('\n' + header)
    console.log('-'.repeat(header.length))

    const leakedTypes = []
    for (const type of [...allTypes].sort()) {
      const n0 = baseSnap.byType[type]?.net ?? 0
      const n500 = finalSnap.byType[type]?.net ?? 0
      const delta = n500 - n0
      if (delta !== 0) leakedTypes.push({ type, delta })
      console.log(`${type.padEnd(20)} ${fmt(n0)} ${fmt(n500)} ${fmt(delta)}`)
    }

    if (leakedTypes.length === 0) {
      console.log('\n✓ No listener accumulation detected (net delta = 0 for all types)')
    } else {
      console.log('\n⚠ LEAKING LISTENER TYPES:')
      for (const { type, delta } of leakedTypes) {
        console.log(`  ${type}: +${delta} net listeners over 500 gestures`)
      }
    }

    console.log('\n' + '═'.repeat(72))
    console.log('  SECTION B — Pan-Call Multiplicity per pointermove')
    console.log('═'.repeat(72))
    console.log('\n  (# of viewport store updates triggered by ONE pointermove event)')
    console.log('  Expected: always 1. Growing number = handler accumulation.\n')

    let multiplicityGrows = false
    for (const [milestone, { mult }] of snapshotAtMilestone.entries()) {
      const flag = mult > 1 ? ' ← ACCUMULATION' : mult === 1 ? ' ✓' : ''
      console.log(`  After ${String(milestone).padStart(3)} gestures: multiplicity = ${mult ?? 'N/A'}${flag}`)
      if (mult !== null && mult > 1) multiplicityGrows = true
    }

    if (multiplicityGrows) {
      console.log('\n⚠ MULTIPLICITY > 1 DETECTED — pan handler is accumulating')
    } else if (storeHooked) {
      console.log('\n✓ Multiplicity stable at 1 — pan handler is NOT accumulating')
    } else {
      console.log('\n? Store hook failed — multiplicity could not be measured')
    }

    console.log('\n' + '═'.repeat(72))
    console.log('  SECTION C — History Snapshot Count (must NOT grow during pan)')
    console.log('═'.repeat(72))
    console.log()

    let historyGrows = false
    let prevHistLen = null
    for (const [milestone, { snap }] of snapshotAtMilestone.entries()) {
      const len = snap.historyLen
      const flag = prevHistLen !== null && len > prevHistLen ? ' ← HISTORY LEAK' : prevHistLen !== null && len === prevHistLen ? ' ✓ stable' : ''
      console.log(`  After ${String(milestone).padStart(3)} gestures: snapshots.length = ${len}${flag}`)
      if (prevHistLen !== null && len > prevHistLen) historyGrows = true
      prevHistLen = len
    }

    if (historyGrows) {
      console.log('\n⚠ HISTORY ACCUMULATION — panning is recording undo snapshots')
    } else {
      console.log('\n✓ History stable — panning does not record undo snapshots')
    }

    console.log('\n' + '═'.repeat(72))
    console.log('  SECTION D — Heap Memory (usedJSHeapSize in MB)')
    console.log('═'.repeat(72))
    console.log()

    let prevHeap = null
    for (const [milestone, { snap }] of snapshotAtMilestone.entries()) {
      const heap = snap.heapMB
      const delta = prevHeap !== null ? ` (+${(parseFloat(heap) - parseFloat(prevHeap)).toFixed(2)}MB)` : ''
      console.log(`  After ${String(milestone).padStart(3)} gestures: heap = ${heap}MB${delta}`)
      prevHeap = heap
    }

    console.log('\n' + '═'.repeat(72))
    console.log('  SECTION E — Gesture Timing Degradation')
    console.log('═'.repeat(72))
    console.log('\n  (ms per pointermove during an active pan, measured over 50 moves)')
    console.log('  Expected: stable. Growing = something O(N) per gesture.\n')

    let timingDegrades = false
    const freshTiming = snapshotAtMilestone.get(0).timing
    for (const [milestone, { timing }] of snapshotAtMilestone.entries()) {
      const ratio = timing / freshTiming
      const flag = ratio > 2 ? ' ← DEGRADED' : ratio > 1.2 ? ' ~ slightly slower' : ' ✓'
      console.log(`  After ${String(milestone).padStart(3)} gestures: ${fmtMs(timing)}ms/move  (${ratio.toFixed(2)}× fresh)${flag}`)
      if (ratio > 2) timingDegrades = true
    }

    if (timingDegrades) {
      console.log('\n⚠ TIMING DEGRADATION DETECTED — gesture cost is growing')
    } else {
      console.log('\n✓ Timing stable — no significant degradation detected')
    }

    // ── Total listener activity summary ───────────────────────────────────
    console.log('\n' + '═'.repeat(72))
    console.log('  SECTION F — Total Listener Activity (global adds/removes)')
    console.log('═'.repeat(72))
    const finalFull = snapshotAtMilestone.get(500).snap.listenerSnap
    const netAll = finalFull.totalAdds - finalFull.totalRemoves
    console.log(`\n  Total addEventListener calls:    ${finalFull.totalAdds}`)
    console.log(`  Total removeEventListener calls: ${finalFull.totalRemoves}`)
    console.log(`  Net active listeners:            ${netAll}`)
    console.log(`  Delta from fresh:                ${netAll - (baseSnap.totalAdds - baseSnap.totalRemoves)}`)

    // ── Raw per-milestone listener state ──────────────────────────────────
    console.log('\n' + '═'.repeat(72))
    console.log('  SECTION G — Per-milestone net listener state (pointer/key/wheel)')
    console.log('═'.repeat(72))
    const interestingTypes = ['pointermove', 'pointerdown', 'pointerup', 'pointercancel', 'keydown', 'keyup', 'wheel', 'click', 'mousedown']
    const mHeader = `${'milestone'.padEnd(20)} ${interestingTypes.map(t => t.slice(0, 8).padStart(10)).join('')}`
    console.log('\n' + mHeader)
    console.log('-'.repeat(mHeader.length))

    for (const [milestone, { snap }] of snapshotAtMilestone.entries()) {
      const row = interestingTypes.map(t => fmt(snap.listenerSnap.byType[t]?.net ?? 0)).join('  ')
      console.log(`  ${String(milestone + ' gestures').padEnd(18)} ${row}`)
    }

    console.log('\n' + '═'.repeat(72))
    console.log('  BENCHMARK COMPLETE')
    console.log('═'.repeat(72) + '\n')

  } finally {
    await browser.close()
  }
}

main().catch((err) => {
  console.error('Benchmark failed:', err)
  process.exit(1)
})
