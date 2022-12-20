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
import {usingPlaygrounds} from '../../util';
import {config} from './config';
import {Staker} from './helpers';

// UNSTAKING SCRIPT
async function main() {
  await usingPlaygrounds(async (helper) => {
    const STEP = 'STEP4';
    const stakers: Staker[] = JSON.parse(fs.readFileSync(config.STAKERS_LOG).toString());
      
    // 1. All stakers unstake simultaneously:
    let unStakingTxs = [];
  
    console.log('Stakers starting unstake...');
    for (const staker of stakers) {
      console.log(staker.mnemonic);
      if (staker.errors.length > 0) continue;
      const stakerKeyRing = helper.util.fromSeed(staker.mnemonic);
      unStakingTxs.push(helper.staking
        .unstake(stakerKeyRing)
        .then(hash => {
          staker.unstakes.push(hash);
        })
        .catch(err => {
          const message = err instanceof Error ? `${STEP}: ${err.message}` : `${STEP}: Unknown error`;
          staker.errors.push(message);
        }));

      if (unStakingTxs.length >= 3) {
        await Promise.allSettled(unStakingTxs);
        unStakingTxs = [];
      }
    }
  
    await Promise.all(unStakingTxs);
  
    console.log('Saving stakers to file...');
    fs.writeFileSync(config.STAKERS_LOG, JSON.stringify(stakers));

    const errors = stakers.filter(staker => staker.errors.find(e => e.search(STEP)));
    errors.forEach(e => console.log(e.address));
    if (errors.length > 0) throw Error(`Some accounts were unable to stake: ${errors.length}`);
  }, config.OPAL_URL); 
}

main().then(() => console.log('Finished step 2'));