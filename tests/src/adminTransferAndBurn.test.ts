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
import {default as usingApi} from './substrate/substrate-api';
import {
  createCollectionExpectSuccess,
  createItemExpectSuccess,
  transferExpectFailure,
  transferFromExpectSuccess,
  burnItemExpectFailure,
  burnFromExpectSuccess,
  setCollectionLimitsExpectSuccess,
} from './util/helpers';

chai.use(chaiAsPromised);
const expect = chai.expect;

describe('Integration Test: ownerCanTransfer allows admins to use only transferFrom/burnFrom:', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;
  let charlie: IKeyringPair;

  before(async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      alice = privateKeyWrapper('//Alice');
      bob = privateKeyWrapper('//Bob');
      charlie = privateKeyWrapper('//Charlie');
    });
  });

  it('admin transfers other user\'s token', async () => {
    await usingApi(async () => {
      const collectionId = await createCollectionExpectSuccess();
      await setCollectionLimitsExpectSuccess(alice, collectionId, {ownerCanTransfer: true});

      const tokenId = await createItemExpectSuccess(alice, collectionId, 'NFT', {Substrate: bob.address});

      await transferExpectFailure(collectionId, tokenId, alice, charlie);

      await transferFromExpectSuccess(collectionId, tokenId, alice, bob, charlie, 1);
    });
  });

  it('admin burns other user\'s token', async () => {
    await usingApi(async () => {
      const collectionId = await createCollectionExpectSuccess();
      await setCollectionLimitsExpectSuccess(alice, collectionId, {ownerCanTransfer: true});

      const tokenId = await createItemExpectSuccess(alice, collectionId, 'NFT', {Substrate: bob.address});

      await burnItemExpectFailure(alice, collectionId, tokenId);

      await burnFromExpectSuccess(alice, bob, collectionId, tokenId);
    });
  });
})
