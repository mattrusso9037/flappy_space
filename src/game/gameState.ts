import * as PIXI from 'pixi.js';
import { LEVELS, GAME_WIDTH, GAME_HEIGHT, ASTRONAUT, OBSTACLE } from './config';
import { Astronaut, Obstacle, Planet, Star, Orb } from './entities';
import { createGameLoop, TickerTime } from './gameLoop';
import audioManager from './audio';
import assetManager from './assetManager';
import inputManager, { InputEvent } from './inputManager';

export interface GameState {
  score: number;
  level: number;
  warps: number;
  time: number;
  orbsCollected: number;
  orbsRequired: number;
  timeLimit: number;
  timeRemaining: number;
  isStarted: boolean;
  isGameOver: boolean;
  isLevelComplete: boolean;
}

export class GameManager {
  app: PIXI.Application;
  astronaut: Astronaut | null;
  obstacles: Obstacle[];
  orbs: Orb[];
  stars: Star[];
  state: GameState;
  lastObstacleTime: number;
  lastOrbTime: number;
  updateCallback: (state: GameState) => void;
  private jumpHandler: () => void;
  
  constructor(app: PIXI.Application, updateCallback: (state: GameState) => void) {
    this.app = app;
    this.astronaut = null;
    this.obstacles = [];
    this.orbs = [];
    this.stars = [];
    this.lastObstacleTime = 0;
    this.lastOrbTime = 0;
    this.updateCallback = updateCallback;
    
    const currentLevel = LEVELS[0]; // Start with level 1
    
    this.state = {
      score: 0,
      level: 1,
      warps: 0,
      time: 0,
      orbsCollected: 0,
      orbsRequired: currentLevel.orbsRequired,
      timeLimit: currentLevel.timeLimit,
      timeRemaining: currentLevel.timeLimit,
      isStarted: false,
      isGameOver: false,
      isLevelComplete: false
    };
    
    // Setup game ticker with the game loop module
    const gameLoop = createGameLoop(this);
    this.app.ticker.add((time) => gameLoop(time));
    
    // Setup input handling
    this.jumpHandler = this.flap.bind(this);
    inputManager.on(InputEvent.JUMP, this.jumpHandler);
  }
  
  setupGame() {
    this.clearStage();
    this.createBackground();
    
    // Load astronaut texture from asset manager
    const astronautTexture = assetManager.getTexture('astronaut');
    this.astronaut = new Astronaut(
      astronautTexture, 
      ASTRONAUT.startX, 
      ASTRONAUT.startY
    );
    this.app.stage.addChild(this.astronaut.sprite);
    
    const currentLevel = LEVELS[0]; // Start with level 1
    
    // Reset state
    this.state = {
      score: 0,
      level: 1,
      warps: 0,
      time: 0,
      orbsCollected: 0,
      orbsRequired: currentLevel.orbsRequired,
      timeLimit: currentLevel.timeLimit,
      timeRemaining: currentLevel.timeLimit,
      isStarted: false,
      isGameOver: false,
      isLevelComplete: false
    };
    
    this.obstacles = [];
    this.orbs = [];
    this.lastObstacleTime = 0;
    this.lastOrbTime = 0;
    
    // Update UI
    this.updateCallback(this.state);
  }
  
  startGame() {
    if (!this.astronaut) this.setupGame();
    
    this.state.isStarted = true;
    this.state.isGameOver = false;
    this.state.isLevelComplete = false;
    
    // Initialize audio on user interaction
    audioManager.initialize();
    
    // Enable input handling
    inputManager.enable();
    
    // Update UI
    this.updateCallback(this.state);
  }
  
  gameOver() {
    this.state.isGameOver = true;
    this.state.isStarted = false;
    
    // Play hit sound
    audioManager.play('hit');
    
    // Disable input handling during game over
    inputManager.disable();
    
    // Update UI
    this.updateCallback(this.state);
  }
  
