export type EnvironmentId = string;

export interface NebulaDefinition {
  /** Main ion cloud highlight color */
  primaryColor: string;
  /** Secondary atmospheric tint */
  secondaryColor: string;
  /** Optional inner color stops */
  intermediateColor1?: string;
  intermediateColor2?: string;
  /** Base opacity / intensity of nebula clouds (0 to 1) */
  intensity: number;
  /** Drift velocity multiplier for ambient motion */
  driftSpeed: number;
}

export interface StarsDefinition {
  /** Relative star count multiplier (1.0 = standard 140 stars) */
  density: number;
  /** Parallax velocity multiplier */
  speedMultiplier: number;
  /** Brightness / alpha multiplier */
  brightness: number;
}

export interface EnvironmentDefinition {
  id: EnvironmentId;
  name: string;
  /** Canvas background fill color (hex numeric, e.g. 0x070913) */
  backgroundColor: number;
  nebula: NebulaDefinition;
  stars: StarsDefinition;
}
