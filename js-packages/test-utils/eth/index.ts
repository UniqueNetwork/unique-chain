// Copyright 2019-2022 Unique Network (Gibraltar) Ltd.
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable function-call-argument-newline */

import {readFile} from 'fs/promises';

import {ContractTransactionReceipt, ethers, EventLog, getAddress, HDNodeWallet, Log, Wallet, WebSocketProvider} from 'ethers'

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
import type {ICrossAccountId, TCollectionMode} from '@unique-nft/playgrounds/types.js';
import { Contract } from 'ethers';
import { waitParams } from './util.js';
import { eth } from '@polkadot/types/interfaces/definitions';

class EthGroupBase {
  helper: EthUniqueHelper;
  gasPrice?: bigint;

  constructor(helper: EthUniqueHelper) {
    this.helper = helper;
  }
  async getGasPrice(): Promise<bigint> {
    if(this.gasPrice) return this.gasPrice;
    this.gasPrice = await this.helper.getGasPrice();
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
      bytecode: '0x' + out.evm.bytecode.object,
    };
  }

  async deployByCode(signer: HDNodeWallet, name: string, src: string, imports?: ContractImports[], gasLimit?: BigInt, args?: any[]): Promise<Contract> {
    const compiledContract = await this.compile(name, src, imports);
    return await this.deployByAbi(signer, compiledContract.abi, compiledContract.bytecode, gasLimit, args);
  }

  async deployByAbi(signer: HDNodeWallet, abi: any, bytecode: string, gasLimit?: BigInt, args?: any[]): Promise<Contract> {
    const contractFactory = new ethers.ContractFactory(abi, bytecode, signer);
    
    const contract = await contractFactory.deploy(...(args || []), {
      gasLimit: gasLimit ?? this.helper.eth.DEFAULT_GAS_LIMIT
    });

    const deployTx = contract.deploymentTransaction()!;
    await deployTx.wait(...waitParams);

    return new Contract(contract.target, contract.interface, contract.runner);
  }
}

class NativeContractGroup extends EthGroupBase {
  contractHelpers(signer: HDNodeWallet): Contract {
    const address = this.helper.getApi().consts.evmContractHelpers.contractAddress.toString();
    return new Contract(address, contractHelpersAbi, signer);
  }

  collectionHelpers(signer: HDNodeWallet): Contract {
    const address = this.helper.getApi().consts.common.contractAddress.toString();
    return new Contract(address, collectionHelpersAbi, signer);
  }

