# Flappy Spaceman Visual Design System

## Implementation Constraint: Existing Astronaut Asset Is Locked

Preserve the current astronaut sprite artwork exactly as-is during this visual overhaul.

Do not regenerate, replace, redraw, restyle, recolor, or create a new astronaut or sprite sheet.

The existing astronaut asset may only be enhanced at runtime through PixiJS transforms, motion, particles, trails, glow, lighting, filters, and other non-destructive rendering effects.

When Stitch imagery contains photographic or alternate astronaut artwork, treat it as compositional reference only. The repository's existing astronaut sprite is the sole character asset source of truth.

---

name: Orbital Telemetry HUD

colors:
  surface: '#11131d'
  surface-dim: '#11131d'
  surface-bright: '#373944'
  surface-container-lowest: '#0b0e18'
  surface-container-low: '#191b26'
  surface-container: '#1d1f2a'
  surface-container-high: '#272935'
  surface-container-highest: '#323440'
  on-surface: '#e1e1f1'
  on-surface-variant: '#b9cacb'
  inverse-surface: '#e1e1f1'
  inverse-on-surface: '#2e303b'
  outline: '#849495'
  outline-variant: '#3b494b'
  surface-tint: '#00dbe9'
  primary: '#dbfcff'
  on-primary: '#00363a'
  primary-container: '#00f0ff'
  on-primary-container: '#006970'
  inverse-primary: '#006970'
  secondary: '#ffb4a4'
  on-secondary: '#640d00'
  secondary-container: '#b41f00'
  on-secondary-container: '#ffc8bc'
  tertiary: '#fdf2ff'
  on-tertiary: '#490080'
  tertiary-container: '#eacfff'
  on-tertiary-container: '#842bd2'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#7df4ff'
  primary-fixed-dim: '#00dbe9'
  on-primary-fixed: '#002022'
  on-primary-fixed-variant: '#004f54'
  secondary-fixed: '#ffdad3'
  secondary-fixed-dim: '#ffb4a4'
  on-secondary-fixed: '#3e0500'
  on-secondary-fixed-variant: '#8d1600'
  tertiary-fixed: '#f0dbff'
  tertiary-fixed-dim: '#ddb7ff'
  on-tertiary-fixed: '#2c0051'
  on-tertiary-fixed-variant: '#6900b3'
  background: '#11131d'
  on-background: '#e1e1f1'
  surface-variant: '#323440'

typography:
  display-lg:
    fontFamily: Space Grotesk
    fontSize: 56px
    fontWeight: '700'
    lineHeight: 64px
    letterSpacing: -0.03em
  display-lg-mobile:
    fontFamily: Space Grotesk
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Space Grotesk
    fontSize: 20px
    fontWeight: '500'
    lineHeight: 28px
    letterSpacing: 0em
  body-lg:
    fontFamily: Space Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0em
  body-md:
    fontFamily: Space Grotesk
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0.01em
  telemetry-lg:
    fontFamily: Space Mono
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 28px
    letterSpacing: 0.05em
  telemetry-md:
    fontFamily: Space Mono
    fontSize: 14px
    fontWeight: '700'
    lineHeight: 18px
    letterSpacing: 0.08em
  telemetry-sm:
    fontFamily: Space Mono
    fontSize: 11px
    fontWeight: '400'
    lineHeight: 14px
    letterSpacing: 0.12em
  label-caps:
    fontFamily: Space Mono
    fontSize: 10px
    fontWeight: '700'
    lineHeight: 12px
    letterSpacing: 0.18em

rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px

spacing:
  hud-edge-xs: 0.25rem
  hud-edge-sm: 0.5rem
  hud-edge-md: 1rem
  hud-edge-lg: 1.5rem
  hud-edge-xl: 2rem
  cockpit-safe-x: 2.5rem
  cockpit-safe-y: 2rem
  reticle-gap: 0.75rem
  gauge-segment-gap: 0.125rem
  module-padding-sm: 0.75rem
  module-padding-md: 1.25rem

---

## Brand & Style

This design system channels an uncompromising synthesis of high-spec mission control avionics, holographic fighter cockpit heads-up displays (HUDs), and vibrant retro-futuristic deep-space arcade energy. Designed for high-frequency reaction gameplay, the aesthetic balances sterile, clinical telemetry precision with high-chroma cosmic energy orbs and visceral warning indicators.

The target audience spans competitive arcade gamers, sci-fi enthusiasts, and mobile/desktop players who value razor-sharp feedback and immersion. The interface evokes a spacecraft cockpit / mission-control HUD surrounding the gameplay field: extreme tension, crisp instrument readouts, hyper-responsive mechanics, and the vast, beautiful desolation of the void.

