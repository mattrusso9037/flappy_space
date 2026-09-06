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

Fast story authoring QA is provided via `/visual-preview.html`:
- Interactive dropdowns to select and test any registered Dialogue, In-Engine Cutscene, or Video Cutscene directly.
- Direct URL query parameters:
  - `?dialogue=<dialogueId>`
  - `?cutscene=<cutsceneId>`
  - `?video=<videoId>`
  - `?level=<levelId>`
- Uses real production registries and components to ensure fidelity between preview and gameplay.
