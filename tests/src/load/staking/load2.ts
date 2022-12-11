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
import {Staker} from './types';

async function main() {
  await usingPlaygrounds(async (helper) => {
    const stakers: Staker[] = JSON.parse(fs.readFileSync(config.STAKERS_LOG).toString());
      
    // 1. All stakers stake simultaneously:
    let stakingTxs = [];
  
    console.log('Stakers starting stake...');
    for (const staker of stakers) {
      const stakerKeyRing = helper.util.fromSeed(staker.mnemonic);
      stakingTxs.push(helper.staking
        .stake(stakerKeyRing, 100n * config.NOMINAL)
        .then(hash => {
          staker.stakes.push(hash);
        })
        .catch(err => {
          const message = err instanceof Error ? `STEP2: ${err.message}` : 'STEP2: Unknown error';
          staker.errors.push(message);
        }));

      if (stakingTxs.length >= 1000) {
        await Promise.allSettled(stakingTxs);
        stakingTxs = [];
      }
    }
  
    await Promise.all(stakingTxs);
  
    console.log('Saving stakers to file...');
    fs.writeFileSync(config.STAKERS_LOG, JSON.stringify(stakers));
  }); 
}

main().then(() => console.log('Finished step 2'));