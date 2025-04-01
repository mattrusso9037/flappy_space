import * as PIXI from 'pixi.js';

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
        console.error(`Asset ${asset.name} has no URL defined`);
        return;
      }
      
      // Log the asset being registered to help with debugging
      console.log(`Registering asset: ${asset.name} with URL: ${asset.url}`);
      
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

    console.log('Starting to load assets...');

    try {
      // Create load promise with proper error handling
      this.loadPromise = new Promise(async (resolve, reject) => {
        try {
          // Load assets one by one with better error reporting
          for (const asset of gameAssets) {
            console.log(`Loading asset: ${asset.name} from ${asset.url}`);
            await PIXI.Assets.load(asset.name);
            console.log(`Successfully loaded: ${asset.name}`);
          }
          
          this.loaded = true;
          console.log('All assets loaded successfully');
          resolve();
        } catch (error) {
          console.error('Failed to load assets:', error);
          reject(error);
        }
      });

      return this.loadPromise;
    } catch (error) {
      console.error('Asset loading error:', error);
      throw error;
    }
  }

  /**
   * Get a loaded texture by name
   */
  getTexture(name: string): PIXI.Texture {
    if (!this.loaded) {
      console.warn(`Asset ${name} requested before assets were loaded.`);
    }
    
    try {
      const texture = PIXI.Assets.get(name);
      if (!texture) {
        console.error(`Texture '${name}' not found. Available assets:`, 
          gameAssets.map(a => a.name).join(', '));
        // Return a default texture or placeholder to prevent crashes
        return PIXI.Texture.WHITE;
      }
      
      return texture;
    } catch (error) {
      console.error(`Error getting texture '${name}':`, error);
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