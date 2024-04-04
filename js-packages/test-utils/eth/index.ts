// Copyright 2019-2022 Unique Network (Gibraltar) Ltd.
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable function-call-argument-newline */

import {readFile} from 'fs/promises';

import * as web3 from 'web3';
import {WebsocketProvider} from 'web3-core';
import {Contract} from 'web3-eth-contract';

// @ts-ignore
import solc from 'solc';

import {evmToAddress} from '@polkadot/util-crypto';
import type {IKeyringPair} from '@polkadot/types/types';

import {ArrangeGroup, DevUniqueHelper} from '@unique/test-utils/index.js';

import type {ContractImports, CompiledContract, CrossAddress, NormalizedEvent, EthProperty} from './types.js';
import {CollectionMode, CreateCollectionData} from './types.js';

// Native contracts ABI
import collectionHelpersAbi from '@unique-nft/evm-abi/abi/collectionHelpers.json' assert {type: 'json'};
import nativeFungibleAbi from '@unique-nft/evm-abi/abi/nativeFungible.json' assert {type: 'json'};
import fungibleAbi from '@unique-nft/evm-abi/abi/fungible.json' assert {type: 'json'};
import fungibleDeprecatedAbi from '@unique-nft/evm-abi/abi/fungibleDeprecated.json' assert {type: 'json'};
import nonFungibleAbi from '@unique-nft/evm-abi/abi/nonFungible.json' assert {type: 'json'};
import nonFungibleDeprecatedAbi from '@unique-nft/evm-abi/abi/nonFungibleDeprecated.json' assert {type: 'json'};
import refungibleAbi from '@unique-nft/evm-abi/abi/reFungible.json' assert {type: 'json'};
import refungibleDeprecatedAbi from '@unique-nft/evm-abi/abi/reFungibleDeprecated.json' assert {type: 'json'};
import refungibleTokenAbi from '@unique-nft/evm-abi/abi/reFungibleToken.json' assert {type: 'json'};
import refungibleTokenDeprecatedAbi from '@unique-nft/evm-abi/abi/reFungibleTokenDeprecated.json' assert {type: 'json'};
import contractHelpersAbi from '@unique-nft/evm-abi/abi/contractHelpers.json' assert {type: 'json'};
import type {ICrossAccountId, TEthereumAccount, TCollectionMode} from '@unique-nft/playgrounds/types.js';

class EthGroupBase {
  helper: EthUniqueHelper;
  gasPrice?: string;

  constructor(helper: EthUniqueHelper) {
    this.helper = helper;
  }
  async getGasPrice() {
    if(this.gasPrice)
      return this.gasPrice;
    this.gasPrice = await this.helper.getWeb3().eth.getGasPrice();
    return this.gasPrice;
  }
}

class ContractGroup extends EthGroupBase {
  async findImports(imports?: ContractImports[]) {
    if(!imports) return function(path: string) {
      return {error: `File not found: ${path}`};
    };

    const knownImports = {} as { [key: string]: string };
    for(const imp of imports) {
      knownImports[imp.solPath] = (await readFile(imp.fsPath)).toString();
    }

    return function(path: string) {
      if(path in knownImports) return {contents: knownImports[path]};
      return {error: `File not found: ${path}`};
    };
  }

  async compile(name: string, src: string, imports?: ContractImports[]): Promise<CompiledContract> {
    const compiled = JSON.parse(solc.compile(JSON.stringify({
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
    }), {import: await this.findImports(imports)}));

    const hasErrors = compiled['errors']
      && compiled['errors'].length > 0
      && compiled.errors.some(function(err: any) {
        return err.severity == 'error';
      });

    if(hasErrors) {
      throw compiled.errors;
    }
    const out = compiled.contracts[`${name}.sol`][name];

    return {
      abi: out.abi,
      object: '0x' + out.evm.bytecode.object,
    };
  }

  async deployByCode(signer: string, name: string, src: string, imports?: ContractImports[], gas?: number, args?: any[]): Promise<Contract> {
    const compiledContract = await this.compile(name, src, imports);
    return this.deployByAbi(signer, compiledContract.abi, compiledContract.object, gas, args);
  }

  async deployByAbi(signer: string, abi: any, object: string, gas?: number, args?: any[]): Promise<Contract> {
    const web3 = this.helper.getWeb3();
    const contract = new web3.eth.Contract(abi, undefined, {
      data: object,
      from: signer,
      gas: gas ?? this.helper.eth.DEFAULT_GAS,
    });
    return await contract.deploy({data: object, arguments: args}).send({from: signer});
  }

}

class NativeContractGroup extends EthGroupBase {

  contractHelpers(caller: string) {
    const web3 = this.helper.getWeb3();
    return new web3.eth.Contract(contractHelpersAbi as any, this.helper.getApi().consts.evmContractHelpers.contractAddress.toString(), {
      from: caller,
      gas: this.helper.eth.DEFAULT_GAS,
    });
  }

