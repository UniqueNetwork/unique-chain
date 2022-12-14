// Copyright 2019-2022 Unique Network (Gibraltar) Ltd.
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable function-call-argument-newline */
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="unique.dev.d.ts" />

import {readFile} from 'fs/promises';

import Web3 from 'web3';
import {WebsocketProvider} from 'web3-core';
import {Contract} from 'web3-eth-contract';

import * as solc from 'solc';

import {evmToAddress} from '@polkadot/util-crypto';
import {IKeyringPair} from '@polkadot/types/types';

import {DevUniqueHelper} from '../../../util/playgrounds/unique.dev';

import {ContractImports, CompiledContract, TEthCrossAccount, NormalizedEvent, EthProperty} from './types';

// Native contracts ABI
import collectionHelpersAbi from '../../abi/collectionHelpers.json';
import fungibleAbi from '../../abi/fungible.json';
import fungibleDeprecatedAbi from '../../abi/fungibleDeprecated.json';
import nonFungibleAbi from '../../abi/nonFungible.json';
import nonFungibleDeprecatedAbi from '../../abi/nonFungibleDeprecated.json';
import refungibleAbi from '../../abi/reFungible.json';
import refungibleDeprecatedAbi from '../../abi/reFungibleDeprecated.json';
import refungibleTokenAbi from '../../abi/reFungibleToken.json';
import contractHelpersAbi from '../../abi/contractHelpers.json';
import {ICrossAccountId, TEthereumAccount} from '../../../util/playgrounds/types';
import {TCollectionMode} from '../../../util/playgrounds/types';

class EthGroupBase {
  helper: EthUniqueHelper;

  constructor(helper: EthUniqueHelper) {
    this.helper = helper;
  }
}


class ContractGroup extends EthGroupBase {
  async findImports(imports?: ContractImports[]){
    if(!imports) return function(path: string) {
      return {error: `File not found: ${path}`};
    };

    const knownImports = {} as {[key: string]: string};
    for(const imp of imports) {
      knownImports[imp.solPath] = (await readFile(imp.fsPath)).toString();
    }

    return function(path: string) {
      if(path in knownImports) return {contents: knownImports[path]};
      return {error: `File not found: ${path}`};
    };
  }

  async compile(name: string, src: string, imports?: ContractImports[]): Promise<CompiledContract> {
    const out = JSON.parse(solc.compile(JSON.stringify({
      language: 'Solidity',
      sources: {
        [`${name}.sol`]: {
          content: src,
        },
      },
      settings: {
        outputSelection: {
          '*': {
            '*': ['*'],
          },
        },
      },
    }), {import: await this.findImports(imports)})).contracts[`${name}.sol`][name];

    return {
      abi: out.abi,
      object: '0x' + out.evm.bytecode.object,
    };
  }

  async deployByCode(signer: string, name: string, src: string, imports?: ContractImports[], gas?: number): Promise<Contract> {
    const compiledContract = await this.compile(name, src, imports);
    return this.deployByAbi(signer, compiledContract.abi, compiledContract.object, gas);
  }

  async deployByAbi(signer: string, abi: any, object: string, gas?: number): Promise<Contract> {
    const web3 = this.helper.getWeb3();
    const contract = new web3.eth.Contract(abi, undefined, {
      data: object,
      from: signer,
      gas: gas ?? this.helper.eth.DEFAULT_GAS,
    });
    return await contract.deploy({data: object}).send({from: signer});
  }

}

class NativeContractGroup extends EthGroupBase {

  contractHelpers(caller: string): Contract {
    const web3 = this.helper.getWeb3();
    return new web3.eth.Contract(contractHelpersAbi as any, this.helper.getApi().consts.evmContractHelpers.contractAddress.toString(), {from: caller, gas: this.helper.eth.DEFAULT_GAS});
  }

  collectionHelpers(caller: string) {
    const web3 = this.helper.getWeb3();
    return new web3.eth.Contract(collectionHelpersAbi as any, this.helper.getApi().consts.common.contractAddress.toString(), {from: caller, gas: this.helper.eth.DEFAULT_GAS});
  }

