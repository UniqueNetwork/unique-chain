//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

import {ApiPromise} from '@polkadot/api';

/* eslint no-async-promise-executor: "off" */
export default function waitNewBlocks(api: ApiPromise, blocksCount = 1): Promise<void> {
  const promise = new Promise<void>(async (resolve) => {

    const unsubscribe = await api.rpc.chain.subscribeNewHeads(() => {
      if (blocksCount > 0) {
        blocksCount--;
      } else {
        unsubscribe();
        resolve();
      }
    });
  });

  return promise;
}
