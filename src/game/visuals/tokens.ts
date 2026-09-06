/** Normalized from design.md. CSS equivalents live in src/styles/visual-tokens.css. */
export const INK = {
  void: 0x070913, hull: 0x0b1021, cyan: 0x00f0ff, ice: 0xe2f8ff,
  muted: 0x8aa6be, violet: 0xa855f7, hazard: 0xff5533, amber: 0xffb454,
} as const;
export const FONT = { display: 'Space Grotesk', telemetry: 'Space Mono' } as const;
export const DEPTH = { atmosphere: -30, stars: -20, world: 0, pilot: 10, effects: 20, hud: 30, debug: 40 } as const;
export const MOTION = { response: 0.12, thrust: 0.28, collection: 0.65, impact: 0.55, warp: 2, pulse: 2.4 } as const;
export const easeOut = (t: number): number => 1 - Math.pow(1 - Math.max(0, Math.min(1, t)), 3);
export const damp = (current: number, target: number, seconds: number, response = MOTION.response): number =>
  target + (current - target) * Math.exp(-Math.max(0, seconds) / response);
