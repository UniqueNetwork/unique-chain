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

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import privateKey from './substrate/privateKey';
import usingApi from './substrate/substrate-api';
import {
  createItemExpectSuccess,
  createCollectionExpectSuccess,
  scheduleTransferExpectSuccess,
  setCollectionSponsorExpectSuccess,
  confirmSponsorshipExpectSuccess,
} from './util/helpers';

chai.use(chaiAsPromised);

describe.skip('Integration Test scheduler base transaction', () => {
  it('User can transfer owned token with delay (scheduler)', async () => {
    await usingApi(async () => {
      const alice = privateKey('//Alice');
      const bob = privateKey('//Bob');
      // nft
      const nftCollectionId = await createCollectionExpectSuccess();
      const newNftTokenId = await createItemExpectSuccess(alice, nftCollectionId, 'NFT');
      await setCollectionSponsorExpectSuccess(nftCollectionId, alice.address);
      await confirmSponsorshipExpectSuccess(nftCollectionId);

      await scheduleTransferExpectSuccess(nftCollectionId, newNftTokenId, alice, bob, 1, 4);
    });
  });
});
