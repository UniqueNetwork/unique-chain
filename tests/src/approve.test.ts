//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//
import {IKeyringPair} from '@polkadot/types/types';
import {ApiPromise} from '@polkadot/api';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import privateKey from './substrate/privateKey';
import {default as usingApi} from './substrate/substrate-api';
import {
  approveExpectFail,
  approveExpectSuccess,
  createCollectionExpectSuccess,
  createItemExpectSuccess,
  destroyCollectionExpectSuccess,
  setCollectionLimitsExpectSuccess,
  transferExpectSuccess,
  addCollectionAdminExpectSuccess,
  adminApproveFromExpectSuccess,
  getCreatedCollectionCount,
} from './util/helpers';

chai.use(chaiAsPromised);

describe('Integration Test approve(spender, collection_id, item_id, amount):', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;
  let charlie: IKeyringPair;

  before(async () => {
    await usingApi(async () => {
      alice = privateKey('//Alice');
      bob = privateKey('//Bob');
      charlie = privateKey('//Charlie');
    });
  });

  it('Execute the extrinsic and check approvedList', async () => {
    const nftCollectionId = await createCollectionExpectSuccess();
    // nft
    const newNftTokenId = await createItemExpectSuccess(alice, nftCollectionId, 'NFT');
    await approveExpectSuccess(nftCollectionId, newNftTokenId, alice, bob.address);
    // fungible
    const fungibleCollectionId = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});
    const newFungibleTokenId = await createItemExpectSuccess(alice, fungibleCollectionId, 'Fungible');
    await approveExpectSuccess(fungibleCollectionId, newFungibleTokenId, alice, bob.address);
    // reFungible
    const reFungibleCollectionId =
      await createCollectionExpectSuccess({mode: {type: 'ReFungible'}});
    const newReFungibleTokenId = await createItemExpectSuccess(alice, reFungibleCollectionId, 'ReFungible');
    await approveExpectSuccess(reFungibleCollectionId, newReFungibleTokenId, alice, bob.address);
  });

  it('Remove approval by using 0 amount', async () => {
    const nftCollectionId = await createCollectionExpectSuccess();
    // nft
    const newNftTokenId = await createItemExpectSuccess(alice, nftCollectionId, 'NFT');
    await approveExpectSuccess(nftCollectionId, newNftTokenId, alice, bob.address, 1);
    await approveExpectSuccess(nftCollectionId, newNftTokenId, alice, bob.address, 0);
    // fungible
    const fungibleCollectionId = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});
    const newFungibleTokenId = await createItemExpectSuccess(alice, fungibleCollectionId, 'Fungible');
    await approveExpectSuccess(fungibleCollectionId, newFungibleTokenId, alice, bob.address, 1);
    await approveExpectSuccess(fungibleCollectionId, newFungibleTokenId, alice, bob.address, 0);
    // reFungible
    const reFungibleCollectionId =
      await createCollectionExpectSuccess({mode: {type: 'ReFungible'}});
    const newReFungibleTokenId = await createItemExpectSuccess(alice, reFungibleCollectionId, 'ReFungible');
    await approveExpectSuccess(reFungibleCollectionId, newReFungibleTokenId, alice, bob.address, 1);
    await approveExpectSuccess(reFungibleCollectionId, newReFungibleTokenId, alice, bob.address, 0);
  });

  it('can be called by collection owner on non-owned item when OwnerCanTransfer == true', async () => {
    const collectionId = await createCollectionExpectSuccess();
    const itemId = await createItemExpectSuccess(alice, collectionId, 'NFT', bob.address);

    await adminApproveFromExpectSuccess(collectionId, itemId, alice, bob.address, charlie.address);
  });
});

