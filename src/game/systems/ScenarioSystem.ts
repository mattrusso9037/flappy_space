import { ScenarioDefinition } from '../campaign/campaignTypes';
import { EventBus, GameEvent } from '../eventBus';
import { CameraSystem } from './CameraSystem';
import { getLogger } from '../../utils/logger';

const logger = getLogger('ScenarioSystem');

/**
 * Lightweight gameplay system that detects world-space scenario zone entry, exit,
 * and completion.
 *
 * ## Ownership
 * - Scenario entry/exit detection and event emission: this system.
 * - Camera lock/unlock: delegated to CameraSystem (gameplay policy → camera responds).
 * - Camera Pixi transforms: owned by RenderSystem exclusively.
 *
 * ## Rules
 * - A completed scenario cannot be re-entered.
 * - Only one scenario is active at a time.
 * - Entities never call this system; GameRuntime drives it via update().
 */
export class ScenarioSystem {
  private scenarios: ScenarioDefinition[];
  private activeScenarioId: string | null = null;
  private completedScenarioIds: Set<string> = new Set();

  constructor(
    private readonly events: EventBus,
    private readonly camera: CameraSystem,
    scenarios: ScenarioDefinition[] = []
  ) {
    this.scenarios = scenarios;
    logger.info('ScenarioSystem initialized', { scenarioCount: scenarios.length });
  }

  /**
   * Check current astronaut world position against scenario triggers.
   * Call once per frame from GameRuntime after physics.
   */
  update(worldX: number): void {
    // Check active scenario for exit
    if (this.activeScenarioId !== null) {
      const active = this.scenarios.find(s => s.id === this.activeScenarioId);
      if (active && !this.isInTrigger(worldX, active)) {
        const exitId = this.activeScenarioId;
        this.activeScenarioId = null;
        this.camera.unlockFromScenario();
        this.events.emit(GameEvent.SCENARIO_EXITED, { scenarioId: exitId });
        logger.info('Scenario exited', { scenarioId: exitId });
      }
      return; // Don't check entry while inside a scenario
    }

    // Check for entry into any non-completed scenario
    for (const scenario of this.scenarios) {
      if (this.completedScenarioIds.has(scenario.id)) continue;
      if (this.isInTrigger(worldX, scenario)) {
        this.activeScenarioId = scenario.id;
        this.camera.lockToScenario(scenario);
        this.events.emit(GameEvent.SCENARIO_ENTERED, { scenarioId: scenario.id });
        logger.info('Scenario entered', { scenarioId: scenario.id });
        break;
      }
    }
  }

  /**
   * Mark a scenario as complete. Camera unlocks and scenario cannot be re-entered.
   * Call from dev path (e.g. debug key) or future game logic.
   */
  completeScenario(id: string): void {
    this.completedScenarioIds.add(id);
    if (this.activeScenarioId === id) {
      this.activeScenarioId = null;
      this.camera.unlockFromScenario();
      this.events.emit(GameEvent.SCENARIO_COMPLETED, { scenarioId: id });
      logger.info('Scenario completed', { scenarioId: id });
    }
  }

  getActiveScenarioId(): string | null {
    return this.activeScenarioId;
  }

  isCompleted(id: string): boolean {
    return this.completedScenarioIds.has(id);
  }

  /** Reset all scenario state. Call on level reset or transition. */
  reset(): void {
    this.activeScenarioId = null;
    this.completedScenarioIds = new Set();
    logger.debug('ScenarioSystem reset');
  }

  private isInTrigger(worldX: number, scenario: ScenarioDefinition): boolean {
    return worldX >= scenario.trigger.x && worldX <= scenario.trigger.x + scenario.trigger.width;
  }
}