  collection(address: string, mode: TCollectionMode, signer?: HDNodeWallet, mergeDeprecated = false): Contract {
    let abi;
    if(address === this.helper.ethAddress.fromCollectionId(0)) {
      abi = nativeFungibleAbi;
    } else {
      abi = {
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
    return new Contract(address, abi, signer);
  }

  collectionById(collectionId: number, mode: 'nft' | 'rft' | 'ft', signer?: HDNodeWallet, mergeDeprecated = false) {
    return this.collection(this.helper.ethAddress.fromCollectionId(collectionId), mode, signer, mergeDeprecated);
  }

  rftToken(address: string, signer?: HDNodeWallet, mergeDeprecated = false) {
    const abi = mergeDeprecated ? [...refungibleTokenAbi, ...refungibleTokenDeprecatedAbi] : refungibleTokenAbi;
    return new Contract(address, abi, signer);
  }

  rftTokenById(collectionId: number, tokenId: number, signer?: HDNodeWallet, mergeDeprecated = false) {
    return this.rftToken(this.helper.ethAddress.fromTokenId(collectionId, tokenId), signer, mergeDeprecated);
  }
}

interface CreateCollectionResult {
  collection: Contract,
  collectionId: number,
  collectionAddress: string,
  events: { [key: string]: NormalizedEvent },
}

class CreateCollectionTransaction {
  signer: HDNodeWallet;
  data: CreateCollectionData;
  mergeDeprecated: boolean;
  helper: EthUniqueHelper;

  constructor(helper: EthUniqueHelper, signer: HDNodeWallet, data: CreateCollectionData, mergeDeprecated = false) {
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

  async send(options?: any): Promise<CreateCollectionResult> {
    const receipt = await this.createCollection(
      this.helper.balance.getCollectionCreationPrice(),
      options
    );

    const events = this.helper.eth.normalizeEvents(receipt);

    const collectionAddress = this.helper.ethAddress.normalizeAddress(events.CollectionCreated.args.collectionId);
    const collectionId = this.helper.ethAddress.extractCollectionId(collectionAddress);
    const collection = await this.helper.ethNativeContract.collectionById(collectionId, this.data.collectionMode, this.signer, this.mergeDeprecated);

    return {collection, collectionId, collectionAddress, events};
  }
  
  private async createCollection(value: BigInt, options?: any) {
    const collectionHelper = this.helper.ethNativeContract.collectionHelpers(this.signer);

    let collectionMode;
    switch (this.data.collectionMode) {
      case 'nft': collectionMode = CollectionMode.Nonfungible; break;
      case 'rft': collectionMode = CollectionMode.Refungible; break;
      case 'ft': collectionMode = CollectionMode.Fungible; break;
    }

    const response = await collectionHelper.createCollection.send(
      [
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
        this.data.flags
      ],
      { ...options, value: value.toString() }
    );

    const receipt = await response.wait(...waitParams);

    return receipt!;
  }
}

class EthGroup extends EthGroupBase {
  DEFAULT_GAS_LIMIT = 2_500_000n;

  createAccount(): HDNodeWallet {
    const web3 = this.helper.getWeb3();
    const wallet = Wallet.createRandom(web3);
    return wallet;
  }

  async createAccountWithBalance(donor: IKeyringPair, amount = 600n): Promise<ethers.HDNodeWallet> {
    const account = this.createAccount();
    await this.transferBalanceFromSubstrate(donor, account.address, amount);
    return account;
  }

  async transferBalanceFromSubstrate(donor: IKeyringPair, recepient: string, amount = 100n, inTokens = true) {
    return await this.helper.balance.transferToSubstrate(donor, evmToAddress(recepient), amount * (inTokens ? this.helper.balance.getOneTokenNominal() : 1n));
  }

  async getCollectionCreationFee(signer: HDNodeWallet) {
    const collectionHelper = await this.helper.ethNativeContract.collectionHelpers(signer);
    return await collectionHelper.collectionCreationFee();
  }

  async sendEVM(signer: IKeyringPair, contractAddress: string, abi: string, value: string, gasLimit?: number) {
    if(!gasLimit) gasLimit = Number(this.DEFAULT_GAS_LIMIT);

    const gasPrice = await this.helper.getGasPrice();
   
    // FIXME: can't send legacy transaction using tx.evm.call
    // TODO: check execution status
    await this.helper.executeExtrinsic(
      signer,
      'api.tx.evm.call', [this.helper.address.substrateToEth(signer.address), contractAddress, abi, value, gasLimit, gasPrice, null, null, []],
      true,
    );
  }

  async callEVM(signer: HDNodeWallet, contractAddress: string, abi: string) {
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

  createCollection(signer: HDNodeWallet, data: CreateCollectionData, mergeDeprecated = false): CreateCollectionTransaction {
    return new CreateCollectionTransaction(this.helper, signer, data, mergeDeprecated);
  }

  createNFTCollection(signer: HDNodeWallet, name: string, description: string, tokenPrefix: string): Promise<CreateCollectionResult> {
    return this.createCollection(signer, new CreateCollectionData(name, description, tokenPrefix, 'nft')).send();
  }

  async createERC721MetadataCompatibleCollection(signer: HDNodeWallet, data: CreateCollectionData, baseUri: string): Promise<CreateCollectionResult> {
    const collectionHelper = await this.helper.ethNativeContract.collectionHelpers(signer);

    const createCollectionResult = await this.createCollection(signer, data).send();

    const tx = await collectionHelper.makeCollectionERC721MetadataCompatible.send(createCollectionResult.collectionAddress, baseUri);
    await tx.wait(...waitParams);

    return createCollectionResult;
  }

  async createERC721MetadataCompatibleNFTCollection(signer: HDNodeWallet, name: string, description: string, tokenPrefix: string, baseUri: string): Promise<CreateCollectionResult> {
    const collectionHelper = await this.helper.ethNativeContract.collectionHelpers(signer);

    const collectionData = new CreateCollectionData(name, description, tokenPrefix, 'nft');
    const createCollectionResult = await this.createCollection(signer, collectionData).send();

    const tx = await collectionHelper.makeCollectionERC721MetadataCompatible.send(createCollectionResult.collectionAddress, baseUri);
    await tx.wait(...waitParams);

    return createCollectionResult;
  }

  createRFTCollection(signer: HDNodeWallet, name: string, description: string, tokenPrefix: string): Promise<CreateCollectionResult> {
    return this.createCollection(signer, new CreateCollectionData(name, description, tokenPrefix, 'rft')).send();
  }

  createFungibleCollection(signer: HDNodeWallet, name: string, _decimals: number, description: string, tokenPrefix: string): Promise<CreateCollectionResult> {
    return this.createCollection(signer, new CreateCollectionData(name, description, tokenPrefix, 'ft')).send();
  }

  async createERC721MetadataCompatibleRFTCollection(signer: HDNodeWallet, name: string, description: string, tokenPrefix: string, baseUri: string): Promise<CreateCollectionResult> {
    const collectionHelper = await this.helper.ethNativeContract.collectionHelpers(signer);

    const collectionData = new CreateCollectionData(name, description, tokenPrefix, 'rft');
    const createCollectionResult = await this.createCollection(signer, collectionData).send();

    const tx = await collectionHelper.makeCollectionERC721MetadataCompatible.send(createCollectionResult.collectionAddress, baseUri);
    await tx.wait(...waitParams);
    
    return createCollectionResult;
  }

  async deployCollectorContract(signer: HDNodeWallet): Promise<Contract> {
    return await this.helper.ethContract.deployByCode(
      signer,
      'Collector',
      `
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
      `
    );
  }

  async deployFlipper(signer: HDNodeWallet): Promise<Contract> {
    return await this.helper.ethContract.deployByCode(
      signer,
      'Flipper',
      `
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
      `
    );
  }

  async recordCallFee(user: string, call: () => Promise<any>): Promise<bigint> {
    const before = await this.helper.balance.getEthereum(user);
    await call();
    // In dev mode, the transaction might not finish processing in time
    await this.helper.wait.newBlocks(1);
    const after = await this.helper.balance.getEthereum(user);

    return before - after;
  }

  rebuildEvents(receipt: ContractTransactionReceipt): NormalizedEvent[] {
    const events: NormalizedEvent[] = [];

    const logs = receipt.logs;
    for(const log of logs) {
      const normalized = this.rebuildLog(log);

      if(!normalized) continue;
      
      events.push(normalized);
    }

    return events;
  }

  normalizeEvents(receipt: ContractTransactionReceipt): {[key: string]: NormalizedEvent} {
    const events: {[key: string]: NormalizedEvent} = {};

    const logs = receipt.logs;
    for(const log of logs) {
      const normalized = this.rebuildLog(log);
      
      if(!normalized) continue;
      
      if(normalized.event in events) continue;

      events[normalized.event] = normalized;
    }

    return events;
  }

  rebuildLog(log: EventLog | Log): NormalizedEvent | undefined {
    if(!(log instanceof EventLog)) return undefined;

    let args: {[key: string]: string} = {}
    for(let i = 0; i < log.args.length; i += 1) {
      const argName = log.fragment.inputs[i].name;
      const argValue = log.args[i];
      args[argName] = argValue.toString();
    }

    return {
      event: log.eventName,
      address: log.address,
      args,
    };
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
    return getAddress(`0x17c4e6453cc49aaaaeaca894e6d9683e${collectionId.toString(16).padStart(8, '0')}`);
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
    return this.fromAddress(this.helper.eth.createAccount().address);
  }

  async createAccountWithBalance(donor: IKeyringPair, amount = 100n) {
    return this.fromAddress((await this.helper.eth.createAccountWithBalance(donor, amount)).address);
  }

  fromAddress(eth: string | HDNodeWallet): CrossAddress {
    if(eth instanceof HDNodeWallet) {
      return { eth: eth.address, sub: '0' };
    } else {
      return { eth: eth, sub: '0' };
    }
  }

  fromAddr(eth: string | HDNodeWallet): [string, string] {
    if(eth instanceof HDNodeWallet) {
      return [eth.address, '0'];
    } else {
      return [eth, '0'];
    }
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
    const feeData = await helper.getWeb3().getFeeData();
    const gasPrice = feeData.gasPrice!;
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
  web3: WebSocketProvider | null = null;

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
    // @ts-ignore
    super.arrange = this.arrange;
  }

  getWeb3(): WebSocketProvider {
    if(this.web3 === null) throw Error('Web3 not connected');
    return this.web3;
  }

  connectWeb3(wsEndpoint: string) {
    if(this.web3 !== null) return;
    this.web3 = new WebSocketProvider(wsEndpoint, undefined, { polling: true });
  }

  async getGasPrice(): Promise<bigint> {
    const feeData = await this.getWeb3().getFeeData();
    
    const gasPrice = feeData.gasPrice;
    if(gasPrice === null)
      throw new Error('Gas price can not be null. Are you running test on Unique/Quartz/Opal Network?');

    return gasPrice
  }

  override async disconnect() {
    if(this.web3 === null) return;
    this.web3.websocket.close();

    await super.disconnect();
  }

  override clearApi() {
    super.clearApi();
    this.web3 = null;
  }

  override clone(helperCls: EthUniqueHelperConstructor, options?: { [key: string]: any; }): EthUniqueHelper {
    const newHelper = super.clone(helperCls, options) as EthUniqueHelper;
    newHelper.web3 = this.web3;

    return newHelper;
  }
}
