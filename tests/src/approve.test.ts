//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//
import { ApiPromise } from '@polkadot/api';
import BN from 'bn.js';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import privateKey from './substrate/privateKey';
import { default as usingApi } from './substrate/substrate-api';
import {
  approveExpectFail,
  approveExpectSuccess,
  createCollectionExpectSuccess,
  createFungibleItemExpectSuccess,
  createItemExpectSuccess,
  destroyCollectionExpectSuccess,
  transferFromExpectSuccess,
  U128_MAX,
} from './util/helpers';

chai.use(chaiAsPromised);
const expect = chai.expect;

describe('Integration Test approve(spender, collection_id, item_id, amount):', () => {
  it('Execute the extrinsic and check approvedList', async () => {
    await usingApi(async (api: ApiPromise) => {
      const Alice = privateKey('//Alice');
      const Bob = privateKey('//Bob');
      const nftCollectionId = await createCollectionExpectSuccess();
      // nft
      const newNftTokenId = await createItemExpectSuccess(Alice, nftCollectionId, 'NFT');
      await approveExpectSuccess(nftCollectionId, newNftTokenId, Alice, Bob);
      // fungible
      const fungibleCollectionId = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});
      const newFungibleTokenId = await createItemExpectSuccess(Alice, fungibleCollectionId, 'Fungible');
      await approveExpectSuccess(fungibleCollectionId, newFungibleTokenId, Alice, Bob);
      // reFungible
      const reFungibleCollectionId =
        await createCollectionExpectSuccess({mode: {type: 'ReFungible', decimalPoints: 0}});
      const newReFungibleTokenId = await createItemExpectSuccess(Alice, reFungibleCollectionId, 'ReFungible');
      await approveExpectSuccess(reFungibleCollectionId, newReFungibleTokenId, Alice, Bob);
    });
  });

  it('Remove approval by using 0 amount', async () => {
    await usingApi(async (api: ApiPromise) => {
      const Alice = privateKey('//Alice');
      const Bob = privateKey('//Bob');
      const nftCollectionId = await createCollectionExpectSuccess();
      // nft
      const newNftTokenId = await createItemExpectSuccess(Alice, nftCollectionId, 'NFT');
      await approveExpectSuccess(nftCollectionId, newNftTokenId, Alice, Bob, 1);
      await approveExpectSuccess(nftCollectionId, newNftTokenId, Alice, Bob, 0);
      // fungible
      const fungibleCollectionId = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});
      const newFungibleTokenId = await createItemExpectSuccess(Alice, fungibleCollectionId, 'Fungible');
      await approveExpectSuccess(fungibleCollectionId, newFungibleTokenId, Alice, Bob, 1);
      await approveExpectSuccess(fungibleCollectionId, newFungibleTokenId, Alice, Bob, 0);
      // reFungible
      const reFungibleCollectionId =
        await createCollectionExpectSuccess({mode: {type: 'ReFungible', decimalPoints: 0}});
      const newReFungibleTokenId = await createItemExpectSuccess(Alice, reFungibleCollectionId, 'ReFungible');
      await approveExpectSuccess(reFungibleCollectionId, newReFungibleTokenId, Alice, Bob, 1);
      await approveExpectSuccess(reFungibleCollectionId, newReFungibleTokenId, Alice, Bob, 0);
    });
  });

  it('Approve twice with overflowing total sum', async () => {
    await usingApi(async () => {
      const alice = privateKey('//Alice');
      const bob = privateKey('//Bob');
      const charlie = privateKey('//Charlie');

      // fungible
      const fungibleCollectionId = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});
      const newFungibleTokenId = await createFungibleItemExpectSuccess(alice, fungibleCollectionId, { Value: U128_MAX });

      await approveExpectSuccess(fungibleCollectionId, newFungibleTokenId, alice, bob, U128_MAX);
      await transferFromExpectSuccess(fungibleCollectionId, newFungibleTokenId, bob, alice, charlie, U128_MAX, 'Fungible');
      await approveExpectSuccess(fungibleCollectionId, newFungibleTokenId, alice, bob, 1);
    });
  });
});

