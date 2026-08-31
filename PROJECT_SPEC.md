# Magic Circle Editor — Product Specification

> **Working title only.** "Magic Circle Editor" is a temporary project name. The final product name is not yet decided and must not be treated as a brand identity in this document.

**Document version:** 0.1.0 — Phase 0  
**See also:** [ARCHITECTURE.md](ARCHITECTURE.md) | [PROJECT_FORMAT.md](PROJECT_FORMAT.md) | [ROADMAP.md](ROADMAP.md)

---

## 1. Product Summary

Magic Circle Editor is a browser-based creative tool for designing magic circles — the geometric, symbolic compositions used as visual effects in games, films and illustrations. It combines a **procedural generator** and a **manual editor** in a single application. Artists can start from a generated design, a template or a blank canvas, refine the result layer by layer, preview a basic animation, and export game-ready image assets.

The tool targets desktop browsers. The intended output is a transparent PNG texture ready for use in Unreal Engine 5 and equivalent game engines.

---

## 2. Problem Being Solved

Creating a magic circle from scratch requires either advanced vector-art skills or writing shaders from scratch. Neither option is accessible to most game artists. Existing generic vector editors (Illustrator, Inkscape) lack the domain-specific constraints — symmetry, radial repetition, uniform spacing — that make magic circle design fast and reliable.

There is no dedicated, accessible, browser-based tool for this design task. Artists typically create magic circles by hand in generic software, which is slow and discards reusability. Magic Circle Editor solves this by providing a purpose-built workflow with domain-appropriate defaults and a clear path from design to exported game asset.

---

## 3. Target Audience

### Primary: VFX Artists Without Deep Technical Knowledge

Artists who work on visual effects for games or animation and need to produce magic circle textures. They understand layer-based workflows from tools like Photoshop. They do not necessarily write code or know vector mathematics.

### Secondary: Technical Artists and Tools Developers

Developers who want to see a practical example of a web-based creative tool integrated into a game development pipeline. This audience will engage with the project both as a usable tool and as a portfolio artifact.

The tool's interface must never expose internal mathematical details unless those details are genuinely useful to the artist.

---

## 4. Portfolio Objective

This project is a **Technical Artist portfolio piece** demonstrating:

- Browser-based tool development for artists.
- Procedural geometry generation.
- Non-destructive layer-based editing.
- SVG as an internal rendering representation.
- Extensible data models for creative tools.
- Asset export targeting a professional game-engine pipeline.
- A complete workflow from web design tool to Unreal Engine 5 VFX material.

The portfolio presentation will include:

1. The deployed web tool itself.
2. A video or live demo of the editor.
3. An Unreal Engine 5 scene using assets exported from the tool.

---

## 5. Product Principles

### Non-destructive by default

Layers remain editable mathematical objects. Nothing is flattened or rasterized internally. A change to any property always produces a live update.

### Generator and editor are separate systems

The procedural generator is a separate module. Its output is ordinary editable layers. The editor does not know or care whether a layer was created by the generator or by the user.

### Artist-facing language

The interface uses accessible terminology: Copies, Inner Radius, Outer Radius, Thickness, Spacing. It avoids mathematical or implementation jargon unless the artist would recognize and prefer it.

### One consistent project format

Templates, generated designs and hand-built designs all use the same project file format and the same layer model. There are no special object types that cannot be edited.

### Preview is not export

The canvas background, guides, grid, selection handles and animation preview are editor-only. They are never included in exported assets.

### Desktop-first scope

The editor is designed for mouse and keyboard on a desktop browser. The site may remain viewable on smaller screens, but mobile editing is not an MVP goal.

---

## 6. Main User Workflows

### 6.1 Blank-Canvas Workflow (MVP)

1. User opens the application. A new empty project loads.
2. User adds a Ring or Radial-Lines layer from the toolbar.
3. User adjusts layer properties in the inspector panel.
4. User selects and transforms layers on the canvas.
5. User adds more layers to build the composition.
6. User shows and hides layers to compare versions.
7. User saves the project locally (auto-save) or downloads the project file.
8. User exports the composition as a transparent PNG.

### 6.2 Procedural Generation Workflow (Future)

