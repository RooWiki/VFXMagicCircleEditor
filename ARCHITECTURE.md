# Magic Circle Editor — Architecture

> **Working title only.** "Magic Circle Editor" is a temporary project name.

**Document version:** 0.1.0 — Phase 0  
**See also:** [PROJECT_SPEC.md](PROJECT_SPEC.md) | [PROJECT_FORMAT.md](PROJECT_FORMAT.md) | [ROADMAP.md](ROADMAP.md)

---

## 1. Recommended Stack

| Concern           | Technology               | Reason                                                                                                                                           |
| ----------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Framework         | React 19                 | Component model fits panel/canvas/inspector split; large ecosystem; familiar to most collaborators                                               |
| Language          | TypeScript (strict mode) | Discriminated unions for the layer model; compile-time guarantees; Zod integration                                                               |
| Build tool        | Vite                     | Fast dev server; native ESM; Vitest integration; minimal config                                                                                  |
| Rendering         | SVG (browser-native)     | Resolution-independent; inspectable in DevTools; no external renderer dependency; direct DOM path to PNG rasterization                           |
| Application state | Zustand                  | Minimal boilerplate; slices compose cleanly into separate state domains; no context-prop-drilling                                                |
| File validation   | Zod                      | Runtime schema validation for imported project files; generates TypeScript types from schema                                                     |
| Unit tests        | Vitest                   | Same config as Vite; fast; TypeScript-native                                                                                                     |
| E2E tests         | Playwright               | Cross-browser; reliable; good for critical user flows                                                                                            |
| Styling           | Tailwind CSS v4          | Utility-first; built-in dark mode; consistent spacing and color tokens; no runtime overhead; integrates with Vite via `@tailwindcss/vite` plugin |

### Styling decision rationale

The tool has a dark-themed, panel-heavy interface with many small interactive states (hover, selected, disabled, active tool). Utility-first CSS handles these state variants efficiently without extra file-switching. Tailwind's design-token system (spacing, font sizes, colors) enforces visual consistency with no extra configuration layer. CSS Modules and CSS-in-JS were considered; CSS Modules require more boilerplate for themed variants and CSS-in-JS carries a small runtime cost without benefit for this scope.

**One styling system only.** Do not add CSS Modules, Emotion, styled-components or any other styling layer alongside Tailwind.

### Stack deviations

If a future phase introduces a requirement that SVG cannot satisfy (for example, high-performance particle rendering or WebGPU effects), a canvas-based or WebGL renderer may be introduced in parallel as an optional rendering layer for that specific layer type. SVG remains the primary renderer for all MVP layer types.

---

