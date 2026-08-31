export default function PropertiesPanel() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 p-6 text-center h-full">
      <p className="text-sm font-medium text-neutral-300">No selection</p>
      <p className="text-xs text-neutral-600 max-w-[200px] leading-relaxed">
        Select a layer to edit its properties.
      </p>
    </div>
  )
}
