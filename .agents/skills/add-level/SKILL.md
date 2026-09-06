---
name: add-level
description: Safely add or modify a Flappy Spaceman campaign level using the canonical level-authoring architecture.
---

# Add Level Skill (`add-level`)

This skill guides AI agents and contributors in safely adding or modifying levels in **Flappy Spaceman** (`flappy_space`).

---

## 1. Mandatory Pre-Flight Reading

Before writing code or editing files, inspect and understand:

1. [AGENTS.md](../../AGENTS.md) — Root repository architectural standards and the verification gate.
2. [CAMPAIGN_FLOW_ARCHITECTURE.md](../../CAMPAIGN_FLOW_ARCHITECTURE.md) — Canonical campaign, progression, and level-authoring contract.
3. [VISUAL_IMPLEMENTATION.md](../../VISUAL_IMPLEMENTATION.md) — Visual design tokens, depth layers, particle budgets, and the controlled astronaut visual identity.
4. `src/game/campaign/defaultCampaign.ts` — Canonical campaign definition and active level configurations.
5. `src/game/environments/environments.ts` — Reusable visual environment presets.
6. `src/game/visuals/terrainPresets.ts` — Reusable terrain presentation presets.
7. `src/game/audio/musicCatalog.ts` — Music track registry.
8. `src/game/campaign/validateCampaign.ts` — Authoritative campaign definition validator.

---

## 2. Reusable Level Capabilities vs. Missing Capabilities

Level authoring operates strictly through data configuration. Distinguish existing reusable capabilities from missing engine capabilities before modifying code.

### Existing Reusable Capabilities (Configure via `LevelDefinition`):
- **Deep space flight**: Default full-height gameplay corridor with lethal bottom boundary and unlimited thrust (`movement: { mode: 'flight' }` or omitted).
- **Ground / planetary surface**: Solid terrain surface via `gameplay.ground: { enabled: true, height: number }` and `presentation.terrainId?: TerrainId` (e.g. `'alien-crust'`). Bottom boundary becomes walkable/landable surface.
- **Ground traversal & thrust capacity**: Discriminated union:
  - Flight mode: `gameplay.movement: { mode: 'flight' }` (or omitted).
  - Ground mode: `gameplay.movement: { mode: 'ground', maxThrustCharges: number }`. Left/right continuous traversal while held + jet-assisted jump. One thrust per landing (`maxThrustCharges: 1`); landing recharges thrust. Future double-jump via `maxThrustCharges: 2` without redesign.
- **Stationary ground in ground mode**: In grounded traversal levels, ground does NOT auto-scroll (stationary ground).
- **Obstacle enable/disable**: Discriminated union:
  - Enabled: `gameplay.obstacles: { minPlanetRadius, maxPlanetRadius, secondaryPlanetChance, enabled?: true }`.
  - Disabled: `gameplay.obstacles: { enabled: false }` — does NOT require or accept irrelevant planet radius metadata.
- **Single canonical orb configuration**: `gameplay.orbs: { spawnChance: number, spawnInterval?: number, minY?: number, maxY?: number }`. Single authoritative source of truth for orb probability, independent cadence, and reachable vertical corridor (e.g. `[360, 480]` for grounded levels).
- **Environment presets**: Visual backgrounds via `presentation.environmentId` (`'deep-nebula'`, `'alien-surface'`, `'violet-reach'`, `'solar-storm'`).
- **Terrain presets**: Visual ground styling via `presentation.terrainId` (`'alien-crust'`).
- **Music tracks**: Background audio via `presentation.musicId` (`'weightless-space'`).
- **Obstacle & pickup balance**: Speed multipliers, spawn intervals, planet radius bounds, secondary obstacle chance, orb spawn chance, orbs required, and time limit.
- **Story sequencing**: Optional level `intro` and `outro` story transitions (dialogue, in-engine cutscene, video).

