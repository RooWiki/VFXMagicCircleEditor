# Magic Circle Editor — Project File Format

> **Working title only.** "Magic Circle Editor" is a temporary project name.

**Document version:** 0.1.0 — Phase 0  
**File extension:** `.mce.json`  
**MIME type:** `application/json`  
**See also:** [PROJECT_SPEC.md](PROJECT_SPEC.md) | [ARCHITECTURE.md](ARCHITECTURE.md) | [ROADMAP.md](ROADMAP.md)

---

## 1. Overview and Goals

The project file is the primary artifact that users save and exchange. Its format must satisfy these requirements:

- Human-readable JSON.
- Strictly versioned so future changes can be migrated automatically.
- Validated at import time with Zod before any data reaches application state.
- Self-describing: a future developer reading the file should be able to understand its structure without consulting documentation.
- Complete: the file must contain everything needed to reproduce the design exactly, excluding editor session state.
- Compact: a typical design (10–30 layers) should serialize to well under 100 KB.

---

## 2. Top-Level Structure

```json
{
  "__magic_circle__": true,
  "version": "1.0.0",
  "meta": { ... },
  "canvas": { ... },
  "layers": [ ... ]
}
```

| Field              | Type             | Required | Description                                                                                          |
| ------------------ | ---------------- | -------- | ---------------------------------------------------------------------------------------------------- |
| `__magic_circle__` | `true` (literal) | Yes      | Format identifier. Distinguishes this file from other JSON files. Always the literal boolean `true`. |
| `version`          | string           | Yes      | Semantic version of the project file format (not the application version).                           |
| `meta`             | object           | Yes      | Project metadata.                                                                                    |
| `canvas`           | object           | Yes      | Canvas configuration.                                                                                |
| `layers`           | array            | Yes      | Ordered layer array, bottom-to-top render order.                                                     |

---

## 3. Format Identifier

The field `"__magic_circle__": true` acts as a format sentinel. An import routine must reject any file where this field is absent or not the literal boolean `true`, before inspecting any other field.

This prevents accidental loading of unrelated JSON files.

---

## 4. Schema Version

```json
"version": "1.0.0"
```

