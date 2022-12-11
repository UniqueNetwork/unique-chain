import path from 'path';

export const config = {
  // Network params:
  OPAL_URL: 'wss://ws-opal.unique.network',
  NOMINAL: 10n ** 18n,
  
  // Stakers params:
  STAKERS_NUM: 8000,
  INITIAL_BALANCE: 1010n,

  // Log files:
  STAKER_BASE_SEED: '//Staker',
  STAKERS_LOG: path.resolve(__dirname, 'stakers.json'),
};
