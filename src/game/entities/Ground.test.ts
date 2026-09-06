import { describe, it, expect, beforeEach } from 'vitest';
import { Ground } from './Ground';
import { GAME_HEIGHT } from '../config';

describe('Ground Entity', () => {
  let ground: Ground;

  beforeEach(() => {
    ground = new Ground();
  });

  it('initializes with default dimensions and alien-crust style', () => {
    expect(ground.height).toBe(80);
    expect(ground.y).toBe(GAME_HEIGHT - 80);
    expect(ground.style).toBe('alien-crust');
    expect(ground.container).toBeDefined();
    expect(ground.container.children.length).toBeGreaterThanOrEqual(2);
  });

  it('supports custom height and styling configuration', () => {
    const customGround = new Ground({ height: 120, style: 'rocky' });
    expect(customGround.height).toBe(120);
    expect(customGround.y).toBe(GAME_HEIGHT - 120);
    expect(customGround.style).toBe('rocky');
    customGround.destroy();
  });

  it('updates scrolling surface features based on deltaSeconds and scrollSpeed', () => {
    const initialPositions = ground.container.children[1]; // surfaceContainer
    expect(initialPositions).toBeDefined();

    // Advance ground by 1 second at speed 3
    ground.update(1.0, 3.0);
    // Should advance scrollOffset without error
    expect(() => ground.update(0.016, 2.5)).not.toThrow();
  });

  it('safely ignores invalid delta time', () => {
    expect(() => ground.update(0, 3.0)).not.toThrow();
    expect(() => ground.update(-1, 3.0)).not.toThrow();
    expect(() => ground.update(NaN, 3.0)).not.toThrow();
  });

  it('destroys container and frees resources', () => {
    ground.destroy();
    expect(ground.container.destroyed).toBe(true);
  });
});
