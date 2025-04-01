import * as PIXI from 'pixi.js';
import { GameManager } from './gameState';
import { LEVELS, SCORE_PER_OBSTACLE, POINTS_TO_NEXT_LEVEL } from './config';
import audioManager from './audio';

// Define a type for the ticker time parameter
export interface TickerTime {
  deltaTime: number;
  deltaMS: number;
  elapsedMS: number;
}

export function createGameLoop(gameManager: GameManager) {
  return (time: TickerTime) => {
    if (!gameManager.state.isStarted || gameManager.state.isGameOver) return;
    
    // Update time using deltaMS for consistent time tracking
    gameManager.state.time += time.deltaMS;
    
    // Update astronaut with deltaMS for smooth animation
    if (gameManager.astronaut) {
      gameManager.astronaut.update(time.deltaMS);
      
      if (gameManager.astronaut.dead) {
        gameManager.gameOver();
        return;
      }
    }
    
    // Current level settings
    const currentLevel = LEVELS[gameManager.state.level - 1];
    
    // Spawn new obstacles
    const currentTime = gameManager.state.time;
    if (currentTime - gameManager.lastObstacleTime > currentLevel.spawnInterval) {
      gameManager.spawnObstacle(currentLevel.speed);
      gameManager.lastObstacleTime = currentTime;
    }
    
    // Update obstacles
    for (let i = gameManager.obstacles.length - 1; i >= 0; i--) {
      const obstacle = gameManager.obstacles[i];
      obstacle.update();
      
      // Check if astronaut passed the obstacle
      if (gameManager.astronaut && obstacle.isPassed(gameManager.astronaut.sprite.x)) {
        gameManager.state.score += SCORE_PER_OBSTACLE;
        
        // Play score sound
        audioManager.play('score');
        
        // Check for level up
        if (gameManager.state.score % POINTS_TO_NEXT_LEVEL === 0) {
          gameManager.levelComplete();
        }
        
        // Update UI
        gameManager.updateCallback(gameManager.state);
      }
      
      // Check for collision
      if (gameManager.astronaut && obstacle.checkCollision(gameManager.astronaut)) {
        gameManager.astronaut.die();
        gameManager.gameOver();
        return;
      }
      
      // Remove off-screen obstacles
      if (obstacle.isOffScreen()) {
        gameManager.app.stage.removeChild(obstacle.topPipe);
        gameManager.app.stage.removeChild(obstacle.bottomPipe);
        gameManager.obstacles.splice(i, 1);
      }
    }
    
    // Update stars
    gameManager.stars.forEach(star => star.update());
  };
} 