The version string follows [Semantic Versioning](https://semver.org/):

- **Major**: breaking change to the schema. Requires a migration function.
- **Minor**: backward-compatible addition (new optional fields). Older readers ignore unknown fields.
- **Patch**: editorial correction or documentation clarification. No structural change.

The current schema version defined in this document is **1.0.0**.

### Version Comparison at Import

On import, the application compares the file version against the current supported version:

1. Same major, same or older minor: load directly.
2. Same major, newer minor: load with a warning ("This file was created by a newer version. Some features may not be available.").
3. Different major: run migration (see Section 9).
4. Version field missing or malformed: reject the file.

---

## 5. Project Metadata

```json
"meta": {
  "title": "Untitled",
  "created": "2026-08-31T00:00:00.000Z",
  "modified": "2026-08-31T00:00:00.000Z"
}
```

| Field      | Type                     | Description                                                   |
| ---------- | ------------------------ | ------------------------------------------------------------- |
| `title`    | string                   | User-visible project name. Min 1 character.                   |
| `created`  | ISO 8601 datetime string | When the project was first saved. Set once and never changed. |
| `modified` | ISO 8601 datetime string | When the project was last saved. Updated on every save.       |

The `created` and `modified` timestamps are set by the application at save time. They are UTC ISO 8601 strings. The user does not edit these fields directly.

---

## 6. Canvas Configuration

```json
"canvas": {
  "width": 1000,
  "height": 1000
}
```

| Field    | Type   | Constraints      | Description                             |
| -------- | ------ | ---------------- | --------------------------------------- |
| `width`  | number | Positive integer | Logical canvas width in project units.  |
| `height` | number | Positive integer | Logical canvas height in project units. |

The default canvas is **1000 × 1000** logical units with the origin at the center. See [ARCHITECTURE.md § 6](ARCHITECTURE.md#6-logical-coordinate-system) for the full coordinate system definition.

In version 1.0.0, the canvas dimensions are fixed to 1000 × 1000. The field is stored explicitly to support non-square canvases in a future minor version.

---

## 7. Layer Definitions

The `layers` array contains layer objects in bottom-to-top render order. Index 0 is the bottom-most layer (rendered first). The last index is the topmost layer (rendered last, appears in front).

### 7.1 Common Base Fields

All layer objects share these fields:

| Field       | Type             | Constraints                         | Description                                                    |
| ----------- | ---------------- | ----------------------------------- | -------------------------------------------------------------- |
| `id`        | string (UUID v4) | Required, unique within the project | Stable identifier. Never reused, never changed after creation. |
| `type`      | string literal   | Required                            | Discriminant: `"ring"` or `"radial-lines"`.                    |
| `name`      | string           | Min 1 character                     | User-editable label.                                           |
| `visible`   | boolean          | Required                            | Whether the layer is rendered.                                 |
| `locked`    | boolean          | Required                            | Whether the layer is protected from canvas interaction.        |
| `opacity`   | number           | 0.0–1.0 inclusive                   | Layer-level opacity. 1.0 = fully opaque.                       |
| `transform` | object           | Required                            | Spatial transform. See Section 7.2.                            |

### 7.2 Transform Object

The `transform` object is the same for all layer types.

```json
"transform": {
  "x": 0,
  "y": 0,
  "rotation": 0,
  "scaleX": 1,
  "scaleY": 1
}
```

| Field      | Type   | Description                                                                            |
| ---------- | ------ | -------------------------------------------------------------------------------------- |
| `x`        | number | Horizontal offset from canvas center in logical units. Positive = right.               |
| `y`        | number | Vertical offset from canvas center in logical units. Positive = down (SVG convention). |
| `rotation` | number | Degrees, clockwise. 0 = no rotation.                                                   |
| `scaleX`   | number | Horizontal scale multiplier. 1.0 = no scale.                                           |
| `scaleY`   | number | Vertical scale multiplier. 1.0 = no scale.                                             |

### 7.3 Ring Layer

Discriminant: `"type": "ring"`

Represents a continuous circular stroke centered at the layer origin.

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "type": "ring",
  "name": "Outer Ring",
  "visible": true,
  "locked": false,
  "opacity": 1.0,
  "transform": {
    "x": 0,
    "y": 0,
    "rotation": 0,
    "scaleX": 1,
    "scaleY": 1
  },
  "radius": 400,
  "strokeWidth": 4,
  "color": "#ffffff"
}
```

Ring-specific fields:

| Field         | Type   | Constraints     | Artist Label | Description                                                    |
| ------------- | ------ | --------------- | ------------ | -------------------------------------------------------------- |
| `radius`      | number | > 0             | Radius       | Distance from layer origin to stroke center, in logical units. |
| `strokeWidth` | number | > 0             | Thickness    | Width of the circular stroke in logical units.                 |
| `color`       | string | Valid CSS color | Color        | Stroke color. Stored as a hex string, e.g. `"#ffffff"`.        |

The ring renders as a `<circle>` SVG element with `fill="none"`. The stroke is centered on the radius, so the visible ring spans from `radius − strokeWidth/2` to `radius + strokeWidth/2`.

### 7.4 Radial-Lines Layer

Discriminant: `"type": "radial-lines"`

Represents a set of uniformly distributed lines extending from an inner radius to an outer radius around the layer origin.

```json
{
  "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
  "type": "radial-lines",
  "name": "Rune Lines",
  "visible": true,
  "locked": false,
  "opacity": 0.85,
  "transform": {
    "x": 0,
    "y": 0,
    "rotation": 0,
    "scaleX": 1,
    "scaleY": 1
  },
  "count": 12,
  "innerRadius": 300,
  "outerRadius": 390,
  "startAngle": 0,
  "strokeWidth": 2,
  "color": "#88aaff"
}
```

Radial-Lines-specific fields:

| Field         | Type    | Constraints          | Artist Label     | Description                                                                             |
| ------------- | ------- | -------------------- | ---------------- | --------------------------------------------------------------------------------------- |
| `count`       | integer | ≥ 1                  | Copies           | Number of lines distributed around the full circle.                                     |
| `innerRadius` | number  | ≥ 0, < `outerRadius` | Inner Radius     | Distance from layer origin to where each line begins, in logical units.                 |
| `outerRadius` | number  | > `innerRadius`      | Outer Radius     | Distance from layer origin to where each line ends, in logical units.                   |
| `startAngle`  | number  | Any real number      | Initial Rotation | Angle of the first line in degrees. 0 = 12 o'clock (pointing up). Positive = clockwise. |
| `strokeWidth` | number  | > 0                  | Thickness        | Width of each line in logical units.                                                    |
| `color`       | string  | Valid CSS color      | Color            | Line color. Stored as a hex string.                                                     |

Lines are parametrically computed at render time. They are not stored as individual geometric objects.

Angle for line `i` (zero-indexed):

```
angle_i = startAngle + i × (360 / count)
```

Each line's start and end points in SVG coordinates (rotating frame):

```
x_inner = innerRadius × sin(angle_i_rad)
y_inner = −innerRadius × cos(angle_i_rad)
x_outer = outerRadius × sin(angle_i_rad)
y_outer = −outerRadius × cos(angle_i_rad)
```

The negative cosine on `y` converts from the 12-o'clock convention to SVG's Y-down coordinate system.

---

## 8. Animation Data (Future — Schema Placeholder)

Animation configuration for layers is **not stored in version 1.0.0**. This section documents the forward-compatible location where it will be added.

In a future minor version (e.g., 1.1.0), an optional top-level `animation` field will be added:

```json
"animation": {
  "layers": {
    "{layerId}": {
      "rotationSpeed": 30,
      "pulseSpeed": 1.0,
      "pulseAmplitude": 0.05
    }
  }
}
```

| Field            | Type   | Description                                                 |
| ---------------- | ------ | ----------------------------------------------------------- |
| `rotationSpeed`  | number | Degrees per second of continuous rotation. 0 = no rotation. |
| `pulseSpeed`     | number | Cycles per second of scale pulsing. 0 = no pulsing.         |
| `pulseAmplitude` | number | Scale multiplier amplitude (e.g., 0.05 = ±5% scale).        |

Version 1.0.0 readers must ignore the `animation` field if present. Version 1.1.0 readers must treat missing `animation` fields as equivalent to zero-animation defaults.

Animation preview state (playing, elapsed time) is **never stored in the project file**.

---

## 9. Validation Rules

All imported project files must pass Zod schema validation before any data reaches application state. Invalid files are rejected entirely; the current project is not modified.

### 9.1 Illustrative Zod Schema

The following is an illustrative representation of the Zod schema. The authoritative implementation lives in `src/schema/project.ts`.

```typescript
// Illustrative example — not an application source file
import { z } from 'zod'

const TransformSchema = z.object({
  x: z.number(),
  y: z.number(),
  rotation: z.number(),
  scaleX: z.number(),
  scaleY: z.number(),
})

const BaseLayerSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  visible: z.boolean(),
  locked: z.boolean(),
  opacity: z.number().min(0).max(1),
  transform: TransformSchema,
})

