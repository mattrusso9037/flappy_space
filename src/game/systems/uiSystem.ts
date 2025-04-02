import * as PIXI from 'pixi.js';
import { gameStateService, GameState } from '../gameStateService';
import { Scoreboard } from '../scoreboard';
import { eventBus, GameEvent } from '../eventBus';
import { Subscription } from 'rxjs';

// Interface for our particle data
interface ParticleData {
  vx: number;
  vy: number;
  alpha: number;
  rotation: number;
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
  
  private constructor() {
    this.gameState = gameStateService.getState();
    
    // Subscribe to game state changes
    this.subscribeToStateChanges();
    
    // Subscribe to orb collection events for visual feedback
    this.orbCollectionSubscription = eventBus.on<{x: number, y: number}>(GameEvent.ORB_COLLECTED).subscribe(data => {
      if (data && typeof data === 'object' && 'x' in data && 'y' in data) {
        this.createOrbCollectionEffect(data.x, data.y);
      }
    });
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
  private createOrbCollectionEffect(x: number, y: number): void {
    if (!this.initialized || !this.orbEffects) {
      console.log('UISystem: Cannot create orb collection effect - not initialized');
      return;
    }
    
    console.log(`UISystem: Creating orb collection effect at ${x},${y}`);
    
    // Create a particle burst effect
    const particles = new PIXI.Container();
    particles.x = x;
    particles.y = y;
    this.orbEffects.addChild(particles);
    
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
      
      // Store velocity
      particle.userData = {
        vx: Math.cos(angle) * distance * 0.1,
        vy: Math.sin(angle) * distance * 0.1,
        alpha: 1,
        rotation: Math.random() * 0.2 - 0.1
      };
      
      particles.addChild(particle);
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
    particles.addChild(scoreText);
    
    // Animate particles
    let elapsed = 0;
    const ticker = PIXI.Ticker.shared;
    
    const animate = () => {
      elapsed += ticker.deltaMS / 1000;
      
      // Update each particle
      for (let i = 0; i < particles.children.length - 1; i++) {
        const p = particles.children[i] as PIXI.Graphics;
        const data = p.userData;
        
        // Move based on velocity
        p.x += data.vx;
        p.y += data.vy;
        
        // Slow down
        data.vx *= 0.95;
        data.vy *= 0.95;
        
        // Fade out
        data.alpha -= 0.02;
        p.alpha = Math.max(0, data.alpha);
        
        // Add a little rotation
        p.rotation += data.rotation;
      }
      
      // Animate score text
      scoreText.y -= 1.5;
      scoreText.alpha = Math.max(0, 1 - elapsed / 1.5);
      
      // Remove when animation completes
      if (elapsed >= 1.5) {
        ticker.remove(animate);
        this.orbEffects.removeChild(particles);
        particles.destroy({ children: true });
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