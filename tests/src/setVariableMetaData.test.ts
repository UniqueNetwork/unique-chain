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

import {IKeyringPair} from '@polkadot/types/types';
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
  addCollectionAdminExpectSuccess,
  setMetadataUpdatePermissionFlagExpectSuccess,
  getVariableMetadata,
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
      collectionId = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
      tokenId = await createItemExpectSuccess(alice, collectionId, 'NFT');
    });
  });

  it('execute setVariableMetaData', async () => {
    await setVariableMetaDataExpectSuccess(alice, collectionId, tokenId, data);
  });

  it('verify data was set', async () => {
    await usingApi(async api => {
      expect(await getVariableMetadata(api, collectionId, tokenId)).to.deep.equal(data);
    });
  });
});

describe('Integration Test collection admin setVariableMetaData', () => {
  const data = [1, 2, 254, 255];

  let alice: IKeyringPair;
  let bob: IKeyringPair;
  let collectionId: number;
  let tokenId: number;
  before(async () => {
    await usingApi(async () => {
      alice = privateKey('//Alice');
      bob = privateKey('//Bob');
      collectionId = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
      tokenId = await createItemExpectSuccess(alice, collectionId, 'NFT');
      await setMetadataUpdatePermissionFlagExpectSuccess(alice, collectionId, 'Admin');
      await addCollectionAdminExpectSuccess(alice, collectionId, bob.address);
    });
  });

  it('execute setVariableMetaData', async () => {
    await setVariableMetaDataExpectSuccess(bob, collectionId, tokenId, data);
  });

  it('verify data was set', async () => {
    await usingApi(async api => {
      expect(await getVariableMetadata(api, collectionId, tokenId)).to.deep.equal(data);
    });
  });
});

describe('Negative Integration Test setVariableMetaData', () => {
  const data = [1];

  let alice: IKeyringPair;
  let bob: IKeyringPair;

  let validCollectionId: number;
  let validTokenId: number;

  before(async () => {
    await usingApi(async () => {
      alice = privateKey('//Alice');
      bob = privateKey('//Bob');

      validCollectionId = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
      validTokenId = await createItemExpectSuccess(alice, validCollectionId, 'NFT');
    });
  });

  it('fails on not existing collection id', async () => {
    await usingApi(async api => {
      const nonExistingCollectionId = await findNotExistingCollection(api);
      await setVariableMetaDataExpectFailure(alice, nonExistingCollectionId, 1, data);
    });
  });
  it('fails on removed collection id', async () => {
    const removedCollectionId = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
    const removedCollectionTokenId = await createItemExpectSuccess(alice, removedCollectionId, 'NFT');

    await destroyCollectionExpectSuccess(removedCollectionId);
    await setVariableMetaDataExpectFailure(alice, removedCollectionId, removedCollectionTokenId, data);
  });
  it('fails on removed token', async () => {
    const removedTokenCollectionId = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
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
    const fungibleCollectionId = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});
    const fungibleTokenId = await createItemExpectSuccess(alice, fungibleCollectionId, 'Fungible');

    await setVariableMetaDataExpectFailure(alice, fungibleCollectionId, fungibleTokenId, data);
  });
  it('fails on bad sender', async () => {
    await setVariableMetaDataExpectFailure(bob, validCollectionId, validTokenId, data);
  });
});
