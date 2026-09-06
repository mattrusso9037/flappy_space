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

  it('resolves canonical terrain presentation tokens without raw color values', () => {
    expect(ground.terrain).toBe(ALIEN_CRUST_TERRAIN);
    expect(ground.terrain.bedrockColor).toBe(INK.void);
    expect(ground.terrain.strataColor).toBe(INK.hull);
    expect(ground.terrain.crestColor).toBe(INK.violet);
    expect(ground.terrain.accentColor).toBe(INK.cyan);
  });

  it('asserts actual simulation-delta surface feature scrolling displacement', () => {
    const spans = ground.getDetailSpans();
    expect(spans.length).toBeGreaterThan(3);

    const testSpan = spans[3];
    const initialX = testSpan.graphics.x;
    expect(testSpan.baseX).toBe(initialX);

    const deltaSeconds = 0.5;
    const scrollSpeed = 2.0;
    const expectedMovement = scrollSpeed * 60 * deltaSeconds; // 60 pixels

    ground.updatePresentation(deltaSeconds, scrollSpeed);

    expect(ground.getScrollOffset()).toBe(expectedMovement);
    // Since initialX is well ahead of wrap boundary, graphics.x matches baseX - expectedMovement exactly
    expect(testSpan.graphics.x).toBeCloseTo(initialX - expectedMovement, 2);
  });

  it('wraps scrolling surface features smoothly across loop boundary', () => {
    const wrapDistance = GAME_WIDTH * 1.6;
    // Advance ground past the wrap distance
    const totalSeconds = (wrapDistance + 100) / (60 * 3.0);
    ground.updatePresentation(totalSeconds, 3.0);

    const spans = ground.getDetailSpans();
    for (const span of spans) {
      expect(span.graphics.x).toBeGreaterThanOrEqual(-span.width);
      expect(span.graphics.x).toBeLessThanOrEqual(wrapDistance);
    }
  });

  it('safely ignores non-positive, NaN, and infinite delta times and scroll speeds', () => {
    const initialOffset = ground.getScrollOffset();

    ground.updatePresentation(0, 3.0);
    expect(ground.getScrollOffset()).toBe(initialOffset);

    ground.updatePresentation(-1, 3.0);
    expect(ground.getScrollOffset()).toBe(initialOffset);

    ground.updatePresentation(NaN, 3.0);
    expect(ground.getScrollOffset()).toBe(initialOffset);

    ground.updatePresentation(Infinity, 3.0);
    expect(ground.getScrollOffset()).toBe(initialOffset);

    ground.updatePresentation(0.016, NaN);
    expect(ground.getScrollOffset()).toBe(initialOffset);

    ground.updatePresentation(0.016, Infinity);
    expect(ground.getScrollOffset()).toBe(initialOffset);
  });

  it('destroys container, cleans up detail spans, and does not destroy shared global resources', () => {
    ground.destroy();
    expect(ground.container.destroyed).toBe(true);
    expect(ground.getDetailSpans()).toHaveLength(0);
  });

  it('has zero campaign or system dependencies and can be instantiated anywhere in isolation', () => {
    const isolated = new Ground(60, 'alien-crust');
    expect(isolated.y).toBe(GAME_HEIGHT - 60);
    expect(isolated.terrainId).toBe('alien-crust');
    isolated.destroy();
  });
});
