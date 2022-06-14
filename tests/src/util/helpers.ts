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

import '../interfaces/augment-api-rpc';
import '../interfaces/augment-api-query';
import {ApiPromise} from '@polkadot/api';
import type {AccountId, EventRecord, Event} from '@polkadot/types/interfaces';
import type {GenericEventData} from '@polkadot/types';
import {AnyTuple, IEvent, IKeyringPair} from '@polkadot/types/types';
import {evmToAddress} from '@polkadot/util-crypto';
import BN from 'bn.js';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {default as usingApi, executeTransaction, submitTransactionAsync, submitTransactionExpectFailAsync} from '../substrate/substrate-api';
import {hexToStr, strToUTF16, utf16ToStr} from './util';
import {UpDataStructsRpcCollection, UpDataStructsCreateItemData, UpDataStructsProperty} from '@polkadot/types/lookup';
import {UpDataStructsTokenChild} from '../interfaces';

chai.use(chaiAsPromised);
const expect = chai.expect;

export type CrossAccountId = {
  Substrate: string,
} | {
  Ethereum: string,
};

export function normalizeAccountId(input: string | AccountId | CrossAccountId | IKeyringPair): CrossAccountId {
  if (typeof input === 'string') {
    if (input.length >= 47) {
      return {Substrate: input};
    } else if (input.length === 42 && input.startsWith('0x')) {
      return {Ethereum: input.toLowerCase()};
    } else if (input.length === 40 && !input.startsWith('0x')) {
      return {Ethereum: '0x' + input.toLowerCase()};
    } else {
      throw new Error(`Unknown address format: "${input}"`);
    }
  }
  if ('address' in input) {
    return {Substrate: input.address};
  }
  if ('Ethereum' in input) {
    return {
      Ethereum: input.Ethereum.toLowerCase(),
    };
  } else if ('ethereum' in input) {
    return {
      Ethereum: (input as any).ethereum.toLowerCase(),
    };
  } else if ('Substrate' in input) {
    return input;
  } else if ('substrate' in input) {
    return {
      Substrate: (input as any).substrate,
    };
  }

  // AccountId
  return {Substrate: input.toString()};
}
export function toSubstrateAddress(input: string | CrossAccountId | IKeyringPair): string {
  input = normalizeAccountId(input);
  if ('Substrate' in input) {
    return input.Substrate;
  } else {
    return evmToAddress(input.Ethereum);
  }
}

export const U128_MAX = (1n << 128n) - 1n;

const MICROUNIQUE = 1_000_000_000_000n;
const MILLIUNIQUE = 1_000n * MICROUNIQUE;
const CENTIUNIQUE = 10n * MILLIUNIQUE;
export const UNIQUE = 100n * CENTIUNIQUE;

interface GenericResult<T> {
  success: boolean;
  data: T | null;
}

interface CreateCollectionResult {
  success: boolean;
  collectionId: number;
}

interface CreateItemResult {
  success: boolean;
  collectionId: number;
  itemId: number;
  recipient?: CrossAccountId;
}

interface TransferResult {
  collectionId: number;
  itemId: number;
  sender?: CrossAccountId;
  recipient?: CrossAccountId;
  value: bigint;
}

interface IReFungibleOwner {
  fraction: BN;
  owner: number[];
}

interface IGetMessage {
  checkMsgUnqMethod: string;
  checkMsgTrsMethod: string;
  checkMsgSysMethod: string;
}

export interface IFungibleTokenDataType {
  value: number;
}

export interface IChainLimits {
  collectionNumbersLimit: number;
  accountTokenOwnershipLimit: number;
  collectionsAdminsLimit: number;
  customDataLimit: number;
  nftSponsorTransferTimeout: number;
  fungibleSponsorTransferTimeout: number;
  refungibleSponsorTransferTimeout: number;
  //offchainSchemaLimit: number;
  //constOnChainSchemaLimit: number;
}

export interface IReFungibleTokenDataType {
  owner: IReFungibleOwner[];
}

export function uniqueEventMessage(events: EventRecord[]): IGetMessage {
  let checkMsgUnqMethod = '';
  let checkMsgTrsMethod = '';
  let checkMsgSysMethod = '';
  events.forEach(({event: {method, section}}) => {
    if (section === 'common') {
      checkMsgUnqMethod = method;
    } else if (section === 'treasury') {
      checkMsgTrsMethod = method;
    } else if (section === 'system') {
      checkMsgSysMethod = method;
    } else { return null; }
  });
  const result: IGetMessage = {
    checkMsgUnqMethod,
    checkMsgTrsMethod,
    checkMsgSysMethod,
  };
  return result;
}

export function getEvent<T extends Event>(events: EventRecord[], check: (event: IEvent<AnyTuple>) => event is T): T | undefined {
  const event = events.find(r => check(r.event));
  if (!event) return;
  return event.event as T;
}

export function getGenericResult<T>(events: EventRecord[]): GenericResult<T>;
export function getGenericResult<T>(
  events: EventRecord[],
  expectSection: string,
  expectMethod: string,
  extractAction: (data: GenericEventData) => T
): GenericResult<T>;

export function getGenericResult<T>(
  events: EventRecord[],
  expectSection?: string,
  expectMethod?: string,
  extractAction?: (data: GenericEventData) => T,
): GenericResult<T> {
  let success = false;
  let successData = null;

  events.forEach(({event: {data, method, section}}) => {
    // console.log(`    ${phase}: ${section}.${method}:: ${data}`);
    if (method === 'ExtrinsicSuccess') {
      success = true;
    } else if ((expectSection == section) && (expectMethod == method)) {
      successData = extractAction!(data as any);
    }
  });

  const result: GenericResult<T> = {
    success,
    data: successData,
  };
  return result;
}

export function getCreateCollectionResult(events: EventRecord[]): CreateCollectionResult {
  const genericResult = getGenericResult(events, 'common', 'CollectionCreated', (data) => parseInt(data[0].toString(), 10));
  const result: CreateCollectionResult = {
    success: genericResult.success,
    collectionId: genericResult.data ?? 0,
  };
  return result;
}

export function getCreateItemsResult(events: EventRecord[]): CreateItemResult[] {
  const results: CreateItemResult[] = [];
  
  const genericResult = getGenericResult<CreateItemResult[]>(events, 'common', 'ItemCreated', (data) => {
    const collectionId = parseInt(data[0].toString(), 10);
    const itemId = parseInt(data[1].toString(), 10);
    const recipient = normalizeAccountId(data[2].toJSON() as any);

    const itemRes: CreateItemResult = {
      success: true,
      collectionId,
      itemId,
      recipient,
    };

    results.push(itemRes);
    return results;
  });

  if (!genericResult.success) return [];
  return results;
}

export function getCreateItemResult(events: EventRecord[]): CreateItemResult {
  const genericResult = getGenericResult<[number, number, CrossAccountId?]>(events, 'common', 'ItemCreated', (data) => [
    parseInt(data[0].toString(), 10),
    parseInt(data[1].toString(), 10),
    normalizeAccountId(data[2].toJSON() as any),
  ]);

  if (genericResult.data == null) genericResult.data = [0, 0];

  const result: CreateItemResult = {
    success: genericResult.success,
    collectionId: genericResult.data[0],
    itemId: genericResult.data[1],
    recipient: genericResult.data![2],
  };
  
  return result;
}

