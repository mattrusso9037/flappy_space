import * as PIXI from 'pixi.js';
import { LEVELS, GAME_WIDTH, GAME_HEIGHT, ASTRONAUT, OBSTACLE } from './config';
import { Astronaut } from './entities/Astronaut';
import { Obstacle } from './entities/Obstacle';
import { Planet } from './entities/Planet';
import { Star } from './entities/Star';
import { Orb } from './entities/Orb';
import { createGameLoop, TickerTime } from './gameLoop';
import audioManager from './audio';
import assetManager from './assetManager';
import inputManager, { InputEvent } from './inputManager';
import { Scoreboard } from './scoreboard';

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
  debugMode: boolean;
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
  private debugGraphics: PIXI.Graphics;
  scoreboard: Scoreboard;
  
  constructor(app: PIXI.Application, updateCallback: (state: GameState) => void) {
    this.app = app;
    this.astronaut = null;
    this.obstacles = [];
    this.orbs = [];
    this.stars = [];
    this.lastObstacleTime = 0;
    this.lastOrbTime = 0;
    this.updateCallback = updateCallback;
    
    this.debugGraphics = new PIXI.Graphics();
    this.app.stage.addChild(this.debugGraphics);
    
    // Initialize scoreboard
    this.scoreboard = new Scoreboard();
    this.app.stage.addChild(this.scoreboard.getContainer());
    
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
      isLevelComplete: false,
      debugMode: false
    };
    
    const gameLoop = createGameLoop(this);
    this.app.ticker.add((time) => gameLoop(time));
    
    this.jumpHandler = this.flap.bind(this);
    inputManager.on(InputEvent.JUMP, this.jumpHandler);
    
    // Add spacebar handler for game start
    document.addEventListener('keydown', (e) => {
      if (e.key === ' ' && !this.state.isStarted && !this.state.isGameOver) {
        this.startGame();
      } else if (e.key === 'd' || e.key === 'D') {
        this.toggleDebugMode();
      }
    });
  }
  
  toggleDebugMode() {
    this.state.debugMode = !this.state.debugMode;
    console.log('Debug mode:', this.state.debugMode ? 'ON' : 'OFF');
    this.updateCallback({ ...this.state });
  }
  
  renderDebugInfo() {
    if (!this.state.debugMode) {
      this.debugGraphics.clear();
      return;
    }
    
    this.debugGraphics.clear();
    
    if (this.astronaut) {
      const spriteBounds = this.astronaut.sprite.getBounds();
      this.debugGraphics.lineStyle(1, 0xFFFF00, 0.5);
      this.debugGraphics.drawRect(
        spriteBounds.minX,
        spriteBounds.minY,
        spriteBounds.maxX - spriteBounds.minX,
        spriteBounds.maxY - spriteBounds.minY
      );
      
      const astronautBounds = this.astronaut.getHitbox();
      this.debugGraphics.lineStyle(2, 0x00FF00);
      this.debugGraphics.drawRect(
        astronautBounds.minX,
        astronautBounds.minY,
        astronautBounds.maxX - astronautBounds.minX,
        astronautBounds.maxY - astronautBounds.minY
      );
    }
    
    for (const obstacle of this.obstacles) {
      if (obstacle instanceof Planet) {
        this.debugGraphics.lineStyle(2, 0xFF0000);
        
        const planetBounds = new PIXI.Bounds();
        planetBounds.minX = obstacle.x - obstacle.radius;
        planetBounds.maxX = obstacle.x + obstacle.radius;
        planetBounds.minY = obstacle.y - obstacle.radius;
        planetBounds.maxY = obstacle.y + obstacle.radius;
        
        this.debugGraphics.drawRect(
          planetBounds.minX,
          planetBounds.minY,
          planetBounds.maxX - planetBounds.minX,
          planetBounds.maxY - planetBounds.minY
        );
      } else if (obstacle instanceof Orb) {
        this.debugGraphics.lineStyle(2, 0x0000FF);
        
        const orbBounds = new PIXI.Bounds();
        orbBounds.minX = obstacle.x - obstacle.radius;
        orbBounds.maxX = obstacle.x + obstacle.radius;
        orbBounds.minY = obstacle.y - obstacle.radius;
        orbBounds.maxY = obstacle.y + obstacle.radius;
        
        this.debugGraphics.drawRect(
          orbBounds.minX,
          orbBounds.minY,
          orbBounds.maxX - orbBounds.minX,
          orbBounds.maxY - orbBounds.minY
        );
      }
    }
  }
  
  setupGame() {
    this.clearStage();
    this.createBackground();
    
    const astronautTexture = assetManager.getTexture('astronaut');
    this.astronaut = new Astronaut(
      astronautTexture, 
      ASTRONAUT.startX, 
      ASTRONAUT.startY
    );
    this.app.stage.addChild(this.astronaut.sprite);
    
    this.app.stage.removeChild(this.debugGraphics);
    this.debugGraphics.clear();
    this.app.stage.addChild(this.debugGraphics);
    
    // Re-add scoreboard
    this.app.stage.addChild(this.scoreboard.getContainer());
    
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
      isLevelComplete: false,
      debugMode: this.state.debugMode
    };
    
    this.obstacles = [];
    this.orbs = [];
    this.lastObstacleTime = 0;
    this.lastOrbTime = 0;
    
    // Update scoreboard with initial state
    this.scoreboard.update(
      this.state.score,
      this.state.level,
      this.state.orbsCollected,
      this.state.orbsRequired,
      this.state.timeRemaining
    );
    
    this.updateCallback(this.state);
  }
  
  startGame() {
    if (!this.astronaut) this.setupGame();
    
    this.state.isStarted = true;
    this.state.isGameOver = false;
    this.state.isLevelComplete = false;
    
    audioManager.initialize();
    
    inputManager.enable();
    
    this.updateCallback(this.state);
  }
  
  gameOver() {
    this.state.isGameOver = true;
    this.state.isStarted = false;
    
    audioManager.play('hit');
    
    inputManager.disable();
    
    this.updateCallback(this.state);
  }
  
  levelComplete() {
    if (this.state.level >= LEVELS.length) {
      this.gameOver();
      return;
    }
    
    this.state.isLevelComplete = true;
    this.state.level++;
    this.state.warps++;
    
    const currentLevel = LEVELS[this.state.level - 1];
    this.state.orbsRequired = currentLevel.orbsRequired;
    this.state.orbsCollected = 0;
    this.state.timeLimit = currentLevel.timeLimit;
    this.state.timeRemaining = currentLevel.timeLimit;
    
    audioManager.play('levelUp');
    
    this.clearEntities();
    
    this.updateCallback(this.state);
    
    setTimeout(() => {
      this.state.isLevelComplete = false;
      this.updateCallback(this.state);
    }, 3000);
  }
  
  flap() {
    if (!this.astronaut || this.state.isGameOver || !this.state.isStarted) return;
    this.astronaut.flap();
    
    audioManager.play('jump');
  }
  
  dispose() {
    inputManager.off(InputEvent.JUMP, this.jumpHandler);
    
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
    const currentLevel = LEVELS[this.state.level - 1];
    
    const minRadius = 20;
    const maxRadius = 40 + (this.state.level * 5);
    const radius = minRadius + Math.random() * (maxRadius - minRadius);
    
    const safeZoneSize = GAME_HEIGHT * 0.4;
    const safeZoneY = GAME_HEIGHT * 0.2 + Math.random() * (GAME_HEIGHT * 0.6);
    
    const positionAbove = Math.random() > 0.5;
    
    let planetY;
    if (positionAbove) {
      planetY = Math.random() * (safeZoneY - radius * 2) + radius;
    } else {
      planetY = safeZoneY + safeZoneSize + Math.random() * (GAME_HEIGHT - (safeZoneY + safeZoneSize) - radius * 2) + radius;
    }
    
    // Create the first planet
    const planet = new Planet(
      GAME_WIDTH + radius,
      planetY,
      radius,
      speed
    );
    
    // Check for overlaps with existing obstacles and adjust position if needed
    this.ensureNoOverlap(planet);
    
    // Add the first planet to obstacles and the stage
    this.app.stage.addChild(planet.glowGraphics);
    this.app.stage.addChild(planet.graphics);
    this.obstacles.push(planet);
    
    // Spawn a second planet with a probability
    if (Math.random() < 0.3 && this.state.level > 1) {
      // Determine the second planet's vertical position
      const secondPlanetY = positionAbove 
        ? safeZoneY + safeZoneSize + Math.random() * (GAME_HEIGHT - (safeZoneY + safeZoneSize) - radius * 2) + radius
        : Math.random() * (safeZoneY - radius * 2) + radius;
      
      // Calculate radius for second planet
      const secondRadius = radius * (0.7 + Math.random() * 0.6);
      
      // Create the second planet with a horizontal offset
      const secondPlanet = new Planet(
        GAME_WIDTH + radius + 100 + Math.random() * 150, // Ensure horizontal spacing
        secondPlanetY,
        secondRadius,
        speed
      );
      
      // Check for overlaps with all existing obstacles including the first planet
      this.ensureNoOverlap(secondPlanet);
      
      this.app.stage.addChild(secondPlanet.glowGraphics);
      this.app.stage.addChild(secondPlanet.graphics);
      this.obstacles.push(secondPlanet);
    }
  }
  
  // Utility function to check if two planets overlap
  private planetsOverlap(planet1: Planet, planet2: Planet): boolean {
    // Calculate the distance between planet centers
    const dx = planet2.x - planet1.x;
    const dy = planet2.y - planet1.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // If the distance is less than the sum of radii (plus some buffer space)
    // then planets overlap
    const minSeparation = planet1.radius + planet2.radius + 10; // 10px buffer
    
    return distance < minSeparation;
  }
  
  // Function to ensure a planet doesn't overlap with any existing obstacles
  private ensureNoOverlap(planet: Planet): void {
    // Maximum attempts to find a non-overlapping position
    const maxAttempts = 5;
    let attempts = 0;
    let overlapping = false;
    
    do {
      overlapping = false;
      
      // Check if this planet overlaps with any existing obstacles
      for (const obstacle of this.obstacles) {
        // Only check obstacles that are planets and still on screen
        if (obstacle instanceof Planet && !obstacle.isOffScreen()) {
          const existingPlanet = obstacle as Planet;
          
          if (this.planetsOverlap(planet, existingPlanet)) {
            overlapping = true;
            
            // Adjust vertical position to avoid overlap
            if (planet.y < existingPlanet.y) {
              // New planet is above existing, move it further up
              planet.y = Math.max(
                planet.radius, // Keep within game bounds
                existingPlanet.y - existingPlanet.radius - planet.radius - 20 // Add spacing
              );
            } else {
              // New planet is below existing, move it further down
              planet.y = Math.min(
                GAME_HEIGHT - planet.radius, // Keep within game bounds
                existingPlanet.y + existingPlanet.radius + planet.radius + 20 // Add spacing
              );
            }
            
            // If we've made too many attempts, try changing horizontal position
            if (attempts > 2) {
              // Move the planet a bit further to the right
              planet.x += planet.radius * 1.2;
            }
            
            // Update graphics position
            planet.graphics.y = planet.y;
            planet.glowGraphics.y = planet.y;
            planet.graphics.x = planet.x;
            planet.glowGraphics.x = planet.x;
            
            // Break to recheck with the new position
            break;
          }
        }
      }
      
      attempts++;
    } while (overlapping && attempts < maxAttempts);
  }
  
  private clearStage() {
    while (this.app.stage.children.length > 0) {
      this.app.stage.removeChildAt(0);
    }
  }
  
  private createBackground() {
    this.stars = [];
    
    for (let i = 0; i < 80; i++) {
      const star = new Star(
        Math.random() * GAME_WIDTH,
        Math.random() * GAME_HEIGHT,
        Math.random() * 1 + 0.5,
        Math.random() * 0.5 + 0.2,
        0
      );
      this.stars.push(star);
      this.app.stage.addChild(star.graphics);
    }
    
    for (let i = 0; i < 40; i++) {
      const star = new Star(
        Math.random() * GAME_WIDTH,
        Math.random() * GAME_HEIGHT,
        Math.random() * 1.5 + 1,
        Math.random() * 0.6 + 0.3,
        1
      );
      this.stars.push(star);
      this.app.stage.addChild(star.graphics);
    }
    
    for (let i = 0; i < 20; i++) {
      const star = new Star(
        Math.random() * GAME_WIDTH,
        Math.random() * GAME_HEIGHT,
        Math.random() * 2 + 1.5,
        Math.random() * 0.7 + 0.4,
        2
      );
      this.stars.push(star);
      this.app.stage.addChild(star.graphics);
    }
  }
  
  clearEntities() {
    this.obstacles.forEach(obstacle => {
      if ('graphics' in obstacle) {
        this.app.stage.removeChild((obstacle as any).graphics);
        if ('glowGraphics' in obstacle) {
          this.app.stage.removeChild((obstacle as any).glowGraphics);
        }
      } else if ('topPipe' in obstacle && 'bottomPipe' in obstacle) {
        this.app.stage.removeChild((obstacle as any).topPipe);
        this.app.stage.removeChild((obstacle as any).bottomPipe);
      }
    });
    this.obstacles = [];
    
    this.orbs.forEach(orb => {
      this.app.stage.removeChild(orb.graphics);
      this.app.stage.removeChild(orb.glowGraphics);
    });
    this.orbs = [];
  }
  
  spawnOrb(speed: number) {
    const radius = 12 + Math.random() * 6;
    
    const minY = GAME_HEIGHT * 0.2;
    const maxY = GAME_HEIGHT * 0.8;
    const orbY = minY + Math.random() * (maxY - minY);
    
    const orb = new Orb(
      GAME_WIDTH + radius,
      orbY,
      radius,
      speed
    );
    
    this.app.stage.addChild(orb.glowGraphics);
    this.app.stage.addChild(orb.graphics);
    this.orbs.push(orb);
  }
  
  checkLevelTimer() {
    if (this.state.timeRemaining <= 0) {
      console.log('Time ran out!');
      this.astronaut?.die();
      this.gameOver();
      return true;
    }
    
    if (this.state.orbsCollected >= this.state.orbsRequired) {
      console.log('Level complete! Collected all required orbs.');
      this.levelComplete();
      return true;
    }
    
    return false;
  }
} 