import { useEffect } from 'react'
import { useAnimationStore } from '../store/animation'

export function useAnimationLoop(): void {
  useEffect(() => {
    let rafId: number
    let lastTime: number | null = null

    function loop(now: number) {
      if (lastTime !== null) {
        useAnimationStore.getState().tick(now - lastTime)
      }
      lastTime = now
      rafId = requestAnimationFrame(loop)
    }

    rafId = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(rafId)
    }
  }, [])
}
