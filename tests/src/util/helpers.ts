//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import type { AccountId, EventRecord } from '@polkadot/types/interfaces';
import { ApiPromise, Keyring } from "@polkadot/api";
import { default as usingApi, submitTransactionAsync } from "../substrate/substrate-api";
import privateKey from '../substrate/privateKey';
import { alicesPublicKey, nullPublicKey } from "../accounts";
import { strToUTF16, utf16ToStr, hexToStr } from '../util/util';
import { IKeyringPair } from "@polkadot/types/types";
import { BigNumber } from 'bignumber.js';
import { Struct, Enum } from '@polkadot/types/codec';
import { u128 } from '@polkadot/types/primitive';

chai.use(chaiAsPromised);
const expect = chai.expect;

type GenericResult = {
  success: boolean,
};

type CreateCollectionResult = {
  success: boolean,
  collectionId: number
};

type CreateItemResult = {
  success: boolean,
  collectionId: number,
  itemId: number
};

export function getGenericResult(events: EventRecord[]): GenericResult {
  let result: GenericResult = {
    success: false
  }
  events.forEach(({ phase, event: { data, method, section } }) => {
    // console.log(`    ${phase}: ${section}.${method}:: ${data}`);
    if (method == 'ExtrinsicSuccess') {
      result.success = true;
    }
  });
  return result;
}

function getCreateCollectionResult(events: EventRecord[]): CreateCollectionResult {
  let success = false;
  let collectionId: number = 0;
  events.forEach(({ phase, event: { data, method, section } }) => {
    // console.log(`    ${phase}: ${section}.${method}:: ${data}`);
    if (method == 'ExtrinsicSuccess') {
      success = true;
    } else if ((section == 'nft') && (method == 'Created')) {
      collectionId = parseInt(data[0].toString());
    }
  });
  let result: CreateCollectionResult = {
    success,
    collectionId
  }
  return result;
}

function getCreateItemResult(events: EventRecord[]): CreateItemResult {
  let success = false;
  let collectionId: number = 0;
  let itemId: number = 0;
  events.forEach(({ phase, event: { data, method, section } }) => {
    // console.log(`    ${phase}: ${section}.${method}:: ${data}`);
    if (method == 'ExtrinsicSuccess') {
      success = true;
    } else if ((section == 'nft') && (method == 'ItemCreated')) {
      collectionId = parseInt(data[0].toString());
      itemId = parseInt(data[1].toString());
    }
  });
  let result: CreateItemResult = {
    success,
    collectionId,
    itemId
  }
  return result;
}

export async function createCollectionExpectSuccess(name: string, description: string, tokenPrefix: string, mode: string): Promise<number> {
  let collectionId: number = 0;
  await usingApi(async (api) => {
    // Get number of collections before the transaction
    const AcollectionCount = parseInt((await api.query.nft.createdCollectionCount()).toString());

    // Run the CreateCollection transaction
    const alicePrivateKey = privateKey('//Alice');
    const tx = api.tx.nft.createCollection(strToUTF16(name), strToUTF16(description), strToUTF16(tokenPrefix), mode);
    const events = await submitTransactionAsync(alicePrivateKey, tx);
    const result = getCreateCollectionResult(events);

    // Get number of collections after the transaction
    const BcollectionCount = parseInt((await api.query.nft.createdCollectionCount()).toString());

    // Get the collection 
    const collection: any = (await api.query.nft.collection(result.collectionId)).toJSON();

    // What to expect
    expect(result.success).to.be.true;
    expect(result.collectionId).to.be.equal(BcollectionCount);
    expect(collection).to.be.not.null;
    expect(BcollectionCount).to.be.equal(AcollectionCount+1, 'Error: NFT collection NOT created.');
    expect(collection.Owner).to.be.equal(alicesPublicKey);
    expect(utf16ToStr(collection.Name)).to.be.equal(name);
    expect(utf16ToStr(collection.Description)).to.be.equal(description);
    expect(hexToStr(collection.TokenPrefix)).to.be.equal(tokenPrefix);

    collectionId = result.collectionId;
  });

  return collectionId;
}
  
export async function createCollectionExpectFailure(name: string, description: string, tokenPrefix: string, mode: string) {
  await usingApi(async (api) => {
    // Get number of collections before the transaction
    const AcollectionCount = parseInt((await api.query.nft.createdCollectionCount()).toString());

    // Run the CreateCollection transaction
    const alicePrivateKey = privateKey('//Alice');
    const tx = api.tx.nft.createCollection(name, description, tokenPrefix, mode);
    const events = await submitTransactionAsync(alicePrivateKey, tx);
    const result = getCreateCollectionResult(events);

    // Get number of collections after the transaction
    const BcollectionCount = parseInt((await api.query.nft.createdCollectionCount()).toString());

    // What to expect
    expect(result.success).to.be.false;
    expect(BcollectionCount).to.be.equal(AcollectionCount, 'Error: Collection with incorrect data created.');
  });
}
  
