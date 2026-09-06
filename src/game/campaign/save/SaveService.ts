import { CampaignProgress } from '../campaignTypes';

export interface SaveService {
  load(): CampaignProgress | null;
  save(progress: CampaignProgress): void;
  clear(): void;
}