  collection(address: string, mode: TCollectionMode, caller?: string, mergeDeprecated = false): Contract {
    let abi = {
      'nft': nonFungibleAbi,
      'rft': refungibleAbi,
      'ft': fungibleAbi,
    }[mode];
    if (mergeDeprecated) {
      const deprecated = {
        'nft': nonFungibleDeprecatedAbi,
        'rft': refungibleDeprecatedAbi,
        'ft': fungibleDeprecatedAbi,
      }[mode];
      abi = [...abi,...deprecated];
    }
    const web3 = this.helper.getWeb3();
    return new web3.eth.Contract(abi as any, address, {gas: this.helper.eth.DEFAULT_GAS, ...(caller ? {from: caller} : {})});
  }

  collectionById(collectionId: number, mode: 'nft' | 'rft' | 'ft', caller?: string, mergeDeprecated = false): Contract {
    return this.collection(this.helper.ethAddress.fromCollectionId(collectionId), mode, caller, mergeDeprecated);
  }

  rftToken(address: string, caller?: string): Contract {
    const web3 = this.helper.getWeb3();
    return new web3.eth.Contract(refungibleTokenAbi as any, address, {gas: this.helper.eth.DEFAULT_GAS, ...(caller ? {from: caller} : {})});
  }

  rftTokenById(collectionId: number, tokenId: number, caller?: string): Contract {
    return this.rftToken(this.helper.ethAddress.fromTokenId(collectionId, tokenId), caller);
  }
}


class EthGroup extends EthGroupBase {
  DEFAULT_GAS = 2_500_000;

  createAccount() {
    const web3 = this.helper.getWeb3();
    const account = web3.eth.accounts.create();
    web3.eth.accounts.wallet.add(account.privateKey);
    return account.address;
  }

  async createAccountWithBalance(donor: IKeyringPair, amount=100n) {
    const account = this.createAccount();
    await this.transferBalanceFromSubstrate(donor, account, amount);

    return account;
  }

  async transferBalanceFromSubstrate(donor: IKeyringPair, recepient: string, amount=100n, inTokens=true) {
    return await this.helper.balance.transferToSubstrate(donor, evmToAddress(recepient), amount * (inTokens ? this.helper.balance.getOneTokenNominal() : 1n));
  }

  async getCollectionCreationFee(signer: string) {
    const collectionHelper = this.helper.ethNativeContract.collectionHelpers(signer);
    return await collectionHelper.methods.collectionCreationFee().call();
  }

  async sendEVM(signer: IKeyringPair, contractAddress: string, abi: string, value: string, gasLimit?: number) {
    if(!gasLimit) gasLimit = this.DEFAULT_GAS;
    const web3 = this.helper.getWeb3();
    const gasPrice = await web3.eth.getGasPrice();
    // TODO: check execution status
    await this.helper.executeExtrinsic(
      signer,
      'api.tx.evm.call', [this.helper.address.substrateToEth(signer.address), contractAddress, abi, value, gasLimit, gasPrice, null, null, []],
      true,
    );
  }

  async callEVM(signer: TEthereumAccount, contractAddress: string, abi: string) {
    return await this.helper.callRpc('api.rpc.eth.call', [{from: signer, to: contractAddress, data: abi}]);
  }

  createCollectionMethodName(mode: TCollectionMode) {
    switch (mode) {
        case 'ft':
            return 'createFTCollection';
        case 'nft':
            return 'createNFTCollection';
        case 'rft':
            return 'createRFTCollection';
    }
  }

