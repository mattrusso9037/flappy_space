# The Relay Vault, Sector 03

A bounded 2,800px platforming course with eight fixed pickups and a three-minute
timer. Grapple is equipped from the start. No random pickups, obstacles, wall
building or digging. The floor is safe so missed jumps can be retried.

## Play

The normal campaign reaches this level after Sector 02 and continues to Sector 04.
For the standalone web demo, open the normal app with `?demo=relay-vault`:
`/flappy_space/?demo=relay-vault`. It starts directly at Sector 03 and ends at the
existing victory/replay screen. Its save key is separate from main campaign progress.
This is a keyboard demo: A/D or arrows to move, Space to thrust, E to grapple/release,
X to release. Landing restores the single thrust charge. Anchors must be above and
ahead; release before steering to the next platform.

## Route and puzzles

1. **Stepping stones:** Jump from the floor onto the first step (orb at x=400),
   land to recharge, then jump to the second step (x=680).
2. **Grapple catches:** Face right from the second step and grapple to the cyan
   anchor. Release and steer right onto the catch balcony (x=1030). Repeat for the
   upper balcony (x=1470). The anchors sit beside the platforms so the pull has an
   unobstructed approach, rather than dragging the astronaut into their undersides.
3. **Vault crossing:** Grapple above the tall barrier, then steer onto its top
   (x=1640). Drop right onto the recovery platform (x=1980).
4. **Final relay:** Jump to the platform under the low ceiling (x=2230).
   Grapple to the anchor outside the ceiling, release, and steer onto the final
   platform (x=2640). Collecting all eight pickups awards 400 points and finishes.

Ordinary jumping cannot reach the upper balconies from the floor. Every orb is
required, so walking below the course cannot finish it. The course relies on the
existing powered pull, not pendulum swinging.

## Authoring and verification

Canonical level data: `src/game/campaign/defaultCampaign.ts`.
Standalone wrapper: `src/game/campaign/demoCampaign.ts`.
No engine, physics, entity or tool-system changes are needed by this level.

Preview: `/flappy_space/visual-preview.html?level=sector-03`.
“Relay walkthrough: next station” runs one stage of a reproducible solution,
starting from the normal spawn. It calls production movement, thrust and grapple
actions, never teleports or changes scores. Nine clicks cover spawn through finish.

Automated tests execute the same route against the production runtime, require each
pickup, validate campaign completion, and check separate demo storage. Run
`npm run verify`, `npm run test:coverage`, and `npm run build`.

The demo URL is included in the normal Vite production build. Publishing it uses
the existing web release workflow. This change does not deploy or change the
production default campaign.
