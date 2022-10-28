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

/* broken by design
// substrate transactions are sequential, not parallel
// the order of execution is indeterminate

import { IKeyringPair } from '@polkadot/types/types';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import privateKey from '../substrate/privateKey';
import usingApi from '../substrate/substrate-api';
import {
  createCollectionExpectSuccess,
  setCollectionSponsorExpectSuccess,
  waitNewBlocks,
} from '../util/helpers';

chai.use(chaiAsPromised);
const expect = chai.expect;
let Alice: IKeyringPair;
let Bob: IKeyringPair;
let Ferdie: IKeyringPair;

before(async () => {
  await usingApi(async () => {
    Alice = privateKey('//Alice');
    Bob = privateKey('//Bob');
    Ferdie = privateKey('//Ferdie');
  });
});

describe('Sponsored with new owner ', () => {
  // tslint:disable-next-line: max-line-length
  it('Confirmation of sponsorship of a collection in a block with a change in the owner of the collection: ', async () => {
    await usingApi(async (api) => {
      const collectionId = await createCollectionExpectSuccess();
      await setCollectionSponsorExpectSuccess(collectionId, Bob.address);
      await waitNewBlocks(2);
      const confirmSponsorship = api.tx.unique.confirmSponsorship(collectionId);
      const changeCollectionOwner = api.tx.unique.changeCollectionOwner(collectionId, Ferdie.address);
      await Promise.all([
        confirmSponsorship.signAndSend(Bob),
        changeCollectionOwner.signAndSend(Alice),
      ]);
      await waitNewBlocks(2);
      const collection: any = (await api.query.unique.collectionById(collectionId)).toJSON();
      expect(collection.sponsorship.confirmed).to.be.eq(Bob.address);
      expect(collection.owner).to.be.eq(Ferdie.address);
      await waitNewBlocks(2);
    });
  });
});
*/