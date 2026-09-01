import { useEffect } from 'react'
import { useHistoryStore } from './store/history'
import { useProjectStore } from './store/project'
import EditorShell from './editor/EditorShell'

export default function App() {
  useEffect(() => {
    useHistoryStore.getState().initHistory(useProjectStore.getState().project)
  }, [])

  return <EditorShell />
}
