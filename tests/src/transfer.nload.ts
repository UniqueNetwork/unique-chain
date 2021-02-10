import { ApiPromise } from "@polkadot/api";
import { IKeyringPair } from '@polkadot/types/types';
import privateKey from "./substrate/privateKey";
import usingApi, { submitTransactionAsync } from "./substrate/substrate-api";
import waitNewBlocks from "./substrate/wait-new-blocks";
import { findUnusedAddresses } from "./util/helpers";
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
    let accounts = [source];
    // we don't need source in output array
    const failedAccounts = [0];

    const finalUserAmount = 2 ** stages - 1;
    accounts.push(...await findUnusedAddresses(api, finalUserAmount));
    // findUnusedAddresses produces at least 1 request per user
    increaseCounter('requests', finalUserAmount);

    for (let stage = 0; stage < stages; stage++) {
        let usersWithBalance = 2 ** stage;
        let amount = totalAmount / (2n ** BigInt(stage)) - FEE * BigInt(stage);
        // console.log(`Stage ${stage}/${stages}, ${usersWithBalance} => ${usersWithBalance * 2} = ${amount}`);
        let txs = [];
        for (let i = 0; i < usersWithBalance; i++) {
            let newUser = accounts[i + usersWithBalance];
            // console.log(`${accounts[i].address} => ${newUser.address} = ${amountToSplit}`);
            const tx = api.tx.balances.transfer(newUser.address, amount);
            txs.push(submitTransactionAsync(accounts[i], tx).catch(e => {
                failedAccounts.push(i + usersWithBalance);
                increaseCounter('txFailed', 1);
            }));
            increaseCounter('tx', 1);
        }
        await Promise.all(txs);
    }

    for (let account of failedAccounts.reverse()) {
        accounts.splice(account, 1);
    }
    return accounts;
}

if (cluster.isMaster) {
    let testDone = false;
    usingApi(async (api) => {
        let prevCounters: { [key: string]: number } = {};
        while (!testDone) {
            for (let name in counters) {
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
    let waiting: Promise<void>[] = [];
    console.log(`Starting ${os.cpus().length} workers`);
    usingApi(async (api) => {
        const alice = privateKey('//Alice');
        for (let id in os.cpus()) {
            const WORKER_NAME = `//LoadWorker${id}_${Date.now()}`;
            const workerAccount = privateKey(WORKER_NAME);
            const tx = api.tx.balances.transfer(workerAccount.address, 400n * 10n ** 23n);
            await submitTransactionAsync(alice, tx);

            let worker = cluster.fork({
                WORKER_NAME,
                STAGES: id + 2
            });
            worker.on('message', msg => {
                for (let key in msg) {
                    increaseCounter(key, msg[key]);
                }
            });
            waiting.push(new Promise(res => worker.on('exit', res)));
        }
        await Promise.all(waiting);
        testDone = true;
    })
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