import {Migration} from '../../util/frankensteinMigrate';
import {collectData} from './collectData';
import {migrateLockedToFreeze} from './lockedToFreeze';

export const migration: Migration = {
  async before() {
    await collectData();
  },
  async after() {
    await migrateLockedToFreeze();
  },
};
