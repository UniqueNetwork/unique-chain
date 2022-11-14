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
import { alicesPublicKey, bobsPublicKey } from '../accounts';
import getBalance from '../substrate/get-balance';
import privateKey from '../substrate/privateKey';
import usingApi, { submitTransactionAsync } from '../substrate/substrate-api';
import {
  confirmSponsorshipExpectSuccess,
  createCollectionExpectSuccess,
  createItemExpectSuccess,
  setCollectionSponsorExpectSuccess,
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

describe('Payment of commission if one block: ', () => {
  // tslint:disable-next-line: max-line-length
  it('Payment of commission if one block contains transactions for payment from the sponsor\'s balance and his (sponsor\'s) exclusion from the collection ', async () => {
    await usingApi(async (api) => {
      const collectionId = await createCollectionExpectSuccess();
      const changeAdminTxBob = api.tx.unique.addCollectionAdmin(collectionId, normalizeAccountId(Bob.address));
      await submitTransactionAsync(Alice, changeAdminTxBob);
      const itemId = await createItemExpectSuccess(Bob, collectionId, 'NFT');
      await setCollectionSponsorExpectSuccess(collectionId, Bob.address);
      await confirmSponsorshipExpectSuccess(collectionId, '//Bob');

      const [alicesBalanceBefore, bobsBalanceBefore] = await getBalance(api, [alicesPublicKey, bobsPublicKey]);
      const sendItem = api.tx.unique.transfer(normalizeAccountId(Alice.address), collectionId, itemId, 1);
      const revokeSponsor = api.tx.unique.removeCollectionSponsor(collectionId);
      await Promise.all([
        sendItem.signAndSend(Bob),
        revokeSponsor.signAndSend(Alice),
      ]);
      const [alicesBalanceAfter, bobsBalanceAfter] = await getBalance(api, [alicesPublicKey, bobsPublicKey]);
      // tslint:disable-next-line:no-unused-expression
      expect(alicesBalanceAfter === alicesBalanceBefore).to.be.true;
      // tslint:disable-next-line:no-unused-expression
      expect(bobsBalanceAfter === bobsBalanceBefore).to.be.true;
      await waitNewBlocks(2);
    });
  });
});
*/