## 2. High-Level System Boundaries

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser Application                                            │
│                                                                 │
│  ┌───────────────┐    ┌─────────────────┐    ┌──────────────┐  │
│  │  Layer Panel  │    │   SVG Canvas    │    │  Inspector   │  │
│  │  (UI / React) │    │   (React+SVG)   │    │  (UI / React)│  │
│  └──────┬────────┘    └────────┬────────┘    └──────┬───────┘  │
│         │                     │                     │           │
│         └─────────────────────┼─────────────────────┘           │
│                               │                                 │
│                     ┌─────────▼──────────┐                     │
│                     │   Zustand Stores   │                     │
│                     │  (state domains)   │                     │
│                     └─────────┬──────────┘                     │
│                               │                                 │
│          ┌────────────────────┼──────────────────┐             │
│          │                    │                  │             │
│   ┌──────▼──────┐   ┌────────▼────────┐  ┌──────▼──────┐     │
│   │ LocalStorage │   │  Export Engine  │  │  Generator  │     │
│   │ (auto-save)  │   │  (SVG → PNG)   │  │  (future)   │     │
│   └─────────────┘   └────────────────┘  └─────────────┘     │
└─────────────────────────────────────────────────────────────────┘
```

The **SVG Canvas** reads from Zustand stores and produces the visual output. It never writes to the project store directly; it dispatches actions that the stores handle.

The **Export Engine** reads project state and produces a standalone exportable SVG, then rasterizes it to PNG using the browser Canvas API. It has no reference to editor state or viewport state.

The **Generator** (future module) will read generator parameters and produce a `Layer[]` array using the exact same type definitions as manually created layers. It writes to the project store through the same actions used when a user adds a layer.

---

## 3. Source Folder Structure

This is the proposed structure for Phase 1 initialization. It is prescriptive; later phases should follow it.

```
magic-circle-editor/
├── src/
│   ├── components/
│   │   ├── canvas/          # SVG canvas, viewport, layer renderers
│   │   ├── panels/          # LayerPanel, InspectorPanel, AnimationPanel
│   │   ├── toolbar/         # Top toolbar, tool palette, menu bar
│   │   └── ui/              # Shared primitives: Button, Input, Slider, ColorPicker
│   ├── store/
│   │   ├── project.ts       # Persisted project state (layers, canvas config, metadata)
│   │   ├── editor.ts        # Transient editor state (selection, active tool, open panels)
│   │   ├── viewport.ts      # Zoom level, pan offset
│   │   ├── history.ts       # Undo/redo snapshot stacks
│   │   ├── animation.ts     # Animation playback state (not persisted in project)
│   │   └── preferences.ts   # User preferences (persisted separately from project)
│   ├── types/
│   │   ├── layer.ts         # Layer discriminated union and Transform type
│   │   ├── project.ts       # ProjectFile type (mirrors PROJECT_FORMAT.md schema)
│   │   └── animation.ts     # AnimationConfig type
│   ├── schema/
│   │   └── project.ts       # Zod schema for project file validation and migration
│   ├── utils/
│   │   ├── geometry.ts      # Radial coordinate math, angle conversion
│   │   ├── svg.ts           # SVG element helpers, transform strings
│   │   ├── export.ts        # PNG export pipeline
│   │   └── id.ts            # Unique ID generation (crypto.randomUUID wrapper)
│   ├── generators/          # Procedural generator module (future — empty directory in Phase 1)
│   ├── constants.ts         # DEFAULT_CANVAS_SIZE, MAX_HISTORY_DEPTH, etc.
│   ├── App.tsx              # Root component, layout composition
│   └── main.tsx             # Vite entry point
├── tests/
│   └── e2e/                 # Playwright tests
├── public/                  # Static assets (favicon, etc.)
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

Vitest unit tests live alongside source files in `*.test.ts` files within `src/`. Playwright E2E tests live in `tests/e2e/`.

---

## 4. State Domain Separation

The application uses five distinct state domains. Only **project state** and **user preferences** are ever persisted.

### 4.1 Project State

Represents the editable artwork. Persisted to local storage and serialized into the project file.

Contents: project metadata, canvas configuration, ordered layer array.

A change to project state creates a history entry (see Section 10).

### 4.2 Editor State

Represents the current interactive session. Never persisted.

Contents: the ID of the currently selected layer (or `null`), the active tool, which panels are open, whether the grid is visible, whether center guides are visible, the preview background color.

### 4.3 Viewport State

Represents the view into the canvas. Never persisted in the project file. May be preserved in local storage as a user convenience (not required for MVP).

Contents: zoom level, pan offset (x, y in screen pixels).

Zoom and pan must never modify any project-space coordinate.

### 4.4 History State

Represents the undo and redo stacks. Never persisted. Derived from the sequence of project-state changes during the session.

Contents: an ordered array of project-state snapshots, a pointer to the current position.

### 4.5 Animation Preview State

Represents the current state of animation playback. Never persisted.

Contents: whether playback is active, elapsed time, per-layer current animated transform (separate from the stored base transform).

### 4.6 User Preferences

Represents user-level settings not tied to any specific project. Persisted to local storage under a separate key from the project auto-save.

Contents: preferred export resolution, preferred background color, UI density.

---

Illustrative TypeScript sketch (not an application source file):

```typescript
// store/project.ts — persisted project state
interface ProjectStore {
  meta: ProjectMeta
  canvas: CanvasConfig
  layers: Layer[]
  addLayer: (layer: Layer) => void
  updateLayer: (id: string, patch: Partial<LayerProps>) => void
  removeLayer: (id: string) => void
  reorderLayers: (fromIndex: number, toIndex: number) => void
}

// store/editor.ts — transient session state
interface EditorStore {
  selectedLayerId: string | null
  activeTool: 'select' | 'pan'
  gridVisible: boolean
  guidesVisible: boolean
  previewBackground: string // hex color or 'transparent'
  selectLayer: (id: string | null) => void
}

// store/viewport.ts — view transform
interface ViewportStore {
  zoom: number
  panX: number
  panY: number
  setZoom: (zoom: number) => void
  setPan: (x: number, y: number) => void
}

// store/history.ts — undo/redo
interface HistoryStore {
  snapshots: ProjectSnapshot[]
  pointer: number
  canUndo: boolean
  canRedo: boolean
  undo: () => void
  redo: () => void
  pushSnapshot: (snapshot: ProjectSnapshot) => void
}

// store/animation.ts — preview playback
interface AnimationStore {
  playing: boolean
  elapsedMs: number
  animatedTransforms: Record<string, Transform>
  play: () => void
  pause: () => void
  reset: () => void
}
```

