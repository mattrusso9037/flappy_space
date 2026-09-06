---
name: add-polished-game-asset
description: Add polished static PixiJS world art while preserving gameplay geometry, world-space ownership, debug visibility, and asset architecture.
---

# Add Polished Game Asset

Use this skill when replacing placeholder `PIXI.Graphics` world presentation with production PNG/WebP/atlas art such as platforms, terrain, props, grapple anchors, walls, machinery, or environmental objects.

## Read First

Inspect:

- `AGENTS.md`
- `VISUAL_IMPLEMENTATION.md`
- `src/game/assetManager.ts`
- the gameplay definition/entity being visually upgraded
- `RenderSystem` debug rendering
- existing visual registries before creating a new one

## Core Rule

**Art is presentation. Gameplay geometry remains authoritative.**

Never derive:

- collision bounds
- interaction range
- platform dimensions
- grapple targeting
- diggable geometry

from texture or sprite dimensions.

Prefer:

```text
gameplay definition
    ↓
logical geometry / traits

presentation styleId
    ↓
asset registry
    ↓
Pixi Sprite / TilingSprite / Container
```

## Asset Workflow

For modular terrain/platforms:

1. Use clean transparent production assets, not labeled concept sheets.
2. Prefer reusable pieces such as:
   - left cap
   - tileable middle
   - right cap
3. Register assets through AssetManager.
4. Resolve them through one canonical presentation/style registry.
5. Compose them in Pixi using world coordinates.
6. Preserve aspect ratio and intentional alignment.
7. Pack into an atlas once the asset family grows enough to justify it.

Do not hardcode crop coordinates throughout entity code.

## Pixi Usage

Use:

- Sprite for fixed artwork
- TilingSprite for repeatable spans
- containers for composed objects
- Graphics for prototypes, effects, and debug overlays

Do not add extra tickers, RAF loops, React frame state, or external rendering libraries.

## Debug Mode

Every polished gameplay asset must remain inspectable in debug mode.

Debug rendering must visualize canonical gameplay data, including applicable:

- collision bounds
- interaction bounds
- anchors
- triggers
- camera zones
- diggable/buildable/grappleable traits

Never use visual sprite bounds as debug collision bounds.

Debug mode is presentation-only and must not alter simulation behavior.

## World + Camera

World objects use world coordinates and live under the existing worldCamera.

Never fake traversal by scrolling an individual asset.

Camera movement is owned by the camera/render architecture, not by the asset.

## Scope

Prefer extending an existing entity’s presentation before creating a new gameplay entity.

If the requested art requires a genuinely new reusable capability, stop and implement that capability through the normal architecture before wiring the asset.

## QA

Verify:

- clean transparency
- no texture stretching artifacts
- seamless tiling where required
- correct world alignment
- collision remains unchanged
- camera traversal works
- debug overlay matches logical geometry
- reset/transition cleanup remains correct

Run:

```bash
npm run verify
npm run test:coverage
npm run build
```
