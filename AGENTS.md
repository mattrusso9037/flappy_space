# AI Agent Guardrails & Development Guide

Welcome to **Flappy Spaceman** (`flappy_space`), an arcade game built with React 19, Pixi.js v8, Electron, TypeScript, and Vite.

This document establishes the mandatory guardrails, architectural standards, and validation workflows that **all AI models and contributors must strictly adhere to**.

---

## 1. Scope Discipline

> **This repository uses a lightweight system-oriented game architecture. Do not introduce a generic ECS, custom physics engine, plugin framework, dependency injection container, or reusable npm engine package without a concrete second use case.**

---

## 2. The Universal Verification Command

Before submitting any code changes, creating a commit, or completing a task, **you MUST run**:

```bash
npm run verify
```

This single command executes three essential checks:
1. **TypeScript Typecheck**: `tsc -b` (Strict mode, zero type errors).
2. **ESLint Static Analysis**: `eslint .` (Zero errors; enforce zero unhandled warnings).
3. **Vitest Unit Test Suite**: `vitest run` (100% test pass rate).

If `npm run verify` fails, the task is **not done**. Fix any regressions immediately.

---

## 3. Essential Development Commands

| Command | Description |
| :--- | :--- |
| `npm run verify` | Runs TypeScript check + ESLint + Vitest unit test suite. |
| `npm test` | Runs the test suite via Vitest. |
| `npm run test:watch` | Runs Vitest in watch mode during development. |
| `npm run test:coverage` | Generates full statement, branch, and function coverage report. |
| `npm run lint` | Runs ESLint across all TypeScript and TSX files. |
| `npm run build` | Builds production web bundle with TypeScript compilation. |
| `npm run dev` | Starts Vite local development server. |
| `npm run electron:dev` | Runs both Vite and Electron desktop app concurrently. |

---

## 4. Architecture & Separation of Concerns

### A. React / Pixi.js Boundary
- **React owns the application shell**: Mounting, menus, overlays, dialogs, loading/error screens, and non-realtime presentation.
- **Pixi.js owns realtime rendering**: The stage canvas, scene graph, sprites, particles, and render loop.
- **RULE**: Never push per-frame entity simulation state through React. Realtime movement stays inside the Pixi canvas and systems.

### B. Runtime Ownership & Composition Root
- Every mounted game session is owned by an independent `GameRuntime` instance.
- **No runtime-owned singletons**: Systems (`EntitySystem`, `PhysicsSystem`, `SpawningSystem`, `RenderSystem`, `InputSystem`, `AudioSystem`, `UISystem`), `EventBus`, and `GameStateService` are normal, instantiable classes.
- Dependencies are wired in one composition root: `createFlappySpaceRuntime(app)`.
- Cleanup is deterministic: when the React component unmounts, `runtime.dispose()` tears down all systems, detaches the ticker callback, and unsubscribes all listeners.

### C. Typed Event Rules
- Communication between decoupled systems flows through `EventBus`:
  ```typescript
  // Emitting a typed event
  events.emit(GameEvent.SCORE_CHANGED, newScore);

  // Subscribing to an event
  const sub = events.on<number>(GameEvent.SCORE_CHANGED).subscribe(score => { ... });
  // Always clean up subscriptions when disposing:
  sub.unsubscribe();
  ```
- **RULE**: Events are strongly typed with consistent payload contracts.
- **RULE**: Entities (`Astronaut`, `Orb`, `Planet`, `Star`) must NOT subscribe to global runtime events directly in their constructors. Action methods on entities are called by their respective systems.

### D. Single-Source Rule Ownership
- Gameplay rules have a single authoritative owner.
  - **Orb scoring**: When physics detects an orb collection, `state.collectOrb()` updates orb count and awards `ORB_POINTS` (50 points) exactly once.
  - **Campaign progression & level sequencing**: Owned exclusively by `GameFlow` above `GameRuntime`. Consult [CAMPAIGN_FLOW_ARCHITECTURE.md](./CAMPAIGN_FLOW_ARCHITECTURE.md) for canonical campaign definitions, game phases, checkpoints, and save contracts. `GameRuntime` executes active levels from explicit `LevelDefinition`s and emits outcome events; it never decides next-level progression.
  - **UI reacts to state/events**: UI never independently mutates score or gameplay rules.

