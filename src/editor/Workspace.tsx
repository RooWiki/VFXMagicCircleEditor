import SvgCanvas from './canvas/SvgCanvas'
import ViewControls from './canvas/ViewControls'

export default function Workspace() {
  return (
    <main
      aria-label="Canvas workspace"
      className="flex-1 min-w-0 min-h-0 overflow-hidden relative"
      style={{ background: 'var(--rw-bg-scene)' }}
    >
      <SvgCanvas />
      <ViewControls />
    </main>
  )
}
