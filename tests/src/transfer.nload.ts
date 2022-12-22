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

import os from 'os';
import {IKeyringPair} from '@polkadot/types/types';
import {usingPlaygrounds} from './util';
import {UniqueHelper} from './util/playgrounds/unique';
import * as notReallyCluster from 'cluster'; // https://github.com/nodejs/node/issues/42271#issuecomment-1063415346
const cluster = notReallyCluster as unknown as notReallyCluster.Cluster;

async function findUnusedAddress(helper: UniqueHelper, privateKey: (account: string) => Promise<IKeyringPair>, seedAddition = ''): Promise<IKeyringPair> {
  let bal = 0n;
  let unused;
  do {
    const randomSeed = 'seed' + Math.floor(Math.random() * Math.floor(10000)) + seedAddition;
    unused = await privateKey(`//${randomSeed}`);
    bal = await helper.balance.getSubstrate(unused.address);
  } while (bal !== 0n);
  return unused;
}

function findUnusedAddresses(helper: UniqueHelper, privateKey: (account: string) => Promise<IKeyringPair>, amount: number): Promise<IKeyringPair[]> {
  return Promise.all(new Array(amount).fill(null).map(() => findUnusedAddress(helper, privateKey, '_' + Date.now())));
}

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

async function distributeBalance(source: IKeyringPair, helper: UniqueHelper, privateKey: (account: string) => Promise<IKeyringPair>, totalAmount: bigint, stages: number) {
  const accounts = [source];
  // we don't need source in output array
  const failedAccounts = [0];

  const finalUserAmount = 2 ** stages - 1;
  accounts.push(...await findUnusedAddresses(helper, privateKey, finalUserAmount));
  // findUnusedAddresses produces at least 1 request per user
  increaseCounter('requests', finalUserAmount);

  for (let stage = 0; stage < stages; stage++) {
    const usersWithBalance = 2 ** stage;
    const amount = totalAmount / (2n ** BigInt(stage)) - FEE * BigInt(stage);
    // console.log(`Stage ${stage}/${stages}, ${usersWithBalance} => ${usersWithBalance * 2} = ${amount}`);
    const txs: Promise<boolean | void>[] = [];
    for (let i = 0; i < usersWithBalance; i++) {
      const newUser = accounts[i + usersWithBalance];
      // console.log(`${accounts[i].address} => ${newUser.address} = ${amountToSplit}`);
      const tx = helper.balance.transferToSubstrate(accounts[i], newUser.address, amount);
      txs.push(tx.catch(() => {
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
  usingPlaygrounds(async (helper) => {
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
      await helper.wait.newBlocks(1);
    }
  });
  const waiting: Promise<void>[] = [];
  console.log(`Starting ${os.cpus().length} workers`);
  usingPlaygrounds(async (helper, privateKey) => {
    const alice = await privateKey('//Alice');
    for (const id in os.cpus()) {
      const WORKER_NAME = `//LoadWorker${id}_${Date.now()}`;
      const workerAccount = await privateKey(WORKER_NAME);
      await helper.balance.transferToSubstrate(alice, workerAccount.address, 400n * 10n ** 23n);

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
  usingPlaygrounds(async (helper, privateKey) => {
    await distributeBalance(await privateKey(process.env.WORKER_NAME as string), helper, privateKey, 400n * 10n ** 22n, 10);
  });
  const interval = setInterval(() => {
    flushCounterToMaster();
  }, 100);
  interval.unref();
}
