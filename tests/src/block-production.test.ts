//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

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