### Missing Engine Capabilities (Require Engine Development First):
Examples: moving platforms, lava/acid damage, one-way platforms, water physics, gravity wells, enemy AI, breakable terrain, procedural caves.

### ⚠️ The 6-Step Missing Capability Rule:
When a requested level requires an engine capability that does not yet exist:
1. **STOP** level authoring immediately.
2. **Identify** the missing reusable capability.
3. **Design** the smallest engine extension that supports the capability generically.
4. **Implement and test** that reusable capability independently with unit tests.
5. **Update** canonical architecture documents and relevant skills.
6. **Only then configure** the level through `LevelDefinition`.

> **CRITICAL**: Agents must NEVER solve missing engine capabilities with level-ID branching (e.g. `if (levelId === 'sector-02')`). Capabilities must be implemented generically once in engine systems and consumed via configuration.

---

## 3. Explicit File-Touch Constraints

### Typical Level-Only Change (Safe to edit):
- `src/game/campaign/defaultCampaign.ts` — Declare new `LevelDefinition` and wire `nextLevelId`.
- `src/game/campaign/campaign.test.ts` — Update campaign progression and level parameter assertions.
- `src/game/environments/environments.ts` — Add new visual environment preset if a genuinely distinct astronomical region is requested.
- `src/game/visuals/terrainPresets.ts` — Add new visual terrain preset if a genuinely distinct surface material is requested.
- Story registries (`src/game/story/`) — Register new dialogue, cutscenes, or video if level story transitions are requested.

### Files That Normally MUST NOT Change When Adding a Level:
- `src/game/GameRuntime.ts`
- `src/game/entities/Astronaut.ts`
- `src/game/systems/entitySystem.ts`
- `src/game/systems/physicsSystem.ts`
- `src/game/systems/spawningSystem.ts`
- `src/game/systems/renderSystem.ts`

If any of these files require modification, the task has crossed from **level authoring** into **engine capability development**. The agent must explicitly acknowledge this transition and follow the 6-step missing capability workflow above.

---

## 4. The Canonical Level Authoring Workflow

Follow this systematic sequence whenever adding or modifying a level:

```text
1. Understand requested level requirements (theme, pacing, difficulty, sequence, ground/space).
2. Choose a stable, kebab-case level ID (e.g. 'crimson-belt', 'sector-06').
3. Choose or reuse an environment preset ('deep-nebula', 'alien-surface', 'violet-reach', 'solar-storm').
4. Choose or reuse a music track preset ('weightless-space').
5. Configure ground capability if planetary surface is requested:
   - gameplay.ground = { enabled: true, height: 80 }
   - presentation.terrainId = 'alien-crust'
6. Define explicit gameplay parameters (speeds, spawnInterval, orbSpawnChance, obstacles, orbsRequired, timeLimit).
7. Declare the LevelDefinition in src/game/campaign/defaultCampaign.ts.
8. Wire nextLevelId progression chaining cleanly without orphan levels.
9. Run campaign validation (validateCampaignDefinition).
10. Preview the level directly using /visual-preview.html?level=<id>.
11. Run unit test suite (npm test).
12. Run full verification gate (npm run verify && npm run test:coverage && npm run build).
```

---

## 5. Strict Authoring Guardrails

### ❌ What You Must NEVER Do:
- **DO NOT** edit `GameRuntime.ts`, `RenderSystem.ts`, `PhysicsSystem.ts`, `SpawningSystem.ts`, or `EntitySystem.ts` merely to configure another level.
- **DO NOT** introduce level-specific runtime branching (e.g. `if (levelId === '...')`).
- **DO NOT** embed `PIXI.Graphics`, textures, containers, or rendering loops inside `LevelDefinition`.
- **DO NOT** let visual terrain presets determine gameplay collision geometry.
- **DO NOT** create duplicate environment or terrain presets for trivial visual differences.
- **DO NOT** use `levelNumber` to implicitly change obstacle radius or difficulty. Difficulty must be declared explicitly in `gameplay.obstacles`.
- **DO NOT** bypass campaign validation.
- **DO NOT** break existing `nextLevelId` chaining in the campaign.
- **DO NOT** add unbacked story references (dialogue or cutscene IDs that do not exist).
- **DO NOT** invent new visual languages outside `VISUAL_IMPLEMENTATION.md`.
- **DO NOT** casually regenerate, replace, or restyle the controlled astronaut visual identity.

