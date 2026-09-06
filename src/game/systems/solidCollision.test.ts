import { describe, expect, it } from 'vitest';
import { resolveSolidMotion } from './solidCollision';

const body = { width: 50, height: 50 };
const wall = { x: 200, y: 300, width: 80, height: 100 };

describe('solid panel sweep', () => {
  it('lands on top without tunneling at a large step', () => {
    expect(resolveSolidMotion({ x: 240, y: 200 }, { x: 240, y: 500 }, body, [wall]))
      .toMatchObject({ x: 240, y: 275, landed: true, hitY: true, hitX: false });
  });
  it.each([
    [{ x: 100, y: 350 }, { x: 400, y: 350 }, 175],
    [{ x: 400, y: 350 }, { x: 100, y: 350 }, 305],
  ])('blocks either side', (from, to, x) => {
    expect(resolveSolidMotion(from, to, body, [wall])).toMatchObject({ x, y: 350, hitX: true, landed: false });
  });
  it('blocks the underside without granting a landing', () => {
    expect(resolveSolidMotion({ x: 240, y: 450 }, { x: 240, y: 200 }, body, [wall]))
      .toMatchObject({ y: 425, hitY: true, landed: false });
  });
  it('slides vertically at a side contact and permits moving away', () => {
    expect(resolveSolidMotion({ x: 175, y: 350 }, { x: 195, y: 340 }, body, [wall]))
      .toMatchObject({ x: 175, y: 340 });
    expect(resolveSolidMotion({ x: 175, y: 350 }, { x: 165, y: 340 }, body, [wall]))
      .toMatchObject({ x: 165, y: 340, hitX: false });
  });
  it('permits thrust and walking off a top surface', () => {
    expect(resolveSolidMotion({ x: 240, y: 275 }, { x: 240, y: 270 }, body, [wall]))
      .toMatchObject({ y: 270, hitY: false });
    expect(resolveSolidMotion({ x: 304, y: 275 }, { x: 310, y: 276 }, body, [wall]))
      .toMatchObject({ x: 310, y: 275, landed: true });
    expect(resolveSolidMotion({ x: 310, y: 275 }, { x: 315, y: 276 }, body, [wall]))
      .toMatchObject({ x: 315, y: 276, landed: false });
  });
  it('chooses the nearest contact regardless of geometry order', () => {
    const farther = { ...wall, x: 400 };
    for (const walls of [[wall, farther], [farther, wall]]) {
      expect(resolveSolidMotion({ x: 100, y: 350 }, { x: 600, y: 350 }, body, walls).x).toBe(175);
    }
  });
  it('preserves movement with no panels or with a distant panel', () => {
    for (const walls of [[], [wall]]) {
      expect(resolveSolidMotion({ x: 50, y: 50 }, { x: 55, y: 60 }, body, walls))
        .toEqual({ x: 55, y: 60, landed: false, hitX: false, hitY: false });
    }
  });
});
