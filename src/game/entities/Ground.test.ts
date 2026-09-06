import { describe, it, expect, beforeEach } from 'vitest';
import { Ground } from './Ground';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { INK } from '../visuals/tokens';
import { ALIEN_CRUST_TERRAIN } from '../visuals/terrainPresets';

describe('Ground Entity', () => {
  let ground: Ground;

  beforeEach(() => {
    ground = new Ground();
  });

  it('calculates canonical surface Y from GAME_HEIGHT and default height', () => {
    expect(ground.height).toBe(80);
    expect(ground.y).toBe(GAME_HEIGHT - 80);
    expect(ground.terrainId).toBe('alien-crust');
    expect(ground.container).toBeDefined();
    expect(ground.container.children.length).toBeGreaterThanOrEqual(2);
  });

  it('defaults to GAME_WIDTH when no worldWidth is provided', () => {
    expect(ground.worldWidth).toBe(GAME_WIDTH);
  });

  it('supports explicit configured height via number or options object', () => {
    const numericGround = new Ground(120);
    expect(numericGround.height).toBe(120);
    expect(numericGround.y).toBe(GAME_HEIGHT - 120);
    numericGround.destroy();

    const optionsGround = new Ground({ height: 95 });
    expect(optionsGround.height).toBe(95);
    expect(optionsGround.y).toBe(GAME_HEIGHT - 95);
    optionsGround.destroy();
  });

  it('accepts worldWidth via third constructor argument', () => {
    const wideGround = new Ground(80, 'alien-crust', 2400);
    expect(wideGround.worldWidth).toBe(2400);
    wideGround.destroy();
  });

  it('resolves canonical terrain presentation tokens without raw color values', () => {
    expect(ground.terrain).toBe(ALIEN_CRUST_TERRAIN);
    expect(ground.terrain.bedrockColor).toBe(INK.void);
    expect(ground.terrain.strataColor).toBe(INK.hull);
    expect(ground.terrain.crestColor).toBe(INK.violet);
    expect(ground.terrain.accentColor).toBe(INK.cyan);
  });

  it('destroys container without error', () => {
    ground.destroy();
    expect(ground.container.destroyed).toBe(true);
  });

  it('has zero campaign or system dependencies and can be instantiated anywhere in isolation', () => {
    const isolated = new Ground(60, 'alien-crust');
    expect(isolated.y).toBe(GAME_HEIGHT - 60);
    expect(isolated.terrainId).toBe('alien-crust');
    isolated.destroy();
  });

  it('builds terrain covering the full world width in world-space mode', () => {
    const wideGround = new Ground(80, 'alien-crust', 2400);
    // The container should have been built; worldWidth is 2400
    expect(wideGround.worldWidth).toBe(2400);
    expect(wideGround.container.children.length).toBeGreaterThanOrEqual(2);
    wideGround.destroy();
  });
});
