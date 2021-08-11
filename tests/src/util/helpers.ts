//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

import { ApiPromise, Keyring } from '@polkadot/api';
import type { AccountId, EventRecord } from '@polkadot/types/interfaces';
import { IKeyringPair } from '@polkadot/types/types';
import { evmToAddress } from '@polkadot/util-crypto';
import { BigNumber } from 'bignumber.js';
import BN from 'bn.js';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { alicesPublicKey } from '../accounts';
import privateKey from '../substrate/privateKey';
import { default as usingApi, submitTransactionAsync, submitTransactionExpectFailAsync } from '../substrate/substrate-api';
import { ICollectionInterface } from '../types';
import { hexToStr, strToUTF16, utf16ToStr } from './util';

chai.use(chaiAsPromised);
const expect = chai.expect;

export type CrossAccountId = {
  substrate: string,
} | {
  ethereum: string,
};
export function normalizeAccountId(input: string | AccountId | CrossAccountId | IKeyringPair): CrossAccountId {
  if (typeof input === 'string')
    return { substrate: input };
  if ('address' in input) {
    return { substrate: input.address };
  }
  if ('ethereum' in input) {
    input.ethereum = input.ethereum.toLowerCase();
    return input;
  }
  if ('substrate' in input) {
    return input;
  }

  // AccountId
  return {substrate: input.toString()};
}
export function toSubstrateAddress(input: string | CrossAccountId | IKeyringPair): string {
  input = normalizeAccountId(input);
  if ('substrate' in input) {
    return input.substrate;
  } else {
    return evmToAddress(input.ethereum);
  }
}

export const U128_MAX = (1n << 128n) - 1n;

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
  Fraction: BN;
  Owner: number[];
}

interface ITokenDataType {
  Owner: IKeyringPair;
  ConstData: number[];
  VariableData: number[];
}

interface IGetMessage {
  checkMsgNftMethod: string;
  checkMsgTrsMethod: string;
  checkMsgSysMethod: string;
}

export interface IFungibleTokenDataType {
  Value: number;
}

export interface IChainLimits {
  CollectionNumbersLimit: number;
	AccountTokenOwnershipLimit: number;
	CollectionAdminsLimit: number;
	CustomDataLimit: number;
	NftSponsorTimeout: number;
	FungibleSponsorTimeout: number;
	RefungibleSponsorTimeout: number;
	OffchainSchemaLimit: number;
	VariableOnChainSchemaLimit: number;
	ConstOnChainSchemaLimit: number;
}

export interface ICollectionLimits {
  AccountTokenOwnershipLimit: number;
  OwnerCanDestroy: boolean;
  OwnerCanTransfer: boolean;
  SponsoredDataRateLimit: number | null;
  SponsoredDataSize: number;
  SponsorTimeout: number;
  TokenLimit: number;
}

export interface IReFungibleTokenDataType {
  Owner: IReFungibleOwner[];
  ConstData: number[];
  VariableData: number[];
}

export function getDefaultChainLimits(): IChainLimits {
  const l: IChainLimits = {
    CollectionNumbersLimit : 100000,
    AccountTokenOwnershipLimit: 1000000,
    CollectionAdminsLimit: 5,
    CustomDataLimit: 2048,
    NftSponsorTimeout: 15,
    FungibleSponsorTimeout: 15,
    RefungibleSponsorTimeout: 15,
    OffchainSchemaLimit: 1024,
    VariableOnChainSchemaLimit: 1024,
    ConstOnChainSchemaLimit: 1024,
  };

  return l;
}

export function getDefaultCollectionLimits(): ICollectionLimits {
  const l: ICollectionLimits = {
    AccountTokenOwnershipLimit: 10000000,
    OwnerCanDestroy: true,
    OwnerCanTransfer: true,
    SponsoredDataRateLimit: null,
    SponsoredDataSize: 2048,
    SponsorTimeout: 14400,
    TokenLimit: 4294967295,
  };

  return l;
}