  collectionHelpers(caller: string) {
    const web3 = this.helper.getWeb3();
    return new web3.eth.Contract(collectionHelpersAbi as any, this.helper.getApi().consts.common.contractAddress.toString(), {
      from: caller,
      gas: this.helper.eth.DEFAULT_GAS,
    });
  }

  collection(address: string, mode: TCollectionMode, caller?: string, mergeDeprecated = false) {
    let abi;
    if(address === this.helper.ethAddress.fromCollectionId(0)) {
      abi = nativeFungibleAbi;
    } else {
      abi ={
        'nft': nonFungibleAbi,
        'rft': refungibleAbi,
        'ft': fungibleAbi,
      }[mode];
    }
    if(mergeDeprecated) {
      const deprecated = {
        'nft': nonFungibleDeprecatedAbi,
        'rft': refungibleDeprecatedAbi,
        'ft': fungibleDeprecatedAbi,
      }[mode];
      abi = [...abi, ...deprecated];
    }
    const web3 = this.helper.getWeb3();
    return new web3.eth.Contract(abi as any, address, {
      gas: this.helper.eth.DEFAULT_GAS,
      ...(caller ? {from: caller} : {}),
    });
  }

  collectionById(collectionId: number, mode: 'nft' | 'rft' | 'ft', caller?: string, mergeDeprecated = false) {
    return this.collection(this.helper.ethAddress.fromCollectionId(collectionId), mode, caller, mergeDeprecated);
  }

  rftToken(address: string, caller?: string, mergeDeprecated = false) {
    const web3 = this.helper.getWeb3();
    const abi = mergeDeprecated ? [...refungibleTokenAbi, ...refungibleTokenDeprecatedAbi] : refungibleTokenAbi;
    return new web3.eth.Contract(abi as any, address, {
      gas: this.helper.eth.DEFAULT_GAS,
      ...(caller ? {from: caller} : {}),
    });
  }

  rftTokenById(collectionId: number, tokenId: number, caller?: string, mergeDeprecated = false) {
    return this.rftToken(this.helper.ethAddress.fromTokenId(collectionId, tokenId), caller, mergeDeprecated);
  }
}

class CreateCollectionTransaction {
  signer: string;
  data: CreateCollectionData;
  mergeDeprecated: boolean;
  helper: EthUniqueHelper;

  constructor(helper: EthUniqueHelper, signer: string, data: CreateCollectionData, mergeDeprecated = false) {
    this.helper = helper;
    this.signer = signer;

    let flags = 0;
    // convert CollectionFlags to number and join them in one number
    if(!data.flags) {
      flags = 0;
    } else if(typeof data.flags == 'number') {
      flags = data.flags;
    } else {
      for(let i = 0; i < data.flags.length; i++){
        const flag = data.flags[i];
        flags = flags | flag;
      }
    }
    data.flags = flags;

    this.data = data;
    this.mergeDeprecated = mergeDeprecated;
  }

  // eslint-disable-next-line require-await
  private async createTransaction() {
    const collectionHelper = this.helper.ethNativeContract.collectionHelpers(this.signer);
    let collectionMode;
    switch (this.data.collectionMode) {
      case 'nft': collectionMode = CollectionMode.Nonfungible; break;
      case 'rft': collectionMode = CollectionMode.Refungible; break;
      case 'ft': collectionMode = CollectionMode.Fungible; break;
    }

    const tx = collectionHelper.methods.createCollection([
      this.data.name,
      this.data.description,
      this.data.tokenPrefix,
      collectionMode,
      this.data.decimals,
      this.data.properties,
      this.data.tokenPropertyPermissions,
      this.data.adminList,
      this.data.nestingSettings,
      this.data.limits,
      this.data.pendingSponsor,
      this.data.flags,
    ]);
    return tx;
  }

  async send(options?: any): Promise<{ collectionId: number, collectionAddress: string, events: NormalizedEvent[], collection: Contract }> {
    const collectionCreationPrice = {
      value: Number(this.helper.balance.getCollectionCreationPrice()),
    };
    const tx = await this.createTransaction();
    const result = await tx.send({...options, ...collectionCreationPrice});

    const collectionAddress = this.helper.ethAddress.normalizeAddress(result.events.CollectionCreated.returnValues.collectionId);
    const collectionId = this.helper.ethAddress.extractCollectionId(collectionAddress);
    const events = this.helper.eth.normalizeEvents(result.events);
    const collection = await this.helper.ethNativeContract.collectionById(collectionId, this.data.collectionMode, this.signer, this.mergeDeprecated);

    return {collectionId, collectionAddress, events, collection};
  }

