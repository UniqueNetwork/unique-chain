// import { usingApi, privateKey, onlySign } from "./../../load/lib";
import * as fs from 'fs';
import {usingPlaygrounds} from '../../util/index.js';
import path, {dirname} from 'path';
import {isInteger, parse} from 'lossless-json';
import {fileURLToPath} from 'url';
import config from '../../config.js';


const WS_ENDPOINT = config.substrateUrl;
const DONOR_SEED = '//Alice';
const UPDATE_IF_VERSION = 942057;

export function customNumberParser(value: any) {
  return isInteger(value) ? BigInt(value) : parseFloat(value);
}

export const migrateLockedToFreeze = async(options: { wsEndpoint: string; donorSeed: string } = {
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
    const dirName = dirname(fileURLToPath(import.meta.url));
    const parsingResult = parse(fs.readFileSync(path.resolve(dirName, 'output.json'), 'utf-8'), undefined, customNumberParser);

    const chainqlImportData = parsingResult as {
      address: string;
      balance: string;
      account: {
        fee_frozen: string,
        free: string,
        misc_frozen: string,
        reserved: string,
      },
      locks: {
        amount: string,
        id: string,
      }[],
      stakes: object,
      unstakes: object,
    }[];
    testChainqlData(chainqlImportData);

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

    console.log('Wait 5 blocks for transactions to be included in a block...');
    await helper.wait.newBlocks(5);
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
    const suspiciousAccounts = [];
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
        // new balances
        const free = balance.data.free;
        const reserved = balance.data.reserved;
        const frozen = balance.data.frozen;
        // old balances
        const oldFree = oldAccount.account.free;
        const oldReserved = oldAccount.account.reserved;
        const oldFrozen = oldAccount.account.fee_frozen;
        // asserts new = old
        if(oldFree.toString() !== free.toString()) {
          console.log('Old free !== New free, which is probably not a problem', oldFree.toString(), free.toString());
          suspiciousAccounts.push(accountToMigrate);
        }
        if(oldFrozen.toString() !== frozen.toString()) {
          console.log('Old frozen !== New frozen, which is probably not a problem', oldFrozen.toString(), frozen.toString());
          suspiciousAccounts.push(accountToMigrate);
        }
        if(oldReserved.toString() !== reserved.toString()) {
          console.log('Old reserved !== New reserved, which is probably not a problem', oldReserved.toString(), reserved.toString());
          suspiciousAccounts.push(accountToMigrate);
        }

        // 7.2 balances.locks: no id appstake
        const locks = await helper.balance.getLocked(accountToMigrate);
        const appPromoLocks = locks.filter(lock => lock.id === 'appstake');
        if(appPromoLocks.length !== 0) {
          console.log('Account still has app-promo lock');
          accountMigrated = false;
        }

        // 7.3 balances.freezes set...
        let freezes = await api.query.balances.freezes(accountToMigrate) as any;
        freezes = freezes.map((freez: any) => ({id: freez.id.toString(), amount: freez.amount.toString()}));
        if(!freezes) {
          console.log('Account does not have freezes');
          accountMigrated = false;
        } else {
          const oldAppPromoLocks = oldAccount.locks.filter(l => l.id === '0x6170707374616b65'); // get app promo locks
          // should be only one freez for each account
          if(freezes.length !== 1) {
            console.log('freezes.length !== 1 and old appPromoLocks.length', freezes.length, oldAppPromoLocks.length);
            accountMigrated = false;
          } else {
            const appPromoFreez = freezes[0];
            // freez-amount should be equal to migrated lock amount
            if(appPromoFreez.amount.toString() !== oldAppPromoLocks[0].amount.toString()) {
              console.log('freezes amount !== old appPromoLocks amount', appPromoFreez.amount.toString(), oldAppPromoLocks[0].amount.toString());
              accountMigrated = false;
            }
            // freez id should be correct
            if(appPromoFreez.id !== '0x6170707374616b656170707374616b65') {
              console.log('Got freez with incorrect id:', appPromoFreez.id);
              accountMigrated = false;
            }
          }
        }

        // 7.4 Stakes number the same
        const stakesNumber = await helper.staking.getStakesNumber({Substrate: accountToMigrate});
        const oldStakesNumber = oldAccount.stakes ? Object.keys(oldAccount.stakes).length : 0;
        if(stakesNumber.toString() !== oldStakesNumber.toString()) {
          console.log('Old stakes number !== New stakes number', oldStakesNumber, stakesNumber);
          accountMigrated = false;
        }

        // 7.5 Total pendingUnstake + total staked = old locked
        const pendingUnstakes = await helper.staking.getPendingUnstake({Substrate: accountToMigrate});
        const totalStaked = await helper.staking.getTotalStaked({Substrate: accountToMigrate});
        const totalBalanceInAppPromo = pendingUnstakes + totalStaked;
        if(totalBalanceInAppPromo.toString() !== oldAccount.balance.toString()) {
          console.log('totalBalanceInAppPromo !== old locked in app promo', totalBalanceInAppPromo.toString(), oldAccount.balance.toString());
          accountMigrated = false;
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
    if(suspiciousAccounts.length > 0) {
      console.log('Saving suspicious accounts to suspicious.json:');
      fs.writeFileSync('./suspicious.json', JSON.stringify(suspiciousAccounts));
    }
    if(notMigrated.length > 0) {
      console.log('Saving not migrated list to failed.json:');
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

const testChainqlData = (data: any) => {
  const wrongData = [];
  for(const account of data) {
    try {
      if(account.address == null) throw Error('no address in data');
      if(account.balance == null) throw Error('no balance in data');
      if(account.account == null) throw Error('no account in data');
      if(account.account.fee_frozen == null) throw Error('no account.fee_frozen in data');
      if(account.account.misc_frozen == null) throw Error('no account.misc_frozen in data');
      if(account.account.free == null) throw Error('no account.free in data');
      if(account.account.reserved == null) throw Error('no account.reserved in data');
      if(account.locks == null) throw Error('no locks in data');
      if(account.locks[0].amount == null) throw Error('no locks.amount in data');
      if(account.locks[0].id == null) throw Error('no locks.id in data');
    } catch (error) {
      wrongData.push(account.address);
      console.log((error as Error).message, account.address);
    }
    if(wrongData.length > 0) {
      console.log(data);
      throw Error('Chainql data not correct');
    }
  }
  console.log('Chainql data correct');
};
