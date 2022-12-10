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

import {IKeyringPair} from '@polkadot/types/types';
import fs from 'fs';
import {config} from './config';
import {expect, itSub, usingPlaygrounds} from '../../util';
import {Staker} from './types';


describe('Integration Test approve(spender, collection_id, item_id, amount):', () => {
  //
  let donor: IKeyringPair;
  
  before(async () => {
    await usingPlaygrounds(async (_, privateKey) => {
      donor = await privateKey({filename: __filename});
    });
  });

  itSub('1. Arrange: generate test accounts', async ({helper}) => {
    const stakers = Array(config.STAKERS_NUM).fill('').map((_, i) => {
      const mnemonic = `${config.STAKER_BASE_SEED}/${i}`;
      return {
        mnemonic,
        address: helper.util.fromSeed(mnemonic).address,
      };
    });

    // 1. Generate 8000 test accounts with 1010 OPL each:

    let donorNonce = await helper.chain.getNonce(donor.address);

    // 1.1 Send transaction with nonce:
    const transactions = stakers.map(async staker => {
      // const mnemonicAddress = helper.util.fromSeed(mnemonic).address;
      const balance = await helper.balance.getSubstrate(staker.address);
      if (balance === 0n) {
        const tx = helper.constructApiCall('api.tx.balances.transfer', [{Id: staker.address}, config.INITIAL_BALANCE * config.NOMINAL]);
        await helper.signTransaction(donor, tx, {nonce: donorNonce++});
        expect(await helper.balance.getSubstrate(staker.address)).to.eq(config.INITIAL_BALANCE * config.NOMINAL);
      }
      return staker;
    });

    // 1.2 Save result to file:
    const settled = await Promise.allSettled(transactions);

    const success: Staker[] = [];
    const error: Staker[] = [];

    settled.forEach(tx => {
      if (tx.status === 'fulfilled') success.push(tx.value);
      else error.push(tx.reason);
    });

    fs.writeFileSync(config.STAKERS_LOG, JSON.stringify(success));
    fs.appendFileSync(config.ERROR_LOG, JSON.stringify(error));
  });
});