1. User opens the generator panel and sets parameters.
2. The generator produces a set of Ring and Radial-Lines layers.
3. Those layers appear in the layer panel as normal editable layers.
4. User modifies individual layers using the same tools as in the blank-canvas workflow.
5. User continues from step 5 above.

### 6.3 Template Workflow (Future)

1. User selects a template from a gallery.
2. The template loads as a project containing normal editable layers.
3. User modifies layers as in the blank-canvas workflow.

### 6.4 Reopen and Continue Workflow (MVP)

1. User returns to the site. The auto-saved project is restored.
2. Alternatively, the user uploads a previously downloaded project file.
3. The project is validated and reopened. All layers are editable.

---

## 7. MVP Scope

The MVP is the smallest working version of the tool that demonstrates the complete workflow from blank canvas to exported PNG. It focuses on correctness and usability over breadth of features.

### 7.1 Editor

- Desktop-focused browser interface.
- Central 2D canvas that fills the available viewport area.
- SVG as the internal visual representation for all graphical layers.
- A layer panel listing all layers.
- Layer selection by clicking on the canvas or in the layer panel.
- Layer operations: rename, reorder, show/hide, lock/unlock, duplicate, delete.
- Undo and redo with keyboard shortcuts.
- Automatic save to browser local storage.
- Download the editable project as a `.mce.json` file.
- Upload and reopen a previously saved `.mce.json` file.
- Optional grid overlay on the canvas.
- Optional center-point guide.
- A preview background color that is independent from the exported background.

### 7.2 Layer Types

The MVP includes exactly two graphical layer types.

#### Ring Layer

A continuous circular stroke. Artist-facing name: **Ring**.

Editable properties:

| Property             | Artist Label | Unit          |
| -------------------- | ------------ | ------------- |
| `radius`             | Radius       | Logical units |
| `strokeWidth`        | Thickness    | Logical units |
| `color`              | Color        | Hex color     |
| `opacity`            | Opacity      | 0–100 %       |
| `transform.x`        | X Position   | Logical units |
| `transform.y`        | Y Position   | Logical units |
| `transform.rotation` | Rotation     | Degrees       |
| `transform.scaleX`   | Scale X      | Multiplier    |
| `transform.scaleY`   | Scale Y      | Multiplier    |

#### Radial-Lines Layer

A set of lines distributed uniformly around a center point. Artist-facing name: **Radial Lines**.

The lines are computed parametrically. They are not stored as dozens of independent sub-layers.

Editable properties:

| Property             | Artist Label     | Unit                    |
| -------------------- | ---------------- | ----------------------- |
| `count`              | Copies           | Integer ≥ 1             |
| `innerRadius`        | Inner Radius     | Logical units           |
| `outerRadius`        | Outer Radius     | Logical units           |
| `startAngle`         | Initial Rotation | Degrees, 0 = 12 o'clock |
| `strokeWidth`        | Thickness        | Logical units           |
| `color`              | Color            | Hex color               |
| `opacity`            | Opacity          | 0–100 %                 |
| `transform.x`        | X Position       | Logical units           |
| `transform.y`        | Y Position       | Logical units           |
| `transform.rotation` | Rotation         | Degrees                 |
| `transform.scaleX`   | Scale X          | Multiplier              |
| `transform.scaleY`   | Scale Y          | Multiplier              |

### 7.3 Manual Editing Capabilities

Layers support the following editing operations in the MVP:

- Numeric editing of all properties in the inspector panel.
- Move on canvas by dragging.
- Rotate on canvas by dragging a rotation handle.
- Scale on canvas by dragging a corner handle.
- Duplicate via button or keyboard shortcut.
- Delete via button or keyboard shortcut.
- Center and align (align to canvas center).
- Numeric locking for constrained scaling (lock aspect ratio).

### 7.4 PNG Export

Export options in the MVP:

- Preset export resolutions: 512 × 512, 1024 × 1024, 2048 × 2048, 4096 × 4096.
- Custom resolution (width × height, maximum 4096 on either dimension).
- Transparent background by default.
- Optional solid background color for the exported image.
- Full-project export (all visible layers).
- Selected-layer export (one layer, or all layers if nothing is selected).
- Configurable margin as a percentage of canvas size.

The preview background color is never included in the exported PNG automatically.

### 7.5 Basic Animation Preview