export function getTransferResult(api: ApiPromise, events: EventRecord[]): TransferResult {
  for (const {event} of events) {
    if (api.events.common.Transfer.is(event)) {
      const [collection, token, sender, recipient, value] = event.data;
      return {
        collectionId: collection.toNumber(),
        itemId: token.toNumber(),
        sender: normalizeAccountId(sender.toJSON() as any),
        recipient: normalizeAccountId(recipient.toJSON() as any),
        value: value.toBigInt(),
      };
    }
  }
  throw new Error('no transfer event');
}

interface Nft {
  type: 'NFT';
}

interface Fungible {
  type: 'Fungible';
  decimalPoints: number;
}

interface ReFungible {
  type: 'ReFungible';
}

type CollectionMode = Nft | Fungible | ReFungible;

export type Property = {
  key: any,
  value: any,
};

type Permission = {
  mutable: boolean;
  collectionAdmin: boolean;
  tokenOwner: boolean;
}

type PropertyPermission = {
  key: any;
  permission: Permission;
}

export type CreateCollectionParams = {
  mode: CollectionMode,
  name: string,
  description: string,
  tokenPrefix: string,
  properties?: Array<Property>,
  propPerm?: Array<PropertyPermission>
};

const defaultCreateCollectionParams: CreateCollectionParams = {
  description: 'description',
  mode: {type: 'NFT'},
  name: 'name',
  tokenPrefix: 'prefix',
};

export async function createCollectionExpectSuccess(params: Partial<CreateCollectionParams> = {}): Promise<number> {
  const {name, description, mode, tokenPrefix} = {...defaultCreateCollectionParams, ...params};

  let collectionId = 0;
  await usingApi(async (api, privateKeyWrapper) => {
    // Get number of collections before the transaction
    const collectionCountBefore = await getCreatedCollectionCount(api);

    // Run the CreateCollection transaction
    const alicePrivateKey = privateKeyWrapper('//Alice');

    let modeprm = {};
    if (mode.type === 'NFT') {
      modeprm = {nft: null};
    } else if (mode.type === 'Fungible') {
      modeprm = {fungible: mode.decimalPoints};
    } else if (mode.type === 'ReFungible') {
      modeprm = {refungible: null};
    }

    const tx = api.tx.unique.createCollectionEx({
      name: strToUTF16(name),
      description: strToUTF16(description),
      tokenPrefix: strToUTF16(tokenPrefix),
      mode: modeprm as any,
    });
    const events = await submitTransactionAsync(alicePrivateKey, tx);
    const result = getCreateCollectionResult(events);

    // Get number of collections after the transaction
    const collectionCountAfter = await getCreatedCollectionCount(api);

    // Get the collection
    const collection = await queryCollectionExpectSuccess(api, result.collectionId);

    // What to expect
    // tslint:disable-next-line:no-unused-expression
    expect(result.success).to.be.true;
    expect(result.collectionId).to.be.equal(collectionCountAfter);
    // tslint:disable-next-line:no-unused-expression
    expect(collection).to.be.not.null;
    expect(collectionCountAfter).to.be.equal(collectionCountBefore + 1, 'Error: NFT collection NOT created.');
    expect(collection.owner.toString()).to.be.equal(toSubstrateAddress(alicePrivateKey));
    expect(utf16ToStr(collection.name.toJSON() as any)).to.be.equal(name);
    expect(utf16ToStr(collection.description.toJSON() as any)).to.be.equal(description);
    expect(hexToStr(collection.tokenPrefix.toJSON())).to.be.equal(tokenPrefix);

    collectionId = result.collectionId;
  });

  return collectionId;
}

export async function createCollectionWithPropsExpectSuccess(params: Partial<CreateCollectionParams> = {}): Promise<number> {
  const {name, description, mode, tokenPrefix} = {...defaultCreateCollectionParams, ...params};

  let collectionId = 0;
  await usingApi(async (api, privateKeyWrapper) => {
    // Get number of collections before the transaction
    const collectionCountBefore = await getCreatedCollectionCount(api);

    // Run the CreateCollection transaction
    const alicePrivateKey = privateKeyWrapper('//Alice');

    let modeprm = {};
    if (mode.type === 'NFT') {
      modeprm = {nft: null};
    } else if (mode.type === 'Fungible') {
      modeprm = {fungible: mode.decimalPoints};
    } else if (mode.type === 'ReFungible') {
      modeprm = {refungible: null};
    }

    const tx = api.tx.unique.createCollectionEx({name: strToUTF16(name), description: strToUTF16(description), tokenPrefix: strToUTF16(tokenPrefix), mode: modeprm as any, properties: params.properties, tokenPropertyPermissions: params.propPerm});
    const events = await submitTransactionAsync(alicePrivateKey, tx);
    const result = getCreateCollectionResult(events);

    // Get number of collections after the transaction
    const collectionCountAfter = await getCreatedCollectionCount(api);

    // Get the collection
    const collection = await queryCollectionExpectSuccess(api, result.collectionId);

    // What to expect
    // tslint:disable-next-line:no-unused-expression
    expect(result.success).to.be.true;
    expect(result.collectionId).to.be.equal(collectionCountAfter);
    // tslint:disable-next-line:no-unused-expression
    expect(collection).to.be.not.null;
    expect(collectionCountAfter).to.be.equal(collectionCountBefore + 1, 'Error: NFT collection NOT created.');
    expect(collection.owner.toString()).to.be.equal(toSubstrateAddress(alicePrivateKey));
    expect(utf16ToStr(collection.name.toJSON() as any)).to.be.equal(name);
    expect(utf16ToStr(collection.description.toJSON() as any)).to.be.equal(description);
    expect(hexToStr(collection.tokenPrefix.toJSON())).to.be.equal(tokenPrefix);


    collectionId = result.collectionId;
  });

  return collectionId;
}

export async function createCollectionWithPropsExpectFailure(params: Partial<CreateCollectionParams> = {}) {
  const {name, description, mode, tokenPrefix} = {...defaultCreateCollectionParams, ...params};

  await usingApi(async (api, privateKeyWrapper) => {
    // Get number of collections before the transaction
    const collectionCountBefore = await getCreatedCollectionCount(api);

    // Run the CreateCollection transaction
    const alicePrivateKey = privateKeyWrapper('//Alice');

    let modeprm = {};
    if (mode.type === 'NFT') {
      modeprm = {nft: null};
    } else if (mode.type === 'Fungible') {
      modeprm = {fungible: mode.decimalPoints};
    } else if (mode.type === 'ReFungible') {
      modeprm = {refungible: null};
    }

    const tx = api.tx.unique.createCollectionEx({name: strToUTF16(name), description: strToUTF16(description), tokenPrefix: strToUTF16(tokenPrefix), mode: modeprm as any, properties: params.properties, tokenPropertyPermissions: params.propPerm});
    await expect(submitTransactionExpectFailAsync(alicePrivateKey, tx)).to.be.rejected;


    // Get number of collections after the transaction
    const collectionCountAfter = await getCreatedCollectionCount(api);

    expect(collectionCountAfter).to.be.equal(collectionCountBefore, 'Error: Collection with incorrect data created.');
  });
}

