# Circle Editor — Development Roadmap

**Document version:** 0.1.0 — Phase 0  
**See also:** [PROJECT_SPEC.md](PROJECT_SPEC.md) | [ARCHITECTURE.md](ARCHITECTURE.md) | [PROJECT_FORMAT.md](PROJECT_FORMAT.md)

---

## Phase Summary

| Phase | Name                                                    | Status        |
| ----- | ------------------------------------------------------- | ------------- |
| 0     | Product Specification and Architecture                  | **COMPLETED** |
| 1     | Technical Project Setup                                 | **COMPLETED** |
| 2     | Data Model and State Foundation                         | **COMPLETED** |
| 3     | Editor Shell                                            | **COMPLETED** |
| 4     | SVG Canvas and Viewport Navigation                      | **COMPLETED** |
| 5     | First Ring Layer                                        | **COMPLETED** |
| 6     | Direct Canvas Transformations                           | **COMPLETED** |
| 7     | Complete Layer System                                   | **COMPLETED** |
| 8     | History, Precision Tools and Shortcuts                  | **COMPLETED** |
| 9     | Radial-Lines Layer                                      | **COMPLETED** |
| 10    | Project Persistence and Import                          | **COMPLETED** |
| 11    | PNG Export                                              | **COMPLETED** |
| 12    | Procedural Generator                                    | **COMPLETED** |
| 13    | Templates                                               | **COMPLETED** |
| 14    | Basic Animation Preview                                 | **COMPLETED** |
| 15    | Polish, Testing, Portfolio Documentation and Deployment | PENDING       |
| 15A   | → RooWiki UI System + Light/Dark + Editor Layout        | **COMPLETED** |
| 15B   | → QA, UX Polish and Accessibility                       | **COMPLETED** |
| 15C   | → Branding and Product Identity                         | **COMPLETED** |
| 15D   | → README and Portfolio Documentation                    | PENDING       |
| 15E   | → Deployment                                            | PENDING       |
| 15F   | → Final Portfolio Assets                                | PENDING       |

---

## Phase 0 — Product Specification and Architecture

**Status: COMPLETED**

### Objective

Define the complete product specification and technical architecture before writing any application code. Establish documents that allow any future coding agent or developer to implement subsequent phases without ambiguity.

### Dependencies

None. This is the root phase.

### Main Implementation Tasks

- Inspect the project directory for existing files and conflicts.
- Author `PROJECT_SPEC.md` covering product vision, audience, MVP scope, non-goals and UX principles.
- Author `ARCHITECTURE.md` covering the full technical architecture, state model, layer model, history strategy, export pipeline and testing approach.
- Author `PROJECT_FORMAT.md` covering the versioned JSON schema, validation rules, migration strategy and example projects.
- Author `ROADMAP.md` (this document) covering all 16 phases.
- Cross-check all four documents for consistency in terminology, layer model, project format and architectural decisions.

### Explicit Exclusions

- No application source code.
- No `package.json` or installed dependencies.
- No React components, stores, utilities or test files.
- No procedural generator implementation.
- No UI mockups or prototypes.
- No deployment configuration.

### Acceptance Criteria

- All four required documents exist: `PROJECT_SPEC.md`, `ARCHITECTURE.md`, `PROJECT_FORMAT.md`, `ROADMAP.md`.
- Product vision and target audience are explicit.
- MVP scope and future scope are clearly separated.
- Generator and editor are architecturally separated.
- SVG is established as the initial 2D rendering representation.
- Project coordinates are independent from screen/browser coordinates.
- Project, editor, viewport, animation and preference states are separated as distinct domains.
- The initial Ring and Radial-Lines layer models are defined.
- The project file format is versioned and validated.
- Undo and redo are addressed in the architecture.
- PNG export strategy is documented.
- No application source code exists.
- No dependencies are installed.
- No later development phase has been implemented.
- The documentation is detailed enough for another coding agent to implement Phase 1 without guessing the architecture.

### Required Automated Tests

None for Phase 0. (No application code exists.)

### Required Manual Tests

- Read all four documents end-to-end.
- Confirm that the layer model in `ARCHITECTURE.md` matches the JSON schema in `PROJECT_FORMAT.md`.
- Confirm that the example project in `PROJECT_FORMAT.md` would pass the Zod schema described in the same document.
- Confirm that no MVP feature is described as already implemented.
- Confirm that no future feature is described as in scope for the MVP.

### Expected Deliverables

- `PROJECT_SPEC.md`
- `ARCHITECTURE.md`
- `PROJECT_FORMAT.md`
- `ROADMAP.md`

---

## Phase 1 — Technical Project Setup

**Status: COMPLETED**

### Objective

Initialize the React + TypeScript + Vite project with the agreed stack. Establish the folder structure, linting, formatting and a passing test baseline. The result is a runnable application shell with no business logic.

### Dependencies

- Phase 0 completed.
- Node.js and npm available.

### Main Implementation Tasks

