// Copyright 2019-2023 Unique Network (Gibraltar) Ltd.
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

import {ApiPromise} from '@polkadot/api';
import {IKeyringPair} from '@polkadot/types/types';
import {expect, itSub, usingPlaygrounds} from './util';
import {ICrossAccountId, IProperty} from './util/playgrounds/types';
import {UniqueHelper} from './util/playgrounds/unique';

describe('Performace tests', () => {
  let alice: IKeyringPair;
  const MAX_TOKENS_TO_MINT = 200;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      const donor = await privateKey({url: import.meta.url});
      [alice] = await helper.arrange.createAccounts([100_000n], donor);
    });
  });

  itSub('NFT tokens minting', async ({helper}) => {
    const propertyKey = 'prop-a';
    const collection = await helper.nft.mintCollection(alice, {
      name: 'test properties',
      description: 'test properties collection',
      tokenPrefix: 'TPC',
      tokenPropertyPermissions: [
        {key: propertyKey, permission: {mutable: true, collectionAdmin: true, tokenOwner: true}},
      ],
    });


    const results = [];
    const step = 1_000;
    const sizeOfKey = sizeOfEncodedStr(propertyKey);
    let currentSize = step;
    let startCount = 0;
    let minterFunc = tryMintUnsafeRPC;
    try {
      startCount = await tryMintUnsafeRPC(helper, alice, MAX_TOKENS_TO_MINT, collection.collectionId, {Substrate: alice.address});
    }
    catch (e) {
      startCount = await tryMintExplicit(helper, alice, MAX_TOKENS_TO_MINT, collection.collectionId, {Substrate: alice.address});
      minterFunc = tryMintExplicit;
    }
    results.push({propertySize: 0, tokens: startCount});

    while(currentSize <= 32_000) {
      const property = {key: propertyKey, value: 'A'.repeat(currentSize - sizeOfKey - sizeOfInt(currentSize))};
      const maxTokens = Math.ceil(results.map(x => x.tokens).reduce((a, b) => a + b) / results.length);
      const tokens = await minterFunc(helper, alice, maxTokens, collection.collectionId, {Substrate: alice.address}, property);
      results.push({propertySize: sizeOfProperty(property), tokens});
      currentSize += step;
      await helper.wait.newBlocks(2);
    }

    expect(results).to.be.deep.equal([
      {propertySize: 0, tokens: 200},
      {propertySize: 1000, tokens: 149},
      {propertySize: 2000, tokens: 149},
      {propertySize: 3000, tokens: 149},
      {propertySize: 4000, tokens: 149},
      {propertySize: 5000, tokens: 149},
      {propertySize: 6000, tokens: 149},
      {propertySize: 7000, tokens: 149},
      {propertySize: 8000, tokens: 149},
      {propertySize: 9000, tokens: 149},
      {propertySize: 10000, tokens: 149},
      {propertySize: 11000, tokens: 149},
      {propertySize: 12000, tokens: 149},
      {propertySize: 13000, tokens: 149},
      {propertySize: 14000, tokens: 149},
      {propertySize: 15000, tokens: 149},
      {propertySize: 16000, tokens: 149},
      {propertySize: 17000, tokens: 149},
      {propertySize: 18000, tokens: 149},
      {propertySize: 19000, tokens: 149},
      {propertySize: 20000, tokens: 149},
      {propertySize: 21000, tokens: 149},
      {propertySize: 22000, tokens: 149},
      {propertySize: 23000, tokens: 149},
      {propertySize: 24000, tokens: 149},
      {propertySize: 25000, tokens: 149},
      {propertySize: 26000, tokens: 149},
      {propertySize: 27000, tokens: 145},
      {propertySize: 28000, tokens: 140},
      {propertySize: 29000, tokens: 135},
      {propertySize: 30000, tokens: 130},
      {propertySize: 31000, tokens: 126},
      {propertySize: 32000, tokens: 122},
    ]);
  });
});


const dryRun = async (api: ApiPromise, signer: IKeyringPair, tx: any) => {
  const signed = await tx.signAsync(signer);
  const dryRun = await api.rpc.system.dryRun(signed.toHex());
  return dryRun.isOk && dryRun.asOk.isOk;
};

const getTokens = (tokensCount: number, owner: ICrossAccountId, property?: IProperty) => (new Array(tokensCount)).fill(0).map(() => {
  const token = {owner} as {owner: ICrossAccountId, properties?: IProperty[]};
  if(property) token.properties = [property];
  return token;
});

const tryMintUnsafeRPC = async (helper: UniqueHelper, signer: IKeyringPair, tokensCount: number, collectionId: number, owner: ICrossAccountId, property?: IProperty): Promise<number> => {
  if(tokensCount < 10) console.log('try mint', tokensCount, 'tokens');
  const tokens = getTokens(tokensCount, owner, property);
  const tx = helper.constructApiCall('api.tx.unique.createMultipleItemsEx', [collectionId, {NFT: tokens}]);
  if(!(await dryRun(helper.getApi(), signer, tx))) {
    if(tokensCount < 2) return 0;
    return await tryMintUnsafeRPC(helper, signer, tokensCount - 1, collectionId, owner, property);
  }
  await helper.executeExtrinsic(signer, 'api.tx.unique.createMultipleItemsEx', [collectionId, {NFT: tokens}]);
  return tokensCount;
};

const tryMintExplicit = async (helper: UniqueHelper, signer: IKeyringPair, tokensCount: number, collectionId: number, owner: ICrossAccountId, property?: IProperty): Promise<number> => {
  const tokens = getTokens(tokensCount, owner, property);
  try {
    await helper.executeExtrinsic(signer, 'api.tx.unique.createMultipleItemsEx', [collectionId, {NFT: tokens}]);
  }
  catch (e) {
    if(tokensCount < 2) return 0;
    return await tryMintExplicit(helper, signer, tokensCount - 1, collectionId, owner, property);
  }
  return tokensCount;
};

function sizeOfProperty(prop: IProperty) {
  return sizeOfEncodedStr(prop.key) + sizeOfEncodedStr(prop.value!);
}

function sizeOfInt(i: number) {
  if(i < 0 || i > 0xffffffff) throw new Error('out of range');
  if(i < 0b11_1111) {
    return 1;
  } else if(i < 0b11_1111_1111_1111) {
    return 2;
  } else if(i < 0b11_1111_1111_1111_1111_1111_1111_1111) {
    return 4;
  } else {
    return 5;
  }
}

const UTF8_ENCODER = new TextEncoder();
function sizeOfEncodedStr(v: string) {
  const encoded = UTF8_ENCODER.encode(v);
  return sizeOfInt(encoded.length) + encoded.length;
}