Visually, the style merges **tactical glassmorphism** with **high-contrast cybernetic HUD brutalism**:

- Deep void backdrops layered with subtle star-density noise and cosmic nebula radiation.
- Razor-thin 1px phosphorescent stroke borders, chamfered edge brackets, and technical reticle lines.
- Segmented radial tachometers, vector trajectory ribbons, and pitch ladders that frame the action without encroaching on central flight corridors.
- High-luminance neon emissive states that flash and pulse on critical game events (fuel depletion, collision proximity, hyper-speed surges).

## Colors

The color palette is rooted in an abyss-level void architecture, punctuated by luminous holographic phosphor layers and energetic status triggers.

- **Primary (`#00F0FF` - Holographic Cyan)**: The foundational instrument wavelength. Used for primary telemetry brackets, flight path reticles, altitude meters, active button strokes, and positive system states. Accompanied by sub-surface glow variations down to `#38BDF8`.
- **Secondary (`#FF5533` - Warning Thruster Orange / Hazard Alert)**: Derived from aerospace hazard markings and emergency thruster ignitions. Used for critical warnings, fuel deficits, collision envelopes, countdown markers, and primary call-to-action triggers.
- **Tertiary (`#A855F7` - Nebula Ion Violet)**: Represents cosmic energy pickups, shield matrix barriers, and high-multiplier score conduits. Supported by companion orb frequencies: Toxic Emerald (`#10B981`) and Plasma Cyan (`#22D3EE`).
- **Neutral (`#070913` - Deep Space Void)**: The absolute foundation. Layered through stepped translucent glass tones:
  - Surface Void: `#070913` (canvas ground)
  - Surface Hull / Base: `#0B1021` (elevated cockpit panels)
  - Surface Glass: `rgba(11, 16, 33, 0.72)` (semi-transparent telemetry overlays)
  - Panel Border: `rgba(0, 240, 255, 0.24)` (de-emphasized wireframe frames)
  - Text Primary: `#E2F8FF` (crisp ice-white phosphor)
  - Text Muted: `#527299` (de-prioritized telemetry metadata)

## Typography

The typographic engine balances rapid human pattern recognition with tactical flight avionics.

- **Display & Headings (`Space Grotesk`)**: Geometric, sharp, and confident. Used for high-level scoring, module titles, game status states, and modal dialogs. The wide apertures and futuristic terminals provide high readability under intense visual motion.
- **Data Readouts & HUD Instrumentation (`Space Mono`)**: Used for all numerical values, coordinates, velocity readouts, altitude deltas, oxygen gauges, and system logs. Monospaced tabular alignment guarantees numbers never jitter or jump across variable widths during high-velocity updates.
- **Casing & Hierarchy**: All technical metadata, flight tags, and HUD sub-labels must be styled with `label-caps` in uppercase with wide letter tracking (`0.12em` to `0.18em`) to mimic retro-futuristic CRT and flight recorder displays.

## Layout & Spacing

The layout model adheres to a **Perimeter-Anchored Avionics System**. The central flight corridor (an elliptical safe area of 60% viewport width and 70% viewport height) remains strictly unobstructed to maximize spatial awareness and gameplay clarity.

- **Corner Anchor Hubs**:
  - **Top-Left (Telemetry & System Life)**: Monospaced thrust velocity, current score, distance traversed, and emergency thruster reserve gauges.
  - **Top-Right (Mission & Comms)**: Session multiplier, orb collection inventory counters, and pause/system toggles.
  - **Bottom-Left (Orbital Radar & Threat Array)**: Proximity radar sweep, celestial gravity-well indicators, and hazard warning pings.
  - **Bottom-Right (Flight Vector & Attitude)**: Pitch ladder angles, apogee indicator, and boost recharge banks.
- **Flight Trajectory Safe Margin**: In active gameplay, edge margins scale dynamically (`cockpit-safe-x` and `cockpit-safe-y`). On mobile breakpoints (`< 768px`), corner clusters condense into single-line horizontal brackets along the top and bottom perimeters.
- **Segmented Micro-Spacing**: Progress bars, propellant bars, and multiplier gauges use a rhythmic `gauge-segment-gap` (2px) pattern to emulate physical light-emitting LED readouts.

## Elevation & Depth

Visual hierarchy does not rely on traditional diffuse drop shadows. Instead, depth is produced via **chromatic luminescence, translucent dark-glass refraction, and phosphor radiance**:

