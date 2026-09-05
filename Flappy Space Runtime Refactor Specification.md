# Flappy Space Runtime Refactor Specification

## 1. Objective

Refactor Flappy Space from a functional but globally coupled Pixi.js game into a clean, runtime-scoped architecture that:

- preserves current gameplay
- preserves the useful behavioral contracts established by the new test suite
- makes lifecycle ownership explicit
- removes hidden singleton dependencies
- improves testability
- makes game rules have clear owners
- provides a practical seed for additional lightweight Pixi.js games
- avoids building a custom general-purpose game engine

This is a refactor, not a rewrite.

The existing React + Pixi.js split is fundamentally sound and should remain.

The primary problem is not the rendering technology or overall system organization. The problem is ownership and coupling.

---

# 2. Verified Baseline

The current repository has a working automated guardrail layer.

The current baseline includes:

- TypeScript build validation
- ESLint
- Vitest
- Testing Library
- V8 coverage generation
- production build validation
- CI on Node 20 and Node 22

The primary local verification command is:

```bash
npm run verify
```

CI additionally runs:

```bash
npm run test:coverage
npm run build
```

Coverage is currently generated but no minimum coverage thresholds are enforced.

Do not add arbitrary coverage thresholds before understanding the current coverage distribution.

The newly added tests primarily cover:

- React presentation components
- GameStateService state transitions
- EventBus behavior
- Astronaut behavior
- Orb behavior
- collision geometry utilities
- Scoreboard rendering

They provide a strong starting point, but important architectural seams remain under-tested:

- GameController lifecycle
- system initialization/disposal
- duplicate EventBus subscriptions
- GameDisplay mount/unmount/remount
- InputSystem lifecycle
- UISystem lifecycle
- PhysicsSystem orchestration
- SpawningSystem behavior
- cross-system scoring
- delayed spawning/reset behavior
- runtime isolation

Those seams should be characterized before or during the corresponding refactor phase.

---

# 3. Core Architectural Principles

## React owns the application shell

React should own:

- application mounting
- game container lifecycle
- loading states
- error states
- menus
- routing
- non-realtime UI
- future game selection/navigation

React should not own the realtime simulation.

Do not push per-frame entity state through React.

Do not turn gameplay state into React component state unless React specifically needs that value for presentation.

---

## Pixi.js owns realtime rendering

Pixi.js should continue to own:

- the canvas
- rendering
- sprites
- graphics
- particles
- realtime animation
- the ticker

Keep the manual `PIXI.Application` lifecycle.

Do not migrate to `@pixi/react`.

If `@pixi/react` remains unused after the refactor, remove the dependency.

---

## Do not build a custom ECS

The current repository documentation describes the architecture as ECS, but the implementation is not a traditional Entity Component System.

That is fine.

Do not introduce a component framework, query engine, archetype system, or generic ECS abstraction merely to make the terminology accurate.

The desired model is simpler:

```text
Runtime
  owns Systems
  owns State
  owns Events
  owns lifecycle

Systems
  coordinate gameplay behavior

Entities
  represent realtime game objects

Pixi
  renders them
```

Update documentation to describe the architecture accurately.

---

# 4. Behavioral Test Policy

The new tests are important, but not every existing assertion is an immutable product contract.

Classify tests into two categories before modifying them.

## Behavioral contracts

These should generally survive unchanged or with only setup changes.

Examples:

### Game state

Preserve:

- correct initial state
- game start transitions
- score accumulation behavior, except the duplicate orb-scoring bug described later
- level transitions
- warps incrementing
- orb progress resetting between levels
- score persistence across levels
- total elapsed `time` persistence across levels
- timeRemaining reset according to level config
- game-over transitions
- debug mode behavior
- selectors suppressing duplicate values

### Event behavior

Preserve:

- subscriber receives matching events
- unrelated event types remain isolated
- multiple subscribers work
- unsubscribe works
- payloads are delivered correctly

### Astronaut

Preserve:

- starting position
- gravity
- velocity cap
- flap behavior
- directional movement
- boundaries
- death behavior
- reset behavior
- collision hitbox behavior

### Orb

Preserve:

- movement
- collected state
- collision behavior
- visual hiding on collection
- offscreen behavior

### Geometry

Preserve all current intersection semantics unless a clearly documented bug is discovered.

### Scoreboard/UI

Preserve current visible formatting and component behavior unless intentionally redesigned separately.

---

## Implementation-specific tests

These may and should change when their implementation assumption is being deliberately removed.

Examples:

