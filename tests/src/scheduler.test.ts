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