export async function createCollectionExpectFailure(params: Partial<CreateCollectionParams> = {}) {
  const {name, description, mode, tokenPrefix} = {...defaultCreateCollectionParams, ...params};

  let modeprm = {};
  if (mode.type === 'NFT') {
    modeprm = {nft: null};
  } else if (mode.type === 'Fungible') {
    modeprm = {fungible: mode.decimalPoints};
  } else if (mode.type === 'ReFungible') {
    modeprm = {refungible: null};
  }

  await usingApi(async (api, privateKeyWrapper) => {
    // Get number of collections before the transaction
    const collectionCountBefore = await getCreatedCollectionCount(api);

    // Run the CreateCollection transaction
    const alicePrivateKey = privateKeyWrapper('//Alice');
    const tx = api.tx.unique.createCollectionEx({name: strToUTF16(name), description: strToUTF16(description), tokenPrefix: strToUTF16(tokenPrefix), mode: modeprm as any});
    await expect(submitTransactionExpectFailAsync(alicePrivateKey, tx)).to.be.rejected;

    // Get number of collections after the transaction
    const collectionCountAfter = await getCreatedCollectionCount(api);

    // What to expect
    expect(collectionCountAfter).to.be.equal(collectionCountBefore, 'Error: Collection with incorrect data created.');
  });
}

export async function findUnusedAddress(api: ApiPromise, privateKeyWrapper: (account: string) => IKeyringPair, seedAddition = ''): Promise<IKeyringPair> {
  let bal = 0n;
  let unused;
  do {
    const randomSeed = 'seed' + Math.floor(Math.random() * Math.floor(10000)) + seedAddition;
    unused = privateKeyWrapper(`//${randomSeed}`);
    bal = (await api.query.system.account(unused.address)).data.free.toBigInt();
  } while (bal !== 0n);
  return unused;
}

export async function getAllowance(api: ApiPromise, collectionId: number, owner: CrossAccountId | string, approved: CrossAccountId | string, tokenId: number) {
  return (await api.rpc.unique.allowance(collectionId, normalizeAccountId(owner), normalizeAccountId(approved), tokenId)).toBigInt();
}

export function findUnusedAddresses(api: ApiPromise, privateKeyWrapper: (account: string) => IKeyringPair, amount: number): Promise<IKeyringPair[]> {
  return Promise.all(new Array(amount).fill(null).map(() => findUnusedAddress(api, privateKeyWrapper, '_' + Date.now())));
}

export async function findNotExistingCollection(api: ApiPromise): Promise<number> {
  const totalNumber = await getCreatedCollectionCount(api);
  const newCollection: number = totalNumber + 1;
  return newCollection;
}

function getDestroyResult(events: EventRecord[]): boolean {
  let success = false;
  events.forEach(({event: {method}}) => {
    if (method == 'ExtrinsicSuccess') {
      success = true;
    }
  });
  return success;
}

export async function destroyCollectionExpectFailure(collectionId: number, senderSeed = '//Alice') {
  await usingApi(async (api, privateKeyWrapper) => {
    // Run the DestroyCollection transaction
    const alicePrivateKey = privateKeyWrapper(senderSeed);
    const tx = api.tx.unique.destroyCollection(collectionId);
    await expect(submitTransactionExpectFailAsync(alicePrivateKey, tx)).to.be.rejected;
  });
}

export async function destroyCollectionExpectSuccess(collectionId: number, senderSeed = '//Alice') {
  await usingApi(async (api, privateKeyWrapper) => {
    // Run the DestroyCollection transaction
    const alicePrivateKey = privateKeyWrapper(senderSeed);
    const tx = api.tx.unique.destroyCollection(collectionId);
    const events = await submitTransactionAsync(alicePrivateKey, tx);
    const result = getDestroyResult(events);
    expect(result).to.be.true;

    // What to expect
    expect(await getDetailedCollectionInfo(api, collectionId)).to.be.null;
  });
}

export async function setCollectionLimitsExpectSuccess(sender: IKeyringPair, collectionId: number, limits: any) {
  await usingApi(async (api) => {
    const tx = api.tx.unique.setCollectionLimits(collectionId, limits);
    const events = await submitTransactionAsync(sender, tx);
    const result = getGenericResult(events);

    expect(result.success).to.be.true;
  });
}

export const setCollectionPermissionsExpectSuccess = async (sender: IKeyringPair, collectionId: number, permissions: any) => {
  await usingApi(async(api) => {
    const tx = api.tx.unique.setCollectionPermissions(collectionId, permissions);
    const events = await submitTransactionAsync(sender, tx);
    const result = getGenericResult(events);

    expect(result.success).to.be.true;
  });
};

export async function setCollectionLimitsExpectFailure(sender: IKeyringPair, collectionId: number, limits: any) {
  await usingApi(async (api) => {
    const tx = api.tx.unique.setCollectionLimits(collectionId, limits);
    const events = await expect(submitTransactionExpectFailAsync(sender, tx)).to.be.rejected;
    const result = getGenericResult(events);

    expect(result.success).to.be.false;
  });
}

export async function setCollectionSponsorExpectSuccess(collectionId: number, sponsor: string, sender = '//Alice') {
  await usingApi(async (api, privateKeyWrapper) => {

    // Run the transaction
    const senderPrivateKey = privateKeyWrapper(sender);
    const tx = api.tx.unique.setCollectionSponsor(collectionId, sponsor);
    const events = await submitTransactionAsync(senderPrivateKey, tx);
    const result = getGenericResult(events);

    // Get the collection
    const collection = await queryCollectionExpectSuccess(api, collectionId);

    // What to expect
    expect(result.success).to.be.true;
    expect(collection.sponsorship.toJSON()).to.deep.equal({
      unconfirmed: sponsor,
    });
  });
}

export async function removeCollectionSponsorExpectSuccess(collectionId: number, sender = '//Alice') {
  await usingApi(async (api, privateKeyWrapper) => {

    // Run the transaction
    const alicePrivateKey = privateKeyWrapper(sender);
    const tx = api.tx.unique.removeCollectionSponsor(collectionId);
    const events = await submitTransactionAsync(alicePrivateKey, tx);
    const result = getGenericResult(events);

    // Get the collection
    const collection = await queryCollectionExpectSuccess(api, collectionId);

    // What to expect
    expect(result.success).to.be.true;
    expect(collection.sponsorship.toJSON()).to.be.deep.equal({disabled: null});
  });
}

export async function removeCollectionSponsorExpectFailure(collectionId: number, senderSeed = '//Alice') {
  await usingApi(async (api, privateKeyWrapper) => {

    // Run the transaction
    const alicePrivateKey = privateKeyWrapper(senderSeed);
    const tx = api.tx.unique.removeCollectionSponsor(collectionId);
    await expect(submitTransactionExpectFailAsync(alicePrivateKey, tx)).to.be.rejected;
  });
}

export async function setCollectionSponsorExpectFailure(collectionId: number, sponsor: string, senderSeed = '//Alice') {
  await usingApi(async (api, privateKeyWrapper) => {

    // Run the transaction
    const alicePrivateKey = privateKeyWrapper(senderSeed);
    const tx = api.tx.unique.setCollectionSponsor(collectionId, sponsor);
    await expect(submitTransactionExpectFailAsync(alicePrivateKey, tx)).to.be.rejected;
  });
}