### E. Simulation Time Over Real Timers
- Avoid unmanaged `setTimeout` or `setInterval` for gameplay sequencing.
- Use simulation time delta countdowns inside `update(deltaSeconds)` so pause, resume, reset, and test clocks work deterministically.

---

## 5. Code Quality & Guardrail Rules

1. **No `any` Types**:
   - Strict typing is enforced. Use explicit TypeScript interfaces, unions, generics, or `unknown` with proper type guards.
2. **Structured Logging Only**:
   - Never use `console.log()` directly.
   - Always instantiate a named logger:
     ```typescript
     import { getLogger } from '../utils/logger';
     const logger = getLogger('ComponentName');
     logger.debug('Debug details', { foo: 'bar' });
     logger.info('Significant lifecycle event');
     logger.warn('Warning condition');
     logger.error('Error encountered', error);
     ```
   - Avoid high-frequency logging inside per-frame update loops.
3. **Headless & CI Safe**:
   - Pixi.js runs in both the browser, Electron, and headless test runners (Node.js/JSDOM).
   - In `src/test/setup.ts`, Canvas 2D contexts and Web Audio APIs are mocked so headless tests execute instantly without needing a physical GPU or audio device.
4. **Mandatory Tests for New Features**:
   - Whenever adding a new entity, helper function, collision math, or system:
     - Always create or update the corresponding `*.test.ts` file in the same directory.
     - Behavioral contracts take priority over implementation-shape tests.
     - Verify tests pass with `npm test`.

---

## 6. PixiJS v8 Reference Guidance & Visual Implementation

Comprehensive PixiJS v8 reference skills and cheatsheets are maintained for AI agents assisting with this project:
- Always target Pixi.js v8 modern APIs (e.g., `app.init()`, `app.canvas`, shape-then-fill Graphics).
- Preserve headless testing compatibility.
- Do not add `@pixi/react`.
- Consult [VISUAL_IMPLEMENTATION.md](./VISUAL_IMPLEMENTATION.md) for canonical depth order, design tokens, rendering layers, motion conventions, particle effects, and the locked astronaut asset constraint.

---

## 7. File & Directory Layout

```
flappy_space/
├── .cursor/rules/             # Cursor rules (project-info points to AGENTS.md)
├── .github/workflows/         # GitHub Actions CI automation
├── electron/                  # Electron main & preload scripts
├── public/                    # Static assets (sprites, icons)
├── src/
│   ├── components/            # React UI components (GameDisplay, Scoreboard, LevelMessage)
│   ├── game/                  # Core game logic, systems, composition root, and runtime
│   │   ├── campaign/          # Campaign data definitions, GameFlow orchestrator, and SaveService
│   │   ├── config.ts          # Game constants and physics values
│   │   ├── createFlappySpaceRuntime.ts # Flappy Space composition root
│   │   ├── GameRuntime.ts     # Game session runtime lifecycle owner
│   │   ├── eventBus.ts        # Instantiable, typed EventBus
│   │   ├── gameStateService.ts# Centralized state management store
│   │   ├── inputManager.ts    # Low-level keyboard and touch events
│   │   ├── types.ts           # Game system lifecycle interfaces
│   │   ├── entities/          # Entities (Astronaut, Planet, Orb, Star)
│   │   ├── systems/           # Systems (Physics, Render, Spawning, Audio, UI, Entity)
│   │   └── visuals/           # Design tokens, motion, particle effects
│   ├── test/                  # Test setup and Canvas mocks
│   └── utils/                 # Logger and diagnostic utilities
├── AGENTS.md                  # Primary AI Agent Guardrails Guide (Source of Truth)
├── VISUAL_IMPLEMENTATION.md   # Canonical visual architecture, layers, tokens, and constraints
├── eslint.config.js           # ESLint configuration
├── package.json               # Scripts, dependencies, and metadata
├── tsconfig.json              # TypeScript root configuration
└── vite.config.ts             # Vite bundler & Vitest test runner configuration
```
