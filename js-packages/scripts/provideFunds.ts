import {ApiPromise, Keyring, WsProvider} from '@polkadot/api';
import {blake2AsHex, evmToAddress} from '@polkadot/util-crypto';

async function main() {
  const networkUrl = process.argv[2];
  const ethAddress = process.argv[3];

  const wsProvider = new WsProvider(networkUrl);
  const api = await ApiPromise.create({provider: wsProvider});

  const ss58Format = Number(api.registry.getChainProperties()?.toJSON().ss58Format) || 42;
  const subAddress = evmToAddress(ethAddress, ss58Format);
  console.log("account", (await api.query.system.account(subAddress)).toHuman());

  const keyring = new Keyring({type: 'sr25519', ss58Format});
  const alice = keyring.addFromUri('//Alice');

  console.log("subAddress", subAddress);

  const tx = api.tx.balances.transferKeepAlive(subAddress, 1000000000000000000000n);
  await tx.signAndSend(alice);
  console.log("Transfered");

  console.log("account", (await api.query.system.account("5G42n8B9iGQ6VLiXSyi5GP8ZizoZPWCpSMZM5fiMwAN1Pa3m")).toHuman());

  await api.disconnect();
}

await main();