---

## 5. SVG Rendering Strategy

### 5.1 Canvas Element Structure

The canvas is a React component that renders a single root `<svg>` element. All graphical content lives inside it.

```
<svg viewBox="-500 -500 1000 1000" ...>
  <!-- Export layer: contains only artwork SVG elements -->
  <g id="artwork">
    <!-- One <g> per layer, bottom to top -->
    <g id="layer-{id}" transform="...">
      <!-- Layer-specific SVG elements -->
    </g>
  </g>

  <!-- Editor overlay: never exported -->
  <g id="editor-overlay">
    <g id="grid" />
    <g id="guides" />
    <g id="selection" />
    <g id="transform-handles" />
  </g>
</svg>
```

The `#artwork` group is the exportable region. The `#editor-overlay` group is always excluded from exports.

### 5.2 Ring Layer Rendering

A Ring layer renders as a single `<circle>` element with `fill="none"`.

The transform on the wrapping `<g>` applies the layer's position, rotation and scale. Radius is applied directly to the `<circle>` element.

```svg
<g transform="translate(tx, ty) rotate(r) scale(sx, sy)">
  <circle cx="0" cy="0" r="{radius}" fill="none" stroke="{color}" stroke-width="{strokeWidth}" opacity="{opacity}" />
</g>
```

### 5.3 Radial-Lines Layer Rendering

A Radial-Lines layer computes line endpoints at render time from `count`, `innerRadius`, `outerRadius` and `startAngle`. It renders as a `<g>` containing `count` `<line>` elements.

Line positions are computed in the renderer, not stored as individual geometric objects. The stored representation is the parametric description.

Angle for line `i`:

```
angle_i = startAngle + i × (360 / count)
```

Where `startAngle = 0` points to 12 o'clock (−90° in SVG coordinates).

```svg
<g transform="translate(tx, ty) rotate(r) scale(sx, sy)" opacity="{opacity}">
  <line x1="ix1" y1="iy1" x2="ox2" y2="oy2" stroke="{color}" stroke-width="{strokeWidth}" />
  <!-- … repeated count times -->
</g>
```

### 5.4 Layer Order

Layers in the project state array are stored in **bottom-to-top render order**: index 0 is the bottom-most layer (rendered first). The SVG draws them in array order, so later elements paint on top. The layer panel UI renders this array reversed so the visually topmost layer appears at the top of the list.

### 5.5 Viewport Transform

The browser viewport is mapped to logical project space through a CSS transform applied to a wrapper `<div>` that contains the root `<svg>`. Zoom and pan are CSS transforms, not changes to the SVG viewBox.

```
screen → wrapper CSS transform (zoom + pan) → SVG viewBox space (project coordinates)
```

This means the SVG viewBox is always `"-500 -500 1000 1000"` regardless of zoom level. Project coordinates never change when the user pans or zooms.

### 5.6 Separation of Editor and Export SVG

The main canvas SVG is the **editor SVG**. It contains both `#artwork` and `#editor-overlay`.

At export time, the **export engine** constructs a separate, standalone SVG string from the project state alone. It does not clone or reference the editor SVG. The export SVG contains only the content equivalent to `#artwork`, with no editor elements.

---

## 6. Logical Coordinate System

### 6.1 Definition

All layer positions, radii and dimensions are stored in **logical project coordinates**.

- Origin: center of canvas `(0, 0)`.
- X axis: positive to the right.
- Y axis: positive downward (follows SVG/screen convention).
- Default canvas size: **1000 × 1000 logical units**.
- Logical canvas extents: `x ∈ [−500, 500]`, `y ∈ [−500, 500]`.
- The SVG viewBox is `"-500 -500 1000 1000"`.

### 6.2 Default Canvas Size Rationale

