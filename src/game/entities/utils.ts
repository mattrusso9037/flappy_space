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

// Helper function to calculate if a rectangle and circle overlap
// More accurate for planet collisions than rectangle-rectangle
export function circleRectIntersect(
  circleCenterX: number, 
  circleCenterY: number, 
  circleRadius: number,
  rect: PIXI.Bounds
): boolean {
  // Find the closest point in the rectangle to the circle's center
  const closestX = Math.max(rect.minX, Math.min(circleCenterX, rect.maxX));
  const closestY = Math.max(rect.minY, Math.min(circleCenterY, rect.maxY));
  
  // Calculate the distance between the circle's center and this closest point
  const distanceX = circleCenterX - closestX;
  const distanceY = circleCenterY - closestY;
  
  // If the distance is less than the circle's radius, an intersection occurs
  const distanceSquared = (distanceX * distanceX) + (distanceY * distanceY);
  
  return distanceSquared < (circleRadius * circleRadius);
} 