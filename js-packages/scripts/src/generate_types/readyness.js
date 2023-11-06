import {ApiPromise, WsProvider} from '@polkadot/api';

const connect = async () => {
  const wsEndpoint = 'ws://127.0.0.1:9944';
  const api = new ApiPromise({provider: new WsProvider(wsEndpoint)});
  await api.isReadyOrError;

  const head = (await api.rpc.chain.getHeader()).number.toNumber();
  await api.disconnect();
  if(head < 1) throw Error('No block #1');

};

const sleep = time => new Promise(resolve => {
  setTimeout(() => resolve(), time);
});

const main = async () => {
  // eslint-disable-next-line no-constant-condition
  while(true) {
    try {
      await connect();
      break;
    }
    catch (e) {
      await sleep(10000);
      console.log(e);
    }
  }
};

main().then(() => process.exit(0)).catch(e => {
  console.error(e);
  process.exit(1);
});