1000 × 1000 was chosen because:

- It is a round number with many natural subdivisions (10, 25, 50, 100, 250, 500).
- A ring with `radius = 400` nearly fills the canvas, which is intuitive.
- At 2048 × 2048 export, 1 logical unit ≈ 2.05 px (sufficient precision).
- At 4096 × 4096 export, 1 logical unit ≈ 4.1 px (more than sufficient).
- SVG is resolution-independent, so the logical size does not constrain export quality.

### 6.3 Coordinate Domains

| Domain                        | Origin                            | Unit          |
| ----------------------------- | --------------------------------- | ------------- |
| Project coordinates           | Canvas center                     | Logical units |
| SVG element coordinates       | Same as project (viewBox-aligned) | Logical units |
| Screen / viewport coordinates | Top-left of browser window        | CSS pixels    |
| Export raster coordinates     | Top-left of exported image        | Pixels        |

### 6.4 Coordinate Conversion

The editor must be able to convert a screen-space mouse position into a project-space coordinate for hit testing and drag operations.

```
project_x = (screen_x - viewport_panX - canvas_center_screen_x) / zoom
project_y = (screen_y - viewport_panY - canvas_center_screen_y) / zoom
```

This conversion belongs in a utility function and must account for the current zoom and pan state.

---

## 7. Layer Model

### 7.1 Base Layer

All layers share a common base structure.

```typescript
// Illustrative example
interface BaseLayer {
  id: string // UUID, immutable after creation
  type: string // discriminant
  name: string // user-visible label
  visible: boolean
  locked: boolean
  opacity: number // 0.0 to 1.0
  transform: Transform
}
```

### 7.2 Transform

```typescript
// Illustrative example
interface Transform {
  x: number // logical units from canvas center
  y: number // logical units from canvas center
  rotation: number // degrees, clockwise, 0 = no rotation
  scaleX: number // multiplier, 1.0 = no scale
  scaleY: number // multiplier, 1.0 = no scale
}
```

### 7.3 Ring Layer

```typescript
// Illustrative example
interface RingLayer extends BaseLayer {
  type: 'ring'
  radius: number // logical units
  strokeWidth: number // logical units
  color: string // hex color, e.g. "#ffffff"
}
```

### 7.4 Radial-Lines Layer

```typescript
// Illustrative example
interface RadialLinesLayer extends BaseLayer {
  type: 'radial-lines'
  count: number // integer ≥ 1; artist label: Copies
  innerRadius: number // logical units, must be < outerRadius
  outerRadius: number // logical units
  startAngle: number // degrees; 0 = 12 o'clock, clockwise
  strokeWidth: number // logical units
  color: string // hex color
}
```

### 7.5 Discriminated Union

```typescript
// Illustrative example
type Layer = RingLayer | RadialLinesLayer
```

Future layer types extend the union. Adding a new type requires: adding the type definition, adding a renderer component, adding a Zod schema branch, and updating the inspector.

The editor shell must never contain hardcoded `if layer.type === 'ring'` logic in places that should iterate all layers. Type-specific logic lives in layer-specific renderer and inspector components.

---

## 8. Selection Model

### 8.1 MVP: Single Selection

In the MVP, only one layer can be selected at a time.

```typescript
// Illustrative example (editor store)
selectedLayerId: string | null
```

Selection state lives in the editor store. It is never saved in the project file.

### 8.2 Selecting a Layer

A layer is selected by:

- Clicking its entry in the layer panel.
- Clicking its rendered area on the SVG canvas (requires hit-testing).

Clicking the canvas background (empty space) deselects.

### 8.3 Hit Testing

SVG pointer events handle layer hit-testing natively. Each layer `<g>` element must have `pointer-events="visibleStroke"` (or `"all"`) so clicks on stroke areas are captured.

Locked layers must not respond to pointer events on the canvas.

### 8.4 Future: Multi-Selection

Multi-selection (Shift-click, rubber-band selection) is a future feature. The selection model type should be designed so it can evolve from a single ID to an array of IDs without requiring a data migration.

---

## 9. Transform Model

### 9.1 Base Transform

The base transform is stored in the layer object and persisted in the project file. It represents the layer's position and orientation as set by the user.

```
Transform = { x, y, rotation, scaleX, scaleY }
```

### 9.2 Animated Transform (Future)

During animation preview, the animation store holds a separate animated transform per layer. The renderer computes the final visual transform by combining the base transform with the animated offset at the current playback time.

```
visual_transform = compose(base_transform, animated_offset)
```

The animation store never writes to the project store. The base transform is always preserved.

### 9.3 SVG Transform String

The base transform is applied to a layer's `<g>` wrapper as a composed SVG `transform` attribute:

```
transform="translate(x, y) rotate(rotation) scale(scaleX, scaleY)"
```

SVG applies transforms right-to-left, so scale is applied first, then rotation, then translation. This matches standard 2D transformation order.

### 9.4 On-Canvas Handle Interactions

During a drag gesture:

1. `pointerdown`: save a snapshot to history, record the initial pointer position.
2. `pointermove`: update layer transform in the project store without creating new history entries.
3. `pointerup`: the gesture is complete. The current project state is the new "present."

This ensures one drag gesture becomes one undo step.

### 9.5 Uniform Scaling in the MVP Inspector

**Resolved decision (Phase 1).** The MVP inspector exposes a single **Scale** control that updates `scaleX` and `scaleY` simultaneously. This is uniform scaling. The data model retains separate `scaleX` and `scaleY` fields so non-uniform scaling can be exposed in a future version without a format migration. The MVP inspector does not expose an aspect-ratio unlock control.

---

## 10. History Strategy

### 10.1 Recommended Model: Snapshot-Based

Magic Circle Editor uses a **snapshot-based** undo/redo history.

On each undoable action, the entire project state (layers, canvas config, metadata) is serialized as a JSON snapshot and pushed onto the history stack. Undo restores the previous snapshot. Redo restores the next snapshot.

**Rationale:**

- Project state is small (JSON, no bitmaps, typically < 20 KB per snapshot).
- Snapshots are trivially correct — no command-desynchronization bugs.
- Snapshots are easy to test deterministically.
- 50 snapshots × ~20 KB ≈ 1 MB maximum history memory: acceptable.
- A command-based model offers no significant benefit at this scale and introduces implementation complexity without payoff.

### 10.2 History Boundaries

| User action                     | History behavior                                                                                      |
| ------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Add layer                       | One entry                                                                                             |
| Delete layer                    | One entry                                                                                             |
| Change a property via inspector | One entry per field change (debounced: commit only when the input loses focus or after a 500 ms idle) |
| Drag to move / rotate / scale   | One entry for the entire gesture (snapshot on `pointerdown`, no new entries during `pointermove`)     |
| Reorder layers                  | One entry                                                                                             |
| Rename layer                    | One entry on `blur`                                                                                   |
| Toggle layer visibility         | One entry                                                                                             |

### 10.3 History Limits

Maximum history depth: **50 snapshots**. When the stack is full, the oldest snapshot is discarded.

### 10.4 History Exclusions

The following are never part of undo history:

- Viewport zoom and pan.
- Animation preview play/pause.
- Preview background color.
- Opening and closing panels.

**Resolved decision (Phase 1).** Layer visibility toggles are included in undo history (see the history table in § 10.2).

---

## 11. Persistence Strategy

### 11.1 Auto-Save to Local Storage

The project store is auto-saved to browser local storage using a **debounced write**: 2 seconds after the last change to project state, the current project state is serialized as JSON and written.

Local storage key: `magic-circle-editor:autosave`

On application load, if the auto-save key exists and contains a valid project, it is restored. If validation fails (e.g., corrupted data), the application starts with an empty project and logs the error.

### 11.2 Project File Download

"Download Project" serializes the current project state to a JSON string conforming to the format defined in [PROJECT_FORMAT.md](PROJECT_FORMAT.md) and triggers a browser file download with a `.mce.json` extension.

### 11.3 Project File Upload

"Open Project" shows a file picker filtered to `.mce.json` / `application/json`. The selected file is parsed and validated with Zod. If validation succeeds, the project replaces the current project state. If validation fails, an error message is shown and the current project is not modified.

**Resolved decision (Phase 1).** If the current project contains one or more layers and has not been explicitly saved since the last change, the application must show a confirmation dialog before replacing the project. The exact dirty-state tracking is an implementation concern for Phase 10 (Persistence). The confirmation must also apply when "New Project" is invoked with an unsaved non-empty project. If the user cancels, the operation is aborted and the current project is unchanged.

### 11.4 User Preferences

