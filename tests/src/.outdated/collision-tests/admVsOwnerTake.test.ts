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

describe('Admin vs Owner take token: ', () => {
  // tslint:disable-next-line: max-line-length
  it('The collection admin burns the token and in the same block the token owner performs a transaction on it ', async () => {
    await usingApi(async (api) => {
      const collectionId = await createCollectionExpectSuccess();
      const changeAdminTx = api.tx.unique.addCollectionAdmin(collectionId, normalizeAccountId(Bob.address));
      await submitTransactionAsync(Alice, changeAdminTx);
      const itemId = await createItemExpectSuccess(Bob, collectionId, 'NFT');
      //
      const sendItem = api.tx.unique.transfer(normalizeAccountId(Ferdie.address), collectionId, itemId, 1);
      const burnItem = api.tx.unique.burnItem(collectionId, itemId, 1);
      await Promise.all([
        sendItem.signAndSend(Bob),
        burnItem.signAndSend(Alice),
      ]);
      await waitNewBlocks(2);
      let itemBurn = false;
      itemBurn = (await (api.query.unique.nftItemList(collectionId, itemId))).toJSON() as boolean;
      // tslint:disable-next-line: no-unused-expression
      expect(itemBurn).to.be.null;
      await waitNewBlocks(2);
    });
  });
});
*/