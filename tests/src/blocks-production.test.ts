//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

import usingApi from "./substrate/substrate-api";
import promisifySubstrate from "./substrate/promisify-substrate";
import { expect } from "chai";

describe('Blocks Production smoke test', () => {
  it('Node produces new blocks', async () => {
    await usingApi(async api => {
      const blocksPromise = promisifySubstrate(api, () => {
        return new Promise<number[]>((resolve, reject) => {
          const blockNumbers: number[] = [];
          const unsubscribe = api.rpc.chain.subscribeNewHeads(async head => {
            blockNumbers.push(head.number.toNumber());
            if(blockNumbers.length >= 2) {
              (await unsubscribe)();
              resolve(blockNumbers);
            }
          });
        })
      })();

      let blocks: number[] | undefined = undefined;

      const timeoutPromise = new Promise<void>((resolve, reject) => {
        let secondsPassed = 0;
        let incrementSeconds = () => {
          secondsPassed++;
          if(secondsPassed > 5 * 60) {
            reject('Block production test failed due to timeout.');
            return;
          }

          if(blocks) {
            resolve();
            return;
          }

          setTimeout(incrementSeconds, 1000);
        }

        incrementSeconds();
      });

      blocks = await Promise.race([blocksPromise, timeoutPromise]) as number[];

      expect(blocks[0]).to.be.lessThan(blocks[1]);
    });
  });
});