User preferences are persisted to local storage under a separate key: `magic-circle-editor:preferences`. They are loaded on startup and never overwrite project state.

---

## 12. PNG Export Strategy

### 12.1 Pipeline

1. **Build export SVG.** Construct a standalone SVG string from project state only. The viewBox is `"-500 -500 1000 1000"`. Set `width` and `height` attributes to the target export resolution in pixels. No editor overlay elements are included.
2. **Apply margin.** If a margin is requested, adjust the viewBox to add padding around the logical canvas.
3. **Convert to data URL.** Create a `Blob` with type `image/svg+xml`, then create an object URL.
4. **Draw to canvas.** Create an `HTMLCanvasElement` at the target resolution. Create an `HTMLImageElement`, set its `src` to the SVG object URL, wait for `onload`, then `ctx.drawImage(img, 0, 0, width, height)`.
5. **Export PNG.** Call `canvas.toBlob('image/png')` and trigger a download via a temporary `<a>` element with `download` attribute.
6. **Clean up.** Revoke the object URL.

### 12.2 Background Color

If the user selected an export background color, a `<rect>` element with that fill is inserted as the first child of the export SVG's root `<g>` before rasterization. If no background color is selected, the canvas element has a transparent background by default.

### 12.3 Selected-Layer Export

When exporting a single selected layer, the export SVG contains only that layer's rendering group. All other layers are omitted.

### 12.4 Resolution

The export pipeline accepts a pixel width and height. The SVG-to-canvas rasterization scales the logical canvas to the requested pixel dimensions. SVG is resolution-independent, so all strokes and arcs render crisp at any resolution.

---

## 13. Procedural Generator Boundary

The procedural generator will be implemented in Phase 12, after the editor and export pipeline are stable.

### 13.1 Contract

The generator is a pure function with the following contract:

```typescript
// Illustrative example
function generateCircle(params: GeneratorParams, seed: string): Layer[]
```

Its output is a `Layer[]` array. Every element of this array is a valid `RingLayer` or `RadialLinesLayer` object, indistinguishable from layers created manually by the user.

### 13.2 No Special Generator State

The generator does not produce any special "generated object" that wraps a group of layers. The layers it returns are added to the project store exactly as if the user had added them by hand, using the same store actions.

### 13.3 Seeded Determinism

Given the same `params` and the same `seed`, the generator must always produce the same `Layer[]` output. The seed is a user-visible string or number that the user can save and share.

### 13.4 Generator Module Location

The generator lives under `src/generators/`. During the MVP phases, this directory exists but contains only a README placeholder. Nothing in the MVP depends on this directory.

---

## 14. Animation Boundary

Animation preview will be implemented in Phase 14, after persistence and export are stable.

### 14.1 Data Model Placement

Animation configuration for each layer is stored in a separate structure, not inside the layer object itself. This keeps the layer model clean and animation-unaware.

```typescript
// Illustrative example — animation config is NOT inside Layer
interface LayerAnimationConfig {
  layerId: string
  rotationSpeed: number // degrees per second; 0 = no rotation animation
  pulseSpeed: number // cycles per second; 0 = no pulse
  pulseAmplitude: number // scale multiplier; 0.1 means ±10% scale
}
```

The `AnimationStore` holds a `Record<string, LayerAnimationConfig>` keyed by layer ID.

### 14.2 Non-Destructive Animated Transform

The renderer reads both the base transform from the project store and the current animated transform offset from the animation store. It computes the final visual transform at render time.

```
visual_transform = applyAnimatedOffset(base_transform, animated_offset_at_t)
```

The project store is never written during animation playback.

### 14.3 Animation State is Not Persisted

The animation store state (playing, elapsed time, animated transforms) is never serialized into the project file or local storage auto-save.

The per-layer animation configuration (`LayerAnimationConfig`) **will** be persisted in a future version of the project file format, under an `animation` top-level key. See [PROJECT_FORMAT.md](PROJECT_FORMAT.md) for the forward-compatible schema placeholder.

---

## 15. Testing Strategy

### 15.1 Unit Tests (Vitest)

Unit tests cover:

- Geometry utilities (`geometry.ts`): radial coordinate math, angle conversions.
- SVG helpers (`svg.ts`): transform string generation.
- Zod schema validation (`schema/project.ts`): valid and invalid project files.
- Project store actions: add, remove, update, reorder layers.
- History store: push, undo, redo, limit enforcement.
- Export utility (`export.ts`): correct SVG string construction, margin application.
- ID generation: uniqueness assertion.

