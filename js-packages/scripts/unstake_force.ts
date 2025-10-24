import {Keyring} from '@polkadot/keyring';
import process from 'node:process';
import {DevUniqueHelper} from '../test-utils/index.ts';

export function* chunk<T>(arr: T[], size: number): Generator<T[]> {
  for(let i = 0; i < arr.length; i += size) {
    yield arr.slice(i, i + size);
  }
}
async function main() {
  const WS = process.env.RELAY_UNIQUE_URL || 'ws://127.0.0.1:9944';
  const SUDO_SEED = process.env.SUDO_SEED || '//Alice';

  // helper connects and decorates api for the runtime
  const helper = new DevUniqueHelper();
  await helper.connect(WS);
  const api = helper.getApi();

  console.log('Querying stakesPerAccount entries...');
  const stakers = (await api.query.appPromotion.stakesPerAccount.entries())
    .filter(([_, count]) => count.toNumber() > 0)
    .map(([key]) => key.args[0].toString());

  console.log(`Found ${stakers.length} staker(s).`);
  console.log(stakers);

  if(stakers.length === 0) {
    await api.disconnect();
    return;
  }

  // prepare sudo signer
  const keyring = new Keyring({type: 'sr25519'});
  const sudoPair = keyring.addFromUri(SUDO_SEED);

  // apply configuration override using helper.getSudo()
  console.log('Applying AppPromotionConfigurationOverride...');
  await helper.getSudo().executeExtrinsic(
    sudoPair,
    'api.tx.configuration.setAppPromotionConfigurationOverride',
    [{pendingInterval: 4n}],
    true,
  );
  console.log('Override applied');

  // sequentially unstake for every staker using helper utilities (wraps into sudo)
  for(const staker of chunk(stakers, 3)) {
    try {
      console.log(`Preparing unstake for ${staker}...`);

      // build inner call (appPromotion.unstakeAll)
      const innerCall = helper.constructApiCall('api.tx.appPromotion.unstakeAll', []);
      const txs = staker.map(staker => helper.constructApiCall('api.tx.utility.dispatchAs', [{system: {Signed: staker}}, innerCall]));
      const batchCall = helper.constructApiCall('api.tx.utility.batch', [txs]);

      // execute via sudo
      await helper.getSudo().executeExtrinsic(
        sudoPair,
        'api.tx.sudo.sudo',
        [batchCall],
        true,
      );

      console.log(`Unstake dispatched for ${staker}`);
    } catch (e) {
      console.error(`Failed for ${staker}:`, (e as Error).message);
    }
  }

  await api.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});