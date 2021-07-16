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
  setTransferFlagExpectSuccess
} from './util/helpers';

chai.use(chaiAsPromised);

describe('Enable/Disable Transfers', () => {
  it.only('User can transfer token with enabled transfer flag', async () => {
    await usingApi(async () => {
      const Alice = privateKey('//Alice');
      const Bob = privateKey('//Bob');
      // nft
      const nftCollectionId = await createCollectionExpectSuccess();
      const newNftTokenId = await createItemExpectSuccess(Alice, nftCollectionId, 'NFT');

      // explicitely set transfer flag
      await setTransferFlagExpectSuccess(Alice, nftCollectionId, true);

      await transferExpectSuccess(nftCollectionId, newNftTokenId, Alice, Bob, 1);
    });
  });

  it.only('User can\'n transfer token with disabled transfer flag', async () => {
    await usingApi(async () => {
      const Alice = privateKey('//Alice');
      const Bob = privateKey('//Bob');
      // nft
      const nftCollectionId = await createCollectionExpectSuccess();
      const newNftTokenId = await createItemExpectSuccess(Alice, nftCollectionId, 'NFT');

      // explicitely set transfer flag
      await setTransferFlagExpectSuccess(Alice, nftCollectionId, false);

      await transferExpectFailure(nftCollectionId, newNftTokenId, Alice, Bob, 1);
    });
  });
});
