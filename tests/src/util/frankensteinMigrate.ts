import {migration as locksToFreezesMigration} from '../migrations/942057-appPromotion';
export interface Migration {
  before: () => Promise<void>,
  after: () => Promise<void>,
}

export const migrations: {[key: string]: Migration} = {
  'v942057': locksToFreezesMigration,
};
