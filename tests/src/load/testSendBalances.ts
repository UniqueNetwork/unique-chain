import fs from 'fs';
import path from 'path';
import {UNQ, DOT} from './helpers/balances';
import {getAccounts, arrangeTopUpAccounts, spamEmptyAccounts, chunk, spamTransfer} from './helpers/accounts';
import {TxResult} from './helpers/sign';

const CROWD_SIZE = 8000;
const SUPER_DONOR = '//Alice';
const DONOR_BASE_SEED = '//Donor';
const CROWD_BASE_SEED = '//Account';
const TKN = UNQ;
const TOPUP_CROWD = true;
const SPAM_CROWD = true;

const main = async () => {
  // Get donors and top up
  const donors = await getAccounts(1, DONOR_BASE_SEED);
  // const donors = ['//Alice', '//Bob', '//Charlie', '//Dave'];
  await arrangeTopUpAccounts(SUPER_DONOR, donors, TKN(100_000n));

  // Get crowd and beat it into chunks – 800 accounts each.
  // thats because we cannot keep more than 1024 subscriptions for a single ws-connection
  const crowd = chunk(await getAccounts(CROWD_SIZE, CROWD_BASE_SEED), 500);


  // 1. Feed crowd using different donors for each chunk:
  const topUpResult: TxResult[]  = [];
  if (TOPUP_CROWD) {
    for (const subCrowd of crowd) {
      const result = await arrangeTopUpAccounts(donors[0], subCrowd, TKN(10n));
      topUpResult.push(...result);
    }
  }

  // 2. Empty crowd:
  const spamTransactions = crowd.map(subCrowd => spamTransfer(subCrowd, donors[0], 1n));
  const spamResult = await Promise.all(spamTransactions);

  const topUpFailed = topUpResult.flat().filter(res => res.status === 'fail');
  const spamFailed = spamResult.flat().filter(res => res.status === 'fail');

  console.log('Saving to result.log ...');
  fs.appendFileSync(path.resolve(__dirname, './topup.log'), JSON.stringify(topUpFailed));
  fs.appendFileSync(path.resolve(__dirname, './spam.log'), JSON.stringify(spamFailed));

  console.log('Top up balance transactions failed:', topUpFailed.length);
  console.log('Spam transactions failed:', spamFailed.length);
};

main().then(() => console.log('Done')).catch(console.error);
