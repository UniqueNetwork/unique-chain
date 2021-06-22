//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

import { IKeyringPair } from '@polkadot/types/types';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import privateKey from './substrate/privateKey';
import usingApi from './substrate/substrate-api';
import {
  createItemExpectSuccess,
  createCollectionExpectSuccess,
  destroyCollectionExpectSuccess,
  findNotExistingCollection,
  queryCollectionExpectSuccess,
  setOffchainSchemaExpectFailure,
  setOffchainSchemaExpectSuccess,
  transferExpectSuccess,
  scheduleTransferExpectSuccess,
  setCollectionSponsorExpectSuccess,
  confirmSponsorshipExpectSuccess
} from './util/helpers';


chai.use(chaiAsPromised);
const expect = chai.expect;

const DATA = [1, 2, 3, 4];

describe('Integration Test scheduler base transaction', () => {
  let alice: IKeyringPair;

  before(async () => {
    await usingApi(async () => {
      alice = privateKey('//Alice');
    });
  });

  it('User can transfer owned token with delay (scheduler)', async () => {
    await usingApi(async (api) => {
      const Alice = privateKey('//Alice');
      const Bob = privateKey('//Bob');
      // nft
      const nftCollectionId = await createCollectionExpectSuccess();
      const newNftTokenId = await createItemExpectSuccess(Alice, nftCollectionId, 'NFT');
      await setCollectionSponsorExpectSuccess(nftCollectionId, Alice.address);
      await confirmSponsorshipExpectSuccess(nftCollectionId);

      await scheduleTransferExpectSuccess(nftCollectionId, newNftTokenId, Alice, Bob, 1, 'NFT');
    });
  });

  
});

// describe('Negative Integration Test setOffchainSchema', () => {
//   let alice: IKeyringPair;
//   let bob: IKeyringPair;

//   let validCollectionId: number;

//   before(async () => {
//     await usingApi(async () => {
//       alice = privateKey('//Alice');
//       bob = privateKey('//Bob');

//       validCollectionId = await createCollectionExpectSuccess({ mode: { type: 'NFT' } });
//     });
//   });

//   it('fails on not existing collection id', async () => {
//     const nonExistingCollectionId = await usingApi(findNotExistingCollection);

//     await setOffchainSchemaExpectFailure(alice, nonExistingCollectionId, DATA);
//   });

//   it('fails on destroyed collection id', async () => {
//     const destroyedCollectionId = await createCollectionExpectSuccess({ mode: { type: 'NFT' } });
//     await destroyCollectionExpectSuccess(destroyedCollectionId);

//     await setOffchainSchemaExpectFailure(alice, destroyedCollectionId, DATA);
//   });

//   it('fails on too long data', async () => {
//     const tooLongData = new Array(4097).fill(0xff);

//     await setOffchainSchemaExpectFailure(alice, validCollectionId, tooLongData);
//   });

//   it('fails on execution by non-owner', async () => {
//     await setOffchainSchemaExpectFailure(bob, validCollectionId, DATA);
//   });
// });