  async call(options?: any) {
    const collectionCreationPrice = {
      value: Number(this.helper.balance.getCollectionCreationPrice()),
    };
    const tx = await this.createTransaction();

    return await tx.call({...options, ...collectionCreationPrice});
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

  async createAccountWithBalance(donor: IKeyringPair, amount = 600n) {
    const account = this.createAccount();
    await this.transferBalanceFromSubstrate(donor, account, amount);

    return account;
  }

  async transferBalanceFromSubstrate(donor: IKeyringPair, recepient: string, amount = 100n, inTokens = true) {
    return await this.helper.balance.transferToSubstrate(donor, evmToAddress(recepient), amount * (inTokens ? this.helper.balance.getOneTokenNominal() : 1n));
  }

  async getCollectionCreationFee(signer: string) {
    const collectionHelper = await this.helper.ethNativeContract.collectionHelpers(signer);
    return await collectionHelper.methods.collectionCreationFee().call();
  }

  async sendEVM(signer: IKeyringPair, contractAddress: string, abi: string, value: string, gasLimit?: number) {
    if(!gasLimit) gasLimit = this.DEFAULT_GAS;
    const web3 = this.helper.getWeb3();
    // FIXME: can't send legacy transaction using tx.evm.call
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

  createCollection(signer: string, data: CreateCollectionData, mergeDeprecated = false): CreateCollectionTransaction {
    return new CreateCollectionTransaction(this.helper, signer, data, mergeDeprecated);
  }

  createNFTCollection(signer: string, name: string, description: string, tokenPrefix: string): Promise<{ collectionId: number, collectionAddress: string, events: NormalizedEvent[] }> {
    return this.createCollection(signer, new CreateCollectionData(name, description, tokenPrefix, 'nft')).send();
  }

  async createERC721MetadataCompatibleCollection(signer: string, data: CreateCollectionData, baseUri: string): Promise<{ collectionId: number, collectionAddress: string, events: NormalizedEvent[] }> {
    const collectionHelper = await this.helper.ethNativeContract.collectionHelpers(signer);

    const {collectionId, collectionAddress, events} = await this.createCollection(signer, data).send();

    await collectionHelper.methods.makeCollectionERC721MetadataCompatible(collectionAddress, baseUri).send();

    return {collectionId, collectionAddress, events};
  }

  async createERC721MetadataCompatibleNFTCollection(signer: string, name: string, description: string, tokenPrefix: string, baseUri: string): Promise<{ collectionId: number, collectionAddress: string, events: NormalizedEvent[] }> {
    const collectionHelper = await this.helper.ethNativeContract.collectionHelpers(signer);

    const {collectionId, collectionAddress, events} = await this.createCollection(signer, new CreateCollectionData(name, description, tokenPrefix, 'nft')).send();

    await collectionHelper.methods.makeCollectionERC721MetadataCompatible(collectionAddress, baseUri).send();

    return {collectionId, collectionAddress, events};
  }

  createRFTCollection(signer: string, name: string, description: string, tokenPrefix: string): Promise<{ collectionId: number, collectionAddress: string, events: NormalizedEvent[] }> {
    return this.createCollection(signer, new CreateCollectionData(name, description, tokenPrefix, 'rft')).send();
  }

  createFungibleCollection(signer: string, name: string, _decimals: number, description: string, tokenPrefix: string): Promise<{ collectionId: number, collectionAddress: string, events: NormalizedEvent[] }> {
    return this.createCollection(signer, new CreateCollectionData(name, description, tokenPrefix, 'ft')).send();
  }

  async createERC721MetadataCompatibleRFTCollection(signer: string, name: string, description: string, tokenPrefix: string, baseUri: string): Promise<{ collectionId: number, collectionAddress: string, events: NormalizedEvent[] }> {
    const collectionHelper = await this.helper.ethNativeContract.collectionHelpers(signer);

    const {collectionId, collectionAddress, events} = await this.createCollection(signer, new CreateCollectionData(name, description, tokenPrefix, 'rft')).send();

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
    for(const key of Object.keys(events)) {
      if(key.match(/^[0-9]+$/)) {
        output.push(events[key]);
      } else if(Array.isArray(events[key])) {
        output.push(...events[key]);
      } else {
        output.push(events[key]);
      }
    }
    output.sort((a, b) => a.logIndex - b.logIndex);
    return output.map(({address, event, returnValues}) => {
      const args: { [key: string]: string } = {};
      for(const key of Object.keys(returnValues)) {
        if(!key.match(/^[0-9]+$/)) {
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
    if(!(address.length === 42 || address.length === 40)) throw new Error('address wrong format');
    return parseInt(address.slice(address.length - 8), 16);
  }

  fromCollectionId(collectionId: number): string {
    if(collectionId >= 0xffffffff || collectionId < 0) throw new Error('collectionId overflow');
    return web3.default.utils.toChecksumAddress(`0x17c4e6453cc49aaaaeaca894e6d9683e${collectionId.toString(16).padStart(8, '0')}`);
  }

  extractTokenId(address: string): { collectionId: number, tokenId: number } {
    if(!address.startsWith('0x'))
      throw 'address not starts with "0x"';
    if(address.length > 42)
      throw 'address length is more than 20 bytes';
    return {
      collectionId: Number('0x' + address.substring(address.length - 16, address.length - 8)),
      tokenId: Number('0x' + address.substring(address.length - 8)),
    };
  }

  fromTokenId(collectionId: number, tokenId: number): string {
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
      '0x' + Buffer.from(value).toString('hex'),
    ];
  }
}
export type EthUniqueHelperConstructor = new (...args: any[]) => EthUniqueHelper;

export class EthCrossAccountGroup extends EthGroupBase {
  createAccount(): CrossAddress {
    return this.fromAddress(this.helper.eth.createAccount());
  }

  async createAccountWithBalance(donor: IKeyringPair, amount = 100n) {
    return this.fromAddress(await this.helper.eth.createAccountWithBalance(donor, amount));
  }

  fromAddress(address: TEthereumAccount): CrossAddress {
    return {
      eth: address,
      sub: '0',
    };
  }

  fromAddr(address: TEthereumAccount): [string, string] {
    return [
      address,
      '0',
    ];
  }

  fromKeyringPair(keyring: IKeyringPair): CrossAddress {
    return {
      eth: '0x0000000000000000000000000000000000000000',
      sub: keyring.addressRaw,
    };
  }
}

export class FeeGas {
  fee: number | bigint = 0n;

  gas: number | bigint = 0n;

  public static async build(helper: EthUniqueHelper, fee: bigint): Promise<FeeGas> {
    const instance = new FeeGas();
    instance.fee = instance.convertToTokens(fee);
    instance.gas = await instance.convertToGas(fee, helper);
    return instance;
  }

  private async convertToGas(fee: bigint, helper: EthUniqueHelper): Promise<bigint> {
    const gasPrice = BigInt(await helper.getWeb3().eth.getGasPrice());
    return fee / gasPrice;
  }

  private convertToTokens(value: bigint, nominal = 1_000_000_000_000_000_000n): number {
    return Number((value * 1000n) / nominal) / 1000;
  }
}

class EthArrangeGroup extends ArrangeGroup {
  declare helper: EthUniqueHelper;

  constructor(helper: EthUniqueHelper) {
    super(helper);
    this.helper = helper;
  }

  async calculcateFeeGas(payer: ICrossAccountId, promise: () => Promise<any>): Promise<FeeGas> {
    const fee = await this.calculcateFee(payer, promise);
    return await FeeGas.build(this.helper, fee);
  }
}
export class EthUniqueHelper extends DevUniqueHelper {
  web3: web3.default | null = null;
  web3Provider: WebsocketProvider | null = null;

  eth: EthGroup;
  ethAddress: EthAddressGroup;
  ethCrossAccount: EthCrossAccountGroup;
  ethNativeContract: NativeContractGroup;
  ethContract: ContractGroup;
  ethProperty: EthPropertyGroup;
  declare arrange: EthArrangeGroup;
  constructor(logger: { log: (msg: any, level: any) => void, level: any }, options: { [key: string]: any } = {}) {
    options.helperBase = options.helperBase ?? EthUniqueHelper;

    super(logger, options);
    this.eth = new EthGroup(this);
    this.ethAddress = new EthAddressGroup(this);
    this.ethCrossAccount = new EthCrossAccountGroup(this);
    this.ethNativeContract = new NativeContractGroup(this);
    this.ethContract = new ContractGroup(this);
    this.ethProperty = new EthPropertyGroup(this);
    this.arrange = new EthArrangeGroup(this);
    super.arrange = this.arrange;
  }

  getWeb3(): web3.default {
    if(this.web3 === null) throw Error('Web3 not connected');
    return this.web3;
  }

  connectWeb3(wsEndpoint: string) {
    if(this.web3 !== null) return;
    this.web3Provider = new web3.default.providers.WebsocketProvider(wsEndpoint);
    this.web3 = new web3.default(this.web3Provider);
  }

  override async disconnect() {
    if(this.web3 === null) return;
    this.web3Provider?.connection.close();

    await super.disconnect();
  }

  override clearApi() {
    super.clearApi();
    this.web3 = null;
  }

  override clone(helperCls: EthUniqueHelperConstructor, options?: { [key: string]: any; }): EthUniqueHelper {
    const newHelper = super.clone(helperCls, options) as EthUniqueHelper;
    newHelper.web3 = this.web3;
    newHelper.web3Provider = this.web3Provider;

    return newHelper;
  }
}
