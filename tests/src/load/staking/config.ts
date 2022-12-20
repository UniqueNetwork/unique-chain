import path from 'path';

export const config = {
  // Network params:
  OPAL_URL: 'wss://ws-opal.unique.network',
  NOMINAL: 10n ** 18n,
  DONOR: 'invite patient robot zoo wash observe attitude uniform notice quit weasel limit',
  
  // Stakers params:
  STAKERS_NUM: 8000,
  INITIAL_BALANCE: 1010n,

  // Log files:
  STAKER_BASE_SEED: '//AppPromotion',
  STAKERS_LOG: path.resolve(__dirname, 'stakers.json'),
  BALANCE_LOG: path.resolve(__dirname, 'balance.json'),
};