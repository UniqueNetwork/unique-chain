import {IKeyringPair} from '@polkadot/types/types';
import {feedCrowd, emptyCrowd, getCrowd, feedDonors} from './helpers/testAccounts';

const CROWD_SIZE = 200;
let crowd: IKeyringPair[];

const main = async () => {
  // await feedDonors(1000000n * (10n ** 18n));
  await feedCrowd(CROWD_SIZE, 10n * (10n ** 18n));
  // crowd = await feedCrowd(CROWD_SIZE, 10n * (10n ** 18n));
  crowd = getCrowd(CROWD_SIZE);
  await emptyCrowd(crowd);
};

main().then(console.log).catch(console.error);
