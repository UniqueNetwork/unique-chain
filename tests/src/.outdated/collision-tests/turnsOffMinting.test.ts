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
  addToAllowListExpectSuccess,
  createCollectionExpectSuccess,
  setMintPermissionExpectSuccess,
  normalizeAccountId,
  waitNewBlocks,
} from '../util/helpers';

chai.use(chaiAsPromised);
const expect = chai.expect;
let Alice: IKeyringPair;
let Ferdie: IKeyringPair;

before(async () => {
  await usingApi(async () => {
    Alice = privateKey('//Alice');
    Ferdie = privateKey('//Ferdie');
  });
});

describe('Turns off minting mode: ', () => {
  // tslint:disable-next-line: max-line-length
  it('The collection owner turns off minting mode and there are minting transactions in the same block ', async () => {
    await usingApi(async (api) => {
      const collectionId = await createCollectionExpectSuccess();
      await setMintPermissionExpectSuccess(Alice, collectionId, true);
      await addToAllowListExpectSuccess(Alice, collectionId, Ferdie.address);

      const mintItem = api.tx.unique.createItem(collectionId, normalizeAccountId(Ferdie.address), 'NFT');
      const offMinting = api.tx.unique.setMintPermission(collectionId, false);
      await Promise.all([
        mintItem.signAndSend(Ferdie),
        offMinting.signAndSend(Alice),
      ]);
      let itemList = false;
      itemList = (await (api.query.unique.nftItemList(collectionId, mintItem))).toJSON() as boolean;
      // tslint:disable-next-line: no-unused-expression
      expect(itemList).to.be.null;
      await waitNewBlocks(2);
    });
  });
});
*/