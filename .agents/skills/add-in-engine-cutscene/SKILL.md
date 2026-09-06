---
name: add-in-engine-cutscene
description: Author declarative Pixi-rendered Flappy Spaceman cinematics from supported cutscene primitives, then validate and preview them.
---

# Add In-Engine Cutscene Skill (`add-in-engine-cutscene`)

Use this skill for Pixi-rendered cinematics. Compose existing declarative `CutsceneDefinition` data. Do not redesign the cutscene architecture or add one-off runtime logic.

## Read first

Read:

- `AGENTS.md`
- `STORY_ARCHITECTURE.md`
- `CAMPAIGN_FLOW_ARCHITECTURE.md`
- `VISUAL_IMPLEMENTATION.md`
- `design.md`
- `.agents/skills/add-level/SKILL.md`
- the repository PixiJS skill

Inspect:

- `src/game/story/cutscenes/cutsceneTypes.ts`
- `src/game/story/cutscenes/cutscenes.ts`
- `CutsceneRunner`
- dialogue and music registries
- `RenderSystem.worldCamera`
- camera cleanup behavior
- `src/test/story-preview.ts`
- `story-preview.html`
- `src/game/campaign/validateCampaign.ts`

## Supported primitives

Inspect the actual `CutsceneStep` union before authoring. Use only registered, supported steps such as:

- `wait`
- `dialogue`
- `fade`
- `camera`
- `music`

Do not assume a primitive exists.

## Workflow

1. Understand the cinematic intent and identify every requested visual, timing, dialogue, and music behavior.
2. Compare the request with the actual step union.
3. If unsupported behavior is requested, stop and report the missing reusable primitive.
4. Choose a unique stable kebab-case cutscene ID.
5. Reuse registered dialogue and music IDs.
6. Compose readable steps in `src/game/story/cutscenes/cutscenes.ts`.
7. Keep timing simulation-driven through `CutsceneRunner.update(deltaSeconds)`.
8. Use canonical camera semantics. Transform only `RenderSystem.worldCamera`.
9. Avoid excessive zoom.
10. Usually finish with:

    ```ts
    { x: 0, y: 0, zoom: 1 }
    ```

11. Validate with `validateCutsceneDefinition`.
12. Check unique ID, non-empty steps, positive durations, registered dialogue/music, valid step types, and valid camera values.
13. Preview at `/story-preview.html?cutscene=<cutscene-id>`.
14. Inspect timing, fade, camera, nested dialogue, music, skip, and completion cleanup.
15. Only if requested, reference the ID from a level `intro`/`outro` or campaign ending.
16. Run:

    ```bash
    npm run verify
    npm run test:coverage
    npm run build
    ```

## Guardrails

Never:

- Manipulate Pixi objects from `cutscenes.ts`.
- Embed callbacks or functions in definitions.
- Edit `GameDisplay` for one cinematic.
- Add one-off runtime branches.
- Put dialogue text directly in a cutscene.
- Use `setTimeout`, `setInterval`, `requestAnimationFrame`, an extra ticker, or an animation library.
- Manually start levels or navigate campaign state from a cutscene.
- Change the locked astronaut source sprite.

If the requested effect is not represented by a reusable canonical primitive, stop and report it.

The task is incomplete while validation, preview, or any verification command fails.