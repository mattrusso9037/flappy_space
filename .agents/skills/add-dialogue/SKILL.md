---
name: add-dialogue
description: Author and register Flappy Spaceman dialogue through the canonical story registry, with validation and direct preview.
---

# Add Dialogue Skill (`add-dialogue`)

Use this skill when adding or modifying reusable dialogue content. Keep story sequencing in `GameFlow` and keep the dialogue architecture unchanged.

## Read first

Read `AGENTS.md`, `STORY_ARCHITECTURE.md`, `CAMPAIGN_FLOW_ARCHITECTURE.md`, `VISUAL_IMPLEMENTATION.md`, and `.agents/skills/add-level/SKILL.md`.

Inspect:

- `src/game/story/characters/characterTypes.ts`
- `src/game/story/characters/characters.ts`
- `src/game/story/dialogue/dialogueTypes.ts`
- `src/game/story/dialogue/dialogues.ts` and its tests
- `src/components/story/DialogueOverlay.tsx`
- `src/components/story/DialogueAvatar.tsx`
- `src/components/story/dialogueAvatars.ts`
- `src/test/story-preview.ts` and `story-preview.html`
- `src/game/campaign/validateCampaign.ts`

## Workflow

1. Structure dialogue lines using registered `CharacterId` values (from `CharacterIds` in `src/game/story/characters/characterTypes.ts`). Speaker display names resolve dynamically through the character registry at runtime; do not hardcode speaker names into dialogue content.
2. Choose a stable kebab-case dialogue ID and add it to `DialogueIds` in `src/game/story/dialogue/dialogueTypes.ts`. Check the canonical registry for duplicates.
3. Assign semantic `emotion` values using registered `EmotionId` constants (`EMOTION_IDS`). Per-character portrait adapters resolve visual presentation automatically; never hardcode asset filenames, sprite-sheet coordinates, or renderer-specific portrait IDs into dialogue definitions.
4. Add the `DialogueDefinition` to `src/game/story/dialogue/dialogues.ts`, registering it in the canonical dialogue registry.
5. Run `validateDialogueDefinition` to confirm that all `characterId` values exist in the character registry and all assigned `emotion` values are supported by each character.
6. Preview the dialogue at `/story-preview.html?dialogue=<dialogue-id>`.
7. Inspect resolved speaker names, line order, text wrapping, advance, skip, avatar rendering, and completion.
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

- Use unregistered or raw unvalidated strings for `characterId`, `emotion`, or `dialogueId`.
- Hardcode speaker display names, asset file paths, sprite coordinates, or presentation details into `DialogueLine`.
- Bypass character portrait adapters or inline avatar rendering logic outside `<DialogueAvatar />`.
- Put campaign navigation inside dialogue content.
- Call `GameFlow.startLevel()` from dialogue UI.
- Embed dialogue directly inside `LevelDefinition`.
- Create a second dialogue renderer.
- Create one-off React components for individual conversations.
- Put HTML styling inside dialogue strings.
- Modify Pixi systems just to add dialogue.
- Mutate save state directly from dialogue UI.

If the request needs unsupported behavior or a missing reusable asset, report it instead of hacking around it.

The task is incomplete while validation, preview, or any verification command fails.