export async function confirmSponsorshipExpectSuccess(collectionId: number, senderSeed = '//Alice') {
  await usingApi(async (api, privateKeyWrapper) => {

    // Run the transaction
    const sender = privateKeyWrapper(senderSeed);
    await confirmSponsorshipByKeyExpectSuccess(collectionId, sender);
  });
}

export async function confirmSponsorshipByKeyExpectSuccess(collectionId: number, sender: IKeyringPair) {
  await usingApi(async (api, privateKeyWrapper) => {

    // Run the transaction
    const tx = api.tx.unique.confirmSponsorship(collectionId);
    const events = await submitTransactionAsync(sender, tx);
    const result = getGenericResult(events);

    // Get the collection
    const collection = await queryCollectionExpectSuccess(api, collectionId);

    // What to expect
    expect(result.success).to.be.true;
    expect(collection.sponsorship.toJSON()).to.be.deep.equal({
      confirmed: sender.address,
    });
  });
}


export async function confirmSponsorshipExpectFailure(collectionId: number, senderSeed = '//Alice') {
  await usingApi(async (api, privateKeyWrapper) => {

    // Run the transaction
    const sender = privateKeyWrapper(senderSeed);
    const tx = api.tx.unique.confirmSponsorship(collectionId);
    await expect(submitTransactionExpectFailAsync(sender, tx)).to.be.rejected;
  });
}

export async function enableContractSponsoringExpectSuccess(sender: IKeyringPair, contractAddress: AccountId | string, enable: boolean) {
  await usingApi(async (api) => {
    const tx = api.tx.unique.enableContractSponsoring(contractAddress, enable);
    const events = await submitTransactionAsync(sender, tx);
    const result = getGenericResult(events);

    expect(result.success).to.be.true;
  });
}

export async function enableContractSponsoringExpectFailure(sender: IKeyringPair, contractAddress: AccountId | string, enable: boolean) {
  await usingApi(async (api) => {
    const tx = api.tx.unique.enableContractSponsoring(contractAddress, enable);
    const events = await expect(submitTransactionExpectFailAsync(sender, tx)).to.be.rejected;
    const result = getGenericResult(events);

    expect(result.success).to.be.false;
  });
}

export async function setTransferFlagExpectSuccess(sender: IKeyringPair, collectionId: number, enabled: boolean) {

  await usingApi(async (api) => {

    const tx = api.tx.unique.setTransfersEnabledFlag(collectionId, enabled);
    const events = await submitTransactionAsync(sender, tx);
    const result = getGenericResult(events);

    expect(result.success).to.be.true;
  });
}

export async function setTransferFlagExpectFailure(sender: IKeyringPair, collectionId: number, enabled: boolean) {

  await usingApi(async (api) => {

    const tx = api.tx.unique.setTransfersEnabledFlag(collectionId, enabled);
    const events = await expect(submitTransactionExpectFailAsync(sender, tx)).to.be.rejected;
    const result = getGenericResult(events);

    expect(result.success).to.be.false;
  });
}

export async function setContractSponsoringRateLimitExpectSuccess(sender: IKeyringPair, contractAddress: AccountId | string, rateLimit: number) {
  await usingApi(async (api) => {
    const tx = api.tx.unique.setContractSponsoringRateLimit(contractAddress, rateLimit);
    const events = await submitTransactionAsync(sender, tx);
    const result = getGenericResult(events);

    expect(result.success).to.be.true;
  });
}

export async function setContractSponsoringRateLimitExpectFailure(sender: IKeyringPair, contractAddress: AccountId | string, rateLimit: number) {
  await usingApi(async (api) => {
    const tx = api.tx.unique.setContractSponsoringRateLimit(contractAddress, rateLimit);
    const events = await expect(submitTransactionExpectFailAsync(sender, tx)).to.be.rejected;
    const result = getGenericResult(events);

    expect(result.success).to.be.false;
  });
}

export async function getNextSponsored(
  api: ApiPromise,
  collectionId: number,
  account: string | CrossAccountId,
  tokenId: number,
): Promise<number> {
  return Number((await api.rpc.unique.nextSponsored(collectionId, account, tokenId)).unwrapOr(-1));
}

export async function toggleContractAllowlistExpectSuccess(sender: IKeyringPair, contractAddress: AccountId | string, value = true) {
  await usingApi(async (api) => {
    const tx = api.tx.unique.toggleContractAllowList(contractAddress, value);
    const events = await submitTransactionAsync(sender, tx);
    const result = getGenericResult(events);

    expect(result.success).to.be.true;
  });
}

export async function isAllowlistedInContract(contractAddress: AccountId | string, user: string) {
  let allowlisted = false;
  await usingApi(async (api) => {
    allowlisted = (await api.query.unique.contractAllowList(contractAddress, user)).toJSON() as boolean;
  });
  return allowlisted;
}

export async function addToContractAllowListExpectSuccess(sender: IKeyringPair, contractAddress: AccountId | string, user: AccountId | string) {
  await usingApi(async (api) => {
    const tx = api.tx.unique.addToContractAllowList(contractAddress.toString(), user.toString());
    const events = await submitTransactionAsync(sender, tx);
    const result = getGenericResult(events);

    expect(result.success).to.be.true;
  });
}

export async function removeFromContractAllowListExpectSuccess(sender: IKeyringPair, contractAddress: AccountId | string, user: AccountId | string) {
  await usingApi(async (api) => {
    const tx = api.tx.unique.removeFromContractAllowList(contractAddress.toString(), user.toString());
    const events = await submitTransactionAsync(sender, tx);
    const result = getGenericResult(events);

    expect(result.success).to.be.true;
  });
}

export async function removeFromContractAllowListExpectFailure(sender: IKeyringPair, contractAddress: AccountId | string, user: AccountId | string) {
  await usingApi(async (api) => {
    const tx = api.tx.unique.removeFromContractAllowList(contractAddress.toString(), user.toString());
    const events = await expect(submitTransactionExpectFailAsync(sender, tx)).to.be.rejected;
    const result = getGenericResult(events);

    expect(result.success).to.be.false;
  });
}

export interface CreateFungibleData {
  readonly Value: bigint;
}

export interface CreateReFungibleData { }
export interface CreateNftData { }

export type CreateItemData = {
  NFT: CreateNftData;
} | {
  Fungible: CreateFungibleData;
} | {
  ReFungible: CreateReFungibleData;
};

export async function burnItemExpectSuccess(sender: IKeyringPair, collectionId: number, tokenId: number, value = 1) {
  await usingApi(async (api) => {
    const balanceBefore = await getBalance(api, collectionId, normalizeAccountId(sender), tokenId);
    // if burning token by admin - use adminButnItemExpectSuccess
    expect(balanceBefore >= BigInt(value)).to.be.true;

    const tx = api.tx.unique.burnItem(collectionId, tokenId, value);
    const events = await submitTransactionAsync(sender, tx);
    const result = getGenericResult(events);
    expect(result.success).to.be.true;

    const balanceAfter = await getBalance(api, collectionId, normalizeAccountId(sender), tokenId);
    expect(balanceAfter + BigInt(value)).to.be.equal(balanceBefore);
  });
}

