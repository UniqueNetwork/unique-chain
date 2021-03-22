//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

import chai from "chai";
import chaiAsPromised from 'chai-as-promised';
import { submitTransactionAsync, submitTransactionExpectFailAsync } from "../substrate/substrate-api";
import fs from "fs";
import { Abi, BlueprintPromise as Blueprint, CodePromise, ContractPromise as Contract } from "@polkadot/api-contract";
import { IKeyringPair } from "@polkadot/types/types";
import { ApiPromise, Keyring } from "@polkadot/api";

chai.use(chaiAsPromised);
const expect = chai.expect;
import { BigNumber } from 'bignumber.js';
import { findUnusedAddress, getGenericResult } from '../util/helpers';

const value = 0;
const gasLimit = '200000000000';
const endowment = '100000000000000000';

function deployContract(alice: IKeyringPair, code: CodePromise, constructor: string = 'default', ...args: any[]): Promise<Contract> {
  return new Promise<Contract>(async (resolve, reject) => {
    const unsub = await (code as any)
      .tx[constructor]({value: endowment, gasLimit}, ...args)
      .signAndSend(alice, (result: any) => {
        if (result.status.isInBlock || result.status.isFinalized) {
          // here we have an additional field in the result, containing the blueprint
          resolve((result as any).contract);
          unsub();
        }
      })
  });
}

async function prepareDeployer(api: ApiPromise) {
  // Find unused address
  const deployer = await findUnusedAddress(api);

  // Transfer balance to it
  const keyring = new Keyring({ type: 'sr25519' });
  const alice = keyring.addFromUri(`//Alice`);
  let amount = new BigNumber(endowment);
  amount = amount.plus(100e15);
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

  const contract = (await deployContract(deployer, code, 'new', true)) as Contract;

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

export async function toggleFlipValueExpectSuccess(sender: IKeyringPair, contract: Contract) {
  const tx = contract.tx.flip(value, gasLimit);
  const events = await submitTransactionAsync(sender, tx);
  const result = getGenericResult(events);

  expect(result.success).to.be.true;
}

export async function toggleFlipValueExpectFailure(sender: IKeyringPair, contract: Contract) {
  const tx = contract.tx.flip(value, gasLimit);
  await expect(submitTransactionExpectFailAsync(sender, tx)).to.be.rejected;
}

function instantiateTransferContract(alice: IKeyringPair, blueprint: Blueprint) : Promise<any> {
  return new Promise<any>(async (resolve, reject) => {
    const unsub = await blueprint.tx
    .default(endowment, gasLimit)
    .signAndSend(alice, (result) => {
      if (result.status.isInBlock || result.status.isFinalized) {
        unsub();
        resolve(result);
      }
    });    
  });
}

export async function deployTransferContract(api: ApiPromise): Promise<[Contract, IKeyringPair]> {
  const metadata = JSON.parse(fs.readFileSync('./src/transfer_contract/metadata.json').toString('utf-8'));
  const abi = new Abi(metadata);

  const deployer = await prepareDeployer(api);

  const wasm = fs.readFileSync('./src/transfer_contract/nft_transfer.wasm');

  const code = new CodePromise(api, abi, wasm);

  const contract = await deployContract(deployer, code);

  return [contract, deployer];
}
