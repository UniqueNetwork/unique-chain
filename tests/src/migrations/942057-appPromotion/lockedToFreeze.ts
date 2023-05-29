// import { usingApi, privateKey, onlySign } from "./../../load/lib";
import * as fs from 'fs';
import {usingPlaygrounds} from '../../util';
import path from 'path';
// import { ApiPromise } from "@polkadot/api";


const WS_ENDPOINT = 'ws://localhost:9944';
const DONOR_SEED = '//Alice';

const main = async(options: { wsEndpoint: string; donorSeed: string } = {
  wsEndpoint: WS_ENDPOINT,
  donorSeed: DONOR_SEED,
}) => {
  await usingPlaygrounds(async (helper, privateKey) => {
    const api = helper.getApi();
    // 1. Check version equal 942057 or skip
    if ((api.consts.system.version as any).specVersion.toNumber() != 941055) {
      // if ((api.consts.system.version as any).specVersion.toNumber() != 942057) { TODO return back
      console.log("Version isn't 942057.");
      return;
    }

    // 2. Get sudo signer
    const signer = await privateKey(options.donorSeed);

    // 3. Parse data to migrate
    const parsingResult = JSON.parse(fs.readFileSync(path.resolve('output.json'), 'utf-8'));

    const chainqlImportData = parsingResult as {
      address: string;
      balance: any;
    }[];

    const stakers = chainqlImportData.map((i) => i.address);

    // 3.1 Split into chunks by 100
    const stakersChunks = chunk(stakers, 100);

    // 4. Get signer/sudo nonce
    const signerAccount = (
        await api.query.system.account(signer.address)
      ).toJSON() as any;

    let nonce: number = signerAccount.nonce;

    // 5. Only sign upgradeAccounts-transactions for each chunk
    const signedTxs = [];
    for (const chunk of stakersChunks) {
      const tx = api.tx.sudo.sudo(api.tx.appPromotion.upgradeAccounts(chunk));
      const signed = tx.sign(signer, {
        blockHash: api.genesisHash,
        genesisHash: api.genesisHash,
        runtimeVersion: api.runtimeVersion,
        nonce: nonce++,
      });
      signedTxs.push(signed);
    }

    // 6. Send all signed transactions
    const promises = signedTxs.map((tx) => api.rpc.author.submitAndWatchExtrinsic(tx));
    // 6.1 Wait all transactions settled
    const res = await Promise.allSettled(promises);

    // 6.2 Filter failed transactions
    const failedTx = res.filter((r) => r.status == 'rejected') as PromiseRejectedResult[];
    console.log('failedTx', failedTx.length);

    // 6.3 Log the reasons of failed tx
    for (const tx of failedTx) {
      console.log(tx.reason);
    }

    // 7. Check balances for 10 blocks:
    let blocksLeft = 10;
    let notMigrated = stakers;
    do {
      const _notMigrated: string[] = [];
      for (const accountToMigrate of notMigrated) {
        // 7.1 system.account
        const balance = await api.query.system.account(accountToMigrate) as any;
        const free = BigInt(balance.data.free);
        const reserved = BigInt(balance.data.reserved);
        const frozen = BigInt(balance.data.frozen);

        // 7.2 balances.locks: no id appstake
        const locks = await helper.balance.getLocked(accountToMigrate);

        // 7.3 TODO balances.freezes: set...
        let freezes = await api.query.balances.freezes(accountToMigrate) as any;
        freezes = freezes.map((freez: any) => ({id: freez.id.toString(), amount: freez.amount.toBigInt()}));
        freezes.forEach(console.log);

        // 7.4 TODO appPromotion staked
        const staked = await helper.staking.getTotalStakedPerBlock({Substrate: accountToMigrate});

        const appPromoLocks = locks.filter(lock => lock.id === 'appstake');
        if (appPromoLocks.length > 0) _notMigrated.push(accountToMigrate);
      }

      blocksLeft--;
      notMigrated = _notMigrated;
      await helper.wait.newBlocks(1);
    } while (blocksLeft !== 0 || notMigrated.length !== 0);


    if (notMigrated.length > 0) {
      console.log('Not migrated list:');
      notMigrated.forEach(console.log);
      process.exit(1);
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