export async function findUnusedAddress(api: ApiPromise): Promise<IKeyringPair> {
  let bal = new BigNumber(0);
  let unused;
  do {
    const randomSeed = 'seed' +  Math.floor(Math.random() * Math.floor(10000));
    const keyring = new Keyring({ type: 'sr25519' });
    unused = keyring.addFromUri(`//${randomSeed}`);
    bal = new BigNumber((await api.query.system.account(unused.address)).data.free.toString());
  } while (bal.toFixed() != '0');
  return unused; 
}

function getDestroyResult(events: EventRecord[]): boolean {
  let success: boolean = false;
  events.forEach(({ phase, event: { data, method, section } }) => {
    // console.log(`    ${phase}: ${section}.${method}:: ${data}`);
    if (method == 'ExtrinsicSuccess') {
      success = true;
    }
  });
  return success;
}

export async function destroyCollectionExpectFailure(collectionId: number, senderSeed: string = '//Alice') {
  await usingApi(async (api) => {
    // Run the DestroyCollection transaction
    const alicePrivateKey = privateKey(senderSeed);
    const tx = api.tx.nft.destroyCollection(collectionId);
    const events = await submitTransactionAsync(alicePrivateKey, tx);
    const result = getDestroyResult(events);

    // What to expect
    expect(result).to.be.false;
  });
}

export async function destroyCollectionExpectSuccess(collectionId: number, senderSeed: string = '//Alice') {
  await usingApi(async (api) => {
    // Run the DestroyCollection transaction
    const alicePrivateKey = privateKey(senderSeed);
    const tx = api.tx.nft.destroyCollection(collectionId);
    const events = await submitTransactionAsync(alicePrivateKey, tx);
    const result = getDestroyResult(events);

    // Get the collection 
    const collection: any = (await api.query.nft.collection(collectionId)).toJSON();

    // What to expect
    expect(result).to.be.true;
    expect(collection).to.be.not.null;
    expect(collection.Owner).to.be.equal(nullPublicKey);
  });
}

export async function setCollectionSponsorExpectSuccess(collectionId: number, sponsor: string) {
  await usingApi(async (api) => {

    // Run the transaction
    const alicePrivateKey = privateKey('//Alice');
    const tx = api.tx.nft.setCollectionSponsor(collectionId, sponsor);
    const events = await submitTransactionAsync(alicePrivateKey, tx);
    const result = getGenericResult(events);

    // Get the collection 
    const collection: any = (await api.query.nft.collection(collectionId)).toJSON();

    // What to expect
    expect(result.success).to.be.true;
    expect(collection.Sponsor.toString()).to.be.equal(sponsor.toString());
    expect(collection.SponsorConfirmed).to.be.false;
  });
}

export async function removeCollectionSponsorExpectSuccess(collectionId: number) {
  await usingApi(async (api) => {

    // Run the transaction
    const alicePrivateKey = privateKey('//Alice');
    const tx = api.tx.nft.removeCollectionSponsor(collectionId);
    const events = await submitTransactionAsync(alicePrivateKey, tx);
    const result = getGenericResult(events);

    // Get the collection 
    const collection: any = (await api.query.nft.collection(collectionId)).toJSON();

    // What to expect
    expect(result.success).to.be.true;
    expect(collection.Sponsor).to.be.equal(nullPublicKey);
    expect(collection.SponsorConfirmed).to.be.false;
  });
}

export async function removeCollectionSponsorExpectFailure(collectionId: number) {
  await usingApi(async (api) => {

    // Run the transaction
    const alicePrivateKey = privateKey('//Alice');
    const tx = api.tx.nft.removeCollectionSponsor(collectionId);
    const events = await submitTransactionAsync(alicePrivateKey, tx);
    const result = getGenericResult(events);

    // What to expect
    expect(result.success).to.be.false;
  });
}

export async function setCollectionSponsorExpectFailure(collectionId: number, sponsor: string, senderSeed: string = '//Alice') {
  await usingApi(async (api) => {

    // Run the transaction
    const alicePrivateKey = privateKey(senderSeed);
    const tx = api.tx.nft.setCollectionSponsor(collectionId, sponsor);
    const events = await submitTransactionAsync(alicePrivateKey, tx);
    const result = getGenericResult(events);

    // What to expect
    expect(result.success).to.be.false;
  });
}