### Singleton identity

Tests asserting:

```ts
EventBus.getInstance() === EventBus.getInstance()
```

and:

```ts
GameStateService.getInstance() === GameStateService.getInstance()
```

are not product behavior.

Replace them with runtime isolation tests.

For example:

```ts
const gameA = createGameRuntime(...)
const gameB = createGameRuntime(...)

gameA.events.emit(...)

expect(gameB...).not.toHaveBeenAffected()
```

### Entity EventBus subscriptions

Astronaut currently responds directly to global EventBus actions.

The behavior "jump input makes astronaut flap" is important.

The implementation "Astronaut subscribes globally to EventBus" is not.

Move that orchestration into an appropriate system and rewrite the test at that layer.

The same applies to direct event emission from Orb.

---

# 5. Add Characterization Tests Before Structural Changes

Before replacing singleton infrastructure, add tests around the seams that are currently risky.

## Required lifecycle tests

### GameController

Verify:

- initialize is idempotent
- the Pixi ticker receives one game-loop callback
- dispose removes the callback
- event listeners are removed during dispose
- initialize/dispose/initialize does not duplicate behavior

### InputSystem

Verify:

- initialize registers listeners once
- dispose removes them
- initialize after dispose works
- one keypress results in one gameplay action

### UISystem

Verify:

- subscriptions are registered during initialization
- dispose unsubscribes them
- initialize after dispose restores subscriptions
- state changes update the scoreboard exactly once

### GameDisplay

Verify where practical:

- mounting initializes one Pixi application/runtime
- unmount disposes it
- remounting does not accumulate listeners or ticker callbacks

Do not over-invest in brittle DOM/Pixi mocks if the same ownership can be verified at the runtime boundary.

---

# 6. Introduce Explicit Runtime Ownership

Create a runtime object representing one mounted game session.

Suggested location:

```text
src/engine/GameRuntime.ts
```

Its purpose is ownership, not gameplay logic.

Conceptually:

```ts
class GameRuntime {
  initialize(): void
  start(): void
  pause(): void
  resume(): void
  reset(): void
  dispose(): void
}
```

It should own:

- event bus
- game state
- systems
- game loop
- runtime subscriptions
- lifecycle

The runtime should not know detailed Flappy Space rules.

Avoid turning `GameRuntime` into another oversized `GameController`.

---

# 7. Create One Composition Root

There should be one obvious location where Flappy Space dependencies are assembled.

For example:

```text
src/games/flappy-space/createFlappySpaceRuntime.ts
```

Conceptually:

```ts
export function createFlappySpaceRuntime(
  app: PIXI.Application
): GameRuntime {
  const events = new EventBus<FlappyGameEvents>()
  const state = new GameStateStore(createInitialState())

  const entities = new EntitySystem(...)
  const physics = new PhysicsSystem(...)
  const spawning = new SpawningSystem(...)
  const rendering = new RenderSystem(...)
  const input = new InputSystem(...)
  const audio = new AudioSystem(...)
  const ui = new UISystem(...)

  return new GameRuntime({
    app,
    events,
    state,
    systems: [...]
  })
}
```

The exact API may vary.

The important rule is that dependencies should be instantiated and wired in one place instead of imported globally throughout the codebase.

---

# 8. Remove Runtime-Level Singletons

Convert runtime-owned services from singleton instances into normal instances.

Target candidates:

- EventBus
- GameStateService or replacement state store
- EntitySystem
- PhysicsSystem
- SpawningSystem
- RenderSystem
- InputSystem
- UISystem
- AudioSystem where appropriate

Avoid:

```ts
import { entitySystem } from './entitySystem'
```

inside another runtime system.

Prefer constructor dependencies:

```ts
class PhysicsSystem {
  constructor(
    private readonly entities: EntitySystem,
    private readonly state: GameStateStore,
    private readonly events: GameEventBus,
    private readonly config: FlappyConfig,
  ) {}
}
```

This creates:

- explicit ownership
- easier unit testing
- independent game sessions
- deterministic cleanup
- fewer hidden side effects

---

# 9. Introduce a Small Shared System Lifecycle

Use a minimal common contract for systems.

For example:

```ts
interface GameSystem {
  initialize(): void
  dispose(): void
}
```

Only add:

```ts
update(deltaSeconds: number): void
```

to systems that actually participate in the game loop.

Do not force every class into an elaborate engine hierarchy.

A useful distinction could be:

