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
import {itSub} from '../../util';
import {config} from './config';
import {Staker} from './types';


describe('Integration Test approve(spender, collection_id, item_id, amount):', () => {
  itSub('2. Act: stakers starting stake', async ({helper}) => {
    const stakers: Staker[] = JSON.parse(fs.readFileSync(config.STAKERS_LOG).toString());
    const stakersKeyRing = stakers.map(staker => helper.util.fromSeed(staker.mnemonic));

    // 1. All stakers stake simultaneously:
    const stakingTxs = stakersKeyRing.map(staker => helper.staking.stake(staker, 100n * config.NOMINAL));
    await Promise.all(stakingTxs).catch(err => {
      fs.writeFileSync(config.ERROR_LOG, 'STEP2:', err.message);
    });
  });
});