describe('Negative Integration Test approve(spender, collection_id, item_id, amount):', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;
  let charlie: IKeyringPair;

  before(async () => {
    await usingApi(async () => {
      alice = privateKey('//Alice');
      bob = privateKey('//Bob');
      charlie = privateKey('//Charlie');
    });
  });

  it('Approve for a collection that does not exist', async () => {
    await usingApi(async (api: ApiPromise) => {
      // nft
      const nftCollectionCount = await getCreatedCollectionCount(api);
      await approveExpectFail(nftCollectionCount + 1, 1, alice, bob);
      // fungible
      const fungibleCollectionCount = await getCreatedCollectionCount(api);
      await approveExpectFail(fungibleCollectionCount + 1, 0, alice, bob);
      // reFungible
      const reFungibleCollectionCount = await getCreatedCollectionCount(api);
      await approveExpectFail(reFungibleCollectionCount + 1, 1, alice, bob);
    });
  });

  it('Approve for a collection that was destroyed', async () => {
    // nft
    const nftCollectionId = await createCollectionExpectSuccess();
    await destroyCollectionExpectSuccess(nftCollectionId);
    await approveExpectFail(nftCollectionId, 1, alice, bob);
    // fungible
    const fungibleCollectionId = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});
    await destroyCollectionExpectSuccess(fungibleCollectionId);
    await approveExpectFail(fungibleCollectionId, 0, alice, bob);
    // reFungible
    const reFungibleCollectionId =
      await createCollectionExpectSuccess({mode: {type: 'ReFungible'}});
    await destroyCollectionExpectSuccess(reFungibleCollectionId);
    await approveExpectFail(reFungibleCollectionId, 1, alice, bob);
  });

  it('Approve transfer of a token that does not exist', async () => {
    // nft
    const nftCollectionId = await createCollectionExpectSuccess();
    await approveExpectFail(nftCollectionId, 2, alice, bob);
    // reFungible
    const reFungibleCollectionId =
      await createCollectionExpectSuccess({mode: {type: 'ReFungible'}});
    await approveExpectFail(reFungibleCollectionId, 2, alice, bob);
  });

  it('Approve using the address that does not own the approved token', async () => {
    const nftCollectionId = await createCollectionExpectSuccess();
    // nft
    const newNftTokenId = await createItemExpectSuccess(alice, nftCollectionId, 'NFT');
    await approveExpectFail(nftCollectionId, newNftTokenId, bob, alice);
    // fungible
    const fungibleCollectionId = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});
    const newFungibleTokenId = await createItemExpectSuccess(alice, fungibleCollectionId, 'Fungible');
    await approveExpectFail(fungibleCollectionId, newFungibleTokenId, bob, alice);
    // reFungible
    const reFungibleCollectionId =
      await createCollectionExpectSuccess({mode: {type: 'ReFungible'}});
    const newReFungibleTokenId = await createItemExpectSuccess(alice, reFungibleCollectionId, 'ReFungible');
    await approveExpectFail(reFungibleCollectionId, newReFungibleTokenId, bob, alice);
  });

  it('should fail if approved more ReFungibles than owned', async () => {
    const nftCollectionId = await createCollectionExpectSuccess({mode: {type: 'ReFungible'}});
    const newNftTokenId = await createItemExpectSuccess(alice, nftCollectionId, 'ReFungible');
    await transferExpectSuccess(nftCollectionId, newNftTokenId, alice, bob, 100, 'ReFungible');
    await approveExpectSuccess(nftCollectionId, newNftTokenId, bob, alice.address, 100);
    await approveExpectFail(nftCollectionId, newNftTokenId, bob, alice, 101);
  });

  it('should fail if approved more Fungibles than owned', async () => {
    const nftCollectionId = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});
    const newNftTokenId = await createItemExpectSuccess(alice, nftCollectionId, 'Fungible');
    await transferExpectSuccess(nftCollectionId, newNftTokenId, alice, bob, 10, 'Fungible');
    await approveExpectSuccess(nftCollectionId, newNftTokenId, bob, alice.address, 10);
    await approveExpectFail(nftCollectionId, newNftTokenId, bob, alice, 11);
  });

  it('fails when called by collection owner on non-owned item when OwnerCanTransfer == false', async () => {
    const collectionId = await createCollectionExpectSuccess();
    const itemId = await createItemExpectSuccess(alice, collectionId, 'NFT', bob.address);
    await setCollectionLimitsExpectSuccess(alice, collectionId, {ownerCanTransfer: false});

    await approveExpectFail(collectionId, itemId, alice, charlie);
  });
});

describe('Integration Test approve(spender, collection_id, item_id, amount) with collection admin permissions:', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;
  let charlie: IKeyringPair;

  before(async () => {
    await usingApi(async () => {
      alice = privateKey('//Alice');
      bob = privateKey('//Bob');
      charlie = privateKey('//Charlie');
    });
  });

  it('can be called by collection admin on non-owned item', async () => {
    const collectionId = await createCollectionExpectSuccess();
    const itemId = await createItemExpectSuccess(alice, collectionId, 'NFT', alice.address);

    await addCollectionAdminExpectSuccess(alice, collectionId, bob.address);
    await adminApproveFromExpectSuccess(collectionId, itemId, bob, alice.address, charlie.address);
  });
});
