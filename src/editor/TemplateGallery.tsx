import { useState } from 'react'
import { isProjectDirty } from '../persistence/autosave'
import { notify } from '../store/notifications'
import { useTemplateGalleryStore } from '../store/templateGalleryStore'
import { loadTemplate } from '../templates/loadTemplate'
import { TEMPLATES, type TemplateDefinition } from '../templates/templates'

export default function TemplateGallery() {
  const { isOpen, close } = useTemplateGalleryStore()
  const [loadingId, setLoadingId] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSelect = async (template: TemplateDefinition) => {
    if (loadingId !== null) return
    setLoadingId(template.id)
    try {
      const applied = await loadTemplate(template, isProjectDirty())
      if (applied) close()
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Failed to load template.')
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Template Gallery"
      className="fixed inset-0 z-40 flex items-center justify-center"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={close}
        aria-hidden="true"
        data-testid="template-gallery-backdrop"
      />

      {/* Panel */}
      <div className="relative z-10 w-[680px] max-h-[80vh] flex flex-col rounded-lg bg-neutral-900 border border-neutral-700 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-700 shrink-0">
          <h2 className="text-[15px] font-semibold text-neutral-100">Templates</h2>
          <button
            type="button"
            aria-label="Close template gallery"
            onClick={close}
            className="w-7 h-7 flex items-center justify-center rounded text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500"
          >
            ×
          </button>
        </div>

        {/* Grid */}
        <div className="overflow-y-auto p-5">
          <div role="list" aria-label="Available templates" className="grid grid-cols-3 gap-4">
            {TEMPLATES.map((template) => {
              const isLoading = loadingId === template.id
              return (
                <button
                  key={template.id}
                  role="listitem"
                  type="button"
                  aria-label={`Load template: ${template.name}`}
                  disabled={loadingId !== null}
                  onClick={() => void handleSelect(template)}
                  className="flex flex-col rounded-lg border border-neutral-700 bg-neutral-800 hover:border-violet-500 hover:bg-neutral-750 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500 disabled:cursor-not-allowed disabled:opacity-50 transition-colors overflow-hidden text-left"
                >
                  {/* Thumbnail */}
                  <div className="w-full aspect-square bg-neutral-950 flex items-center justify-center relative">
                    {isLoading ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <span className="text-[12px] text-neutral-300">Loading…</span>
                      </div>
                    ) : null}
                    <img
                      src={template.thumbnail}
                      alt=""
                      aria-hidden="true"
                      className="w-full h-full object-contain"
                      loading="lazy"
                    />
                  </div>

                  {/* Info */}
                  <div className="px-3 py-2.5 flex flex-col gap-0.5">
                    <span className="text-[13px] font-medium text-neutral-100 truncate">
                      {template.name}
                    </span>
                    <span className="text-[11px] text-neutral-400 line-clamp-2 leading-relaxed">
                      {template.description}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
