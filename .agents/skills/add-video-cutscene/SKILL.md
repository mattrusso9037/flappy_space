---
name: add-video-cutscene
description: Register and optionally wire real pre-rendered video cinematics in Flappy Spaceman, with asset checks, preview, and playback QA.
---

# Add Video Cutscene Skill (`add-video-cutscene`)

Use this skill for supplied pre-rendered video cinematics. Treat the work as asset registration and campaign authoring. Do not redesign `GameFlow`, `VideoCutsceneOverlay`, or the story architecture.

## Read first

Read:

- `AGENTS.md`
- `STORY_ARCHITECTURE.md`
- `CAMPAIGN_FLOW_ARCHITECTURE.md`
- `.agents/skills/add-level/SKILL.md`

Inspect:

- `src/game/story/video/videoCutsceneTypes.ts`
- `src/game/story/video/videoCutscenes.ts`
- `src/components/story/VideoCutsceneOverlay.tsx`
- `src/game/campaign/validateCampaign.ts`
- `src/test/story-preview.ts`
- `story-preview.html`
- `public/cutscenes/`
- supplied asset paths

## Workflow

1. Inspect the supplied video and verify that the actual file exists.
2. Use the canonical `public/cutscenes/` directory.
3. Choose a unique stable kebab-case video ID.
4. Verify that an optional poster exists.
5. Register a `VideoCutsceneDefinition` using the current type.
6. Use real source and poster paths.
7. Use the requested `skippable` value and a supported `preload` value.
8. Do not fabricate binary assets or register missing production media.
9. Run `validateVideoCutsceneDefinition`.
10. Validate campaign references with `validateCampaignDefinition` when applicable.
11. Manually check source and poster file existence because the current validator is structural.
12. Preview at `/story-preview.html?video=<video-id>`.
13. Inspect sizing, aspect ratio, playback, audio, poster, skip, natural end, and error behavior.
14. Verify that background music does not undesirably overlap video audio.
15. Verify mute state and music resume behavior through the existing story audio system.
16. If `skippable: true`, verify Escape and the visible skip control.
17. Verify natural end and skip complete exactly once.
18. Verify a failed video does not trap the player.
19. Only if requested, reference the ID from a level `intro`/`outro` or campaign ending.
20. For a real MP4, test the actual asset in Vite and Electron.
21. Run:

    ```bash
    npm run verify
    npm run test:coverage
    npm run build
    ```

## Guardrails

Do not:

- Fabricate or silently transcode production media.
- Invent a poster.
- Create custom skip or error logic for one video.
- Add a second audio system.
- Change `VideoCutsceneOverlay` for content-specific behavior.
- Wire campaign progression unless requested.
- Navigate campaign state from media events.

If a requested capability is missing, report it instead of hacking around it.

The task is incomplete while assets, references, preview, or any verification command fails.