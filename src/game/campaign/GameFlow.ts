import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import {
  CampaignDefinition,
  CampaignProgress,
  GamePhase,
  LevelId,
} from './campaignTypes';
import { DEFAULT_CAMPAIGN, createInitialProgress } from './defaultCampaign';
import { SaveService } from './save/SaveService';
import { LocalStorageSaveService } from './save/LocalStorageSaveService';
import { GameRuntime } from '../GameRuntime';
import { GameEvent } from '../eventBus';
import { getLogger } from '../../utils/logger';

const logger = getLogger('GameFlow');

export interface GameFlowOptions {
  campaign?: CampaignDefinition;
  saveService?: SaveService;
  runtime?: GameRuntime;
}

/**
 * GameFlow is the campaign orchestrator.
 * It owns high-level phases, persistent progress, saves, and directs GameRuntime.
 * GameFlow does NOT perform per-frame simulation work.
 */
export class GameFlow {
  public readonly campaign: CampaignDefinition;
  private readonly saveService: SaveService;

  private phase$: BehaviorSubject<GamePhase>;
  private progress$: BehaviorSubject<CampaignProgress>;
  private runtime: GameRuntime | null = null;
  private runtimeSubscriptions: Subscription[] = [];
  private disposed: boolean = false;

  public constructor(options: GameFlowOptions = {}) {
    this.campaign = options.campaign ?? DEFAULT_CAMPAIGN;
    this.saveService = options.saveService ?? new LocalStorageSaveService();

    const loadedSave = this.saveService.load();
    const initialProgress =
      loadedSave && loadedSave.campaignId === this.campaign.id && this.campaign.levels[loadedSave.currentLevelId]
        ? loadedSave
        : createInitialProgress(this.campaign);

    this.progress$ = new BehaviorSubject<CampaignProgress>(initialProgress);
    this.phase$ = new BehaviorSubject<GamePhase>({ type: 'title' });

    if (options.runtime) {
      this.attachRuntime(options.runtime);
    }

    logger.info('GameFlow instantiated', { campaignId: this.campaign.id });
  }

  public getPhase(): GamePhase {
    return this.phase$.getValue();
  }

  public getPhase$(): Observable<GamePhase> {
    return this.phase$.asObservable();
  }

  public getProgress(): CampaignProgress {
    return this.progress$.getValue();
  }

  public getProgress$(): Observable<CampaignProgress> {
    return this.progress$.asObservable();
  }

  public hasSave(): boolean {
    const save = this.saveService.load();
    if (!save || save.campaignId !== this.campaign.id) {
      return false;
    }
    if (!this.campaign.levels[save.currentLevelId]) {
      return false;
    }
    return save.completedLevelIds.length > 0 || save.currentLevelId !== this.campaign.startingLevelId;
  }

  public attachRuntime(runtime: GameRuntime): void {
    this.detachRuntime();
    this.runtime = runtime;

    logger.info('Attaching GameRuntime to GameFlow');

    // Subscribe to runtime outcome events
    this.runtimeSubscriptions.push(
      runtime.events.on(GameEvent.LEVEL_COMPLETED).subscribe(data => {
        logger.info('Runtime reported LEVEL_COMPLETED', data);
        this.handleLevelCompleted(data.levelId, data.score);
      })
    );

    this.runtimeSubscriptions.push(
      runtime.events.on(GameEvent.GAME_OVER).subscribe(() => {
        const currentPhase = this.getPhase();
        const levelId =
          currentPhase.type === 'playing' || currentPhase.type === 'gameOver'
            ? currentPhase.levelId
            : this.getProgress().currentLevelId;

        logger.info('Runtime reported GAME_OVER', { levelId });
        this.handleGameOver(levelId);
      })
    );

    this.runtimeSubscriptions.push(
      runtime.events.on(GameEvent.RESTART_GAME).subscribe(() => {
        logger.info('Runtime requested RESTART_GAME');
        this.retryLevel();
      })
    );

    this.runtimeSubscriptions.push(
      runtime.events.on(GameEvent.START_GAME).subscribe(() => {
        const currentPhase = this.getPhase();
        if (currentPhase.type === 'title') {
          if (this.hasSave()) {
            this.continueGame();
          } else {
            this.startNewGame();
          }
        } else if (currentPhase.type === 'gameOver') {
          this.retryLevel();
        }
      })
    );
  }

  public detachRuntime(): void {
    this.runtimeSubscriptions.forEach(sub => sub.unsubscribe());
    this.runtimeSubscriptions = [];
    this.runtime = null;
  }

