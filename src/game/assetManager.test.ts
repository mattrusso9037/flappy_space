import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as PIXI from 'pixi.js';
import { AssetManager } from './assetManager';

describe('AssetManager', () => {
  let manager: AssetManager;

  beforeEach(() => {
    vi.restoreAllMocks();
    manager = new AssetManager();
  });

  it('initializes with loaded = false', () => {
    expect(manager.isLoaded()).toBe(false);
  });

  it('registers dynamic assets via registerAsset', () => {
    const addSpy = vi.spyOn(PIXI.Assets, 'add');
    manager.registerAsset({
      name: 'drone',
      url: './assets/drone.json',
      type: 'spritesheet',
    });

    expect(addSpy).toHaveBeenCalledWith({
      alias: 'drone',
      src: './assets/drone.json',
    });
  });

  it('ignores invalid asset definitions gracefully', () => {
    const addSpy = vi.spyOn(PIXI.Assets, 'add');
    manager.registerAsset({
      name: '',
      url: '',
      type: 'texture',
    });

    expect(addSpy).not.toHaveBeenCalled();
  });

  it('returns Texture.WHITE when requested texture is not found', () => {
    vi.spyOn(PIXI.Assets, 'get').mockImplementation((() => null) as unknown as typeof PIXI.Assets.get);
    const texture = manager.getTexture('non-existent');
    expect(texture).toBe(PIXI.Texture.WHITE);
  });

  it('returns texture when PIXI.Assets.get resolves a texture', () => {
    const mockTexture = new PIXI.Texture();
    vi.spyOn(PIXI.Assets, 'get').mockImplementation((() => mockTexture) as unknown as typeof PIXI.Assets.get);
    const texture = manager.getTexture('astronaut');
    expect(texture).toBe(mockTexture);
  });

  it('returns null when spritesheet is not found', () => {
    vi.spyOn(PIXI.Assets, 'get').mockImplementation((() => null) as unknown as typeof PIXI.Assets.get);
    const sheet = manager.getSpritesheet('non-existent');
    expect(sheet).toBeNull();
  });

  it('returns spritesheet when PIXI.Assets.get resolves a spritesheet', () => {
    const mockSheet = {
      textures: { idle_00: new PIXI.Texture() },
      animations: { idle: [new PIXI.Texture()] },
    } as unknown as PIXI.Spritesheet;

    vi.spyOn(PIXI.Assets, 'get').mockImplementation((() => mockSheet) as unknown as typeof PIXI.Assets.get);
    const sheet = manager.getSpritesheet('astronaut');
    expect(sheet).toBe(mockSheet);
  });

  it('returns empty array when animation frames do not exist', () => {
    vi.spyOn(PIXI.Assets, 'get').mockImplementation((() => null) as unknown as typeof PIXI.Assets.get);
    const frames = manager.getAnimationFrames('astronaut', 'idle');
    expect(frames).toEqual([]);
  });

  it('returns animation frames when spritesheet contains requested animation', () => {
    const mockFrames = [new PIXI.Texture(), new PIXI.Texture()];
    const mockSheet = {
      textures: {},
      animations: { thrust: mockFrames },
    } as unknown as PIXI.Spritesheet;

    vi.spyOn(PIXI.Assets, 'get').mockImplementation((() => mockSheet) as unknown as typeof PIXI.Assets.get);
    const frames = manager.getAnimationFrames('astronaut', 'thrust');
    expect(frames).toBe(mockFrames);
    expect(frames).toHaveLength(2);
  });
});
