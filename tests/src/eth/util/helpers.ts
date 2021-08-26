//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="helpers.d.ts" />

import { ApiPromise } from '@polkadot/api';
import { addressToEvm, evmToAddress } from '@polkadot/util-crypto';
import Web3 from 'web3';
import usingApi, { submitTransactionAsync } from '../../substrate/substrate-api';
import { IKeyringPair } from '@polkadot/types/types';
import { expect } from 'chai';
import { getGenericResult } from '../../util/helpers';
import * as solc from 'solc';
import config from '../../config';
import privateKey from '../../substrate/privateKey';
import contractHelpersAbi from './contractHelpersAbi.json';

export const GAS_ARGS = { gas: 0x1000000, gasPrice: '0x01' };

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

type Web3HttpMarker = {web3Http: true};

export async function usingWeb3Http<T>(cb: (web3: Web3 & Web3HttpMarker) => Promise<T> | T): Promise<T> {
  const provider = new Web3.providers.HttpProvider(config.frontierUrl);
  const web3: Web3 & Web3HttpMarker = new Web3(provider) as any;
  web3.web3Http = true;

  return await cb(web3);
}

export function collectionIdToAddress(address: number): string {
  if (address >= 0xffffffff || address < 0) throw new Error('id overflow');
  const buf = Buffer.from([0x17, 0xc4, 0xe6, 0x45, 0x3c, 0xc4, 0x9a, 0xaa, 0xae, 0xac, 0xa8, 0x94, 0xe6, 0xd9, 0x68, 0x3e,
    address >> 24,
    (address >> 16) & 0xff,
    (address >> 8) & 0xff,
    address & 0xff,
  ]);
  return Web3.utils.toChecksumAddress('0x' + buf.toString('hex'));
}

export function createEthAccount(web3: Web3) {
  const account = web3.eth.accounts.create();
  web3.eth.accounts.wallet.add(account.privateKey);
  return account.address;
}

export async function createEthAccountWithBalance(api: ApiPromise, web3: Web3) {
  const alice = privateKey('//Alice');
  const account = createEthAccount(web3);
  await transferBalanceToEth(api, alice, account);

  return account;
}

export async function transferBalanceToEth(api: ApiPromise, source: IKeyringPair, target: string, amount = 999999999999999) {
  const tx = api.tx.balances.transfer(evmToAddress(target), amount);
  const events = await submitTransactionAsync(source, tx);
  const result = getGenericResult(events);
  expect(result.success).to.be.true;
}

export async function itWeb3(name: string, cb: (apis: { web3: Web3, api: ApiPromise }) => any, opts: { only?: boolean, skip?: boolean } = {}) {
  let i: any = it;
  if (opts.only) i = i.only;
  else if (opts.skip) i = i.skip;
  i(name, async () => {
    await usingApi(async api => {
      await usingWeb3(async web3 => {
        await cb({ api, web3 });
      });
    });
  });
}
itWeb3.only = (name: string, cb: (apis: { web3: Web3, api: ApiPromise }) => any) => itWeb3(name, cb, { only: true });
itWeb3.skip = (name: string, cb: (apis: { web3: Web3, api: ApiPromise }) => any) => itWeb3(name, cb, { skip: true });

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
  return output.map(({ address, event, returnValues }) => {
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

export function compileContract(name: string, src: string) {
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

export async function deployFlipper(web3: Web3 & Web3HttpMarker, deployer: string) {
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
  const Flipper = new web3.eth.Contract(compiled.abi, undefined, {
    data: compiled.object,
    from: deployer,
    ...GAS_ARGS,
  });
  const flipper = await Flipper.deploy({ data: compiled.object }).send({from: deployer});

  return flipper;
}

export async function deployCollector(web3: Web3 & Web3HttpMarker, deployer: string) {
  const compiled = compileContract('Collector', `
    contract Collector {
      uint256 collected;
      function giveMoney() public payable {
        collected += msg.value;
      }
      function getCollected() public view returns (uint256) {
        return collected;
      }
    }
  `);
  const Collector = new web3.eth.Contract(compiled.abi, undefined, {
    data: compiled.object,
    from: deployer,
    ...GAS_ARGS,
  });
  const collector = await Collector.deploy({ data: compiled.object }).send({ from: deployer });

  return collector;
}

export function contractHelpers(web3: Web3, caller: string) {
  return new web3.eth.Contract(contractHelpersAbi as any, '0x842899ECF380553E8a4de75bF534cdf6fBF64049', {from: caller, ...GAS_ARGS});
}

export async function executeEthTxOnSub(api: ApiPromise, from: IKeyringPair, to: any, mkTx: (methods: any) => any, { value = 0 }: {value?: bigint | number} = { }) {
  const tx = api.tx.evm.call(
    subToEth(from.address),
    to.options.address,
    mkTx(to.methods).encodeABI(),
    value,
    GAS_ARGS.gas,
    GAS_ARGS.gasPrice,
    null,
  );
  const events = await submitTransactionAsync(from, tx);
  expect(events.find(({ event: {section, method}})=>section === 'evm' && method === 'Executed')).to.be.not.undefined;
}