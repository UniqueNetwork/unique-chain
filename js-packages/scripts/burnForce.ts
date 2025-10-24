import {Keyring} from '@polkadot/keyring';
import process from 'node:process';
import {DevUniqueHelper} from '../test-utils/index.ts';

import rawData from './unburned.json' with { type: 'json' };

async function main() {
  const addressesUnburned = rawData as string[];
  const WS = process.env.RELAY_UNIQUE_URL || 'ws://127.0.0.1:9944';
  const SUDO_SEED = process.env.SUDO_SEED || '//Alice';
  console.log(addressesUnburned);

  const helper = new DevUniqueHelper();
  await helper.connect(WS);
  const api = helper.getApi();

  const tokenHoldersBurnedSorted = (await api.query.system.account.entries())
    .map(([key, accInfo]) => ({
      account: key.args[0].toString(),
      amount: accInfo.data.free.add(accInfo.data.reserved),
    }))
    .filter(rec => !addressesUnburned.includes(rec.account))
    .sort((a, b) => {
      if(a.amount.gt(b.amount)) return -1;
      if(a.amount.lt(b.amount)) return 1;
      return 0;
    });


  console.log('Top 10 token holders to be burned:');
  console.log(tokenHoldersBurnedSorted.slice(0, 10));

  console.log(`Found ${tokenHoldersBurnedSorted.length} account(s) with tokens.`);
  console.log(tokenHoldersBurnedSorted);

  const keyring = new Keyring({type: 'sr25519'});
  const sudoPair = keyring.addFromUri(SUDO_SEED);

  let chunkIndex = 0;
  for(const holderChunk of chunk(tokenHoldersBurnedSorted.map(r => r.account), 500)) {
    chunkIndex++;
    console.log(`Processing chunk ${chunkIndex} with ${holderChunk.length} addresses...`);

    try {
      const txs = holderChunk.map(addr =>
        helper.constructApiCall('api.tx.balances.forceSetBalance', [addr, 0]));

      const batchCall = helper.constructApiCall('api.tx.utility.batch', [txs]);

      await helper.getSudo().executeExtrinsic(
        sudoPair,
        'api.tx.sudo.sudo',
        [batchCall],
        true,
      );

      console.log(`✅ Chunk ${chunkIndex} executed successfully.`);
    } catch (e) {
      console.error(`❌ Chunk ${chunkIndex} failed:`, (e as Error).message);
    }

  }
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