```ts
interface GameSystem {
  initialize(): void
  dispose(): void
}

interface UpdatingGameSystem extends GameSystem {
  update(deltaSeconds: number): void
}
```

Keep it structural and simple.

---

# 10. Replace the Untyped Event Bus

The current EventBus accepts a broad enum plus arbitrary payloads.

That already allows incompatible payloads for the same logical event.

Replace it with a typed event map.

Example:

```ts
interface FlappyGameEvents {
  gameStarted: void
  gameReset: void

  jumpRequested: void

  playerDied: {
    reason: 'obstacle' | 'boundary' | 'timeout'
  }

  obstaclePassed: {
    obstacleId: string
  }

  orbCollected: {
    orbId: string
    x: number
    y: number
    radius: number
  }

  scoreChanged: {
    score: number
  }

  levelCompleted: {
    level: number
  }
}
```

Usage should become something like:

```ts
events.emit('orbCollected', {
  orbId,
  x,
  y,
  radius
})
```

and:

```ts
events.on('orbCollected', event => {
  // fully typed
})
```

Requirements:

- one payload shape per event
- no `any` event payloads
- subscriptions must return an explicit disposer or subscription
- separate EventBus instances must not communicate
- EventBus should not be a process-wide singleton

RxJS may remain internally if it is useful.

Do not preserve RxJS purely for architectural consistency.

A small typed emitter is acceptable if it materially simplifies the implementation.

---

# 11. Clarify Entity Responsibilities

Entities should own realtime object state and behavior intrinsic to the object.

Reasonable entity responsibilities include:

- position
- velocity
- dimensions
- current visual state
- intrinsic movement
- hitbox calculation
- collected/dead state
- syncing owned Pixi display objects

Entities should generally not own:

- global event subscriptions
- scoring rules
- level progression
- game-over transitions
- runtime lifecycle
- access to global state stores

For example, Astronaut may keep:

```ts
astronaut.flap()
astronaut.moveLeft()
astronaut.update(dt)
astronaut.die()
astronaut.reset()
```

But InputSystem should decide when to call those methods.

Similarly, Orb may expose:

```ts
orb.collect()
```

but collecting it should not independently decide the player's global score.

---

# 12. Establish One Owner for Game Rules

Gameplay rules currently leak across:

- entities
- PhysicsSystem
- GameStateService
- config
- UI

Every rule should have one authoritative owner.

The most important current example is orb scoring.

Current behavior appears to contain overlapping score mutations:

- GameStateService `collectOrb()` increments score
- PhysicsSystem separately increments score
- Orb itself returns a point value
- config contains `ORB_POINTS`

This should be consolidated.

## Target rule

A collected orb awards:

```ts
ORB_POINTS
```

exactly once.

Before changing production code:

1. Add an integration-level test covering a real orb collision/collection.
2. Demonstrate the current score mutation.
3. Change the implementation so one layer owns the rule.
4. Verify the score changes exactly once.

Preferred ownership:

```text
Physics detects collection
        ↓
Gameplay/state command handles collection
        ↓
state updates orb count + score exactly once
        ↓
typed orbCollected event emitted
        ↓
UI/audio react
```

Do not spread the rule back across multiple layers.

If correcting duplicate scoring alters current observable gameplay, call it out explicitly as a bug fix in the implementation report.

---

# 13. Separate Simulation From Presentation Events

An event such as:

```text
orbCollected
```

should describe what happened.

It should not contain Pixi Graphics instances purely so another system can perform an animation.

Prefer:

```ts
{
  orbId,
  x,
  y,
  radius
}
```

The UI/rendering layer can construct its own effect.

This prevents gameplay events from coupling systems to renderer-specific objects.

---

# 14. Fix Spawning Ownership

SpawningSystem should be fully driven by its injected state/config.

Remove behavior such as a hardcoded current level index.

Level-specific spawning should use the actual current level or supplied level configuration.

Add tests for:

- current level config being applied
- obstacle speed per level
- spawn interval per level
- secondary obstacle behavior where relevant
- reset behavior
- orb spawn behavior

---

# 15. Remove Unmanaged Delayed Timers

Avoid raw `setTimeout()` calls that survive game reset or capture stale game-state snapshots.

Prefer simulation-time state inside SpawningSystem.

For example:

```ts
pendingOrbSpawnRemaining -= deltaMs
```

When it reaches zero:

```ts
spawnOrb()
```

Benefits:

- deterministic tests
- pause works correctly
- reset can clear the pending spawn
- no stale closures
- no timer cleanup problems

If a real timer is retained, it must be explicitly owned and cancelled during reset/dispose.