export async function
approveExpectSuccess(
  collectionId: number,
  tokenId: number, owner: IKeyringPair, approved: CrossAccountId | string, amount: number | bigint = 1,
) {
  await usingApi(async (api: ApiPromise) => {
    const approveUniqueTx = api.tx.unique.approve(normalizeAccountId(approved), collectionId, tokenId, amount);
    const events = await submitTransactionAsync(owner, approveUniqueTx);
    const result = getGenericResult(events);
    expect(result.success).to.be.true;

    expect(await getAllowance(api, collectionId, owner.address, approved, tokenId)).to.be.equal(BigInt(amount));
  });
}

export async function adminApproveFromExpectSuccess(
  collectionId: number,
  tokenId: number, admin: IKeyringPair, owner: CrossAccountId | string, approved: CrossAccountId | string, amount: number | bigint = 1,
) {
  await usingApi(async (api: ApiPromise) => {
    const approveUniqueTx = api.tx.unique.approve(normalizeAccountId(approved), collectionId, tokenId, amount);
    const events = await submitTransactionAsync(admin, approveUniqueTx);
    const result = getGenericResult(events);
    expect(result.success).to.be.true;

    expect(await getAllowance(api, collectionId, owner, approved, tokenId)).to.be.equal(BigInt(amount));
  });
}

export async function
transferFromExpectSuccess(
  collectionId: number,
  tokenId: number,
  accountApproved: IKeyringPair,
  accountFrom: IKeyringPair | CrossAccountId,
  accountTo: IKeyringPair | CrossAccountId,
  value: number | bigint = 1,
  type = 'NFT',
) {
  await usingApi(async (api: ApiPromise) => {
    const from = normalizeAccountId(accountFrom);
    const to = normalizeAccountId(accountTo);
    let balanceBefore = 0n;
    if (type === 'Fungible' || type === 'ReFungible') {
      balanceBefore = await getBalance(api, collectionId, to, tokenId);
    }
    const transferFromTx = api.tx.unique.transferFrom(normalizeAccountId(accountFrom), to, collectionId, tokenId, value);
    const events = await submitTransactionAsync(accountApproved, transferFromTx);
    const result = getGenericResult(events);
    // tslint:disable-next-line:no-unused-expression
    expect(result.success).to.be.true;
    if (type === 'NFT') {
      expect(await getTokenOwner(api, collectionId, tokenId)).to.be.deep.equal(to);
    }
    if (type === 'Fungible') {
      const balanceAfter = await getBalance(api, collectionId, to, tokenId);
      if (JSON.stringify(to) !== JSON.stringify(from)) {
        expect(balanceAfter - balanceBefore).to.be.equal(BigInt(value));
      } else {
        expect(balanceAfter).to.be.equal(balanceBefore);
      }
    }
    if (type === 'ReFungible') {
      expect(await getBalance(api, collectionId, to, tokenId)).to.be.equal(balanceBefore + BigInt(value));
    }
  });
}

export async function
transferFromExpectFail(
  collectionId: number,
  tokenId: number,
  accountApproved: IKeyringPair,
  accountFrom: IKeyringPair,
  accountTo: IKeyringPair,
  value: number | bigint = 1,
) {
  await usingApi(async (api: ApiPromise) => {
    const transferFromTx = api.tx.unique.transferFrom(normalizeAccountId(accountFrom.address), normalizeAccountId(accountTo.address), collectionId, tokenId, value);
    const events = await expect(submitTransactionExpectFailAsync(accountApproved, transferFromTx)).to.be.rejected;
    const result = getCreateCollectionResult(events);
    // tslint:disable-next-line:no-unused-expression
    expect(result.success).to.be.false;
  });
}

/* eslint no-async-promise-executor: "off" */
export async function getBlockNumber(api: ApiPromise): Promise<number> {
  return new Promise<number>(async (resolve) => {
    const unsubscribe = await api.rpc.chain.subscribeNewHeads((head) => {
      unsubscribe();
      resolve(head.number.toNumber());
    });
  });
}

export async function addCollectionAdminExpectSuccess(sender: IKeyringPair, collectionId: number, address: string | CrossAccountId) {
  await usingApi(async (api) => {
    const changeAdminTx = api.tx.unique.addCollectionAdmin(collectionId, normalizeAccountId(address));
    const events = await submitTransactionAsync(sender, changeAdminTx);
    const result = getCreateCollectionResult(events);
    expect(result.success).to.be.true;
  });
}

export async function adminApproveFromExpectFail(
  collectionId: number,
  tokenId: number, admin: IKeyringPair, owner: CrossAccountId | string, approved: CrossAccountId | string, amount: number | bigint = 1,
) {
  await usingApi(async (api: ApiPromise) => {
    const approveUniqueTx = api.tx.unique.approve(normalizeAccountId(approved), collectionId, tokenId, amount);
    const events = await expect(submitTransactionAsync(admin, approveUniqueTx)).to.be.rejected;
    const result = getGenericResult(events);
    expect(result.success).to.be.false;
  });
}

export async function
getFreeBalance(account: IKeyringPair): Promise<bigint> {
  let balance = 0n;
  await usingApi(async (api) => {
    balance = BigInt((await api.query.system.account(account.address)).data.free.toString());
  });

  return balance;
}

export async function transferBalanceTo(api: ApiPromise, source: IKeyringPair, target: string, amount = 1000n * UNIQUE) {
  const tx = api.tx.balances.transfer(target, amount);
  const events = await submitTransactionAsync(source, tx);
  const result = getGenericResult(events);
  expect(result.success).to.be.true;
}

export async function
scheduleExpectSuccess(
  operationTx: any,
  sender: IKeyringPair,
  blockSchedule: number,
  scheduledId: string,
  period = 1,
  repetitions = 1,
) {
  await usingApi(async (api: ApiPromise) => {
    const blockNumber: number | undefined = await getBlockNumber(api);
    const expectedBlockNumber = blockNumber + blockSchedule;

    expect(blockNumber).to.be.greaterThan(0);
    const scheduleTx = api.tx.scheduler.scheduleNamed( // schedule
      scheduledId,
      expectedBlockNumber, 
      repetitions > 1 ? [period, repetitions] : null, 
      0, 
      {value: operationTx as any},
    );

    const events = await submitTransactionAsync(sender, scheduleTx);
    expect(getGenericResult(events).success).to.be.true;
  });
}

export async function
scheduleExpectFailure(
  operationTx: any,
  sender: IKeyringPair,
  blockSchedule: number,
  scheduledId: string,
  period = 1,
  repetitions = 1,
) {
  await usingApi(async (api: ApiPromise) => {
    const blockNumber: number | undefined = await getBlockNumber(api);
    const expectedBlockNumber = blockNumber + blockSchedule;

    expect(blockNumber).to.be.greaterThan(0);
    const scheduleTx = api.tx.scheduler.scheduleNamed( // schedule
      scheduledId,
      expectedBlockNumber, 
      repetitions <= 1 ? null : [period, repetitions], 
      0, 
      {value: operationTx as any},
    );

    //const events = 
    await expect(submitTransactionExpectFailAsync(sender, scheduleTx)).to.be.rejected;
    //expect(getGenericResult(events).success).to.be.false;
  });
}