const RingLayerSchema = BaseLayerSchema.extend({
  type: z.literal('ring'),
  radius: z.number().positive(),
  strokeWidth: z.number().positive(),
  color: z.string().min(1),
})

const RadialLinesLayerSchema = BaseLayerSchema.extend({
  type: z.literal('radial-lines'),
  count: z.number().int().min(1),
  innerRadius: z.number().min(0),
  outerRadius: z.number().positive(),
  startAngle: z.number(),
  strokeWidth: z.number().positive(),
  color: z.string().min(1),
})

const LayerSchema = z.discriminatedUnion('type', [RingLayerSchema, RadialLinesLayerSchema])

const ProjectMetaSchema = z.object({
  title: z.string().min(1),
  created: z.string().datetime(),
  modified: z.string().datetime(),
})

const CanvasSchema = z.object({
  width: z.number().positive(),
  height: z.number().positive(),
})

const ProjectFileSchema = z.object({
  __magic_circle__: z.literal(true),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  meta: ProjectMetaSchema,
  canvas: CanvasSchema,
  layers: z.array(LayerSchema),
})
```

### 9.2 Cross-Field Rules

In addition to the Zod schema, the following cross-field rules must be enforced after schema validation:

- Layer IDs must be unique within the `layers` array.
- For Radial-Lines layers: `innerRadius` must be strictly less than `outerRadius`.
- `count` must be a finite positive integer (Zod `.int().min(1)` handles this).

Cross-field rules that Zod cannot express natively must be implemented as post-validation checks before the data reaches the application state.

### 9.3 Validation Error Handling

When validation fails:

- Log the Zod error details to the browser console.
- Show the user a human-readable error message indicating the file could not be opened (do not expose raw schema error text to the user).
- Do not modify the current project state.

---

## 10. Safe Import Behavior

### 10.1 Principle: Reject Loudly, Never Corrupt

The import routine must be conservative. An invalid file must always fail loudly. It must never silently discard parts of the file and load a partial result, as this could mislead the user into believing their data was saved correctly.

### 10.2 Unknown Fields

If a file contains unknown top-level fields or unknown layer fields (e.g., fields added by a future version), those fields are ignored. The known fields are loaded normally.

Zod's `.passthrough()` option or `.strip()` (default) controls this behavior. The schema should use `.strip()` to ignore unknown fields rather than failing.

### 10.3 Unknown Layer Types

If the `layers` array contains a layer with an unknown `type` value (e.g., a type added in a future version), that layer object is skipped and the remaining layers are loaded. A warning is shown to the user indicating that some layers could not be loaded due to a version mismatch.

### 10.4 Import Does Not Affect Auto-Save

Importing a project file replaces the current in-memory project state. The auto-save key in local storage is updated after a successful import, but only after the user makes a change (the debounced write prevents immediate overwrite).

---

## 11. Migration Strategy

### 11.1 Version-Controlled Migrations

Each major version change requires a migration function registered in the schema module. Migrations are applied sequentially when opening older files.

```
file version 0.x.x → migrate_v0_to_v1(data) → version 1.x.x
file version 1.x.x → migrate_v1_to_v2(data) → version 2.x.x
```

A migration function takes raw JSON (the previous version's shape) and returns JSON conforming to the current version's shape. It must never fail on valid input from the previous version.

### 11.2 Minor Version Compatibility

Minor version changes (1.0.0 → 1.1.0) are backward-compatible. No migration function is needed. Unknown optional fields from newer minor versions are ignored by older readers.

### 11.3 Migration Registry (Illustrative)

```typescript
// Illustrative example — not an application source file
const migrations: Record<string, (data: unknown) => unknown> = {
  '0.x': migrate_v0_to_v1,
  // Future entries added here as needed
}

