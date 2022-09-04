// Copyright 2019-2022 Unique Network (Gibraltar) Ltd.
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable function-call-argument-newline */

import Web3 from 'web3';
import {WebsocketProvider} from 'web3-core';
import {Contract} from 'web3-eth-contract';

import {evmToAddress} from '@polkadot/util-crypto';
import {IKeyringPair} from '@polkadot/types/types';

import {DevUniqueHelper} from '../../../util/playgrounds/unique.dev';

// Native contracts ABI
import collectionHelpersAbi from '../../collectionHelpersAbi.json';
import fungibleAbi from '../../fungibleAbi.json';
import nonFungibleAbi from '../../nonFungibleAbi.json';
import refungibleAbi from '../../reFungibleAbi.json';
import refungibleTokenAbi from '../../reFungibleTokenAbi.json';
import contractHelpersAbi from './../contractHelpersAbi.json';

class EthGroupBase {
  helper: EthUniqueHelper;

  constructor(helper: EthUniqueHelper) {
    this.helper = helper;
  }
}
  
  
class NativeContractGroup extends EthGroupBase {
  DEFAULT_GAS = 2_500_000;

  contractHelpers(caller: string): Contract {
    const web3 = this.helper.getWeb3();
    return new web3.eth.Contract(contractHelpersAbi as any, '0x842899ECF380553E8a4de75bF534cdf6fBF64049', {from: caller, gas: this.DEFAULT_GAS});
  }

  collectionHelpers(caller: string) {
    const web3 = this.helper.getWeb3();
    return new web3.eth.Contract(collectionHelpersAbi as any, '0x6c4e9fe1ae37a41e93cee429e8e1881abdcbb54f', {from: caller, gas: this.DEFAULT_GAS});
  }

  collection(address: string, mode: 'nft' | 'rft' | 'ft', caller?: string): Contract {
    const abi = {
      'nft': nonFungibleAbi,
      'rft': refungibleAbi,
      'ft': fungibleAbi
    }[mode];
    const web3 = this.helper.getWeb3();
    return new web3.eth.Contract(abi as any, address, {gas: this.DEFAULT_GAS, ...(caller ? {from: caller} : {})});
  }

  rftTokenByAddress(address: string, caller?: string): Contract {
    const web3 = this.helper.getWeb3();
    return new web3.eth.Contract(refungibleTokenAbi as any, address, {gas: this.DEFAULT_GAS, ...(caller ? {from: caller} : {})});
  }

  rftToken(collectionId: number, tokenId: number, caller?: string): Contract {
    return this.rftTokenByAddress(this.helper.ethAddress.fromTokenId(collectionId, tokenId), caller);
  }
}

  
class EthGroup extends EthGroupBase {
  createAccount() {
    const web3 = this.helper.getWeb3();
    const account = web3.eth.accounts.create();
    web3.eth.accounts.wallet.add(account.privateKey);
    return account.address;
  }

  async createAccountWithBalance(donor: IKeyringPair, amount=1000n) {
    const account = this.createAccount();
    await this.transferBalanceFromSubstrate(donor, account, amount);
  
    return account;
  }

  async transferBalanceFromSubstrate(donor: IKeyringPair, recepient: string, amount=1000n) {
    return await this.helper.balance.transferToSubstrate(donor, evmToAddress(recepient), amount * this.helper.balance.getOneTokenNominal());
  }

  async createNonfungibleCollection(signer: string, name: string, description: string, tokenPrefix: string): Promise<{collectionId: number, collectionAddress: string}> {
    const collectionHelper = this.helper.ethNativeContract.collectionHelpers(signer);
        
    const result = await collectionHelper.methods.createNonfungibleCollection(name, description, tokenPrefix).send();

    const collectionAddress = this.helper.ethAddress.normalizeAddress(result.events.CollectionCreated.returnValues.collectionId);
    const collectionId = this.helper.ethAddress.extractCollectionId(collectionAddress);

    return {collectionId, collectionAddress};
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
    return this.helper.util.getNestingTokenAddress(collectionId, tokenId);
  }

  normalizeAddress(address: string): string {
    return '0x' + address.substring(address.length - 40);
  }
}  
 

export class EthUniqueHelper extends DevUniqueHelper {
  web3: Web3 | null = null;
  web3Provider: WebsocketProvider | null = null;

  eth: EthGroup;
  ethAddress: EthAddressGroup;
  ethNativeContract: NativeContractGroup;

  constructor(logger: { log: (msg: any, level: any) => void, level: any }) {
    super(logger);
    this.eth = new EthGroup(this);
    this.ethAddress = new EthAddressGroup(this);
    this.ethNativeContract = new NativeContractGroup(this);
  }

  getWeb3(): Web3 {
    if(this.web3 === null) throw Error('Web3 not connected');
    return this.web3;
  }

  async connectWeb3(wsEndpoint: string) {
    if(this.web3 !== null) return;
    this.web3Provider = new Web3.providers.WebsocketProvider(wsEndpoint);
    this.web3 = new Web3(this.web3Provider);
  }

  async disconnectWeb3() {
    if(this.web3 === null) return;
    this.web3Provider?.connection.close();
    this.web3 = null;
  }
}
  