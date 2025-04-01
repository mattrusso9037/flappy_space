import * as PIXI from 'pixi.js';
import { GameManager } from './gameState';
import { LEVELS, SCORE_PER_OBSTACLE, POINTS_TO_NEXT_LEVEL, ORB_POINTS, ORB_SPAWN_CHANCE } from './config';
import audioManager from './audio';

// Define a type for the ticker time parameter
export interface TickerTime {
  deltaTime: number;
  deltaMS: number;
  elapsedMS: number;
}

export function createGameLoop(gameManager: GameManager) {
  // For tracking if obstacles have been spawned yet
  let hasSpawnedFirstObstacle = false;
  let lastUIUpdateTime = 0;
  const UI_UPDATE_INTERVAL = 33; // Update UI more frequently (approximately 30fps)
  
  return (time: TickerTime) => {
    if (!gameManager.state.isStarted || gameManager.state.isGameOver) return;
    
    // Update time using deltaMS for consistent time tracking
    gameManager.state.time += time.deltaMS;
    
    // Update timer for level completion
    gameManager.state.timeRemaining -= time.deltaMS;
    
    // Force UI updates every frame for critical data like timer
    const currentTime = gameManager.state.time;
    if (currentTime - lastUIUpdateTime > UI_UPDATE_INTERVAL) {
      console.log('Updating UI: time=' + Math.floor(gameManager.state.timeRemaining/1000) + 's, orbs=' + gameManager.state.orbsCollected);
      gameManager.updateCallback(gameManager.state);
      lastUIUpdateTime = currentTime;
    }
    
    // Check if level timer has run out or if enough orbs have been collected
    if (gameManager.checkLevelTimer()) {
      return; // Level complete or game over
    }
    
    // Update astronaut with deltaMS for smooth animation
    if (gameManager.astronaut) {
      gameManager.astronaut.update(time.deltaMS);
      
      if (gameManager.astronaut.dead) {
        console.log('Astronaut died');
        gameManager.gameOver();
        return;
      }
    }
    
    // Current level settings
    const currentLevel = LEVELS[gameManager.state.level - 1];
    
    // Spawn new obstacles
    const currentTime = gameManager.state.time;
    
    // Ensure first obstacle is spawned with a delay
    if (!hasSpawnedFirstObstacle && currentTime > 1500) {
      console.log('Spawning first obstacle');
      gameManager.spawnObstacle(currentLevel.speed);
      gameManager.lastObstacleTime = currentTime;
      hasSpawnedFirstObstacle = true;
    }
    // Then spawn regular obstacles
    else if (hasSpawnedFirstObstacle && currentTime - gameManager.lastObstacleTime > currentLevel.spawnInterval) {
      console.log('Spawning obstacle');
      gameManager.spawnObstacle(currentLevel.speed);
      gameManager.lastObstacleTime = currentTime;
      
      // Chance to spawn an orb alongside the obstacle (but not at the same position)
      if (Math.random() < ORB_SPAWN_CHANCE) {
        setTimeout(() => {
          if (gameManager.state.isStarted && !gameManager.state.isGameOver) {
            console.log('Spawning orb');
            gameManager.spawnOrb(currentLevel.speed);
          }
        }, currentLevel.spawnInterval * 0.4); // Stagger the orb spawn time
      }
    }
    
    // Update obstacles
    for (let i = gameManager.obstacles.length - 1; i >= 0; i--) {
      const obstacle = gameManager.obstacles[i];
      obstacle.update();
      
      // Check if astronaut passed the obstacle
      if (gameManager.astronaut && obstacle.isPassed(gameManager.astronaut.sprite.x)) {
        gameManager.state.score += SCORE_PER_OBSTACLE;
        console.log('Scored! New score:', gameManager.state.score);
        
        // Play score sound
        audioManager.play('score');
        
        // Update UI
        gameManager.updateCallback(gameManager.state);
      }
      
      // Check for collision
      if (gameManager.astronaut && obstacle.checkCollision(gameManager.astronaut)) {
        console.log('Collision detected');
        gameManager.astronaut.die();
        gameManager.gameOver();
        return;
      }
      
      // Remove off-screen obstacles
      if (obstacle.isOffScreen()) {
        // Check what type of obstacle it is and remove its display objects
        if ('graphics' in obstacle) {
          // For Planet and other single-graphics obstacles
          gameManager.app.stage.removeChild((obstacle as any).graphics);
          // Also remove the glow graphics if present
          if ('glowGraphics' in obstacle) {
            gameManager.app.stage.removeChild((obstacle as any).glowGraphics);
          }
        } else if ('topPipe' in obstacle && 'bottomPipe' in obstacle) {
          // For PipeObstacle with top and bottom pipes
          gameManager.app.stage.removeChild((obstacle as any).topPipe);
          gameManager.app.stage.removeChild((obstacle as any).bottomPipe);
        }
        gameManager.obstacles.splice(i, 1);
      }
    }
    
    // Update orbs
    for (let i = gameManager.orbs.length - 1; i >= 0; i--) {
      const orb = gameManager.orbs[i];
      orb.update();
      
      // Check for collision with orb
      if (gameManager.astronaut && orb.checkCollision(gameManager.astronaut) && !orb.collected) {
        console.log('Orb collected!');
        
        // Give points for collecting orb
        gameManager.state.score += ORB_POINTS;
        gameManager.state.orbsCollected++;
        
        // Mark orb as collected
        orb.collect();
        
        // Create collection animation effect
        // TODO: Add a flash or particle effect when collecting orbs
        
        // Play collection sound
        audioManager.play('score'); // Reuse the score sound for now
        
        // Update UI immediately when an orb is collected
        gameManager.updateCallback(gameManager.state);
        
        // Check if enough orbs have been collected
        if (gameManager.state.orbsCollected >= gameManager.state.orbsRequired) {
          console.log('Collected all required orbs!');
          gameManager.levelComplete();
          return;
        }
      }
      
      // Remove off-screen or collected orbs
      if (orb.isOffScreen() || orb.collected) {
        // Remove the orb graphics and glow
        gameManager.app.stage.removeChild(orb.graphics);
        gameManager.app.stage.removeChild(orb.glowGraphics);
        gameManager.orbs.splice(i, 1);
      }
    }
    
    // Update stars
    gameManager.stars.forEach(star => star.update());
  };
} 