  async createCollection(mode: TCollectionMode, signer: string, name: string, description: string, tokenPrefix: string, decimals: number = 18): Promise<{ collectionId: number, collectionAddress: string, events: NormalizedEvent[] }> {
    const collectionCreationPrice = this.helper.balance.getCollectionCreationPrice();
    const collectionHelper = this.helper.ethNativeContract.collectionHelpers(signer);
    const functionName: string = this.createCollectionMethodName(mode);

    const functionParams = functionName === 'createFTCollection' ? [name, decimals, description, tokenPrefix] : [name, description, tokenPrefix];
    const result = await collectionHelper.methods[functionName](...functionParams).send({value: Number(collectionCreationPrice)});

    const collectionAddress = this.helper.ethAddress.normalizeAddress(result.events.CollectionCreated.returnValues.collectionId);
    const collectionId = this.helper.ethAddress.extractCollectionId(collectionAddress);
    const events = this.helper.eth.normalizeEvents(result.events);

    return {collectionId, collectionAddress, events};
  }

  createNFTCollection(signer: string, name: string, description: string, tokenPrefix: string): Promise<{ collectionId: number, collectionAddress: string, events: NormalizedEvent[] }> {
    return this.createCollection('nft', signer, name, description, tokenPrefix);
  }

  async createERC721MetadataCompatibleNFTCollection(signer: string, name: string, description: string, tokenPrefix: string, baseUri: string): Promise<{collectionId: number, collectionAddress: string, events: NormalizedEvent[] }> {
    const collectionHelper = this.helper.ethNativeContract.collectionHelpers(signer);

    const {collectionId, collectionAddress, events} = await this.createCollection('nft', signer, name, description, tokenPrefix);

    await collectionHelper.methods.makeCollectionERC721MetadataCompatible(collectionAddress, baseUri).send();

    return {collectionId, collectionAddress, events};
  }

  createRFTCollection(signer: string, name: string, description: string, tokenPrefix: string): Promise<{collectionId: number, collectionAddress: string, events: NormalizedEvent[]}> {
    return this.createCollection('rft', signer, name, description, tokenPrefix);
  }

  createFungibleCollection(signer: string, name: string, decimals: number, description: string, tokenPrefix: string): Promise<{ collectionId: number, collectionAddress: string, events: NormalizedEvent[]}> {
    return this.createCollecion('createFTCollection', signer, name, description, tokenPrefix, decimals);
  }

  async createERC721MetadataCompatibleRFTCollection(signer: string, name: string, description: string, tokenPrefix: string, baseUri: string): Promise<{collectionId: number, collectionAddress: string, events: NormalizedEvent[] }> {
    const collectionHelper = this.helper.ethNativeContract.collectionHelpers(signer);

    const {collectionId, collectionAddress, events} = await this.createCollection('rft', signer, name, description, tokenPrefix);

    await collectionHelper.methods.makeCollectionERC721MetadataCompatible(collectionAddress, baseUri).send();

    return {collectionId, collectionAddress, events};
  }

