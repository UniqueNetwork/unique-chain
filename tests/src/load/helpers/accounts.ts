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
  wsEndpoin?: string,
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
      transactions.push(signSendAndWait({signer: donor, extrinsic, options: {era: 0, nonce: nonce++}}));
    }

    console.log('Transactions sent, waiting for result...');
    const result = await Promise.all(transactions);
    return result;
  }, wsEndpoin ? wsEndpoin : WS_ENDPOINT);
}

/**
 * Transfer all the balance from ```crowd``` to ```destination``` account
 * @param crowd accounts to transferAll from
 * @param recepient recepient of transferAll
 */
export async function spamEmptyAccounts(crowd: IKeyringPair[], recepient: IKeyringPair) {
  return await usingPlaygrounds(async (helper) => {
    const api = helper.getApi();

    const transactions: Promise<TxResult>[] = [];
    console.log('Signing transferAll transactions from', crowd.length, 'accounts');
    for (const account of crowd) {
      const extrinsic = api.tx.balances.transferAll(recepient.address, false);
      transactions.push(signSendAndWait({extrinsic, signer: account}));
    }

    console.log('Transactions sent, waiting for result...');
    const result = await Promise.all(transactions);
    return result;
  }, WS_ENDPOINT);
}

export function chunk<T>(array: T[], size: number) {
  const chunkedArray = [];
  for (let i = 0; i < array.length; i += size) {
    chunkedArray.push(array.slice(i, i + size));
  }
  return chunkedArray;
}