import { describe, it, expect, vi } from 'vitest';
import { ScenarioSystem } from './ScenarioSystem';
import { CameraSystem } from './CameraSystem';
import { EventBus, GameEvent } from '../eventBus';

const SCENARIO = {
  id: 'crystal-chamber',
  trigger: { x: 1000, y: 0, width: 400, height: 600 },
  cameraBounds: { x: 1000, y: 0, width: 800, height: 600 },
};

function makeSystem(scenarios = [SCENARIO]) {
  const events = new EventBus();
  const camera = new CameraSystem(800, 0.34);
  const system = new ScenarioSystem(events, camera, scenarios);
  return { events, camera, system };
}

describe('ScenarioSystem', () => {
  describe('initial state', () => {
    it('has no active scenario', () => {
      const { system } = makeSystem();
      expect(system.getActiveScenarioId()).toBeNull();
    });
  });

  describe('scenario entry', () => {
    it('detects entry when worldX enters the trigger zone', () => {
      const { system } = makeSystem();
      system.update(500); // outside
      expect(system.getActiveScenarioId()).toBeNull();
      system.update(1200); // inside trigger [1000, 1400]
      expect(system.getActiveScenarioId()).toBe('crystal-chamber');
    });

    it('emits SCENARIO_ENTERED event on entry', () => {
      const { events, system } = makeSystem();
      const handler = vi.fn();
      events.on(GameEvent.SCENARIO_ENTERED).subscribe(handler);
      system.update(1200);
      expect(handler).toHaveBeenCalledWith({ scenarioId: 'crystal-chamber' });
    });

    it('locks the camera on entry', () => {
      const { camera, system } = makeSystem();
      system.update(1200);
      expect(camera.isLocked()).toBe(true);
    });
  });

  describe('scenario exit', () => {
    it('detects exit when worldX leaves the trigger zone', () => {
      const { system } = makeSystem();
      system.update(1200); // enter
      expect(system.getActiveScenarioId()).toBe('crystal-chamber');
      system.update(500); // exit (walked back)
      expect(system.getActiveScenarioId()).toBeNull();
    });

    it('emits SCENARIO_EXITED event on exit', () => {
      const { events, system } = makeSystem();
      const handler = vi.fn();
      events.on(GameEvent.SCENARIO_EXITED).subscribe(handler);
      system.update(1200); // enter
      system.update(500);  // exit
      expect(handler).toHaveBeenCalledWith({ scenarioId: 'crystal-chamber' });
    });

    it('unlocks camera on exit', () => {
      const { camera, system } = makeSystem();
      system.update(1200); // enter
      system.update(500);  // exit
      expect(camera.isLocked()).toBe(false);
    });
  });

  describe('scenario completion', () => {
    it('emits SCENARIO_COMPLETED and clears active scenario', () => {
      const { events, system } = makeSystem();
      const handler = vi.fn();
      events.on(GameEvent.SCENARIO_COMPLETED).subscribe(handler);
      system.update(1200); // enter
      system.completeScenario('crystal-chamber');
      expect(system.getActiveScenarioId()).toBeNull();
      expect(handler).toHaveBeenCalledWith({ scenarioId: 'crystal-chamber' });
    });

    it('marks the scenario as completed', () => {
      const { system } = makeSystem();
      system.completeScenario('crystal-chamber');
      expect(system.isCompleted('crystal-chamber')).toBe(true);
    });

    it('does not re-enter a completed scenario', () => {
      const { system } = makeSystem();
      system.update(1200); // enter
      system.completeScenario('crystal-chamber');
      system.update(500);  // walk out
      system.update(1200); // walk back in — should NOT re-enter
      expect(system.getActiveScenarioId()).toBeNull();
    });

    it('does not emit SCENARIO_ENTERED for a completed scenario', () => {
      const { events, system } = makeSystem();
      system.completeScenario('crystal-chamber');
      const handler = vi.fn();
      events.on(GameEvent.SCENARIO_ENTERED).subscribe(handler);
      system.update(1200);
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('reset', () => {
    it('clears active scenario and completed set', () => {
      const { system } = makeSystem();
      system.update(1200);
      system.completeScenario('crystal-chamber');
      system.reset();
      expect(system.getActiveScenarioId()).toBeNull();
      expect(system.isCompleted('crystal-chamber')).toBe(false);
    });

    it('allows re-entry after reset', () => {
      const { system } = makeSystem();
      system.update(1200);
      system.completeScenario('crystal-chamber');
      system.reset();
      system.update(1200); // re-enter after reset
      expect(system.getActiveScenarioId()).toBe('crystal-chamber');
    });
  });
});