function migrateIfNeeded(data: unknown): unknown {
  const majorVersion = extractMajorVersion(data)
  const migration = migrations[majorVersion]
  return migration ? migration(data) : data
}
```

### 11.4 Preventing Breaking Changes

Breaking changes to the format should be rare. Before incrementing the major version, consider whether the change can be expressed as an optional addition (minor version).

---

## 12. Complete Example Project

The following is a complete, valid version 1.0.0 project file containing one Ring layer and one Radial-Lines layer.

```json
{
  "__magic_circle__": true,
  "version": "1.0.0",
  "meta": {
    "title": "Example Magic Circle",
    "created": "2026-08-31T00:00:00.000Z",
    "modified": "2026-08-31T00:00:00.000Z"
  },
  "canvas": {
    "width": 1000,
    "height": 1000
  },
  "layers": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "type": "ring",
      "name": "Outer Ring",
      "visible": true,
      "locked": false,
      "opacity": 1.0,
      "transform": {
        "x": 0,
        "y": 0,
        "rotation": 0,
        "scaleX": 1,
        "scaleY": 1
      },
      "radius": 400,
      "strokeWidth": 4,
      "color": "#ffffff"
    },
    {
      "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      "type": "radial-lines",
      "name": "Rune Lines",
      "visible": true,
      "locked": false,
      "opacity": 0.85,
      "transform": {
        "x": 0,
        "y": 0,
        "rotation": 0,
        "scaleX": 1,
        "scaleY": 1
      },
      "count": 12,
      "innerRadius": 300,
      "outerRadius": 390,
      "startAngle": 0,
      "strokeWidth": 2,
      "color": "#88aaff"
    }
  ]
}
```

### What This Project Renders

- A white ring at the canvas center with radius 400 and thickness 4. It nearly fills the 1000-unit canvas.
- 12 blue-tinted lines distributed evenly around the circle, spanning from radius 300 to 390. The first line points to 12 o'clock. The lines are rendered at 85% opacity.

### Excluded From This File

The following are **not** present in the project file because they are editor session state:

- The currently selected layer.
- The viewport zoom level and pan offset.
- Whether the grid or center guides are visible.
- The preview background color.
- Animation playback state.
- Undo/redo history.

---

## 13. Minimal Empty Project

The following is the minimal valid project file representing an empty canvas.

```json
{
  "__magic_circle__": true,
  "version": "1.0.0",
  "meta": {
    "title": "Untitled",
    "created": "2026-08-31T00:00:00.000Z",
    "modified": "2026-08-31T00:00:00.000Z"
  },
  "canvas": {
    "width": 1000,
    "height": 1000
  },
  "layers": []
}
```

An empty `layers` array is valid. The application renders an empty canvas and allows the user to start adding layers immediately.