export async function confirmSponsorshipExpectSuccess(collectionId: number, senderSeed: string = '//Alice') {
  await usingApi(async (api) => {

    // Run the transaction
    const sender = privateKey(senderSeed);
    const tx = api.tx.nft.confirmSponsorship(collectionId);
    const events = await submitTransactionAsync(sender, tx);
    const result = getGenericResult(events);

    // Get the collection 
    const collection: any = (await api.query.nft.collection(collectionId)).toJSON();

    // What to expect
    expect(result.success).to.be.true;
    expect(collection.Sponsor).to.be.equal(sender.address);
    expect(collection.SponsorConfirmed).to.be.true;
  });
}

export async function confirmSponsorshipExpectFailure(collectionId: number, senderSeed: string = '//Alice') {
  await usingApi(async (api) => {

    // Run the transaction
    const sender = privateKey(senderSeed);
    const tx = api.tx.nft.confirmSponsorship(collectionId);
    const events = await submitTransactionAsync(sender, tx);
    const result = getGenericResult(events);

    // What to expect
    expect(result.success).to.be.false;
  });
}

export interface CreateFungibleData extends Struct {
  readonly value: u128;
};

export interface CreateReFungibleData extends Struct {};
export interface CreateNftData extends Struct {};

export interface CreateItemData extends Enum {
  NFT: CreateNftData,
  Fungible: CreateFungibleData,
  ReFungible: CreateReFungibleData
};

export async function createItemExpectSuccess(sender: IKeyringPair, collectionId: number, createMode: string, owner: string = '') {
  let newItemId: number = 0;
  await usingApi(async (api) => {
    const AItemCount = parseInt((await api.query.nft.itemListIndex(collectionId)).toString());
    const Aitem: any = (await api.query.nft.fungibleItemList(collectionId, owner)).toJSON();    
    const AItemBalance = new BigNumber(Aitem.Value);

    if (owner === '') owner = sender.address;

    let tx;
    if (createMode == 'Fungible') {
      let createData = {fungible: {value: 10}};
      tx = api.tx.nft.createItem(collectionId, owner, createData);
    }
    else {
      tx = api.tx.nft.createItem(collectionId, owner, createMode);
    }
    const events = await submitTransactionAsync(sender, tx);
    const result = getCreateItemResult(events);

    const BItemCount = parseInt((await api.query.nft.itemListIndex(collectionId)).toString());
    const Bitem: any = (await api.query.nft.fungibleItemList(collectionId, owner)).toJSON();    
    const BItemBalance = new BigNumber(Bitem.Value);

    // What to expect
    expect(result.success).to.be.true;
    if (createMode == 'Fungible') {
      expect(BItemBalance.minus(AItemBalance).toNumber()).to.be.equal(10);
    }
    else {
      expect(BItemCount).to.be.equal(AItemCount+1);
    }
    expect(collectionId).to.be.equal(result.collectionId);
    expect(BItemCount).to.be.equal(result.itemId);
    newItemId = result.itemId;
  });
  return newItemId;
}

export async function enableWhiteListExpectSuccess(sender: IKeyringPair, collectionId: number) {
  await usingApi(async (api) => {

    // Run the transaction
    const tx = api.tx.nft.setPublicAccessMode(collectionId, 'WhiteList');
    const events = await submitTransactionAsync(sender, tx);
    const result = getGenericResult(events);

    // Get the collection 
    const collection: any = (await api.query.nft.collection(collectionId)).toJSON();

    // What to expect
    expect(result.success).to.be.true;
    expect(collection.Access).to.be.equal('WhiteList');
  });
}

export async function enablePublicMintingExpectSuccess(sender: IKeyringPair, collectionId: number) {
  await usingApi(async (api) => {

    // Run the transaction
    const tx = api.tx.nft.setMintPermission(collectionId, true);
    const events = await submitTransactionAsync(sender, tx);
    const result = getGenericResult(events);

    // Get the collection 
    const collection: any = (await api.query.nft.collection(collectionId)).toJSON();

    // What to expect
    expect(result.success).to.be.true;
    expect(collection.MintMode).to.be.equal(true);
  });
}

export async function addToWhiteListExpectSuccess(sender: IKeyringPair, collectionId: number, address: string) {
  await usingApi(async (api) => {

    // Run the transaction
    const tx = api.tx.nft.addToWhiteList(collectionId, address);
    const events = await submitTransactionAsync(sender, tx);
    const result = getGenericResult(events);

    // Get the collection 
    const collection: any = (await api.query.nft.collection(collectionId)).toJSON();

    // What to expect
    expect(result.success).to.be.true;
    expect(collection.MintMode).to.be.equal(true);
  });
}

