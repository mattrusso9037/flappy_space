# AI Agent Guardrails & Development Guide

Welcome to **Flappy Spaceman** (`flappy_space`), an arcade game built with React 19, Pixi.js v8, Electron, TypeScript, and Vite.

This document establishes the mandatory guardrails, architectural standards, and validation workflows that **all AI models and contributors must strictly adhere to**.

---

## 1. The Universal Verification Command

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

## 2. Essential Development Commands

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

## 3. Architecture & Separation of Concerns (ECS Pattern)

The game engine follows an **Entity-Component-System (ECS)** architecture with an event-driven messaging layer:

### A. Entities (`src/game/entities/`)
- Game entities represent state and display objects (`Astronaut`, `Planet`, `Orb`, `Star`).
- **RULE**: Entity classes must only store data, state, and visual representations. Complex business logic or direct system interactions DO NOT belong inside entity classes.

### B. Systems (`src/game/systems/`)
- Systems contain the processing logic:
  - `physicsSystem.ts`: Movement, velocity, gravity, boundary checks, and collision detection.
  - `spawningSystem.ts`: Obstacle and orb generation, difficulty scaling, intervals.
  - `renderSystem.ts`: Visual rendering, background star parallax, debug hitbox overlays.
  - `audioSystem.ts`: Sound effects and background music.
  - `inputSystem.ts`: Processing raw inputs from keyboard and touch into game actions.
  - `uiSystem.ts`: Particle effects, floating scores, HUD animations.
  - `entitySystem.ts`: Entity lifecycle tracking, addition, and cleanup.
- **RULE**: Systems must remain focused and modular. Inter-system communication must happen via the `EventBus`.

### C. EventBus (`src/game/eventBus.ts`)
- Communication between decoupled systems flows through `eventBus`:
  ```typescript
  // Emitting an event
  eventBus.emit(GameEvent.SCORE_CHANGED, newScore);

  // Subscribing to an event
  const sub = eventBus.on<number>(GameEvent.SCORE_CHANGED).subscribe(score => { ... });
  // Always clean up subscriptions when disposing:
  sub.unsubscribe();
  ```
- **RULE**: When adding new events, always register them in the `GameEvent` enum in `src/game/eventBus.ts`.

### D. Game State Management (`src/game/gameStateService.ts`)
- `gameStateService` is the **single source of truth** for all global gameplay data (score, level, warps, time, orbs collected, isGameOver, isStarted).
- **RULE**: Do not duplicate or store divergent game state in React components or systems. Systems read state via `gameStateService.getState()` or observe via `gameStateService.getState$()`.

---

## 4. Code Quality & Guardrail Rules

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
3. **Headless & CI Safe**:
   - Pixi.js runs in both the browser, Electron, and headless test runners (Node.js/JSDOM).
   - In `src/test/setup.ts`, Canvas 2D contexts are mocked so headless tests execute instantly without needing a physical GPU or display server.
4. **Mandatory Tests for New Features**:
   - Whenever adding a new entity, helper function, collision math, or system:
     - Always create or update the corresponding `*.test.ts` file in the same directory.
     - Verify tests pass with `npm test`.

---

## 5. File & Directory Layout

```
flappy_space/
├── .cursor/rules/             # Cursor-specific rule configurations
├── .github/workflows/         # GitHub Actions CI automation
├── electron/                  # Electron main & preload scripts
├── public/                    # Static assets (sprites, icons)
├── src/
│   ├── components/            # React UI components (Scoreboard, Controls, etc.)
│   ├── controllers/           # Orchestration layer (GameController)
│   ├── game/                  # Core game engine
│   │   ├── config.ts          # Game constants, physics values, level configs
│   │   ├── eventBus.ts        # Reactive EventBus (RxJS)
│   │   ├── gameStateService.ts# Centralized state management
│   │   ├── inputManager.ts    # Low-level keyboard and touch events
│   │   ├── entities/          # ECS Entities (Astronaut, Planet, Orb, Star)
│   │   └── systems/           # ECS Systems (Physics, Render, Spawning, Audio, UI)
│   ├── test/                  # Test setup and Canvas mocks
│   └── utils/                 # Logger and diagnostic utilities
├── AGENTS.md                  # This AI Agent Guardrails Guide
├── eslint.config.js           # ESLint configuration
├── package.json               # Scripts, dependencies, and metadata
├── tsconfig.json              # TypeScript root configuration
└── vite.config.ts             # Vite bundler & Vitest test runner configuration
```
