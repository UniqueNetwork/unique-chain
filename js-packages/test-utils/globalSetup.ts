// Copyright 2019-2022 Unique Network (Gibraltar) Ltd.
// SPDX-License-Identifier: Apache-2.0

import {
  usingPlaygrounds, Pallets, DONOR_FUNDING, MINIMUM_DONOR_FUND, LOCKING_PERIOD, UNLOCKING_PERIOD, makeNames,
  INTERVAL_INCOME,
} from './util.js';
import * as path from 'path';
import {promises as fs} from 'fs';

const {dirname} = makeNames(import.meta.url);

// This function should be called before running test suites.
const globalSetup = async (): Promise<void> => {
  let attempt = 1;
  const maxAttemps = 3;

  while(attempt <= maxAttemps) {
    try {
      await usingPlaygrounds(async (helper, privateKey) => {
        try {
          // 1. Wait node producing blocks
          console.log('Wait node producing blocks...');
          await helper.wait.newBlocks(1, 600_000);

          // 2. Create donors for test files
          await fundFilenamesWithRetries(3)
            .then((result) => {
              if(!result) throw Error('Some problems with fundFilenamesWithRetries');
            });

          // 3. Configure App Promotion
          const missingPallets = helper.fetchMissingPalletNames([Pallets.AppPromotion]);
          if(missingPallets.length === 0) {
            const superuser = await privateKey('//Alice');
            const palletAddress = helper.arrange.calculatePalletAddress('appstake');
            const palletAdmin = await privateKey('//PromotionAdmin');
            const api = helper.getApi();
            await helper.signTransaction(superuser, api.tx.sudo.sudo(api.tx.appPromotion.setAdminAddress({Substrate: palletAdmin.address})));
            const nominal = helper.balance.getOneTokenNominal();
            await helper.balance.transferToSubstrate(superuser, palletAdmin.address, 10000n * nominal);
            await helper.balance.transferToSubstrate(superuser, palletAddress, 10000n * nominal);
            await helper.executeExtrinsic(superuser, 'api.tx.sudo.sudo', [api.tx.configuration
              .setAppPromotionConfigurationOverride({
                recalculationInterval: LOCKING_PERIOD,
                pendingInterval: UNLOCKING_PERIOD,
                intervalIncome: INTERVAL_INCOME,
              })], true);
          }
        } catch (error) {
          throw Error('Error during globalSetup', {cause: error});
        }
      });
      break;
    } catch (e) {
      console.log('Global setup error', e, `retry after 10 blocks, attempt ${attempt}/${maxAttemps}`);
      await new Promise((resolve) => setTimeout(resolve, 10 * 6000));
      attempt += 1;
    }
  }
};

async function getFiles(rootPath: string): Promise<string[]> {
  const files = await fs.readdir(rootPath, {withFileTypes: true});
  const filenames: string[] = [];
  for(const entry of files) {
    const res = path.resolve(rootPath, entry.name);
    if(entry.isDirectory()) {
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

    const filenames = await getFiles(path.resolve(dirname, '..'));
    const filteredFilenames = filenames.filter((f) => f.endsWith('.test.ts') || f.endsWith('seqtest.ts') || f.includes('.outdated'));

    // batching is actually undesireable, it takes away the time while all the transactions actually succeed
    const batchSize = 300;
    let balanceGrantedCounter = 0;
    for(let b = 0; b < filteredFilenames.length; b += batchSize) {
      const tx: Promise<boolean>[] = [];
      let batchBalanceGrantedCounter = 0;

      for(let i = 0; batchBalanceGrantedCounter < batchSize && b + i < filteredFilenames.length; i++) {
        const f = filteredFilenames[b + i];

        const account = await privateKey({filename: f, ignoreFundsPresence: true});
        const aliceBalance = await helper.balance.getSubstrate(account.address);

        if(aliceBalance < MINIMUM_DONOR_FUND * oneToken) {
          tx.push(helper.executeExtrinsic(
            alice,
            'api.tx.balances.transferKeepAlive',
            [account.address, DONOR_FUNDING * oneToken],
            true,
            {nonce: nonce + balanceGrantedCounter++},
          ).then(() => true).catch(() => {console.error(`Transaction to ${path.basename(f)} registered as failed. Strange.`); return false;}));
          batchBalanceGrantedCounter++;
        }
      }

      if(tx.length > 0) {
        console.log(`Granting funds to ${batchBalanceGrantedCounter} filename accounts.`);
        const result = await Promise.all(tx);
        if(result && result.lastIndexOf(false) > -1) throw new Error('The transactions actually probably succeeded, should check the balances.');
      }
    }
    if(balanceGrantedCounter == 0) console.log('No account needs additional funding.');
  });
};

const fundFilenamesWithRetries = (retriesLeft: number): Promise<boolean> => {
  if(retriesLeft <= 0) return Promise.resolve(false);
  return fundFilenames()
    .then(() => Promise.resolve(true))
    .catch(e => {
      console.error(e);
      console.error(`Some transactions might have failed. ${retriesLeft > 1 ? 'Retrying...' : 'Something is wrong.'}\n`);
      return fundFilenamesWithRetries(--retriesLeft);
    });
};

globalSetup().catch(e => {
  console.error('Setup error');
  if(e.result) {
    console.error('Status:', e.status);
    console.error('Result:', JSON.stringify(e.result.toHuman()));
  } else
    console.error(e);
  process.exit(1);
});
