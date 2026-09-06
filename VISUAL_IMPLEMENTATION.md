# Flappy Spaceman Visual Implementation Guide

This document establishes the canonical visual architecture, rendering pipeline, design tokens, and constraints for **Flappy Spaceman**. It serves as the primary implementation reference for all visual, presentation, and rendering work.

---

## 1. Visual Architecture

The visual presentation follows a strict separation of concerns between DOM-level application chrome and PixiJS canvas rendering:

```
┌─────────────────────────────────────────────────────────────┐
│ React Application Shell (DOM)                               │
│ - Mounting & responsive container scaling                  │
│ - Overlays (Loading, Error, Start, Game Over)               │
│ - Audio controls toggle (Mute / Unmute)                     │
│ - Top-level mission header                                  │
├─────────────────────────────────────────────────────────────┤
│ PixiJS v8 Realtime Stage (Canvas)                           │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ HUD & Telemetry Layer (z: 30) - Viewport Space          │ │
│ │ - Inverted stage scaling for crisp 1:1 pixel rendering   │ │
│ │ - Realtime Scoreboard & Sector Warp Banners             │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ Effects Layer (z: 20) - Simulation-Delta Bounded        │ │
│ │ - Jetpack thruster sparks, collection/impact bursts     │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ Pilot Layer (z: 10) - Locked Astronaut Sprite           │ │
│ │ - Velocity pitch rotation & thruster emission anchor    │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ World Layer (z: 0) - Celestial Obstacles & Pickups      │ │
│ │ - Procedural planets (stable geometry) & pulsating orbs │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ Deep Space Environment (z: -20 to -30)                  │ │
│ │ - Parallax starfields (3 layers) with warp deformation  │ │
│ │ - Static radial gradient nebula atmosphere              │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

- **React Application Shell**: Owns the DOM overlay hierarchy, start/game-over screens, error/loading states, responsive window resizing, audio toggles, dialogue overlays (`DialogueOverlay`), and video cutscene presentation (`VideoCutsceneOverlay`). Story UI strictly adheres to existing mission-control visual tokens (`--space-void`, `--space-hull`, `--space-cyan`, etc.), and video presentation maintains a clean, letterboxed aesthetic without unrelated player chrome. React **never** receives per-frame entity simulation ticks.
- **PixiJS Canvas**: Owns all realtime visual rendering, scene graphs, sprites, particles, in-engine cutscene visuals/camera transforms, and render loops. The locked astronaut sprite artwork constraint (`public/assets/astro-sprite.png`) strictly applies to in-engine cinematics as well.
- **HUD Ownership**: The in-game HUD (`Scoreboard`) is owned by `UISystem` inside the Pixi scene graph. It renders in viewport coordinates (inverting `app.stage.scale`) so HUD borders, typography, and gauge ticks remain razor-sharp at native display resolution.
- **World & Effects Ownership**: `RenderSystem` manages deep-space atmosphere and parallax stars; `FlightEffects` manages bounded particle pools and transient burst rings. Both advance purely via simulation deltas (`deltaSeconds`).

---

## 2. Rendering Layers (Canonical Depth Order)

Depth sorting is controlled via container `zIndex` values defined in `src/game/visuals/tokens.ts`:

| Layer | `DEPTH` Constant | Content & System Owner |
| :--- | :--- | :--- |
| **Atmosphere** | `DEPTH.atmosphere` (-30) | Void backdrop rectangle (`#070913`) and 5 soft radial gradient nebula clouds (`RenderSystem`). |
| **Stars** | `DEPTH.stars` (-20) | 3 layers of parallax stars with warp velocity stretching (`RenderSystem`). |
| **World** | `DEPTH.world` (0) | Dynamic gameplay entities: procedural planets and collectible energy orbs (`EntitySystem`). |
| **Pilot** | `DEPTH.pilot` (10) | Astronaut sprite, idle hovering bob, and flight tilt angle (`EntitySystem`). |
| **Effects** | `DEPTH.effects` (20) | Simulation-driven particles: thruster sparks, orb bursts, crash impacts (`FlightEffects`). |
| **HUD** | `DEPTH.hud` (30) | Viewport-anchored avionics telemetry panels, multiplier gauges, warp banners (`UISystem`). |
| **Debug** | `DEPTH.debug` (40) | Collision envelopes, hitboxes, and sensor bounds (`RenderSystem`). |

---

## 3. Design Tokens

The repository maintains a unified, dual-context token architecture:

```
Design System Source of Truth (design.md)
              │
      ┌───────┴───────────────────────┐
      ▼                               ▼
PixiJS / Engine Context         DOM / CSS Context
(src/game/visuals/tokens.ts)     (src/styles/visual-tokens.css)
- INK (hex numeric constants)   - --space-* (CSS custom properties)
- FONT (font family strings)    - --font-* (CSS font definitions)
- DEPTH (zIndex layers)         - @font-face local font declarations
- MOTION (durations & timings)
- easeOut / damp (math helpers)
```

