import * as PIXI from 'pixi.js';

// Helper function to check if two rectangles overlap
export function rectanglesIntersect(r1: PIXI.Bounds, r2: PIXI.Bounds): boolean {
  return !(
    r1.maxX < r2.minX ||
    r1.minX > r2.maxX ||
    r1.maxY < r2.minY ||
    r1.minY > r2.maxY
  );
} 