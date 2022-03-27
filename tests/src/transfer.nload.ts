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
import {IKeyringPair} from '@polkadot/types/types';
import privateKey from './substrate/privateKey';
import usingApi, {submitTransactionAsync} from './substrate/substrate-api';
import waitNewBlocks from './substrate/wait-new-blocks';
import {findUnusedAddresses} from './util/helpers';
import * as cluster from 'cluster';
import os from 'os';

// Innacurate transfer fee
const FEE = 10n ** 8n;

let counters: { [key: string]: number } = {};
function increaseCounter(name: string, amount: number) {
  if (!counters[name]) {
    counters[name] = 0;
  }
  counters[name] += amount;
}
function flushCounterToMaster() {
  if (Object.keys(counters).length === 0) {
    return;
  }
    process.send!(counters);
    counters = {};
}

async function distributeBalance(source: IKeyringPair, api: ApiPromise, totalAmount: bigint, stages: number) {
  const accounts = [source];
  // we don't need source in output array
  const failedAccounts = [0];

  const finalUserAmount = 2 ** stages - 1;
  accounts.push(...await findUnusedAddresses(api, finalUserAmount));
  // findUnusedAddresses produces at least 1 request per user
  increaseCounter('requests', finalUserAmount);

  for (let stage = 0; stage < stages; stage++) {
    const usersWithBalance = 2 ** stage;
    const amount = totalAmount / (2n ** BigInt(stage)) - FEE * BigInt(stage);
    // console.log(`Stage ${stage}/${stages}, ${usersWithBalance} => ${usersWithBalance * 2} = ${amount}`);
    const txs = [];
    for (let i = 0; i < usersWithBalance; i++) {
      const newUser = accounts[i + usersWithBalance];
      // console.log(`${accounts[i].address} => ${newUser.address} = ${amountToSplit}`);
      const tx = api.tx.balances.transfer(newUser.address, amount);
      txs.push(submitTransactionAsync(accounts[i], tx).catch(() => {
        failedAccounts.push(i + usersWithBalance);
        increaseCounter('txFailed', 1);
      }));
      increaseCounter('tx', 1);
    }
    await Promise.all(txs);
  }

  for (const account of failedAccounts.reverse()) {
    accounts.splice(account, 1);
  }
  return accounts;
}

if (cluster.isMaster) {
  let testDone = false;
  usingApi(async (api) => {
    const prevCounters: { [key: string]: number } = {};
    while (!testDone) {
      for (const name in counters) {
        if (!(name in prevCounters)) {
          prevCounters[name] = 0;
        }
        if(counters[name] === prevCounters[name]) {
          continue;
        }
        console.log(`${name.padEnd(15)} = ${counters[name] - prevCounters[name]}`);
        prevCounters[name] = counters[name];
      }
      await waitNewBlocks(api, 1);
    }
  });
  const waiting: Promise<void>[] = [];
  console.log(`Starting ${os.cpus().length} workers`);
  usingApi(async (api) => {
    const alice = privateKey('//Alice');
    for (const id in os.cpus()) {
      const WORKER_NAME = `//LoadWorker${id}_${Date.now()}`;
      const workerAccount = privateKey(WORKER_NAME);
      const tx = api.tx.balances.transfer(workerAccount.address, 400n * 10n ** 23n);
      await submitTransactionAsync(alice, tx);

      const worker = cluster.fork({
        WORKER_NAME,
        STAGES: id + 2,
      });
      worker.on('message', msg => {
        for (const key in msg) {
          increaseCounter(key, msg[key]);
        }
      });
      waiting.push(new Promise(res => worker.on('exit', res)));
    }
    await Promise.all(waiting);
    testDone = true;
  });
} else {
  increaseCounter('startedWorkers', 1);
  usingApi(async (api) => {
    await distributeBalance(privateKey(process.env.WORKER_NAME as string), api, 400n * 10n ** 22n, 10);
  });
  const interval = setInterval(() => {
    flushCounterToMaster();
  }, 100);
  interval.unref();
}
