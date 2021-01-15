//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//
import { ApiPromise } from '@polkadot/api';
import BN from 'bn.js';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import privateKey from './substrate/privateKey';
import { default as usingApi, submitTransactionAsync, submitTransactionExpectFailAsync } from './substrate/substrate-api';
import {
  approveExpectSuccess,
  createCollectionExpectSuccess,
  createItemExpectSuccess,
  destroyCollectionExpectSuccess,
  transferFromExpectSuccess,
} from './util/helpers';
import {IKeyringPair} from "@polkadot/types/types";

chai.use(chaiAsPromised);
const expect = chai.expect;

describe('Integration Test transferFrom(from, recipient, collection_id, item_id, value):', () => {
  it('Execute the extrinsic and check nftItemList - owner of token', async () => {
    await usingApi(async (api: ApiPromise) => {
      const Alice = privateKey('//Alice');
      const Bob = privateKey('//Bob');
      const Charlie = privateKey('//CHARLIE');
      const nftCollectionId = await createCollectionExpectSuccess();
      console.log('nftCollectionId', nftCollectionId);
      const collectionInfo = await api.query.nft.collection(nftCollectionId);
      console.log('collectionInfo', collectionInfo);
      // nft
      const newNftTokenId = await createItemExpectSuccess(Alice, nftCollectionId, 'NFT');
      await approveExpectSuccess(nftCollectionId, newNftTokenId, Alice, Bob);

      await transferFromExpectSuccess(nftCollectionId, newNftTokenId, Alice, Charlie, 1, 'NFT');

      // fungible
      /*const fungibleCollectionId = await createCollectionExpectSuccess({mode: 'Fungible'});
      const newFungibleTokenId = await createItemExpectSuccess(Alice, fungibleCollectionId, 'Fungible');
      await approveExpectSuccess(fungibleCollectionId, newFungibleTokenId, Alice, Bob);
      // reFungible
      const reFungibleCollectionId = await createCollectionExpectSuccess({mode: 'ReFungible'});
      const newReFungibleTokenId = await createItemExpectSuccess(Alice, reFungibleCollectionId, 'ReFungible');
      await approveExpectSuccess(reFungibleCollectionId, newReFungibleTokenId, Alice, Bob);*/

      // garbage collection :-D
      await destroyCollectionExpectSuccess(nftCollectionId);
      // await destroyCollectionExpectSuccess(fungibleCollectionId);
      // await destroyCollectionExpectSuccess(reFungibleCollectionId);
    });
  });
});

describe('Negative Integration Test transferFrom(from, recipient, collection_id, item_id, value):', () => {
  it('transferFrom for a collection that does not exist', async () => {
    await usingApi(async (api: ApiPromise) => {

    });
  });

  it('transferFrom for a collection that was destroyed', async () => {
    await usingApi(async (api: ApiPromise) => {

    });
  });

  it('transferFrom a token that does not exist', async () => {
    await usingApi(async (api: ApiPromise) => {

    });
  });

  it('transferFrom a token that was deleted', async () => {
    await usingApi(async (api: ApiPromise) => {

    });
  });

  it('transferFrom for not approved address', async () => {
    await usingApi(async (api: ApiPromise) => {

    });
  });

  it('transferFrom incorrect token count', async () => {
    await usingApi(async (api: ApiPromise) => {

    });
  });

  it('execute transferFrom from account that is not owner of collection', async () => {
    await usingApi(async (api: ApiPromise) => {

    });
  });
});
