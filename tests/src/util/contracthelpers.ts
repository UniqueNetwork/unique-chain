//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

import chai from "chai";
import chaiAsPromised from 'chai-as-promised';
import { submitTransactionAsync } from "../substrate/substrate-api";
import fs from "fs";
import { Abi, BlueprintPromise as Blueprint, CodePromise, ContractPromise as Contract } from "@polkadot/api-contract";
import { IKeyringPair } from "@polkadot/types/types";
import { ApiPromise, Keyring } from "@polkadot/api";

chai.use(chaiAsPromised);
const expect = chai.expect;
import { BigNumber } from 'bignumber.js';
import { findUnusedAddress } from '../util/helpers';

const value = 0;
const gasLimit = 200000n * 1000000n;
const endowment = '100000000000000000';

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
    const initValue = true;

    const unsub = await blueprint.tx
    .new(endowment, gasLimit, initValue)
    .signAndSend(alice, (result) => {
      if (result.status.isInBlock || result.status.isFinalized) {

        console.log("Contract deployed: ", result);

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

export async function deployFlipper(api: ApiPromise): Promise<[Contract, IKeyringPair]> {
  const metadata = JSON.parse(fs.readFileSync('./src/flipper/metadata.json').toString('utf-8'));
  const abi = new Abi(metadata);

  const deployer = await prepareDeployer(api);

  const wasm = fs.readFileSync('./src/flipper/flipper.wasm');

  const code = new CodePromise(api, abi, wasm);

  const blueprint = await deployBlueprint(deployer, code);
  const contract = (await deployContract(deployer, blueprint))['contract'] as Contract;

  const initialGetResponse = await getFlipValue(contract, deployer);
  expect(initialGetResponse).to.be.true;

  return [contract, deployer];
}

export async function getFlipValue(contract: Contract, deployer: IKeyringPair) {
  const result = await contract.query.get(deployer.address, value, gasLimit);

  if(!result.result.isOk) {
    throw `Failed to get flipper value`;
  }
  return (result.result.asOk.data[0] == 0x00) ? false : true;
}
