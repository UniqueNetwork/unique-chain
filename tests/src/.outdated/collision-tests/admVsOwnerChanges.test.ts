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
import usingApi, { submitTransactionAsync } from '../substrate/substrate-api';
import {
  createCollectionExpectSuccess,
  createItemExpectSuccess,
  normalizeAccountId,
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

describe('Admin vs Owner changes token: ', () => {
  // tslint:disable-next-line: max-line-length
  it('The collection admin changes the owner of the token and in the same block the current owner transfers the token to another address ', async () => {

    await usingApi(async (api) => {
      const collectionId = await createCollectionExpectSuccess();
      const changeAdminTxBob = api.tx.unique.addCollectionAdmin(collectionId, normalizeAccountId(Bob.address));
      await submitTransactionAsync(Alice, changeAdminTxBob);
      const changeAdminTxFerdie = api.tx.unique.addCollectionAdmin(collectionId, normalizeAccountId(Ferdie.address));
      await submitTransactionAsync(Bob, changeAdminTxFerdie);
      const itemId = await createItemExpectSuccess(Ferdie, collectionId, 'NFT');

      const changeOwner = api.tx.unique.transferFrom(normalizeAccountId(Ferdie.address), normalizeAccountId(Bob.address), collectionId, itemId, 1);
      const approve = api.tx.unique.approve(normalizeAccountId(Bob.address), collectionId, itemId, 1);
      const sendItem = api.tx.unique.transfer(normalizeAccountId(Alice.address), collectionId, itemId, 1);
      await Promise.all([
        changeOwner.signAndSend(Alice),
        approve.signAndSend(Bob),
        sendItem.signAndSend(Ferdie),
      ]);
      const itemBefore: any = await api.query.unique.nftItemList(collectionId, itemId);
      expect(itemBefore.owner).not.to.be.eq(Bob.address);
      await waitNewBlocks(2);
    });
  });
});
*/