Simulation-time scheduling is preferred.

---

# 16. Establish One Game Loop

The runtime should own one stable ticker callback.

Conceptually:

```ts
private update = (ticker: PIXI.Ticker) => {
  const dt = ticker.deltaMS / 1000

  this.state.updateTime(...)

  this.physics.update(dt)
  this.spawning.update(dt)
  this.rendering.update(dt)
}
```

Avoid repeatedly removing/re-adding different loop functions during normal gameplay when state checks inside the loop would suffice.

Lifecycle requirements:

```text
initialize
  attach loop once

pause
  pause simulation

resume
  resume simulation

dispose
  detach loop once
```

Background rendering may continue during idle/game-over if desired, but model that deliberately rather than by repeatedly rewiring ticker callbacks.

---

# 17. Normalize Time Units

Choose explicit units at boundaries.

Recommended:

- Pixi ticker input converted once to seconds
- simulation systems use seconds
- countdown/state presentation may use milliseconds only where necessary

Avoid passing seconds into one entity and multiplying by 1000 because another entity expects milliseconds.

Use naming where ambiguity exists:

```ts
deltaSeconds
deltaMs
timeRemainingMs
```

Add tests where conversion errors would affect gameplay.

---

# 18. Remove Duplicate Update Ownership

Each entity type should have one obvious update owner.

Review stars specifically.

Do not update the same animation/movement from both PhysicsSystem and RenderSystem.

Choose ownership based on semantics:

- physical/simulation movement belongs in simulation
- presentation-only effects belong in rendering

Starfield parallax is presentation, so RenderSystem is a reasonable owner.

---

# 19. Reduce GameController Responsibilities

The existing GameController has accumulated:

- system initialization
- state transitions
- level initialization
- ticker ownership
- diagnostics
- event subscriptions
- win/loss conditions
- reset behavior
- game loop orchestration

After introducing GameRuntime and explicit systems, GameController should either:

1. become a much smaller gameplay/session coordinator, or
2. disappear if its remaining responsibilities are naturally handled elsewhere.

Do not preserve a controller class merely because it already exists.

Do not move the same 30 KB of responsibility into `GameRuntime`.

---

# 20. Preserve State Semantics During the Refactor

Keep the current state model initially unless changing it materially simplifies the architecture.

Do not introduce a full finite-state machine in this refactor.

The current booleans can remain temporarily:

- isStarted
- isGameOver
- isLevelComplete

A future cleanup may replace them with:

```ts
'idle' | 'running' | 'levelComplete' | 'gameOver'
```

but that is not required to achieve the current goal.

Specifically preserve:

- total `time` across level completion
- score across level completion
- warps progression
- current level configuration
- countdown reset per new level

---

# 21. Logging Cleanup

The realtime loop should not emit `info` logs every frame.

Audit GameController and systems for high-frequency logging.

Rules:

- errors remain errors
- unusual recoverable conditions use warnings
- useful lifecycle events may use info
- high-frequency diagnostics use debug
- debug diagnostics should be gated
- no probabilistic `Math.random()` logging in production code where deterministic counters or debug flags are cleaner

Logging must not materially affect gameplay performance.

---

# 22. Remove Dead and Redundant Dependencies

As part of cleanup:

- remove `@pixi/react` if still unused
- remove dead imports
- remove obsolete manager aliases
- remove stale compatibility code only after tests demonstrate it is unnecessary
- do not remove Electron support as part of this refactor
- do not change deployment architecture as part of this refactor

Electron and web packaging are outside scope unless required to preserve build correctness.

---

# 23. Target Directory Structure

Do not begin the refactor with a mass file move.

First establish dependency boundaries.

Once ownership is stable, move toward:

```text
src/
  app/
    App.tsx
    GameShell.tsx

  engine/
    GameRuntime.ts
    EventBus.ts

    state/
      GameStateStore.ts

    types/
      GameSystem.ts
      GameEvents.ts

  games/
    flappy-space/
      createFlappySpaceRuntime.ts
      config.ts

      entities/
        Astronaut.ts
        Obstacle.ts
        Planet.ts
        Orb.ts
        Star.ts
        utils.ts

      systems/
        EntitySystem.ts
        InputSystem.ts
        PhysicsSystem.ts
        SpawningSystem.ts
        RenderSystem.ts
        AudioSystem.ts
        UISystem.ts

      state/
        FlappyGameState.ts

      ui/
        Scoreboard.ts

  components/
    Button.tsx
    Controls.tsx
    LevelMessage.tsx
    MessageBox.tsx

  utils/
    logger.ts
```

