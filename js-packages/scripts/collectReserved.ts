import {Keyring} from '@polkadot/keyring';
import process from 'node:process';
import {DevUniqueHelper} from '../test-utils/index.ts';
import {BN} from '@polkadot/util';
import rawData from './unburned.json' with { type: 'json' };

async function main() {
  const addressesUnburned = rawData as string[];
  const WS = process.env.RELAY_UNIQUE_URL || 'wss://ws-quartz.unique.network';
  const SUDO_SEED = process.env.SUDO_SEED || '//Alice';
  console.log(addressesUnburned);

  const helper = new DevUniqueHelper();
  await helper.connect(WS);
  const api = helper.getApi();

  const tokenHoldersBurnedSorted = (await api.query.system.account.entries())
    .filter(([_, v]) => v.data.reserved.gt(new BN(0)))
    .map(([key, accInfo]) => ({
      account: key.args[0].toString(),
      amount: accInfo.data.reserved,
    }))
    .sort((a, b) => {
      if(a.amount.gt(b.amount)) return -1;
      if(a.amount.lt(b.amount)) return 1;
      return 0;
    });



  console.log(`Found ${tokenHoldersBurnedSorted.length} account(s) with reserved.`);
  console.log(tokenHoldersBurnedSorted);
  
  await api.disconnect();
 
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

export function* chunk<T>(arr: T[], size: number): Generator<T[]> {
  for(let i = 0; i < arr.length; i += size) {
    yield arr.slice(i, i + size);
  }
}