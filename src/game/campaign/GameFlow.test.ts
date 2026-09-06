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
    expect(flow.getPhase()).toEqual({ type: 'cutscene', cutsceneId: 'opening-spacewalk' });
    flow.completeStoryPhase();

    expect(flow.getPhase()).toEqual({ type: 'playing', levelId: 'sector-01' });
    expect(mockSaveService.savedData).not.toBeNull();
    expect(mockSaveService.savedData?.currentLevelId).toBe('sector-01');
  });

  it('advances progression and updates checkpoint on level completion', () => {
    flow.startNewGame();
    expect(flow.getPhase()).toEqual({ type: 'cutscene', cutsceneId: 'opening-spacewalk' });
    flow.completeStoryPhase();

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
    expect(flow.getPhase()).toEqual({ type: 'cutscene', cutsceneId: 'opening-spacewalk' });
    flow.completeStoryPhase();

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
    expect(runtime.state.getState().isStarted).toBe(false);
    attachedFlow.completeStoryPhase();
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

  describe('Story Transitions & Continuations', () => {
    function createStoryCampaign(): typeof DEFAULT_CAMPAIGN {
      return {
        id: 'story-campaign',
        name: 'Story Campaign',
        startingLevelId: 'lvl-intro',
        levels: {
          'lvl-intro': {
            id: 'lvl-intro',
            name: 'Intro Level',
            intro: { type: 'dialogue', id: 'unknown-signal' },
            gameplay: {
              speeds: { planet: 3, secondaryPlanet: 2.5, orb: 2 },
              spawnInterval: 2500,
              orbsRequired: 5,
              timeLimit: 60000,
              obstacles: { minPlanetRadius: 20, maxPlanetRadius: 45, secondaryPlanetChance: 0 },
              orbs: { spawnChance: 0.4 },
            },
            presentation: { environmentId: 'deep-nebula' },
            outro: { type: 'cutscene', id: 'first-signal' },
            nextLevelId: 'lvl-video',
          },
          'lvl-video': {
            id: 'lvl-video',
            name: 'Video Level',
            intro: { type: 'video', id: 'opening-transmission' },
            gameplay: {
              speeds: { planet: 3, secondaryPlanet: 2.5, orb: 2 },
              spawnInterval: 2500,
              orbsRequired: 5,
              timeLimit: 60000,
              obstacles: { minPlanetRadius: 20, maxPlanetRadius: 45, secondaryPlanetChance: 0 },
              orbs: { spawnChance: 0.4 },
            },
            presentation: { environmentId: 'violet-reach' },
          },
        },
        ending: { type: 'video', id: 'opening-transmission' },
      };
    }

    it('enters dialogue intro phase on first arrival to level with dialogue intro', () => {
      const storyCampaign = createStoryCampaign();
      const storyFlow = new GameFlow({ campaign: storyCampaign, saveService: mockSaveService });

      storyFlow.startNewGame();

      expect(storyFlow.getPhase()).toEqual({ type: 'dialogue', dialogueId: 'unknown-signal' });
      expect(storyFlow.hasStoryFlag('seen:lvl-intro:intro')).toBe(true);

      // Complete story phase advances to gameplay
      storyFlow.completeStoryPhase();
      expect(storyFlow.getPhase()).toEqual({ type: 'playing', levelId: 'lvl-intro' });
    });

    it('enters video intro phase on arrival to level with video intro', () => {
      const storyCampaign = createStoryCampaign();
      const storyFlow = new GameFlow({ campaign: storyCampaign, saveService: mockSaveService });

      storyFlow.startLevel('lvl-video');

      expect(storyFlow.getPhase()).toEqual({ type: 'video', videoId: 'opening-transmission' });
      expect(storyFlow.hasStoryFlag('seen:lvl-video:intro')).toBe(true);

      storyFlow.completeStoryPhase();
      expect(storyFlow.getPhase()).toEqual({ type: 'playing', levelId: 'lvl-video' });
    });

    it('does NOT replay intro on retry after game over', () => {
      const storyCampaign = createStoryCampaign();
      const storyFlow = new GameFlow({ campaign: storyCampaign, saveService: mockSaveService });

      storyFlow.startNewGame();
      storyFlow.completeStoryPhase(); // In gameplay
      expect(storyFlow.getPhase()).toEqual({ type: 'playing', levelId: 'lvl-intro' });

      storyFlow.handleGameOver('lvl-intro');
      expect(storyFlow.getPhase()).toEqual({ type: 'gameOver', levelId: 'lvl-intro' });

      storyFlow.retryLevel();
      // Should be playing directly without replaying intro dialogue
      expect(storyFlow.getPhase()).toEqual({ type: 'playing', levelId: 'lvl-intro' });
    });

    it('enters outro transition on level complete before advancing to next level', () => {
      const storyCampaign = createStoryCampaign();
      const storyFlow = new GameFlow({ campaign: storyCampaign, saveService: mockSaveService });

      storyFlow.startNewGame();
      storyFlow.completeStoryPhase(); // enter playing

      storyFlow.handleLevelCompleted('lvl-intro', 500);

      // Checkpoint was persisted before outro began
      expect(storyFlow.getProgress().completedLevelIds).toContain('lvl-intro');
      expect(mockSaveService.savedData?.completedLevelIds).toContain('lvl-intro');
      expect(storyFlow.hasStoryFlag('seen:lvl-intro:outro')).toBe(true);

      // In outro cutscene phase
      expect(storyFlow.getPhase()).toEqual({ type: 'cutscene', cutsceneId: 'first-signal' });

      // Completing outro advances to next level's intro (lvl-video has video intro)
      storyFlow.completeStoryPhase();
      expect(storyFlow.getPhase()).toEqual({ type: 'video', videoId: 'opening-transmission' });

      // Completing video intro starts lvl-video gameplay
      storyFlow.completeStoryPhase();
      expect(storyFlow.getPhase()).toEqual({ type: 'playing', levelId: 'lvl-video' });
    });

    it('plays campaign ending transition on completing final level before credits', () => {
      const storyCampaign = createStoryCampaign();
      const storyFlow = new GameFlow({ campaign: storyCampaign, saveService: mockSaveService });

      storyFlow.startLevel('lvl-video', { skipIntro: true });
      expect(storyFlow.getPhase()).toEqual({ type: 'playing', levelId: 'lvl-video' });

      storyFlow.handleLevelCompleted('lvl-video', 1000);

      // Should transition to campaign ending video
      expect(storyFlow.getPhase()).toEqual({ type: 'video', videoId: 'opening-transmission' });
      expect(storyFlow.hasStoryFlag('seen:campaign:ending')).toBe(true);

      // Completing campaign ending transitions to credits
      storyFlow.completeStoryPhase();
      expect(storyFlow.getPhase()).toEqual({ type: 'credits' });
    });

    it('is strictly idempotent when completeStoryPhase is called multiple times', () => {
      const storyCampaign = createStoryCampaign();
      const storyFlow = new GameFlow({ campaign: storyCampaign, saveService: mockSaveService });

      storyFlow.startNewGame();
      expect(storyFlow.getPhase()).toEqual({ type: 'dialogue', dialogueId: 'unknown-signal' });

      // First call completes dialogue and starts gameplay
      storyFlow.completeStoryPhase();
      expect(storyFlow.getPhase()).toEqual({ type: 'playing', levelId: 'lvl-intro' });

      // Second redundant call (e.g. from ended/skip race) does not corrupt state
      storyFlow.completeStoryPhase();
      expect(storyFlow.getPhase()).toEqual({ type: 'playing', levelId: 'lvl-intro' });
    });

    it('persists and restores story flags through saveService', () => {
      flow.setStoryFlag('custom-story-flag', true);
      expect(flow.hasStoryFlag('custom-story-flag')).toBe(true);
      expect(mockSaveService.savedData?.storyFlags['custom-story-flag']).toBe(true);

      const restoredFlow = new GameFlow({
        campaign: DEFAULT_CAMPAIGN,
        saveService: mockSaveService,
      });
      expect(restoredFlow.hasStoryFlag('custom-story-flag')).toBe(true);
    });
  });
});
