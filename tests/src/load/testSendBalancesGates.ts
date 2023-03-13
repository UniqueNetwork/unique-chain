import fs from 'fs';
import path from 'path';
import {UNQ, DOT} from './helpers/balances';
import {getAccounts, arrangeTopUpAccounts, spamEmptyAccounts, chunk, spamTransfer} from './helpers/accounts';
import {TxResult} from './helpers/sign';
import { expect } from 'chai';

const CROWD_SIZE = 6000;
const SUPER_DONOR = 'enroll distance often indicate ancient throw arrow sort screen replace horse bonus';
const DONOR_BASE_SEED = '//Donor';
const CROWD_BASE_SEED = '//Account';
const TKN = DOT;

const main = async () => {
  // Get donors and top up
  const donors = await getAccounts(1, DONOR_BASE_SEED);
  // const donors = ['//Alice', '//Bob', '//Charlie', '//Dave'];
  await arrangeTopUpAccounts(SUPER_DONOR, donors, TKN(100_000n));

  // Get crowd and beat it into chunks – 800 accounts each.
  // thats because we cannot keep more than 1024 subscriptions for a single ws-connection
  let crowd = chunk(await getAccounts(CROWD_SIZE, CROWD_BASE_SEED), 500);


  // 1. Feed crowd using different donors for each chunk:
  const topUpResult: TxResult[]  = [];
  for (const subCrowd of crowd) {
    const result = await arrangeTopUpAccounts(donors[0], subCrowd, TKN(10n));
    topUpResult.push(...result);
  }

  // 2. Empty crowd:
  crowd = chunk(crowd.flat(), 2000);
  expect(crowd.length).to.eq(3);
  const gates = [
    'eu-ws-quartz.unique.network',
    'us-ws-quartz.unique.network',
    'asia-ws-quartz.unique.network',
  ];

  const spamTransactions = crowd.map((subCrowd, i) => spamTransfer(subCrowd, donors[0], 1n, false, gates[i]));
  const spamResult = (await Promise.all(spamTransactions)).flat();

  const topUpFailed = topUpResult.flat().filter(res => res.status === 'fail');
  const spamFailed = spamResult.flat().filter(res => res.status === 'fail');

  console.log('Saving to result.log ...');
  fs.appendFileSync(path.resolve(__dirname, './topup.log'), JSON.stringify(topUpFailed));
  fs.appendFileSync(path.resolve(__dirname, './spam.log'), JSON.stringify(spamFailed));

  console.log('Top up balance transactions failed:', topUpFailed.length);
  console.log('Spam transactions failed:', spamFailed.length);
};

main().then(() => console.log('Done')).catch(console.error);