  async deployCollectorContract(signer: string): Promise<Contract> {
    return await this.helper.ethContract.deployByCode(signer, 'Collector', `
    // SPDX-License-Identifier: UNLICENSED
    pragma solidity ^0.8.6;

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
  }

  async deployFlipper(signer: string): Promise<Contract> {
    return await this.helper.ethContract.deployByCode(signer, 'Flipper', `
    // SPDX-License-Identifier: UNLICENSED
    pragma solidity ^0.8.6;

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
  }

  async recordCallFee(user: string, call: () => Promise<any>): Promise<bigint> {
    const before = await this.helper.balance.getEthereum(user);
    await call();
    // In dev mode, the transaction might not finish processing in time
    await this.helper.wait.newBlocks(1);
    const after = await this.helper.balance.getEthereum(user);

    return before - after;
  }

  normalizeEvents(events: any): NormalizedEvent[] {
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

  async calculateFee(address: ICrossAccountId, code: () => Promise<any>): Promise<bigint> {
    const wrappedCode = async () => {
      await code();
      // In dev mode, the transaction might not finish processing in time
      await this.helper.wait.newBlocks(1);
    };
    return await this.helper.arrange.calculcateFee(address, wrappedCode);
  }
}

class EthAddressGroup extends EthGroupBase {
  extractCollectionId(address: string): number {
    if (!(address.length === 42 || address.length === 40)) throw new Error('address wrong format');
    return parseInt(address.substr(address.length - 8), 16);
  }

  fromCollectionId(collectionId: number): string {
    if (collectionId >= 0xffffffff || collectionId < 0) throw new Error('collectionId overflow');
    return Web3.utils.toChecksumAddress(`0x17c4e6453cc49aaaaeaca894e6d9683e${collectionId.toString(16).padStart(8, '0')}`);
  }

  extractTokenId(address: string): {collectionId: number, tokenId: number} {
    if (!address.startsWith('0x'))
      throw 'address not starts with "0x"';
    if (address.length > 42)
      throw 'address length is more than 20 bytes';
    return {
      collectionId: Number('0x' + address.substring(address.length - 16, address.length - 8)),
      tokenId: Number('0x' + address.substring(address.length - 8)),
    };
  }

  fromTokenId(collectionId: number, tokenId: number): string  {
    return this.helper.util.getTokenAddress({collectionId, tokenId});
  }

  normalizeAddress(address: string): string {
    return '0x' + address.substring(address.length - 40);
  }
}
export class EthPropertyGroup extends EthGroupBase {
  property(key: string, value: string): EthProperty {
    return [
      key,
      '0x'+Buffer.from(value).toString('hex'),
    ];
  }
}
export type EthUniqueHelperConstructor = new (...args: any[]) => EthUniqueHelper;

export class EthCrossAccountGroup extends EthGroupBase {
  createAccount(): TEthCrossAccount {
    return this.fromAddress(this.helper.eth.createAccount());
  }

  async createAccountWithBalance(donor: IKeyringPair, amount=100n) {
    return this.fromAddress(await this.helper.eth.createAccountWithBalance(donor, amount));
  }

  fromAddress(address: TEthereumAccount): TEthCrossAccount {
    return {
      eth: address,
      sub: '0',
    };
  }

  fromKeyringPair(keyring: IKeyringPair): TEthCrossAccount {
    return {
      eth: '0x0000000000000000000000000000000000000000',
      sub: keyring.addressRaw,
    };
  }
}

export class EthUniqueHelper extends DevUniqueHelper {
  web3: Web3 | null = null;
  web3Provider: WebsocketProvider | null = null;

  eth: EthGroup;
  ethAddress: EthAddressGroup;
  ethCrossAccount: EthCrossAccountGroup;
  ethNativeContract: NativeContractGroup;
  ethContract: ContractGroup;
  ethProperty: EthPropertyGroup;

  constructor(logger: { log: (msg: any, level: any) => void, level: any }, options: {[key: string]: any} = {}) {
    options.helperBase = options.helperBase ?? EthUniqueHelper;

    super(logger, options);
    this.eth = new EthGroup(this);
    this.ethAddress = new EthAddressGroup(this);
    this.ethCrossAccount = new EthCrossAccountGroup(this);
    this.ethNativeContract = new NativeContractGroup(this);
    this.ethContract = new ContractGroup(this);
    this.ethProperty = new EthPropertyGroup(this);
  }

  getWeb3(): Web3 {
    if(this.web3 === null) throw Error('Web3 not connected');
    return this.web3;
  }

  connectWeb3(wsEndpoint: string) {
    if(this.web3 !== null) return;
    this.web3Provider = new Web3.providers.WebsocketProvider(wsEndpoint);
    this.web3 = new Web3(this.web3Provider);
  }

  async disconnect() {
    if(this.web3 === null) return;
    this.web3Provider?.connection.close();

    await super.disconnect();
  }

  clearApi() {
    super.clearApi();
    this.web3 = null;
  }

  clone(helperCls: EthUniqueHelperConstructor, options?: { [key: string]: any; }): EthUniqueHelper {
    const newHelper = super.clone(helperCls, options) as EthUniqueHelper;
    newHelper.web3 = this.web3;
    newHelper.web3Provider = this.web3Provider;

    return newHelper;
  }
}
