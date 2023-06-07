import {usingPlaygrounds} from '../../util';



const WS_ENDPOINT = 'ws://localhost:9944';
const DONOR_SEED = '//Alice';

const main = async(options: { wsEndpoint: string; donorSeed: string } = {
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

    const filteredBlocks = pendingBlocks.filter((b) => b < currentBlock);

    if(filteredBlocks.length != 0) {
      console.log(
        'During maintenance mode, %d block(s) were not processed',
        filteredBlocks.length,
      );
    } else {
      console.log('Nothing to change');
      return;
    }

    const skippedBlocks = chunk(filteredBlocks, 10);

    const signer = await privateKey(options.donorSeed);
    const signerAccount = (
      await api.query.system.account(signer.address)
    ).toJSON() as any;

    let nonce = signerAccount.nonce;

    const txs = skippedBlocks.map((b) =>
      api.tx.sudo.sudo(api.tx.appPromotion.forceUnstake(b))
        .sign(signer, {
          blockHash: api.genesisHash,
          genesisHash: api.genesisHash,
          runtimeVersion: api.runtimeVersion,
          nonce: nonce++,
        }));

    const promises = txs.map((tx) => () => api.rpc.author.submitAndWatchExtrinsic(tx));

    const res = await Promise.allSettled(promises.map((p) => p()));
    const failedTx = res.filter((r) => r.status == 'rejected') as PromiseRejectedResult[];
    const isSuccess = failedTx.length == 0;

    if(isSuccess) {
      console.log('Done. %d block(s) were processed.', filteredBlocks.length);
    } else {
      console.log('Something went wrong.');
      for(const tx of failedTx) {
        console.log(tx.reason);
      }
    }


  }, options.wsEndpoint);
};

const chunk = <T>(arr: T[], size: number) =>
  Array.from({length: Math.ceil(arr.length / size)}, (_: any, i: number) =>
    arr.slice(i * size, i * size + size));

main({
  wsEndpoint: process.env.WS_RPC!,
  donorSeed: process.env.SUPERUSER_SEED!,
}).then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });