/* eslint-disable indent */
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

import fs from 'fs';
import path from 'path';
import {usingPlaygrounds} from '../../util';
import {config} from './config';
import {Staker} from './helpers';

async function main() {
  await usingPlaygrounds(async (helper) => {
    const STEP = 'STEP5';
    const stakers: Staker[] = JSON.parse(fs.readFileSync(config.STAKERS_LOG).toString());
    
    const result: any = [];
    const getBalances = stakers.map(async staker => {
      console.log(staker.address);
      const stakes = await helper.staking.getTotalStakedPerBlock({Substrate: staker.address});
      const balances = await helper.balance.getSubstrateFull(staker.address);

      const stringifiedStakes = stakes.map(s => {
        return {
        block: s.block.toString(),
        amount: s.amount.toString(),
      };
    });

      result.push({
        address: staker.address,
        stakes: stringifiedStakes,
        balance: {
          free: balances.free.toString(),
          feeFrozen: balances.feeFrozen.toString(),
          miscFrozen: balances.miscFrozen.toString(),
          reserved: balances.reserved.toString(),
        },
      });
    });

    await Promise.all(getBalances);

    fs.writeFileSync(
      path.resolve(__dirname, 'balances.json'),
      JSON.stringify(result),
    );

  }, config.OPAL_URL); 
}

main().then(() => console.log('Finished step 2'));