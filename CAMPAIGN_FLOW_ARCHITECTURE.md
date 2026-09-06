# Campaign & Game Flow Architecture

## Status

This document defines the architectural foundation for adding:

- real campaign levels
- story progression
- dialogue
- cutscenes
- persistent saves
- future branching/story flags

It is an architectural specification, not a requirement to implement all story features immediately.

`AGENTS.md` remains the repository-wide source of truth. This document is the source of truth specifically for campaign, story, progression, and save architecture.

---

# 1. Goal

Evolve Flappy Spaceman from a self-contained arcade loop into a game capable of supporting a structured campaign without coupling story progression to realtime gameplay systems.

The key architectural rule is:

> `GameFlow` decides what the player is doing. `GameRuntime` executes gameplay when the player is playing.

The runtime must no longer decide what level comes next.

---

# 2. Current Problem

The current architecture is strong for realtime gameplay but still assumes a linear arcade progression:

```text
GameRuntime
  ↓
level complete
  ↓
GameStateService.levelComplete()
  ↓
level + 1
  ↓
LEVELS[nextIndex]
  ↓
initialize next level
```

This creates problems once the game needs:

```text
Level 1
↓
Dialogue
↓
Cutscene
↓
Level 2
↓
Story event
↓
Level 3
↓
Ending
```

Story progression, campaign progression, gameplay state, and level configuration must become separate concepts.

---

# 3. Target Architecture

```text
React App
    │
    ▼
GameFlow
    │
    ├── CampaignDefinition
    ├── CampaignProgress
    ├── SaveService
    │
    └── current GamePhase
            │
            ├── title
            ├── dialogue        [future]
            ├── cutscene        [future]
            ├── playing
            ├── levelComplete
            ├── gameOver
            └── credits         [future]
                    │
                    ▼
               GameRuntime
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
     physics     rendering     input
     entities    spawning      audio
     effects     gameplay UI
```

`GameFlow` sits above `GameRuntime`.

It may start, reset, configure, pause, or leave a gameplay session, but it does not perform realtime simulation.

---

# 4. Ownership Boundaries

## GameFlow owns

- current high-level game phase
- active campaign
- active level ID
- campaign sequencing
- deciding what follows level completion
- campaign completion
- persistent progression updates
- loading and continuing saved progress
- future story/cutscene/dialogue sequencing

## GameRuntime owns

- active realtime gameplay
- physics
- spawning
- entities
- gameplay timers
- collisions
- score earned during the active run
- realtime rendering
- realtime effects
- gameplay HUD
- emitting gameplay outcomes

## GameStateService owns

Transient state for the currently active gameplay session.

Examples:

- score
- current orb count
- timer
- isGameOver
- isLevelComplete
- realtime gameplay flags

It must not own campaign sequencing.

## SaveService owns

Persistence only.

It does not decide:

- what level unlocks
- what phase comes next
- whether a story flag should be set
- what campaign rules mean

Those decisions belong to `GameFlow`.

---

# 5. Game Phases

Represent high-level flow as a discriminated union.

```ts
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

Dialogue, in-engine cutscenes, and video cutscenes are fully supported story phases.
`GameFlow` coordinates all transitions between gameplay and story phases.
Consult [STORY_ARCHITECTURE.md](./STORY_ARCHITECTURE.md) for canonical story system contracts.

---

# 6. Stable IDs

Campaign content must use stable string IDs, never array indexes as identity.

```ts
export type LevelId = string;
export type CampaignId = string;
```

Example:

```ts
'earth-orbit'
'lunar-crossing'
'mars-approach'
```

A save file must remain meaningful even if level ordering changes later.

Never persist:

```ts
currentLevel: 2
```

Prefer:

```ts
currentLevelId: 'lunar-crossing'
```

---

# 7. LevelDefinition & Authoring Architecture

Replace campaign-level dependence on the global indexed `LEVELS` array with explicit, data-driven level definitions.
Levels are authored purely through data without embedding Pixi objects or rendering code.

```ts
export type ObstacleGameplayDefinition =
  | {
      /** Disable obstacle spawning completely. Planet metadata is not required. */
      enabled: false;
      minPlanetRadius?: number;
      maxPlanetRadius?: number;
      secondaryPlanetChance?: number;
    }
  | {
      /** Enable obstacle spawning with explicit planet balance parameters. Defaults to true if omitted. */
      enabled?: true;
      minPlanetRadius: number;
      maxPlanetRadius: number;
      secondaryPlanetChance: number;
    };

