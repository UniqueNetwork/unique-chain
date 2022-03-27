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

import usingApi from './substrate/substrate-api';
import {expect} from 'chai';
import {ApiPromise} from '@polkadot/api';

const BLOCK_TIME_MS = 12000;
const TOLERANCE_MS = 3000;

/* eslint no-async-promise-executor: "off" */
function getBlocks(api: ApiPromise): Promise<number[]> {
  return new Promise<number[]>(async (resolve, reject) => {
    const blockNumbers: number[] = [];
    setTimeout(() => reject('Block production test failed due to timeout.'), BLOCK_TIME_MS + TOLERANCE_MS);
    const unsubscribe = await api.rpc.chain.subscribeNewHeads((head: any) => {
      blockNumbers.push(head.number.toNumber());
      if(blockNumbers.length >= 2) {
        unsubscribe();
        resolve(blockNumbers);
      }
    });
  });
}

describe('Block Production smoke test', () => {
  it('Node produces new blocks', async () => {
    await usingApi(async (api) => {
      const blocks: number[] | undefined = await getBlocks(api);
      expect(blocks[0]).to.be.lessThan(blocks[1]);
    });
  });
});
