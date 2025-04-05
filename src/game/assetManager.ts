import * as PIXI from 'pixi.js';
import { eventBus, GameEvent } from './eventBus';
import { getLogger } from '../utils/logger';

const logger = getLogger('AssetManager');

// Asset types
export type AssetType = 'texture' | 'spritesheet' | 'sound';

// Asset definitions
export interface AssetDefinition {
  name: string;
  url: string;
  type: AssetType;
}

// Game assets - relative paths that work in both web and Electron
const gameAssets: AssetDefinition[] = [
  {
    name: 'astronaut',
    url: './assets/astro-sprite.png', // Using ./ for more explicit relative path
    type: 'texture'
  }
  // Add more assets here as needed
];

class AssetManager {
  private loaded: boolean = false;
  private loadPromise: Promise<void> | null = null;

  constructor() {
    // Initialize PIXI Assets with our asset definitions
    this.registerAssets();
  }

  private registerAssets(): void {
    // Register assets with PIXI.Assets using the correct API
    gameAssets.forEach(asset => {
      if (!asset.url) {
        logger.error(`Asset ${asset.name} has no URL defined`);
        return;
      }
      
      // Log the asset being registered to help with debugging
      logger.debug(`Registering asset: ${asset.name} with URL: ${asset.url}`);
      
      // Using the correct PIXI.Assets.add syntax - it takes a bundle definition object
      PIXI.Assets.add({
        alias: asset.name,
        src: asset.url
      });
    });
  }

  /**
   * Load all game assets
   */
  async loadAssets(): Promise<void> {
    // If already loaded or loading, return existing promise
    if (this.loaded) return Promise.resolve();
    if (this.loadPromise) return this.loadPromise;

    logger.info('Starting to load assets...');

    try {
      // Create load promise with proper error handling
      this.loadPromise = new Promise(async (resolve, reject) => {
        try {
          // Load assets one by one with better error reporting
          for (const asset of gameAssets) {
            logger.debug(`Loading asset: ${asset.name} from ${asset.url}`);
            await PIXI.Assets.load(asset.name);
            logger.debug(`Successfully loaded: ${asset.name}`);
          }
          
          this.loaded = true;
          logger.info('All assets loaded successfully');
          
          // Emit an event to notify that assets are loaded
          eventBus.emit(GameEvent.ASSETS_LOADED, gameAssets.map(a => a.name));
          
          resolve();
        } catch (error) {
          logger.error('Failed to load assets:', error);
          reject(error);
        }
      });

      return this.loadPromise;
    } catch (error) {
      logger.error('Asset loading error:', error);
      throw error;
    }
  }

  /**
   * Load assets asynchronously without awaiting the result
   * This allows the caller to continue execution while assets load
   */
  loadAssetsAsync(): void {
    if (this.loaded) return;
    if (this.loadPromise) return;
    
    logger.info('Starting asset loading asynchronously...');
    this.loadAssets()
      .then(() => logger.info('Async asset loading completed'))
      .catch(error => logger.error('Async asset loading failed:', error));
  }

  /**
   * Get a loaded texture by name
   */
  getTexture(name: string): PIXI.Texture {
    if (!this.loaded) {
      logger.warn(`Asset ${name} requested before assets were loaded.`);
    }
    
    try {
      const texture = PIXI.Assets.get(name);
      if (!texture) {
        logger.error(`Texture '${name}' not found. Available assets:`, 
          gameAssets.map(a => a.name).join(', '));
        // Return a default texture or placeholder to prevent crashes
        return PIXI.Texture.WHITE;
      }
      
      return texture;
    } catch (error) {
      logger.error(`Error getting texture '${name}':`, error);
      return PIXI.Texture.WHITE;
    }
  }

  /**
   * Check if assets are loaded
   */
  isLoaded(): boolean {
    return this.loaded;
  }
}

// Create singleton instance
const assetManager = new AssetManager();
export default assetManager; 