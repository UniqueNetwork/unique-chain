import {expect} from 'chai';
import usingApi, {executeTransaction} from '../substrate/substrate-api';
import {
  createCollectionExpectSuccess,
  createItemExpectSuccess,
  getCreateCollectionResult,
  getDetailedCollectionInfo,
  getGenericResult,
  requirePallets,
  normalizeAccountId,
  Pallets,
} from '../deprecated-helpers/helpers';
import {IKeyringPair} from '@polkadot/types/types';
import {ApiPromise} from '@polkadot/api';
import {it} from 'mocha';

let alice: IKeyringPair;
let bob: IKeyringPair;

async function createRmrkCollection(api: ApiPromise, sender: IKeyringPair): Promise<{uniqueId: number, rmrkId: number}> {
  const tx = api.tx.rmrkCore.createCollection('metadata', null, 'symbol');
  const events = await executeTransaction(api, sender, tx);

  const uniqueResult = getCreateCollectionResult(events);
  const rmrkResult = getGenericResult(events, 'rmrkCore', 'CollectionCreated', (data) => {
    return parseInt(data[1].toString(), 10);
  });

  return {
    uniqueId: uniqueResult.collectionId,
    rmrkId: rmrkResult.data!,
  };
}

async function createRmrkNft(api: ApiPromise, sender: IKeyringPair, collectionId: number): Promise<number> {
  const tx = api.tx.rmrkCore.mintNft(
    sender.address,
    collectionId,
    sender.address,
    null,
    'nft-metadata',
    true,
    null,
  );
  const events = await executeTransaction(api, sender, tx);
  const result = getGenericResult(events, 'rmrkCore', 'NftMinted', (data) => {
    return parseInt(data[2].toString(), 10);
  });

  return result.data!;
}

async function isUnique(): Promise<boolean> {
  return usingApi(async api => {
    const chain = await api.rpc.system.chain();

    return chain.eq('UNIQUE');
  });
}

describe('RMRK External Integration Test', async () => {
  const it_rmrk = (await isUnique() ? it : it.skip);

  before(async function() {
    await usingApi(async (api, privateKeyWrapper) => {
      alice = privateKeyWrapper('//Alice');
      await requirePallets(this, [Pallets.RmrkCore]);
    });
  });

  it_rmrk('Creates a new RMRK collection that is mapped to a different ID and is tagged as external', async () => {
    await usingApi(async api => {
      // throwaway collection to bump last Unique collection ID to test ID mapping
      await createCollectionExpectSuccess();

      const collectionIds = await createRmrkCollection(api, alice);

      expect(collectionIds.rmrkId).to.be.lessThan(collectionIds.uniqueId, 'collection ID mapping');

      const collection = (await getDetailedCollectionInfo(api, collectionIds.uniqueId))!;
      expect(collection.readOnly.toHuman(), 'tagged external').to.be.true;
    });
  });
});