export type MovementMode = 'flight' | 'ground';

export type MovementGameplayDefinition =
  | {
      /** Default corridor flight mode with unlimited thrust. */
      mode: 'flight';
    }
  | {
      /** Planetary ground traversal mode with jet jump capacity. */
      mode: 'ground';
      /**
       * Maximum jet-assisted thrust charges before requiring a landing recharge.
       * Fully supports multi-thrust (e.g. maxThrustCharges: 1 or 2 for double jump).
       */
      maxThrustCharges: number;
    };

export interface OrbGameplayDefinition {
  /** Explicit spawn probability in [0, 1]. */
  spawnChance: number;
  /** Optional independent spawn interval in milliseconds. If omitted, uses gameplay.spawnInterval. */
  spawnInterval?: number;
  /** Optional minimum Y coordinate for orb spawning. */
  minY?: number;
  /** Optional maximum Y coordinate for orb spawning. */
  maxY?: number;
}

export interface LevelGameplayDefinition {
  speeds: {
    planet: number;
    secondaryPlanet: number;
    orb: number;
  };

  spawnInterval: number;
  orbsRequired: number;
  timeLimit: number;

  obstacles: ObstacleGameplayDefinition;

  /** Single canonical orb configuration */
  orbs: OrbGameplayDefinition;

  /** Optional planetary ground terrain definition */
  ground?: GroundGameplayDefinition;

  /** Optional movement mode and thrust capacity configuration */
  movement?: MovementGameplayDefinition;

  /** Optional display metadata only - does NOT dictate gameplay difficulty */
  levelNumber?: number;
}

export interface GroundGameplayDefinition {
  enabled: boolean;
  height: number;
}

export interface LevelPresentationDefinition {
  environmentId: EnvironmentId;
  terrainId?: TerrainId;
  musicId?: MusicTrackId;
}

export interface LevelDefinition {
  id: LevelId;
  name: string;

  gameplay: LevelGameplayDefinition;

  presentation: LevelPresentationDefinition;

  intro?: StoryTransition;
  outro?: StoryTransition;

  nextLevelId?: LevelId;
}
```

### Key Authoring Principles:
1. **Separation of Presentation & Gameplay**:
   - `gameplay.ground` defines physical collision geometry (`height: number`), determining the walkable/landable surface Y (`GAME_HEIGHT - height`). It never dictates visual appearance.
   - `presentation.terrainId` references reusable visual terrain presets (e.g. `'alien-crust'`), determining surface strata, colors, crest lines, and decorative features. It never affects collision boundaries.
   - `presentation.environmentId` references reusable environment presets (`'deep-nebula'`, `'alien-surface'`, `'violet-reach'`, `'solar-storm'`) and `musicId` references audio tracks (`'weightless-space'`).
   - Runtime systems implement ground capability generically once. No level-specific branching is allowed.
   - No Pixi objects, shaders, or rendering loops exist in campaign definitions.
2. **Explicit Obstacle Difficulty**:
   - Obstacle size bounds (`minPlanetRadius`, `maxPlanetRadius`) and secondary obstacle spawn probability (`secondaryPlanetChance`) are declared explicitly. When disabled (`enabled: false`), planet dimensions are not required.
   - `levelNumber` is strictly display metadata; difficulty never relies on numeric order.
3. **Truthful Orb Spawning Semantics**:
   - Spawning probability is governed by `gameplay.orbs.spawnChance` (0.0 to 1.0) rather than misleading time frequencies. Single canonical `orbs` configuration replaces fragmented legacy fields.
4. **Campaign Validation (`validateCampaignDefinition`)**:
   - A centralized validator (`src/game/campaign/validateCampaign.ts`) ensures all links, environment IDs, terrain IDs, music IDs, and numeric bounds (including finite positive ground heights leaving a viable corridor) are sound before runtime execution.
5. **Direct Level Preview Tooling**:
   - Fast authoring QA is available at `/visual-preview.html` (supporting dropdown level selection and query parameter `?level=<levelId>`) without needing to play through the campaign.

Story transitions support all three story presentation modes:

```ts
export type StoryTransition =
  | { type: 'dialogue'; id: DialogueId }
  | { type: 'cutscene'; id: CutsceneId }
  | { type: 'video'; id: VideoCutsceneId };
