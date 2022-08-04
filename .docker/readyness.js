const { ApiPromise, WsProvider } = require('@polkadot/api');

const connect = async () => {
  const wsEndpoint = 'ws://127.0.0.1:9944'
  const api = new ApiPromise({provider: new WsProvider(wsEndpoint)});
  await api.isReadyOrError;

  const head = (await api.rpc.chain.getHeader()).number.toNumber();
  if(head < 1) throw Error('No block #1');

  await api.disconnect();
}

const sleep = time => {
    return new Promise(resolve => {
        setTimeout(() => resolve(), time);
    });
}

const main = async () => {
  while(true) {
    try {
      await connect();
      break;
    }
    catch(e) {
      await sleep(60000);
    }
  }
}

main().then(() => process.exit(0)).catch(e => {
  console.error(e);
  process.exit(1);
});