---

## 6. Ground, Terrain, and Scrolling Authoring Rules

- Ground geometry belongs strictly to `gameplay.ground`:
  ```typescript
  ground: {
    enabled: true,
    height: 80, // Pixels from bottom of screen (GAME_HEIGHT = 600)
  }
  ```
  - `height` must be a positive finite number less than `GAME_HEIGHT` (600).
  - `height` must leave a viable gameplay corridor of at least 100px (`GAME_HEIGHT - height >= 100`).
- Ground appearance belongs strictly to `presentation.terrainId`:
  ```typescript
  presentation: {
    environmentId: 'alien-surface',
    terrainId: 'alien-crust',
    musicId: 'weightless-space',
  }
  ```
  - `terrainId` must resolve to a registered preset in `src/game/visuals/terrainPresets.ts`.
- Groundless levels simply omit `gameplay.ground` and `presentation.terrainId`.
- **World/camera separation**: In ground traversal mode (`movement.mode: 'ground'`), the astronaut and all gameplay geometry use world coordinates. `CameraSystem` follows within its dead zone and clamps to `gameplay.world.width` in bounded mode; `RenderSystem.worldCamera` applies the presentation transform. Entities never decide camera behavior and ground never scrolls its own presentation.
- **Looping traversal**: Configure `gameplay.world: { width: 2400, traversal: 'loop' }`. Width is the repeat length in pixels, finite and at least 800. Requires ground movement and enabled ground. Omitted traversal defaults to bounded. World coordinates remain continuous; terrain repeats and sky stays filled. Scenarios remain at authored world positions, not repeated each lap. Test both directions across seams, effect alignment, bounded object retention, and reset to flight. Preview Traverse left/right and Traversal thrust controls exercise production simulation.
- **Cross-Level Transition Hygiene**: Whenever a level introduces a capability (e.g. ground surface or ground movement), verify that moving to the next level (e.g. flight level) cleanly clears ground geometry and restores flight dynamics without capability leakage.

---

## 7. Translating Natural Language Requests

When translating a prompt (e.g. *"Add a level after sector-03 called The Crimson Belt, around 15% harder, solar storm environment, 14 orbs, 65s limit"*):

1. **ID**: Choose a kebab-case stable string ID, e.g. `'crimson-belt'`.
2. **Progression**: Set `sector-03.nextLevelId = 'crimson-belt'`, and `'crimson-belt'.nextLevelId = 'sector-04'`.
3. **Derived Values**:
   - Speeds: Scale prior level speeds by +15% (e.g. `planet * 1.15`).
   - Spawn interval: Decrease slightly for density (e.g. `priorInterval * 0.9`).
   - Obstacles: Interpolate radii (`minPlanetRadius`, `maxPlanetRadius`) and `secondaryPlanetChance`. If obstacles disabled, `{ enabled: false }`.
   - `orbs`: Single canonical config `orbs: { spawnChance: 0.4 }`. If grounded level, specify `minY` and `maxY` reachable with one thrust jump (e.g. `[360, 480]`).
   - Ground: If surface level requested, specify `ground: { enabled: true, height: 80 }` and `terrainId: 'alien-crust'`.
   - Movement: If grounded traversal requested, specify `movement: { mode: 'ground', maxThrustCharges: 1 }`.
4. **Ambiguity**: If key parameters cannot reasonably be inferred and materially affect gameplay, state the assumption clearly or ask for clarification.

---

## 8. QA & Verification Commands

After adding or editing a level, execute:

