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

// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="helpers.d.ts" />

import {ApiPromise} from '@polkadot/api';
import {IKeyringPair} from '@polkadot/types/types';
import {addressToEvm, evmToAddress} from '@polkadot/util-crypto';
import {expect} from 'chai';
import * as solc from 'solc';
import Web3 from 'web3';
import config from '../../config';
import getBalance from '../../substrate/get-balance';
import usingApi, {submitTransactionAsync} from '../../substrate/substrate-api';
import waitNewBlocks from '../../substrate/wait-new-blocks';
import {CollectionMode, CrossAccountId, getDetailedCollectionInfo, getGenericResult, UNIQUE} from '../../util/helpers';
import collectionHelpersAbi from '../collectionHelpersAbi.json';
import fungibleAbi from '../fungibleAbi.json';
import nonFungibleAbi from '../nonFungibleAbi.json';
import refungibleAbi from '../reFungibleAbi.json';
import refungibleTokenAbi from '../reFungibleTokenAbi.json';
import contractHelpersAbi from './contractHelpersAbi.json';

export const GAS_ARGS = {gas: 2500000};

export enum SponsoringMode {
  Disabled = 0,
  Allowlisted = 1,
  Generous = 2,
}

let web3Connected = false;
export async function usingWeb3<T>(cb: (web3: Web3) => Promise<T> | T): Promise<T> {
  if (web3Connected) throw new Error('do not nest usingWeb3 calls');
  web3Connected = true;

  const provider = new Web3.providers.WebsocketProvider(config.substrateUrl);
  const web3 = new Web3(provider);

  try {
    return await cb(web3);
  } finally {
    // provider.disconnect(3000, 'normal disconnect');
    provider.connection.close();
    web3Connected = false;
  }
}

function encodeIntBE(v: number): number[] {
  if (v >= 0xffffffff || v < 0) throw new Error('id overflow');
  return [
    v >> 24,
    (v >> 16) & 0xff,
    (v >> 8) & 0xff,
    v & 0xff,
  ];
}

export async function getCollectionAddressFromResult(api: ApiPromise, result: any) {
  const collectionIdAddress = normalizeAddress(result.events.CollectionCreated.returnValues.collectionId);
  const collectionId = collectionIdFromAddress(collectionIdAddress);  
  const collection = (await getDetailedCollectionInfo(api, collectionId))!;
  return {collectionIdAddress, collectionId, collection};
}

export function collectionIdToAddress(collection: number): string {
  const buf = Buffer.from([0x17, 0xc4, 0xe6, 0x45, 0x3c, 0xc4, 0x9a, 0xaa, 0xae, 0xac, 0xa8, 0x94, 0xe6, 0xd9, 0x68, 0x3e,
    ...encodeIntBE(collection),
  ]);
  return Web3.utils.toChecksumAddress('0x' + buf.toString('hex'));
}
export function collectionIdFromAddress(address: string): number {
  if (!address.startsWith('0x'))
    throw 'address not starts with "0x"';
  if (address.length > 42)
    throw 'address length is more than 20 bytes';
  return Number('0x' + address.substring(address.length - 8));
}
  
export function normalizeAddress(address: string): string {
  return '0x' + address.substring(address.length - 40);
}

export function tokenIdToAddress(collection: number, token: number): string {
  const buf = Buffer.from([0xf8, 0x23, 0x8c, 0xcf, 0xff, 0x8e, 0xd8, 0x87, 0x46, 0x3f, 0xd5, 0xe0,
    ...encodeIntBE(collection),
    ...encodeIntBE(token),
  ]);
  return Web3.utils.toChecksumAddress('0x' + buf.toString('hex'));
}

export function tokenIdFromAddress(address: string) {
  if (!address.startsWith('0x'))
    throw 'address not starts with "0x"';
  if (address.length > 42)
    throw 'address length is more than 20 bytes';
  return {
    collectionId: Number('0x' + address.substring(address.length - 16, address.length - 8)),
    tokenId: Number('0x' + address.substring(address.length - 8)),
  };
}

export function tokenIdToCross(collection: number, token: number): CrossAccountId {
  return {
    Ethereum: tokenIdToAddress(collection, token),
  };
}

export function createEthAccount(web3: Web3) {
  const account = web3.eth.accounts.create();
  web3.eth.accounts.wallet.add(account.privateKey);
  return account.address;
}

export async function createEthAccountWithBalance(api: ApiPromise, web3: Web3, privateKeyWrapper: (account: string) => IKeyringPair) {
  const alice = privateKeyWrapper('//Alice');
  const account = createEthAccount(web3);
  await transferBalanceToEth(api, alice, account);

  return account;
}