export async function
scheduleTransferAndWaitExpectSuccess(
  collectionId: number,
  tokenId: number,
  sender: IKeyringPair,
  recipient: IKeyringPair,
  value: number | bigint = 1,
  blockSchedule: number,
  scheduledId: string,
) {
  await usingApi(async (api: ApiPromise) => {
    await scheduleTransferExpectSuccess(collectionId, tokenId, sender, recipient, value, blockSchedule, scheduledId);

    const recipientBalanceBefore = (await api.query.system.account(recipient.address)).data.free.toBigInt();

    // sleep for n + 1 blocks
    await waitNewBlocks(blockSchedule + 1);

    const recipientBalanceAfter = (await api.query.system.account(recipient.address)).data.free.toBigInt();

    expect(await getTokenOwner(api, collectionId, tokenId)).to.be.deep.equal(normalizeAccountId(recipient.address));
    expect(recipientBalanceAfter).to.be.equal(recipientBalanceBefore);
  });
}

export async function
scheduleTransferExpectSuccess(
  collectionId: number,
  tokenId: number,
  sender: IKeyringPair,
  recipient: IKeyringPair,
  value: number | bigint = 1,
  blockSchedule: number,
  scheduledId: string,
) {
  await usingApi(async (api: ApiPromise) => {
    const transferTx = api.tx.unique.transfer(normalizeAccountId(recipient.address), collectionId, tokenId, value);

    await scheduleExpectSuccess(transferTx, sender, blockSchedule, scheduledId);

    expect(await getTokenOwner(api, collectionId, tokenId)).to.be.deep.equal(normalizeAccountId(sender.address));
  });
}

export async function
scheduleTransferFundsPeriodicExpectSuccess(
  amount: bigint,
  sender: IKeyringPair,
  recipient: IKeyringPair,
  blockSchedule: number,
  scheduledId: string,
  period: number,
  repetitions: number,
) {
  await usingApi(async (api: ApiPromise) => {
    const transferTx = api.tx.balances.transfer(recipient.address, amount);

    const balanceBefore = await getFreeBalance(recipient);
    
    await scheduleExpectSuccess(transferTx, sender, blockSchedule, scheduledId, period, repetitions);

    expect(await getFreeBalance(recipient)).to.be.equal(balanceBefore);
  });
}

export async function
transferExpectSuccess(
  collectionId: number,
  tokenId: number,
  sender: IKeyringPair,
  recipient: IKeyringPair | CrossAccountId,
  value: number | bigint = 1,
  type = 'NFT',
) {
  await usingApi(async (api: ApiPromise) => {
    const from = normalizeAccountId(sender);
    const to = normalizeAccountId(recipient);

    let balanceBefore = 0n;
    if (type === 'Fungible') {
      balanceBefore = await getBalance(api, collectionId, to, tokenId);
    }
    const transferTx = api.tx.unique.transfer(to, collectionId, tokenId, value);
    const events = await executeTransaction(api, sender, transferTx);

    const result = getTransferResult(api, events);
    expect(result.collectionId).to.be.equal(collectionId);
    expect(result.itemId).to.be.equal(tokenId);
    expect(result.sender).to.be.deep.equal(normalizeAccountId(sender.address));
    expect(result.recipient).to.be.deep.equal(to);
    expect(result.value).to.be.equal(BigInt(value));

    if (type === 'NFT') {
      expect(await getTokenOwner(api, collectionId, tokenId)).to.be.deep.equal(to);
    }
    if (type === 'Fungible') {
      const balanceAfter = await getBalance(api, collectionId, to, tokenId);
      if (JSON.stringify(to) !== JSON.stringify(from)) {
        expect(balanceAfter - balanceBefore).to.be.equal(BigInt(value));
      } else {
        expect(balanceAfter).to.be.equal(balanceBefore);
      }
    }
    if (type === 'ReFungible') {
      expect(await getBalance(api, collectionId, to, tokenId) >= value).to.be.true;
    }
  });
}

export async function
transferExpectFailure(
  collectionId: number,
  tokenId: number,
  sender: IKeyringPair,
  recipient: IKeyringPair | CrossAccountId,
  value: number | bigint = 1,
) {
  await usingApi(async (api: ApiPromise) => {
    const transferTx = api.tx.unique.transfer(normalizeAccountId(recipient), collectionId, tokenId, value);
    const events = await expect(submitTransactionExpectFailAsync(sender, transferTx)).to.be.rejected;
    const result = getGenericResult(events);
    // if (events && Array.isArray(events)) {
    //   const result = getCreateCollectionResult(events);
    // tslint:disable-next-line:no-unused-expression
    expect(result.success).to.be.false;
    //}
  });
}

export async function
approveExpectFail(
  collectionId: number,
  tokenId: number, owner: IKeyringPair, approved: IKeyringPair, amount: number | bigint = 1,
) {
  await usingApi(async (api: ApiPromise) => {
    const approveUniqueTx = api.tx.unique.approve(normalizeAccountId(approved.address), collectionId, tokenId, amount);
    const events = await expect(submitTransactionExpectFailAsync(owner, approveUniqueTx)).to.be.rejected;
    const result = getCreateCollectionResult(events);
    // tslint:disable-next-line:no-unused-expression
    expect(result.success).to.be.false;
  });
}

export async function getBalance(
  api: ApiPromise,
  collectionId: number,
  owner: string | CrossAccountId,
  token: number,
): Promise<bigint> {
  return (await api.rpc.unique.balance(collectionId, normalizeAccountId(owner), token)).toBigInt();
}
export async function getTokenOwner(
  api: ApiPromise,
  collectionId: number,
  token: number,
): Promise<CrossAccountId> {
  const owner = (await api.rpc.unique.tokenOwner(collectionId, token)).toJSON() as any;
  if (owner == null) throw new Error('owner == null');
  return normalizeAccountId(owner);
}
export async function getTopmostTokenOwner(
  api: ApiPromise,
  collectionId: number,
  token: number,
): Promise<CrossAccountId> {
  const owner = (await api.rpc.unique.topmostTokenOwner(collectionId, token)).toJSON() as any;
  if (owner == null) throw new Error('owner == null');
  return normalizeAccountId(owner);
}
export async function getTokenChildren(
  api: ApiPromise,
  collectionId: number,
  tokenId: number,
): Promise<UpDataStructsTokenChild[]> {
  return (await api.rpc.unique.tokenChildren(collectionId, tokenId)).toJSON() as any;
}
export async function isTokenExists(
  api: ApiPromise,
  collectionId: number,
  token: number,
): Promise<boolean> {
  return (await api.rpc.unique.tokenExists(collectionId, token)).toJSON();
}
export async function getLastTokenId(
  api: ApiPromise,
  collectionId: number,
): Promise<number> {
  return (await api.rpc.unique.lastTokenId(collectionId)).toJSON();
}
export async function getAdminList(
  api: ApiPromise,
  collectionId: number,
): Promise<string[]> {
  return (await api.rpc.unique.adminlist(collectionId)).toHuman() as any;
}
export async function getTokenProperties(
  api: ApiPromise,
  collectionId: number,
  tokenId: number,
  propertyKeys: string[],
): Promise<UpDataStructsProperty[]> {
  return (await api.rpc.unique.tokenProperties(collectionId, tokenId, propertyKeys)).toHuman() as any;
}

