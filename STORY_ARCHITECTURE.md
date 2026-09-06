# Story & Cutscene Architecture

## Status & Authority

This document is the canonical source of truth for:
- dialogue sequences
- story content registries
- story sequencing and transitions
- in-engine cutscenes (PixiJS)
- pre-rendered video cutscenes (native HTML `<video>`)
- story flags and persistent progression
- skip semantics
- continuation semantics

> **Universal Source of Truth**: [AGENTS.md](./AGENTS.md) remains the repository-wide source of truth for development guardrails, verification gates, and code standards. This document specializes and extends those rules for story and cinematic features.

---

## 1. Core Architectural Principle: GameFlow Decides What Happens Next

The cardinal rule of the story system is:

> **Story renderers report what occurred. `GameFlow` decides what happens next.**

Story renderers (`DialogueOverlay`, `CutsceneRunner`, `VideoCutsceneOverlay`) may report:
- `completed`
- `skipped`
- `choice made`
- `flag changed`
- `playback error`

They must **never** decide:
- start `sector-03`
- transition to credits
- advance campaign levels
- modify persistent save data directly

### Execution Flow:
```text
Level completed or level intro triggered
      ↓
GameFlow resolves StoryTransition & sets pending StoryContinuation
      ↓
GameFlow transitions to story GamePhase ('dialogue' | 'cutscene' | 'video')
      ↓
Story renderer displays presentation & captures user input
      ↓
Story renderer reports completion/skip (idempotently)
      ↓
GameFlow.completeStoryPhase()
      ↓
GameFlow executes pending continuation (start-level | next story phase | credits | title)
```

### Unified Transition Concept:
An in-engine cutscene and an MP4 video cutscene are treated as **two renderers for the same `StoryTransition` concept**. Campaign data remains agnostic to how cinematic content is produced, preventing the video path from becoming a special-case navigation system.

---

## 2. Type Contracts

### A. StoryTransition
Story transitions are declared in campaign and level definitions using stable string identifiers:

```typescript
export type DialogueId = string;
export type CutsceneId = string;
export type VideoCutsceneId = string;

export type StoryTransition =
  | { type: 'dialogue'; id: DialogueId }
  | { type: 'cutscene'; id: CutsceneId }
  | { type: 'video'; id: VideoCutsceneId };
```

Levels never embed dialogue lines, Pixi display objects, or video elements directly. Instead, levels reference registered IDs validated at build and test time.

### B. GamePhase
High-level state is represented as an explicit discriminated union:

```typescript
export type GamePhase =
  | { type: 'title' }
  | { type: 'playing'; levelId: LevelId }
  | { type: 'levelComplete'; levelId: LevelId }
  | { type: 'gameOver'; levelId: LevelId }
  | { type: 'dialogue'; dialogueId: DialogueId }
  | { type: 'cutscene'; cutsceneId: CutsceneId }
  | { type: 'video'; videoId: VideoCutsceneId }
  | { type: 'credits' };
```

### C. StoryContinuation
`GameFlow` tracks what must follow once a story phase finishes:

```typescript
export type StoryContinuation =
  | { type: 'start-level'; levelId: LevelId }
  | { type: 'story'; transition: StoryTransition; continuation: StoryContinuation }
  | { type: 'credits' }
  | { type: 'title' };
```

When a story phase completes, `GameFlow.completeStoryPhase()` resolves the pending continuation.

---

## 3. Story Sequencing in the Campaign

### A. Level Intro Transitions
When `GameFlow.startLevel(levelId)` is called:
1. Check if `level.intro` exists.
2. Check if the intro has already been seen via persistent story flag `seen:<levelId>:intro`.
3. **If intro exists and is unseen**:
   - Set pending continuation: `{ type: 'start-level', levelId }`.
   - Set story flag: `setStoryFlag('seen:' + levelId + ':intro', true)`.
   - Transition to story phase via `beginStoryTransition(level.intro, continuation)`.
   - Note: The intro does NOT mark the level complete.
4. **If intro does not exist or was already seen**:
   - Start gameplay immediately (`setPhase({ type: 'playing', levelId })` and start runtime).

### B. Retry & Checkpoint Rules
- **Retry after Game Over**: Calls `retryLevel()`, which directly starts gameplay without replaying the intro (`skipIntro: true`).
- **Continue from Checkpoint**: Resumes at the current level checkpoint. Intros already marked `seen` are not replayed.

