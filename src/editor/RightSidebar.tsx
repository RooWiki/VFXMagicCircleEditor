import { useState } from 'react'
import { useEditorStore } from '../store/editor'
import { useProjectStore } from '../store/project'
import AnimationPanel from './AnimationPanel'
import PropertiesPanel from './PropertiesPanel'

type SidebarTab = 'inspector' | 'animation'

export default function RightSidebar() {
  const [activeTab, setActiveTab] = useState<SidebarTab>('inspector')

  const selectedLayerIds = useEditorStore((s) => s.selectedLayerIds)
  const layers = useProjectStore((s) => s.project.layers)
  const selectedId = selectedLayerIds[0] ?? null
  const selectedLayer = selectedId !== null ? layers.find((l) => l.id === selectedId) : null

  return (
    <aside
      aria-label="Inspector and Animation"
      className="shrink-0 flex flex-col border-l"
      style={{
        width: 'clamp(288px, 20vw, 320px)',
        background: 'var(--rw-bg-panel)',
        borderColor: 'var(--rw-border-default)',
      }}
    >
      <div
        role="tablist"
        aria-label="Sidebar panels"
        className="flex shrink-0 border-b"
        style={{ borderColor: 'var(--rw-border-default)' }}
      >
        {(['inspector', 'animation'] as const).map((tab) => {
          const isActive = activeTab === tab
          return (
            <button
              key={tab}
              role="tab"
              id={`tab-${tab}`}
              aria-selected={isActive}
              aria-controls={`panel-${tab}`}
              type="button"
              onClick={() => setActiveTab(tab)}
              className="flex-1 h-[38px] flex items-center justify-center text-[13px] font-medium focus-visible:outline focus-visible:outline-2"
              style={{
                color: isActive ? 'var(--rw-text-primary)' : 'var(--rw-text-secondary)',
                background: isActive ? 'var(--rw-active-bg)' : 'transparent',
                borderBottom: isActive
                  ? '1px solid var(--rw-active-border)'
                  : '1px solid transparent',
                outlineColor: 'var(--rw-focus)',
              }}
            >
              {tab === 'inspector' ? 'Inspector' : 'Animation'}
            </button>
          )
        })}
      </div>

      <div
        role="tabpanel"
        id="panel-inspector"
        aria-label="Inspector"
        data-testid="panel-properties"
        hidden={activeTab !== 'inspector'}
        className="flex-1 overflow-y-auto min-h-0"
      >
        <PropertiesPanel />
      </div>

      <div
        role="tabpanel"
        id="panel-animation"
        aria-label="Animation"
        hidden={activeTab !== 'animation'}
        className="flex-1 overflow-y-auto min-h-0"
      >
        {selectedLayer ? (
          <AnimationPanel layer={selectedLayer} />
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 p-6 text-center h-full">
            <p className="text-sm" style={{ color: 'var(--rw-text-secondary)' }}>
              No selection
            </p>
            <p
              className="text-xs max-w-[200px] leading-relaxed"
              style={{ color: 'var(--rw-text-tertiary)' }}
            >
              Select a layer to configure animation.
            </p>
          </div>
        )}
      </div>
    </aside>
  )
}
