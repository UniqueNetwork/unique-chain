//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

import {ApiPromise, Keyring} from '@polkadot/api';
import type {AccountId, EventRecord} from '@polkadot/types/interfaces';
import {IKeyringPair} from '@polkadot/types/types';
import {evmToAddress} from '@polkadot/util-crypto';
import BN from 'bn.js';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {alicesPublicKey} from '../accounts';
import {NftDataStructsCollection} from '../interfaces';
import privateKey from '../substrate/privateKey';
import {default as usingApi, submitTransactionAsync, submitTransactionExpectFailAsync} from '../substrate/substrate-api';
import {hexToStr, strToUTF16, utf16ToStr} from './util';

chai.use(chaiAsPromised);
const expect = chai.expect;

export type CrossAccountId = {
  Substrate: string,
} | {
  Ethereum: string,
};
export function normalizeAccountId(input: string | AccountId | CrossAccountId | IKeyringPair): CrossAccountId {
  if (typeof input === 'string') {
    if (input.length === 48 || input.length === 47) {
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
  }else if ('substrate' in input) {
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

const MICROUNIQUE = 1_000_000_000n;
const MILLIUNIQUE = 1_000n * MICROUNIQUE;
const CENTIUNIQUE = 10n * MILLIUNIQUE;
export const UNIQUE = 100n * CENTIUNIQUE;

type GenericResult = {
  success: boolean,
};

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
  success: boolean;
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
  checkMsgNftMethod: string;
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
	offchainSchemaLimit: number;
	variableOnChainSchemaLimit: number;
	constOnChainSchemaLimit: number;
}

export interface IReFungibleTokenDataType {
  owner: IReFungibleOwner[];
  constData: number[];
  variableData: number[];
}

export function nftEventMessage(events: EventRecord[]): IGetMessage {
  let checkMsgNftMethod = '';
  let checkMsgTrsMethod = '';
  let checkMsgSysMethod = '';
  events.forEach(({event: {method, section}}) => {
    if (section === 'common') {
      checkMsgNftMethod = method;
    } else if (section === 'treasury') {
      checkMsgTrsMethod = method;
    } else if (section === 'system') {
      checkMsgSysMethod = method;
    } else { return null; }
  });
  const result: IGetMessage = {
    checkMsgNftMethod,
    checkMsgTrsMethod,
    checkMsgSysMethod,
  };
  return result;
}

export function getGenericResult(events: EventRecord[]): GenericResult {
  const result: GenericResult = {
    success: false,
  };
  events.forEach(({event: {method}}) => {
    // console.log(`    ${phase}: ${section}.${method}:: ${data}`);
    if (method === 'ExtrinsicSuccess') {
      result.success = true;
    }
  });
  return result;
}



export function getCreateCollectionResult(events: EventRecord[]): CreateCollectionResult {
  let success = false;
  let collectionId = 0;
  events.forEach(({event: {data, method, section}}) => {
    // console.log(`    ${phase}: ${section}.${method}:: ${data}`);
    if (method == 'ExtrinsicSuccess') {
      success = true;
    } else if ((section == 'common') && (method == 'CollectionCreated')) {
      collectionId = parseInt(data[0].toString(), 10);
    }
  });
  const result: CreateCollectionResult = {
    success,
    collectionId,
  };
  return result;
}

export function getCreateItemResult(events: EventRecord[]): CreateItemResult {
  let success = false;
  let collectionId = 0;
  let itemId = 0;
  let recipient;
  events.forEach(({event: {data, method, section}}) => {
    // console.log(`    ${phase}: ${section}.${method}:: ${data}`);
    if (method == 'ExtrinsicSuccess') {
      success = true;
    } else if ((section == 'common') && (method == 'ItemCreated')) {
      collectionId = parseInt(data[0].toString(), 10);
      itemId = parseInt(data[1].toString(), 10);
      recipient = normalizeAccountId(data[2].toJSON() as any);
    }
  });
  const result: CreateItemResult = {
    success,
    collectionId,
    itemId,
    recipient,
  };
  return result;
}

export function getTransferResult(events: EventRecord[]): TransferResult {
  const result: TransferResult = {
    success: false,
    collectionId: 0,
    itemId: 0,
    value: 0n,
  };

  events.forEach(({event: {data, method, section}}) => {
    if (method === 'ExtrinsicSuccess') {
      result.success = true;
    } else if (section === 'common' && method === 'Transfer') {
      result.collectionId = +data[0].toString();
      result.itemId = +data[1].toString();
      result.sender = normalizeAccountId(data[2].toJSON() as any);
      result.recipient = normalizeAccountId(data[3].toJSON() as any);
      result.value = BigInt(data[4].toString());
    }
  });

  return result;
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

export type CreateCollectionParams = {
  mode: CollectionMode,
  name: string,
  description: string,
  tokenPrefix: string,
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
  await usingApi(async (api) => {
    // Get number of collections before the transaction
    const collectionCountBefore = (await api.query.common.createdCollectionCount()).toNumber();

    // Run the CreateCollection transaction
    const alicePrivateKey = privateKey('//Alice');

    let modeprm = {};
    if (mode.type === 'NFT') {
      modeprm = {nft: null};
    } else if (mode.type === 'Fungible') {
      modeprm = {fungible: mode.decimalPoints};
    } else if (mode.type === 'ReFungible') {
      modeprm = {refungible: null};
    }

    const tx = api.tx.nft.createCollection(strToUTF16(name), strToUTF16(description), strToUTF16(tokenPrefix), modeprm as any);
    const events = await submitTransactionAsync(alicePrivateKey, tx);
    const result = getCreateCollectionResult(events);

    // Get number of collections after the transaction
    const collectionCountAfter = (await api.query.common.createdCollectionCount()).toNumber();

    // Get the collection
    const collection = (await api.query.common.collectionById(result.collectionId)).unwrap();

    // What to expect
    // tslint:disable-next-line:no-unused-expression
    expect(result.success).to.be.true;
    expect(result.collectionId).to.be.equal(collectionCountAfter);
    // tslint:disable-next-line:no-unused-expression
    expect(collection).to.be.not.null;
    expect(collectionCountAfter).to.be.equal(collectionCountBefore + 1, 'Error: NFT collection NOT created.');
    expect(collection.owner.toString()).to.be.equal(toSubstrateAddress(alicesPublicKey));
    expect(utf16ToStr(collection.name.toJSON() as any)).to.be.equal(name);
    expect(utf16ToStr(collection.description.toJSON() as any)).to.be.equal(description);
    expect(hexToStr(collection.tokenPrefix.toJSON())).to.be.equal(tokenPrefix);

    collectionId = result.collectionId;
  });

  return collectionId;
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

  await usingApi(async (api) => {
    // Get number of collections before the transaction
    const collectionCountBefore = (await api.query.common.createdCollectionCount()).toNumber();

    // Run the CreateCollection transaction
    const alicePrivateKey = privateKey('//Alice');
    const tx = api.tx.nft.createCollection(strToUTF16(name), strToUTF16(description), strToUTF16(tokenPrefix), modeprm as any);
    const events = await expect(submitTransactionExpectFailAsync(alicePrivateKey, tx)).to.be.rejected;
    const result = getCreateCollectionResult(events);

    // Get number of collections after the transaction
    const collectionCountAfter = (await api.query.common.createdCollectionCount()).toNumber();

    // What to expect
    // tslint:disable-next-line:no-unused-expression
    expect(result.success).to.be.false;
    expect(collectionCountAfter).to.be.equal(collectionCountBefore, 'Error: Collection with incorrect data created.');
  });
}

export async function findUnusedAddress(api: ApiPromise, seedAddition = ''): Promise<IKeyringPair> {
  let bal = 0n;
  let unused;
  do {
    const randomSeed = 'seed' + Math.floor(Math.random() * Math.floor(10000)) + seedAddition;
    const keyring = new Keyring({type: 'sr25519'});
    unused = keyring.addFromUri(`//${randomSeed}`);
    bal = (await api.query.system.account(unused.address)).data.free.toBigInt();
  } while (bal !== 0n);
  return unused;
}

export async function getAllowance(api: ApiPromise, collectionId: number, owner: CrossAccountId | string, approved: CrossAccountId | string, tokenId: number) {
  return (await api.rpc.nft.allowance(collectionId, normalizeAccountId(owner), normalizeAccountId(approved), tokenId)).toBigInt();
}

export function findUnusedAddresses(api: ApiPromise, amount: number): Promise<IKeyringPair[]> {
  return Promise.all(new Array(amount).fill(null).map(() => findUnusedAddress(api, '_' + Date.now())));
}

export async function findNotExistingCollection(api: ApiPromise): Promise<number> {
  const totalNumber = (await api.query.common.createdCollectionCount()).toNumber();
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
  await usingApi(async (api) => {
    // Run the DestroyCollection transaction
    const alicePrivateKey = privateKey(senderSeed);
    const tx = api.tx.nft.destroyCollection(collectionId);
    await expect(submitTransactionExpectFailAsync(alicePrivateKey, tx)).to.be.rejected;
  });
}

export async function destroyCollectionExpectSuccess(collectionId: number, senderSeed = '//Alice') {
  await usingApi(async (api) => {
    // Run the DestroyCollection transaction
    const alicePrivateKey = privateKey(senderSeed);
    const tx = api.tx.nft.destroyCollection(collectionId);
    const events = await submitTransactionAsync(alicePrivateKey, tx);
    const result = getDestroyResult(events);
    expect(result).to.be.true;

    // What to expect
    expect((await api.query.common.collectionById(collectionId)).isNone).to.be.true;
  });
}

export async function setCollectionLimitsExpectSuccess(sender: IKeyringPair, collectionId: number, limits: any) {
  await usingApi(async (api) => {
    const tx = api.tx.nft.setCollectionLimits(collectionId, limits);
    const events = await submitTransactionAsync(sender, tx);
    const result = getGenericResult(events);

    expect(result.success).to.be.true;
  });
}

export async function setCollectionLimitsExpectFailure(sender: IKeyringPair, collectionId: number, limits: any) {
  await usingApi(async (api) => {
    const tx = api.tx.nft.setCollectionLimits(collectionId, limits);
    const events = await expect(submitTransactionExpectFailAsync(sender, tx)).to.be.rejected;
    const result = getGenericResult(events);

    expect(result.success).to.be.false;
  });
}

export async function setCollectionSponsorExpectSuccess(collectionId: number, sponsor: string, sender = '//Alice') {
  await usingApi(async (api) => {

    // Run the transaction
    const senderPrivateKey = privateKey(sender);
    const tx = api.tx.nft.setCollectionSponsor(collectionId, sponsor);
    const events = await submitTransactionAsync(senderPrivateKey, tx);
    const result = getGenericResult(events);

    // Get the collection
    const collection = (await api.query.common.collectionById(collectionId)).unwrap();

    // What to expect
    expect(result.success).to.be.true;
    expect(collection.sponsorship.toJSON()).to.deep.equal({
      unconfirmed: sponsor,
    });
  });
}

export async function removeCollectionSponsorExpectSuccess(collectionId: number, sender = '//Alice') {
  await usingApi(async (api) => {

    // Run the transaction
    const alicePrivateKey = privateKey(sender);
    const tx = api.tx.nft.removeCollectionSponsor(collectionId);
    const events = await submitTransactionAsync(alicePrivateKey, tx);
    const result = getGenericResult(events);

    // Get the collection
    const collection = (await api.query.common.collectionById(collectionId)).unwrap();

    // What to expect
    expect(result.success).to.be.true;
    expect(collection.sponsorship.toJSON()).to.be.deep.equal({disabled: null});
  });
}

export async function removeCollectionSponsorExpectFailure(collectionId: number, senderSeed = '//Alice') {
  await usingApi(async (api) => {

    // Run the transaction
    const alicePrivateKey = privateKey(senderSeed);
    const tx = api.tx.nft.removeCollectionSponsor(collectionId);
    await expect(submitTransactionExpectFailAsync(alicePrivateKey, tx)).to.be.rejected;
  });
}

export async function setCollectionSponsorExpectFailure(collectionId: number, sponsor: string, senderSeed = '//Alice') {
  await usingApi(async (api) => {

    // Run the transaction
    const alicePrivateKey = privateKey(senderSeed);
    const tx = api.tx.nft.setCollectionSponsor(collectionId, sponsor);
    await expect(submitTransactionExpectFailAsync(alicePrivateKey, tx)).to.be.rejected;
  });
}

export async function confirmSponsorshipExpectSuccess(collectionId: number, senderSeed = '//Alice') {
  await usingApi(async (api) => {

    // Run the transaction
    const sender = privateKey(senderSeed);
    const tx = api.tx.nft.confirmSponsorship(collectionId);
    const events = await submitTransactionAsync(sender, tx);
    const result = getGenericResult(events);

    // Get the collection
    const collection = (await api.query.common.collectionById(collectionId)).unwrap();

    // What to expect
    expect(result.success).to.be.true;
    expect(collection.sponsorship.toJSON()).to.be.deep.equal({
      confirmed: sender.address,
    });
  });
}


export async function confirmSponsorshipExpectFailure(collectionId: number, senderSeed = '//Alice') {
  await usingApi(async (api) => {

    // Run the transaction
    const sender = privateKey(senderSeed);
    const tx = api.tx.nft.confirmSponsorship(collectionId);
    await expect(submitTransactionExpectFailAsync(sender, tx)).to.be.rejected;
  });
}

export async function setMetadataUpdatePermissionFlagExpectSuccess(sender: IKeyringPair, collectionId: number, flag: string) {

  await usingApi(async (api) => {
    const tx = api.tx.nft.setMetaUpdatePermissionFlag(collectionId, flag as any);
    const events = await submitTransactionAsync(sender, tx);
    const result = getGenericResult(events);

    expect(result.success).to.be.true;
  });
}

export async function setMetadataUpdatePermissionFlagExpectFailure(sender: IKeyringPair, collectionId: number, flag: string) {

  await usingApi(async (api) => {
    const tx = api.tx.nft.setMetaUpdatePermissionFlag(collectionId, flag as any);
    const events = await expect(submitTransactionExpectFailAsync(sender, tx)).to.be.rejected;
    const result = getGenericResult(events);

    expect(result.success).to.be.false;
  });
}

export async function enableContractSponsoringExpectSuccess(sender: IKeyringPair, contractAddress: AccountId | string, enable: boolean) {
  await usingApi(async (api) => {
    const tx = api.tx.nft.enableContractSponsoring(contractAddress, enable);
    const events = await submitTransactionAsync(sender, tx);
    const result = getGenericResult(events);

    expect(result.success).to.be.true;
  });
}

export async function enableContractSponsoringExpectFailure(sender: IKeyringPair, contractAddress: AccountId | string, enable: boolean) {
  await usingApi(async (api) => {
    const tx = api.tx.nft.enableContractSponsoring(contractAddress, enable);
    const events = await expect(submitTransactionExpectFailAsync(sender, tx)).to.be.rejected;
    const result = getGenericResult(events);

    expect(result.success).to.be.false;
  });
}

export async function setTransferFlagExpectSuccess(sender: IKeyringPair, collectionId: number, enabled: boolean) {

  await usingApi(async (api) => {

    const tx = api.tx.nft.setTransfersEnabledFlag (collectionId, enabled);
    const events = await submitTransactionAsync(sender, tx);
    const result = getGenericResult(events);

    expect(result.success).to.be.true;
  });
}

export async function setTransferFlagExpectFailure(sender: IKeyringPair, collectionId: number, enabled: boolean) {

  await usingApi(async (api) => {

    const tx = api.tx.nft.setTransfersEnabledFlag (collectionId, enabled);
    const events = await expect(submitTransactionExpectFailAsync(sender, tx)).to.be.rejected;
    const result = getGenericResult(events);

    expect(result.success).to.be.false;
  });
}

export async function setContractSponsoringRateLimitExpectSuccess(sender: IKeyringPair, contractAddress: AccountId | string, rateLimit: number) {
  await usingApi(async (api) => {
    const tx = api.tx.nft.setContractSponsoringRateLimit(contractAddress, rateLimit);
    const events = await submitTransactionAsync(sender, tx);
    const result = getGenericResult(events);

    expect(result.success).to.be.true;
  });
}

export async function setContractSponsoringRateLimitExpectFailure(sender: IKeyringPair, contractAddress: AccountId | string, rateLimit: number) {
  await usingApi(async (api) => {
    const tx = api.tx.nft.setContractSponsoringRateLimit(contractAddress, rateLimit);
    const events = await expect(submitTransactionExpectFailAsync(sender, tx)).to.be.rejected;
    const result = getGenericResult(events);

    expect(result.success).to.be.false;
  });
}

export async function toggleContractWhitelistExpectSuccess(sender: IKeyringPair, contractAddress: AccountId | string, value = true) {
  await usingApi(async (api) => {
    const tx = api.tx.nft.toggleContractWhiteList(contractAddress, value);
    const events = await submitTransactionAsync(sender, tx);
    const result = getGenericResult(events);

    expect(result.success).to.be.true;
  });
}

export async function isWhitelistedInContract(contractAddress: AccountId | string, user: string) {
  let whitelisted = false;
  await usingApi(async (api) => {
    whitelisted = (await api.query.nft.contractWhiteList(contractAddress, user)).toJSON() as boolean;
  });
  return whitelisted;
}

export async function addToContractWhiteListExpectSuccess(sender: IKeyringPair, contractAddress: AccountId | string, user: AccountId | string) {
  await usingApi(async (api) => {
    const tx = api.tx.nft.addToContractWhiteList(contractAddress.toString(), user.toString());
    const events = await submitTransactionAsync(sender, tx);
    const result = getGenericResult(events);

    expect(result.success).to.be.true;
  });
}

export async function removeFromContractWhiteListExpectSuccess(sender: IKeyringPair, contractAddress: AccountId | string, user: AccountId | string) {
  await usingApi(async (api) => {
    const tx = api.tx.nft.removeFromContractWhiteList(contractAddress.toString(), user.toString());
    const events = await submitTransactionAsync(sender, tx);
    const result = getGenericResult(events);

    expect(result.success).to.be.true;
  });
}

export async function removeFromContractWhiteListExpectFailure(sender: IKeyringPair, contractAddress: AccountId | string, user: AccountId | string) {
  await usingApi(async (api) => {
    const tx = api.tx.nft.removeFromContractWhiteList(contractAddress.toString(), user.toString());
    const events = await expect(submitTransactionExpectFailAsync(sender, tx)).to.be.rejected;
    const result = getGenericResult(events);

    expect(result.success).to.be.false;
  });
}

export async function setVariableMetaDataExpectSuccess(sender: IKeyringPair, collectionId: number, itemId: number, data: number[]) {
  await usingApi(async (api) => {
    const tx = api.tx.nft.setVariableMetaData(collectionId, itemId, '0x' + Buffer.from(data).toString('hex'));
    const events = await submitTransactionAsync(sender, tx);
    const result = getGenericResult(events);

    expect(result.success).to.be.true;
  });
}

export async function setVariableMetaDataExpectFailure(sender: IKeyringPair, collectionId: number, itemId: number, data: number[]) {
  await usingApi(async (api) => {
    const tx = api.tx.nft.setVariableMetaData(collectionId, itemId, '0x' + Buffer.from(data).toString('hex'));
    await expect(submitTransactionExpectFailAsync(sender, tx)).to.be.rejected;
  });
}

export async function setOffchainSchemaExpectSuccess(sender: IKeyringPair, collectionId: number, data: number[]) {
  await usingApi(async (api) => {
    const tx = api.tx.nft.setOffchainSchema(collectionId, '0x' + Buffer.from(data).toString('hex'));
    const events = await submitTransactionAsync(sender, tx);
    const result = getGenericResult(events);

    expect(result.success).to.be.true;
  });
}

export async function setOffchainSchemaExpectFailure(sender: IKeyringPair, collectionId: number, data: number[]) {
  await usingApi(async (api) => {
    const tx = api.tx.nft.setOffchainSchema(collectionId, '0x' + Buffer.from(data).toString('hex'));
    await expect(submitTransactionExpectFailAsync(sender, tx)).to.be.rejected;
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

    const tx = api.tx.nft.burnItem(collectionId, tokenId, value);
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
    const approveNftTx = api.tx.nft.approve(normalizeAccountId(approved), collectionId, tokenId, amount);
    const events = await submitTransactionAsync(owner, approveNftTx);
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
    const approveNftTx = api.tx.nft.approve(normalizeAccountId(approved), collectionId, tokenId, amount);
    const events = await submitTransactionAsync(admin, approveNftTx);
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
    const to = normalizeAccountId(accountTo);
    let balanceBefore = 0n;
    if (type === 'Fungible') {
      balanceBefore = await getBalance(api, collectionId, to, tokenId);
    }
    const transferFromTx = api.tx.nft.transferFrom(normalizeAccountId(accountFrom), to, collectionId, tokenId, value);
    const events = await submitTransactionAsync(accountApproved, transferFromTx);
    const result = getCreateItemResult(events);
    // tslint:disable-next-line:no-unused-expression
    expect(result.success).to.be.true;
    if (type === 'NFT') {
      expect(await getTokenOwner(api, collectionId, tokenId)).to.be.deep.equal(to);
    }
    if (type === 'Fungible') {
      const balanceAfter = await getBalance(api, collectionId, to, tokenId);
      expect(balanceAfter - balanceBefore).to.be.equal(BigInt(value));
    }
    if (type === 'ReFungible') {
      expect(await getBalance(api, collectionId, to, tokenId)).to.be.equal(BigInt(value));
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
    const transferFromTx = api.tx.nft.transferFrom(normalizeAccountId(accountFrom.address), normalizeAccountId(accountTo.address), collectionId, tokenId, value);
    const events = await expect(submitTransactionExpectFailAsync(accountApproved, transferFromTx)).to.be.rejected;
    const result = getCreateCollectionResult(events);
    // tslint:disable-next-line:no-unused-expression
    expect(result.success).to.be.false;
  });
}

/* eslint no-async-promise-executor: "off" */
async function getBlockNumber(api: ApiPromise): Promise<number> {
  return new Promise<number>(async (resolve) => {
    const unsubscribe = await api.rpc.chain.subscribeNewHeads((head) => {
      unsubscribe();
      resolve(head.number.toNumber());
    });
  });
}

export async function addCollectionAdminExpectSuccess(sender: IKeyringPair, collectionId: number, address: string | CrossAccountId) {
  await usingApi(async (api) => {
    const changeAdminTx = api.tx.nft.addCollectionAdmin(collectionId, normalizeAccountId(address));
    const events = await submitTransactionAsync(sender, changeAdminTx);
    const result = getCreateCollectionResult(events);
    expect(result.success).to.be.true;
  });
}

export async function
getFreeBalance(account: IKeyringPair) : Promise<bigint>
{
  let balance = 0n;
  await usingApi(async (api) => {
    balance = BigInt((await api.query.system.account(account.address)).data.free.toString());
  });

  return balance;
}

export async function
scheduleTransferExpectSuccess(
  collectionId: number,
  tokenId: number,
  sender: IKeyringPair,
  recipient: IKeyringPair,
  value: number | bigint = 1,
  blockSchedule: number,
) {
  await usingApi(async (api: ApiPromise) => {
    const blockNumber: number | undefined = await getBlockNumber(api);
    const expectedBlockNumber = blockNumber + blockSchedule;

    expect(blockNumber).to.be.greaterThan(0);
    const transferTx = api.tx.nft.transfer(normalizeAccountId(recipient.address), collectionId, tokenId, value);
    const scheduleTx = api.tx.scheduler.schedule(expectedBlockNumber, null, 0, transferTx as any);

    await submitTransactionAsync(sender, scheduleTx);

    const recipientBalanceBefore = (await api.query.system.account(recipient.address)).data.free.toBigInt();

    expect(await getTokenOwner(api, collectionId, tokenId)).to.be.deep.equal(normalizeAccountId(sender.address));

    // sleep for 4 blocks
    await waitNewBlocks(blockSchedule + 1);

    const recipientBalanceAfter = (await api.query.system.account(recipient.address)).data.free.toBigInt();

    expect(await getTokenOwner(api, collectionId, tokenId)).to.be.deep.equal(normalizeAccountId(recipient.address));
    expect(recipientBalanceAfter).to.be.equal(recipientBalanceBefore);
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
    const to = normalizeAccountId(recipient);

    let balanceBefore = 0n;
    if (type === 'Fungible') {
      balanceBefore = await getBalance(api, collectionId, to, tokenId);
    }
    const transferTx = api.tx.nft.transfer(to, collectionId, tokenId, value);
    const events = await submitTransactionAsync(sender, transferTx);
    const result = getTransferResult(events);
    // tslint:disable-next-line:no-unused-expression
    expect(result.success).to.be.true;
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
      expect(balanceAfter - balanceBefore).to.be.equal(BigInt(value));
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
  recipient: IKeyringPair,
  value: number | bigint = 1,
) {
  await usingApi(async (api: ApiPromise) => {
    const transferTx = api.tx.nft.transfer(normalizeAccountId(recipient.address), collectionId, tokenId, value);
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
    const approveNftTx = api.tx.nft.approve(normalizeAccountId(approved.address), collectionId, tokenId, amount);
    const events = await expect(submitTransactionExpectFailAsync(owner, approveNftTx)).to.be.rejected;
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
  return (await api.rpc.nft.balance(collectionId, normalizeAccountId(owner), token)).toBigInt();
}
export async function getTokenOwner(
  api: ApiPromise,
  collectionId: number,
  token: number,
): Promise<CrossAccountId> {
  return normalizeAccountId((await api.rpc.nft.tokenOwner(collectionId, token)).toJSON() as any);
}
export async function isTokenExists(
  api: ApiPromise,
  collectionId: number,
  token: number,
): Promise<boolean> {
  return (await api.rpc.nft.tokenExists(collectionId, token)).toJSON();
}
export async function getLastTokenId(
  api: ApiPromise,
  collectionId: number,
): Promise<number> {
  return (await api.rpc.nft.lastTokenId(collectionId)).toJSON();
}
export async function getAdminList(
  api: ApiPromise,
  collectionId: number,
): Promise<string[]> {
  return (await api.rpc.nft.adminlist(collectionId)).toHuman() as any;
}
export async function getVariableMetadata(
  api: ApiPromise,
  collectionId: number,
  tokenId: number,
): Promise<number[]> {
  return [...(await api.rpc.nft.variableMetadata(collectionId, tokenId))];
}
export async function getConstMetadata(
  api: ApiPromise,
  collectionId: number,
  tokenId: number,
): Promise<number[]> {
  return [...(await api.rpc.nft.constMetadata(collectionId, tokenId))];
}

export async function createFungibleItemExpectSuccess(
  sender: IKeyringPair,
  collectionId: number,
  data: CreateFungibleData,
  owner: CrossAccountId | string = sender.address,
) {
  return await usingApi(async (api) => {
    const tx = api.tx.nft.createItem(collectionId, normalizeAccountId(owner), {Fungible: data});

    const events = await submitTransactionAsync(sender, tx);
    const result = getCreateItemResult(events);

    expect(result.success).to.be.true;
    return result.itemId;
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
      tx = api.tx.nft.createItem(collectionId, to, createData as any);
    } else if (createMode === 'ReFungible') {
      const createData = {refungible: {const_data: [], variable_data: [], pieces: 100}};
      tx = api.tx.nft.createItem(collectionId, to, createData as any);
    } else {
      const createData = {nft: {const_data: [], variable_data: []}};
      tx = api.tx.nft.createItem(collectionId, to, createData as any);
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

export async function createItemExpectFailure(sender: IKeyringPair, collectionId: number, createMode: string, owner: string = sender.address) {
  await usingApi(async (api) => {
    const tx = api.tx.nft.createItem(collectionId, normalizeAccountId(owner), createMode);

    const events = await expect(submitTransactionExpectFailAsync(sender, tx)).to.be.rejected;
    const result = getCreateItemResult(events);

    expect(result.success).to.be.false;
  });
}

export async function setPublicAccessModeExpectSuccess(
  sender: IKeyringPair, collectionId: number,
  accessMode: 'Normal' | 'WhiteList',
) {
  await usingApi(async (api) => {

    // Run the transaction
    const tx = api.tx.nft.setPublicAccessMode(collectionId, accessMode);
    const events = await submitTransactionAsync(sender, tx);
    const result = getGenericResult(events);

    // Get the collection
    const collection = (await api.query.common.collectionById(collectionId)).unwrap();

    // What to expect
    // tslint:disable-next-line:no-unused-expression
    expect(result.success).to.be.true;
    expect(collection.access.toHuman()).to.be.equal(accessMode);
  });
}

export async function setPublicAccessModeExpectFail(
  sender: IKeyringPair, collectionId: number,
  accessMode: 'Normal' | 'WhiteList',
) {
  await usingApi(async (api) => {

    // Run the transaction
    const tx = api.tx.nft.setPublicAccessMode(collectionId, accessMode);
    const events = await expect(submitTransactionExpectFailAsync(sender, tx)).to.be.rejected;
    const result = getGenericResult(events);

    // What to expect
    // tslint:disable-next-line:no-unused-expression
    expect(result.success).to.be.false;
  });
}

export async function enableWhiteListExpectSuccess(sender: IKeyringPair, collectionId: number) {
  await setPublicAccessModeExpectSuccess(sender, collectionId, 'WhiteList');
}

export async function enableWhiteListExpectFail(sender: IKeyringPair, collectionId: number) {
  await setPublicAccessModeExpectFail(sender, collectionId, 'WhiteList');
}

export async function disableWhiteListExpectSuccess(sender: IKeyringPair, collectionId: number) {
  await setPublicAccessModeExpectSuccess(sender, collectionId, 'Normal');
}

export async function setMintPermissionExpectSuccess(sender: IKeyringPair, collectionId: number, enabled: boolean) {
  await usingApi(async (api) => {

    // Run the transaction
    const tx = api.tx.nft.setMintPermission(collectionId, enabled);
    const events = await submitTransactionAsync(sender, tx);
    const result = getGenericResult(events);
    expect(result.success).to.be.true;

    // Get the collection
    const collection = (await api.query.common.collectionById(collectionId)).unwrap();

    expect(collection.mintMode.toHuman()).to.be.equal(enabled);
  });
}

export async function enablePublicMintingExpectSuccess(sender: IKeyringPair, collectionId: number) {
  await setMintPermissionExpectSuccess(sender, collectionId, true);
}

export async function setMintPermissionExpectFailure(sender: IKeyringPair, collectionId: number, enabled: boolean) {
  await usingApi(async (api) => {
    // Run the transaction
    const tx = api.tx.nft.setMintPermission(collectionId, enabled);
    const events = await expect(submitTransactionExpectFailAsync(sender, tx)).to.be.rejected;
    const result = getCreateCollectionResult(events);
    // tslint:disable-next-line:no-unused-expression
    expect(result.success).to.be.false;
  });
}

export async function setChainLimitsExpectFailure(sender: IKeyringPair, limits: IChainLimits) {
  await usingApi(async (api) => {
    // Run the transaction
    const tx = api.tx.nft.setChainLimits(limits);
    const events = await expect(submitTransactionExpectFailAsync(sender, tx)).to.be.rejected;
    const result = getCreateCollectionResult(events);
    // tslint:disable-next-line:no-unused-expression
    expect(result.success).to.be.false;
  });
}

export async function isWhitelisted(collectionId: number, address: string | CrossAccountId) {
  return await usingApi(async (api) => {
    return (await api.query.common.allowlist(collectionId, normalizeAccountId(address))).toJSON();
  });
}

export async function addToWhiteListExpectSuccess(sender: IKeyringPair, collectionId: number, address: string | AccountId | CrossAccountId) {
  await usingApi(async (api) => {
    expect(await isWhitelisted(collectionId, normalizeAccountId(address))).to.be.false;

    // Run the transaction
    const tx = api.tx.nft.addToWhiteList(collectionId, normalizeAccountId(address));
    const events = await submitTransactionAsync(sender, tx);
    const result = getGenericResult(events);
    expect(result.success).to.be.true;

    expect(await isWhitelisted(collectionId, normalizeAccountId(address))).to.be.true;
  });
}

export async function addToWhiteListAgainExpectSuccess(sender: IKeyringPair, collectionId: number, address: string | AccountId) {
  await usingApi(async (api) => {

    expect(await isWhitelisted(collectionId, normalizeAccountId(address))).to.be.true;

    // Run the transaction
    const tx = api.tx.nft.addToWhiteList(collectionId, normalizeAccountId(address));
    const events = await submitTransactionAsync(sender, tx);
    const result = getGenericResult(events);
    expect(result.success).to.be.true;

    expect(await isWhitelisted(collectionId, normalizeAccountId(address))).to.be.true;
  });
}

export async function addToWhiteListExpectFail(sender: IKeyringPair, collectionId: number, address: string | AccountId) {
  await usingApi(async (api) => {

    // Run the transaction
    const tx = api.tx.nft.addToWhiteList(collectionId, normalizeAccountId(address));
    const events = await expect(submitTransactionExpectFailAsync(sender, tx)).to.be.rejected;
    const result = getGenericResult(events);

    // What to expect
    // tslint:disable-next-line:no-unused-expression
    expect(result.success).to.be.false;
  });
}

export async function removeFromWhiteListExpectSuccess(sender: IKeyringPair, collectionId: number, address: CrossAccountId) {
  await usingApi(async (api) => {
    // Run the transaction
    const tx = api.tx.nft.removeFromWhiteList(collectionId, normalizeAccountId(address));
    const events = await submitTransactionAsync(sender, tx);
    const result = getGenericResult(events);

    // What to expect
    // tslint:disable-next-line:no-unused-expression
    expect(result.success).to.be.true;
  });
}

export async function removeFromWhiteListExpectFailure(sender: IKeyringPair, collectionId: number, address: CrossAccountId) {
  await usingApi(async (api) => {
    // Run the transaction
    const tx = api.tx.nft.removeFromWhiteList(collectionId, normalizeAccountId(address));
    const events = await expect(submitTransactionExpectFailAsync(sender, tx)).to.be.rejected;
    const result = getGenericResult(events);

    // What to expect
    // tslint:disable-next-line:no-unused-expression
    expect(result.success).to.be.false;
  });
}

export const getDetailedCollectionInfo = async (api: ApiPromise, collectionId: number)
  : Promise<NftDataStructsCollection | null> => {
  return (await api.query.common.collectionById(collectionId)).unwrapOr(null);
};

export const getCreatedCollectionCount = async (api: ApiPromise): Promise<number> => {
  // set global object - collectionsCount
  return (await api.query.common.createdCollectionCount()).toNumber();
};

export async function queryCollectionExpectSuccess(api: ApiPromise, collectionId: number): Promise<NftDataStructsCollection> {
  return (await api.query.common.collectionById(collectionId)).unwrap();
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
