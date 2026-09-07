import { describe, expect, it } from 'vitest';
import { resolveSolidMotion, lineSegmentIntersectsRect, lineSegmentIntersectsCircle } from './solidCollision';

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

describe('lineSegmentIntersectsRect', () => {
  const rect = { x: 200, y: 100, width: 100, height: 100 };

  it('detects horizontal and vertical lines penetrating the rectangle', () => {
    // Crosses horizontally from left to right
    expect(lineSegmentIntersectsRect({ x: 100, y: 150 }, { x: 350, y: 150 }, rect)).toBe(true);
    // Crosses vertically from top to bottom
    expect(lineSegmentIntersectsRect({ x: 250, y: 50 }, { x: 250, y: 250 }, rect)).toBe(true);
    // Reverse directions
    expect(lineSegmentIntersectsRect({ x: 350, y: 150 }, { x: 100, y: 150 }, rect)).toBe(true);
    expect(lineSegmentIntersectsRect({ x: 250, y: 250 }, { x: 250, y: 50 }, rect)).toBe(true);
  });

  it('detects diagonal lines cutting through the rectangle', () => {
    expect(lineSegmentIntersectsRect({ x: 150, y: 50 }, { x: 350, y: 250 }, rect)).toBe(true);
    expect(lineSegmentIntersectsRect({ x: 350, y: 50 }, { x: 150, y: 250 }, rect)).toBe(true);
  });

  it('detects segments starting or ending inside the rectangle', () => {
    expect(lineSegmentIntersectsRect({ x: 250, y: 150 }, { x: 400, y: 150 }, rect)).toBe(true);
    expect(lineSegmentIntersectsRect({ x: 100, y: 150 }, { x: 250, y: 150 }, rect)).toBe(true);
    expect(lineSegmentIntersectsRect({ x: 220, y: 120 }, { x: 280, y: 180 }, rect)).toBe(true);
  });

  it('returns false for segments that do not reach or miss the rectangle', () => {
    // Stops before
    expect(lineSegmentIntersectsRect({ x: 50, y: 150 }, { x: 150, y: 150 }, rect)).toBe(false);
    // Starts after
    expect(lineSegmentIntersectsRect({ x: 350, y: 150 }, { x: 450, y: 150 }, rect)).toBe(false);
    // Completely above / below
    expect(lineSegmentIntersectsRect({ x: 100, y: 50 }, { x: 400, y: 50 }, rect)).toBe(false);
    expect(lineSegmentIntersectsRect({ x: 100, y: 250 }, { x: 400, y: 250 }, rect)).toBe(false);
  });

  it('returns false when collinear with outer edge or touching corner externally without entering', () => {
    // Collinear with left edge
    expect(lineSegmentIntersectsRect({ x: 200, y: 0 }, { x: 200, y: 300 }, rect)).toBe(false);
    // Collinear with top edge
    expect(lineSegmentIntersectsRect({ x: 100, y: 100 }, { x: 400, y: 100 }, rect)).toBe(false);
    // Diagonal touching top-left corner (200, 100) externally
    expect(lineSegmentIntersectsRect({ x: 100, y: 200 }, { x: 200, y: 100 }, rect)).toBe(false);
  });
});

describe('lineSegmentIntersectsCircle', () => {
  const circle = { x: 200, y: 200, radius: 50 };

  it('detects segments passing through or ending inside circle', () => {
    expect(lineSegmentIntersectsCircle({ x: 100, y: 200 }, { x: 300, y: 200 }, circle)).toBe(true);
    expect(lineSegmentIntersectsCircle({ x: 200, y: 100 }, { x: 200, y: 300 }, circle)).toBe(true);
    expect(lineSegmentIntersectsCircle({ x: 200, y: 200 }, { x: 400, y: 200 }, circle)).toBe(true);
    expect(lineSegmentIntersectsCircle({ x: 100, y: 200 }, { x: 220, y: 200 }, circle)).toBe(true);
  });

  it('returns false for segments missing the circle or ending before it', () => {
    expect(lineSegmentIntersectsCircle({ x: 100, y: 100 }, { x: 300, y: 100 }, circle)).toBe(false);
    expect(lineSegmentIntersectsCircle({ x: 50, y: 200 }, { x: 120, y: 200 }, circle)).toBe(false);
    expect(lineSegmentIntersectsCircle({ x: 270, y: 200 }, { x: 350, y: 200 }, circle)).toBe(false);
  });
});
