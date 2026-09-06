---
name: add-dialogue
description: Author and register Flappy Spaceman dialogue through the canonical story registry, with validation and direct preview.
---

# Add Dialogue Skill (`add-dialogue`)

Use this skill when adding or modifying reusable dialogue content. Keep story sequencing in `GameFlow` and keep the dialogue architecture unchanged.

## Read first

Read `AGENTS.md`, `STORY_ARCHITECTURE.md`, `CAMPAIGN_FLOW_ARCHITECTURE.md`, `VISUAL_IMPLEMENTATION.md`, and `.agents/skills/add-level/SKILL.md`.

Inspect:

- `src/game/story/dialogue/dialogueTypes.ts`
- `src/game/story/dialogue/dialogues.ts` and its tests
- `src/components/story/DialogueOverlay.tsx`
- `src/test/story-preview.ts` and `story-preview.html`
- `src/game/campaign/validateCampaign.ts`

## Workflow

1. Translate the requested conversation into concise lines between canonical characters: **Astronaut** (`CharacterIds.ASTRONAUT`, default Atom) and **AI** (`CharacterIds.AI`, default Artimus).
2. Choose a stable kebab-case dialogue ID and add it to `DialogueIds` in `src/game/story/dialogue/dialogueTypes.ts`. Check the registry for duplicates.
3. Assign strongly-typed `PortraitIds` (`PortraitIds.ASTRONAUT`, `PortraitIds.ASTRONAUT_PUZZLED`, `PortraitIds.AI`, etc.) corresponding to `astronaut-headshots.png` visor states or AI optics. Never use loose strings.
4. Add the `DialogueDefinition` to `src/game/story/dialogue/dialogues.ts`, using the canonical registry.
5. Run `validateDialogueDefinition`.
6. Preview the dialogue at `/story-preview.html?dialogue=<dialogue-id>`.
7. Inspect speaker names, line order, text wrapping, advance, skip, avatar rendering, and completion.
8. Only if requested, reference the ID from a level `intro`/`outro` or an in-engine cutscene step.
9. Validate affected campaign references with `validateCampaignDefinition`.
10. Run:

   ```bash
   npm run verify
   npm run test:coverage
   npm run build
   ```

## Guardrails

Do not:

- Introduce characters other than `astronaut` and `ai`. There is no "pilot" character or mission control.
- Use raw unvalidated strings for `portraitId` or `dialogueId`.
- Invert or inline avatar rendering logic outside `<DialogueAvatar />`.
- Put campaign navigation inside dialogue content.
- Call `GameFlow.startLevel()` from dialogue UI.
- Embed dialogue directly inside `LevelDefinition`.
- Create a second dialogue renderer.
- Create one-off React components for individual conversations.
- Put HTML styling inside dialogue strings.
- Modify Pixi systems just to add dialogue.
- Mutate save state directly from dialogue UI.
- Invent untyped portrait assets.
- Change `public/assets/astro-sprite.png`.

If the request needs unsupported behavior or a missing reusable asset, report it instead of hacking around it.

The task is incomplete while validation, preview, or any verification command fails.