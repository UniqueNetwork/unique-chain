//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

import { IKeyringPair } from '@polkadot/types/types';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import privateKey from './substrate/privateKey';
import usingApi from './substrate/substrate-api';
import {
  burnItemExpectSuccess,
  createCollectionExpectSuccess,
  createItemExpectSuccess,
  destroyCollectionExpectSuccess,
  findNotExistingCollection,
  setVariableMetaDataExpectFailure,
  setVariableMetaDataExpectSuccess,
} from './util/helpers';

chai.use(chaiAsPromised);
const expect = chai.expect;

describe('Integration Test setVariableMetaData', () => {
  const data = [1, 2, 254, 255];

  let alice: IKeyringPair;
  let collectionId: number;
  let tokenId: number;
  before(async () => {
    await usingApi(async () => {
      alice = privateKey('//Alice');
      collectionId = await createCollectionExpectSuccess({ mode: { type: 'NFT' } });
      tokenId = await createItemExpectSuccess(alice, collectionId, 'NFT');
    });
  });

  it('execute setVariableMetaData', async () => {
    await setVariableMetaDataExpectSuccess(alice, collectionId, tokenId, data);
  });

  it('verify data was set', async () => {
    await usingApi(async api => {
      const item: any = (await api.query.nft.nftItemList(collectionId, tokenId) as any).unwrap();

      expect(Array.from(item.VariableData)).to.deep.equal(Array.from(data));
    });
  });
});

describe('Negative Integration Test setVariableMetaData', () => {
  let data = [1];

  let alice: IKeyringPair;
  let bob: IKeyringPair;

  let validCollectionId: number;
  let validTokenId: number;

  before(async () => {
    await usingApi(async () => {
      alice = privateKey('//Alice');
      bob = privateKey('//Bob');

      validCollectionId = await createCollectionExpectSuccess({ mode: { type: 'NFT' } });
      validTokenId = await createItemExpectSuccess(alice, validCollectionId, 'NFT');
    });
  });

  it('fails on not existing collection id', async () => {
    await usingApi(async api => {
      let nonExistingCollectionId = await findNotExistingCollection(api);
      await setVariableMetaDataExpectFailure(alice, nonExistingCollectionId, 1, data);
    });
  });
  it('fails on removed collection id', async () => {
    const removedCollectionId = await createCollectionExpectSuccess({ mode: { type: 'NFT' } });
    const removedCollectionTokenId = await createItemExpectSuccess(alice, removedCollectionId, 'NFT');

    await destroyCollectionExpectSuccess(removedCollectionId);
    await setVariableMetaDataExpectFailure(alice, removedCollectionId, removedCollectionTokenId, data);
  });
  it('fails on removed token', async () => {
    const removedTokenCollectionId = await createCollectionExpectSuccess({ mode: { type: 'NFT' } });
    const removedTokenId = await createItemExpectSuccess(alice, removedTokenCollectionId, 'NFT');
    await burnItemExpectSuccess(alice, removedTokenCollectionId, removedTokenId);

    await setVariableMetaDataExpectFailure(alice, removedTokenCollectionId, removedTokenId, data);
  });
  it('fails on not existing token', async () => {
    const nonExistingTokenId = validTokenId + 1;

    await setVariableMetaDataExpectFailure(alice, validCollectionId, nonExistingTokenId, data);
  });
  it('fails on too long data', async () => {
    const tooLongData = new Array(4097).fill(0xff);

    await setVariableMetaDataExpectFailure(alice, validCollectionId, validTokenId, tooLongData);
  });
  it('fails on fungible token', async () => {
    const fungibleCollectionId = await createCollectionExpectSuccess({ mode: { type: 'Fungible', decimalPoints: 0 } });
    const fungibleTokenId = await createItemExpectSuccess(alice, fungibleCollectionId, 'Fungible');

    await setVariableMetaDataExpectFailure(alice, fungibleCollectionId, fungibleTokenId, data);
  });
  it('fails on bad sender', async () => {
    await setVariableMetaDataExpectFailure(bob, validCollectionId, validTokenId, data);
  });
});
