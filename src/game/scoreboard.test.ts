import { describe, it, expect, beforeEach } from 'vitest';
import { INK } from './visuals/tokens';
import { Scoreboard } from './scoreboard';
import * as PIXI from 'pixi.js';

describe('Scoreboard', () => {
  let scoreboard: Scoreboard;

  beforeEach(() => {
    scoreboard = new Scoreboard();
  });

  it('initializes PIXI container with UI children', () => {
    const container = scoreboard.getContainer();
    expect(container).toBeInstanceOf(PIXI.Container);
    expect(container.children.length).toBeGreaterThanOrEqual(6);
  });

  it('updates text elements with score, level, orbs, and formatted time', () => {
    // 65400 ms = 1 min, 5 seconds, 4 tenths
    scoreboard.update(150, 2, 3, 8, 65400);

    const container = scoreboard.getContainer();
    const textChildren = container.children.filter(c => c instanceof PIXI.Text) as PIXI.Text[];

    const texts = textChildren.map(t => t.text);
    expect(texts).toContain('150');
    expect(texts).toContain('Level: 2');
    expect(texts).toContain('Orbs: 3/8');
    expect(texts).toContain('1:05.4');
  });

  it('adjusts time text color based on urgency thresholds', () => {
    const container = scoreboard.getContainer();
    const timeText = container.children.find(
      c => c instanceof PIXI.Text && c.label === 'time'
    ) as PIXI.Text;

    // Normal time (> 30s)
    scoreboard.update(0, 1, 0, 5, 45000);
    expect(timeText.style.fill).toBe(INK.cyan);

    // Caution time (10s < t <= 30s)
    scoreboard.update(0, 1, 0, 5, 20000);
    expect(timeText.style.fill).toBe(INK.amber);

    // Warning time (5s < t <= 10s)
    scoreboard.update(0, 1, 0, 5, 8000);
    expect(timeText.style.fill).toBe(INK.hazard);

    // Critical time (<= 5s)
    scoreboard.update(0, 1, 0, 5, 3000);
    expect(timeText.style.fill).toBe(INK.hazard);
  });
});
