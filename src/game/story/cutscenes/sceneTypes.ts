/** Presentation-only actors. Positions are in the canonical 800 x 600 world. */
export type SceneActorKind = 'ship' | 'pilot' | 'wormhole' | 'repair-sparks' | 'tether' | 'matter-gun';

export interface ActorPose {
  x: number;
  y: number;
  scale: number;
  rotation: number;
  alpha: number;
}

export interface ActorKeyframe extends ActorPose {
  time: number;
}

export interface SceneActor {
  id: string;
  kind: SceneActorKind;
  keyframes: ActorKeyframe[];
}

export interface CinematicScene {
  backdrop?: 'space' | 'surface' | 'none';
  actors: SceneActor[];
}

/** Clamp at either end; interpolate all presentation properties between frames. */
export function sampleActor(actor: SceneActor, time: number): ActorPose {
  const frames = actor.keyframes;
  const first = frames[0];
  if (time <= first.time) return { ...first };
  for (let i = 1; i < frames.length; i++) {
    const end = frames[i];
    if (time > end.time) continue;
    const start = frames[i - 1];
    const t = (time - start.time) / (end.time - start.time);
    return {
      x: start.x + (end.x - start.x) * t,
      y: start.y + (end.y - start.y) * t,
      scale: start.scale + (end.scale - start.scale) * t,
      rotation: start.rotation + (end.rotation - start.rotation) * t,
      alpha: start.alpha + (end.alpha - start.alpha) * t,
    };
  }
  return { ...frames[frames.length - 1] };
}

export function validateScene(scene: CinematicScene, duration: number): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  if (scene.backdrop !== undefined && !['space', 'surface', 'none'].includes(scene.backdrop)) {
    errors.push('Invalid scene backdrop.');
  }
  if (!Array.isArray(scene?.actors) || !scene.actors.length) return ['Scene must contain actors.'];
  for (const actor of scene.actors) {
    if (!actor.id || ids.has(actor.id)) errors.push('Scene actor IDs must be non-empty and unique.');
    ids.add(actor.id);
    if (!['ship', 'pilot', 'wormhole', 'repair-sparks', 'tether', 'matter-gun'].includes(actor.kind)) errors.push('Unknown actor kind.');
    if (!Array.isArray(actor.keyframes) || !actor.keyframes.length) {
      errors.push('Actor must contain keyframes.');
      continue;
    }
    let previous = -1;
    for (const frame of actor.keyframes) {
      if (![frame.time, frame.x, frame.y, frame.scale, frame.rotation, frame.alpha].every(Number.isFinite)
        || frame.time < 0 || frame.time > duration || frame.time <= previous
        || frame.scale < 0 || frame.alpha < 0 || frame.alpha > 1) errors.push('Invalid actor keyframe.');
      previous = frame.time;
    }
  }
  return errors;
}
