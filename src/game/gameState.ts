import * as PIXI from 'pixi.js';
import { LEVELS, SCORE_PER_OBSTACLE, POINTS_TO_NEXT_LEVEL, GAME_WIDTH, GAME_HEIGHT, ASTRONAUT, OBSTACLE } from './config';
import { Astronaut, Obstacle, Star } from './gameObjects';
import audioManager from './audio';

export interface GameState {
  score: number;
  level: number;
  warps: number;
  time: number;
  isStarted: boolean;
  isGameOver: boolean;
  isLevelComplete: boolean;
}

export class GameManager {
  app: PIXI.Application;
  astronaut: Astronaut | null;
  obstacles: Obstacle[];
  stars: Star[];
  state: GameState;
  lastObstacleTime: number;
  updateCallback: (state: GameState) => void;
  
  constructor(app: PIXI.Application, updateCallback: (state: GameState) => void) {
    this.app = app;
    this.astronaut = null;
    this.obstacles = [];
    this.stars = [];
    this.lastObstacleTime = 0;
    this.updateCallback = updateCallback;
    
    this.state = {
      score: 0,
      level: 1,
      warps: 0,
      time: 0,
      isStarted: false,
      isGameOver: false,
      isLevelComplete: false
    };
    
    // Setup game ticker with the correct callback signature
    this.app.ticker.add(() => {
      this.gameLoop();
    });
  }
  
  setupGame() {
    this.clearStage();
    this.createBackground();
    
    // Load astronaut texture
    const astronautTexture = PIXI.Assets.get('/assets/astro-sprite.png');
    this.astronaut = new Astronaut(
      astronautTexture, 
      ASTRONAUT.startX, 
      ASTRONAUT.startY
    );
    this.app.stage.addChild(this.astronaut.sprite);
    
    // Reset state
    this.state = {
      score: 0,
      level: 1,
      warps: 0,
      time: 0,
      isStarted: false,
      isGameOver: false,
      isLevelComplete: false
    };
    
    this.obstacles = [];
    this.lastObstacleTime = 0;
    
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
    
    // Update UI
    this.updateCallback(this.state);
  }
  
  gameOver() {
    this.state.isGameOver = true;
    this.state.isStarted = false;
    
    // Play hit sound
    audioManager.play('hit');
    
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
    
    // Play level up sound
    audioManager.play('levelUp');
    
    // Clear obstacles
    this.obstacles.forEach(obstacle => {
      this.app.stage.removeChild(obstacle.topPipe);
      this.app.stage.removeChild(obstacle.bottomPipe);
    });
    this.obstacles = [];
    
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
  
  private gameLoop() {
    if (!this.state.isStarted || this.state.isGameOver) return;
    
    // Update time
    this.state.time += this.app.ticker.deltaMS;
    
    // Update astronaut
    if (this.astronaut) {
      this.astronaut.update();
      
      if (this.astronaut.dead) {
        this.gameOver();
        return;
      }
    }
    
    // Current level settings
    const currentLevel = LEVELS[this.state.level - 1];
    
    // Spawn new obstacles
    const currentTime = this.state.time;
    if (currentTime - this.lastObstacleTime > currentLevel.spawnInterval) {
      this.spawnObstacle(currentLevel.speed);
      this.lastObstacleTime = currentTime;
    }
    
    // Update obstacles
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obstacle = this.obstacles[i];
      obstacle.update();
      
      // Check if astronaut passed the obstacle
      if (this.astronaut && obstacle.isPassed(this.astronaut.sprite.x)) {
        this.state.score += SCORE_PER_OBSTACLE;
        
        // Play score sound
        audioManager.play('score');
        
        // Check for level up
        if (this.state.score % POINTS_TO_NEXT_LEVEL === 0) {
          this.levelComplete();
        }
        
        // Update UI
        this.updateCallback(this.state);
      }
      
      // Check for collision
      if (this.astronaut && obstacle.checkCollision(this.astronaut)) {
        this.astronaut.die();
        this.gameOver();
        return;
      }
      
      // Remove off-screen obstacles
      if (obstacle.isOffScreen()) {
        this.app.stage.removeChild(obstacle.topPipe);
        this.app.stage.removeChild(obstacle.bottomPipe);
        this.obstacles.splice(i, 1);
      }
    }
    
    // Update stars
    this.stars.forEach(star => star.update());
  }
  
  private clearStage() {
    while (this.app.stage.children.length > 0) {
      this.app.stage.removeChildAt(0);
    }
  }
  
  private createBackground() {
    // Create background
    const background = new PIXI.Graphics();
    background.beginFill(0x000033);
    background.drawRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    background.endFill();
    this.app.stage.addChild(background);
    
    // Create stars
    this.stars = [];
    for (let i = 0; i < 100; i++) {
      const star = new Star(
        Math.random() * GAME_WIDTH,
        Math.random() * GAME_HEIGHT,
        Math.random() * 2 + 1,
        Math.random() * 0.8 + 0.2
      );
      this.stars.push(star);
      this.app.stage.addChild(star.graphics);
    }
  }
  
  private spawnObstacle(speed: number) {
    // Calculate random gap position
    const gapY = Math.random() * (GAME_HEIGHT - OBSTACLE.gap - OBSTACLE.minHeight * 2) + OBSTACLE.minHeight;
    
    const obstacle = new Obstacle(
      GAME_WIDTH,      // x position (right edge of screen)
      gapY,            // gap start y position
      OBSTACLE.gap,    // gap height
      OBSTACLE.width,  // obstacle width
      speed            // movement speed
    );
    
    this.app.stage.addChild(obstacle.topPipe);
    this.app.stage.addChild(obstacle.bottomPipe);
    this.obstacles.push(obstacle);
  }
} 