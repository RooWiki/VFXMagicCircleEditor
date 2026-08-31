import RightSidebar from './RightSidebar'
import StatusBar from './StatusBar'
import ToolRail from './ToolRail'
import TopBar from './TopBar'
import Workspace from './Workspace'

export default function EditorShell() {
  return (
    <div
      className="flex flex-col h-dvh overflow-hidden bg-neutral-950 text-neutral-100"
      data-testid="editor-shell"
    >
      <TopBar />
      <div className="flex flex-1 min-h-0">
        <ToolRail />
        <Workspace />
        <RightSidebar />
      </div>
      <StatusBar />
    </div>
  )
}