export async function transferBalanceToEth(api: ApiPromise, source: IKeyringPair, target: string, amount = 1000n * UNIQUE) {
  const tx = api.tx.balances.transfer(evmToAddress(target), amount);
  const events = await submitTransactionAsync(source, tx);
  const result = getGenericResult(events);
  expect(result.success).to.be.true;
}

export async function createRefungibleCollection(api: ApiPromise, web3: Web3, owner: string) {
  const collectionHelper = evmCollectionHelpers(web3, owner);
  const result = await collectionHelper.methods
    .createRefungibleCollection('A', 'B', 'C')
    .send();
  return await getCollectionAddressFromResult(api, result);
}


export async function createNonfungibleCollection(api: ApiPromise, web3: Web3, owner: string) {
  const collectionHelper = evmCollectionHelpers(web3, owner);
  const result = await collectionHelper.methods
    .createNonfungibleCollection('A', 'B', 'C')
    .send();
  return await getCollectionAddressFromResult(api, result);
}

export function uniqueNFT(web3: Web3, address: string, owner: string) {
  return new web3.eth.Contract(nonFungibleAbi as any, address, {
    from: owner,
    ...GAS_ARGS,
  });
}

export function uniqueRefungible(web3: Web3, collectionAddress: string, owner: string) {
  return new web3.eth.Contract(refungibleAbi as any, collectionAddress, {
    from: owner,
    ...GAS_ARGS,
  });
}

export function uniqueRefungibleToken(web3: Web3, tokenAddress: string, owner: string | undefined = undefined) {
  return new web3.eth.Contract(refungibleTokenAbi as any, tokenAddress, {
    from: owner,
    ...GAS_ARGS,
  });
}

export async function itWeb3(name: string, cb: (apis: { web3: Web3, api: ApiPromise, privateKeyWrapper: (account: string) => IKeyringPair }) => any, opts: { only?: boolean, skip?: boolean } = {}) {
  let i: any = it;
  if (opts.only) i = i.only;
  else if (opts.skip) i = i.skip;
  i(name, async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      await usingWeb3(async web3 => {
        await cb({api, web3, privateKeyWrapper});
      });
    });
  });
}
itWeb3.only = (name: string, cb: (apis: { web3: Web3, api: ApiPromise, privateKeyWrapper: (account: string) => IKeyringPair }) => any) => itWeb3(name, cb, {only: true});
itWeb3.skip = (name: string, cb: (apis: { web3: Web3, api: ApiPromise, privateKeyWrapper: (account: string) => IKeyringPair }) => any) => itWeb3(name, cb, {skip: true});

export async function generateSubstrateEthPair(web3: Web3) {
  const account = web3.eth.accounts.create();
  evmToAddress(account.address);
}

type NormalizedEvent = {
    address: string,
    event: string,
    args: { [key: string]: string }
};

export function normalizeEvents(events: any): NormalizedEvent[] {
  const output = [];
  for (const key of Object.keys(events)) {
    if (key.match(/^[0-9]+$/)) {
      output.push(events[key]);
    } else if (Array.isArray(events[key])) {
      output.push(...events[key]);
    } else {
      output.push(events[key]);
    }
  }
  output.sort((a, b) => a.logIndex - b.logIndex);
  return output.map(({address, event, returnValues}) => {
    const args: { [key: string]: string } = {};
    for (const key of Object.keys(returnValues)) {
      if (!key.match(/^[0-9]+$/)) {
        args[key] = returnValues[key];
      }
    }
    return {
      address,
      event,
      args,
    };
  });
}

export async function recordEvents(contract: any, action: () => Promise<void>): Promise<NormalizedEvent[]> {
  const out: any = [];
  contract.events.allEvents((_: any, event: any) => {
    out.push(event);
  });
  await action();
  return normalizeEvents(out);
}

export function subToEthLowercase(eth: string): string {
  const bytes = addressToEvm(eth);
  return '0x' + Buffer.from(bytes).toString('hex');
}

export function subToEth(eth: string): string {
  return Web3.utils.toChecksumAddress(subToEthLowercase(eth));
}

export interface CompiledContract {
  abi: any,
  object: string,
}

export function compileContract(name: string, src: string) : CompiledContract {
  const out = JSON.parse(solc.compile(JSON.stringify({
    language: 'Solidity',
    sources: {
      [`${name}.sol`]: {
        content: `
          // SPDX-License-Identifier: UNLICENSED
          pragma solidity ^0.8.6;

          ${src}
        `,
      },
    },
    settings: {
      outputSelection: {
        '*': {
          '*': ['*'],
        },
      },
    },
  }))).contracts[`${name}.sol`][name];

  return {
    abi: out.abi,
    object: '0x' + out.evm.bytecode.object,
  };
}

