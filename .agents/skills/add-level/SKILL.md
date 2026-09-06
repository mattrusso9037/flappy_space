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
3. [VISUAL_IMPLEMENTATION.md](../../VISUAL_IMPLEMENTATION.md) — Visual design tokens, depth layers, particle budgets, and the locked astronaut asset rule.
4. `src/game/campaign/defaultCampaign.ts` — Canonical campaign definition and active level configurations.
5. `src/game/environments/environments.ts` — Reusable visual environment presets.
6. `src/game/audio/musicCatalog.ts` — Music track registry.
7. `src/game/campaign/validateCampaign.ts` — Authoritative campaign definition validator.

---

## 2. The Canonical 11-Step Level Authoring Workflow

Follow this systematic sequence whenever adding or modifying a level:

```text
1. Understand requested level requirements (theme, pacing, difficulty, sequence).
2. Choose a stable, slugified level ID (e.g. 'crimson-belt', 'sector-06').
3. Choose or reuse an environment preset ('deep-nebula', 'violet-reach', 'solar-storm').
4. Choose or reuse a music track preset ('weightless-space').
5. Define explicit gameplay parameters (speeds, spawnInterval, orbSpawnChance, obstacles, orbsRequired, timeLimit).
6. Declare the LevelDefinition in src/game/campaign/defaultCampaign.ts.
7. Wire nextLevelId progression chaining cleanly without orphan levels.
8. Run campaign validation (validateCampaignDefinition).
9. Preview the level directly using /visual-preview.html?level=<id>.
10. Run unit test suite (npm test).
11. Run full verification gate (npm run verify && npm run test:coverage && npm run build).
```

---

## 3. Strict Authoring Guardrails

### ❌ What You Must NEVER Do:
- **DO NOT** edit `GameRuntime.ts` just to add a level.
- **DO NOT** edit `RenderSystem.ts` just to add a level.
- **DO NOT** edit `SpawningSystem.ts` just to add a level.
- **DO NOT** embed `PIXI.Graphics`, textures, containers, or rendering loops inside `LevelDefinition`.
- **DO NOT** create a one-off rendering implementation for a single level.
- **DO NOT** create duplicate environment presets for trivial visual differences.
- **DO NOT** use `levelNumber` to implicitly change obstacle radius or difficulty. Difficulty must be declared explicitly in `gameplay.obstacles`.
- **DO NOT** bypass campaign validation.
- **DO NOT** break existing `nextLevelId` chaining in the campaign.
- **DO NOT** add unbacked story references (dialogue or cutscene IDs that do not exist).
- **DO NOT** invent new visual languages outside `VISUAL_IMPLEMENTATION.md`.
- **DO NOT** modify, redraw, or replace the locked astronaut sprite (`public/assets/astro-sprite.png`).

### ⚠️ Missing Capability Rule:
If a requested level requires an engine capability that does not yet exist (e.g. moving obstacles, gravity wells, new enemy types), **STOP**. Identify the missing reusable capability and design it cleanly into the system architecture rather than hacking a one-off workaround into the level definition.

---

## 4. Translating Natural Language Requests

When translating a prompt (e.g. *"Add a level after sector-03 called The Crimson Belt, around 15% harder, solar storm environment, 14 orbs, 65s limit"*):

1. **ID**: Choose a kebab-case stable string ID, e.g. `'crimson-belt'`.
2. **Progression**: Set `sector-03.nextLevelId = 'crimson-belt'`, and `'crimson-belt'.nextLevelId = 'sector-04'`.
3. **Derived Values**:
   - Speeds: Scale prior level speeds by +15% (e.g. `planet * 1.15`).
   - Spawn interval: Decrease slightly for density (e.g. `priorInterval * 0.9`).
   - Obstacles: Interpolate radii (`minPlanetRadius`, `maxPlanetRadius`) and `secondaryPlanetChance`.
   - `orbSpawnChance`: Defaults to `0.4` unless specifically requested.
4. **Ambiguity**: If key parameters cannot reasonably be inferred and materially affect gameplay, state the assumption clearly or ask for clarification.

---

## 5. Environment Preset Rules

- Always prefer existing presets:
  - `'deep-nebula'` — Standard deep void with cyan and violet ion clouds.
  - `'violet-reach'` — Cosmic violet ion clouds with enhanced particle energy.
  - `'solar-storm'` — Amber and hazard-orange dust radiance.
- Only add a new environment preset to `src/game/environments/environments.ts` if the requested level represents a distinctly different astronomical region.
- Any new preset must adhere strictly to `VISUAL_IMPLEMENTATION.md` design tokens (`INK.void`, `INK.hull`, `INK.cyan`, `INK.violet`, `INK.hazard`, `INK.amber`).

---

## 6. Music Preset Rules

- Always reference existing registered music tracks (e.g. `'weightless-space'`).
- Do not fabricate music files or embed non-existent URLs.
- If a user requests a new music track but no audio asset exists in `public/music/`, explain that the asset is missing, use the default track as a safe fallback, and register the track once the audio file is supplied.

---

## 7. QA & Verification Commands

After adding or editing a level, execute:

1. **Campaign Validation**: Verify `validateCampaignDefinition(DEFAULT_CAMPAIGN)` returns `{ valid: true, errors: [] }`.
2. **Direct Visual QA**:
   - Start the Vite dev server: `npm run dev`
   - Open `/visual-preview.html?level=<level-id>` in the browser to visually inspect the environment, obstacle flow, and telemetry.
3. **Automated Verification**:
   ```bash
   npm run verify
   npm run test:coverage
   npm run build
   ```
A level authoring task is **NOT DONE** until all three commands pass with zero errors and zero warnings.
