import { describe, expect, it } from 'vitest';
import { Container } from 'pixi.js';
import { WallPanel } from './WallPanel';

describe('WallPanel', () => {
  it('keeps gameplay bounds independent of camera and graphical stroke, and releases its display resource', () => {
    const bounds = { x: 200, y: 440, width: 80, height: 80 };
    const wall = new WallPanel(bounds, 20);
    const camera = new Container();
    camera.x = -100; camera.scale.set(2); camera.addChild(wall.graphics);
    expect(wall.bounds).toEqual(bounds);
    expect(wall.graphics.x).toBe(200);
    expect(wall.graphics.y).toBe(440);
    expect(wall.remainingSeconds).toBe(20);
    wall.destroy();
    expect(wall.graphics.destroyed).toBe(true);
    expect(camera.children).toHaveLength(0);
    camera.destroy();
  });
});