### C. Level Outro Transitions
When `GameRuntime` reports `LEVEL_COMPLETED`:
1. Commit progress first: mark `levelId` in `completedLevelIds`, record high score, unlock `nextLevelId` (if any), update `currentLevelId`, and persist save data immediately.
   *(A crash or interruption during an outro must never cause the player to lose a completed level).*
2. Check if `level.outro` exists and is unseen (`seen:<levelId>:outro`).
3. **If outro exists and is unseen**:
   - Set story flag: `setStoryFlag('seen:' + levelId + ':outro', true)`.
   - Define continuation:
     - If `nextLevelId` exists: `{ type: 'start-level', levelId: nextLevelId }`.
     - Else if `campaign.ending` exists: `{ type: 'story', transition: campaign.ending, continuation: { type: 'credits' } }`.
     - Else: `{ type: 'credits' }`.
   - Begin story transition: `beginStoryTransition(level.outro, continuation)`.
4. **If no outro exists or was already seen**:
   - Advance directly to the next level, campaign ending, or credits.

### D. Campaign Ending
When the final level is completed and has no `nextLevelId`:
1. If `campaign.ending` exists and `!hasStoryFlag('seen:campaign:ending')`:
   - Set story flag: `setStoryFlag('seen:campaign:ending', true)`.
   - Begin transition with continuation `{ type: 'credits' }`.
2. Else, transition directly to `credits`.

---

## 4. Dialogue System

### A. Data Architecture
Dialogue definitions are registered centrally in `src/game/story/dialogue/dialogues.ts`:

```typescript
export interface DialogueLine {
  speaker: string;
  text: string;
  portraitId?: string;
}

export interface DialogueDefinition {
  id: DialogueId;
  lines: DialogueLine[];
}
```

### B. Presentation Boundary
- **React owns Dialogue Presentation**: Handled by `DialogueOverlay.tsx`.
- **Styling**: Strictly adheres to the *Mission-Control Avionics × Holographic Spacecraft HUD* design tokens (`--space-void`, `--space-hull`, `--space-cyan`, `--font-display`, `--font-telemetry`).
- **Input Controls**:
  - `Space` / `Enter` / `Click` / `Tap`: Advance to next dialogue line.
  - `Escape` / `Skip Button`: Skip entire dialogue definition.
- **Input Isolation**: While `DialogueOverlay` is active, keyboard and pointer events are captured and stopped from propagating to the gameplay canvas to prevent accidental astronaut thruster activation.
- **Completion**: When the final line advances or skip is triggered, the overlay invokes `onComplete()`, notifying `GameFlow.completeStoryPhase()`.

---

## 5. In-Engine Cutscenes (PixiJS)

### A. Data Architecture
Cutscenes are defined declaratively as a sequence of discrete steps in `src/game/story/cutscenes/cutscenes.ts`:

```typescript
export type CutsceneStep =
  | { type: 'wait'; duration: number }
  | { type: 'dialogue'; dialogueId: DialogueId }
  | { type: 'fade'; direction: 'in' | 'out'; duration: number }
  | { type: 'camera'; action: { x?: number; y?: number; zoom?: number }; duration: number }
  | { type: 'music'; musicId: MusicTrackId };

export interface CutsceneDefinition {
  id: CutsceneId;
  steps: CutsceneStep[];
}
```

### Scene actors and keyframes

`{ type: 'scene', duration, scene: { actors } }` stages a cinematic world using
`CinematicSceneRenderer`, owned by `RenderSystem` under `worldCamera` (z: 15).
Actors support `ship`, `pilot`, `wormhole`, `repair-sparks`, and `tether` visuals.
The pilot reuses the existing static astronaut texture; no gameplay entity is moved.

Each actor has a unique `id`, a `kind`, and ordered `keyframes`. Every keyframe
specifies `time` (seconds), `x`, `y` (game pixels), uniform `scale`, `rotation`
(radians), and `alpha`. Values interpolate linearly between frames and clamp at
both ends. Use multiple frames to author acceleration or a curved trajectory.
Frame times must increase strictly within the scene duration. All values must be
finite, scale nonnegative, and alpha within 0..1. `validateScene` enforces these
contracts through `validateCutsceneDefinition`.

The scene remains visible through subsequent fade/camera/dialogue steps until a
new scene replaces it or the cutscene ends. Completion, skip, reset, phase cleanup,
and disposal remove the actors without destroying shared textures. The gameplay
HUD and effects are hidden while a runner is attached and restored when detached.
Attaching a runner releases the story-transition gameplay pause; the runtime's
cutscene branch prevents physics, spawning, and gameplay clocks from advancing.
Explicit runtime pause still pauses presentation. The preview uses this same
runtime ticker, with no additional cinematic ticker.

