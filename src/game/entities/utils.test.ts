import { describe, it, expect } from 'vitest';
import * as PIXI from 'pixi.js';
import { rectanglesIntersect, circleRectIntersect } from './utils';

function createBounds(minX: number, minY: number, maxX: number, maxY: number): PIXI.Bounds {
  const bounds = new PIXI.Bounds();
  bounds.minX = minX;
  bounds.minY = minY;
  bounds.maxX = maxX;
  bounds.maxY = maxY;
  return bounds;
}

describe('Collision Utilities', () => {
  describe('rectanglesIntersect', () => {
    it('returns true when rectangles overlap completely or partially', () => {
      const r1 = createBounds(0, 0, 100, 100);
      const r2 = createBounds(50, 50, 150, 150);
      expect(rectanglesIntersect(r1, r2)).toBe(true);
      expect(rectanglesIntersect(r2, r1)).toBe(true);
    });

    it('returns true when one rectangle is contained inside another', () => {
      const outer = createBounds(0, 0, 200, 200);
      const inner = createBounds(50, 50, 100, 100);
      expect(rectanglesIntersect(outer, inner)).toBe(true);
      expect(rectanglesIntersect(inner, outer)).toBe(true);
    });

    it('returns false when rectangles are separated horizontally', () => {
      const r1 = createBounds(0, 0, 50, 50);
      const r2 = createBounds(60, 0, 100, 50);
      expect(rectanglesIntersect(r1, r2)).toBe(false);
      expect(rectanglesIntersect(r2, r1)).toBe(false);
    });

    it('returns false when rectangles are separated vertically', () => {
      const r1 = createBounds(0, 0, 50, 50);
      const r2 = createBounds(0, 60, 50, 100);
      expect(rectanglesIntersect(r1, r2)).toBe(false);
      expect(rectanglesIntersect(r2, r1)).toBe(false);
    });

    it('returns true when rectangles touch at the edge', () => {
      const r1 = createBounds(0, 0, 50, 50);
      const r2 = createBounds(50, 0, 100, 50);
      expect(rectanglesIntersect(r1, r2)).toBe(true);
    });
  });

  describe('circleRectIntersect', () => {
    it('returns true when circle center is inside rectangle', () => {
      const rect = createBounds(0, 0, 100, 100);
      expect(circleRectIntersect(50, 50, 10, rect)).toBe(true);
    });

    it('returns true when circle overlaps rectangle edge', () => {
      const rect = createBounds(100, 100, 200, 200);
      // Circle at x=80, radius=25 touches x=100
      expect(circleRectIntersect(80, 150, 25, rect)).toBe(true);
    });

    it('returns true when circle overlaps rectangle corner', () => {
      const rect = createBounds(100, 100, 200, 200);
      // Corner is (100, 100). Distance from (90, 90) is sqrt(100 + 100) ≈ 14.14
      expect(circleRectIntersect(90, 90, 15, rect)).toBe(true);
    });

    it('returns false when circle is outside corner radius', () => {
      const rect = createBounds(100, 100, 200, 200);
      // Distance from (90, 90) to corner (100, 100) is ~14.14. Radius = 10 -> no intersection
      expect(circleRectIntersect(90, 90, 10, rect)).toBe(false);
    });

    it('returns false when circle is clearly separated', () => {
      const rect = createBounds(0, 0, 50, 50);
      expect(circleRectIntersect(200, 200, 20, rect)).toBe(false);
    });
  });
});