export async function deployFlipper(web3: Web3, deployer: string) {
  const compiled = compileContract('Flipper', `
    contract Flipper {
      bool value = false;
      function flip() public {
        value = !value;
      }
      function getValue() public view returns (bool) {
        return value;
      }
    }
  `);
  const flipperContract = new web3.eth.Contract(compiled.abi, undefined, {
    data: compiled.object,
    from: deployer,
    ...GAS_ARGS,
  });
  const flipper = await flipperContract.deploy({data: compiled.object}).send({from: deployer});

  return flipper;
}

export async function deployCollector(web3: Web3, deployer: string) {
  const compiled = compileContract('Collector', `
    contract Collector {
      uint256 collected;
      fallback() external payable {
        giveMoney();
      }
      function giveMoney() public payable {
        collected += msg.value;
      }
      function getCollected() public view returns (uint256) {
        return collected;
      }
      function getUnaccounted() public view returns (uint256) {
        return address(this).balance - collected;
      }

      function withdraw(address payable target) public {
        target.transfer(collected);
        collected = 0;
      }
    }
  `);
  const collectorContract = new web3.eth.Contract(compiled.abi, undefined, {
    data: compiled.object,
    from: deployer,
    ...GAS_ARGS,
  });
  const collector = await collectorContract.deploy({data: compiled.object}).send({from: deployer});

  return collector;
}

/** 
 * pallet evm_contract_helpers
 * @param web3 
 * @param caller - eth address
 * @returns 
 */
export function contractHelpers(web3: Web3, caller: string) {
  return new web3.eth.Contract(contractHelpersAbi as any, '0x842899ECF380553E8a4de75bF534cdf6fBF64049', {from: caller, ...GAS_ARGS});
}

/** 
 * evm collection helper
 * @param web3 
 * @param caller - eth address
 * @returns 
 */
export function evmCollectionHelpers(web3: Web3, caller: string) {
  return new web3.eth.Contract(collectionHelpersAbi as any, '0x6c4e9fe1ae37a41e93cee429e8e1881abdcbb54f', {from: caller, ...GAS_ARGS});
}

/** 
 * evm collection
 * @param web3 
 * @param caller - eth address
 * @returns 
 */
export function evmCollection(web3: Web3, caller: string, collection: string, mode: CollectionMode = {type: 'NFT'}) {
  let abi;
  switch (mode.type) {
    case 'Fungible':
      abi = fungibleAbi;
      break;
    
    case 'NFT':
      abi = nonFungibleAbi;
      break;
    
    case 'ReFungible':
      abi = refungibleAbi;
      break;

    default:
      throw 'Bad collection mode';
  }
  const contract = new web3.eth.Contract(abi as any, collection, {from: caller, ...GAS_ARGS});
  return contract;
}

/**
 * Execute ethereum method call using substrate account
 * @param to target contract
 * @param mkTx - closure, receiving `contract.methods`, and returning method call,
 * to be used as following (assuming `to` = erc20 contract):
 * `m => m.transfer(to, amount)`
 *
 * # Example
 * ```ts
 * executeEthTxOnSub(api, alice, erc20Contract, m => m.transfer(target, amount));
 * ```
 */
export async function executeEthTxOnSub(web3: Web3, api: ApiPromise, from: IKeyringPair, to: any, mkTx: (methods: any) => any, {value = 0}: {value?: bigint | number} = { }) {
  const tx = api.tx.evm.call(
    subToEth(from.address),
    to.options.address,
    mkTx(to.methods).encodeABI(),
    value,
    GAS_ARGS.gas,
    await web3.eth.getGasPrice(),
    null,
    null,
    [],
  );
  const events = await submitTransactionAsync(from, tx);
  expect(events.some(({event: {section, method}}) => section == 'evm' && method == 'Executed')).to.be.true;
}

export async function ethBalanceViaSub(api: ApiPromise, address: string): Promise<bigint> {
  return (await getBalance(api, [evmToAddress(address)]))[0];
}

/**
 * Measure how much gas given closure consumes
 *
 * @param user which user balance will be checked
 */
export async function recordEthFee(api: ApiPromise, user: string, call: () => Promise<any>): Promise<bigint> {
  const before = await ethBalanceViaSub(api, user);

  await call();

  // In dev mode, the transaction might not finish processing in time
  await waitNewBlocks(api, 1);
  const after = await ethBalanceViaSub(api, user);

  // Can't use .to.be.less, because chai doesn't supports bigint
  expect(after < before).to.be.true;

  return before - after;
}

type ElementOf<A> = A extends readonly (infer T)[] ? T : never;
// I want a fancier api, not a memory efficiency
export function* cartesian<T extends Array<Array<any>>, R extends Array<any>>(internalRest: [...R], ...args: [...T]): Generator<[...R, ...{[K in keyof T]: ElementOf<T[K]>}]> {
  if(args.length === 0) {
    yield internalRest as any;
    return;
  }
  for(const value of args[0]) {
    yield* cartesian([...internalRest, value], ...args.slice(1)) as any;
  }
}