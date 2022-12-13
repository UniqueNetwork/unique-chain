// Copyright 2019-2022 Unique Network (Gibraltar) Ltd.
// This file is part of Unique Network.

// Unique Network is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// Unique Network is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with Unique Network. If not, see <http://www.gnu.org/licenses/>.

import {config} from './config';
import fs from 'fs';
import {usingPlaygrounds} from '../../util';
import {Retry} from '../../util/retry';
import {Staker} from './helpers';
  
async function main() {
  await usingPlaygrounds(async (helper, privateKey) => {
    const donor = await privateKey(config.DONOR);
    // //{STAKER_BASE_SEED}/1 (..2,3,4)
    const mnemonics = Array(config.STAKERS_NUM).fill('').map((_, i) => `${config.STAKER_BASE_SEED}/${i}`);
    const stakers: Staker[] = mnemonics.map(mnemonic => {
      return {
        address: helper.util.fromSeed(mnemonic).address,
        mnemonic,
        errors: [], stakes: [], unstakes: [],
      };
    });

    const api = helper.getApi();
    
    // 1. Generate 8000 test accounts with 1010 OPL each:

    let donorNonce = await helper.chain.getNonce(donor.address);

    console.log('Sending to stakers...');
    for (const staker of stakers) {
      const balance = await helper.balance.getSubstrate(staker.address);
      if (balance === config.INITIAL_BALANCE * config.NOMINAL) continue;
      
      const stakerKeyRing = helper.util.fromSeed(staker.mnemonic);

      api.tx.balances
        .transfer({Id: stakerKeyRing.address}, config.INITIAL_BALANCE * config.NOMINAL)
        .signAndSend(donor, {nonce: donorNonce++})
        .catch(e => console.log('Some error', e.message));
    }

    // 2. Wait all accounts have balance...
    console.log('Wait all accounts have balance...');
    const checks = stakers.map(async (staker) => {
      const address = helper.util.fromSeed(staker.mnemonic).address;

      await Retry.until({
        retryFunc: () => helper.balance.getSubstrate(address),
        checkFunc: (balance) => balance === config.INITIAL_BALANCE * config.NOMINAL,
        timeout: 180_000,
      })
        .catch(err => {
          const message = err instanceof Error ? `STEP1: ${err.message}` : 'STEP1: Unknown error';
          staker.errors.push(message);
        });

      return staker;
    });

    // 3. Save fullfilled accounts to file:
    const result: Staker[] = await Promise.all(checks);

    fs.writeFileSync(config.STAKERS_LOG, JSON.stringify(result));

    const errors = result.filter(res => res.errors.length > 0);
    errors.forEach(e => console.log(e.address));
    if (errors.length > 0) throw Error(`Some accounts were not created: ${errors.length}`);
  }, config.OPAL_URL);
}

main().then(() => console.log('Finished step 1'));