export function nftEventMessage(events: EventRecord[]): IGetMessage {
  let checkMsgNftMethod = '';
  let checkMsgTrsMethod = '';
  let checkMsgSysMethod = '';
  events.forEach(({ event: { method, section } }) => {
    if (section === 'nft') {
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
  events.forEach(({ event: { method } }) => {
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
  events.forEach(({ event: { data, method, section } }) => {
    // console.log(`    ${phase}: ${section}.${method}:: ${data}`);
    if (method == 'ExtrinsicSuccess') {
      success = true;
    } else if ((section == 'nft') && (method == 'CollectionCreated')) {
      collectionId = parseInt(data[0].toString());
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
  events.forEach(({ event: { data, method, section } }) => {
    // console.log(`    ${phase}: ${section}.${method}:: ${data}`);
    if (method == 'ExtrinsicSuccess') {
      success = true;
    } else if ((section == 'nft') && (method == 'ItemCreated')) {
      collectionId = parseInt(data[0].toString());
      itemId = parseInt(data[1].toString());
      recipient = data[2].toJSON();
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

  events.forEach(({ event: { data, method, section } }) => {
    if (method === 'ExtrinsicSuccess') {
      result.success = true;
    } else if (section === 'nft' && method === 'Transfer') {
      result.collectionId = +data[0].toString();
      result.itemId = +data[1].toString();
      result.sender = data[2].toJSON() as CrossAccountId;
      result.recipient = data[3].toJSON() as CrossAccountId;
      result.value = BigInt(data[4].toString());
    }
  });

  return result;
}

interface Invalid {
  type: 'Invalid';
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

type CollectionMode = Nft | Fungible | ReFungible | Invalid;

export type CreateCollectionParams = {
  mode: CollectionMode,
  name: string,
  description: string,
  tokenPrefix: string,
};

const defaultCreateCollectionParams: CreateCollectionParams = {
  description: 'description',
  mode: { type: 'NFT' },
  name: 'name',
  tokenPrefix: 'prefix',
};

export async function createCollectionExpectSuccess(params: Partial<CreateCollectionParams> = {}, senderSeed = '//Alice'): Promise<number> {
  const { name, description, mode, tokenPrefix } = { ...defaultCreateCollectionParams, ...params };

  let collectionId = 0;
  await usingApi(async (api) => {
    // Get number of collections before the transaction
    const AcollectionCount = parseInt((await api.query.nft.createdCollectionCount()).toString(), 10);

    // Run the CreateCollection transaction
    const alicePrivateKey = privateKey(senderSeed);

    let modeprm = {};
    if (mode.type === 'NFT') {
      modeprm = { nft: null };
    } else if (mode.type === 'Fungible') {
      modeprm = { fungible: mode.decimalPoints };
    } else if (mode.type === 'ReFungible') {
      modeprm = { refungible: null };
    } else if (mode.type === 'Invalid') {
      modeprm = { invalid: null };
    }

    const tx = api.tx.nft.createCollection(strToUTF16(name), strToUTF16(description), strToUTF16(tokenPrefix), modeprm);
    const events = await submitTransactionAsync(alicePrivateKey, tx);
    const result = getCreateCollectionResult(events);

    // Get number of collections after the transaction
    const BcollectionCount = parseInt((await api.query.nft.createdCollectionCount()).toString(), 10);

    // Get the collection
    const collection: any = (await api.query.nft.collectionById(result.collectionId) as any).toJSON();

    // What to expect
    // tslint:disable-next-line:no-unused-expression
    expect(result.success).to.be.true;
    expect(result.collectionId).to.be.equal(BcollectionCount);
    // tslint:disable-next-line:no-unused-expression
    expect(collection).to.be.not.null;
    expect(BcollectionCount).to.be.equal(AcollectionCount + 1, 'Error: NFT collection NOT created.');
    if (senderSeed == '//Alice') {
      expect(collection.Owner).to.be.equal(toSubstrateAddress(alicesPublicKey));
    }
    expect(utf16ToStr(collection.Name)).to.be.equal(name);
    expect(utf16ToStr(collection.Description)).to.be.equal(description);
    expect(hexToStr(collection.TokenPrefix)).to.be.equal(tokenPrefix);

    collectionId = result.collectionId;
  });

  return collectionId;
}

export async function createCollectionExpectFailure(params: Partial<CreateCollectionParams> = {}) {
  const { name, description, mode, tokenPrefix } = { ...defaultCreateCollectionParams, ...params };

  let modeprm = {};
  if (mode.type === 'NFT') {
    modeprm = { nft: null };
  } else if (mode.type === 'Fungible') {
    modeprm = { fungible: mode.decimalPoints };
  } else if (mode.type === 'ReFungible') {
    modeprm = { refungible: null };
  } else if (mode.type === 'Invalid') {
    modeprm = { invalid: null };
  }

  await usingApi(async (api) => {
    // Get number of collections before the transaction
    const AcollectionCount = parseInt((await api.query.nft.createdCollectionCount()).toString());

    // Run the CreateCollection transaction
    const alicePrivateKey = privateKey('//Alice');
    const tx = api.tx.nft.createCollection(strToUTF16(name), strToUTF16(description), strToUTF16(tokenPrefix), modeprm);
    const events = await expect(submitTransactionExpectFailAsync(alicePrivateKey, tx)).to.be.rejected;
    const result = getCreateCollectionResult(events);

    // Get number of collections after the transaction
    const BcollectionCount = parseInt((await api.query.nft.createdCollectionCount()).toString());

    // What to expect
    // tslint:disable-next-line:no-unused-expression
    expect(result.success).to.be.false;
    expect(BcollectionCount).to.be.equal(AcollectionCount, 'Error: Collection with incorrect data created.');
  });
}

export async function findUnusedAddress(api: ApiPromise, seedAddition = ''): Promise<IKeyringPair> {
  let bal = new BigNumber(0);
  let unused;
  do {
    const randomSeed = 'seed' + Math.floor(Math.random() * Math.floor(10000)) + seedAddition;
    const keyring = new Keyring({ type: 'sr25519' });
    unused = keyring.addFromUri(`//${randomSeed}`);
    bal = new BigNumber((await api.query.system.account(unused.address)).data.free.toString());
  } while (bal.toFixed() != '0');
  return unused;
}

export async function getAllowance(collectionId: number, tokenId: number, owner: string, approved: string) {
  return await usingApi(async (api) => {
    const bn = await api.query.nft.allowances(collectionId, [tokenId, owner, approved]) as unknown as BN;
    return BigInt(bn.toString());
  });
}

export function findUnusedAddresses(api: ApiPromise, amount: number): Promise<IKeyringPair[]> {
  return Promise.all(new Array(amount).fill(null).map(() => findUnusedAddress(api, '_' + Date.now())));
}

export async function findNotExistingCollection(api: ApiPromise): Promise<number> {
  const totalNumber = parseInt((await api.query.nft.createdCollectionCount()).toString(), 10) as unknown as number;
  const newCollection: number = totalNumber + 1;
  return newCollection;
}

function getDestroyResult(events: EventRecord[]): boolean {
  let success = false;
  events.forEach(({ event: { method } }) => {
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

    // Get the collection
    const collection: any = (await api.query.nft.collectionById(collectionId)).toJSON();

    // What to expect
    expect(result).to.be.true;
    expect(collection).to.be.null;
  });
}

export async function queryCollectionLimits(collectionId: number) {
  return await usingApi(async (api) => {
    return ((await api.query.nft.collectionById(collectionId)).toJSON() as any).Limits;
  });
}

export async function setCollectionLimitsExpectSuccess(sender: IKeyringPair, collectionId: number, limits: ICollectionLimits) {
  await usingApi(async (api) => {
    const tx = api.tx.nft.setCollectionLimits(collectionId, limits);
    const events = await submitTransactionAsync(sender, tx);
    const result = getGenericResult(events);

    expect(result.success).to.be.true;
  });
}

export async function setCollectionLimitsExpectFailure(sender: IKeyringPair, collectionId: number, limits: any) {
  await usingApi(async (api) => {
    const oldLimits = await queryCollectionLimits(collectionId);
    const newLimits = { ...oldLimits as any, ...limits };
    const tx = api.tx.nft.setCollectionLimits(collectionId, newLimits);
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
    const collection: any = (await api.query.nft.collectionById(collectionId)).toJSON();

    // What to expect
    expect(result.success).to.be.true;
    expect(collection.Sponsorship).to.deep.equal({
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
    const collection: any = (await api.query.nft.collectionById(collectionId)).toJSON();

    // What to expect
    expect(result.success).to.be.true;
    expect(collection.Sponsorship).to.be.deep.equal({ disabled: null });
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
    const collection: any = (await api.query.nft.collectionById(collectionId)).toJSON();

    // What to expect
    expect(result.success).to.be.true;
    expect(collection.Sponsorship).to.be.deep.equal({
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

export async function burnItemExpectSuccess(sender: IKeyringPair, collectionId: number, tokenId: number, owner: IKeyringPair, value = 0) {
  await usingApi(async (api) => {
    const tx = api.tx.nft.burnItem(collectionId, tokenId, normalizeAccountId(owner.address), value);
    const events = await submitTransactionAsync(sender, tx);
    const result = getGenericResult(events);
    // Get the item
    const item: any = (await api.query.nft.nftItemList(collectionId, tokenId)).toJSON();
    // What to expect
    // tslint:disable-next-line:no-unused-expression
    expect(result.success).to.be.true;
    // tslint:disable-next-line:no-unused-expression
    expect(item).to.be.null;
  });
}

export async function
approveExpectSuccess(
  collectionId: number,
  tokenId: number, owner: IKeyringPair, approved: IKeyringPair | CrossAccountId | string, amount: number | bigint = 1,
) {
  await usingApi(async (api: ApiPromise) => {
    approved = normalizeAccountId(approved);
    await api.query.nft.allowances(collectionId, [tokenId, owner.address, toSubstrateAddress(approved)]) as unknown as BN;
    const approveNftTx = api.tx.nft.approve(approved, collectionId, tokenId, amount);
    const events = await submitTransactionAsync(owner, approveNftTx);
    const result = getCreateItemResult(events);
    // tslint:disable-next-line:no-unused-expression
    expect(result.success).to.be.true;
    const allowanceAfter =
      await api.query.nft.allowances(collectionId, [tokenId, owner.address, toSubstrateAddress(approved)]) as unknown as BN;
    expect(allowanceAfter.toString()).to.be.equal(amount.toString());
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
    let balanceBefore = new BN(0);
    if (type === 'Fungible') {
      balanceBefore = await api.query.nft.balance(collectionId, toSubstrateAddress(to)) as unknown as BN;
    }
    const transferFromTx = api.tx.nft.transferFrom(normalizeAccountId(accountFrom), to, collectionId, tokenId, value);
    const events = await submitTransactionAsync(accountApproved, transferFromTx);
    const result = getCreateItemResult(events);
    // tslint:disable-next-line:no-unused-expression
    expect(result.success).to.be.true;
    if (type === 'NFT') {
      const nftItemData = (await api.query.nft.nftItemList(collectionId, tokenId) as any).toJSON() as ITokenDataType;
      expect(nftItemData.Owner).to.be.deep.equal(to);
    }
    if (type === 'Fungible') {
      const balanceAfter = (await api.query.nft.fungibleItemList(collectionId, toSubstrateAddress(to)) as any).Value as unknown as BN;
      expect(balanceAfter.sub(balanceBefore).toString()).to.be.equal(value.toString());
    }
    if (type === 'ReFungible') {
      const nftItemData =
        (await api.query.nft.reFungibleItemList(collectionId, tokenId) as any).toJSON() as IReFungibleTokenDataType;
      const expectedOwner = toSubstrateAddress(to);
      const ownerIndex = nftItemData.Owner.findIndex(v => toSubstrateAddress(v.Owner as any as string) == expectedOwner);
      expect(ownerIndex).to.not.equal(-1);
      expect(nftItemData.Owner[ownerIndex].Owner).to.be.deep.equal(normalizeAccountId(to));
      expect(nftItemData.Owner[ownerIndex].Fraction).to.be.greaterThanOrEqual(value as number);
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

export async function addCollectionAdminExpectSuccess(sender: IKeyringPair, collectionId: number, address: IKeyringPair) {
  await usingApi(async (api) => {
    const changeAdminTx = api.tx.nft.addCollectionAdmin(collectionId, normalizeAccountId(address.address));
    const events = await submitTransactionAsync(sender, changeAdminTx);
    const result = getCreateCollectionResult(events);
    expect(result.success).to.be.true;
  });
}

export async function
scheduleTransferExpectSuccess(
  collectionId: number,
  tokenId: number,
  sender: IKeyringPair,
  recipient: IKeyringPair,
  value: number | bigint = 1,
  blockTimeMs: number,
  blockSchedule: number,
) {
  await usingApi(async (api: ApiPromise) => {
    const blockNumber: number | undefined = await getBlockNumber(api);
    const expectedBlockNumber = blockNumber + blockSchedule;

    expect(blockNumber).to.be.greaterThan(0);
    const transferTx = await api.tx.nft.transfer(normalizeAccountId(recipient.address), collectionId, tokenId, value); 
    const scheduleTx = await api.tx.scheduler.schedule(expectedBlockNumber, null, 0, transferTx);

    await submitTransactionAsync(sender, scheduleTx);

    const recipientBalanceBefore = new BigNumber((await api.query.system.account(recipient.address)).data.free.toString());

    const nftItemDataBefore = (await api.query.nft.nftItemList(collectionId, tokenId)).toJSON() as any as ITokenDataType;
    expect(toSubstrateAddress(nftItemDataBefore.Owner)).to.be.equal(sender.address);

    // sleep for 4 blocks
    await new Promise(resolve => setTimeout(resolve, blockTimeMs * (blockSchedule + 1)));

    const recipientBalanceAfter = new BigNumber((await api.query.system.account(recipient.address)).data.free.toString());

    const nftItemData = (await api.query.nft.nftItemList(collectionId, tokenId)).toJSON() as unknown as ITokenDataType;
    expect(toSubstrateAddress(nftItemData.Owner)).to.be.equal(recipient.address);
    expect(recipientBalanceAfter.toNumber()).to.be.equal(recipientBalanceBefore.toNumber());
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

    let balanceBefore = new BN(0);
    if (type === 'Fungible') {
      balanceBefore = await api.query.nft.balance(collectionId, toSubstrateAddress(to)) as unknown as BN;
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
    expect(result.value.toString()).to.be.equal(value.toString());
    if (type === 'NFT') {
      const nftItemData = (await api.query.nft.nftItemList(collectionId, tokenId)).toJSON() as unknown as ITokenDataType;
      expect(nftItemData.Owner).to.be.deep.equal(to);
    }
    if (type === 'Fungible') {
      const balanceAfter = (await api.query.nft.fungibleItemList(collectionId, toSubstrateAddress(to)) as any).Value as unknown as BN;
      expect(balanceAfter.sub(balanceBefore).toString()).to.be.equal(value.toString());
    }
    if (type === 'ReFungible') {
      const nftItemData =
        (await api.query.nft.reFungibleItemList(collectionId, tokenId)).toJSON() as unknown as IReFungibleTokenDataType;
      expect(nftItemData.Owner[0].Owner).to.be.deep.equal(to);
      expect(nftItemData.Owner[0].Fraction.toString()).to.be.equal(value.toString());
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
    if (events && Array.isArray(events)) {
      const result = getCreateCollectionResult(events);
      // tslint:disable-next-line:no-unused-expression
      expect(result.success).to.be.false;
    }
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

export async function getFungibleBalance(
  collectionId: number,
  owner: string,
) {
  return await usingApi(async (api) => {
    const response = (await api.query.nft.fungibleItemList(collectionId, owner)).toJSON() as unknown as { Value: string };
    return BigInt(response.Value);
  });
}

export async function createFungibleItemExpectSuccess(
  sender: IKeyringPair,
  collectionId: number,
  data: CreateFungibleData,
  owner: CrossAccountId | string = sender.address,
) {
  return await usingApi(async (api) => {
    const tx = api.tx.nft.createItem(collectionId, normalizeAccountId(owner), { Fungible: data });

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
    const AItemCount = parseInt((await api.query.nft.itemListIndex(collectionId)).toString(), 10);
    const Aitem: any = (await api.query.nft.fungibleItemList(collectionId, toSubstrateAddress(to))).toJSON();
    const AItemBalance = new BigNumber(Aitem.Value);

    let tx;
    if (createMode === 'Fungible') {
      const createData = { fungible: { value: 10 } };
      tx = api.tx.nft.createItem(collectionId, to, createData);
    } else if (createMode === 'ReFungible') {
      const createData = { refungible: { const_data: [], variable_data: [], pieces: 100 } };
      tx = api.tx.nft.createItem(collectionId, to, createData);
    } else {
      const createData = { nft: { const_data: [], variable_data: [] } };
      tx = api.tx.nft.createItem(collectionId, to, createData);
    }

    const events = await submitTransactionAsync(sender, tx);
    const result = getCreateItemResult(events);

    const BItemCount = parseInt((await api.query.nft.itemListIndex(collectionId)).toString(), 10);
    const Bitem: any = (await api.query.nft.fungibleItemList(collectionId, toSubstrateAddress(to))).toJSON();
    const BItemBalance = new BigNumber(Bitem.Value);

    // What to expect
    // tslint:disable-next-line:no-unused-expression
    expect(result.success).to.be.true;
    if (createMode === 'Fungible') {
      expect(BItemBalance.minus(AItemBalance).toNumber()).to.be.equal(10);
    } else {
      expect(BItemCount).to.be.equal(AItemCount + 1);
    }
    expect(collectionId).to.be.equal(result.collectionId);
    expect(BItemCount.toString()).to.be.equal(result.itemId.toString());
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
    const collection: any = (await api.query.nft.collectionById(collectionId)).toJSON();

    // What to expect
    // tslint:disable-next-line:no-unused-expression
    expect(result.success).to.be.true;
    expect(collection.Access).to.be.equal(accessMode);
  });
}

export async function enableWhiteListExpectSuccess(sender: IKeyringPair, collectionId: number) {
  await setPublicAccessModeExpectSuccess(sender, collectionId, 'WhiteList');
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

    // Get the collection
    const collection: any = (await api.query.nft.collectionById(collectionId)).toJSON();

    // What to expect
    // tslint:disable-next-line:no-unused-expression
    expect(result.success).to.be.true;
    expect(collection.MintMode).to.be.equal(enabled);
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

export async function setChainLimitsExpectSuccess(sender: IKeyringPair, limits: IChainLimits) {
  await usingApi(async (api) => {
    // Run sudo transaction
    const tx = api.tx.nft.setChainLimits(limits);
    const tx2 = api.tx.sudo.sudo(tx);
    await submitTransactionAsync(sender, tx2);
  });
}

export async function isWhitelisted(collectionId: number, address: string) {
  let whitelisted = false;
  await usingApi(async (api) => {
    whitelisted = (await api.query.nft.whiteList(collectionId, address)).toJSON() as unknown as boolean;
  });
  return whitelisted;
}

export async function addToWhiteListExpectSuccess(sender: IKeyringPair, collectionId: number, address: string | AccountId) {
  await usingApi(async (api) => {

    const whiteListedBefore = (await api.query.nft.whiteList(collectionId, address)).toJSON();

    // Run the transaction
    const tx = api.tx.nft.addToWhiteList(collectionId, normalizeAccountId(address));
    const events = await submitTransactionAsync(sender, tx);
    const result = getGenericResult(events);

    const whiteListedAfter = (await api.query.nft.whiteList(collectionId, address)).toJSON();

    // What to expect
    // tslint:disable-next-line:no-unused-expression
    expect(result.success).to.be.true;
    // tslint:disable-next-line: no-unused-expression
    expect(whiteListedBefore).to.be.false;
    // tslint:disable-next-line: no-unused-expression
    expect(whiteListedAfter).to.be.true;
  });
}

export async function addToWhiteListAgainExpectSuccess(sender: IKeyringPair, collectionId: number, address: string | AccountId) {
  await usingApi(async (api) => {

    const whiteListedBefore = (await api.query.nft.whiteList(collectionId, address)).toJSON();

    // Run the transaction
    const tx = api.tx.nft.addToWhiteList(collectionId, normalizeAccountId(address));
    const events = await submitTransactionAsync(sender, tx);
    const result = getGenericResult(events);

    const whiteListedAfter = (await api.query.nft.whiteList(collectionId, address)).toJSON();

    // What to expect
    // tslint:disable-next-line:no-unused-expression
    expect(result.success).to.be.true;
    // tslint:disable-next-line: no-unused-expression
    expect(whiteListedBefore).to.be.true;
    // tslint:disable-next-line: no-unused-expression
    expect(whiteListedAfter).to.be.true;
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
  : Promise<ICollectionInterface | null> => {
  return (await api.query.nft.collectionById(collectionId)).toJSON() as unknown as ICollectionInterface;
};

export const getCreatedCollectionCount = async (api: ApiPromise): Promise<number> => {
  // set global object - collectionsCount
  return (await api.query.nft.createdCollectionCount() as unknown as BN).toNumber();
};

export async function queryCollectionExpectSuccess(collectionId: number): Promise<ICollectionInterface> {
  return await usingApi(async (api) => {
    return (await api.query.nft.collectionById(collectionId)).toJSON() as unknown as ICollectionInterface;
  });
}
