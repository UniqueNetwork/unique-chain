import {migrateLockedToFreeze} from './lockedToFreeze.js';


const WS_RPC = process.env.WS_RPC || 'wss://ws-opal.unique.network:443';
const SUPERUSER_SEED = process.env.SUPERUSER_SEED || '';

migrateLockedToFreeze({
  wsEndpoint: WS_RPC,
  donorSeed: SUPERUSER_SEED,
})
  .catch(console.error);