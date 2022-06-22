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

import {default as usingApi} from './substrate/substrate-api';
import {IKeyringPair} from '@polkadot/types/types';
import {
  createCollectionExpectSuccess,
  createItemExpectSuccess,
  transferExpectSuccess,
  transferExpectFailure,
  getBalance,
  burnItemExpectSuccess,
  createMultipleItemsExpectSuccess,
  approveExpectSuccess,
  transferFromExpectSuccess,
  isTokenExists,
  getLastTokenId,
  getAllowance,
} from './util/helpers';

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
chai.use(chaiAsPromised);
const expect = chai.expect;

let alice: IKeyringPair;
let bob: IKeyringPair;

describe('integration test: Refungible functionality:', () => {
  before(async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      alice = privateKeyWrapper('//Alice');
      bob = privateKeyWrapper('//Bob');
    });
  });

  it('Create refungible collection and token. Token pieces transfer. Token repartition.', async () => {
    const createMode = 'ReFungible';
    const collectionId = await createCollectionExpectSuccess({mode: {type: createMode}});
    const tokenId = await createItemExpectSuccess(alice, collectionId, createMode);

    const args = [
      {ReFungible: {pieces: 1}},
      {ReFungible: {pieces: 2}},
      {ReFungible: {pieces: 3}},
    ];
    await createMultipleItemsExpectSuccess(alice, collectionId, args);

    let aliceBalance = BigInt(0);
    await usingApi(async api => {
      expect(await isTokenExists(api, collectionId, tokenId)).to.be.true;
      
      const itemsListIndexAfter = await getLastTokenId(api, collectionId);
      expect(itemsListIndexAfter).to.be.equal(4);

      aliceBalance = await getBalance(api, collectionId, alice.address, tokenId);
    });
    const transferAmount = BigInt(60);
    await transferExpectSuccess(collectionId, tokenId, alice, bob, transferAmount, 'ReFungible');
    aliceBalance = aliceBalance - transferAmount;
    await transferExpectFailure(collectionId, tokenId, alice, bob, aliceBalance + BigInt(1));
    await burnItemExpectSuccess(alice, collectionId, tokenId, aliceBalance - BigInt(1));
    await approveExpectSuccess(collectionId, tokenId, bob, alice.address, transferAmount);
    const bobBalance = transferAmount;
    const allowedAmount = BigInt(60);
    await transferFromExpectSuccess(collectionId, tokenId, alice, bob, alice, 40, 'ReFungible');

    await usingApi(async api => {
      expect(await getAllowance(api, collectionId, bob.address, alice.address, 0)).to.equal(bobBalance - allowedAmount);
    });
    
  });
});