`opening-spacewalk` is Sector 01's intro: hull repair, wormhole formation, pilot
capture, then a fade into gameplay through the existing GameFlow continuation.
Retries and previously seen intros follow the standard story flags below.

### B. Simulation Time Rule
> **All in-engine cutscene timing MUST advance through deterministic simulation time:**
> `CutsceneRunner.update(deltaSeconds)`
>
> NEVER use `setTimeout`, `setInterval`, `requestAnimationFrame`, or an additional `PIXI.Ticker`.

When the game is paused, `deltaSeconds` is zeroed or update calls stop, guaranteeing perfectly deterministic pause/resume behavior.

### C. Nested Dialogue in Cutscenes
When a cutscene encounters a step of `{ type: 'dialogue', dialogueId }`:
1. The cutscene runner pauses simulation advancement for that step.
2. The UI displays `DialogueOverlay` for `dialogueId`.
3. When dialogue completes, the cutscene runner resumes and advances to the subsequent step.
4. When all steps finish, the cutscene runner reports completion back to `GameFlow`.

### D. Visual Rendering Boundary
- **PixiJS owns**: World presentation, camera/world pan, entity motion, starfield warp/parallax, canvas fades, and particle effects.
- **React owns**: Subtitles, dialogue overlay, skip button, and non-realtime story HUD chrome.
- **Locked Astronaut Asset Rule**: The locked astronaut PNG constraint (`public/assets/astro-sprite.png`) strictly applies to in-engine cutscenes.

### E. Cinematic Camera Container Architecture

Camera steps transform only the world-space `worldCamera` container in `RenderSystem`. The following containers sit **inside** `worldCamera` and are affected by camera transforms:

```
app.stage
  ├── worldCamera             ← camera transforms applied here
  │     ├── atmosphere        (nebula clouds + background rect, z: -30)
  │     ├── starLayer         (EntitySystem stars, z: -20)
  │     ├── worldLayer        (EntitySystem planets/orbs, z: 0)
  │     └── pilotLayer        (EntitySystem astronaut, z: 10)
  ├── effects container       (UISystem FlightEffects, z: 20 — viewport-space, OUTSIDE camera)
  ├── HUD container           (UISystem score/UI, z: 30 — viewport-space, OUTSIDE camera)
  ├── debugGraphics           (RenderSystem, z: 40 — OUTSIDE camera)
  └── fadeGraphics            (RenderSystem, z: 35 — full-screen fade, OUTSIDE camera)
```

> **Rule**: Never transform `app.stage` directly from a cutscene step. This would also move the HUD, debug graphics, and fade overlay.

### F. Camera Semantics

```
x     — Horizontal offset in game pixels.
        Positive x shifts the world right (camera pans left).
        Negative x shifts the world left (camera pans right).
y     — Vertical offset in game pixels.
        Positive y shifts the world down (camera pans up).
        Negative y shifts the world up (camera pans down).
zoom  — Scale factor applied from the canvas center (GAME_WIDTH/2, GAME_HEIGHT/2).
        zoom: 1.0 → neutral. zoom > 1 → zoom in. zoom < 1 → zoom out.
```

**Defaults**: Missing `x`, `y`, or `zoom` in a `camera` step default to `0`, `0`, `1` respectively.

**Sequential interpolation**: Each camera step interpolates **from the camera state at the start of that step** — not always from neutral. A sequence of `camera A → camera B` transitions smoothly from A to B.

**Neutral authoring convention**: To return the camera to neutral after a pan/zoom, add a final camera step with `{ x: 0, y: 0, zoom: 1 }`.

### G. Camera Cleanup Rules

- A **completed** cutscene must fire `onCameraChange({ x: 0, y: 0, zoom: 1 })` at or before completion.
- A **skipped** cutscene must also fire `onCameraChange({ x: 0, y: 0, zoom: 1 })` on skip.
- `GameDisplay.tsx` calls `runtime.systems.rendering.resetCamera()` in the cutscene `useEffect` cleanup function (runs on unmount and phase change), ensuring no camera state leaks across phase transitions.
- `GameRuntime.reset()` calls `rendering.reset()` which calls `resetCamera()` — no stale camera after level load.

---

## 6. Pre-Rendered Video Cutscenes

### A. Data Architecture
Video definitions are registered in `src/game/story/video/videoCutscenes.ts`:

