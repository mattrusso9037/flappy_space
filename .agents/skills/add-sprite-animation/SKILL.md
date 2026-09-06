---
name: add-sprite-animation
description: Safely add or upgrade atlas-based animated sprites in Flappy Spaceman, preserving gameplay dimensions, physics, and architectural boundaries.
---

# Add Sprite Animation Skill (`add-sprite-animation`)

Use this skill when adding or replacing atlas-based animated sprites in **Flappy Spaceman** (`flappy_space`).

This workflow enables high-fidelity sprite animation across the game — including the astronaut player character, NPCs, enemies, ships, and animated props — while strictly preserving gameplay physics, collision envelopes, and system architecture.

---

## 1. Mandatory Pre-Flight Reading

Before writing code or editing files, inspect and understand:

1. [AGENTS.md](../../AGENTS.md) — Root repository architectural standards, verification gates, and §4.H Sprite Animation Architecture.
2. [VISUAL_IMPLEMENTATION.md](../../VISUAL_IMPLEMENTATION.md) — Section 2 (Depth layers: Pilot layer z: 10, World layer z: 0), Section 3 (Design tokens), Section 5 (Motion timings), and Section 9 (Controlled Astronaut Visual Identity).
3. `src/game/assetManager.ts` — Canonical asset loader with `getSpritesheet`, `getAnimationFrames`, and `registerAsset`.
4. `src/game/visuals/spriteAnimationTypes.ts` — Shared contracts for animation definitions and fixed collision dimensions.
5. `src/game/visuals/spriteAnimations.ts` — Production sprite animation metadata registry.
6. `src/game/entities/Astronaut.ts` — Reference entity with velocity tilting, presentation loops, and collision boundaries.
7. `src/game/systems/entitySystem.ts` — Lifecycle and layer management for game entities.
8. `sprite-preview.html` & `src/test/sprite-preview.ts` — Dedicated visual QA preview tooling.

---

## 2. Core Architectural Rule: Presentation Only

> **Sprite animation is presentation only. It must never silently alter gameplay physics, collision dimensions, gameplay speed, scoring, campaign flow, input semantics, or level progression.**

The visual representation may animate, but gameplay simulation remains exclusively owned by systems (`PhysicsSystem`, `SpawningSystem`, `GameStateService`, `GameFlow`).

```text
Gameplay Input / System Event (e.g. flap(), die(), collision)
       ↓
Entity Simulation State Updated (velocity, dead, position)
       ↓
Entity Presentation Hook Triggered (playAnimation('thrust'), playAnimation('death'))
       ↓
PixiJS AnimatedSprite Advances via Simulation Time (update(deltaSeconds))
       ↓
Logical Hitbox & Physics Remain Fixed (CollisionDimensions { width: 35, height: 35 })
```

---

## 3. Reusable Scope

This skill is designed for all animated entities in Flappy Spaceman:
- **Astronaut Pilot**: Canonical reference implementation (`idle`, `thrust`, `hit`, `death`, `warp`).
- **NPCs**: Friendly pilots, mission-control communicators, sector guides (`idle`, `talk`).
- **Enemies / Hazards**: Alien probes, rogue drones, automated defense turrets (`patrol`, `charge`, `fire`, `destroy`).
- **Ships**: Hyperspace cruisers, sector convoy vessels (`cruising`, `warp`, `shield-flicker`).
- **Animated Props**: Power beacons, pulsating energy conduits, celestial warp gates (`pulsing`, `active`, `dormant`).

---

## 4. Canonical Asset Model

### Atlas Directory Layout
Always prefer atlas-based spritesheets:
```text
public/
└── assets/
    └── <entity-id>/
        ├── <entity-id>.png      # Spritesheet atlas texture page
        └── <entity-id>.json     # TexturePacker / PixiJS / Aseprite atlas metadata
```
*Note: Flat placement under `public/assets/` is also supported if consistent with existing assets.*

### Frame & Animation Group Naming
Atlas JSON files must declare named frames with zero-padded numeric suffixes and named animation groups:
```json
{
  "frames": {
    "idle_00": { "frame": { "x": 0, "y": 0, "w": 128, "h": 128 }, "anchor": { "x": 0.5, "y": 0.5 } },
    "idle_01": { "frame": { "x": 128, "y": 0, "w": 128, "h": 128 }, "anchor": { "x": 0.5, "y": 0.5 } },
    "thrust_00": { "frame": { "x": 256, "y": 0, "w": 128, "h": 128 }, "anchor": { "x": 0.5, "y": 0.5 } },
    "death_00": { "frame": { "x": 384, "y": 0, "w": 128, "h": 128 }, "anchor": { "x": 0.5, "y": 0.5 } }
  },
  "animations": {
    "idle": ["idle_00", "idle_01"],
    "thrust": ["thrust_00"],
    "death": ["death_00"]
  },
  "meta": {
    "image": "<entity-id>.png",
    "size": { "w": 512, "h": 512 },
    "scale": "1"
  }
}
```
Do not rely on brittle numeric pixel slicing in runtime code when named atlas frames are available.