describe('Negative Integration Test approve(spender, collection_id, item_id, amount):', () => {
  it('Approve for a collection that does not exist', async () => {
    await usingApi(async (api: ApiPromise) => {
      const Alice = privateKey('//Alice');
      const Bob = privateKey('//Bob');
      // nft
      const nftCollectionCount = await api.query.nft.createdCollectionCount() as unknown as number;
      await approveExpectFail(nftCollectionCount + 1, 1, Alice, Bob);
      // fungible
      const fungibleCollectionCount = await api.query.nft.createdCollectionCount() as unknown as number;
      await approveExpectFail(fungibleCollectionCount + 1, 1, Alice, Bob);
      // reFungible
      const reFungibleCollectionCount = await api.query.nft.createdCollectionCount() as unknown as number;
      await approveExpectFail(reFungibleCollectionCount + 1, 1, Alice, Bob);
    });
  });

  it('Approve for a collection that was destroyed', async () => {
    await usingApi(async (api: ApiPromise) => {
      const Alice = privateKey('//Alice');
      const Bob = privateKey('//Bob');
      // nft
      const nftCollectionId = await createCollectionExpectSuccess();
      await destroyCollectionExpectSuccess(nftCollectionId);
      await approveExpectFail(nftCollectionId, 1, Alice, Bob);
      // fungible
      const fungibleCollectionId = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});
      await destroyCollectionExpectSuccess(fungibleCollectionId);
      await approveExpectFail(fungibleCollectionId, 1, Alice, Bob);
      // reFungible
      const reFungibleCollectionId =
        await createCollectionExpectSuccess({mode: {type: 'ReFungible', decimalPoints: 0}});
      await destroyCollectionExpectSuccess(reFungibleCollectionId);
      await approveExpectFail(reFungibleCollectionId, 1, Alice, Bob);
    });
  });

  it('Approve transfer of a token that does not exist', async () => {
    await usingApi(async (api: ApiPromise) => {
      const Alice = privateKey('//Alice');
      const Bob = privateKey('//Bob');
      // nft
      const nftCollectionId = await createCollectionExpectSuccess();
      await approveExpectFail(nftCollectionId, 2, Alice, Bob);
      // fungible
      const fungibleCollectionId = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});
      await approveExpectFail(fungibleCollectionId, 2, Alice, Bob);
      // reFungible
      const reFungibleCollectionId =
        await createCollectionExpectSuccess({mode: {type: 'ReFungible', decimalPoints: 0}});
      await approveExpectFail(reFungibleCollectionId, 2, Alice, Bob);
    });
  });

  it('Approve using the address that does not own the approved token', async () => {
    await usingApi(async (api: ApiPromise) => {
      const Alice = privateKey('//Alice');
      const Bob = privateKey('//Bob');
      const nftCollectionId = await createCollectionExpectSuccess();
      // nft
      const newNftTokenId = await createItemExpectSuccess(Alice, nftCollectionId, 'NFT');
      await approveExpectFail(nftCollectionId, newNftTokenId, Bob, Alice);
      // fungible
      const fungibleCollectionId = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});
      const newFungibleTokenId = await createItemExpectSuccess(Alice, fungibleCollectionId, 'Fungible');
      await approveExpectFail(fungibleCollectionId, newFungibleTokenId, Bob, Alice);
      // reFungible
      const reFungibleCollectionId =
        await createCollectionExpectSuccess({mode: {type: 'ReFungible', decimalPoints: 0}});
      const newReFungibleTokenId = await createItemExpectSuccess(Alice, reFungibleCollectionId, 'ReFungible');
      await approveExpectFail(reFungibleCollectionId, newReFungibleTokenId, Bob, Alice);
    });
  });
});
