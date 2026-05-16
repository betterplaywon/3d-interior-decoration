import { CatalogPanel } from '@widgets/catalog-panel';
import { InspectorPanel } from '@widgets/inspector-panel';
import { SceneCanvas } from '@widgets/scene-viewport';
import { Toolbar } from '@widgets/toolbar';

export function EditorPage() {
  return (
    <div className="layout">
      <Toolbar />
      <main className="main">
        <aside className="sidebar left">
          <CatalogPanel />
        </aside>
        <div className="viewport">
          <SceneCanvas />
        </div>
        <aside className="sidebar right">
          <InspectorPanel />
        </aside>
      </main>
    </div>
  );
}
