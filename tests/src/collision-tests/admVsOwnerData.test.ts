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

before(async () => {
  await usingApi(async () => {
    Alice = privateKey('//Alice');
    Bob = privateKey('//Bob');
  });
});

describe('Admin vs Owner changes the data in the token: ', () => {
  it('The collection admin changes the data in the token and in the same block the token owner also changes the data in it ', async () => {
    await usingApi(async (api) => {
      const AliceData = 1;
      const BobData = 2;
      const collectionId = await createCollectionExpectSuccess();
      const changeAdminTx = api.tx.unique.addCollectionAdmin(collectionId, normalizeAccountId(Bob.address));
      await submitTransactionAsync(Alice, changeAdminTx);
      const itemId = await createItemExpectSuccess(Bob, collectionId, 'NFT');
      //
      // tslint:disable-next-line: max-line-length
      const AliceTx = api.tx.unique.setVariableMetaData(collectionId, itemId, AliceData.toString());
      // tslint:disable-next-line: max-line-length
      const BobTx = api.tx.unique.setVariableMetaData(collectionId, itemId, BobData.toString());
      await Promise.all([
        AliceTx.signAndSend(Alice),
        BobTx.signAndSend(Bob),
      ]);
      const item: any = await api.query.unique.nftItemList(collectionId, itemId);
      expect(item.variableData).not.to.be.eq(null); // Pseudo-random selection of one of two values
      await waitNewBlocks(2);
    });
  });
});
*/