export async function createFungibleItemExpectSuccess(
  sender: IKeyringPair,
  collectionId: number,
  data: CreateFungibleData,
  owner: CrossAccountId | string = sender.address,
) {
  return await usingApi(async (api) => {
    const tx = api.tx.unique.createItem(collectionId, normalizeAccountId(owner), {Fungible: data});

    const events = await submitTransactionAsync(sender, tx);
    const result = getCreateItemResult(events);

    expect(result.success).to.be.true;
    return result.itemId;
  });
}

export async function createMultipleItemsWithPropsExpectSuccess(sender: IKeyringPair, collectionId: number, itemsData: any, owner: CrossAccountId | string = sender.address) {
  await usingApi(async (api) => {
    const to = normalizeAccountId(owner);
    const tx = api.tx.unique.createMultipleItems(collectionId, to, itemsData);

    const events = await submitTransactionAsync(sender, tx);
    const result = getCreateItemsResult(events);

    for (const res of result) {
      expect(await api.rpc.unique.tokenProperties(collectionId, res.itemId)).not.to.be.empty;
    }
  });
}

export async function createMultipleItemsExWithPropsExpectSuccess(sender: IKeyringPair, collectionId: number, itemsData: any) {
  await usingApi(async (api) => {
    const tx = api.tx.unique.createMultipleItemsEx(collectionId, itemsData);

    const events = await submitTransactionAsync(sender, tx);
    const result = getCreateItemsResult(events);

    for (const res of result) {
      expect(await api.rpc.unique.tokenProperties(collectionId, res.itemId)).not.to.be.empty;
    }
  });
}

export async function createItemWithPropsExpectSuccess(sender: IKeyringPair, collectionId: number, createMode: string, props:  Array<Property>, owner: CrossAccountId | string = sender.address) {
  let newItemId = 0;
  await usingApi(async (api) => {
    const to = normalizeAccountId(owner);
    const itemCountBefore = await getLastTokenId(api, collectionId);
    const itemBalanceBefore = await getBalance(api, collectionId, to, newItemId);

    let tx;
    if (createMode === 'Fungible') {
      const createData = {fungible: {value: 10}};
      tx = api.tx.unique.createItem(collectionId, to, createData as any);
    } else if (createMode === 'ReFungible') {
      const createData = {refungible: {pieces: 100}};
      tx = api.tx.unique.createItem(collectionId, to, createData as any);
    } else {
      const data = api.createType('UpDataStructsCreateItemData', {NFT: {properties: props}});
      tx = api.tx.unique.createItem(collectionId, to, data as UpDataStructsCreateItemData);
    }

    const events = await submitTransactionAsync(sender, tx);
    const result = getCreateItemResult(events);

    const itemCountAfter = await getLastTokenId(api, collectionId);
    const itemBalanceAfter = await getBalance(api, collectionId, to, newItemId);

    if (createMode === 'NFT') {
      expect(await api.rpc.unique.tokenProperties(collectionId, result.itemId)).not.to.be.empty;
    }

    // What to expect
    // tslint:disable-next-line:no-unused-expression
    expect(result.success).to.be.true;
    if (createMode === 'Fungible') {
      expect(itemBalanceAfter - itemBalanceBefore).to.be.equal(10n);
    } else {
      expect(itemCountAfter).to.be.equal(itemCountBefore + 1);
    }
    expect(collectionId).to.be.equal(result.collectionId);
    expect(itemCountAfter.toString()).to.be.equal(result.itemId.toString());
    expect(to).to.be.deep.equal(result.recipient);
    newItemId = result.itemId;
  });
  return newItemId;
}

export async function createItemWithPropsExpectFailure(sender: IKeyringPair, collectionId: number, createMode: string, props: Array<Property>, owner: CrossAccountId | string = sender.address) {
  await usingApi(async (api) => {

    let tx;
    if (createMode === 'NFT') {
      const data = api.createType('UpDataStructsCreateItemData', {NFT: {properties: props}});
      tx = api.tx.unique.createItem(collectionId, normalizeAccountId(owner), data);
    } else {
      tx = api.tx.unique.createItem(collectionId, normalizeAccountId(owner), createMode);
    }


    const events = await expect(submitTransactionExpectFailAsync(sender, tx)).to.be.rejected;
    if(events.message && events.message.toString().indexOf('1002: Verification Error') > -1) return;
    const result = getCreateItemResult(events);

    expect(result.success).to.be.false;
  });
}

export async function createItemExpectSuccess(sender: IKeyringPair, collectionId: number, createMode: string, owner: CrossAccountId | string = sender.address) {
  let newItemId = 0;
  await usingApi(async (api) => {
    const to = normalizeAccountId(owner);
    const itemCountBefore = await getLastTokenId(api, collectionId);
    const itemBalanceBefore = await getBalance(api, collectionId, to, newItemId);

    let tx;
    if (createMode === 'Fungible') {
      const createData = {fungible: {value: 10}};
      tx = api.tx.unique.createItem(collectionId, to, createData as any);
    } else if (createMode === 'ReFungible') {
      const createData = {refungible: {pieces: 100}};
      tx = api.tx.unique.createItem(collectionId, to, createData as any);
    } else {
      const createData = {nft: {}};
      tx = api.tx.unique.createItem(collectionId, to, createData as any);
    }

    const events = await submitTransactionAsync(sender, tx);
    const result = getCreateItemResult(events);

    const itemCountAfter = await getLastTokenId(api, collectionId);
    const itemBalanceAfter = await getBalance(api, collectionId, to, newItemId);

    // What to expect
    // tslint:disable-next-line:no-unused-expression
    expect(result.success).to.be.true;
    if (createMode === 'Fungible') {
      expect(itemBalanceAfter - itemBalanceBefore).to.be.equal(10n);
    } else {
      expect(itemCountAfter).to.be.equal(itemCountBefore + 1);
    }
    expect(collectionId).to.be.equal(result.collectionId);
    expect(itemCountAfter.toString()).to.be.equal(result.itemId.toString());
    expect(to).to.be.deep.equal(result.recipient);
    newItemId = result.itemId;
  });
  return newItemId;
}

export async function createItemExpectFailure(sender: IKeyringPair, collectionId: number, createMode: string, owner: CrossAccountId | string = sender.address) {
  await usingApi(async (api) => {
    const tx = api.tx.unique.createItem(collectionId, normalizeAccountId(owner), createMode);

    const events = await expect(submitTransactionExpectFailAsync(sender, tx)).to.be.rejected;
    const result = getCreateItemResult(events);

    expect(result.success).to.be.false;
  });
}

