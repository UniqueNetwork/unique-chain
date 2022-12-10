import path from 'path';

export const config = {
  // Network params:
  OPAL_URL: 'wss://ws-opal.unique.network',
  NOMINAL: 10n ** 18n,
  
  // Stakers params:
  STAKERS_NUM: 1000,
  INITIAL_BALANCE: 1010n,

  // Log files:
  STAKER_BASE_SEED: '//Stakerr',
  STAKERS_LOG: path.resolve(__dirname, 'stakers.json'),
  ERROR_LOG: path.resolve(__dirname, 'error.log'),
};