The exact directory naming is less important than the ownership boundaries.

Do not introduce a separate npm package for `engine`.

Do not create a monorepo.

Wait until at least game #2 exists before extracting shared code into a package.

---

# 24. AGENTS.md Must Be Updated

`AGENTS.md` should remain the primary operational guide for coding agents.

Preserve its useful sections around:

- commands
- verification
- test conventions
- coding conventions
- review expectations

Remove or rewrite architectural statements that no longer apply.

## New architecture guidance should state

### React/Pixi boundary

- React owns the application shell.
- Pixi owns realtime rendering.
- Do not send per-frame simulation state through React.

### Runtime ownership

- each mounted game owns an independent GameRuntime
- runtime-owned systems are normal instances, not global singletons
- dependencies are provided explicitly at the composition root

### Event rules

- events are typed
- one payload contract exists for each event
- subscriptions must be disposed by their owner
- entities should not subscribe to global runtime events directly

### State rules

- one runtime-scoped state store is authoritative for session state
- entity simulation state remains local to entities
- total elapsed game time remains preserved across level transitions

### Rule ownership

- scoring and progression rules must have one owner
- UI reacts to state/events but does not own gameplay rules

### Testing rules

- behavioral contracts take priority over implementation-shape tests
- architecture-specific tests may be rewritten when a documented architecture change intentionally invalidates their assumption
- lifecycle/refactor work must include cleanup and remount tests
- `npm run verify` remains the minimum local gate

### Scope discipline

Explicitly state:

> This repository uses a lightweight system-oriented game architecture. Do not introduce a generic ECS, custom physics engine, plugin framework, dependency injection container, or reusable npm engine package without a concrete second use case.

---

# 25. Cursor Architecture Documentation

Audit:

```text
.cursor/rules/project-info.mdc
```

It currently describes the project as an ECS and contains stale architecture details.

Avoid maintaining two competing architecture documents.

Preferred solution:

- keep `AGENTS.md` as the source of truth
- reduce `project-info.mdc` to a small Cursor-specific instruction pointing agents to `AGENTS.md`

For example, preserve its required Cursor frontmatter and replace duplicated architectural prose with a short directive to read and follow the repository root `AGENTS.md`.

This prevents documentation drift.

---

# 26. Coverage Strategy

Do not chase a vanity global percentage during the structural refactor.

Prioritize coverage around risk:

Highest priority:

- GameRuntime lifecycle
- EventBus isolation
- state transitions
- InputSystem lifecycle
- UISystem lifecycle
- PhysicsSystem gameplay outcomes
- SpawningSystem state/reset behavior
- orb scoring
- ticker attachment/disposal

Medium priority:

- individual entity branches
- asset loading error paths
- audio behavior

Lower priority:

- trivial getters
- purely decorative rendering internals

Once the refactor is complete and the actual coverage baseline is known, add CI thresholds slightly below the achieved stable baseline.

Then increase them deliberately over time.

Do not set an arbitrary 90% global threshold before measuring the refactored code.

---

# 27. Refactor Execution Plan

Implement in small, independently verifiable phases.

## Phase 0: Baseline

Run:

```bash
npm ci
npm run verify
npm run test:coverage
npm run build
```

Record results.

Read all existing tests.

Do not modify production code yet.

---

## Phase 1: Add Missing Characterization Tests

Add high-value tests around:

- controller lifecycle
- listener cleanup
- system dispose/reinitialize
- orb scoring
- spawning reset
- current-level spawning
- ticker ownership

Run the full suite.

Commit/checkpoint before architecture changes.

---

## Phase 2: Typed Event Bus

Introduce typed event contracts while preserving current behavior.

Initially compatibility adapters are acceptable if they keep the change small.

Update EventBus tests:

Remove:

```text
singleton identity is preserved
```

Add:

```text
separate instances are isolated
```

Do not remove global singleton usage everywhere in the same change if it creates a giant diff.

---

## Phase 3: Runtime-Scoped State Store

Convert GameStateService to an instantiable store.

Preserve all state transition tests.

Replace singleton identity testing with independent-state-instance tests.

Keep the existing public state operations initially to reduce migration risk.

---

## Phase 4: Composition Root and Dependency Injection

Create the Flappy Space composition root.

Instantiate:

- events
- state
- systems

Inject dependencies.

Remove direct singleton imports system by system.

Run tests after each migrated system.

---

