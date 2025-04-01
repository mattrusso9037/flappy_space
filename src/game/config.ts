// Game canvas dimensions
export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 450;

// Physics constants
export const GRAVITY = 0.5;
export const JUMP_VELOCITY = -10;
export const MAX_VELOCITY = 15;

// Game objects
export const ASTRONAUT = {
  width: 50,
  height: 50,
  startX: 150,
  startY: GAME_HEIGHT / 2,
};

export const OBSTACLE = {
  width: 80,
  gap: 170,
  minHeight: 80,
  speed: 3,
  spawnInterval: 2000, // ms
};

// Game difficulty levels
export const LEVELS = [
  { speed: 3, spawnInterval: 2000, label: "Level 1" },
  { speed: 3.5, spawnInterval: 1800, label: "Level 2" },
  { speed: 4, spawnInterval: 1600, label: "Level 3" },
  { speed: 4.5, spawnInterval: 1400, label: "Level 4" },
  { speed: 5, spawnInterval: 1200, label: "Level 5" },
];

// Score settings
export const SCORE_PER_OBSTACLE = 10;
export const POINTS_TO_NEXT_LEVEL = 100;

// Colors
export const COLORS = {
  background: 0x000033,
  stars: 0xFFFFFF,
  obstacle: 0x00AAFF,
  textBright: 0x00FFFF,
  textWarn: 0xFF8800,
};

// Debug mode
export const DEBUG_MODE = false; 