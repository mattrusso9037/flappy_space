import { Ticker } from 'pixi.js';
import { GameRuntime } from '../game/GameRuntime';

/** Dev/test solution replay. Drives production movement only, never edits positions or scores. */
export const RELAY_STATIONS = [
  { name: 'Launch pad', x: 260, y: 495 },
  { name: 'First landing', x: 400, y: 415, jump: true },
  { name: 'Stepping stones', x: 680, y: 325, jump: true },
  { name: 'First grapple catch', x: 1030, y: 255, anchor: 'first-ascent' },
  { name: 'Upper balcony', x: 1470, y: 195, anchor: 'upper-balcony' },
  { name: 'Over the vault', x: 1640, y: 155, anchor: 'vault-crossing' },
  { name: 'Recovery platform', x: 1980, y: 325 },
  { name: 'Under the ceiling', x: 2230, y: 245, jump: true },
  { name: 'Final relay', x: 2640, y: 165, anchor: 'final-relay' },
] as const;

export function replayRelayStation(runtime: GameRuntime, index: number): string {
  const station = RELAY_STATIONS[index];
  const pilot = runtime.systems.entities.getAstronaut();
  if (!station || !pilot) throw new Error('Relay replay needs an active pilot and valid station.');
  const tools = runtime.systems.tools;
  const tick = () => runtime.onTick({ deltaMS: 1000 / 60 } as Ticker);
  runtime.resume();
  try {
    if ('jump' in station && !pilot.thrust()) throw new Error('Relay replay could not thrust.');
    if ('anchor' in station) {
      tools.face(1);
      if (tools.use() !== 'attached' || tools.getAttachment()?.id !== station.anchor) {
        throw new Error(`Relay replay could not attach to ${station.anchor}.`);
      }
      for (let i = 0; i < 180 && tools.getAttachment(); i++) tick();
      if (tools.getAttachment()) throw new Error('Relay replay grapple failed to reach its anchor.');
    }
    for (let i = 0; i < 240; i++) {
      if (pilot.worldX < station.x - 2) { pilot.moveRight(); tools.face(1); }
      else if (pilot.worldX > station.x + 2) { pilot.moveLeft(); tools.face(-1); }
      tick();
      if (Math.abs(pilot.worldX - station.x) < 10 && pilot.isGrounded &&
          Math.abs(pilot.sprite.y - station.y) < 1) return station.name;
    }
    throw new Error(`Relay replay missed ${station.name}: (${pilot.worldX}, ${pilot.sprite.y}).`);
  } finally {
    runtime.pause();
  }
}