export async function setPublicAccessModeExpectSuccess(
  sender: IKeyringPair, collectionId: number,
  accessMode: 'Normal' | 'AllowList',
) {
  await usingApi(async (api) => {

    // Run the transaction
    const tx = api.tx.unique.setCollectionPermissions(collectionId, {access: accessMode});
    const events = await submitTransactionAsync(sender, tx);
    const result = getGenericResult(events);

    // Get the collection
    const collection = await queryCollectionExpectSuccess(api, collectionId);

    // What to expect
    // tslint:disable-next-line:no-unused-expression
    expect(result.success).to.be.true;
    expect(collection.permissions.access.toHuman()).to.be.equal(accessMode);
  });
}

export async function setPublicAccessModeExpectFail(
  sender: IKeyringPair, collectionId: number,
  accessMode: 'Normal' | 'AllowList',
) {
  await usingApi(async (api) => {

    // Run the transaction
    const tx = api.tx.unique.setCollectionPermissions(collectionId, {access: accessMode});
    const events = await expect(submitTransactionExpectFailAsync(sender, tx)).to.be.rejected;
    const result = getGenericResult(events);

    // What to expect
    // tslint:disable-next-line:no-unused-expression
    expect(result.success).to.be.false;
  });
}

export async function enableAllowListExpectSuccess(sender: IKeyringPair, collectionId: number) {
  await setPublicAccessModeExpectSuccess(sender, collectionId, 'AllowList');
}

export async function enableAllowListExpectFail(sender: IKeyringPair, collectionId: number) {
  await setPublicAccessModeExpectFail(sender, collectionId, 'AllowList');
}

export async function disableAllowListExpectSuccess(sender: IKeyringPair, collectionId: number) {
  await setPublicAccessModeExpectSuccess(sender, collectionId, 'Normal');
}

export async function setMintPermissionExpectSuccess(sender: IKeyringPair, collectionId: number, enabled: boolean) {
  await usingApi(async (api) => {

    // Run the transaction
    const tx = api.tx.unique.setCollectionPermissions(collectionId, {mintMode: enabled});
    const events = await submitTransactionAsync(sender, tx);
    const result = getGenericResult(events);
    expect(result.success).to.be.true;

    // Get the collection
    const collection = await queryCollectionExpectSuccess(api, collectionId);

    expect(collection.permissions.mintMode.toHuman()).to.be.equal(enabled);
  });
}

export async function enablePublicMintingExpectSuccess(sender: IKeyringPair, collectionId: number) {
  await setMintPermissionExpectSuccess(sender, collectionId, true);
}

export async function setMintPermissionExpectFailure(sender: IKeyringPair, collectionId: number, enabled: boolean) {
  await usingApi(async (api) => {
    // Run the transaction
    const tx = api.tx.unique.setCollectionPermissions(collectionId, {mintMode: enabled});
    const events = await expect(submitTransactionExpectFailAsync(sender, tx)).to.be.rejected;
    const result = getCreateCollectionResult(events);
    // tslint:disable-next-line:no-unused-expression
    expect(result.success).to.be.false;
  });
}

export async function setChainLimitsExpectFailure(sender: IKeyringPair, limits: IChainLimits) {
  await usingApi(async (api) => {
    // Run the transaction
    const tx = api.tx.unique.setChainLimits(limits);
    const events = await expect(submitTransactionExpectFailAsync(sender, tx)).to.be.rejected;
    const result = getCreateCollectionResult(events);
    // tslint:disable-next-line:no-unused-expression
    expect(result.success).to.be.false;
  });
}

export async function isAllowlisted(api: ApiPromise, collectionId: number, address: string | CrossAccountId) {
  return (await api.rpc.unique.allowed(collectionId, normalizeAccountId(address))).toJSON();
}

export async function addToAllowListExpectSuccess(sender: IKeyringPair, collectionId: number, address: string | AccountId | CrossAccountId) {
  await usingApi(async (api) => {
    expect(await isAllowlisted(api, collectionId, normalizeAccountId(address))).to.be.false;

    // Run the transaction
    const tx = api.tx.unique.addToAllowList(collectionId, normalizeAccountId(address));
    const events = await submitTransactionAsync(sender, tx);
    const result = getGenericResult(events);
    expect(result.success).to.be.true;

    expect(await isAllowlisted(api, collectionId, normalizeAccountId(address))).to.be.true;
  });
}

export async function addToAllowListAgainExpectSuccess(sender: IKeyringPair, collectionId: number, address: string | AccountId) {
  await usingApi(async (api) => {

    expect(await isAllowlisted(api, collectionId, normalizeAccountId(address))).to.be.true;

    // Run the transaction
    const tx = api.tx.unique.addToAllowList(collectionId, normalizeAccountId(address));
    const events = await submitTransactionAsync(sender, tx);
    const result = getGenericResult(events);
    expect(result.success).to.be.true;

    expect(await isAllowlisted(api, collectionId, normalizeAccountId(address))).to.be.true;
  });
}

export async function addToAllowListExpectFail(sender: IKeyringPair, collectionId: number, address: string | AccountId) {
  await usingApi(async (api) => {

    // Run the transaction
    const tx = api.tx.unique.addToAllowList(collectionId, normalizeAccountId(address));
    const events = await expect(submitTransactionExpectFailAsync(sender, tx)).to.be.rejected;
    const result = getGenericResult(events);

    // What to expect
    // tslint:disable-next-line:no-unused-expression
    expect(result.success).to.be.false;
  });
}

export async function removeFromAllowListExpectSuccess(sender: IKeyringPair, collectionId: number, address: CrossAccountId) {
  await usingApi(async (api) => {
    // Run the transaction
    const tx = api.tx.unique.removeFromAllowList(collectionId, normalizeAccountId(address));
    const events = await submitTransactionAsync(sender, tx);
    const result = getGenericResult(events);

    // What to expect
    // tslint:disable-next-line:no-unused-expression
    expect(result.success).to.be.true;
  });
}

export async function removeFromAllowListExpectFailure(sender: IKeyringPair, collectionId: number, address: CrossAccountId) {
  await usingApi(async (api) => {
    // Run the transaction
    const tx = api.tx.unique.removeFromAllowList(collectionId, normalizeAccountId(address));
    const events = await expect(submitTransactionExpectFailAsync(sender, tx)).to.be.rejected;
    const result = getGenericResult(events);

    // What to expect
    // tslint:disable-next-line:no-unused-expression
    expect(result.success).to.be.false;
  });
}

export const getDetailedCollectionInfo = async (api: ApiPromise, collectionId: number)
  : Promise<UpDataStructsRpcCollection | null> => {
  return (await api.rpc.unique.collectionById(collectionId)).unwrapOr(null);
};

export const getCreatedCollectionCount = async (api: ApiPromise): Promise<number> => {
  // set global object - collectionsCount
  return (await api.rpc.unique.collectionStats()).created.toNumber();
};

export async function queryCollectionExpectSuccess(api: ApiPromise, collectionId: number): Promise<UpDataStructsRpcCollection> {
  return (await api.rpc.unique.collectionById(collectionId)).unwrap();
}

export async function waitNewBlocks(blocksCount = 1): Promise<void> {
  await usingApi(async (api) => {
    const promise = new Promise<void>(async (resolve) => {
      const unsubscribe = await api.rpc.chain.subscribeNewHeads(() => {
        if (blocksCount > 0) {
          blocksCount--;
        } else {
          unsubscribe();
          resolve();
        }
      });
    });
    return promise;
  });
}
