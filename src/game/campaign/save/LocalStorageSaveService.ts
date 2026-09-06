import { CampaignProgress } from '../campaignTypes';
import { SaveService } from './SaveService';
import { getLogger } from '../../../utils/logger';

const logger = getLogger('LocalStorageSaveService');

export const DEFAULT_STORAGE_KEY = 'flappy_space_campaign_progress';
export const CURRENT_SCHEMA_VERSION = 1;

export class LocalStorageSaveService implements SaveService {
  private readonly storageKey: string;

  public constructor(storageKey: string = DEFAULT_STORAGE_KEY) {
    this.storageKey = storageKey;
  }

  public load(): CampaignProgress | null {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        logger.warn('localStorage is not available');
        return null;
      }

      const raw = window.localStorage.getItem(this.storageKey);
      if (!raw) {
        return null;
      }

      const parsed: unknown = JSON.parse(raw);
      if (!this.isValidProgress(parsed)) {
        logger.warn('Corrupt or incompatible campaign progress in storage', { raw });
        return null;
      }

      return parsed;
    } catch (err) {
      logger.warn('Failed to load campaign progress from storage', err);
      return null;
    }
  }

  public save(progress: CampaignProgress): void {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        logger.warn('localStorage is not available for saving');
        return;
      }

      if (!this.isValidProgress(progress)) {
        logger.error('Attempted to save invalid CampaignProgress', progress);
        return;
      }

      const raw = JSON.stringify(progress);
      window.localStorage.setItem(this.storageKey, raw);
      logger.debug('Campaign progress successfully saved', { levelId: progress.currentLevelId });
    } catch (err) {
      logger.error('Failed to save campaign progress to localStorage', err);
    }
  }

  public clear(): void {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return;
      }
      window.localStorage.removeItem(this.storageKey);
      logger.info('Campaign progress cleared from storage');
    } catch (err) {
      logger.error('Failed to clear campaign progress from localStorage', err);
    }
  }

  private isValidProgress(data: unknown): data is CampaignProgress {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return false;
    }

    const candidate = data as Record<string, unknown>;

    if (candidate.schemaVersion !== CURRENT_SCHEMA_VERSION) {
      return false;
    }

    if (typeof candidate.campaignId !== 'string' || !candidate.campaignId) {
      return false;
    }

    if (typeof candidate.currentLevelId !== 'string' || !candidate.currentLevelId) {
      return false;
    }

    if (!Array.isArray(candidate.unlockedLevelIds) || !candidate.unlockedLevelIds.every(id => typeof id === 'string')) {
      return false;
    }

    if (!Array.isArray(candidate.completedLevelIds) || !candidate.completedLevelIds.every(id => typeof id === 'string')) {
      return false;
    }

    if (!candidate.highScores || typeof candidate.highScores !== 'object' || Array.isArray(candidate.highScores)) {
      return false;
    }

    if (!candidate.storyFlags || typeof candidate.storyFlags !== 'object' || Array.isArray(candidate.storyFlags)) {
      return false;
    }

    if (typeof candidate.updatedAt !== 'string') {
      return false;
    }

    return true;
  }
}
