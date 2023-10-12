import config from '../config';
import {usingPlaygrounds} from '../util';



const WS_ENDPOINT = config.substrateUrl;
const DONOR_SEED = '//Alice';

export const main = async(options: { wsEndpoint: string; donorSeed: string } = {
  wsEndpoint: WS_ENDPOINT,
  donorSeed: DONOR_SEED,
}) => {
  await usingPlaygrounds(async (helper, privateKey) => {
    const api = helper.getApi();

    if((await api.query.maintenance.enabled()).valueOf()) {
      throw Error('The network is still in maintenance mode');
    }

    const pendingBlocks = (
      await api.query.appPromotion.pendingUnstake.entries()
    ).map(([k, _v]) =>
      k.args[0]);

    const currentBlock = await api.query.system.number();

    const filteredBlocks = pendingBlocks.filter((b) => currentBlock.gt(b));

    if(filteredBlocks.length != 0) {
      console.log(`During maintenance mode, ${filteredBlocks.length} block(s) were not processed. Number(s): ${filteredBlocks}`);
    } else {
      console.log('Nothing to change');
      return;
    }

    const skippedBlocks = chunk(filteredBlocks, 10);

    const signer = await privateKey(options.donorSeed);

    const txs = skippedBlocks.map((b) =>
      api.tx.sudo.sudo(api.tx.appPromotion.forceUnstake(b)));


    const promises = txs.map((tx) => () => helper.signTransaction(signer, tx));

    await Promise.allSettled(promises.map((p) => p()));

    const failedBlocks: bigint[] = [];
    let isSuccess = true;

    for(const b of filteredBlocks) {
      if(((await api.query.appPromotion.pendingUnstake(b)).toJSON() as any[]).length != 0) {
        failedBlocks.push(b.toBigInt());
        isSuccess = false;
      }
    }

    if(isSuccess) {
      console.log('Done. %d block(s) were processed.', filteredBlocks.length);
    } else {
      throw new Error(`Something went wrong. Block(s) have not been processed: ${failedBlocks}`);
    }


  }, options.wsEndpoint);
};

const chunk = <T>(arr: T[], size: number) =>
  Array.from({length: Math.ceil(arr.length / size)}, (_: any, i: number) =>
    arr.slice(i * size, i * size + size));