Animation is implemented only after the editor, persistence and PNG export are stable. It is listed here as an MVP goal to ensure the data model accommodates it from the start.

Initial animation capabilities:

- Continuous rotation at a configurable speed per layer.
- Continuous scale pulsing at a configurable speed and amplitude per layer.
- Independent animation settings per layer.
- Play, pause and reset controls.

Animation must be non-destructive. The layer's stored base transform and its current animated transform must remain separate at all times. Animation preview state is never saved in the project file.

The MVP does not export animation.

---

## 8. Explicit Non-Goals (MVP)

The following are explicitly out of scope for the MVP. They may appear in the future vision and roadmap but must not be implemented in any phase labeled MVP:

- Dashed, dotted or segmented rings.
- Arcs (partial rings).
- Double rings or concentric rings as a single compound layer type.
- Polygons, stars or geometric patterns.
- Circular text.
- Rune or symbol layers.
- Importing custom SVG symbols as layers.
- Radial repetition of arbitrary elements.
- Layer groups or masks.
- Blend modes beyond the default SVG blend.
- Gradients on layers.
- Emission-style glow effects.
- Keyframe animation or animation curves.
- PNG sequence or spritesheet export.
- SVG export.
- Separate mask export.
- 3D mesh export.
- Unreal Engine materials or plugins.
- Cloud accounts, cloud project storage or share links.
- Real-time collaboration.
- Mobile editing experience.
- Offline PWA support.
- Procedural generator (deferred to a post-editor phase).
- Templates (deferred to a post-generator phase).

---

## 9. Future Vision

After the MVP is stable, the tool can grow in several directions. These are listed as orientation only. They are not commitments and must not drive any MVP design decision.

### Layer Type Expansion

- Dashed and segmented rings.
- Arcs with configurable span.
- Polygons and stars.
- Circular text.
- Rune and symbol layers.
- Custom imported SVG symbols.
- Radial repetition of arbitrary layer elements.

### Editing Features

- Layer groups and masks.
- Blend modes.
- Gradients and emission effects.
- Multi-selection and alignment tools.
- Snap to guides and grid.
- Rulers and measurement tools.

### Animation

- Keyframe animation with animation curves.
- PNG sequence export.
- Spritesheet export for game engines.

### Export

- SVG export.
- Separate mask channel export.
- 3D mesh export.
- Unreal Engine material templates.
- Unreal Engine plugin.

### Generator and Templates

- Seeded deterministic procedural generation.
- Parameter locking and selective regeneration.
- A template library using the standard project format.

### Platform and Collaboration

- Cloud accounts with cloud project storage.
- Permanent share links.
- Real-time collaborative editing.
- Mobile-optimized editing experience.

---

## 10. UX Principles

### Immediate feedback

Every change to a property must update the canvas in real time with no visible lag.

### Undo everything

Every user action must be reversible. Nothing should be destructive without an explicit confirmation.

### No modal blockers

Property editing, export and project management should not block access to the canvas with full-screen modals if this can be avoided.

### Visible state

The current layer selection, visibility and lock status must always be apparent without the user having to interact.

### Predictable defaults

A newly added layer should appear with sensible defaults that are immediately visible on canvas without requiring any adjustment.

### Preview ≠ export

The preview background, grid and guides are clearly different from the final exported result. The UI communicates this distinction.

### Keyboard accessibility

All major operations must be reachable by keyboard shortcut. These shortcuts must follow established conventions (`Ctrl+Z`, `Ctrl+D`, `Delete`, etc.).

---

## 11. Definition of a Successful MVP

The MVP is complete when a user can:

1. Open the application in a desktop browser without installing anything.
2. Add Ring and Radial-Lines layers to the canvas.
3. Edit all layer properties numerically through the inspector.
4. Move, rotate and scale layers on the canvas by dragging.
5. Reorder, duplicate, show/hide, lock/unlock and delete layers.
6. Undo and redo every action.
7. See the composition update in real time after every change.
8. Save the project to local storage (automatically) and download it as a file.
9. Reopen the downloaded file and continue editing.
10. Export a transparent PNG at any supported resolution.
11. See a basic animation preview (rotation and pulsing) per layer.

The tool must be stable enough that a user can complete a design session without data loss.
