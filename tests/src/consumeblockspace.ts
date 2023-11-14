import {ApiPromise, WsProvider, Keyring} from '@polkadot/api';

async function main() {
  const networkUrl = process.argv[2];
  const refTime = +process.argv[3];
  const proofSize = +process.argv[4];
  const additionalLen = +process.argv[5];

  const wsProvider = new WsProvider(networkUrl);
  const api = await ApiPromise.create({provider: wsProvider});

  const keyring = new Keyring({type: 'sr25519'});
  const alice = keyring.addFromUri('//Alice');

  const additionalLenArray = new Array(additionalLen).fill(0xA);

  await api.tx.testUtils.consumeBlockSpace(
    {
      refTime,
      proofSize,
    },
    additionalLenArray,
  ).signAndSend(alice);

  await api.disconnect();
}

await main();