  levelComplete() {
    if (this.state.level >= LEVELS.length) {
      // Win the game if all levels are completed
      this.gameOver();
      return;
    }
    
    this.state.isLevelComplete = true;
    this.state.level++;
    this.state.warps++;
    
    // Update level requirements
    const currentLevel = LEVELS[this.state.level - 1];
    this.state.orbsRequired = currentLevel.orbsRequired;
    this.state.orbsCollected = 0; // Reset orbs collected
    this.state.timeLimit = currentLevel.timeLimit;
    this.state.timeRemaining = currentLevel.timeLimit;
    
    // Play level up sound
    audioManager.play('levelUp');
    
    // Clear obstacles and orbs
    this.clearEntities();
    
    // Update UI
    this.updateCallback(this.state);
    
    // Reset level complete flag after a delay
    setTimeout(() => {
      this.state.isLevelComplete = false;
      this.updateCallback(this.state);
    }, 3000);
  }
  
  flap() {
    if (!this.astronaut || this.state.isGameOver || !this.state.isStarted) return;
    this.astronaut.flap();
    
    // Play jump sound
    audioManager.play('jump');
  }
  
  dispose() {
    // Remove event listeners and clean up resources when component unmounts
    inputManager.off(InputEvent.JUMP, this.jumpHandler);
    
    // Clean up any other resources to prevent memory leaks
    this.clearEntities();
    this.stars.forEach(star => {
      this.app.stage.removeChild(star.graphics);
    });
    this.stars = [];
    
    if (this.astronaut) {
      this.app.stage.removeChild(this.astronaut.sprite);
      this.astronaut = null;
    }
  }
  
  spawnObstacle(speed: number) {
    // Get current level settings
    const currentLevel = LEVELS[this.state.level - 1];
    
    // Generate random parameters for planets
    const minRadius = 20;
    const maxRadius = 40 + (this.state.level * 5); // Planets get bigger with level
    const radius = minRadius + Math.random() * (maxRadius - minRadius);
    
    // Calculate a random position that leaves enough space for the player to pass through
    const safeZoneSize = GAME_HEIGHT * 0.4; // 40% of the screen height is safe
    const safeZoneY = GAME_HEIGHT * 0.2 + Math.random() * (GAME_HEIGHT * 0.6); // Position the safe zone randomly
    
    // 50% chance to place a planet above or below the safe zone
    const positionAbove = Math.random() > 0.5;
    
    let planetY;
    if (positionAbove) {
      // Position above safe zone (from top of screen to top of safe zone)
      planetY = Math.random() * (safeZoneY - radius * 2) + radius;
    } else {
      // Position below safe zone (from bottom of safe zone to bottom of screen)
      planetY = safeZoneY + safeZoneSize + Math.random() * (GAME_HEIGHT - (safeZoneY + safeZoneSize) - radius * 2) + radius;
    }
    
    // Create the planet
    const planet = new Planet(
      GAME_WIDTH + radius,  // Start off-screen to the right
      planetY,              // Random Y position
      radius,               // Random size
      speed                 // Movement speed
    );
    
    // 30% chance to spawn a second planet (if the level is high enough)
    if (Math.random() < 0.3 && this.state.level > 1) {
      // Make sure the second planet is in the opposite area (if first is above, second is below)
      const secondPlanetY = positionAbove 
        ? safeZoneY + safeZoneSize + Math.random() * (GAME_HEIGHT - (safeZoneY + safeZoneSize) - radius * 2) + radius
        : Math.random() * (safeZoneY - radius * 2) + radius;
      
      const secondPlanet = new Planet(
        GAME_WIDTH + radius + Math.random() * 100,  // Slight horizontal offset
        secondPlanetY,
        radius * (0.7 + Math.random() * 0.6),      // Slightly smaller or larger
        speed
      );
      
      // Add the glow first (so it's behind the planet)
      this.app.stage.addChild(secondPlanet.glowGraphics);
      // Then add the planet itself
      this.app.stage.addChild(secondPlanet.graphics);
      this.obstacles.push(secondPlanet);
    }
    
    // Add the glow first (so it's behind the planet)
    this.app.stage.addChild(planet.glowGraphics);
    // Then add the planet itself
    this.app.stage.addChild(planet.graphics);
    this.obstacles.push(planet);
  }
  
