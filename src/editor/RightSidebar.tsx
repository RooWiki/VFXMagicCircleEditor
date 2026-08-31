import { useState } from 'react'
import LayersPanel from './LayersPanel'
import PropertiesPanel from './PropertiesPanel'

type SidebarTab = 'layers' | 'properties'

export default function RightSidebar() {
  const [activeTab, setActiveTab] = useState<SidebarTab>('layers')

  return (
    <aside
      aria-label="Layers and Properties"
      className="shrink-0 flex flex-col bg-neutral-900 border-l border-neutral-700"
      style={{ width: 'clamp(288px, 20vw, 320px)' }}
    >
      <div
        role="tablist"
        aria-label="Sidebar panels"
        className="flex shrink-0 border-b border-neutral-700"
      >
        <button
          role="tab"
          id="tab-layers"
          aria-selected={activeTab === 'layers'}
          aria-controls="panel-layers"
          type="button"
          onClick={() => setActiveTab('layers')}
          className={[
            'flex-1 h-[38px] flex items-center justify-center text-[13px] font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-violet-500',
            activeTab === 'layers'
              ? 'text-violet-300 border-b-2 border-violet-500'
              : 'text-neutral-400 hover:text-neutral-200',
          ].join(' ')}
        >
          Layers
        </button>
        <button
          role="tab"
          id="tab-properties"
          aria-selected={activeTab === 'properties'}
          aria-controls="panel-properties"
          type="button"
          onClick={() => setActiveTab('properties')}
          className={[
            'flex-1 h-[38px] flex items-center justify-center text-[13px] font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-violet-500',
            activeTab === 'properties'
              ? 'text-violet-300 border-b-2 border-violet-500'
              : 'text-neutral-400 hover:text-neutral-200',
          ].join(' ')}
        >
          Properties
        </button>
      </div>

      {/* aria-label (not aria-labelledby) avoids accessible-name resolution failures on
          hidden elements in jsdom — aria-labelledby on a hidden panel resolves to "". */}
      <div
        role="tabpanel"
        id="panel-layers"
        aria-label="Layers"
        data-testid="panel-layers"
        hidden={activeTab !== 'layers'}
        className="flex-1 overflow-y-auto min-h-0"
      >
        <LayersPanel />
      </div>

      <div
        role="tabpanel"
        id="panel-properties"
        aria-label="Properties"
        data-testid="panel-properties"
        hidden={activeTab !== 'properties'}
        className="flex-1 overflow-y-auto min-h-0"
      >
        <PropertiesPanel />
      </div>
    </aside>
  )
}
