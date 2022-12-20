// Copyright 2019-2022 Unique Network (Gibraltar) Ltd.
// This file is part of Unique Network.

// Unique Network is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// Unique Network is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with Unique Network. If not, see <http://www.gnu.org/licenses/>.

import {ApiPromise} from '@polkadot/api';
import {AccountInfo} from '@polkadot/types/interfaces/system';
import promisifySubstrate from './promisify-substrate';
import {IKeyringPair} from '@polkadot/types/types';
import {submitTransactionAsync} from './substrate-api';
import {getGenericResult} from '../deprecated-helpers/helpers';
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
