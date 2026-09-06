import { describe, it, expect, beforeEach } from 'vitest';
import * as PIXI from 'pixi.js';
import { GameFlow } from './GameFlow';
import { DEFAULT_CAMPAIGN } from './defaultCampaign';
import { SaveService } from './save/SaveService';
import { CampaignProgress } from './campaignTypes';
import { createFlappySpaceRuntime } from '../createFlappySpaceRuntime';
import { GameEvent } from '../eventBus';

class MockSaveService implements SaveService {
  public savedData: CampaignProgress | null = null;

  public load(): CampaignProgress | null {
    return this.savedData;
  }

  public save(progress: CampaignProgress): void {
    this.savedData = JSON.parse(JSON.stringify(progress));
  }

  public clear(): void {
    this.savedData = null;
  }
}

describe('GameFlow', () => {
  let mockSaveService: MockSaveService;
  let flow: GameFlow;

  beforeEach(() => {
    mockSaveService = new MockSaveService();
    flow = new GameFlow({
      campaign: DEFAULT_CAMPAIGN,
      saveService: mockSaveService,
    });
  });

  it('starts in title phase with initial campaign progress', () => {
    expect(flow.getPhase()).toEqual({ type: 'title' });
    expect(flow.getProgress().currentLevelId).toBe('sector-01');
    expect(flow.getProgress().unlockedLevelIds).toEqual(['sector-01']);
    expect(flow.getProgress().completedLevelIds).toEqual([]);
    expect(flow.hasSave()).toBe(false);
  });

  it('starts a new game on the configured starting level and persists initial checkpoint', () => {
    flow.startNewGame();

    expect(flow.getPhase()).toEqual({ type: 'playing', levelId: 'sector-01' });
    expect(mockSaveService.savedData).not.toBeNull();
    expect(mockSaveService.savedData?.currentLevelId).toBe('sector-01');
  });

  it('advances progression and updates checkpoint on level completion', () => {
    flow.startNewGame();

    flow.handleLevelCompleted('sector-01', 500);

    const progress = flow.getProgress();
    expect(progress.completedLevelIds).toContain('sector-01');
    expect(progress.unlockedLevelIds).toContain('sector-02');
    expect(progress.currentLevelId).toBe('sector-02');
    expect(progress.highScores['sector-01']).toBe(500);
    expect(flow.getPhase()).toEqual({ type: 'playing', levelId: 'sector-02' });

    // Verify checkpoint was persisted
    expect(mockSaveService.savedData?.currentLevelId).toBe('sector-02');
  });

  it('marks campaign complete (credits phase) when final sector is completed', () => {
    flow.startLevel('sector-05');
    expect(flow.getPhase()).toEqual({ type: 'playing', levelId: 'sector-05' });

    flow.handleLevelCompleted('sector-05', 1200);

    expect(flow.getPhase()).toEqual({ type: 'credits' });
    expect(flow.getProgress().completedLevelIds).toContain('sector-05');
    expect(flow.getProgress().highScores['sector-05']).toBe(1200);
  });

  it('does NOT advance campaign progression on game over', () => {
    flow.startLevel('sector-02');

    flow.handleGameOver('sector-02');

    expect(flow.getPhase()).toEqual({ type: 'gameOver', levelId: 'sector-02' });
    expect(flow.getProgress().completedLevelIds).not.toContain('sector-02');
    expect(flow.getProgress().currentLevelId).toBe('sector-02');
  });

  it('retries restarts the same active level', () => {
    flow.startLevel('sector-03');
    flow.handleGameOver('sector-03');
    expect(flow.getPhase()).toEqual({ type: 'gameOver', levelId: 'sector-03' });

    flow.retryLevel();

    expect(flow.getPhase()).toEqual({ type: 'playing', levelId: 'sector-03' });
    expect(flow.getProgress().currentLevelId).toBe('sector-03');
  });

  it('continues saved game checkpoint when valid save exists', () => {
    mockSaveService.savedData = {
      schemaVersion: 1,
      campaignId: DEFAULT_CAMPAIGN.id,
      currentLevelId: 'sector-03',
      unlockedLevelIds: ['sector-01', 'sector-02', 'sector-03'],
      completedLevelIds: ['sector-01', 'sector-02'],
      highScores: { 'sector-01': 400, 'sector-02': 600 },
      storyFlags: {},
      updatedAt: new Date().toISOString(),
    };

    const savedFlow = new GameFlow({
      campaign: DEFAULT_CAMPAIGN,
      saveService: mockSaveService,
    });

    expect(savedFlow.hasSave()).toBe(true);

    savedFlow.continueGame();

    expect(savedFlow.getPhase()).toEqual({ type: 'playing', levelId: 'sector-03' });
    expect(savedFlow.getProgress().currentLevelId).toBe('sector-03');
  });

  it('falls back safely to starting level if requested level ID does not exist', () => {
    flow.startLevel('non-existent-sector');

    expect(flow.getPhase()).toEqual({ type: 'playing', levelId: 'sector-01' });
  });

  it('returns to title phase and resets properly', () => {
    flow.startLevel('sector-02');
    expect(flow.getPhase().type).toBe('playing');

    flow.returnToTitle();

    expect(flow.getPhase()).toEqual({ type: 'title' });
  });

  it('isolates independent GameFlow instances completely', () => {
    const save1 = new MockSaveService();
    const save2 = new MockSaveService();

    const flow1 = new GameFlow({ campaign: DEFAULT_CAMPAIGN, saveService: save1 });
    const flow2 = new GameFlow({ campaign: DEFAULT_CAMPAIGN, saveService: save2 });

    flow1.startNewGame();
    flow1.handleLevelCompleted('sector-01', 300);

    expect(flow1.getProgress().currentLevelId).toBe('sector-02');
    expect(flow2.getProgress().currentLevelId).toBe('sector-01');
    expect(flow2.getPhase()).toEqual({ type: 'title' });
  });

  it('wires runtime outcome events into GameFlow and coordinates next level execution', () => {
    const app = new PIXI.Application();
    app.stage = new PIXI.Container();
    app.ticker = new PIXI.Ticker();

    const runtime = createFlappySpaceRuntime(app);
    runtime.initialize();

    const attachedFlow = new GameFlow({
      campaign: DEFAULT_CAMPAIGN,
      saveService: mockSaveService,
      runtime,
    });

    attachedFlow.startNewGame();
    expect(attachedFlow.getPhase()).toEqual({ type: 'playing', levelId: 'sector-01' });
    expect(runtime.state.getState().level).toBe(1);

    // Simulate level completion outcome emitted by runtime
    runtime.events.emit(GameEvent.LEVEL_COMPLETED, {
      levelId: 'sector-01',
      score: 450,
    });

    // GameFlow automatically catches LEVEL_COMPLETED and starts sector-02
    expect(attachedFlow.getPhase()).toEqual({ type: 'playing', levelId: 'sector-02' });
    expect(runtime.state.getState().level).toBe(2);
    expect(attachedFlow.getProgress().completedLevelIds).toContain('sector-01');

    // Simulate GAME_OVER outcome emitted by runtime
    runtime.events.emit(GameEvent.GAME_OVER, { reason: 'collision' });
    expect(attachedFlow.getPhase()).toEqual({ type: 'gameOver', levelId: 'sector-02' });

    attachedFlow.dispose();
    runtime.dispose();
  });
});