  public startNewGame(): void {
    logger.info('Starting new game campaign');
    const freshProgress = createInitialProgress(this.campaign);
    this.saveService.save(freshProgress);
    this.progress$.next(freshProgress);

    this.startLevel(this.campaign.startingLevelId);
  }

  public continueGame(): void {
    logger.info('Continuing game from saved checkpoint');
    const saved = this.saveService.load();
    if (saved && saved.campaignId === this.campaign.id && this.campaign.levels[saved.currentLevelId]) {
      this.progress$.next(saved);
      this.startLevel(saved.currentLevelId);
    } else {
      logger.warn('No valid save found on continue, starting new game instead');
      this.startNewGame();
    }
  }

  public startLevel(levelId: LevelId): void {
    let levelDef = this.campaign.levels[levelId];
    if (!levelDef) {
      logger.error(`Level ${levelId} not found in campaign ${this.campaign.id}, defaulting to starting level`);
      levelId = this.campaign.startingLevelId;
      levelDef = this.campaign.levels[levelId];
    }

    logger.info(`GameFlow starting level: ${levelId} (${levelDef.name})`);

    const currentProgress = this.getProgress();
    const updatedUnlocked = currentProgress.unlockedLevelIds.includes(levelId)
      ? currentProgress.unlockedLevelIds
      : [...currentProgress.unlockedLevelIds, levelId];

    const updatedProgress: CampaignProgress = {
      ...currentProgress,
      currentLevelId: levelId,
      unlockedLevelIds: updatedUnlocked,
      updatedAt: new Date().toISOString(),
    };

    this.progress$.next(updatedProgress);

    this.setPhase({ type: 'playing', levelId });

    if (this.runtime) {
      this.runtime.loadLevel(levelDef);
      this.runtime.start();
    }
  }

  public handleLevelCompleted(levelId: LevelId, score?: number): void {
    const currentProgress = this.getProgress();
    logger.info(`Handling completion of level ${levelId}`);

    const updatedCompleted = currentProgress.completedLevelIds.includes(levelId)
      ? currentProgress.completedLevelIds
      : [...currentProgress.completedLevelIds, levelId];

    const updatedHighScores = { ...currentProgress.highScores };
    if (score !== undefined) {
      const prev = updatedHighScores[levelId] ?? 0;
      updatedHighScores[levelId] = Math.max(prev, score);
    }

    const currentLevelDef = this.campaign.levels[levelId];
    const nextLevelId = currentLevelDef?.nextLevelId;

    if (nextLevelId && this.campaign.levels[nextLevelId]) {
      const updatedUnlocked = currentProgress.unlockedLevelIds.includes(nextLevelId)
        ? currentProgress.unlockedLevelIds
        : [...currentProgress.unlockedLevelIds, nextLevelId];

      const updatedProgress: CampaignProgress = {
        ...currentProgress,
        currentLevelId: nextLevelId,
        completedLevelIds: updatedCompleted,
        unlockedLevelIds: updatedUnlocked,
        highScores: updatedHighScores,
        updatedAt: new Date().toISOString(),
      };

      this.progress$.next(updatedProgress);
      this.saveService.save(updatedProgress);

      logger.info(`Advancing to next campaign level: ${nextLevelId}`);
      this.startLevel(nextLevelId);
    } else {
      // Campaign Completed
      const updatedProgress: CampaignProgress = {
        ...currentProgress,
        completedLevelIds: updatedCompleted,
        highScores: updatedHighScores,
        updatedAt: new Date().toISOString(),
      };

      this.progress$.next(updatedProgress);
      this.saveService.save(updatedProgress);

      logger.info('Campaign completed - all sectors cleared!');
      this.setPhase({ type: 'credits' });
    }
  }

  public handleGameOver(levelId: LevelId): void {
    logger.info(`Handling game over on level ${levelId}`);
    // Game over must NOT advance campaign progression
    this.setPhase({ type: 'gameOver', levelId });
  }

  public retryLevel(): void {
    const currentProgress = this.getProgress();
    logger.info(`Retrying current level: ${currentProgress.currentLevelId}`);
    this.startLevel(currentProgress.currentLevelId);
  }

  public returnToTitle(): void {
    logger.info('Returning to title');
    this.setPhase({ type: 'title' });
    if (this.runtime) {
      this.runtime.reset();
    }
  }

  public dispose(): void {
    if (this.disposed) return;
    this.detachRuntime();
    this.phase$.complete();
    this.progress$.complete();
    this.disposed = true;
    logger.info('GameFlow disposed');
  }

  private setPhase(phase: GamePhase): void {
    this.phase$.next(phase);
  }
}
