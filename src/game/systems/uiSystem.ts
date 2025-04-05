import * as PIXI from 'pixi.js';
import { gameStateService, GameState } from '../gameStateService';
import { Scoreboard } from '../scoreboard';
import { eventBus, GameEvent } from '../eventBus';
import { Subscription } from 'rxjs';
import { getLogger } from 'loglevel';

// Interface for our particle data
interface ParticleData {
  vx?: number;
  vy?: number;
  alpha?: number;
  rotation?: number;
  isOrb?: boolean;
  isGlow?: boolean;
}

// Add userdata to PIXI Graphics
declare module 'pixi.js' {
  interface Graphics {
    userData: ParticleData;
  }
}

/**
 * UISystem manages all UI elements in the game.
 */
export class UISystem {
  private static instance: UISystem;
  private app!: PIXI.Application;
  private scoreboard!: Scoreboard;
  private initialized: boolean = false;
  private orbEffects!: PIXI.Container;
  private gameState: GameState;
  private subscriptions: Subscription[] = [];
  private orbCollectionSubscription: Subscription | null = null;
  private logger = getLogger('UISystem');
  private constructor() {
    this.gameState = gameStateService.getState();
    
    // Subscribe to game state changes
    this.subscribeToStateChanges();
  }
  
  private subscribeToStateChanges(): void {
    // Track all important game state changes
    this.subscriptions.push(
      gameStateService.select(state => state.score).subscribe(() => {
        this.updateScoreboard();
      })
    );
    
    this.subscriptions.push(
      gameStateService.select(state => state.orbsCollected).subscribe(() => {
        this.updateScoreboard();
      })
    );
    
    this.subscriptions.push(
      gameStateService.select(state => state.timeRemaining).subscribe(() => {
        this.updateScoreboard();
      })
    );

    // Subscribe to orb collection events for visual feedback
    this.orbCollectionSubscription = eventBus.on<{
      x: number, 
      y: number,
      radius?: number,
      graphics?: PIXI.Graphics,
      glowGraphics?: PIXI.Graphics,
      speed?: number
    }>(GameEvent.ORB_COLLECTED).subscribe(data => {
      this.logger.debug('orbCollectionSubscription', data);
      if (data && typeof data === 'object' && 'x' in data && 'y' in data) {
        this.createOrbCollectionEffect(data.x, data.y, data.radius, data.speed);
      }
    });
  }
  
  public static getInstance(): UISystem {
    if (!UISystem.instance) {
      UISystem.instance = new UISystem();
    }
    return UISystem.instance;
  }
  
  /**
   * Initialize the UISystem
   * @param app - Either a PIXI.Application or a PIXI.Container (stage)
   */
  public initialize(app: PIXI.Application | PIXI.Container): void {
    console.log('UISystem: Initialization started', app);
    
    try {
      // Determine whether we received an app or a stage
      const stage = 'stage' in app ? app.stage : app;
      
      console.log('UISystem: Using stage', stage);
      
      // Store reference to parent container
      if ('stage' in app) {
        this.app = app;
        console.log('UISystem: Stored app reference');
      }
      
      // Create UI layer
      const uiContainer = new PIXI.Container();
      stage.addChild(uiContainer);
      console.log('UISystem: Created UI container');
      
      // Create scoreboard
      console.log('UISystem: Creating scoreboard');
      this.scoreboard = new Scoreboard();
      if (this.scoreboard) {
        const container = this.scoreboard.getContainer();
        console.log('UISystem: Adding scoreboard container to stage', container);
        stage.addChild(container);
      } else {
        console.warn('UISystem: Scoreboard could not be created');
      }
      
      // Create container for orb collection effects
      console.log('UISystem: Creating orb effects container');
      this.orbEffects = new PIXI.Container();
      stage.addChild(this.orbEffects);
      
      this.initialized = true;
      console.log('UISystem: Initialized successfully');
    } catch (error) {
      console.error('UISystem: Error during initialization', error);
      throw error;
    }
  }
  
