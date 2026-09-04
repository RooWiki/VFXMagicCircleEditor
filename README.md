# Circle Editor

A browser-based procedural generator and manual editor for designing magic-circle visual effects,
built for export as transparent game-engine textures (Unreal Engine 5 and equivalents).

---

## Live Demo

_Live demo available after deployment — link will be added here._

## Screenshot

_Screenshot will be added after deployment._

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

Opens the editor at `http://localhost:5173`.

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

## Project Documentation

- [Architecture](ARCHITECTURE.md)
- [Project File Format](PROJECT_FORMAT.md)
- [Development Roadmap](ROADMAP.md)
- [Portfolio Notes](PORTFOLIO.md)
