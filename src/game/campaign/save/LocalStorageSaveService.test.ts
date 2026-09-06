import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LocalStorageSaveService, CURRENT_SCHEMA_VERSION } from './LocalStorageSaveService';
import { CampaignProgress } from '../campaignTypes';

describe('LocalStorageSaveService', () => {
  let saveService: LocalStorageSaveService;
  const testKey = 'test_campaign_save';

  const validProgress: CampaignProgress = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    campaignId: 'flappy-spaceman-main',
    currentLevelId: 'sector-02',
    unlockedLevelIds: ['sector-01', 'sector-02'],
    completedLevelIds: ['sector-01'],
    highScores: { 'sector-01': 350 },
    storyFlags: { intro_seen: true },
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    localStorage.clear();
    saveService = new LocalStorageSaveService(testKey);
  });

  it('returns null when no save data exists', () => {
    expect(saveService.load()).toBeNull();
  });

  it('saves and loads valid campaign progress successfully', () => {
    saveService.save(validProgress);
    const loaded = saveService.load();

    expect(loaded).toEqual(validProgress);
  });

  it('fails safely and returns null on corrupted JSON string', () => {
    localStorage.setItem(testKey, '{ invalid json string');
    expect(saveService.load()).toBeNull();
  });

  it('fails safely and returns null on unsupported schema version', () => {
    const outdatedSave = {
      ...validProgress,
      schemaVersion: 999,
    };
    localStorage.setItem(testKey, JSON.stringify(outdatedSave));

    expect(saveService.load()).toBeNull();
  });

  it('fails safely and returns null when save shape is malformed or missing fields', () => {
    const missingFields = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      campaignId: 'flappy-spaceman-main',
      // missing currentLevelId, unlockedLevelIds, etc.
    };
    localStorage.setItem(testKey, JSON.stringify(missingFields));

    expect(saveService.load()).toBeNull();

    // Primitive value instead of object
    localStorage.setItem(testKey, JSON.stringify('not an object'));
    expect(saveService.load()).toBeNull();

    // Array instead of object
    localStorage.setItem(testKey, JSON.stringify([]));
    expect(saveService.load()).toBeNull();
  });

  it('clears saved progress cleanly', () => {
    saveService.save(validProgress);
    expect(saveService.load()).not.toBeNull();

    saveService.clear();
    expect(saveService.load()).toBeNull();
  });

  it('handles localStorage exceptions safely without throwing', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    expect(() => saveService.save(validProgress)).not.toThrow();

    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });

    expect(() => saveService.load()).not.toThrow();
    expect(saveService.load()).toBeNull();

    vi.restoreAllMocks();
  });
});
