import {IKeyringPair} from '@polkadot/types/types';
import {usingPlaygrounds} from '../../util';
import {signSendAndWait, TxResult} from './sign';
import {WS_ENDPOINT} from '../config';

/* eslint-disable no-constant-condition */

/**
 * Returns IKeyringPair[] of "//Account//{1,2,3...}"" accounts
 * @param accountsNumber number of accounts to create
 * @returns ```IKeyringPair[]```
 */
export async function getAccounts(accountsNumber: number, baseSeed: string): Promise<IKeyringPair[]> {
  // eslint-disable-next-line require-await
  return await usingPlaygrounds(async (helper) => {
    const accounts = Array(accountsNumber)
      .fill(baseSeed.startsWith('//' ? baseSeed : `//${baseSeed}`))
      .map((donor, i) => helper.util.fromSeed(donor + `//${i}`));
    return accounts;
  }, WS_ENDPOINT);
}

/**
 * Send specified balance from ```donor``` to ```accounts```
 * @param donor account to transfer UNQ
 * @param accounts recepients
 * @param accountBalance balance of each account
 * @returns ```IKeyringPair[]``` of feeded accounts
 */
export async function arrangeTopUpAccounts
(
  donor: IKeyringPair | string,
  accounts: IKeyringPair[],
  accountBalance: bigint,
  retry = false,
  wsEndpoin: string = WS_ENDPOINT,
): Promise<TxResult[]> {
  return await usingPlaygrounds(async (helper) => {
    if (typeof donor === 'string') donor = helper.util.fromSeed(donor);
    const api = helper.getApi();
    let nonce = await helper.chain.getNonce(donor.address);

    const transactions: Promise<TxResult>[] = [];
    console.log('Signing transfer transactions for', accounts.length, 'accounts');
    for (const account of accounts) {
      // For each account creates immortal extrinsic, send it and push transactions[]:
      const extrinsic = api.tx.balances.transfer(account.address, accountBalance);
      transactions.push(signSendAndWait({signer: donor, extrinsic, options: {era: 0, nonce: nonce++}}, retry));
    }

    console.log('Transactions sent, waiting for result...');
    const result = await Promise.all(transactions);
    return result;
  }, wsEndpoin);
}

/**
 * Transfer all the balance from ```crowd``` to ```destination``` account
 * @param crowd accounts to transferAll from
 * @param recepient recepient of transferAll
 */
export async function spamEmptyAccounts(
  crowd: IKeyringPair[],
  recepient: IKeyringPair,
  retry = false,
  wsEndpoin: string = WS_ENDPOINT,
) {
  return await usingPlaygrounds(async (helper) => {
    const api = helper.getApi();

    const transactions: Promise<TxResult>[] = [];
    console.log('Signing transferAll transactions from', crowd.length, 'accounts');
    for (const account of crowd) {
      const extrinsic = api.tx.balances.transferAll(recepient.address, retry);
      transactions.push(signSendAndWait({extrinsic, signer: account}));
    }

    console.log('Transactions sent, waiting for result...');
    const result = await Promise.all(transactions);
    return result;
  }, wsEndpoin);
}

export async function spamTransfer(
  crowd: IKeyringPair[],
  recepient: IKeyringPair,
  balance: bigint,
  transfersEach: number,
  retry = false,
  wsEndpoin: string = WS_ENDPOINT,
) {
  return await usingPlaygrounds(async (helper) => {
    const api = helper.getApi();

    const transactions: Promise<TxResult>[] = [];
    for (const account of crowd) {
      const extrinsic = api.tx.balances.transfer(recepient.address, balance);
      const spamScript = async () => {
        let result: TxResult = {status: 'fail'};
        for (let i = 0; i < transfersEach; i++) {
          result = await signSendAndWait({extrinsic, signer: account}, retry);
        }
        return result;
      };
      transactions.push(spamScript());
    }

    console.log('Transactions sent, waiting for result...');
    const result = await Promise.all(transactions);
    return result;
  }, wsEndpoin);
}

export function chunk<T>(array: T[], size: number) {
  const chunkedArray = [];
  for (let i = 0; i < array.length; i += size) {
    chunkedArray.push(array.slice(i, i + size));
  }
  return chunkedArray;
}