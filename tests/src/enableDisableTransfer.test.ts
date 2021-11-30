//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import privateKey from './substrate/privateKey';
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
    await usingApi(async () => {
      const alice = privateKey('//Alice');
      const bob = privateKey('//Bob');
      // nft
      const nftCollectionId = await createCollectionExpectSuccess();
      const newNftTokenId = await createItemExpectSuccess(alice, nftCollectionId, 'NFT');

      // explicitely set transfer flag
      await setTransferFlagExpectSuccess(alice, nftCollectionId, true);

      await transferExpectSuccess(nftCollectionId, newNftTokenId, alice, bob, 1);
    });
  });

  it('User can\'n transfer token with disabled transfer flag', async () => {
    await usingApi(async () => {
      const alice = privateKey('//Alice');
      const bob = privateKey('//Bob');
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
    await usingApi(async () => {
      const bob = privateKey('//Bob');
      // nft
      const nftCollectionId = await createCollectionExpectSuccess();

      // Change transfer flag
      await setTransferFlagExpectFailure(bob, nftCollectionId, false);
    });
  });
});