Unit tests do not mount React components and do not depend on the DOM except through `jsdom`.

### 15.2 E2E Tests (Playwright)

E2E tests cover critical user flows:

- Opening the application shows an empty canvas.
- Adding a Ring layer renders a ring on canvas.
- Changing the radius in the inspector updates the ring on canvas.
- Adding a Radial-Lines layer renders lines on canvas.
- Undo after adding a layer removes it; redo restores it.
- Downloading a project file and re-uploading it restores the original layers.
- Exporting a PNG triggers a file download (file existence check).
- Layer visibility toggle shows and hides the layer.
- Layer reorder changes the visual stacking order.

### 15.3 Test Coverage Targets

- Unit: ≥ 90% coverage on utility modules.
- E2E: all critical user flows listed above must pass.
- No coverage requirement on React component rendering internals.

---

## 16. Performance Considerations

### 16.1 SVG Element Count

Magic circle designs typically contain 5–30 layers. A radial-lines layer with `count = 36` produces 36 `<line>` elements. A design with 10 such layers produces 360 SVG line elements plus other elements. This is well within browser SVG rendering capacity and should not require optimization in the MVP.

### 16.2 Re-render Minimization

Use Zustand's selective subscription: each component subscribes only to the specific slice of state it needs. A change to one layer's radius must not re-render unrelated components.

React `memo` and `useMemo` should be applied to the per-layer renderer components so that a change to Layer A does not trigger re-renders of Layers B through N.

### 16.3 History Memory

History snapshots are plain JSON strings. At 50 snapshots × ~20 KB per snapshot, the maximum memory usage is ~1 MB. This is acceptable. If designs grow significantly larger, consider increasing the snapshot interval before increasing the limit.

### 16.4 Export Performance

PNG export at 4096 × 4096 requires rasterizing the SVG to a 4096 × 4096 canvas. This is a single operation and takes approximately 100–500 ms on typical hardware. No optimization is needed for the MVP. Show a loading indicator during export.

---

## 17. Accessibility Considerations

### 17.1 Keyboard Navigation

All major operations must be reachable by keyboard:

- `Ctrl+Z` / `Ctrl+Shift+Z`: undo / redo.
- `Ctrl+D`: duplicate selected layer.
- `Delete` / `Backspace`: delete selected layer.
- `Ctrl+S`: trigger manual save / download (if implemented as a shortcut).
- Arrow keys: nudge selected layer position.
- Tab: cycle focus through layer panel entries.

### 17.2 Screen Reader Considerations

The SVG canvas is primarily visual. It is sufficient for the MVP to mark the SVG canvas with `aria-hidden="true"` and ensure the layer panel and inspector provide text-accessible information about all layers and their properties.

### 17.3 Color Contrast

The dark UI must maintain WCAG AA color contrast ratios for text and interactive control labels.

---

## 18. Architectural Risks and Mitigations

| Risk                                                    | Likelihood                   | Impact | Mitigation                                                                                                                                       |
| ------------------------------------------------------- | ---------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| SVG cannot meet performance needs at large layer counts | Low                          | Medium | Profile at 50+ layers before concluding; canvas-based fallback is available if needed                                                            |
| Local storage quota exceeded (auto-save)                | Low                          | Low    | Catch `QuotaExceededError`; show a warning; guide the user to download the file                                                                  |
| PNG export fails for large resolutions in some browsers | Low                          | Medium | Test at 4096 × 4096 in Chrome, Firefox and Safari; implement a resolution cap with user warning if needed                                        |
| Project file format changes break existing saved files  | Medium                       | High   | Version field + migration functions in the Zod schema layer; see [PROJECT_FORMAT.md](PROJECT_FORMAT.md)                                          |
| Undo history grows too large                            | Very low                     | Low    | 50-entry cap is enforced from the start                                                                                                          |
| Generator and editor layer models diverge               | Low (after Phase 12)         | High   | Generator contract is defined before implementation; unit test ensures generator output passes project schema validation                         |
| Animation overwrites base transform by accident         | Medium (implementation risk) | Medium | Animation store writes to its own `animatedTransforms` map; project store write actions are prohibited during playback; enforce via store design |