  private clearStage() {
    while (this.app.stage.children.length > 0) {
      this.app.stage.removeChildAt(0);
    }
  }
  
  private createBackground() {
    // Create stars in multiple layers for parallax effect
    this.stars = [];
    
    // Layer 0: Background distant stars (many small ones)
    for (let i = 0; i < 80; i++) {
      const star = new Star(
        Math.random() * GAME_WIDTH,
        Math.random() * GAME_HEIGHT,
        Math.random() * 1 + 0.5, // Smaller size
        Math.random() * 0.5 + 0.2, // Lower alpha
        0 // Background layer
      );
      this.stars.push(star);
      this.app.stage.addChild(star.graphics);
    }
    
    // Layer 1: Middle distance stars
    for (let i = 0; i < 40; i++) {
      const star = new Star(
        Math.random() * GAME_WIDTH,
        Math.random() * GAME_HEIGHT,
        Math.random() * 1.5 + 1, // Medium size
        Math.random() * 0.6 + 0.3, // Medium alpha
        1 // Middle layer
      );
      this.stars.push(star);
      this.app.stage.addChild(star.graphics);
    }
    
    // Layer 2: Foreground stars (fewer, brighter, faster)
    for (let i = 0; i < 20; i++) {
      const star = new Star(
        Math.random() * GAME_WIDTH,
        Math.random() * GAME_HEIGHT,
        Math.random() * 2 + 1.5, // Larger size
        Math.random() * 0.7 + 0.4, // Higher alpha
        2 // Foreground layer
      );
      this.stars.push(star);
      this.app.stage.addChild(star.graphics);
    }
  }
  
  clearEntities() {
    // Clear obstacles
    this.obstacles.forEach(obstacle => {
      // Check what type of obstacle it is and remove its display objects
      if ('graphics' in obstacle) {
        // For Planet, Orb and other single-graphics obstacles
        this.app.stage.removeChild((obstacle as any).graphics);
        // Also remove the glow graphics if present
        if ('glowGraphics' in obstacle) {
          this.app.stage.removeChild((obstacle as any).glowGraphics);
        }
      } else if ('topPipe' in obstacle && 'bottomPipe' in obstacle) {
        // For PipeObstacle with top and bottom pipes
        this.app.stage.removeChild((obstacle as any).topPipe);
        this.app.stage.removeChild((obstacle as any).bottomPipe);
      }
    });
    this.obstacles = [];
    
    // Clear orbs
    this.orbs.forEach(orb => {
      this.app.stage.removeChild(orb.graphics);
      this.app.stage.removeChild(orb.glowGraphics);
    });
    this.orbs = [];
  }
  
  spawnOrb(speed: number) {
    // Generate random parameters for orbs
    const radius = 12 + Math.random() * 6; // Smaller than planets
    
    // Calculate a random position that's easier to reach
    const minY = GAME_HEIGHT * 0.2;
    const maxY = GAME_HEIGHT * 0.8;
    const orbY = minY + Math.random() * (maxY - minY);
    
    // Create the orb
    const orb = new Orb(
      GAME_WIDTH + radius,  // Start off-screen to the right
      orbY,                 // Random Y position
      radius,               // Size
      speed                 // Movement speed (same as obstacles)
    );
    
    // Add the glow first (so it's behind the orb)
    this.app.stage.addChild(orb.glowGraphics);
    // Then add the orb itself
    this.app.stage.addChild(orb.graphics);
    this.orbs.push(orb);
  }
  
  checkLevelTimer() {
    // Check if time has run out
    if (this.state.timeRemaining <= 0) {
      console.log('Time ran out!');
      this.astronaut?.die();
      this.gameOver();
      return true;
    }
    
    // Check if player collected enough orbs
    if (this.state.orbsCollected >= this.state.orbsRequired) {
      console.log('Level complete! Collected all required orbs.');
      this.levelComplete();
      return true;
    }
    
    return false;
  }
} 