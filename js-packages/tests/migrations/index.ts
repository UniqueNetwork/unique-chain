import {migration as locksToFreezesMigration} from './942057-appPromotion/index.js';
export interface Migration {
  before: () => Promise<void>,
  after: () => Promise<void>,
}

export const migrations: {[key: string]: Migration} = {
  'v942057': locksToFreezesMigration,
};