- **Ground Zero (Cosmic Canvas)**: Absolute deep space (`#070913`), featuring subtle parallax particulate dust and distant celestial bodies.
- **Layer 1 (Cockpit Canopy / HUD Substrate)**: A full-bleed vignette overlay with very soft edge falloff (`radial-gradient(ellipse at center, transparent 65%, rgba(7, 9, 19, 0.8) 100%)`) and an ultra-subtle 1px scanline effect (`linear-gradient(rgba(0, 240, 255, 0.015) 50%, transparent 50%)`).
- **Layer 2 (Holographic Paneling)**: Glass modules built with `rgba(11, 16, 33, 0.65)` backdrops and `backdrop-filter: blur(12px)`. Outlined with razor-thin 1px borders colored in `rgba(0, 240, 255, 0.25)` or `rgba(255, 85, 51, 0.25)`. Inner edge beveling uses `box-shadow: inset 0 0 16px rgba(0, 240, 255, 0.08)`.
- **Layer 3 (Active Instrumentation & Reticles)**: Crisp foreground vector graphics illuminated by dual phosphor glows (`drop-shadow(0 0 6px rgba(0, 240, 255, 0.65)) drop-shadow(0 0 16px rgba(0, 240, 255, 0.35))`).
- **Layer 4 (Critical Threat & Energy Overdrive)**: Emergency and hyper-charge overlays emit a pulsating amber/red edge flash (`box-shadow: inset 0 0 32px rgba(255, 85, 51, 0.45)`) paired with high-frequency telemetry alerts.

## Shapes

The shape vocabulary is sharp, technical, and engineered, maintaining a `Soft` baseline (0.25rem / 4px) combined with angular 45-degree chamfers on modular cockpit enclosures.

- **Chamfered Corners**: HUD panels, weapon/shield chips, and flight computers use 8px to 12px cut corners (`clip-path: polygon(0 8px, 8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px))`) to reinforce military aerospace construction.
- **Reticle Brackets**: L-shaped targeting brackets frame corner clusters, using exact 1px lines that extend 12px horizontally and vertically.
- **Orb & Celestial Geometries**: Pickups, gravity anomalies, and celestial bodies maintain perfect circular curvature (`rounded-full`), counterbalancing the sharp, angular avionics with organic, radiant planetary silhouettes.

## Components

### Buttons & Action Triggers

- **Primary Flight Action (Cyan Engine Launch)**: High-translucency background `rgba(0, 240, 255, 0.12)`, 1px solid `#00F0FF` border, text styled in `Space Grotesk` uppercase bold. Inner glow of `inset 0 0 12px rgba(0, 240, 255, 0.3)`. Hover state increases background opacity to `0.28` with an expanded outer cyan bloom (`0 0 20px rgba(0, 240, 255, 0.6)`).
- **Hazard / Abort Action (Thruster Alert)**: Background `rgba(255, 85, 51, 0.12)`, border `#FF5533`, amber glow. Used for emergency airlock release, game reset, and hard maneuvers.
- **Micro HUD Actions**: Minimal corner-bracketed triggers (`32px x 32px`) containing monospaced icon glyphs with 1px border frames.

### Telemetry Cards & Module Enclosures

- Semi-transparent glass (`rgba(11, 16, 33, 0.75)`), 4px border radius with upper-right chamfer.
- 1px crisp outline in `rgba(0, 240, 255, 0.2)`.
- Header bar features a continuous horizontal hairline with a micro terminal status dot (`#00F0FF` or `#10B981` blinking indicator) and uppercase technical label (`label-caps`).

### Segmented Gauges & Progress Bars

- Constructed from discrete rectangular ticks rather than continuous fills.
- 16 to 24 individual segments separated by 2px gaps.
- Active segments carry the dominant phosphor glow (`#00F0FF` for propellant, `#FF5533` for heat/critical stress), while dormant segments sit at a subdued `rgba(255, 255, 255, 0.08)`.

### HUD Badges & Flight Chips

- Compact inline readouts for multipliers (`3.5x`), fuel levels (`O2: 94%`), and coordinates.
- Padded with `0.25rem 0.6rem`, using `Space Mono` typography, wrapped in a 1px border tinted to its semantic state (Cyan, Violet, or Amber).

### Selection & Input Controls

- **Radio & Toggle Pins**: Hexagonal or diamond-shaped reticle marks that illuminate with an intense core dot upon active selection.
- **Monospace Text Inputs**: Terminal-style input fields with dark glass backgrounds, `#00F0FF` focus strokes, and a constant blinking cursor block (`▋`).

### Reticle Overlays & Trajectory Arcs

- Dotted ballistic trajectory lines rendered in low-opacity cyan.
- Dynamic crosshairs with variable spread: tight crossbars during stable flight, expanding outward with red bracket warnings when approaching celestial obstacles.
