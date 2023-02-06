import fs from 'fs';
import path from 'path';
import {UNQ} from '../helpers/balances';
import {getAccounts, topUpAccounts, emptyAccounts, chunk} from '../helpers/testAccounts';

const CROWD_SIZE = 8000;
const SUPER_DONOR = '//Charlie';
const DONOR_BASE_SEED = '//Donor';
const CROWD_BASE_SEED = '//Account';

const main = async () => {
  // Get donors and top up
  const donors = getAccounts(20, DONOR_BASE_SEED);
  await topUpAccounts(SUPER_DONOR, donors, UNQ(100000n));

  // Get crowd and beat it into chunks – 800 accounts each.
  // thats because we cannot keep more than 1024 subscriptions for a single ws-connection
  const crowd = chunk(getAccounts(CROWD_SIZE, CROWD_BASE_SEED), 800);


  // 1. Feed crowd using different donors for each chunk:
  const topUpBalanceTransactions = crowd.map((subCrowd, i) => topUpAccounts(donors[i], subCrowd, UNQ(2n)));
  const topUpResult = await Promise.all(topUpBalanceTransactions);

  // 2. Empty crowd:
  const emptyBalanceTransactions = crowd.map(subCrowd => emptyAccounts(subCrowd, donors[0]));
  const emptyResult = await Promise.all(emptyBalanceTransactions);

  const topUpFailed = topUpResult.flat().filter(res => res.status === 'fail');
  const emptyFailed = emptyResult.flat().filter(res => res.status === 'fail');

  console.log('Saving to result.log ...');
  fs.appendFileSync(path.resolve(__dirname, './result.log'), JSON.stringify(topUpFailed));
  fs.appendFileSync(path.resolve(__dirname, './result.log'), JSON.stringify(emptyFailed));

  console.log('Top up balance transactions failed:', topUpFailed.length);
  console.log('Empty balance transactions failed:', emptyFailed.length);

  await emptyAccounts(donors, donors[0]);
};

main().then(() => console.log('Done')).catch(console.error);
