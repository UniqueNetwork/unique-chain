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
import { usingPlaygrounds } from './util/playgrounds';

chai.use(chaiAsPromised);
const expect = chai.expect;

let donor: IKeyringPair;

before(async () => {
  await usingPlaygrounds(async (_, privateKeyWrapper) => {
    donor = privateKeyWrapper('//Alice');
  });
});

describe('Integration Test: ownerCanTransfer allows admins to use only transferFrom/burnFrom:', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;
  let charlie: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper) => {
      [alice, bob, charlie] = await helper.arrange.createAccounts([10n, 10n, 10n], donor);
    });
  });

  it('admin transfers other user\'s token', async () => {
    await usingPlaygrounds(async (helper) => {
      const {collectionId} = await helper.nft.mintCollection(alice, {name: 'name', description: 'descr', tokenPrefix: 'COL'});
      const setLimitsResult = await helper.collection.setLimits(alice, collectionId, {ownerCanTransfer: true});
      const limits = await helper.collection.getEffectiveLimits(collectionId);
      expect(limits.ownerCanTransfer).to.be.true;

      const {tokenId} = await helper.nft.mintToken(alice, {collectionId: collectionId, owner: bob.address});
      const transferResult = async () => helper.nft.transferToken(alice, collectionId, tokenId, {Substrate: charlie.address});
      await expect(transferResult()).to.be.rejected;

      const res = await helper.nft.transferTokenFrom(alice, collectionId, tokenId, {Substrate: bob.address}, {Substrate: charlie.address});
      const newTokenOwner = await helper.nft.getTokenOwner(collectionId, tokenId);
      expect(newTokenOwner.Substrate).to.be.equal(charlie.address);
    });
  });

  it('admin burns other user\'s token', async () => {
    await usingPlaygrounds(async (helper) => {
      const {collectionId} = await helper.nft.mintCollection(alice, {name: 'name', description: 'descr', tokenPrefix: 'COL'});

      const setLimitsResult = await helper.collection.setLimits(alice, collectionId, {ownerCanTransfer: true});
      const limits = await helper.collection.getEffectiveLimits(collectionId);
      expect(limits.ownerCanTransfer).to.be.true;

      const {tokenId} = await helper.nft.mintToken(alice, {collectionId: collectionId, owner: bob.address});
      const burnTxFailed = async () => helper.nft.burnToken(alice, collectionId, tokenId);

      await expect(burnTxFailed()).to.be.rejected;

      const burnResult = await helper.nft.burnToken(bob, collectionId, tokenId);
      const token = await helper.nft.getToken(collectionId, tokenId);
      expect(token).to.be.null;
    });
  });
});