```

Level definitions reference registered content by ID without embedding dialogue scripts, video DOM nodes, or Pixi objects directly. See [STORY_ARCHITECTURE.md](./STORY_ARCHITECTURE.md).

---

# 8. CampaignDefinition

A campaign describes playable content and sequencing.

```ts
export interface CampaignDefinition {
  id: CampaignId;
  name: string;

  startingLevelId: LevelId;

  levels: Record<LevelId, LevelDefinition>;

  ending?: StoryTransition;
}
```

Campaign definitions should be static game content.

They are not mutable runtime state.

The initial Flappy Spaceman campaign should reproduce the existing five-level experience using stable IDs.

Example:

```text
sector-01
sector-02
sector-03
sector-04
sector-05
```

Behavior and difficulty should remain unchanged during migration.

---

# 9. CampaignProgress

Persistent progression must be separate from `GameState`.

```ts
export interface CampaignProgress {
  schemaVersion: number;

  campaignId: CampaignId;

  currentLevelId: LevelId;

  unlockedLevelIds: LevelId[];
  completedLevelIds: LevelId[];

  highScores: Record<LevelId, number>;

  storyFlags: Record<string, boolean>;

  updatedAt: string;
}
```

Do not save transient runtime state such as:

- current entity positions
- active particles
- current collision state
- current spawn countdown
- Pixi objects
- RxJS objects
- active ticker state

The first save system is a checkpoint/progression save, not arbitrary mid-frame save-state serialization.

---

# 10. Save Schema Versioning

Persistent data must be versioned from day one.

```ts
schemaVersion: 1
```

The `SaveService` must validate loaded data.

If data is corrupt or from an unsupported version, fail safely and allow a new game rather than crashing the application.

Future migrations may convert older save schemas.

Do not build a generic migration framework yet.

---

# 11. SaveService

Expose a small persistence boundary.

```ts
export interface SaveService {
  load(): CampaignProgress | null;
  save(progress: CampaignProgress): void;
  clear(): void;
}
```

The first implementation may use browser `localStorage`, which also works for the current Electron renderer.

Keep the persistence mechanism behind the interface so a future implementation can use:

- Electron user-data files
- Steam Cloud
- another desktop persistence backend

`GameFlow` should depend on the interface, not directly on `localStorage`.

Save automatically at safe progression checkpoints, particularly:

- after completing a level
- after unlocking the next level
- after future story-state changes

Do not save every frame.

---

# 12. GameFlow

`GameFlow` is the campaign orchestrator.

Suggested responsibilities:

```ts
class GameFlow {
  startNewGame(): void;
  continueGame(): void;

  startLevel(levelId: LevelId): void;

  handleLevelCompleted(levelId: LevelId): void;
  handleGameOver(levelId: LevelId): void;

  retryLevel(): void;
  returnToTitle(): void;

  getPhase(): GamePhase;
  getPhase$(): Observable<GamePhase>;

  getProgress(): CampaignProgress;
}
```

Exact method names may change if the resulting API is simpler.

Behavior matters more than matching these signatures exactly.

---

# 13. Runtime Contract

`GameRuntime` must stop deciding campaign sequencing.

The runtime should accept the definition for the level it is asked to run.

Conceptually:

```ts
runtime.loadLevel(levelDefinition);
runtime.start();
```

When gameplay ends, the runtime reports an outcome.

Example domain events:

```ts
LEVEL_COMPLETED
GAME_OVER
```

`GameFlow` consumes those outcomes.

The flow becomes:

```text
GameFlow.startLevel('sector-01')
        ↓
GameRuntime loads sector-01 gameplay config
        ↓
player completes gameplay
        ↓
GameRuntime emits LEVEL_COMPLETED
        ↓
GameFlow handles completion
        ↓
updates CampaignProgress
        ↓
saves
        ↓
examines LevelDefinition
        ↓
next story/game phase
```

`GameRuntime` must not:

```ts
level + 1
```

or inspect campaign ordering to decide what happens next.

---

# 14. GameStateService Changes

`GameStateService` should remain a transient gameplay-state store.

Remove campaign progression decisions from methods such as `levelComplete()`.

It is acceptable for `GameState` to expose presentation information such as:

```ts
levelId
levelName
```

or another lightweight representation of the active gameplay level if useful.

However:

> The authoritative campaign level is owned by GameFlow.

Avoid keeping two independent level counters that can drift.

---

# 15. Story Architecture & Continuation Ownership

Story flow is owned entirely by `GameFlow`. Story renderers report completion, skip, or error back to `GameFlow`, which resolves the pending continuation.

```text
Level Intro:
GameFlow.startLevel('sector-02')
      ↓