```typescript
export interface VideoCutsceneDefinition {
  id: VideoCutsceneId;
  src: string;
  poster?: string;
  skippable?: boolean;
  preload?: 'metadata' | 'auto' | 'none';
}
```

### B. Asset Convention & Production Encoding
- Video files reside in `/public/cutscenes/` (e.g. `public/cutscenes/opening-transmission.mp4`).
- **Production Standard**: MP4 container, H.264 video codec, AAC audio codec.
- Packaged Electron builds and browser deployments must support this standard.
- Absence of a physical video file must never break compilation or test suites.

### C. Presentation & Error Recovery
- **Component**: `VideoCutsceneOverlay.tsx` uses native HTML5 `<video>`.
- **Styling**: Letterboxed/pillarboxed within the game display container (`object-fit: contain`) with mission-control avionics telemetry frame and minimalist skip button.
- **Audio Ducking**: When video begins playback, background game music is paused; when video ends or is skipped, music state is restored. User mute settings are preserved.
- **Error Handling**: If a video fails to load or play (e.g. missing asset or decode error), a warning is logged via `getLogger('VideoCutsceneOverlay')`, an in-engine error notice with a safe **Skip / Continue** affordance is presented, and the player is never trapped.

---

## 7. Story Flags & Persistence

Persistent story state uses `storyFlags: Record<string, boolean>` inside `CampaignProgress`.

### API:
- `gameFlow.hasStoryFlag(flag: string): boolean`
- `gameFlow.setStoryFlag(flag: string, value: boolean): void`

Setting a flag immediately persists to `SaveService` and notifies subscribers through `gameFlow.getProgress$()`.

### Standard Flag Conventions:
- `seen:<levelId>:intro` — Tracks whether a level's intro sequence has been played or skipped.
- `seen:<levelId>:outro` — Tracks whether a level's outro sequence has been played or skipped.
- `seen:campaign:ending` — Tracks whether the campaign finale cinematic has concluded.

---

## 8. Skip Semantics & Idempotency

All story presentations provide skip functionality:
- **Dialogue**: Skip advances immediately past all lines to completion.
- **In-Engine Cutscene**: Skip instantly resets transforms, cancels active steps, and fires completion.
- **Video Cutscene**: Skip pauses/clears video playback and fires completion.

### Idempotency Guarantee:
A race between natural conclusion (e.g. `<video>` `ended` event) and user skip (pressing Escape or clicking Skip) must **never** advance `GameFlow` twice or corrupt the continuation stack. `GameFlow.completeStoryPhase()` is strictly idempotent.

---

## 9. Content Validation

`validateCampaignDefinition` in `src/game/campaign/validateCampaign.ts` validates all story references:
- If `level.intro` is defined, its type must be `'dialogue' | 'cutscene' | 'video'`, and its `id` must exist in the respective registry.
- If `level.outro` is defined, its type must be `'dialogue' | 'cutscene' | 'video'`, and its `id` must exist in the respective registry.
- If `campaign.ending` is defined, its type must be `'dialogue' | 'cutscene' | 'video'`, and its `id` must exist in the respective registry.
- Any broken reference produces an authoring validation error that fails CI and `npm run verify`.

---

## 10. Developer & Authoring Preview Tooling

### `story-preview.html` — Story QA Tool

Fast story content QA is provided at `/story-preview.html` (dev server only).
It uses real production registries and real renderers — no mock implementations.

**URL**: `http://localhost:5173/flappy_space/story-preview.html`

**Query parameters for auto-play:**

| Parameter | Example | Effect |
|---|---|---|
| `?dialogue=<id>` | `?dialogue=unknown-signal` | Directly opens the named dialogue |
| `?cutscene=<id>` | `?cutscene=first-signal` | Directly runs the named in-engine cutscene |
| `?video=<id>` | `?video=opening-transmission` | Directly plays the named video cutscene |

**Invalid IDs** display a dev-facing error panel with the offending ID — no crash.

**Features:**
- TYPE dropdown (Dialogue / In-Engine Cutscene / Video)
- CONTENT dropdown (populated from production registries)
- PLAY / RESTART / SKIP (ESC) buttons
- Embedded dialogue inside cutscenes works exactly as in-game
- Camera and fade transforms are real `RenderSystem` calls
- `Escape` key skips

### `visual-preview.html` — Gameplay QA Tool

Interactive level and gameplay state preview at `/visual-preview.html`.
Supports `?level=<levelId>` query parameter for direct level load.
