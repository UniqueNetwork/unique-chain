import type {Migration} from '../index.js';
import {collectData} from './collectData.js';
import {migrateLockedToFreeze} from './lockedToFreeze.js';

export const migration: Migration = {
  async before() {
    await collectData();
  },
  async after() {
    await migrateLockedToFreeze();
  },
};