intro exists & unseen?
  YES → beginStoryTransition(intro, { type: 'start-level', levelId: 'sector-02' })
  NO  → startGameplay('sector-02')

Level Outro:
LEVEL_COMPLETED reported
      ↓
commit progression checkpoint & persist save
      ↓
outro exists & unseen?
  YES → beginStoryTransition(outro, nextContinuation)
  NO  → advance to nextContinuation (next level / campaign ending / credits)

Campaign Ending:
final level completed
      ↓
campaign.ending exists & unseen?
  YES → beginStoryTransition(ending, { type: 'credits' })
  NO  → setPhase({ type: 'credits' })
```

### Story Continuations:
`GameFlow` tracks pending continuations using an explicit discriminated union:
- `{ type: 'start-level'; levelId: LevelId }`
- `{ type: 'story'; transition: StoryTransition; continuation: StoryContinuation }`
- `{ type: 'credits' }`
- `{ type: 'title' }`

### Story Flags & Seen-State:
- `seen:<levelId>:intro` ensures intros play only on first arrival, not on retry.
- `seen:<levelId>:outro` ensures completed level outros are not replayed on retry.
- `seen:campaign:ending` tracks finale viewing.
- Save data is always committed before entering outro or ending transitions.

---

# 16. Story Registries & Renderers

Story content is authored in dedicated registries:
- **Dialogue**: `src/game/story/dialogue/` (`DialogueOverlay.tsx` in React)
- **In-Engine Cutscenes**: `src/game/story/cutscenes/` (`CutsceneRunner.ts` in simulation time)
- **Video Cutscenes**: `src/game/story/video/` (`VideoCutsceneOverlay.tsx` in native HTML `<video>`)

Consult [STORY_ARCHITECTURE.md](./STORY_ARCHITECTURE.md) for full contracts, step schemas, error handling, audio behavior, and preview tooling.

---

# 17. React / Pixi Boundary

Existing repository rules remain unchanged.

React should eventually own:

- title/menu screens
- dialogue UI
- choices
- save-selection UI
- pause menus
- story overlays

Pixi should own:

- gameplay world
- realtime entities
- cinematic world movement
- particles
- world camera movement
- visual effects

Story orchestration belongs to `GameFlow`, not React or Pixi.

---

# 18. Suggested Directory Structure

Keep the structure lightweight.

```text
src/game/
├── campaign/
│   ├── GameFlow.ts
│   ├── GameFlow.test.ts
│   ├── campaignTypes.ts
│   ├── campaign.ts
│   ├── campaign.test.ts
│   ├── CampaignProgress.ts
│   └── save/
│       ├── SaveService.ts
│       ├── LocalStorageSaveService.ts
│       └── LocalStorageSaveService.test.ts
│
├── GameRuntime.ts
├── gameStateService.ts
├── eventBus.ts
└── ...
```

Do not create a generic engine directory merely for campaign abstractions.

---

# 19. Initial Campaign Migration

The first campaign definition should reproduce the current five levels.

Migration must preserve:

- current speeds
- spawn intervals
- orb requirements
- time limits
- scoring behavior
- progression order
- game-over behavior
- warp presentation
- visual effects
- audio behavior

This phase is architectural, not a gameplay rebalance.

---

# 20. New Game and Continue

The architecture must support both.

## New Game

```text
clear/reset campaign progress
↓
create initial CampaignProgress
↓
startingLevelId
↓
playing
```

## Continue

```text
load persisted CampaignProgress
↓
validate campaign + level ID
↓
resume from current checkpoint
```

If no valid save exists, Continue should not be offered or should behave safely.

---

# 21. Retry Semantics

Game over does not automatically advance campaign progression.

Retrying should reload the current campaign level.

A failed run must not mark the level complete.

---

# 22. Completion Semantics

When a level is successfully completed:

1. mark it completed
2. update its high score when applicable
3. determine its next level/story transition
4. unlock the next level when applicable
5. update current checkpoint
6. persist campaign progress
7. transition to the appropriate next `GamePhase`

Do not let multiple subscribers independently mutate progress for the same completion event.

`GameFlow` is the single owner.

---

# 23. Campaign Completion

When there is no next level:

```text
GameFlow
  ↓
