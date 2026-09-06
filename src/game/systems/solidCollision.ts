import { Rect } from '../campaign/campaignTypes';

interface Point { x: number; y: number }

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
