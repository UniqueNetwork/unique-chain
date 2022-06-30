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

import usingApi, {submitTransactionAsync} from './substrate/substrate-api';
import {IKeyringPair} from '@polkadot/types/types';
import {Abi, BlueprintPromise as Blueprint, CodePromise, ContractPromise as Contract} from '@polkadot/api-contract';
import {ApiPromise, Keyring} from '@polkadot/api';
import {findUnusedAddress} from './util/helpers';
import fs from 'fs';

const value = 0;
const gasLimit = 500000n * 1000000n;
const endowment = '1000000000000000';

/*eslint no-async-promise-executor: "off"*/
function deployBlueprint(alice: IKeyringPair, code: CodePromise): Promise<Blueprint> {
  return new Promise<Blueprint>(async (resolve) => {
    const unsub = await code
      .createBlueprint()
      .signAndSend(alice, (result) => {
        if (result.status.isInBlock || result.status.isFinalized) {
          // here we have an additional field in the result, containing the blueprint
          resolve(result.blueprint);
          unsub();
        }
      });
  });
}

/*eslint no-async-promise-executor: "off"*/
function deployContract(alice: IKeyringPair, blueprint: Blueprint) : Promise<any> {
  return new Promise<any>(async (resolve) => {
    const unsub = await blueprint.tx
      .new(endowment, gasLimit)
      .signAndSend(alice, (result) => {
        if (result.status.isInBlock || result.status.isFinalized) {
          unsub();
          resolve(result);
        }
      });
  });
}

async function prepareDeployer(api: ApiPromise, privateKeyWrapper: ((account: string) => IKeyringPair)) {
  // Find unused address
  const deployer = await findUnusedAddress(api, privateKeyWrapper);

  // Transfer balance to it
  const alice = privateKeyWrapper('//Alice');
  const amount = BigInt(endowment) + 10n**15n;
  const tx = api.tx.balances.transfer(deployer.address, amount);
  await submitTransactionAsync(alice, tx);

  return deployer;
}

async function deployLoadTester(api: ApiPromise, privateKeyWrapper: ((account: string) => IKeyringPair)): Promise<[Contract, IKeyringPair]> {
  const metadata = JSON.parse(fs.readFileSync('./src/load_test_sc/metadata.json').toString('utf-8'));
  const abi = new Abi(metadata);

  const deployer = await prepareDeployer(api, privateKeyWrapper);

  const wasm = fs.readFileSync('./src/load_test_sc/loadtester.wasm');

  const code = new CodePromise(api, abi, wasm);

  const blueprint = await deployBlueprint(deployer, code);
  const contract = (await deployContract(deployer, blueprint))['contract'] as Contract;

  return [contract, deployer];
}

async function getScData(contract: Contract, deployer: IKeyringPair) {
  const result = await contract.query.get(deployer.address, value, gasLimit);

  if(!result.result.isSuccess) {
    throw 'Failed to get value';
  }
  return result.result.asSuccess.data;
}


describe('RPC Tests', () => {
  it('Simple RPC Load Test', async () => {
    await usingApi(async api => {
      let count = 0;
      let hrTime = process.hrtime();
      let microsec1 = hrTime[0] * 1000000 + hrTime[1] / 1000;
      let rate = 0;
      const checkPoint = 1000;

      /* eslint no-constant-condition: "off" */
      while (true) {
        await api.rpc.system.chain();
        count++;
        process.stdout.write(`RPC reads: ${count} times at rate ${rate} r/s            \r`);

        if (count % checkPoint == 0) {
          hrTime = process.hrtime();
          const microsec2 = hrTime[0] * 1000000 + hrTime[1] / 1000;
          rate = 1000000*checkPoint/(microsec2 - microsec1);
          microsec1 = microsec2;
        }
      }
    });
  });

  it('Smart Contract RPC Load Test', async () => {
    await usingApi(async (api, privateKeyWrapper) => {

      // Deploy smart contract
      const [contract, deployer] = await deployLoadTester(api, privateKeyWrapper);

      // Fill smart contract up with data
      const bob = privateKeyWrapper('//Bob');
      const tx = contract.tx.bloat(value, gasLimit, 200);
      await submitTransactionAsync(bob, tx);

      // Run load test
      let count = 0;
      let hrTime = process.hrtime();
      let microsec1 = hrTime[0] * 1000000 + hrTime[1] / 1000;
      let rate = 0;
      const checkPoint = 10;

      /* eslint no-constant-condition: "off" */
      while (true) {
        await getScData(contract, deployer);
        count++;
        process.stdout.write(`SC reads: ${count} times at rate ${rate} r/s            \r`);

        if (count % checkPoint == 0) {
          hrTime = process.hrtime();
          const microsec2 = hrTime[0] * 1000000 + hrTime[1] / 1000;
          rate = 1000000*checkPoint/(microsec2 - microsec1);
          microsec1 = microsec2;
        }
      }
    });
  });

});