  /**
   * Update the UI for each frame
   */
  public update(): void {
    if (!this.initialized) return;
    // No additional processing needed as updates happen via subscriptions
  }
  
  /**
   * Update the scoreboard with current game state
   */
  private updateScoreboard(): void {
    if (!this.initialized || !this.scoreboard) return;
    
    const state = gameStateService.getState();
    this.scoreboard.update(
      state.score,
      state.level,
      state.orbsCollected,
      state.orbsRequired,
      state.timeRemaining
    );
  }
  
  /**
   * Create a visual effect when an orb is collected
   */
  private createOrbCollectionEffect(x: number, y: number, radius?: number, speed?: number): void {
    if (!this.initialized || !this.orbEffects) {
      this.logger.warn('Cannot create orb collection effect - not initialized');
      return;
    }
    
    this.logger.debug(`Creating orb collection effect at ${x},${y}`);
    
    // Get current level's speed factor for animation timing
    const currentLevel = gameStateService.getState().level;
    const levelIndex = Math.max(0, currentLevel - 1);
    
    // Use a more direct way to get level multiplier
    const LEVEL_MULTIPLIERS = [1.0, 1.25, 1.5, 1.8, 2.0]; // Hardcoded to avoid import issues
    const speedFactor = LEVEL_MULTIPLIERS[levelIndex] || 1.0;
    
    // Use the orb's speed if provided, otherwise calculate from level
    const orbSpeed = speed || speedFactor;
    
    // Adjust animation parameters based on speed
    const baseAnimationDuration = 2.5; // seconds
    // Animation duration is longer when speed is higher
    const animationDuration = baseAnimationDuration * Math.max(1.0, Math.sqrt(orbSpeed));
    
    // Create a particle burst effect container
    const effectsContainer = new PIXI.Container();
    effectsContainer.x = x;
    effectsContainer.y = y;
    this.orbEffects.addChild(effectsContainer);
    
    // Recreate a visual orb effect if radius is provided
    if (radius) {
      const orbEffect = new PIXI.Graphics();
      const glowEffect = new PIXI.Graphics();
      
      // Draw the main orb
      orbEffect.beginFill(0x00AAFF);
      orbEffect.drawCircle(0, 0, radius);
      orbEffect.endFill();
      
      // Add highlight
      orbEffect.beginFill(0xFFFFFF, 0.5);
      orbEffect.drawCircle(-radius * 0.3, -radius * 0.3, radius * 0.3);
      orbEffect.endFill();
      
      // Draw glow
      const glowRadius = radius * 1.5;
      glowEffect.beginFill(0x00AAFF, 0.3);
      glowEffect.drawCircle(0, 0, glowRadius);
      glowEffect.endFill();
      
      // Add to container
      effectsContainer.addChild(glowEffect);
      effectsContainer.addChild(orbEffect);
      
      // These will be animated
      orbEffect.userData = { isOrb: true };
      glowEffect.userData = { isGlow: true };
    }
    
    // Number of particles
    const count = 12;
    
    // Create particles
    for (let i = 0; i < count; i++) {
      const particle = new PIXI.Graphics();
       
      // Randomly colored particles
      const colors = [0x00FFFF, 0x00CCFF, 0xFFFFFF, 0x88DDFF];
      const color = colors[Math.floor(Math.random() * colors.length)];
      
      // Draw particle
      particle.beginFill(color);
      particle.drawCircle(0, 0, 3 + Math.random() * 3);
      particle.endFill();
      
      // Random direction
      const angle = (i / count) * Math.PI * 2;
      const distance = 30 + Math.random() * 50;
      
      // Store velocity - slow down particles when game speed is higher
      const velocityScale = 0.1 / Math.sqrt(speedFactor);
      particle.userData = {
        vx: Math.cos(angle) * distance * velocityScale,
        vy: Math.sin(angle) * distance * velocityScale,
        alpha: 1,
        rotation: Math.random() * 0.2 - 0.1
      };
      
      effectsContainer.addChild(particle);
    }
    
    // Create score popup (+50)
    const scoreText = new PIXI.Text('+50', {
      fontFamily: 'Arial',
      fontSize: 20,
      fill: 0xFFFFFF,
      align: 'center',
      stroke: {
        color: 0x0066AA,
        width: 3
      }
    });
    scoreText.anchor.set(0.5);
    scoreText.x = 0;
    scoreText.y = -20;
    effectsContainer.addChild(scoreText);
    
    // Store a reference to the effects container
    const containerRef = effectsContainer;
    
    // Animate particles
    let elapsed = 0;
    const ticker = PIXI.Ticker.shared;
    
    const animate = () => {
      // Add a safety check
      if (!containerRef || !containerRef.parent) {
        ticker.remove(animate);
        return;
      }
      
      try {
        elapsed += ticker.deltaMS / 1000;
        const progress = Math.min(elapsed / animationDuration, 1);
        
        // Update each child in the container
        for (let i = 0; i < containerRef.children.length; i++) {
          const child = containerRef.children[i];
          if (!child) continue;
          
          const data = (child as any).userData;
          if (!data) continue;
          
          // Handle orb/glow effects specially
          if (data.isOrb) {
            // Scale up the orb
            const scaleValue = 1 + progress * 1.0;  // Scale to 2x
            child.scale.set(scaleValue);
            // Fade out
            child.alpha = Math.max(0, 1 - progress * 1.2);  // Fade slightly faster than progress
            continue;
          }
          
          if (data.isGlow) {
            // Scale up the glow more
            const scaleValue = 1 + progress * 1.5;  // Scale to 2.5x
            child.scale.set(scaleValue);
            // Fade out
            child.alpha = Math.max(0, 0.3 - progress * 0.3);  // Start at 0.3 alpha
            continue;
          }
          
          // Handle score text specially
          if (child instanceof PIXI.Text) {
            // Slower rise with higher speed
            const textRiseSpeed = 1.5 / Math.sqrt(speedFactor);
            child.y -= textRiseSpeed;
            child.alpha = Math.max(0, 1 - progress * 1.2);  // Fade slightly faster than progress
            continue;
          }
          
          // Otherwise it's a particle
          // Move based on velocity
          if (data.vx !== undefined && data.vy !== undefined) {
            child.x += data.vx;
            child.y += data.vy;
            
            // Slow down
            data.vx *= 0.95;
            data.vy *= 0.95;
            
            // Fade out more slowly with higher speeds
            const alphaReduction = 0.02 / Math.sqrt(speedFactor);
            data.alpha -= alphaReduction;
            child.alpha = Math.max(0, data.alpha);
            
            // Add a little rotation
            if (data.rotation) {
              child.rotation += data.rotation;
            }
          }
        }
        
        // Remove when animation completes
        if (elapsed >= animationDuration) {
          ticker.remove(animate);
          if (this.orbEffects && this.orbEffects.children.includes(containerRef)) {
            this.orbEffects.removeChild(containerRef);
            containerRef.destroy({ children: true });
          }
        }
      } catch (error) {
        // Handle any errors safely
        this.logger.error(`Animation error: ${error}`);
        ticker.remove(animate);
        if (this.orbEffects && containerRef && this.orbEffects.children.includes(containerRef)) {
          this.orbEffects.removeChild(containerRef);
        }
      }
    };
    
    ticker.add(animate);
  }
  
  /**
   * Clean up resources when the system is no longer needed
   */
  public dispose(): void {
    if (this.initialized) {
      // Unsubscribe from events
      if (this.orbCollectionSubscription) {
        this.orbCollectionSubscription.unsubscribe();
      }
      
      // Unsubscribe from all state changes
      this.subscriptions.forEach(subscription => subscription.unsubscribe());
      this.subscriptions = [];
      
      // Clean up
      this.initialized = false;
      console.log('UISystem: Disposed');
    }
  }
}

// Export a default instance for convenient imports
export const uiSystem = UISystem.getInstance(); 