### Color Tokens

| Semantic Token | Pixi (`INK`) | CSS Property | Hex / RGBA | Usage |
| :--- | :--- | :--- | :--- | :--- |
| **Void** | `INK.void` | `--space-void` | `#070913` | Deep space background canvas ground. |
| **Hull** | `INK.hull` | `--space-hull` | `#0b1021` | Cockpit panel fill, telemetry module backdrops. |
| **Cyan** | `INK.cyan` | `--space-cyan` | `#00f0ff` | Primary telemetry reticles, active strokes, positive status. |
| **Ice** | `INK.ice` | `--space-ice` | `#e2f8ff` | High-contrast text readouts, star highlights. |
| **Muted** | `INK.muted` | `--space-muted` | `#8aa6be` | De-prioritized labels, dormant gauge segments. |
| **Violet** | `INK.violet` | `--space-violet` | `#a855f7` | Energy orbs, shield matrix conduits. |
| **Hazard** | `INK.hazard` | `--space-hazard` | `#ff5533` | Critical alerts, collision impacts, emergency CTA. |
| **Amber** | `INK.amber` | `--space-amber` | `#ffb454` | Low-time cautionary status, warning readouts. |
| **Outline** | N/A | `--space-outline`| `rgb(0 240 255 / 24%)` | Translucent 1px technical framing borders. |

### When to Use Which:
- **Use `tokens.ts` (`INK`, `DEPTH`, `MOTION`, `FONT`)**: Anywhere inside `src/game/` (PixiJS components, systems, entities, graphics contexts).
- **Use `visual-tokens.css` (`var(--space-*)`, `var(--font-*)`)**: Anywhere in CSS files (`GameDisplay.css`, `App.css`, `visual-foundation.css`).

---

## 4. Typography

The visual identity relies on two locally bundled, offline-first typefaces:

1. **Space Grotesk** (`var(--font-display)` / `FONT.display`):
   - **Role**: Prominent display titles, mission status headers, sector cleared banners, primary scores.
   - **Characteristics**: Wide apertures, sharp geometric terminals, high legibility under motion.
2. **Space Mono** (`var(--font-telemetry)` / `FONT.telemetry`):
   - **Role**: All numeric readouts, coordinates, gauges, mission sub-labels, button prompts, countdown timers.
   - **Characteristics**: Monospaced tabular figures that guarantee telemetry values never jitter or jump across variable widths during high-velocity updates.

Fonts are stored locally in `/public/fonts/` (`space-grotesk-regular.ttf`, `space-grotesk-bold.ttf`, `space-mono-regular.ttf`) and pre-loaded before PixiJS graphics rasterization.

---

## 5. Motion & Easing

All motion timings are defined centrally in `MOTION` (`src/game/visuals/tokens.ts`):

- `MOTION.response` (`0.12s`): Quick damping factor for interactive visual smoothing.
- `MOTION.thrust` (`0.28s`): Lifetime of astronaut jetpack thrust particles.
- `MOTION.collection` (`0.65s`): Duration of orb collection ring expansion and score float.
- `MOTION.impact` (`0.55s`): Lifetime of hazard explosion particles and crash rings.
- `MOTION.warp` (`2.00s`): Sector transition duration (star streak acceleration and deceleration).
- `MOTION.pulse` (`2.40s`): Full breathing period of celestial energy orb glows.

### Easing Helpers:
- `easeOut(t)`: Cubic deceleration (`1 - (1 - t)^3`) ensuring crisp, impactful animation launches with gentle resting stops.
- `damp(current, target, seconds, response)`: Frame-rate independent exponential interpolation avoiding stutter across 60Hz/120Hz/144Hz displays.

---

## 6. Visual Effects (`FlightEffects`)

Special visual effects run through a bounded, high-efficiency particle manager:

- **Thrust**: Directional spark emission from the astronaut's jetpack nozzle. Emits at 45Hz when thrust is active; automatically pauses when dead or idling.
- **Collection Burst**: Triggered on `ORB_COLLECTED`. Emits an expanding cyan ring, floating `+50` score text in `Space Mono`, and a radial spray of 12 cyan/violet sparks.
- **Impact**: Triggered on `COLLISION_DETECTED` / `GAME_OVER`. Emits an expanding hazard-orange shockwave ring and 12 scattered impact sparks.
- **Warp Transition**: Triggered on `LEVEL_COMPLETE`. Radial starfield warp spray (24 high-speed sparks) and screen-center celebration ring.
- **Resource Constraints**:
  - Pool capacity: Exactly **96 pre-allocated sparks** sharing a single `GraphicsContext` circle template. Zero per-frame allocations.
  - Bursts: Maximum of **6 simultaneous burst rings**.
- **Simulation Time**: Advances exclusively through `update(seconds)`. Effects freeze on pause, resume seamlessly, and clear immediately on `reset()`.

