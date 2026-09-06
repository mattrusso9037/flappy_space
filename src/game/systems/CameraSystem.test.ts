import { describe, it, expect, beforeEach } from 'vitest';
import { CameraSystem } from './CameraSystem';

const VIEWPORT = 800;
const WORLD_WIDTH = 2400;

describe('CameraSystem', () => {
  let camera: CameraSystem;

  beforeEach(() => {
    camera = new CameraSystem(VIEWPORT, 0.34);
  });

  describe('initial state', () => {
    it('starts at cameraX=0', () => {
      expect(camera.getCameraX()).toBe(0);
    });

    it('is not locked', () => {
      expect(camera.isLocked()).toBe(false);
    });
  });

  describe('dead zone follow', () => {
    it('does not pan when astronaut is within the center dead zone', () => {
      // Dead zone: [800*0.33=264, 800*0.67=536]
      camera.update(400, WORLD_WIDTH); // center
      expect(camera.getCameraX()).toBe(0);
    });

    it('pans right when astronaut crosses the right dead zone edge', () => {
      const deadZoneRight = camera.getDeadZoneRight(); // 536
      // Place astronaut just past the right edge of dead zone
      camera.update(deadZoneRight + 1, WORLD_WIDTH);
      expect(camera.getCameraX()).toBeGreaterThan(0);
    });

    it('does not pan left below 0 (world left bound)', () => {
      // Astronaut at x=50, camera starts at 0
      camera.update(50, WORLD_WIDTH);
      expect(camera.getCameraX()).toBe(0); // cannot go negative
    });

    it('clamps cameraX at worldWidth - viewportWidth', () => {
      const maxCameraX = WORLD_WIDTH - VIEWPORT; // 1600
      // Astronaut at far right of world
      camera.update(WORLD_WIDTH - 10, WORLD_WIDTH);
      expect(camera.getCameraX()).toBe(maxCameraX);
    });

    it('follows astronaut smoothly into the world', () => {
      // Walk from start to 1000 in steps, camera should follow
      let prevCameraX = 0;
      for (let wx = 0; wx <= 1000; wx += 50) {
        const cx = camera.update(wx, WORLD_WIDTH);
        expect(cx).toBeGreaterThanOrEqual(prevCameraX);
        prevCameraX = cx;
      }
    });

    it('camera follow is reversible: pans left when astronaut walks back', () => {
      // Walk right until camera is panning
      for (let wx = 0; wx <= 1200; wx += 100) {
        camera.update(wx, WORLD_WIDTH);
      }
      const cxAtRight = camera.getCameraX();

      // Walk all the way back to start
      for (let wx = 1200; wx >= 0; wx -= 100) {
        camera.update(wx, WORLD_WIDTH);
      }
      const cxAtLeft = camera.getCameraX();

      expect(cxAtLeft).toBeLessThan(cxAtRight);
      expect(cxAtLeft).toBe(0);
    });
  });

  describe('scenario lock', () => {
    const scenario = {
      id: 'crystal-chamber',
      trigger: { x: 1600, y: 0, width: 400, height: 600 },
      cameraBounds: { x: 1600, y: 0, width: 800, height: 600 },
    };

    it('locks camera to scenario.cameraBounds.x on lockToScenario()', () => {
      camera.lockToScenario(scenario);
      camera.update(1700, WORLD_WIDTH);
      expect(camera.getCameraX()).toBe(1600);
      expect(camera.isLocked()).toBe(true);
    });

    it('camera stays locked regardless of astronaut movement', () => {
      camera.lockToScenario(scenario);
      camera.update(100, WORLD_WIDTH); // astronaut walks away
      expect(camera.getCameraX()).toBe(1600);
    });

    it('resumes follow after unlockFromScenario()', () => {
      camera.lockToScenario(scenario);
      camera.update(1700, WORLD_WIDTH);
      camera.unlockFromScenario();
      expect(camera.isLocked()).toBe(false);
      // After unlock, camera should follow astronaut again
      const cx = camera.update(500, WORLD_WIDTH);
      // Camera should update based on astronaut position now
      expect(camera.getLockedScenario()).toBeNull();
      expect(typeof cx).toBe('number');
    });

    it('clamps locked camera to world bounds when cameraBounds.x is near world end', () => {
      const farScenario = {
        id: 'far-end',
        trigger: { x: 2300, y: 0, width: 100, height: 600 },
        cameraBounds: { x: 2300, y: 0, width: 800, height: 600 }, // would go past world
      };
      camera.lockToScenario(farScenario);
      camera.update(2350, WORLD_WIDTH);
      expect(camera.getCameraX()).toBe(WORLD_WIDTH - VIEWPORT); // clamped to 1600
    });
  });

  describe('reset', () => {
    it('resets cameraX to 0 and clears lock', () => {
      camera.update(1500, WORLD_WIDTH);
      camera.lockToScenario({
        id: 's',
        trigger: { x: 1500, y: 0, width: 100, height: 600 },
        cameraBounds: { x: 1500, y: 0, width: 800, height: 600 },
      });
      camera.reset();
      expect(camera.getCameraX()).toBe(0);
      expect(camera.isLocked()).toBe(false);
    });
  });
});

it('tracks continuously across multiple loop seams in both directions', () => {
  const camera = new CameraSystem();
  let previous = camera.getCameraX();
  for (let x = 160; x <= 8000; x += 4) {
    const next = camera.update(x, 2400, true, 1 / 60);
    expect(Math.abs(next - previous)).toBeLessThanOrEqual(8);
    previous = next;
  }
  for (let x = 8000; x >= -3000; x -= 4) {
    const next = camera.update(x, 2400, true, 1 / 60);
    expect(Math.abs(next - previous)).toBeLessThanOrEqual(8);
    previous = next;
  }
  expect(previous).toBeLessThan(-2400);
  camera.reset();
  expect(camera.update(8000, 2400)).toBe(1600);
});

it('limits scenario entry and exit camera movement to simulation time', () => {
  const camera = new CameraSystem();
  camera.update(1599, 2400, true);
  const before = camera.getCameraX();
  camera.lockToScenario({ id: 's', trigger: { x: 1600, y: 0, width: 400, height: 600 }, cameraBounds: { x: 1600, y: 0, width: 800, height: 600 } });
  expect(camera.update(1601, 2400, true, 1 / 60) - before).toBe(8);
  const locked = camera.getCameraX();
  expect(camera.update(1601, 2400, true, 0)).toBe(locked);
  camera.unlockFromScenario();
  expect(Math.abs(camera.update(2001, 2400, true, 1 / 60) - locked)).toBeLessThanOrEqual(8);
});