ending transition if defined
  ↓
credits
```

Until credits/ending systems exist, the first implementation may use a simple campaign-complete phase or existing completion presentation.

Do not route a finished campaign through `GAME_OVER`.

---

# 24. Dependency Direction

Correct:

```text
GameFlow → GameRuntime
GameFlow → CampaignDefinition
GameFlow → SaveService
GameRuntime → gameplay systems
```

Avoid:

```text
GameRuntime → GameFlow
PhysicsSystem → CampaignProgress
Entity → SaveService
React component → mutate campaign save directly
```

Lower-level gameplay systems must remain unaware of campaign progression.

---

# 25. Explicit Non-Goals

Do not introduce during this phase:

- XState
- Redux
- Zustand
- ECS
- generic scene framework
- quest engine
- branching narrative engine
- dialogue engine
- cutscene engine
- arbitrary mid-level save states
- cloud synchronization
- Steamworks integration
- shared npm game engine
- monorepo conversion

Build only the minimum architecture justified by the current game.

---

# 26. Testing Requirements

Add behavioral tests covering at minimum:

### GameFlow

- starts at title
- new game selects configured starting level
- starts a specific level
- level completion updates progress exactly once
- completion advances according to campaign definition
- game over does not advance progression
- retry reloads current level
- final level completes campaign
- invalid level IDs fail safely

### Saving

- valid progress round-trips
- missing save returns null
- corrupt save fails safely
- unsupported schema version fails safely
- clearing save works

### Runtime integration

- runtime receives the selected `LevelDefinition`
- runtime no longer chooses the next campaign level
- current five levels preserve existing gameplay configuration
- existing level-complete effects still occur
- reset/retry remains deterministic

### Isolation

Two independent GameFlow/runtime instances must not share mutable campaign state.

---

# 27. Migration Strategy

Implement incrementally.

## Phase A

Introduce types and campaign data:

- `LevelId`
- `LevelDefinition`
- `CampaignDefinition`
- current five-level campaign

No behavior change.

## Phase B

Allow `GameRuntime` to load explicit `LevelDefinition`.

Preserve existing behavior.

## Phase C

Introduce `GameFlow`.

Move next-level sequencing out of `GameRuntime`.

## Phase D

Introduce `CampaignProgress` and `SaveService`.

Add New Game / Continue architecture.

## Phase E

Remove obsolete index-based campaign ownership and dead compatibility paths.

Only after tests prove equivalent behavior.

---

# 28. Acceptance Criteria

The architecture migration is complete when:

- `GameFlow` is the single owner of high-level campaign sequencing.
- `GameRuntime` no longer chooses the next level.
- Level identity uses stable string IDs.
- Current levels are represented as `LevelDefinition`s.
- Current five-level gameplay behavior is preserved.
- `GameStateService` no longer owns campaign progression.
- `CampaignProgress` is distinct from transient `GameState`.
- Save data is versioned.
- Save persistence is accessed through `SaveService`.
- New Game and Continue are architecturally supported.
- Dialogue and cutscene phases have clean extension points but are not implemented.
- No new generic state-machine or game-engine framework was added.
- Existing Pixi/runtime lifecycle guarantees remain intact.
- `npm run verify` passes.
- `npm run test:coverage` passes.
- `npm run build` passes.

---

# 29. Agent Rule

Any future work involving:

- campaign sequencing
- level progression
- checkpoints
- story phases
- dialogue flow
- cutscene flow
- persistent campaign state

must follow this specification unless the specification is intentionally updated first.
### Ground world traversal

`gameplay.world: { width: 2400, traversal: 'loop' }` defines a repeating terrain length in game pixels. Width must be finite and at least `GAME_WIDTH` (800). World traversal requires ground movement and enabled ground. Omit `traversal` or use `'bounded'` to clamp player and camera to the authored width.

Loop mode keeps world coordinates continuous in both directions, repeats terrain every `width` pixels, and maintains a viewport-filled sky. It never teleports the astronaut or camera at a seam. Scenario triggers retain their authored world positions; they are not duplicated each lap. Scenario camera entry and exit use simulation-time speed limits. Dynamic pickups and obstacles spawn ahead of travel and are discarded beyond two viewport widths from the player. Reset and level transitions clear traversal, effects, and camera state.

Use the visual preview's Traverse left/right controls to simulate one screen of movement, and Traversal thrust to inspect effects without resetting position.
