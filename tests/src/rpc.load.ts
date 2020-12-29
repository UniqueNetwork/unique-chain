//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

import { expect, assert } from "chai";
import usingApi, { submitTransactionAsync, submitTransactionExpectFailAsync } from "./substrate/substrate-api";
import { IKeyringPair } from "@polkadot/types/types";
import { Abi, BlueprintPromise as Blueprint, CodePromise, ContractPromise as Contract } from "@polkadot/api-contract";
import { ApiPromise, Keyring } from "@polkadot/api";
import { ApiTypes, SubmittableExtrinsic } from "@polkadot/api/types";
import { BigNumber } from 'bignumber.js';
import { findUnusedAddress } from './util/helpers'
import fs from "fs";
import privateKey from "./substrate/privateKey";

const value = 0;
const gasLimit = 500000n * 1000000n;
const endowment = `1000000000000000`;


function deployBlueprint(alice: IKeyringPair, code: CodePromise): Promise<Blueprint> {
  return new Promise<Blueprint>(async (resolve, reject) => {
    const unsub = await code
      .createBlueprint()
      .signAndSend(alice, (result) => {
        if (result.status.isInBlock || result.status.isFinalized) {
          // here we have an additional field in the result, containing the blueprint
          resolve(result.blueprint);
          unsub();
        }
      })
  });
}

function deployContract(alice: IKeyringPair, blueprint: Blueprint) : Promise<any> {
  return new Promise<any>(async (resolve, reject) => {
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

async function prepareDeployer(api: ApiPromise) {
  // Find unused address
  const deployer = await findUnusedAddress(api);

  // Transfer balance to it
  const keyring = new Keyring({ type: 'sr25519' });
  const alice = keyring.addFromUri(`//Alice`);
  let amount = new BigNumber(endowment);
  amount = amount.plus(1e15);
  const tx = api.tx.balances.transfer(deployer.address, amount.toFixed());
  await submitTransactionAsync(alice, tx);

  return deployer;
}

async function deployLoadTester(api: ApiPromise): Promise<[Contract, IKeyringPair]> {
  const metadata = JSON.parse(fs.readFileSync('./src/load_test_sc/metadata.json').toString('utf-8'));
  const abi = new Abi(metadata);

  const deployer = await prepareDeployer(api);

  const wasm = fs.readFileSync('./src/load_test_sc/loadtester.wasm');

  const code = new CodePromise(api, abi, wasm);

  const blueprint = await deployBlueprint(deployer, code);
  const contract = (await deployContract(deployer, blueprint))['contract'] as Contract;

  return [contract, deployer];
}

async function getScData(contract: Contract, deployer: IKeyringPair) {
  const result = await contract.query.get(deployer.address, value, gasLimit);

  if(!result.result.isSuccess) {
    throw `Failed to get value`;
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
      while (true) {
        await api.rpc.system.chain();
        count++;
        process.stdout.write(`RPC reads: ${count} times at rate ${rate} r/s            \r`);
    
        if (count % checkPoint == 0) {
          hrTime = process.hrtime();
          let microsec2 = hrTime[0] * 1000000 + hrTime[1] / 1000;
          rate = 1000000*checkPoint/(microsec2 - microsec1);
          microsec1 = microsec2;
        }
      }
    });
  });

  it.only('Smart Contract RPC Load Test', async () => {
    await usingApi(async api => {

      // Deploy smart contract
      const [contract, deployer] = await deployLoadTester(api);

      // Fill smart contract up with data
      const bob = privateKey("//Bob");
      const tx = contract.tx.bloat(value, gasLimit, 200);
      await submitTransactionAsync(bob, tx);

      // Run load test
      let count = 0;
      let hrTime = process.hrtime();
      let microsec1 = hrTime[0] * 1000000 + hrTime[1] / 1000;
      let rate = 0;
      const checkPoint = 10;
      while (true) {
        await getScData(contract, deployer);
        count++;
        process.stdout.write(`SC reads: ${count} times at rate ${rate} r/s            \r`);
    
        if (count % checkPoint == 0) {
          hrTime = process.hrtime();
          let microsec2 = hrTime[0] * 1000000 + hrTime[1] / 1000;
          rate = 1000000*checkPoint/(microsec2 - microsec1);
          microsec1 = microsec2;
        }
      }
    });
  });

});