---

## 7. Background & World Presentation

- **Atmosphere & Environment Presets**: Deep space atmosphere is defined by reusable `EnvironmentDefinition` presets (`deep-nebula`, `violet-reach`, `solar-storm`) in `src/game/environments/`. The canvas ground and 5 static radial gradient nebula clouds are managed by `RenderSystem.applyEnvironment(environmentId)`, updating background colors, nebula tints, and drift velocities without full-screen filters or duplicate atmosphere containers.
- **Parallax Stars**: 3 depth layers (close, medium, distant). Each star features unique speed, size, and alpha, parameterized with environment speed multipliers during active flight.
- **Warp Deformation**: During level transitions (`RenderSystem.beginWarp()`), star horizontal scales stretch up to `1 + 12 + layer * 10`, creating an authentic hyperspace corridor before easing back to normal.
- **Planets**: Procedural celestial bodies rendered once into static graphics upon spawn. Surface craters, atmospheric glows, and rings are drawn ahead of time; only position (`x`) and orbital rotation (`rotation`) transform during flight.
- **Orbs**: Dual-ring cosmic energy pickups with inner core shading and an outer pulsing aura driven by `MOTION.pulse`.

---

## 8. Cockpit HUD & Scoreboard

The HUD implements a **Perimeter-Anchored Avionics System**:

- **Safe Gameplay Flight Area**: The central flight corridor (60% width, 70% height) is kept strictly clear of telemetry panels to maximize obstacle visibility.
- **Scoreboard Layout**:
  - **Standard Desktop (width ≥ 620px)**: 4 perimeter corner clusters:
    - Top-center: Primary flight score with `Space Grotesk` tabular figures.
    - Top-left: Mission flight status (`MISSION / LIVE`, `ENERGY LOCKED`, `SIGNAL LOST`).
    - Top-right: Time remaining countdown with dynamic hazard tinting (cyan > 30s, amber ≤ 30s, hazard red ≤ 10s).
    - Bottom-left: Energy orb recovery counter and 10-segment LED progress bar.
    - Bottom-right: Minimal flight control prompt (`SPACE / TAP · THRUST`).
  - **Compact Mobile (width < 620px)**: Auto-condenses into a streamlined top telemetry bar with condensed indicators.
- **Truthful Telemetry**: The HUD only renders genuine state from `GameStateService`. It never hallucinates mock numbers or independent countdown timers.

---

## 9. Critical Constraint: Locked Astronaut Asset

> [!IMPORTANT]
> **The existing astronaut sprite artwork is locked.**
>
> - **DO NOT** replace, redraw, regenerate, recolor, or generate a new astronaut sprite or sprite sheet.
> - **DO NOT** replace the PNG asset in `public/assets/astro-sprite.png`.
> - **Runtime presentation enhancements ARE allowed**: Velocity pitch rotation, thruster spark emission points, death alpha fade, and warp acceleration trails.

---

## 10. Canonical Reference Files

When building new visual features or reviewing existing code, always treat these files as the authoritative implementation patterns:

- `src/game/visuals/tokens.ts` — Engine color, font, motion, and depth tokens.
- `src/styles/visual-tokens.css` — CSS color and font custom properties.
- `src/styles/visual-foundation.css` — Application-level typography and overlay foundation.
- `src/game/visuals/FlightEffects.ts` — High-performance bounded particle effects.
- `src/game/systems/renderSystem.ts` — Background atmosphere, stars, and warp presentation.
- `src/game/systems/uiSystem.ts` — Viewport-space HUD management and event bursts.
- `src/game/scoreboard.ts` — Responsive perimeter HUD telemetry rendering.
- `src/test/visual-preview.ts` — Composition-root QA preview fixture.

---

## 11. Architectural "Do Not" Rules

1. **No `@pixi/react`**: All Pixi rendering lives in plain PixiJS v8 classes; React is strictly the outer application shell.
2. **No Extra Tickers**: Never create secondary `PIXI.Ticker` instances or unmanaged `requestAnimationFrame` loops. All visual timing flows from the single `GameRuntime` ticker.
3. **No External Animation Engines**: Do not introduce GSAP, Framer Motion, or React Spring into the canvas render loop. Use `MOTION` tokens and `easeOut` / `damp` math helpers.
4. **No Generic ECS or Custom Physics Engines**: Keep systems lightweight, decoupled, and event-driven.
5. **No Uncontrolled Fullscreen Filters**: Fullscreen bloom, blur, or displacement filters destroy mobile and Electron frame rates. Use procedural gradient geometry and baked graphics contexts instead.
6. **No Simulation `setTimeout` / `setInterval`**: All gameplay sequencing and visual countdowns must use delta seconds (`deltaMS / 1000`) for deterministic pause/resume and test execution.
7. **No Competing Visual Languages**: All screens, dialogs, and components must adhere to the *Mission-Control Avionics × Holographic Spacecraft HUD* aesthetic.
