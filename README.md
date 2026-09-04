# Circle Editor

A browser-based creative tool for designing magic circles — the geometric, symbolic compositions
used in game VFX, films and illustrations. Combines a procedural generator with a non-destructive
layer editor, and exports transparent PNG textures ready to import into Unreal Engine 5.

---

## Live Demo

**[circle-editor.pages.dev/circleeditor/](https://circle-editor.pages.dev/circleeditor/)**

## Screenshot

![Circle Editor — Arcane Matrix template loaded in the editor](docs/images/circle-editor-main.png)

---

## Workflow

1. **Generate** — seed-based procedural generator produces a Ring + Radial Lines composition as a starting point
2. **Edit** — adjust each layer's geometry, color, and transform non-destructively; nothing is ever flattened
3. **Export** — rasterize at 512–4096 px with a transparent background, ready to import as a `Texture2D` in Unreal Engine 5

---

## Features

- **Two layer types** — Ring (circular stroke) and Radial Lines (parametric line array)
- **Non-destructive editing** — all layers remain live mathematical objects; nothing is flattened
- **Procedural generator** — seed-based generation of Ring + Radial Lines compositions
- **Five templates** — pre-built designs ready to edit
- **Canvas transform controls** — move, rotate, and scale layers directly by dragging
- **Animation preview** — per-layer rotation speed and scale pulsing, non-destructive
- **PNG export** — 512–4096 px, transparent or solid background, full project or single-layer
- **Project persistence** — auto-save to local storage + download/upload `.mce.json`
- **Light / Dark themes** — persistent across sessions
- **Keyboard shortcuts** — Undo/Redo, Duplicate, Delete, nudge, help panel (`?`)

---

## Technology Stack

| Concern    | Technology               |
| ---------- | ------------------------ |
| Framework  | React 19                 |
| Language   | TypeScript (strict mode) |
| Build tool | Vite 8                   |
| Rendering  | SVG (browser-native)     |
| State      | Zustand 5                |
| Validation | Zod 3                    |
| Styling    | Tailwind CSS v4          |
| Unit tests | Vitest 3                 |
| E2E tests  | Playwright               |

---

## Getting Started

### Prerequisites

- Node.js ≥ 18
- npm ≥ 8

### Install

```bash
npm install
```

### Development server

```bash
npm run dev
```

Opens the editor at `http://localhost:5173/circleeditor/`.

### Production build

```bash
npm run build
```

---

## Available Scripts

| Script                  | Description                                   |
| ----------------------- | --------------------------------------------- |
| `npm run dev`           | Start the Vite development server             |
| `npm run build`         | Type-check and produce a production build     |
| `npm run preview`       | Preview the production build locally          |
| `npm run typecheck`     | Run TypeScript type-checking without building |
| `npm run lint`          | Run ESLint                                    |
| `npm run lint:fix`      | Run ESLint and auto-fix                       |
| `npm run format`        | Check formatting with Prettier                |
| `npm run format:write`  | Auto-format all files                         |
| `npm run test`          | Run unit tests (single pass)                  |
| `npm run test:watch`    | Run unit tests in watch mode                  |
| `npm run test:coverage` | Run unit tests with coverage report           |
| `npm run test:e2e`      | Run Playwright end-to-end tests               |

---

## Deployment

Circle Editor is deployed to **Cloudflare Pages** via **GitHub Actions** continuous deployment.

- Production branch: `main` — every push triggers a build and deploy automatically
- Build output is served under the `/circleeditor/` subpath
- Public URL: **[circle-editor.pages.dev/circleeditor/](https://circle-editor.pages.dev/circleeditor/)**

---

## Project Documentation

- [Architecture](ARCHITECTURE.md)
- [Project File Format](PROJECT_FORMAT.md)
- [Development Roadmap](ROADMAP.md)
- [Portfolio Notes](PORTFOLIO.md)
