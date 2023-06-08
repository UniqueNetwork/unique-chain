// import { usingApi, privateKey, onlySign } from "./../../load/lib";
import * as fs from 'fs';
import {usingPlaygrounds} from '../../util';
import path from 'path';
import {isInteger, parse} from 'lossless-json';
import {isNull} from '@polkadot/util';


const WS_ENDPOINT = 'ws://localhost:9944';
const DONOR_SEED = '//Alice';
const UPDATE_IF_VERSION = 942057;

export function customNumberParser(value: any) {
  return isInteger(value) ? BigInt(value) : parseFloat(value);
}

const main = async(options: { wsEndpoint: string; donorSeed: string } = {
  wsEndpoint: WS_ENDPOINT,
  donorSeed: DONOR_SEED,
}) => {
  await usingPlaygrounds(async (helper, privateKey) => {
    const api = helper.getApi();
    // 1. Check version equal 942057 or skip
    console.log((api.consts.system.version as any).specVersion.toNumber());
    if((api.consts.system.version as any).specVersion.toNumber() != UPDATE_IF_VERSION) {
      console.log("Version isn't 942057.");
      return;
    }

    // 2. Get sudo signer
    const signer = await privateKey(options.donorSeed);
    console.log('2. Getting sudo:', signer.address);

    // 3. Parse data to migrate
    console.log('3. Parsing chainql results...');
    const parsingResult = parse(fs.readFileSync(path.resolve('output.json'), 'utf-8'), undefined, customNumberParser);

    const chainqlImportData = parsingResult as {
      address: string;
      balance: bigint;
      account: {
        fee_frozen: bigint,
        free: bigint,
        misc_frozen: bigint,
        reserved: bigint,
      },
      locks: {
        amount: bigint,
        id: string,
      }[],
      stakes: object,
      unstakes: object,
      totalPendingUnstale: bigint
    }[];

    const stakers = chainqlImportData.map((i) => i.address);

    // 3.1 Split into chunks by 100
    console.log('3.1 Splitting into chunks...');
    const stakersChunks = chunk(stakers, 100);
    console.log('3.1 Done, total chunks:', stakersChunks.length);

    // 4. Get signer/sudo nonce
    console.log('4. Getting sudo nonce...');
    const signerAccount = (
        await api.query.system.account(signer.address)
      ).toJSON() as any;

    let nonce: number = signerAccount.nonce;
    console.log('4. Sudo nonce is:', nonce);

    // 5. Only sign upgradeAccounts-transactions for each chunk
    console.log('5. Signing transactions...');
    const signedTxs = [];
    for(const chunk of stakersChunks) {
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
    console.log('6. Sending transactions...');
    const promises = signedTxs.map((tx) => api.rpc.author.submitAndWatchExtrinsic(tx));
    // 6.1 Wait all transactions settled
    console.log('6.1 Waiting all transactions settled...');
    const res = await Promise.allSettled(promises);

    console.log('Wait 3 blocks for transactions to be included in a block...');
    await helper.wait.newBlocks(3); // TODO
    // 6.2 Filter failed transactions
    console.log('6.2 Getting failed transactions...');
    const failedTx = res.filter((r) => r.status == 'rejected') as PromiseRejectedResult[];
    console.log('6.2. total failedTxs:', failedTx.length);

    // 6.3 Log the reasons of failed tx
    for(const tx of failedTx) {
      console.log(tx.reason);
    }

    // 7. Check balances for 10 blocks:
    console.log('7. Check balances...');
    let blocksLeft = 10;
    let notMigrated = stakers;
    do {
      console.log('blocks left:', blocksLeft);
      const _notMigrated: string[] = [];
      console.log('accounts to migrate...', notMigrated.length);
      for(const accountToMigrate of notMigrated) {
        let accountMigrated = true;
        // 7.0 get data from chainql:
        const oldAccount = chainqlImportData.find(acc => acc.address === accountToMigrate);
        if(!oldAccount) {
          console.log('Cannot find old account data for', accountMigrated);
          accountMigrated = false;
          _notMigrated.push(accountToMigrate);
          continue;
        }

        // 7.1 system.account
        const balance = await api.query.system.account(accountToMigrate) as any;
        const free = BigInt(balance.data.free);
        const reserved = BigInt(balance.data.reserved);
        const frozen = BigInt(balance.data.frozen);
        const oldFree = BigInt(oldAccount.account.free);
        const oldReserved = BigInt(oldAccount.account.reserved);
        const oldFrozen = BigInt(oldAccount.account.fee_frozen);
        if(oldFree !== free) {
          console.log('Old free !== New free', oldFree, free);
          accountMigrated = false;
        }
        if(oldFrozen !== frozen) {
          console.log('Old frozen !== New frozen', oldFrozen, frozen);
          accountMigrated = false;
        }
        if(oldReserved !== reserved) {
          console.log('Old reserved !== New reserved', oldReserved, reserved);
          accountMigrated = false;
        }

        // 7.2 balances.locks: no id appstake
        const locks = await helper.balance.getLocked(accountToMigrate);
        const appPromoLocks = locks.filter(lock => lock.id === 'appstake');
        if(appPromoLocks.length > 0)
          accountMigrated = false;

        // 7.3 balances.freezes set...
        let freezes = await api.query.balances.freezes(accountToMigrate) as any;
        freezes = freezes.map((freez: any) => ({id: freez.id.toString(), amount: freez.amount.toBigInt()}));
        const oldAppPromoLocks = oldAccount.locks.filter(l => l.id === '0x6170707374616b65');
        if(freezes.length !== oldAppPromoLocks.length) {
          console.log('freezes.length !== old appPromoLocks.length', freezes.length, oldAppPromoLocks.length);
          accountMigrated = false;
        }
        if(freezes[0].amount !== BigInt(oldAppPromoLocks[0].amount)) {
          console.log('freezes amount !== old appPromoLocks amount', freezes[0].amount, oldAppPromoLocks[0].amount);
        }
        for(const freez of freezes) {
          if(freez.id !== '0x6170707374616b656170707374616b65') {
            console.log('Got freez with incorrect id:', freez.id);
            accountMigrated = false;
          }
        }

        // 7.4 Total staked the same
        const totalStaked = await helper.staking.getTotalStaked({Substrate: accountToMigrate});
        const oldTotalStaked = oldAccount.balance;
        if(BigInt(totalStaked) !== BigInt(oldTotalStaked)) {
          console.log('Old totalStaked !== New totalStaked', oldTotalStaked, totalStaked);
          accountMigrated = false;
        }
        // 7.4 Stakes number the same
        const stakesNumber = await helper.staking.getStakesNumber({Substrate: accountToMigrate});
        if(stakesNumber !== Object.keys(oldAccount.stakes).length) {
          console.log('Old stakes number !== New stakes number', Object.keys(oldAccount.stakes).length, stakesNumber);
          accountMigrated = false;
        }

        // 7.5 Total pendingUnstake the same
        const pendingUnstakes = await helper.staking.getPendingUnstakePerBlock({Substrate: accountToMigrate});
        if(!isNull(oldAccount.unstakes)) {
          if(pendingUnstakes.length !== Object.keys(oldAccount.unstakes).length) {
            console.log('Old unstakes number !== New unstakes number', Object.keys(oldAccount.unstakes).length, pendingUnstakes);
            accountMigrated = false;
          }
        }

        // 8 Add to not-migrated
        if(!accountMigrated) {
          console.log('Add to not migrated:', accountToMigrate);
          _notMigrated.push(accountToMigrate);
        }
      }

      blocksLeft--;
      notMigrated = _notMigrated;
      await helper.wait.newBlocks(1);
    } while(blocksLeft > 0 && notMigrated.length !== 0);

    console.log('Not migrated accounts...', notMigrated.length);
    if(notMigrated.length > 0) {
      console.log('Not migrated list:');
      notMigrated.forEach(console.log);
      fs.writeFileSync('./failed.json', JSON.stringify(notMigrated));
      process.exit(1);
    } else {
      console.log('Migration success');
    }
  }, options.wsEndpoint);
};

const chunk = <T>(arr: T[], size: number) =>
  Array.from({length: Math.ceil(arr.length / size)}, (_: any, i: number) =>
    arr.slice(i * size, i * size + size));

main().then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
