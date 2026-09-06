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

1. Translate the requested conversation into concise lines with an explicit speaker and text.
2. Choose a stable kebab-case dialogue ID. Check the registry for duplicates before editing it.
3. Reuse current speaker names and portrait IDs. Confirm portrait IDs in the asset system. If a requested portrait is missing, omit `portraitId` and report the missing asset.
4. Add the `DialogueDefinition` to `src/game/story/dialogue/dialogues.ts`, using the canonical registry.
5. Run `validateDialogueDefinition`.
6. Preview the dialogue at `/story-preview.html?dialogue=<dialogue-id>`.
7. Inspect speaker names, line order, text wrapping, advance, skip, and completion.
8. Only if requested, reference the ID from a level `intro`/`outro` or an in-engine cutscene step.
9. Validate affected campaign references with `validateCampaignDefinition`.
10. Run:

   ```bash
   npm run verify
   npm run test:coverage
   npm run build