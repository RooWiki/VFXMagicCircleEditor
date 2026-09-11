# Advanced magic-circle artwork

Authorized scope: stars/polygons, circular text, symbols with SVG import, editable groups with circular repetition, solid fills and transparent cutouts, glow/shadow/second outline. Integrate selection/transforms, history, save/load, PNG and local preview. Do not deploy unless requested.

Completion evidence required:

- Each tool accessible and controls work in browser.
- Group multiple existing layers; edit members; repeated instances update together; count/radius/angle/orientation.
- Imported SVG sanitized and survives save/load/export.
- Cutouts remove underlying art with transparent PNG pixels; color fills occlude.
- Effects visible in preview and PNG.
- Old tests plus meaningful new unit/browser/pixel tests pass.
- Documentation and a usable example composition included.

## Completed — 2026-09-09

- Finished interlaced-star rendering and controls, and fit-to-circle text controls.
- Verified nested group editing/repetition, sanitized SVG import, autosave,
  project download, transparent PNG cutouts, text, symbols and finish effects.
- Fixed visible-layer canvas structure and inspector-to-drag history transitions.
- Added rendering-budget checks for group edits and duplication.
- Editable example: public/examples/ornamental-seal.mce.json; available directly
  from Add Ornamental Seal. Screenshot: docs/images/circle-editor-advanced.png.
- Final validation: 935 unit tests and 296 Chromium browser tests passed;
  production build, ESLint, changed-source formatting and git diff --check passed.
- Local development server: http://localhost:5178/circleeditor/.
- No deployment performed. Changes remain in the working tree.

## Zoom performance and composed generation — 2026-09-09

- Memoized canvas artwork: changing only the viewport no longer regenerates group
  markup or mutates its SVG subtree.
- Replaced oversized mask/filter regions with conservative artwork bounds; groups
  without cutouts no longer create empty masks.
- Cached expensive group effects for navigation only. Vectors return 180 ms after
  the last wheel event; editing invalidates the cache and export stays vector-based.
- Local headless Chromium wheel measurement (30 updates, two animation frames per
  sample): bounded-vector average 42.82 ms, navigation-preview average 33.09 ms;
  maximum 72.10 ms versus 33.80 ms. These are local cycle timings, not an FPS claim.
- Arcane/Celestial/Mechanical now compose editable stars/polygons, central sigils,
  inscriptions and orbit emblems; high detail adds satellites. Lettering occupies
  a reserved radial band. Classic remains available.
- Appending generated groups recursively clones IDs so repeated appends save/load.
- Added browser regressions for unchanged geometry during zoom, vector restoration,
  all three design styles and unique IDs after repeated append.
- Final checks: 937 unit tests passed; build, lint and formatting passed. Full
  browser run: 297/298 passed; the isolated two-ring count check then passed all
  five repetitions without code changes. New zoom/generator checks and existing
  PNG pixel tests passed. No deployment performed.
