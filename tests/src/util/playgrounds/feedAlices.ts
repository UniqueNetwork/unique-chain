// Copyright 2019-2022 Unique Network (Gibraltar) Ltd.
// SPDX-License-Identifier: Apache-2.0

import * as path from 'path';
import {promises as fs} from 'fs';
import {usingPlaygrounds} from '.';

async function getFiles(rootPath: string): Promise<string[]> {
  const files = await fs.readdir(rootPath, {withFileTypes: true});
  const filenames: string[] = [];
  for (const entry of files) {
    const res = path.resolve(rootPath, entry.name);
    if (entry.isDirectory()) {
      filenames.push(...await getFiles(res));
    } else {
      filenames.push(res);
    }
  }
  return filenames;
}

const fundFilenames = async () => {
  await usingPlaygrounds(async (helper, privateKey) => {
    const oneToken = helper.balance.getOneTokenNominal();
    const alice = await privateKey('//Alice');
    const nonce = await helper.chain.getNonce(alice.address);
    const filenames = await getFiles(path.resolve(__dirname, '../..'));

    // batching is actually undesired, it takes away the time while all the transactions actually succeed
    const batchSize = 300;
    let balanceGrantedCounter = 0;
    for (let b = 0; b < filenames.length; b += batchSize) {
      const tx = [];
      let batchBalanceGrantedCounter = 0;
      for (let i = 0; batchBalanceGrantedCounter < batchSize && b + i < filenames.length; i++) {
        const f = filenames[b + i];
        if (!f.endsWith('.test.ts') || f.includes('.outdated')) continue;
        const account = await privateKey({filename: f, ignoreFundsPresence: true});
        const aliceBalance = await helper.balance.getSubstrate(account.address);

        if (aliceBalance < 7500n * oneToken) {
          tx.push(helper.executeExtrinsic(
            alice, 
            'api.tx.balances.transfer',
            [account.address, 15000n * oneToken],
            true,
            {nonce: nonce + balanceGrantedCounter++},
          ).then(() => true).catch(() => {console.error(`Transaction to ${path.basename(f)} registered as failed. Strange.`); return false;}));
          batchBalanceGrantedCounter++;
        }
      }

      if(tx.length > 0) {
        console.log(`Granting funds to ${batchBalanceGrantedCounter} filename accounts.`);
        const result = await Promise.all(tx);
        if (result && result.lastIndexOf(false) > -1) throw new Error('The transactions actually probably succeeded, should check the balances.');
      }
    }

    if (balanceGrantedCounter == 0) console.log('No account needs additional funding.');
  });
};

const fundFilenamesWithRetries = async (retriesLeft: number): Promise<boolean> => {
  if (retriesLeft <= 0) return Promise.resolve(false);
  return fundFilenames()
    .then(() => Promise.resolve(true))
    .catch(e => {
      console.error(e);
      console.error(`Some transactions might have failed. ${retriesLeft > 1 ? 'Retrying...' : 'Something is wrong.'}\n`);
      return fundFilenamesWithRetries(--retriesLeft);
    });
};

fundFilenamesWithRetries(3).then((result) => process.exit(result ? 0 : 1)).catch(e => {
  console.error(e);
  process.exit(1);
});
