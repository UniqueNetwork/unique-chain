import { ApiPromise } from "@polkadot/api";

export default function waitNewBlocks(api: ApiPromise, blocksCount: number = 1): Promise<void> {
  const promise = new Promise<void>(async (resolve, reject) => {
    
    const unsubscribe = await api.rpc.chain.subscribeNewHeads(head => {
      if(blocksCount > 0) {
        blocksCount--;
      }else {
        unsubscribe();
        resolve();
      }
    });
  });

  return promise;
}