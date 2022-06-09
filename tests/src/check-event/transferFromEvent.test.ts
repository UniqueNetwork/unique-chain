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

// https://unique-network.readthedocs.io/en/latest/jsapi.html#setchainlimits
import {ApiPromise} from '@polkadot/api';
import {IKeyringPair} from '@polkadot/types/types';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import usingApi, {submitTransactionAsync} from '../substrate/substrate-api';
import {createCollectionExpectSuccess, createItemExpectSuccess, uniqueEventMessage, normalizeAccountId} from '../util/helpers';

chai.use(chaiAsPromised);
const expect = chai.expect;

describe('Transfer from event ', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;
  const checkSection = 'Transfer';
  const checkTreasury = 'Deposit';
  const checkSystem = 'ExtrinsicSuccess';
  before(async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      alice = privateKeyWrapper('//Alice');
      bob = privateKeyWrapper('//Bob');
    });
  });
  it('Check event from transferFrom(): ', async () => {
    await usingApi(async (api: ApiPromise) => {
      const collectionID = await createCollectionExpectSuccess();
      const itemID = await createItemExpectSuccess(alice, collectionID, 'NFT');
      const transferFrom = api.tx.unique.transferFrom(normalizeAccountId(alice.address), normalizeAccountId(bob.address), collectionID, itemID, 1);
      const events = await submitTransactionAsync(alice, transferFrom);
      const msg = JSON.stringify(uniqueEventMessage(events));
      expect(msg).to.be.contain(checkSection);
      expect(msg).to.be.contain(checkTreasury);
      expect(msg).to.be.contain(checkSystem);
    });
  });
});