### Supported States Constraint
Inspect actual entity requirements before authoring states. For the astronaut:
- `idle`: Looping hover motion.
- `thrust`: Jetpack propulsion burst.
- `hit`: Obstacle collision recoil.
- `death`: Terminal defeat sequence.
- `warp`: Hyperspace streak sequence.

Do not invent states that have no gameplay or presentation triggers. If a requested animation state has no trigger, report it rather than authoring dead code.

---

## 5. Collision & Visual Scale Independence (MANDATORY)

### Fixed Logical Hitbox
> [!IMPORTANT]
> **Do not derive collision bounds from active animation frame dimensions.**

Visual sprites may flare, stretch, or emit thruster exhaust across frames. Logical hitboxes must remain constant:
```typescript
export interface CollisionDimensions {
  width: number;
  height: number;
}
```
- For the astronaut, logical collision dimensions are fixed at `35 × 35` (matching the `0.7` scale of the canonical 50px rendered frame).
- Changing active frames or animation states **must not change collision bounds**.

### In-Game Scale & Anchor Consistency
- Do not assume raw source frame dimensions equal in-game dimensions (e.g. source 512×512 rendered at 50×50).
- Explicitly set `sprite.width = 50` and `sprite.height = 50` (or fixed display scale).
- Ensure consistent center anchor (`sprite.anchor.set(0.5)`) across all frames.
- Verify that atlas trim data does not cause frame-to-frame positional jitter. Fix the atlas origin/pivot rather than compensating with gameplay position offsets.

---

## 6. AssetManager & PixiJS v8 Integration

### Registering Assets
Never bypass `AssetManager` with ad-hoc `PIXI.Assets.load()` calls inside entity constructors:
```typescript
import assetManager from '../assetManager';

// Register via AssetManager if not in default catalog
assetManager.registerAsset({
  name: 'astronaut',
  url: './assets/astronaut/astronaut.json',
  type: 'spritesheet',
});
```

### Resolving Frames
```typescript
// Get loaded spritesheet
const sheet = assetManager.getSpritesheet('astronaut');

// Get specific animation frame textures
const thrustFrames = assetManager.getAnimationFrames('astronaut', 'thrust');
```

### AnimatedSprite Setup
Use PixiJS v8 `AnimatedSprite`:
```typescript
const animSprite = new PIXI.AnimatedSprite(textures);
animSprite.anchor.set(0.5);
animSprite.loop = definition.loop;
animSprite.animationSpeed = definition.fps / 60; // Normalize FPS to Pixi ticker rate
```

**Guardrails on Tickers & Libraries**:
- Do NOT create a new `PIXI.Ticker`.
- Do NOT manually advance frames using `setInterval` or `setTimeout`.
- Do NOT use React component state or hooks to advance canvas sprite frames.
- Do NOT introduce GSAP, Framer Motion, or external animation libraries.
- Animation advances through the existing Pixi ticker and simulation deltas.

---

## 7. Animation Metadata & State Transitions

### Reusable Definition Contract
Store animation configuration in `src/game/visuals/spriteAnimations.ts`:
```typescript
export interface SpriteAnimationDefinition {
  frames: string[];
  fps: number;
  loop: boolean;
}

export const ASTRONAUT_SPRITE_DEFINITION: SpriteAssetDefinition = {
  id: 'astronaut',
  name: 'Astronaut Pilot',
  spritesheetAsset: 'astronaut',
  defaultAnimation: 'idle',
  collisionDimensions: { width: 35, height: 35 },
  animations: {
    idle: { frames: ['idle_00', 'idle_01', 'idle_02', 'idle_03'], fps: 8, loop: true },
    thrust: { frames: ['thrust_00', 'thrust_01', 'thrust_02', 'thrust_03'], fps: 14, loop: false },
    hit: { frames: ['hit_00', 'hit_01'], fps: 10, loop: false },
    death: { frames: ['death_00', 'death_01', 'death_02', 'death_03'], fps: 12, loop: false },
    warp: { frames: ['warp_00', 'warp_01', 'warp_02', 'warp_03'], fps: 12, loop: true },
  },
};
```

### Predictable State Transitions
- **spawn / reset**: `idle` (looping).
- **flap / thrust**: `thrust` (non-looping) → return to `idle` upon completion.
- **hit**: `hit` (non-looping) → return to prior state or `idle`.
- **die**: `death` (non-looping) → remain dead on final frame; do not return to `idle`.
- **warp**: `warp` (looping) → return to `idle` when warp sequence concludes.

Do not restart the same animation every frame (prevent animation thrashing). Check current active animation state before calling `playAnimation()`.

