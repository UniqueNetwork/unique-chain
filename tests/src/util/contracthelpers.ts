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

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {submitTransactionAsync, submitTransactionExpectFailAsync} from '../substrate/substrate-api';
import fs from 'fs';
import {Abi, CodePromise, ContractPromise as Contract} from '@polkadot/api-contract';
import {IKeyringPair} from '@polkadot/types/types';
import {ApiPromise} from '@polkadot/api';

chai.use(chaiAsPromised);
const expect = chai.expect;
import {findUnusedAddress, getGenericResult} from '../util/helpers';

const value = 0;
const gasLimit = '200000000000';
const endowment = '100000000000000000';

/* eslint no-async-promise-executor: "off" */
function deployContract(alice: IKeyringPair, code: CodePromise, constructor = 'default', ...args: any[]): Promise<Contract> {
  return new Promise<Contract>(async (resolve) => {
    const unsub = await (code as any)
      .tx[constructor]({value: endowment, gasLimit}, ...args)
      .signAndSend(alice, (result: any) => {
        if (result.status.isInBlock || result.status.isFinalized) {
          // here we have an additional field in the result, containing the blueprint
          resolve((result as any).contract);
          unsub();
        }
      });
  });
}

async function prepareDeployer(api: ApiPromise, privateKeyWrapper: (account: string) => IKeyringPair) {
  // Find unused address
  const deployer = await findUnusedAddress(api, privateKeyWrapper);

  // Transfer balance to it
  const alice = privateKeyWrapper('//Alice');
  const amount = BigInt(endowment) + 10n**15n;
  const tx = api.tx.balances.transfer(deployer.address, amount);
  await submitTransactionAsync(alice, tx);

  return deployer;
}

export async function deployFlipper(api: ApiPromise, privateKeyWrapper: (account: string) => IKeyringPair): Promise<[Contract, IKeyringPair]> {
  const metadata = JSON.parse(fs.readFileSync('./src/flipper/metadata.json').toString('utf-8'));
  const abi = new Abi(metadata);

  const deployer = await prepareDeployer(api, privateKeyWrapper);

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
    throw 'Failed to get flipper value';
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

export async function deployTransferContract(api: ApiPromise, privateKeyWrapper: (account: string) => IKeyringPair): Promise<[Contract, IKeyringPair]> {
  const metadata = JSON.parse(fs.readFileSync('./src/transfer_contract/metadata.json').toString('utf-8'));
  const abi = new Abi(metadata);

  const deployer = await prepareDeployer(api, privateKeyWrapper);

  const wasm = fs.readFileSync('./src/transfer_contract/nft_transfer.wasm');

  const code = new CodePromise(api, abi, wasm);

  const contract = await deployContract(deployer, code);

  return [contract, deployer];
}
