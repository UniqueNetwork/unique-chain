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
import usingApi from './substrate/substrate-api';
import {
  createItemExpectSuccess,
  createCollectionExpectSuccess,
  transferExpectSuccess,
  transferExpectFailure,
  setTransferFlagExpectSuccess,
  setTransferFlagExpectFailure,
} from './util/helpers';

chai.use(chaiAsPromised);

describe('Enable/Disable Transfers', () => {
  it('User can transfer token with enabled transfer flag', async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      const alice = privateKeyWrapper('//Alice');
      const bob = privateKeyWrapper('//Bob');
      // nft
      const nftCollectionId = await createCollectionExpectSuccess();
      const newNftTokenId = await createItemExpectSuccess(alice, nftCollectionId, 'NFT');

      // explicitely set transfer flag
      await setTransferFlagExpectSuccess(alice, nftCollectionId, true);

      await transferExpectSuccess(nftCollectionId, newNftTokenId, alice, bob, 1);
    });
  });

  it('User can\'n transfer token with disabled transfer flag', async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      const alice = privateKeyWrapper('//Alice');
      const bob = privateKeyWrapper('//Bob');
      // nft
      const nftCollectionId = await createCollectionExpectSuccess();
      const newNftTokenId = await createItemExpectSuccess(alice, nftCollectionId, 'NFT');

      // explicitely set transfer flag
      await setTransferFlagExpectSuccess(alice, nftCollectionId, false);

      await transferExpectFailure(nftCollectionId, newNftTokenId, alice, bob, 1);
    });
  });
});

describe('Negative Enable/Disable Transfers', () => {
  it('Non-owner cannot change transfer flag', async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      const bob = privateKeyWrapper('//Bob');
      // nft
      const nftCollectionId = await createCollectionExpectSuccess();

      // Change transfer flag
      await setTransferFlagExpectFailure(bob, nftCollectionId, false);
    });
  });
});