### Non-Looping Completion Callbacks
When handling `onComplete` for non-looping animations:
- Clean up or unbind callbacks when switching states.
- Ensure callbacks do not fire repeatedly.
- Never trigger campaign navigation or score mutations from within an animation completion callback.

---

## 8. Visual QA via Sprite Preview Tooling

Always inspect animated sprites directly using `sprite-preview.html`:
```text
http://localhost:5173/flappy_space/sprite-preview.html?asset=astronaut&animation=idle
```

### Preview Checklist
Before completing any sprite task, verify:
- [ ] **Character Identity**: Visual identity is preserved and cohesive with project art style.
- [ ] **Frame Consistency**: All frames belong to the same character/prop and scale.
- [ ] **Silhouette Stability**: No sudden shifts in mass or proportions.
- [ ] **Transparency**: Clean alpha cutout with zero haloing or clipping borders.
- [ ] **Anchor / Pivot Stability**: Sprite origin (0.5, 0.5) stays fixed; zero positional jitter.
- [ ] **Looping**: Looping states (`idle`, `warp`) transition seamlessly without hitches.
- [ ] **Animation Speed**: FPS matches natural gameplay speed without feeling sluggish or frenetic.
- [ ] **In-Game Display Scale**: Rendered size matches designated gameplay footprint (e.g. 50px).
- [ ] **Hitbox Independence**: Toggling `HITBOX` confirms the hazard-orange collision box remains strictly fixed during frame changes.
- [ ] **Idle Recovery**: Non-looping animations (`thrust`, `hit`) transition cleanly back to `idle`.

---

## 9. The Canonical 10-Step Sprite Authoring Workflow

```text
1. Inspect supplied PNG and atlas JSON metadata.
2. Verify frame naming (e.g. idle_00, thrust_00) and animation groups.
3. Validate PNG and JSON asset placement under public/assets/<id>/.
4. Register the spritesheet in src/game/assetManager.ts.
5. Declare SpriteAssetDefinition and animation metadata in src/game/visuals/spriteAnimations.ts.
6. Wire semantic presentation methods on the entity (e.g. playAnimation('thrust')).
7. Verify explicit fixed collision dimensions (hitbox independent of frame sizes).
8. Preview animations directly in /sprite-preview.html?asset=<id>.
9. Run unit test suite (npm test).
10. Run full verification gate (npm run verify && npm run test:coverage && npm run build).
```

---

## 10. Mandatory Testing Requirements

When adding or upgrading animated sprites (e.g. astronaut migration), include unit tests verifying:

1. **Spritesheet Loads**: Asset layer resolves spritesheet without throwing.
2. **Animation Names Resolve**: All declared animation keys (`idle`, `thrust`, etc.) resolve non-empty frame arrays.
3. **Idle Starts Correctly**: Default state is `idle` and loop flag is `true`.
4. **Thrust Triggers**: Triggering `flap()` starts `thrust` animation.
5. **Non-Looping Completes Safely**: Non-looping animations stop at end or return cleanly to `idle`.
6. **Death Animation**: `die()` plays death sequence and does not loop or revert to `idle`.
7. **Reset Restores Idle**: `reset()` restores entity to `idle` state and neutral display properties.
8. **Collision Dimensions Fixed**: Changing frames does not alter bounds returned by `getHitbox()`.
9. **Position Invariance**: Changing animation states does not shift entity `(x, y)` coordinates.
10. **Safe Fallback**: Requesting a non-existent animation key fails safely without crashing.
11. **Resource Cleanup**: `dispose()` properly stops animation and destroys sprite resources.

---

## 11. Strict Guardrails ("Never" Rules)

❌ **NEVER**:
- Edit physics values (`GRAVITY`, `JUMP_VELOCITY`) just because visual frame dimensions changed.
- Derive hitbox bounds from `sprite.width` or `sprite.height` of variable animation frames.
- Create a secondary `PIXI.Ticker` or unmanaged `requestAnimationFrame` loop.
- Use `setTimeout` or `setInterval` for animation timing.
- Use React components or hooks to animate Pixi sprites.
- Load sprite files directly via `PIXI.Assets.load()` inside entity constructors.
- Hardcode atlas frame coordinates throughout gameplay code.
- Create separate asset manager instances per entity.
- Add external animation packages (`gsap`, `framer-motion`).
- Casually restyle, recolor, or replace the astronaut during unrelated tasks.
- Embed campaign progression or score changes inside animation callbacks.
- Weaken existing physics or gameplay collision unit tests.

### ⚠️ Missing Capability Rule:
If a requested sprite requires an advanced capability not yet supported in the lightweight architecture (e.g. skeletal bone rigging, 8-way directional sprites, layered paper-doll equipment, runtime palette shader recoloring), **STOP**. Propose a clean, reusable system extension before hacking entity code.