1. **Campaign Validation**: Verify `validateCampaignDefinition(DEFAULT_CAMPAIGN)` returns `{ valid: true, errors: [] }`.
2. **Direct Visual QA**:
   - Start the Vite dev server: `npm run dev`
   - Open `/visual-preview.html?level=<level-id>` in the browser to visually inspect the environment, terrain, obstacle flow, and telemetry.
3. **Automated Verification**:
   ```bash
   npm run verify
   npm run test:coverage
   npm run build
   ```
A level authoring task is **NOT DONE** until all three commands pass with zero errors and zero warnings.

## Player tools and Wall Builder

Wall Builder is an existing reusable capability. Author it through
`gameplay.tools: { equipped: 'wall-builder', wallBuilder: { width: 80, height: 80,
maxActive: 2, lifetimeSeconds: 20 } }` (or `equipped: null`). Omit tools for levels
without equipment. Requires enabled ground and ground movement. Future levels
must not edit runtime, entity, input or physics wiring to consume this capability.

Panels stand on natural ground, 8px ahead of the body in the last held direction.
Airborne/stacked/overlapping/out-of-bounds use fails safely. A valid use at capacity
replaces the oldest panel. The latest can be removed; panels expire in simulation
time. Tops are landable and recharge thrust; all faces are solid. Body dimensions
and movement remain unchanged. Loop-world panels stay at continuous world positions.

Use `gameplay.orbs.placements: [{ x, y }]` for a fixed raised pickup opportunity,
not a level-ID branch. This requires a world. Pickups have 14px radius and must fit
above ground; they persist across traversal, spawn once per load and use normal
orb scoring. Sector 02 demonstrates an optional two-jump opportunity at (700,290).

Keys: 1 equip, 0 unequip, E build, X remove latest. Preview at
`/visual-preview.html?level=sector-02` using Wall puzzle: land on panel, then
Wall puzzle: reach orb. Also verify invalid placement, both wall sides, top landing,
expiry/removal underfoot, replacement, pause/input gating, reset and
flight to tools to flight to tools cleanup. Run verify, coverage and build.

For a genuinely new tool capability, update the tool contract, validator, gameplay
system and tests before authoring a level. Preserve separate gameplay/presentation
ownership and the existing runtime clock. Do not introduce a generic ability or
plugin framework, campaign progression logic, or extra tickers/timers.

## Grapple Hook authoring

Configure `gameplay.tools.grappleHook: { range: 500, pullSpeed: 360,
anchors: [{ id: 'raised-pickup', x: 700, y: 250 }] }`.
Tool configurations are optional independently; equipped tools require their config.
Requires ground movement and enabled ground, like Wall Builder. Anchor IDs must be
unique and positions must fit the playable corridor. Coordinates are world pixels;
range is pixels and pullSpeed is pixels per second. Loop worlds do not repeat anchors.

2 equips Grapple Hook; E attaches to the nearest anchor above and ahead in the last
held direction (authored order breaks ties). E again or X releases. 1 switches to
Wall Builder; 0 unequips. Only explicit point anchors support attachment, never
terrain, panels, pickups or arbitrary surfaces. Invalid targeting leaves movement
unchanged. This is a powered pull, not a rope or pendulum simulation.

PlayerToolSystem owns attachment/selection, PhysicsSystem applies pull before
normal astronaut integration and swept panel collision, and EntitySystem owns
anchor and cable graphics. Pull ends within 30px of the anchor. Release preserves
current velocity; gravity, boundaries, collision and thrust rules remain active.
Pause freezes attachment; death, completion, reset, switch and level load cancel it.
No extra clock or level-specific runtime branches.

Sector 02 uses the existing raised pickup at (700,290), with an anchor at (700,250).
Walk to about x=400, face right, press 2 then E to pull up to the pickup. The existing
wall route remains available. Preview /visual-preview.html?level=sector-02.
Verify input, invalid targeting, pull, release, pause, death, switch and transitions,
plus unchanged ground/thrust behavior. Run verify, test:coverage and build.