## Phase 5: Entity Event Decoupling

Remove global EventBus subscriptions/emissions from:

- Astronaut
- Orb
- other entities where found

Move interaction orchestration into systems.

Rewrite tests to assert gameplay behavior at the correct layer.

Keep pure entity behavior tests.

---

## Phase 6: Consolidate Game Rules

Fix duplicated scoring.

Make `ORB_POINTS` authoritative.

Ensure orb collection mutates score exactly once.

Centralize other obvious duplicated rule ownership encountered during the migration.

Avoid unrelated gameplay tuning.

---

## Phase 7: Runtime/Game Loop Ownership

Introduce GameRuntime as the clear lifecycle owner.

Simplify or remove GameController.

Ensure:

- ticker callback attached once
- pause/resume deterministic
- reset deterministic
- dispose complete
- remount safe

Add tests.

---

## Phase 8: Spawning Cleanup

Remove hardcoded level assumptions.

Replace unmanaged delayed timers with simulation-time scheduling.

Test reset and pause behavior.

---

## Phase 9: Rendering and Logging Cleanup

Clarify update ownership.

Remove duplicate star updates.

Reduce per-frame logging.

Remove dead code and unused dependency paths.

---

## Phase 10: Directory Organization

Only after dependency boundaries are stable:

- create `engine/`
- create `games/flappy-space/`
- move files
- update imports

This phase should contain minimal behavioral changes.

---

## Phase 11: Documentation

Update:

- `AGENTS.md`
- `.cursor/rules/project-info.mdc`
- README architecture section if needed

Documentation must describe the architecture that actually exists after the refactor.

---

# 28. Change Management Rules

During implementation:

- prefer small changes
- keep the build green
- run relevant focused tests while developing
- run `npm run verify` after every meaningful phase
- run coverage and production build at major checkpoints
- do not delete useful tests just because they become inconvenient
- rewrite implementation-specific tests when their old assumption is intentionally removed
- explain why any test was materially changed
- do not bundle unrelated UI redesigns
- do not tune gameplay unless fixing a clearly identified bug
- do not add speculative abstractions for future games

---

# 29. Acceptance Criteria

The refactor is complete when all of the following are true.

## Architecture

- no runtime system relies on global singleton imports for state/events/entities
- one composition root constructs a Flappy Space game runtime
- runtime lifecycle has one clear owner
- systems have explicit dependencies
- event payloads are typed
- `any` has been eliminated from core system boundaries
- entities no longer own global EventBus subscriptions
- scoring has one owner
- spawning uses current level configuration
- delayed spawning is reset/dispose safe

## Lifecycle

- initialize is safe
- reset is safe
- dispose is complete
- initialize after dispose is safe
- React unmount/remount does not accumulate subscriptions
- ticker callbacks do not duplicate
- two runtime instances can exist independently

## Behavior

Existing gameplay remains intact except documented bug fixes.

Specifically:

- astronaut movement remains unchanged
- collision behavior remains unchanged
- level progression remains unchanged
- total elapsed time persists across levels
- score persists across levels
- timers behave correctly
- orb collection works
- orb score is awarded exactly once
- UI remains functionally equivalent

## Quality

These commands pass:

```bash
npm run verify
npm run test:coverage
npm run build
```

CI remains green on supported Node versions.

No useful behavioral coverage has been lost.

## Documentation

- `AGENTS.md` reflects the final architecture
- Cursor instructions defer to `AGENTS.md`
- no documentation claims the repository uses a formal ECS
- commands and verification instructions are current

---

# 30. Explicit Non-Goals

Do not include the following in this refactor:

- multiplayer
- backend services
- accounts
- leaderboards
- cloud saves
- new game mechanics
- graphics redesign
- new physics library
- Phaser migration
- React-rendered Pixi architecture
- generic ECS
- dependency injection framework
- npm game-engine package
- monorepo conversion
- Electron removal
- deployment migration

The goal is to produce a clean seed, not to design the final architecture for every future game.

---

# 31. Expected Outcome

After this refactor, starting another Pixi.js game should require reusing the boring infrastructure:

```text
Pixi lifecycle
runtime lifecycle
typed events
input foundation
asset loading
audio foundation
resize/scaling
debug/logging conventions
test infrastructure
```

while replacing game-specific code:

```text
entities
physics rules
spawning rules
scoring
progression
game state
visual effects
```

Do not extract shared code into a formal reusable package yet.

Build game #2 against this architecture first.

Any abstraction that game #2 does not actually need should remain Flappy Space-specific.