- Initialize a Vite project with the React + TypeScript template.
- Enable TypeScript strict mode in `tsconfig.json` and `tsconfig.app.json`.
- Install and configure Tailwind CSS v4 via `@tailwindcss/vite`.
- Install Zustand, Zod, Vitest, Playwright.
- Configure Vitest with jsdom.
- Configure Playwright with the project dev server URL.
- Set up ESLint with TypeScript and React rules.
- Create the complete folder structure defined in [ARCHITECTURE.md § 3](ARCHITECTURE.md#3-source-folder-structure).
- Add a `.gitignore` appropriate for a Vite + Node project.
- Verify `npm run dev` starts without errors and shows the default Vite welcome page.
- Verify `npm run test` runs and passes (at least one trivial passing test).
- Verify `npm run build` produces a distributable without errors.
- Initialize a Git repository and make an initial commit.

### Explicit Exclusions

- No business logic, stores or layer types.
- No canvas rendering.
- No editor UI beyond the Vite default page.
- Do not install or configure any styling library other than Tailwind CSS.

### Acceptance Criteria

- `npm run dev` starts without errors.
- `npm run build` completes without errors.
- `npm run test` passes.
- TypeScript strict mode is enabled and the project compiles with zero type errors.
- The folder structure matches the specification in ARCHITECTURE.md § 3.
- A Git repository exists with at least one commit.

### Required Automated Tests

- One trivial Vitest unit test in `src/utils/id.test.ts` asserting that `crypto.randomUUID()` returns a string of expected format.

### Required Manual Tests

- Open `http://localhost:5173` in a desktop browser. The page loads without console errors.

### Expected Deliverables

- Initialized Vite project at `magic-circle-editor/`.
- All configuration files (`vite.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `package.json`, `.gitignore`).
- Initial commit in Git.
- Passing test baseline.

---

## Phase 2 — Data Model and State Foundation

**Status: COMPLETED**

### Objective

Implement the TypeScript domain types, factory functions, immutable project state store and minimal selection store. No UI is required. This phase establishes the data contract that all subsequent phases depend on.

### Dependencies

- Phase 1 completed.

### Main Implementation Tasks

- Implement TypeScript types in `src/types/layer.ts`: `Transform`, `BaseLayer`, `RingLayer`, `RadialLinesLayer`, `Layer` discriminated union.
- Implement TypeScript types in `src/types/project.ts`: `ProjectFile`, `ProjectMeta`, `CanvasConfig`.
- Implement `src/utils/id.ts` as a `crypto.randomUUID()` wrapper.
- Implement `src/utils/factories.ts` with `createRingLayer`, `createRadialLinesLayer` and `createDefaultProject` factory functions.
- Implement `src/utils/selectors.ts` with `isRingLayer`, `isRadialLinesLayer` type guards and `getLayerById` selector.
- Implement the project store in `src/store/project.ts` with explicit-whitelist type-safe actions: `addLayer`, `updateRingLayer`, `updateRadialLinesLayer`, `updateLayerTransform`, `renameLayer`, `removeLayer`, `duplicateLayer`, `reorderLayers`, `toggleLayerVisibility`, `toggleLayerLock`, `setProjectMeta`, `setCanvasConfig`, `setProject`, `resetProject`.
- Implement the editor store in `src/store/editor.ts` with selection-only state (`selectedLayerIds: string[]`) and actions: `selectLayer`, `setSelection`, `addToSelection`, `removeFromSelection`, `clearSelection`, `pruneSelection`.
- Implement `src/constants.ts` with `DEFAULT_CANVAS_WIDTH` and `DEFAULT_CANVAS_HEIGHT`.

### Explicit Exclusions

- No React UI components.
- No SVG rendering.
- No Zod runtime validation or project-file schema (Phase 10).
- No history, undo or redo store (Phase 8).
- No viewport, animation or preferences stores (Phases 4, 14, and future).
- No local storage integration (Phase 10).
- No generator implementation.

### Acceptance Criteria

- All TypeScript types compile without errors in strict mode.
- All store actions work as expected in unit tests.
- The project store maintains correct immutability semantics for all operations.
- Type-specific artwork updates (`updateRingLayer`, `updateRadialLinesLayer`) are rejected at compile time for cross-type properties.
- Locked-layer update semantics are correct: artwork and transform updates are no-ops; visibility, lock and rename operations proceed.
- The editor store correctly prunes stale selection IDs without mutating input.

### Required Automated Tests

- `src/store/project.test.ts`: `addLayer` appends to the array; `removeLayer` removes the correct entry; `updateRingLayer`/`updateRadialLinesLayer` patch only approved type-specific fields; `updateLayerTransform` merges partial transform without discarding unspecified fields; `renameLayer` applies on locked layers; `reorderLayers` moves layer to the correct index; locked layers reject artwork and transform updates; `duplicateLayer` inserts above the original with a new ID.
- `src/store/editor.test.ts`: `pruneSelection` removes stale IDs and preserves valid IDs; duplicate IDs are prevented; selection order is deterministic; pruning does not mutate the supplied array.
- `src/utils/id.test.ts`: generated IDs are strings; two consecutive calls produce different values.

### Required Manual Tests

None — this phase has no UI.

### Expected Deliverables

- `src/types/layer.ts`, `src/types/project.ts`
- `src/store/project.ts`, `src/store/editor.ts`
- `src/utils/id.ts`, `src/utils/factories.ts`, `src/utils/selectors.ts`
- `src/constants.ts`
- Passing unit tests for all of the above.

---

## Phase 3 — Editor Shell

**Status: COMPLETED**

### Objective

Build the main editor layout: the top toolbar area, the left layer panel, the central canvas placeholder and the right inspector panel. No layer rendering yet — the canvas shows only an empty frame. The UI must be functional, keyboard-navigable and visually consistent with the dark tool aesthetic.

### Dependencies

- Phase 2 completed.

### Main Implementation Tasks

- Design and implement the top-level layout in `src/App.tsx`: toolbar strip, three-column body (layer panel, canvas area, inspector panel).
- Implement `src/components/toolbar/`: toolbar bar with placeholder buttons (Add Ring, Add Radial Lines, undo, redo, export).
- Implement `src/components/panels/LayerPanel.tsx`: list of layers from the project store; placeholder entries for now; click to select.
- Implement `src/components/panels/InspectorPanel.tsx`: shows "No layer selected" state. Will show properties in Phase 5+.
- Implement `src/components/canvas/CanvasArea.tsx`: grey frame with the correct aspect ratio representing the canvas. No SVG rendering yet.
- Connect all UI panels to the Zustand stores so they read live state.
- Implement the preview background color control in the editor state (dropdown or color picker in toolbar).
- Ensure all major UI actions (select layer, toggle grid, toggle guides) update the correct store.

### Explicit Exclusions

- No SVG canvas rendering.
- No layer type-specific UI (no ring controls, no radial-line controls).
- No drag interactions on the canvas.
- No keyboard shortcuts yet (those are Phase 8).
- No file import or export.
- No persistence.

### Acceptance Criteria

- The application renders a three-panel layout in a desktop browser.
- Clicking a layer in the layer panel updates `selectedLayerId` in the editor store.
- The inspector panel shows the correct selected layer name or "No layer selected".
- The toolbar renders without errors.
- The layout is responsive enough that panels do not overflow on a 1280 × 800 viewport.
- No TypeScript errors.

### Required Automated Tests

- Vitest: layer panel renders a layer entry for each layer in the store.
- Vitest: clicking a layer entry dispatches `selectLayer` with the correct ID.
- Vitest: inspector panel renders "No layer selected" when `selectedLayerId` is null.

### Required Manual Tests

- Open the application. Three-panel layout is visible.
- Manually call `addLayer` via browser console or store devtools. The layer appears in the layer panel.
- Click the layer entry. The inspector changes to show the layer name.

### Expected Deliverables

- All files under `src/components/`.
- Working three-panel layout.
- Passing unit tests for panel components.

---

## Phase 4 — SVG Canvas and Viewport Navigation

**Status: COMPLETED**

### Objective

Render the SVG canvas with the correct viewBox and coordinate system. Implement zoom and pan. The canvas shows a visual representation of the logical coordinate space (canvas border, center point, optional grid). No layers yet.

### Dependencies

- Phase 3 completed.

### Main Implementation Tasks

- Implement `src/components/canvas/SvgCanvas.tsx`: root `<svg>` with `viewBox="-500 -500 1000 1000"`, wrapped in a div that applies the viewport transform (CSS transform for zoom and pan).
- Implement the canvas border (visual indicator of the logical canvas boundary, not exported).
- Implement optional center-point guide (crosshair at origin, not exported).
- Implement optional grid overlay (not exported).
- Implement scroll-wheel zoom on the canvas area.
- Implement pan by middle-mouse drag or Space + drag.
- Implement "reset viewport" to fit the canvas in the available area.
- Implement `src/utils/geometry.ts` with `screenToProject` and `projectToScreen` coordinate conversion functions.
- Integrate the viewport store with the canvas wrapper transform.

### Explicit Exclusions

- No layer rendering.
- No selection or transform handles.
- No pointer-based layer interaction.

### Acceptance Criteria

- The SVG canvas renders a visible canvas border centered in the canvas area.
- Scrolling zooms in and out relative to the pointer position.
- Panning moves the canvas within the window.
- Resetting the viewport fits the canvas to the area.
- The grid and center guide can be toggled via the toolbar.
- Grid and guides are not part of the exportable artwork group.
- `screenToProject` and `projectToScreen` return correct values for known inputs (unit-tested).

### Required Automated Tests

- `src/utils/geometry.test.ts`: `screenToProject` converts screen coordinates to project coordinates for a known zoom and pan; `projectToScreen` is its inverse.

### Required Manual Tests

- Open the application. Canvas border is visible.
- Scroll on the canvas. Zoom increases and decreases.
- Drag with middle mouse. Canvas pans.
- Toggle grid. Grid appears and disappears.

### Expected Deliverables

- `src/components/canvas/SvgCanvas.tsx` and related canvas components.
- `src/utils/geometry.ts` with coordinate conversion.
- Working zoom and pan.

---

## Phase 5 — First Ring Layer

**Status: COMPLETED**

### Objective

Implement the complete Ring layer workflow: add, render, select and edit properties via the inspector. This is the first fully functional layer type.

### Dependencies

- Phase 4 completed.

### Main Implementation Tasks

- Implement `src/components/canvas/layers/RingLayerRenderer.tsx`: renders `<g>` + `<circle>` from a `RingLayer` object.
- Connect the canvas component to iterate `projectStore.layers` and render one renderer per layer.
- Implement the "Add Ring" toolbar action: creates a `RingLayer` with sensible defaults (radius 300, strokeWidth 4, color "#ffffff", centered at origin) and adds it to the project store.
- Implement the inspector panel controls for Ring layer properties: radius, stroke width, color picker, opacity slider, position (x, y) inputs, rotation input, scale inputs.
- Wire all inspector inputs to `updateLayer` in the project store.
- Ensure canvas re-renders immediately on every property change.
- Apply the layer transform (`<g transform="...">`) correctly from the Transform object.
- Respect layer visibility: hidden layers render nothing.
- Respect layer opacity via SVG `opacity` attribute.

### Explicit Exclusions

- No canvas drag interactions (those are Phase 6).
- No selection highlight on canvas (deferred to Phase 6).
- No Radial-Lines layer (Phase 9).
- No undo/redo (Phase 8).
- No persistence (Phase 10).

### Acceptance Criteria

- Clicking "Add Ring" in the toolbar adds a ring to the canvas.
- The ring is rendered as a circle at the correct position with the correct radius.
- Changing the radius in the inspector updates the ring on canvas in real time.
- Changing the color updates the ring color immediately.
- Changing opacity updates the ring opacity immediately.
- Hiding a layer removes it from the canvas. Showing it restores it.
- Multiple rings stack correctly according to their layer order.

### Required Automated Tests

- Vitest: `RingLayerRenderer` renders a `<circle>` with the correct `r`, `stroke`, and `stroke-width` attributes from a `RingLayer` input.
- Vitest: hidden layer renders nothing.
- Vitest: transform is applied as a `transform` attribute on the wrapping `<g>`.

### Required Manual Tests

- Add a Ring layer. Circle appears on canvas.
- Change radius to 200. Circle shrinks.
- Change color to red. Circle turns red.
- Set opacity to 50%. Circle is semi-transparent.
- Toggle visibility off. Circle disappears. Toggle on. Circle returns.

### Expected Deliverables

- `src/components/canvas/layers/RingLayerRenderer.tsx`.
- Inspector controls for Ring layer.
- Working add-ring flow from toolbar to canvas.

---

## Phase 6 — Direct Canvas Transformations

**Status: COMPLETED**

### Objective

Make layers interactive on the canvas: selection, move, rotate and scale by dragging. Implement the selection highlight and transform handles. Integrate coordinate conversion so canvas interactions update project-space coordinates correctly.

### Dependencies

- Phase 5 completed.

### Main Implementation Tasks

- Implement click-to-select on layer SVG elements (pointer events on layer `<g>`).
- Implement selection highlight: a visual indicator (bounding box or ring outline) around the selected layer.
- Implement transform handles: move handle (drag anywhere inside bounds), rotation handle, scale corner handles.
- Implement drag-to-move: update `transform.x` and `transform.y` on `pointermove`.
- Implement drag-to-rotate via rotation handle.
- Implement drag-to-scale via corner handles (hold Shift to lock aspect ratio).
- Implement history snapshot on `pointerdown` for each gesture (one undo step per drag).
- Ensure locked layers show no handles and do not respond to pointer events.
- Implement deselect on canvas background click.
- Use `screenToProject` from Phase 4 for all pointer coordinate conversions.

### Explicit Exclusions

- No Radial-Lines layer interaction (Phase 9).
- No multi-selection.
- No align tools (Phase 8).
- No keyboard nudge (Phase 8).

### Acceptance Criteria

- Clicking a ring on canvas selects it and shows the selection highlight.
- Dragging the ring moves it. Inspector position values update during drag.
- Dragging the rotation handle rotates the ring. Inspector rotation value updates.
- Dragging a corner handle scales the ring. Inspector scale values update.
- Holding Shift during scale drag locks the aspect ratio.
- One drag gesture = one undo step.
- Locked layers cannot be selected or moved on canvas.
- Clicking canvas background deselects.

### Required Automated Tests

- `src/utils/geometry.test.ts`: screen-to-project delta conversion under known zoom and pan.
- Vitest: selection highlight renders when a layer is selected; does not render otherwise.

### Required Manual Tests

- Add a ring. Click it on canvas. Selection highlight appears.
- Drag the ring to a new position. Inspector X and Y update.
- Undo the drag. Ring returns to previous position.
- Lock the layer. Click it on canvas. No selection or handles appear.

### Expected Deliverables

- Canvas selection and transform handle components.
- Pointer event handlers for move, rotate and scale.
- History integration for drag gestures.

---

## Phase 7 — Complete Layer System

**Status: COMPLETED**

> **History note:** Phase 7 implements deterministic atomic project mutations. History integration (undo/redo) is intentionally deferred to Phase 8 (`src/store/history.ts`). Phase 7 actions are not currently undoable.

### Objective

Complete all layer management operations: reorder, duplicate, rename, delete, lock/unlock, show/hide. Make the layer panel fully functional. Implement the "center" align action.

### Dependencies

- Phase 6 completed.

### Main Implementation Tasks

- Implement drag-to-reorder layers in the layer panel (using drag events or a drag library).
- Implement layer duplication: clone the selected layer with a new UUID and a "Copy of" name prefix.
- Implement layer rename: double-click the layer name in the panel to enable inline editing.
- Implement layer delete: toolbar button and keyboard Delete key.
- Implement lock/unlock toggle in the layer panel row.
- Implement show/hide toggle in the layer panel row.
- Implement "Center on canvas" action: sets `transform.x = 0` and `transform.y = 0`.
- Ensure all of these actions create history entries.
- Implement the layer panel empty state ("No layers yet. Add a Ring or Radial Lines.").

### Explicit Exclusions

- No multi-selection or multi-layer operations.
- No keyboard shortcuts beyond Delete (full shortcuts are Phase 8).
- No Radial-Lines layer.

### Acceptance Criteria

- Layers can be reordered by drag in the layer panel. The canvas stacking order updates.
- Duplicating a layer creates a new layer at the same position with a distinct ID.
- Renaming a layer in the panel updates the inspector header.
- Deleting a layer removes it from canvas and panel.
- Lock/unlock is reflected by the absence/presence of canvas handles.
- Show/hide toggles the layer's canvas visibility.
- Center action resets position to origin.
- All actions are undoable.

### Required Automated Tests

- Vitest: `reorderLayers` moves index 2 to index 0 correctly.
- Vitest: duplicate produces a layer with a new UUID, identical properties and a "Copy of" name prefix.
- Vitest: delete removes the correct layer and does not affect others.

### Required Manual Tests

- Add three rings. Drag the bottom one to the top in the layer panel. Verify canvas stacking changes.
- Duplicate a ring. Two rings appear. Move one to verify they are independent.
- Rename a layer. Name changes in panel and inspector.
- Delete a layer. Layer disappears.

### Expected Deliverables

- Fully functional layer panel with all management operations.
- All operations integrated with the history store.

---

## Phase 8 — History, Precision Tools and Shortcuts

**Status: COMPLETED**

### Objective

Finalize the history system, implement keyboard shortcuts, numeric precision controls and alignment tools.

### Dependencies

- Phase 7 completed.

### Main Implementation Tasks

- Add `MAX_HISTORY_DEPTH = 50` to `src/constants.ts`.
- Implement `src/store/history.ts` with fields: `snapshots`, `pointer`, `canUndo`, `canRedo`, and actions: `pushSnapshot`, `undo`, `redo`. Enforce the cap using `MAX_HISTORY_DEPTH`.
- Implement undo (`Ctrl+Z`) and redo (`Ctrl+Shift+Z` or `Ctrl+Y`) keyboard shortcuts globally.
- Implement duplicate shortcut (`Ctrl+D`).
- Implement delete shortcut (`Delete` / `Backspace`).
- Implement arrow key nudge: move the selected layer by 1 logical unit per key press (10 units with Shift).
- Implement Tab key cycling through layers in the layer panel.
- Finalize the inspector numeric inputs with proper validation (min/max clamping, `NaN` handling).
- Implement input debounce for inspector changes (commit to history on blur or after 500 ms idle).
- Implement undo/redo buttons in the toolbar with correct disabled states.
- Implement align-to-center action as a menu or toolbar button.
- Add a "zoom to fit" shortcut (`Ctrl+0` or similar).

### Explicit Exclusions

- No multi-selection or group operations.
- No snap-to-grid.
- No Radial-Lines layer.

### Acceptance Criteria

- The history store compiles and passes unit tests.
- The `MAX_HISTORY_DEPTH` cap is enforced: the oldest snapshot is discarded when the stack is full.
- `Ctrl+Z` undoes the last action. `Ctrl+Shift+Z` redoes it.
- Undo and redo buttons are disabled when there is nothing to undo or redo.
- Nudge with arrow keys moves the selected layer by 1 unit. Shift+arrow moves by 10 units.
- Inspector inputs clamp values to valid ranges and do not create NaN state.
- Fast typing in an inspector input creates one history entry on blur, not one per keystroke.
- All shortcuts are documented in the UI (tooltip or help panel).

### Required Automated Tests

- `src/store/history.test.ts`: `pushSnapshot` adds to stack; `undo` restores previous snapshot; `redo` restores next snapshot; pushing past `MAX_HISTORY_DEPTH` entries drops the oldest; undo reverts to previous state; redo after undo restores.
- Vitest: inspector input commits to history on blur; does not commit on every keystroke.

### Required Manual Tests

- Change radius repeatedly. Blur the field. Undo once. Radius returns to value before the entire edit.
- Press `Ctrl+Z` 50+ times. Application does not error; stops at the oldest state.
- Nudge a layer with arrow keys. Layer moves exactly 1 unit. Undo restores.

### Expected Deliverables

- `src/store/history.ts` with push/undo/redo and depth cap.
- Complete keyboard shortcut implementation.
- Finalized inspector with validated inputs.
- Undo/redo system fully integrated.

---

## Phase 9 — Radial-Lines Layer

**Status: COMPLETED**

### Objective

Implement the Radial-Lines layer type: renderer, inspector controls and canvas interactions. The parametric computation of line positions from stored properties is the core implementation task.

### Dependencies

- Phase 8 completed. (The Ring layer, history and layer management must all be stable before adding a second layer type.)

### Main Implementation Tasks

- Implement `src/utils/geometry.ts` additions: `computeRadialLines(layer: RadialLinesLayer): LineSegment[]` — computes the `(x1, y1, x2, y2)` for each line.
- Implement `src/components/canvas/layers/RadialLinesLayerRenderer.tsx`: renders a `<g>` containing one `<line>` per computed line segment.
- Implement the "Add Radial Lines" toolbar action with sensible defaults (count 8, innerRadius 200, outerRadius 350, startAngle 0, strokeWidth 2, color "#ffffff").
- Implement inspector controls for Radial-Lines properties: count (integer input), inner radius, outer radius, initial rotation (startAngle), stroke width, color, opacity, position, rotation, scale.
- Validate cross-field constraint: `innerRadius < outerRadius` enforced in the UI and store update action.
- Implement canvas selection and transform handles for Radial-Lines layers (reuses the same handle system from Phase 6).
- Ensure `computeRadialLines` is pure and fully unit-tested.

### Explicit Exclusions

- No per-line individual editing (lines within a radial-lines layer are not individually selectable).
- No interactive radius drag handle on canvas (deferred to a future phase).

### Acceptance Criteria

- Clicking "Add Radial Lines" renders the correct number of lines on canvas.
- Changing `count` updates the number of lines immediately.
- Changing `innerRadius` or `outerRadius` updates line lengths immediately.
- Changing `startAngle` rotates the pattern immediately.
- `innerRadius >= outerRadius` is not accepted; the input shows a validation error.
- The layer can be moved, rotated and scaled on canvas.
- The layer works correctly with all layer management operations from Phase 7.

### Required Automated Tests

- `src/utils/geometry.test.ts`: `computeRadialLines` with count=4, startAngle=0, innerRadius=100, outerRadius=200 produces 4 line segments at 0°, 90°, 180°, 270° from 12 o'clock.
- `src/utils/geometry.test.ts`: count=1 produces exactly one line segment; count=12 produces exactly 12.
- Vitest: `RadialLinesLayerRenderer` renders a `<line>` count matching the layer `count` property.

### Required Manual Tests

- Add Radial Lines with count=6. Six lines appear at 60° intervals.
- Change count to 12. Twelve lines appear.
- Change innerRadius. Lines start further from center.
- Move, rotate and scale the layer on canvas. All handles work.
- Undo any property change. Layer reverts.

### Expected Deliverables

- `src/utils/geometry.ts` with `computeRadialLines`.
- `src/components/canvas/layers/RadialLinesLayerRenderer.tsx`.
- Inspector controls for Radial-Lines.
- Passing unit tests for geometry utilities.

---

## Phase 10 — Project Persistence and Import

**Status: COMPLETED**

### Objective

Implement auto-save to local storage and manual project file download and upload. The project file format must conform exactly to [PROJECT_FORMAT.md](PROJECT_FORMAT.md).

### Dependencies

- Phase 9 completed. (Both layer types must be implemented before persistence can be considered complete.)

### Main Implementation Tasks

- Implement debounced auto-save: serialize project state to JSON and write to `localStorage['magic-circle-editor:autosave']` 2 seconds after the last project state change.
- Implement auto-restore on application load: if the auto-save key exists and is valid, restore it as the initial project state.
- Implement "Download Project" action: serialize current project state, set `modified` timestamp, trigger `<a download>` with `.mce.json` extension.
- Implement "Open Project" action: file picker filtered to `.json` / `.mce.json`, read file, parse JSON, run Zod validation, replace project state on success, show error on failure. If the current project contains layers and has unsaved changes, show a confirmation dialog before replacing (resolved decision — Phase 1; see ARCHITECTURE.md § 11.3).
- Implement the migration check: compare file version against current version on import; handle unknown layer types gracefully (skip with warning).
- Implement user preferences persistence: `localStorage['magic-circle-editor:preferences']` for preferences that must not mix with project data.
- Add a "New Project" action that clears the current project; requires confirmation if the project contains layers and has unsaved changes (same rule as "Open Project").
- Update `meta.modified` on every project save.

### Explicit Exclusions

- No cloud storage.
- No export to PNG (that is Phase 11).
- No template loading.
- No undo/redo across sessions (history is in-memory only).

### Acceptance Criteria

- Refreshing the browser restores the last project state from auto-save.
- Downloading a project file produces a valid `.mce.json` that passes Zod validation when imported.
- Importing a file with a valid structure replaces the project and all layers appear correctly.
- Importing an invalid file shows an error message and does not modify the current project.
- Importing a file with an unknown layer type loads the known layers and shows a warning.
- "New Project" prompts for confirmation if the project contains layers and has unsaved changes, then clears to an empty project.
- "Open Project" prompts for the same confirmation before replacing a non-empty unsaved project.
- `meta.modified` is updated on each save.

### Required Automated Tests

- `src/schema/project.test.ts`: the complete example from PROJECT_FORMAT.md parses successfully.
- `src/schema/project.test.ts`: a file missing `__magic_circle__` fails validation.
- `src/schema/project.test.ts`: a file with `innerRadius >= outerRadius` on a Radial-Lines layer fails cross-field validation.
- Vitest: auto-save serialization produces a string that is valid JSON and passes schema validation.

### Required Manual Tests

- Add layers. Refresh the page. Layers are restored.
- Download the project. Open the `.mce.json` file in a text editor. Verify the structure matches PROJECT_FORMAT.md.
- Clear the project. Upload the downloaded file. Layers are restored.
- Upload a random non-project JSON file. Error message appears. Existing project is unchanged.

### Expected Deliverables

- Auto-save and restore logic.
- Project download and upload UI and logic.
- Migration check at import time.
- Passing persistence tests.

---

## Phase 11 — PNG Export

**Status: COMPLETED**

### Objective

Implement the PNG export pipeline as defined in [ARCHITECTURE.md § 12](ARCHITECTURE.md#12-png-export-strategy). Support preset resolutions, custom resolution, transparent and colored backgrounds, full-project and single-layer export.

### Dependencies

- Phase 10 completed.

### Main Implementation Tasks

- Implement `src/utils/export.ts`: `buildExportSvgString(project, options)` — constructs the standalone SVG string from project state with no editor elements.
- Implement the SVG-to-PNG rasterization pipeline: Blob → object URL → `<img>` → `<canvas>` → `canvas.toBlob('image/png')` → download.
- Implement the export options panel (or modal): resolution presets (512, 1024, 2048, 4096), custom resolution input, background color picker (with "Transparent" default), margin slider.
- Implement background injection: if a background color is selected, prepend a `<rect>` to the export SVG.
- Implement selected-layer export: when a layer is selected, offer "Export selected layer" as an option.
- Implement margin application: expand the viewBox by the margin percentage before rasterization.
- Show a loading indicator during rasterization.
- Verify that the exported PNG does not contain the canvas border, grid, guides, selection highlight or any other editor-only element.

### Explicit Exclusions

- No SVG export.
- No animation export.
- No PNG sequence or spritesheet.
- No mask channel export.

### Acceptance Criteria

- Exporting at 2048 × 2048 produces a 2048 × 2048 PNG file.
- The exported PNG has a transparent background when "Transparent" is selected.
- The exported PNG has the correct background color when a color is selected.
- The canvas border, grid and selection highlights are not present in the exported PNG.
- Exporting a single selected layer produces an image with only that layer.
- Margin at 10% produces visible padding around the design.
- Custom resolution input is validated (positive integers, maximum 4096).

### Required Automated Tests

- `src/utils/export.test.ts`: `buildExportSvgString` for a project with one Ring layer produces an SVG string containing a `<circle>` element with the correct attributes and no editor elements.
- `src/utils/export.test.ts`: `buildExportSvgString` for a project with a hidden layer excludes that layer.
- `src/utils/export.test.ts`: with a background color, the SVG string contains a `<rect>` as the first element in the root `<g>`.

### Required Manual Tests

- Export a design at 512 × 512. Open the file. Verify dimensions and transparent background.
- Export at 4096 × 4096 with a blue background. Verify the PNG has a blue background.
- Select one layer. Export "selected layer only." Verify only that layer appears.
- Verify the canvas border line does not appear in any export.

### Expected Deliverables

- `src/utils/export.ts` with `buildExportSvgString`.
- PNG rasterization pipeline.
- Export options UI.
- Passing export unit tests.

---

## Phase 12 — Procedural Generator

**Status: COMPLETED**

### Objective

Implement the procedural generator module. The generator produces `Layer[]` arrays from parameters and a seed. Its output is indistinguishable from manually created layers.

### Dependencies

- Phase 11 completed. (The full editor, persistence and export must be stable before adding the generator.)

### Main Implementation Tasks

- Implement `src/generators/generator.ts`: `generateCircle(params: GeneratorParams, seed: string): Layer[]`.
- Implement a seeded pseudo-random number generator (e.g., mulberry32 or xoshiro128) that produces deterministic output from a string seed.
- Implement generator parameters: number of rings, ring spacing ranges, ring thickness ranges, number of radial-line groups, line count ranges, color palette, complexity level.
- Implement the generator UI panel: parameter controls, seed input, "Generate" and "Regenerate" buttons, individual parameter lock toggles.
- Connect the generator to the project store: on "Generate", replace or append layers using the standard `addLayer` action.
- Validate that all generated layers pass the project Zod schema.
- Write a unit test asserting that the same seed + same parameters always produce identical output.

### Explicit Exclusions

- No template gallery (Phase 13).
- No real-time parameter preview during generation (generate-on-demand only).
- No keyframe or curve-based generation.

### Acceptance Criteria

- Clicking "Generate" produces a valid set of Ring and Radial-Lines layers.
- All generated layers are editable in the inspector and on canvas.
- Same seed + same parameters produces the same design on every run.
- Generated layers pass Zod schema validation.
- Generated layers are stored in the project and persist through save/load.

### Required Automated Tests

- `src/generators/generator.test.ts`: same seed + params produces identical `Layer[]` output on two consecutive calls.
- `src/generators/generator.test.ts`: different seeds produce different outputs.
- `src/generators/generator.test.ts`: all generated layers in a sample run pass `LayerSchema.parse()`.

### Required Manual Tests

- Generate a design. Modify one layer manually. Regenerate. The modified layer is replaced by new generated layers.
- Copy the seed. Reload the app. Enter the same seed and params. Verify identical output.

### Expected Deliverables

- `src/generators/generator.ts`.
- Generator UI panel.
- Passing generator unit tests.

---

## Phase 13 — Templates

**Status: COMPLETED**

### Objective

Implement a template gallery. Templates are pre-defined project files that load as editable projects. No separate rendering system or special object types are required.

### Dependencies

- Phase 12 completed.

### Main Implementation Tasks

- Define 3–5 template projects as `.mce.json` files bundled with the application.
- Implement a template gallery UI (grid of thumbnails or list).
- Implement template loading: read the bundled template file, validate with Zod, load as the current project.
- Generate template thumbnail images (static PNGs, pre-exported using the Phase 11 export pipeline).
- Implement "Start from template" in the new-project flow.
- Add a "New from template" option in the toolbar or menu.

### Explicit Exclusions

- No user-created templates.
- No cloud template gallery.
- No template categories or search.

### Acceptance Criteria

- At least three templates are available.
- Selecting a template loads the project. All layers are editable immediately.
- Template files are valid `.mce.json` files and pass Zod validation.
- Loading a template and then saving produces a valid project file with the correct `created` timestamp set to the load time.

### Required Automated Tests

- `src/schema/project.test.ts`: each bundled template file passes `ProjectFileSchema.parse()`.

### Required Manual Tests

- Open a template. Edit several layer properties. Download the project. Reopen it. Edits are preserved.
- Verify all three templates render a visually different design.

### Expected Deliverables

- 3–5 template `.mce.json` files.
- Template gallery UI.
- Template loading logic.

---

## Phase 14 — Basic Animation Preview

**Status: COMPLETED**

### Objective

Implement non-destructive animation preview: continuous rotation and scale pulsing per layer. The animation system must never modify project state. Implement play, pause and reset controls.

### Dependencies

- Phase 13 completed. (All major editor features must be stable before adding animation.)

### Main Implementation Tasks

- Implement the animation store logic in `src/store/animation.ts`: `play()`, `pause()`, `reset()`, `tick(deltaMs)`, per-layer animated transform computation.
- Implement `src/types/animation.ts`: `LayerAnimationConfig` with `rotationSpeed` and `pulseSpeed`/`pulseAmplitude`.
- Implement the animation panel UI: per-layer rotation speed input, pulse speed and amplitude inputs.
- Implement the animation playback loop using `requestAnimationFrame`.
- Modify the layer renderers to combine base transform with animated transform during playback.
- Implement play, pause and reset buttons in the toolbar.
- Ensure the animation store never writes to the project store.
- Implement the `LayerAnimationConfig` in the animation store (separate from the project store).
- Optionally persist `LayerAnimationConfig` in the project file under the `animation` key defined in PROJECT_FORMAT.md § 8 (minor version bump to 1.1.0 if implemented).

### Explicit Exclusions

- No keyframe animation.
- No animation curves.
- No PNG sequence or spritesheet export.
- No animation export of any kind.
- No audio synchronization.

### Acceptance Criteria

- A ring with `rotationSpeed = 30` completes a full rotation in 12 seconds during preview.
- A layer with pulse settings visibly grows and shrinks during preview.
- Pressing pause halts animation at the current frame.
- Pressing reset returns all animated transforms to the base state.
- The layer's stored base transform is unchanged after animation plays.
- Undoing while paused undoes the last project edit, not the animation state.
- Animation does not affect exported PNG (the base transform is used for export).

### Required Automated Tests

- `src/store/animation.test.ts`: after `tick(1000)` with `rotationSpeed = 360`, the animated rotation offset is 360 degrees.
- `src/store/animation.test.ts`: `reset()` returns all animated transforms to zero.
- `src/store/animation.test.ts`: `play()` followed by `tick(0)` does not change the project store.

### Required Manual Tests

- Add a ring. Set rotation speed to 30. Press play. Ring rotates.
- Press pause. Ring stops at current angle.
- Press reset. Ring returns to base rotation.
- Export PNG while paused mid-rotation. Exported PNG shows the base (non-animated) position.
- Undo a property change while animation is paused. Layer reverts.

### Expected Deliverables

- Completed animation store with playback logic.
- Per-layer animation configuration UI.
- Play/pause/reset controls.
- Layer renderers updated to combine base and animated transforms.
- Passing animation store unit tests.

---

## Phase 15 — Polish, Testing, Portfolio Documentation and Deployment

**Status: PENDING**

Phase 15 becomes **COMPLETED** only after all of the following subphases are completed: 15A, 15B, 15C, 15D, 15E, 15F.

### Dependencies

- Phase 14 completed.

### Explicit Exclusions (apply to all subphases)

- No cloud accounts, cloud storage or real-time collaboration (future features).
- No mobile-optimized layout (future feature).
- No additional layer types beyond Ring and Radial-Lines unless added in a separate pre-polish phase.

---

### Phase 15A — RooWiki UI System + Light/Dark + Editor Layout

**Status: COMPLETED**

Implemented in commit `5c57a1c6860b8be21d641c2b567fd66027ab88e2`.

#### Scope

- RooWiki visual system and `--rw-*` semantic token palette.
- Light / Dark application themes and theme toggle.
- Theme persistence across sessions.
- Editor layout: ToolRail → Layers Panel → Workspace (single 2D canvas) → Right Sidebar (Inspector / Animation).
- Compact desktop proportions and UI visual consistency across all panels.

#### Acceptance Criteria

- Light and Dark themes toggle correctly and persist on reload.
- All panels use the RooWiki `--rw-*` design tokens consistently.
- Editor layout matches the ToolRail → Layers → Workspace → Inspector / Animation structure.
- No regressions in any previously completed phase.

---

### Phase 15B — QA, UX Polish and Accessibility

**Status: COMPLETED**

#### Scope

- Audit and fix all known UI bugs and edge cases.
- Complete the Playwright E2E test suite for all critical user flows defined in [ARCHITECTURE.md § 15.2](ARCHITECTURE.md#152-e2e-tests-playwright).
- Reach ≥ 90% unit test coverage on all utility modules.
- Implement a help or keyboard shortcut reference panel visible in the application.
- Add tooltips to all toolbar buttons and inspector controls.
- Verify color contrast meets WCAG AA for all text elements.
- Responsive and accessibility polish where already implied by the final-polish phase.

#### Acceptance Criteria

- All Playwright E2E tests listed in ARCHITECTURE.md § 15.2 pass.
- Unit test coverage ≥ 90% on utility modules.
- No test regressions from any previous phase.
- The keyboard shortcut reference is visible in the application.
- No TypeScript errors in strict mode.
- No console errors on normal user flows.

#### Required Automated Tests

- All Playwright E2E tests listed in ARCHITECTURE.md § 15.2 pass.
- No test regressions from any previous phase.

#### Required Manual Tests

- Complete a full design session: blank canvas → add Ring + Radial Lines → edit all properties → reorder → export PNG at 2048 × 2048 → download project → reload → reopen project → verify all layers intact.
- Open the application in Chrome, Firefox and Safari. No critical visual differences.
- Test at 1280 × 800 viewport. Layout does not overflow.

---

### Phase 15C — Branding and Product Identity

**Status: COMPLETED**

#### Scope

- Create a favicon and set the browser application title.
- Finalize the working title or replace it with a final product name.

#### Acceptance Criteria

- A favicon is visible in the browser tab.
- The browser tab title reflects the final product name.
- The in-application header or title reflects the final product name.

---

### Phase 15D — README and Portfolio Documentation

**Status: PENDING**

#### Scope

- Write `README.md` for the GitHub repository with a description, screenshot, link to the live demo, and technology stack.
- Write portfolio documentation (separate from this document) describing the technical decisions, challenges and Unreal Engine integration.

#### Acceptance Criteria

- `README.md` exists on the GitHub repository.
- Portfolio documentation covers the key technical decisions and challenges.

---

### Phase 15E — Deployment

**Status: PENDING**

#### Scope

- Configure a deployment target (e.g., Cloudflare Pages, Vercel or Netlify) and set up continuous deployment from the main branch.

#### Acceptance Criteria

- The application deploys to a public URL accessible without authentication.
- Continuous deployment triggers automatically on push to the main branch.

---

### Phase 15F — Final Portfolio Assets

**Status: PENDING**

#### Scope

- Produce a final exported magic-circle PNG asset using the application's export pipeline.
- Create an Unreal Engine 5 VFX using that exported asset.
- Record a portfolio video or prepare a live demo.

#### Acceptance Criteria

- A portfolio artifact (video, screenshots, Unreal Engine scene) exists.
- The exported PNG asset renders correctly as a texture in Unreal Engine 5.
