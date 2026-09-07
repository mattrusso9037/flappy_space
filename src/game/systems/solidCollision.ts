import { Rect } from '../campaign/campaignTypes';

export interface Point { x: number; y: number }

/** Sweep a logical body against static panels, then slide along the earliest contact.
 * Geometry is world-space. No sprite bounds, camera transforms or movement tuning.
 */
export function resolveSolidMotion(from: Point, to: Point, body: { width: number; height: number }, solids: readonly Readonly<Rect>[]) {
  let x = from.x, y = from.y;
  let dx = to.x - x, dy = to.y - y;
  let landed = false, hitX = false, hitY = false;
  for (let pass = 0; pass < 3; pass++) {
    let time = Infinity, nx = 0, ny = 0;
    for (const rect of solids) {
      const minX = rect.x - body.width / 2, maxX = rect.x + rect.width + body.width / 2;
      const minY = rect.y - body.height / 2, maxY = rect.y + rect.height + body.height / 2;
      // Tangential contact alone must not block motion away from a surface.
      if ((dx === 0 && (x <= minX || x >= maxX)) || (dy === 0 && (y <= minY || y >= maxY))) continue;
      const tx1 = dx === 0 ? -Infinity : (minX - x) / dx;
      const tx2 = dx === 0 ? Infinity : (maxX - x) / dx;
      const ty1 = dy === 0 ? -Infinity : (minY - y) / dy;
      const ty2 = dy === 0 ? Infinity : (maxY - y) / dy;
      const enterX = Math.min(tx1, tx2), enterY = Math.min(ty1, ty2);
      const enter = Math.max(enterX, enterY), leave = Math.min(Math.max(tx1, tx2), Math.max(ty1, ty2));
      if (enter < 0 || enter > 1 || enter > leave || enter >= time) continue;
      time = enter;
      nx = enterX > enterY ? -Math.sign(dx) : 0;
      ny = enterX > enterY ? 0 : -Math.sign(dy);
    }
    if (time === Infinity) { x += dx; y += dy; break; }
    x += dx * time; y += dy * time;
    dx *= 1 - time; dy *= 1 - time;
    if (nx) { dx = 0; hitX = true; }
    if (ny) { dy = 0; hitY = true; landed ||= ny === -1; }
  }
  return { x, y, landed, hitX, hitY };
}

/**
 * Test if a 2D line segment between `from` and `to` penetrates an axis-aligned rectangle.
 * Grazing a corner or external edge without entering the interior returns false.
 */
export function lineSegmentIntersectsRect(from: Point, to: Point, rect: Rect): boolean {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const minX = rect.x;
  const maxX = rect.x + rect.width;
  const minY = rect.y;
  const maxY = rect.y + rect.height;

  let tminX = -Infinity;
  let tmaxX = Infinity;
  if (Math.abs(dx) < 1e-9) {
    if (from.x <= minX || from.x >= maxX) return false;
  } else {
    const t1 = (minX - from.x) / dx;
    const t2 = (maxX - from.x) / dx;
    tminX = Math.min(t1, t2);
    tmaxX = Math.max(t1, t2);
  }

  let tminY = -Infinity;
  let tmaxY = Infinity;
  if (Math.abs(dy) < 1e-9) {
    if (from.y <= minY || from.y >= maxY) return false;
  } else {
    const t1 = (minY - from.y) / dy;
    const t2 = (maxY - from.y) / dy;
    tminY = Math.min(t1, t2);
    tmaxY = Math.max(t1, t2);
  }

  const tEnter = Math.max(tminX, tminY);
  const tExit = Math.min(tmaxX, tmaxY);

  const tStart = Math.max(0, tEnter);
  const tEnd = Math.min(1, tExit);

  return tStart + 1e-6 < tEnd;
}

/**
 * Test if a 2D line segment between `from` and `to` intersects a circle.
 */
export function lineSegmentIntersectsCircle(
  from: Point,
  to: Point,
  circle: { x: number; y: number; radius: number }
): boolean {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const lengthSq = dx * dx + dy * dy;

  if (lengthSq < 1e-9) {
    const distSq = (from.x - circle.x) ** 2 + (from.y - circle.y) ** 2;
    return distSq < circle.radius * circle.radius;
  }

  const t = ((circle.x - from.x) * dx + (circle.y - from.y) * dy) / lengthSq;
  const tClamped = Math.max(0, Math.min(1, t));
  const closestX = from.x + tClamped * dx;
  const closestY = from.y + tClamped * dy;

  const distSq = (closestX - circle.x) ** 2 + (closestY - circle.y) ** 2;
  return distSq < circle.radius * circle.radius;
}
