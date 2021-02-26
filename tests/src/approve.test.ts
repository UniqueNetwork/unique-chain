//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//
import { IKeyringPair } from '@polkadot/types/types';
import { ApiPromise } from '@polkadot/api';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import privateKey from './substrate/privateKey';
import { default as usingApi } from './substrate/substrate-api';
import {
  approveExpectFail,
  approveExpectSuccess,
  createCollectionExpectSuccess,
  createItemExpectSuccess,
  destroyCollectionExpectSuccess,
  transferExpectSuccess,
} from './util/helpers';

chai.use(chaiAsPromised);

let Alice: IKeyringPair;
let Bob: IKeyringPair;

describe.only('Integration Test approve(spender, collection_id, item_id, amount):', () => {
  before(async () => {
    await usingApi(async () => {
      Alice = privateKey('//Alice');
      Bob = privateKey('//Bob');
    });
  });

  it('Execute the extrinsic and check approvedList', async () => {
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
      await createCollectionExpectSuccess({mode: {type: 'ReFungible'}});
    const newReFungibleTokenId = await createItemExpectSuccess(Alice, reFungibleCollectionId, 'ReFungible');
    await approveExpectSuccess(reFungibleCollectionId, newReFungibleTokenId, Alice, Bob);
  });

  it('Remove approval by using 0 amount', async () => {
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
      await createCollectionExpectSuccess({mode: {type: 'ReFungible'}});
    const newReFungibleTokenId = await createItemExpectSuccess(Alice, reFungibleCollectionId, 'ReFungible');
    await approveExpectSuccess(reFungibleCollectionId, newReFungibleTokenId, Alice, Bob, 1);
    await approveExpectSuccess(reFungibleCollectionId, newReFungibleTokenId, Alice, Bob, 0);
  });
});

describe.only('Negative Integration Test approve(spender, collection_id, item_id, amount):', () => {
  before(async () => {
    await usingApi(async (api) => {
      Alice = privateKey('//Alice');
      Bob = privateKey('//Bob');
    });
  });

  it('Approve for a collection that does not exist', async () => {
    await usingApi(async (api: ApiPromise) => {
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
      await createCollectionExpectSuccess({mode: {type: 'ReFungible'}});
    await destroyCollectionExpectSuccess(reFungibleCollectionId);
    await approveExpectFail(reFungibleCollectionId, 1, Alice, Bob);
  });

  it('Approve transfer of a token that does not exist', async () => {
    // nft
    const nftCollectionId = await createCollectionExpectSuccess();
    await approveExpectFail(nftCollectionId, 2, Alice, Bob);
    // fungible
    const fungibleCollectionId = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});
    await approveExpectFail(fungibleCollectionId, 2, Alice, Bob);
    // reFungible
    const reFungibleCollectionId =
      await createCollectionExpectSuccess({mode: {type: 'ReFungible'}});
    await approveExpectFail(reFungibleCollectionId, 2, Alice, Bob);
  });

  it('Approve using the address that does not own the approved token', async () => {
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
      await createCollectionExpectSuccess({mode: {type: 'ReFungible'}});
    const newReFungibleTokenId = await createItemExpectSuccess(Alice, reFungibleCollectionId, 'ReFungible');
    await approveExpectFail(reFungibleCollectionId, newReFungibleTokenId, Bob, Alice);
  });

  it('should fail if approved more NFTs than owned', async () => {
    const nftCollectionId = await createCollectionExpectSuccess({ mode: { type: 'NFT' } });
    const newNftTokenId = await createItemExpectSuccess(Alice, nftCollectionId, 'NFT');
    await transferExpectSuccess(nftCollectionId, newNftTokenId, Alice, Bob, 1, 'NFT');
    await approveExpectSuccess(nftCollectionId, newNftTokenId, Bob, Alice);
    await approveExpectFail(nftCollectionId, newNftTokenId, Bob, Alice);
  });

  it('should fail if approved more ReFungibles than owned', async () => {
    const nftCollectionId = await createCollectionExpectSuccess({ mode: { type: 'ReFungible' } });
    const newNftTokenId = await createItemExpectSuccess(Alice, nftCollectionId, 'ReFungible');
    await transferExpectSuccess(nftCollectionId, newNftTokenId, Alice, Bob, 100, 'ReFungible');
    await approveExpectSuccess(nftCollectionId, newNftTokenId, Bob, Alice, 100);
    await approveExpectFail(nftCollectionId, newNftTokenId, Bob, Alice, 1);
  });

  it('should fail if approved more Fungibles than owned', async () => {
    const nftCollectionId = await createCollectionExpectSuccess({ mode: { type: 'Fungible', decimalPoints: 0 } });
    const newNftTokenId = await createItemExpectSuccess(Alice, nftCollectionId, 'Fungible');
    await transferExpectSuccess(nftCollectionId, newNftTokenId, Alice, Bob, 10, 'Fungible');
    await approveExpectSuccess(nftCollectionId, newNftTokenId, Bob, Alice, 10);
    await approveExpectFail(nftCollectionId, newNftTokenId, Bob, Alice, 1);
  });
});