describe('Negative Integration Test: External Collections, Internal Ops', async () => {
  let uniqueCollectionId: number;
  let rmrkCollectionId: number;
  let rmrkNftId: number;

  const it_rmrk = (await isUnique() ? it : it.skip);

  before(async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      alice = privateKeyWrapper('//Alice');
      bob = privateKeyWrapper('//Bob');

      const collectionIds = await createRmrkCollection(api, alice);
      uniqueCollectionId = collectionIds.uniqueId;
      rmrkCollectionId = collectionIds.rmrkId;

      rmrkNftId = await createRmrkNft(api, alice, rmrkCollectionId);
    });
  });

  it_rmrk('[Negative] Forbids Unique operations with an external collection, handled by dispatch_call', async () => {
    await usingApi(async api => {
      // Collection item creation

      const txCreateItem = api.tx.unique.createItem(uniqueCollectionId, normalizeAccountId(alice), 'NFT');
      await expect(executeTransaction(api, alice, txCreateItem), 'creating item')
        .to.be.rejectedWith(/common\.CollectionIsExternal/);

      const txCreateMultipleItems = api.tx.unique.createMultipleItems(uniqueCollectionId, normalizeAccountId(alice), [{NFT: {}}, {NFT: {}}]);
      await expect(executeTransaction(api, alice, txCreateMultipleItems), 'creating multiple')
        .to.be.rejectedWith(/common\.CollectionIsExternal/);

      const txCreateMultipleItemsEx = api.tx.unique.createMultipleItemsEx(uniqueCollectionId, {NFT: [{}]});
      await expect(executeTransaction(api, alice, txCreateMultipleItemsEx), 'creating multiple ex')
        .to.be.rejectedWith(/common\.CollectionIsExternal/);

      // Collection properties

      const txSetCollectionProperties = api.tx.unique.setCollectionProperties(uniqueCollectionId, [{key: 'a', value: '1'}, {key: 'b'}]);
      await expect(executeTransaction(api, alice, txSetCollectionProperties), 'setting collection properties')
        .to.be.rejectedWith(/common\.CollectionIsExternal/);

      const txDeleteCollectionProperties = api.tx.unique.deleteCollectionProperties(uniqueCollectionId, ['a']);
      await expect(executeTransaction(api, alice, txDeleteCollectionProperties), 'deleting collection properties')
        .to.be.rejectedWith(/common\.CollectionIsExternal/);

      const txsetTokenPropertyPermissions = api.tx.unique.setTokenPropertyPermissions(uniqueCollectionId, [{key: 'a', permission: {mutable: true}}]);
      await expect(executeTransaction(api, alice, txsetTokenPropertyPermissions), 'setting property permissions')
        .to.be.rejectedWith(/common\.CollectionIsExternal/);

      // NFT

      const txBurn = api.tx.unique.burnItem(uniqueCollectionId, rmrkNftId, 1);
      await expect(executeTransaction(api, alice, txBurn), 'burning').to.be.rejectedWith(/common\.CollectionIsExternal/);

      const txBurnFrom = api.tx.unique.burnFrom(uniqueCollectionId, normalizeAccountId(alice), rmrkNftId, 1);
      await expect(executeTransaction(api, alice, txBurnFrom), 'burning-from').to.be.rejectedWith(/common\.CollectionIsExternal/);

      const txTransfer = api.tx.unique.transfer(normalizeAccountId(bob), uniqueCollectionId, rmrkNftId, 1);
      await expect(executeTransaction(api, alice, txTransfer), 'transferring').to.be.rejectedWith(/common\.CollectionIsExternal/);

      const txApprove = api.tx.unique.approve(normalizeAccountId(bob), uniqueCollectionId, rmrkNftId, 1);
      await expect(executeTransaction(api, alice, txApprove), 'approving').to.be.rejectedWith(/common\.CollectionIsExternal/);

      const txTransferFrom = api.tx.unique.transferFrom(normalizeAccountId(alice), normalizeAccountId(bob), uniqueCollectionId, rmrkNftId, 1);
      await expect(executeTransaction(api, alice, txTransferFrom), 'transferring-from').to.be.rejectedWith(/common\.CollectionIsExternal/);

      // NFT properties

      const txSetTokenProperties = api.tx.unique.setTokenProperties(uniqueCollectionId, rmrkNftId, [{key: 'a', value: '2'}]);
      await expect(executeTransaction(api, alice, txSetTokenProperties), 'setting token properties')
        .to.be.rejectedWith(/common\.CollectionIsExternal/);

      const txDeleteTokenProperties = api.tx.unique.deleteTokenProperties(uniqueCollectionId, rmrkNftId, ['a']);
      await expect(executeTransaction(api, alice, txDeleteTokenProperties), 'deleting token properties')
        .to.be.rejectedWith(/common\.CollectionIsExternal/);
    });
  });

  it_rmrk('[Negative] Forbids Unique collection operations with an external collection', async () => {
    await usingApi(async api => {
      const txDestroyCollection = api.tx.unique.destroyCollection(uniqueCollectionId);
      await expect(executeTransaction(api, alice, txDestroyCollection), 'destroying collection')
        .to.be.rejectedWith(/common\.CollectionIsExternal/);

      // Allow list

      const txAddAllowList = api.tx.unique.addToAllowList(uniqueCollectionId, normalizeAccountId(bob));
      await expect(executeTransaction(api, alice, txAddAllowList), 'adding to allow list')
        .to.be.rejectedWith(/common\.CollectionIsExternal/);

      const txRemoveAllowList = api.tx.unique.removeFromAllowList(uniqueCollectionId, normalizeAccountId(bob));
      await expect(executeTransaction(api, alice, txRemoveAllowList), 'removing from allowlist')
        .to.be.rejectedWith(/common\.CollectionIsExternal/);

      // Owner / Admin / Sponsor

      const txChangeOwner = api.tx.unique.changeCollectionOwner(uniqueCollectionId, bob.address);
      await expect(executeTransaction(api, alice, txChangeOwner), 'changing owner')
        .to.be.rejectedWith(/common\.CollectionIsExternal/);

      const txAddAdmin = api.tx.unique.addCollectionAdmin(uniqueCollectionId, normalizeAccountId(bob));
      await expect(executeTransaction(api, alice, txAddAdmin), 'adding admin')
        .to.be.rejectedWith(/common\.CollectionIsExternal/);

      const txRemoveAdmin = api.tx.unique.removeCollectionAdmin(uniqueCollectionId, normalizeAccountId(bob));
      await expect(executeTransaction(api, alice, txRemoveAdmin), 'removing admin')
        .to.be.rejectedWith(/common\.CollectionIsExternal/);

      const txAddCollectionSponsor = api.tx.unique.setCollectionSponsor(uniqueCollectionId, bob.address);
      await expect(executeTransaction(api, alice, txAddCollectionSponsor), 'setting sponsor')
        .to.be.rejectedWith(/common\.CollectionIsExternal/);

      const txConfirmCollectionSponsor = api.tx.unique.confirmSponsorship(uniqueCollectionId);
      await expect(executeTransaction(api, alice, txConfirmCollectionSponsor), 'confirming sponsor')
        .to.be.rejectedWith(/common\.CollectionIsExternal/);

      const txRemoveCollectionSponsor = api.tx.unique.removeCollectionSponsor(uniqueCollectionId);
      await expect(executeTransaction(api, alice, txRemoveCollectionSponsor), 'removing sponsor')
        .to.be.rejectedWith(/common\.CollectionIsExternal/);
      
      // Limits / permissions / transfers

      const txSetTransfers = api.tx.unique.setTransfersEnabledFlag(uniqueCollectionId, true);
      await expect(executeTransaction(api, alice, txSetTransfers), 'setting transfers enabled flag')
        .to.be.rejectedWith(/common\.CollectionIsExternal/);

      const txSetLimits = api.tx.unique.setCollectionLimits(uniqueCollectionId, {transfersEnabled: false});
      await expect(executeTransaction(api, alice, txSetLimits), 'setting collection limits')
        .to.be.rejectedWith(/common\.CollectionIsExternal/);

      const txSetPermissions = api.tx.unique.setCollectionPermissions(uniqueCollectionId, {access: 'AllowList'});
      await expect(executeTransaction(api, alice, txSetPermissions), 'setting collection permissions')
        .to.be.rejectedWith(/common\.CollectionIsExternal/);
    });
  });
});

describe('Negative Integration Test: Internal Collections, External Ops', async () => {
  let collectionId: number;
  let nftId: number;

  const it_rmrk = (await isUnique() ? it : it.skip);

  before(async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      alice = privateKeyWrapper('//Alice');
      bob = privateKeyWrapper('//Bob');

      collectionId = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
      nftId = await createItemExpectSuccess(alice, collectionId, 'NFT');
    });
  });

  it_rmrk('[Negative] Forbids RMRK operations with the internal collection and NFT (due to the lack of mapping)', async () => {
    await usingApi(async api => {
      const txChangeOwner = api.tx.rmrkCore.changeCollectionIssuer(collectionId, bob.address);
      await expect(executeTransaction(api, alice, txChangeOwner), 'changing collection issuer')
        .to.be.rejectedWith(/rmrkCore\.CollectionUnknown/);

      const maxBurns = 10;
      const txBurnItem = api.tx.rmrkCore.burnNft(collectionId, nftId, maxBurns);
      await expect(executeTransaction(api, alice, txBurnItem), 'burning NFT').to.be.rejectedWith(/rmrkCore\.CollectionUnknown/);
    });
  });
});
