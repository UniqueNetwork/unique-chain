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
  addToAllowListExpectSuccess,
  createCollectionExpectSuccess,
  getCreateItemResult,
  setMintPermissionExpectSuccess,
  normalizeAccountId,
  waitNewBlocks,
} from '../util/helpers';

chai.use(chaiAsPromised);
const expect = chai.expect;
let Alice: IKeyringPair;
let Bob: IKeyringPair;
let Ferdie: IKeyringPair;

const accountTokenOwnershipLimit = 4;
const sponsoredMintSize = 4294967295;
const tokenLimit = 4;
const sponsorTimeout = 14400;
const ownerCanTransfer = false;
const ownerCanDestroy = false;

before(async () => {
  await usingApi(async () => {
    Alice = privateKey('//Alice');
    Bob = privateKey('//Bob');
    Ferdie = privateKey('//Ferdie');
  });
});

describe('Token limit exceeded collection: ', () => {
  // tslint:disable-next-line: max-line-length
  it('The number of tokens created in the collection from different addresses exceeds the allowed collection limit ', async () => {
    await usingApi(async (api) => {
      const collectionId = await createCollectionExpectSuccess();
      await setMintPermissionExpectSuccess(Alice, collectionId, true);
      await addToAllowListExpectSuccess(Alice, collectionId, Ferdie.address);
      await addToAllowListExpectSuccess(Alice, collectionId, Bob.address);
      const setCollectionLim = api.tx.unique.setCollectionLimits(
        collectionId,
        {
          accountTokenOwnershipLimit,
          sponsoredMintSize,
          tokenLimit,
          // tslint:disable-next-line: object-literal-sort-keys
          sponsorTimeout,
          ownerCanTransfer,
          ownerCanDestroy,
        },
      );
      const subTx = await submitTransactionAsync(Alice, setCollectionLim);
      const subTxTesult = getCreateItemResult(subTx);
      // tslint:disable-next-line:no-unused-expression
      expect(subTxTesult.success).to.be.true;
      await waitNewBlocks(2);

      const args = [{ nft: ['0x31', '0x31'] }, { nft: ['0x32', '0x32'] }, { nft: ['0x33', '0x33'] }];
      const mintItemOne = api.tx.unique
        .createMultipleItems(collectionId, normalizeAccountId(Ferdie.address), args);
      const mintItemTwo = api.tx.unique
        .createMultipleItems(collectionId, normalizeAccountId(Bob.address), args);
      await Promise.all([
        mintItemOne.signAndSend(Ferdie),
        mintItemTwo.signAndSend(Bob),
      ]);
      await waitNewBlocks(2);
      const itemsListIndexAfter = await api.query.unique.itemListIndex(collectionId) as unknown as BN;
      expect(itemsListIndexAfter.toNumber()).to.be.equal(3);
      // TokenLimit = 4. The first transaction is successful. The second should fail.
      await waitNewBlocks(2);
    });
  });
});
*/
