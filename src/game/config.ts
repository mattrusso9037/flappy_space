// Game canvas dimensions
export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 450;

// Physics constants
export const GRAVITY = 0.25;
export const JUMP_VELOCITY = -7;
export const MAX_VELOCITY = 10;

// Game objects
export const ASTRONAUT = {
  width: 50,
  height: 50,
  startX: 150,
  startY: GAME_HEIGHT / 2 - 50,
};

export const OBSTACLE = {
  width: 80,
  gap: 200,
  minHeight: 70,
  speed: 2.5,
  spawnInterval: 2500,
};

// Game difficulty levels
export const LEVELS = [
  { speed: 2.5, spawnInterval: 2500, label: "Level 1", orbsRequired: 5, timeLimit: 60000 },
  { speed: 3, spawnInterval: 2200, label: "Level 2", orbsRequired: 8, timeLimit: 60000 },
  { speed: 3.5, spawnInterval: 2000, label: "Level 3", orbsRequired: 12, timeLimit: 70000 },
  { speed: 4, spawnInterval: 1800, label: "Level 4", orbsRequired: 15, timeLimit: 70000 },
  { speed: 4.5, spawnInterval: 1600, label: "Level 5", orbsRequired: 20, timeLimit: 80000 },
];

// Score settings
export const SCORE_PER_OBSTACLE = 10;
export const POINTS_TO_NEXT_LEVEL = 100;
export const ORB_POINTS = 50;
export const ORB_SPAWN_CHANCE = 0.3; // 30% chance to spawn an orb

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