export default function Workspace() {
  return (
    <main
      aria-label="Canvas workspace"
      className="flex-1 min-w-0 min-h-0 flex items-center justify-center overflow-hidden bg-neutral-950"
      style={{ containerType: 'size' }}
    >
      <div
        aria-label="Artboard"
        className="relative flex items-center justify-center"
        style={{
          width: 'min(calc(100cqw - 4rem), calc(100cqh - 4rem))',
          aspectRatio: '1 / 1',
          backgroundColor: '#19191c',
          border: '1px solid #383840',
          boxShadow: '0 4px 24px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03)',
        }}
      >
        <div className="flex flex-col items-center gap-2 text-center px-4">
          <p className="text-sm text-neutral-400 select-none">Create an element to begin</p>
          <p className="text-xs text-neutral-600 select-none">
            Add a Ring or Radial Lines from the tool rail
          </p>
        </div>
      </div>
    </main>
  )
}
