import { RELAY_STATIONS, replayRelayStation } from '../../test/relayWalkthrough';
import { afterEach, describe, expect, it } from 'vitest';
import { Application, Container, Ticker } from 'pixi.js';
import { createFlappySpaceRuntime } from '../createFlappySpaceRuntime';
import { GameRuntime } from '../GameRuntime';
import { SECTOR_03, SECTOR_04 } from './defaultCampaign';
import { DEMO_CAMPAIGN, DEMO_STORAGE_KEY } from './demoCampaign';
import { validateCampaignDefinition } from './validateCampaign';
import { GameFlow } from './GameFlow';
import { LocalStorageSaveService, DEFAULT_STORAGE_KEY } from './save/LocalStorageSaveService';

describe('Relay Vault demo', () => {
  let runtime: GameRuntime | undefined;
  afterEach(() => { runtime?.dispose(); runtime?.app.ticker.destroy(); localStorage.clear(); });

  it('validates a standalone demo with the same geometry and an actual campaign ending', () => {
    expect(validateCampaignDefinition(DEMO_CAMPAIGN)).toEqual({ valid: true, errors: [] });
    expect(DEMO_CAMPAIGN.levels['sector-03'].gameplay).toBe(SECTOR_03.gameplay);
    expect(DEMO_CAMPAIGN.levels['sector-03'].nextLevelId).toBeUndefined();
    expect(SECTOR_03.nextLevelId).toBe(SECTOR_04.id);
    expect(SECTOR_03.gameplay.orbs.placements).toHaveLength(SECTOR_03.gameplay.orbsRequired);
    expect(SECTOR_03.gameplay.orbs.spawnChance).toBe(0);
    const existingCampaignSave = '{"sentinel":"preserve-main-progress"}';
    localStorage.setItem(DEFAULT_STORAGE_KEY, existingCampaignSave);
    const flow = new GameFlow({ campaign: DEMO_CAMPAIGN,
      saveService: new LocalStorageSaveService(DEMO_STORAGE_KEY) });
    flow.startNewGame();
    expect(flow.getPhase()).toEqual({ type: 'playing', levelId: 'sector-03' });
    expect(localStorage.getItem(DEFAULT_STORAGE_KEY)).toBe(existingCampaignSave);
    flow.handleLevelCompleted('sector-03', 400);
    expect(flow.getPhase().type).toBe('credits');
    expect(localStorage.getItem(DEFAULT_STORAGE_KEY)).toBe(existingCampaignSave);
    flow.dispose();
  });

  it('completes every puzzle from spawn with movement, thrust and grapple only', () => {
    const app = new Application(); app.stage = new Container(); app.ticker = new Ticker();
    runtime = createFlappySpaceRuntime(app); runtime.initialize(); app.ticker.stop();
    const flow = new GameFlow({ campaign: DEMO_CAMPAIGN, runtime,
      saveService: new LocalStorageSaveService(DEMO_STORAGE_KEY) });
    flow.startNewGame(); app.ticker.stop();
    const pilot = runtime.systems.entities.getAstronaut()!;
    for (const [index, station] of RELAY_STATIONS.entries()) {
      expect(replayRelayStation(runtime, index)).toBe(station.name);
      expect(runtime.state.getState().orbsCollected).toBe(Math.min(index, 8));
    }
    expect(runtime.state.getState().orbsCollected).toBe(8);
    expect(runtime.state.getState().score).toBe(400);
    expect(pilot.dead).toBe(false);
    expect(runtime.state.getState().isLevelComplete).toBe(true);
    runtime.resume();
    for (let frame = 0; frame < 240; frame++) runtime.onTick({ deltaMS: 1000 / 60 } as Ticker);
    expect(flow.getPhase().type).toBe('credits');
    expect(flow.getProgress().highScores['sector-03']).toBe(400);
    flow.dispose();
  });
});
