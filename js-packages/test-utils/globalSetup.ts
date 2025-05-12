// Copyright 2019-2022 Unique Network (Gibraltar) Ltd.
// SPDX-License-Identifier: Apache-2.0

import {
  usingPlaygrounds, Pallets, DONOR_FUNDING, MINIMUM_DONOR_FUND, LOCKING_PERIOD, UNLOCKING_PERIOD, makeNames,
  INTERVAL_INCOME,
} from './util.js';
import * as path from 'path';
import {promises as fs} from 'fs';
import {DevUniqueHelper} from './index.js';
import type {IKeyringPair} from '@polkadot/types/types';

const {dirname} = makeNames(import.meta.url);

// This function should be called before running test suites.
const globalSetup = async (): Promise<void> => {
  let attempt = 1;
  const maxAttemps = 3;

  while(attempt <= maxAttemps) {
    try {
      await usingPlaygrounds(async (helper, privateKey) => {
        console.log('Wait node producing blocks...');
        await helper.wait.newBlocks(1, 600_000);

        await mintTokens(helper, privateKey);
        await fundFilenames();
        await setupAppPromotion(helper, privateKey);
      });

      break;
    } catch (e) {
      console.log('Global setup error', e, `retry after 10 blocks, attempt ${attempt}/${maxAttemps}`);
      await new Promise((resolve) => setTimeout(resolve, 10 * 6000));
      attempt += 1;
    }
  }

  if(attempt === maxAttemps + 1) {
    throw new Error(`failed to global setup tests after ${maxAttemps} retries`);
  }
};

async function mintTokens(helper: DevUniqueHelper, privateKey: (seed: string) => Promise<IKeyringPair>) {
  const superuser = await privateKey('//Alice');
  await helper.getSudo().executeExtrinsic(superuser, 'api.tx.balances.forceSetBalance', [superuser.address, 1000000000000000000000000000000n]);
}

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

async function fundFilenames() {
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
}

async function setupAppPromotion(helper: DevUniqueHelper, privateKey: (seed: string) => Promise<IKeyringPair>) {
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
}

globalSetup().catch(e => {
  console.error(e);
  process.exit(1);
});
