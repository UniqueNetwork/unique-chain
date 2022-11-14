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
import BN from 'bn.js';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import privateKey from '../substrate/privateKey';
import usingApi, { submitTransactionAsync } from '../substrate/substrate-api';
import {
  createCollectionExpectSuccess,
  normalizeAccountId,
  waitNewBlocks,
} from '../util/helpers';

chai.use(chaiAsPromised);
const expect = chai.expect;
let Alice: IKeyringPair;
let Bob: IKeyringPair;

before(async () => {
  await usingApi(async () => {
    Alice = privateKey('//Alice');
    Bob = privateKey('//Bob');
  });
});

describe('Deprivation of admin rights: ', () => {
  // tslint:disable-next-line: max-line-length
  it('In the block, the collection admin adds a token or changes data, and the collection owner deprives the admin of rights ', async () => {
    await usingApi(async (api) => {
      const collectionId = await createCollectionExpectSuccess();
      const changeAdminTx = api.tx.unique.addCollectionAdmin(collectionId, normalizeAccountId(Bob.address));
      await submitTransactionAsync(Alice, changeAdminTx);
      await waitNewBlocks(1);
      const args = [{ nft: ['0x31', '0x31'] }, { nft: ['0x32', '0x32'] }, { nft: ['0x33', '0x33'] }];
      const addItemAdm = api.tx.unique.createMultipleItems(collectionId, normalizeAccountId(Bob.address), args);
      const removeAdm = api.tx.unique.removeCollectionAdmin(collectionId, normalizeAccountId(Bob.address));
      await Promise.all([
        addItemAdm.signAndSend(Bob),
        removeAdm.signAndSend(Alice),
      ]);
      await waitNewBlocks(2);
      const itemsListIndex = await api.query.unique.itemListIndex(collectionId) as unknown as BN;
      expect(itemsListIndex.toNumber()).to.be.equal(0);
      const adminList: any = (await api.query.unique.adminList(collectionId));
      expect(adminList).not.to.be.contains(normalizeAccountId(Bob.address));
      await waitNewBlocks(2);
    });
  });
});
*/