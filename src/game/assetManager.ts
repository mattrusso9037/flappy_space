import * as PIXI from 'pixi.js';
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

export class AssetManager {
  private loaded: boolean = false;
  private loadPromise: Promise<void> | null = null;
  private assets: AssetDefinition[] = [...gameAssets];

  constructor() {
    // Initialize PIXI Assets with our asset definitions
    this.registerAssets();
  }

  private registerAssets(): void {
    // Register assets with PIXI.Assets using the correct API
    this.assets.forEach(asset => {
      if (!asset.url) {
        logger.error(`Asset ${asset.name} has no URL defined`);
        return;
      }
      
      // Log the asset being registered to help with debugging
      logger.debug(`Registering asset: ${asset.name} with URL: ${asset.url}`);
      
      // Using the correct PIXI.Assets.add syntax
      PIXI.Assets.add({
        alias: asset.name,
        src: asset.url
      });
    });
  }

  /**
   * Register a new asset definition dynamically.
   */
  registerAsset(asset: AssetDefinition): void {
    if (!asset.name || !asset.url) {
      logger.error('Invalid asset definition:', asset);
      return;
    }
    const existing = this.assets.find(a => a.name === asset.name);
    if (existing) {
      logger.debug(`Asset '${asset.name}' is already registered.`);
      return;
    }
    this.assets.push(asset);
    PIXI.Assets.add({
      alias: asset.name,
      src: asset.url,
    });
    logger.debug(`Registered asset '${asset.name}' (${asset.type}) with URL: ${asset.url}`);
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
      this.loadPromise = (async () => {
        try {
          // Load assets one by one with better error reporting
          for (const asset of this.assets) {
            logger.debug(`Loading asset: ${asset.name} from ${asset.url}`);
            await PIXI.Assets.load(asset.name);
            logger.debug(`Successfully loaded: ${asset.name}`);
          }
          
          this.loaded = true;
          logger.info('All assets loaded successfully');
        } catch (error) {
          logger.error('Failed to load assets:', error);
          throw error;
        }
      })();

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
      const asset = PIXI.Assets.get(name);
      if (!asset) {
        logger.error(`Texture '${name}' not found. Available assets:`, 
          this.assets.map(a => a.name).join(', '));
        // Return a default texture or placeholder to prevent crashes
        return PIXI.Texture.WHITE;
      }

      if (asset instanceof PIXI.Texture) {
        return asset;
      }

      // If a Spritesheet was requested via getTexture, try to return its default or first frame
      if (asset && typeof asset === 'object' && 'textures' in asset) {
        const sheet = asset as PIXI.Spritesheet;
        const firstKey = Object.keys(sheet.textures)[0];
        if (firstKey && sheet.textures[firstKey]) {
          return sheet.textures[firstKey];
        }
      }
      
      return PIXI.Texture.WHITE;
    } catch (error) {
      logger.error(`Error getting texture '${name}':`, error);
      return PIXI.Texture.WHITE;
    }
  }

  /**
   * Get a loaded spritesheet by name.
   */
  getSpritesheet(name: string): PIXI.Spritesheet | null {
    if (!this.loaded) {
      logger.warn(`Spritesheet '${name}' requested before assets were loaded.`);
    }

    try {
      const asset = PIXI.Assets.get(name);
      if (!asset) {
        logger.warn(`Spritesheet '${name}' not found.`);
        return null;
      }

      if (asset instanceof PIXI.Spritesheet || (asset && typeof asset === 'object' && 'textures' in asset && 'animations' in asset)) {
        return asset as PIXI.Spritesheet;
      }

      logger.warn(`Asset '${name}' was loaded but is not a spritesheet.`);
      return null;
    } catch (error) {
      logger.error(`Error getting spritesheet '${name}':`, error);
      return null;
    }
  }

  /**
   * Get animation frame textures from a loaded spritesheet.
   */
  getAnimationFrames(name: string, animationName: string): PIXI.Texture[] {
    const sheet = this.getSpritesheet(name);
    if (!sheet) return [];

    const frames = sheet.animations?.[animationName];
    if (!frames || frames.length === 0) {
      logger.warn(`Animation frames for '${animationName}' not found in spritesheet '${name}'.`);
      return [];
    }

    return frames;
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