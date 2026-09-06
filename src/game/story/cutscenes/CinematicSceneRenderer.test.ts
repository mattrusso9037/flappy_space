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

  it('creates pilot as an AnimatedSprite when animation frames are available', () => {
    const idleFrames = [Texture.WHITE, Texture.WHITE];
    vi.spyOn(assetManager, 'getAnimationFrames').mockReturnValue(idleFrames);
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
    renderer.dispose();
  });
});
