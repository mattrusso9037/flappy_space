import { describe, expect, it, vi } from 'vitest';
import { Texture } from 'pixi.js';
import assetManager from '../../assetManager';
import { CinematicSceneRenderer } from './CinematicSceneRenderer';
import { OPENING_SPACEWALK } from './openingSpacewalk';

vi.spyOn(assetManager, 'getTexture').mockReturnValue(Texture.WHITE);

describe('CinematicSceneRenderer', () => {
  it('reuses visuals across frames and destroys actors without destroying shared textures', () => {
    const renderer = new CinematicSceneRenderer();
    const step = OPENING_SPACEWALK.steps.find(s => s.type === 'scene');
    if (!step || step.type !== 'scene') throw new Error('Missing scene');
    renderer.render(step.scene, 0);
    const children = [...renderer.container.children];
    renderer.render(step.scene, 9);
    expect(renderer.container.children).toEqual(children);
    expect(renderer.container.getChildByLabel('spacewalking-pilot')?.x).toBeGreaterThan(500);
    renderer.render(null, 0);
    expect(renderer.container.children).toHaveLength(0);
    expect(children.every(c => c.destroyed)).toBe(true);
    expect(Texture.WHITE.destroyed).toBe(false);
    renderer.render(step.scene, 0);
    expect(renderer.container.children.length).toBeGreaterThan(0);
    renderer.dispose();
    expect(renderer.container.destroyed).toBe(true);
  });

  it('creates ship and wormhole actors with textures loaded from assetManager', () => {
    const getTextureSpy = vi.spyOn(assetManager, 'getTexture').mockReturnValue(Texture.WHITE);
    const renderer = new CinematicSceneRenderer();
    const step = OPENING_SPACEWALK.steps.find(s => s.type === 'scene');
    if (!step || step.type !== 'scene') throw new Error('Missing scene');
    renderer.render(step.scene, 0);

    expect(getTextureSpy).toHaveBeenCalledWith('astronaut-idle');
    expect(getTextureSpy).toHaveBeenCalledWith('spaceship-broken');
    expect(getTextureSpy).toHaveBeenCalledWith('wormhole');
    renderer.dispose();
  });

  it('creates pilot as an AnimatedSprite when animation frames are available from spritesheet', () => {
    const textures: Record<string, Texture> = {};
    for (const frame of [
      'idle_00', 'idle_01', 'idle_02', 'idle_03', 'idle_04', 'idle_05', 'idle_06', 'idle_07',
      'thrust_00', 'thrust_01', 'thrust_02', 'thrust_03', 'thrust_04', 'thrust_05', 'thrust_06', 'thrust_07',
    ]) {
      textures[frame] = Texture.WHITE;
    }
    vi.spyOn(assetManager, 'getSpritesheet').mockReturnValue({ textures } as unknown as import('pixi.js').Spritesheet);
    const renderer = new CinematicSceneRenderer();
    const step = OPENING_SPACEWALK.steps.find(s => s.type === 'scene');
    if (!step || step.type !== 'scene') throw new Error('Missing scene');
    renderer.render(step.scene, 0);

    const pilotContainer = renderer.container.getChildByLabel('spacewalking-pilot');
    expect(pilotContainer).toBeDefined();
    const animSprite = pilotContainer?.children.find(
      (c): c is import('pixi.js').AnimatedSprite => c.constructor.name === 'AnimatedSprite' || 'textures' in c
    );
    expect(animSprite).toBeDefined();
    expect(animSprite?.loop).toBe(true);
    expect(animSprite?.animationSpeed).toBeCloseTo(12 / 60, 4);
    expect(animSprite?.autoUpdate).toBe(false);
    renderer.render(step.scene, 0.25);
    expect(animSprite?.currentFrame).toBe(3);
    renderer.render(step.scene, 0.25);
    expect(animSprite?.currentFrame).toBe(3);
    renderer.render(step.scene, 0);
    expect(animSprite?.currentFrame).toBe(0);
    renderer.dispose();
  });
});
