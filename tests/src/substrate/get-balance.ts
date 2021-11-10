//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

import {ApiPromise} from '@polkadot/api';
import {AccountInfo} from '@polkadot/types/interfaces/system';
import promisifySubstrate from './promisify-substrate';
import {IKeyringPair} from '@polkadot/types/types';
import {submitTransactionAsync} from './substrate-api';
import {getGenericResult} from '../util/helpers';
import {expect} from 'chai';

export default async function getBalance(api: ApiPromise, accounts: string[]): Promise<Array<bigint>> {
  const balance = promisifySubstrate(api, (acc: string[]) => api.query.system.account.multi(acc));
  const responce = await balance(accounts) as unknown as AccountInfo[];
  return responce.map((r) => r.data.free.toBigInt().valueOf());
}

export async function getBalanceSingle(api: ApiPromise, account: string): Promise<bigint> {
  return (await getBalance(api, [account]))[0];
}

export async function transferBalanceExpectSuccess(api: ApiPromise, from: IKeyringPair, to: string, amount: bigint | string) {
  const tx = api.tx.balances.transfer(to, amount);
  const events = await submitTransactionAsync(from, tx);
  const result = getGenericResult(events);
  expect(result.success).to.be.true;
}
