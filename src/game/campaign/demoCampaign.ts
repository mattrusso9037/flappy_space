import { CampaignDefinition } from './campaignTypes';
import { SECTOR_03 } from './defaultCampaign';

/** Single-level web demo, using the same authored level and normal GameFlow ending. */
export const DEMO_CAMPAIGN: CampaignDefinition = {
  id: 'flappy-spaceman-relay-demo',
  name: 'The Relay Vault Demo',
  startingLevelId: SECTOR_03.id,
  levels: {
    [SECTOR_03.id]: { ...SECTOR_03, nextLevelId: undefined },
  },
};

export const DEMO_STORAGE_KEY = 'flappy_space_relay_demo_progress';
