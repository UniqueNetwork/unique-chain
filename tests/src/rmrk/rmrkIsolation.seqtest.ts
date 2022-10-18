import {executeTransaction} from '../substrate/substrate-api';
import {IKeyringPair} from '@polkadot/types/types';
import {itSub, expect, usingPlaygrounds, Pallets, requirePalletsOrSkip} from '../util';
import {UniqueHelper} from '../util/playgrounds/unique';

let alice: IKeyringPair;
let bob: IKeyringPair;

async function createRmrkCollection(helper: UniqueHelper, sender: IKeyringPair): Promise<{uniqueId: number, rmrkId: number}> {
  const result = await helper.executeExtrinsic(sender, 'api.tx.rmrkCore.createCollection', ['metadata', null, 'symbol'], true);

  const uniqueId = helper.util.extractCollectionIdFromCreationResult(result);

  let rmrkId = null;
  result.result.events.forEach(({event: {data, method, section}}) => {
    if ((section === 'rmrkCore') && (method === 'CollectionCreated')) {
      rmrkId = parseInt(data[1].toString(), 10);
    }
  });

  if (rmrkId === null) {
    throw Error('No rmrkCore.CollectionCreated event was found!');
  }

  return {
    uniqueId,
    rmrkId,
  };
}

async function createRmrkNft(helper: UniqueHelper, sender: IKeyringPair, collectionId: number): Promise<number> {
  const result = await helper.executeExtrinsic(
    sender,
    'api.tx.rmrkCore.mintNft',
    [
      sender.address,
      collectionId,
      sender.address,
      null,
      'nft-metadata',
      true,
      null,
    ],
    true,
  );

  let rmrkNftId = null;
  result.result.events.forEach(({event: {data, method, section}}) => {
    if ((section === 'rmrkCore') && (method === 'NftMinted')) {
      rmrkNftId = parseInt(data[2].toString(), 10);
    }
  });

  if (rmrkNftId === null) {
    throw Error('No rmrkCore.NftMinted event was found!');
  }

  return rmrkNftId;
}

describe('RMRK External Integration Test', async () => {
  before(async function() {
    await usingPlaygrounds(async (_helper, privateKey) => {
      alice = await privateKey('//Alice');
    });
  });

  itSub.ifWithPallets('Creates a new RMRK collection that is mapped to a different ID and is tagged as external', [Pallets.RmrkCore], async ({helper}) => {
    // throw away collection to bump last Unique collection ID to test ID mapping
    await helper.nft.mintCollection(alice, {tokenPrefix: 'unqt'});

    const collectionIds = await createRmrkCollection(helper, alice);

    expect(collectionIds.rmrkId).to.be.lessThan(collectionIds.uniqueId, 'collection ID mapping');

    const collection = (await helper.nft.getCollectionObject(collectionIds.uniqueId).getData())!; // (await getDetailedCollectionInfo(api, collectionIds.uniqueId))!;
    expect(collection.raw.readOnly, 'tagged external').to.be.true;
  });
});

describe('Negative Integration Test: External Collections, Internal Ops', async () => {
  let uniqueCollectionId: number;
  let rmrkCollectionId: number;
  let rmrkNftId: number;
  let normalizedAlice: {Substrate: string};

  before(async function() {
    await usingPlaygrounds(async (helper, privateKey) => {
      alice = await privateKey('//Alice');
      bob = await privateKey('//Bob');
      normalizedAlice = {Substrate: helper.address.normalizeSubstrateToChainFormat(alice.address)};

      requirePalletsOrSkip(this, helper, [Pallets.RmrkCore]);

      const collectionIds = await createRmrkCollection(helper, alice);
      uniqueCollectionId = collectionIds.uniqueId;
      rmrkCollectionId = collectionIds.rmrkId;

      rmrkNftId = await createRmrkNft(helper, alice, rmrkCollectionId);
    });
  });

  itSub.ifWithPallets('[Negative] Forbids Unique operations with an external collection, handled by dispatch_call', [Pallets.RmrkCore], async ({helper}) => {
    // Collection item creation

    await expect(helper.nft.mintToken(alice, {collectionId: uniqueCollectionId, owner: {Substrate: alice.address}}), 'creating item')
      .to.be.rejectedWith(/common\.CollectionIsExternal/);

    const txCreateMultipleItems = helper.getApi().tx.unique.createMultipleItems(uniqueCollectionId, normalizedAlice, [{NFT: {}}, {NFT: {}}]);
    await expect(executeTransaction(helper.getApi(), alice, txCreateMultipleItems), 'creating multiple')
      .to.be.rejectedWith(/common\.CollectionIsExternal/);
  
    await expect(helper.nft.mintMultipleTokens(alice, uniqueCollectionId, [{owner: {Substrate: alice.address}}]), 'creating multiple ex')
      .to.be.rejectedWith(/common\.CollectionIsExternal/);

    // Collection properties

    await expect(helper.nft.setProperties(alice, uniqueCollectionId, [{key: 'a', value: '1'}, {key: 'b'}]), 'setting collection properties')
      .to.be.rejectedWith(/common\.CollectionIsExternal/);

    await expect(helper.nft.deleteProperties(alice, uniqueCollectionId, ['a']), 'deleting collection properties')
      .to.be.rejectedWith(/common\.CollectionIsExternal/);

    await expect(helper.nft.setTokenPropertyPermissions(alice, uniqueCollectionId, [{key: 'a', permission: {mutable: true}}]), 'setting property permissions')
      .to.be.rejectedWith(/common\.CollectionIsExternal/);

    // NFT

    await expect(helper.nft.burnToken(alice, uniqueCollectionId, rmrkNftId, 1n), 'burning')
      .to.be.rejectedWith(/common\.CollectionIsExternal/);

    await expect(helper.nft.burnTokenFrom(alice, uniqueCollectionId, rmrkNftId, {Substrate: alice.address}, 1n), 'burning-from')
      .to.be.rejectedWith(/common\.CollectionIsExternal/);

    await expect(helper.nft.transferToken(alice, uniqueCollectionId, rmrkNftId, {Substrate: bob.address}), 'transferring')
      .to.be.rejectedWith(/common\.CollectionIsExternal/);

    await expect(helper.nft.approveToken(alice, uniqueCollectionId, rmrkNftId, {Substrate: bob.address}), 'approving')
      .to.be.rejectedWith(/common\.CollectionIsExternal/);

    await expect(helper.nft.transferTokenFrom(alice, uniqueCollectionId, rmrkNftId, {Substrate: alice.address}, {Substrate: bob.address}), 'transferring-from')
      .to.be.rejectedWith(/common\.CollectionIsExternal/);

    // NFT properties

    await expect(helper.nft.setTokenProperties(alice, uniqueCollectionId, rmrkNftId, [{key: 'a', value: '2'}]), 'setting token properties')
      .to.be.rejectedWith(/common\.CollectionIsExternal/);

    await expect(helper.nft.deleteTokenProperties(alice, uniqueCollectionId, rmrkNftId, ['a']))
      .to.be.rejectedWith(/common\.CollectionIsExternal/);
  });

  itSub.ifWithPallets('[Negative] Forbids Unique collection operations with an external collection', [Pallets.RmrkCore], async ({helper}) => {
    await expect(helper.nft.burn(alice, uniqueCollectionId), 'destroying collection')
      .to.be.rejectedWith(/common\.CollectionIsExternal/);

    // Allow list

    await expect(helper.nft.addToAllowList(alice, uniqueCollectionId, {Substrate: bob.address}), 'adding to allow list')
      .to.be.rejectedWith(/common\.CollectionIsExternal/);

    await expect(helper.nft.removeFromAllowList(alice, uniqueCollectionId, {Substrate: bob.address}), 'removing from allowlist')
      .to.be.rejectedWith(/common\.CollectionIsExternal/);

    // Owner / Admin / Sponsor

    await expect(helper.nft.changeOwner(alice, uniqueCollectionId, bob.address), 'changing owner')
      .to.be.rejectedWith(/common\.CollectionIsExternal/);

    await expect(helper.nft.addAdmin(alice, uniqueCollectionId, {Substrate: bob.address}), 'adding admin')
      .to.be.rejectedWith(/common\.CollectionIsExternal/);

    await expect(helper.nft.removeAdmin(alice, uniqueCollectionId, {Substrate: bob.address}), 'removing admin')
      .to.be.rejectedWith(/common\.CollectionIsExternal/);

    await expect(helper.nft.setSponsor(alice, uniqueCollectionId, bob.address), 'setting sponsor')
      .to.be.rejectedWith(/common\.CollectionIsExternal/);

    await expect(helper.nft.confirmSponsorship(alice, uniqueCollectionId), 'confirming sponsor')
      .to.be.rejectedWith(/common\.CollectionIsExternal/);

    await expect(helper.nft.removeSponsor(alice, uniqueCollectionId), 'removing sponsor')
      .to.be.rejectedWith(/common\.CollectionIsExternal/);
    
    // Limits / permissions / transfers

    const txSetTransfers = helper.getApi().tx.unique.setTransfersEnabledFlag(uniqueCollectionId, true);
    await expect(executeTransaction(helper.getApi(), alice, txSetTransfers), 'setting transfers enabled flag')
      .to.be.rejectedWith(/common\.CollectionIsExternal/);

    await expect(helper.nft.setLimits(alice, uniqueCollectionId, {transfersEnabled: false}), 'setting collection limits')
      .to.be.rejectedWith(/common\.CollectionIsExternal/);

    await expect(helper.nft.setPermissions(alice, uniqueCollectionId, {access: 'AllowList'}), 'setting collection permissions')
      .to.be.rejectedWith(/common\.CollectionIsExternal/);
  });
});

describe('Negative Integration Test: Internal Collections, External Ops', async () => {
  let collectionId: number;
  let nftId: number;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      alice = await privateKey('//Alice');
      bob = await privateKey('//Bob');

      const collection = await helper.nft.mintCollection(alice, {tokenPrefix: 'iceo'});
      collectionId = collection.collectionId;
      nftId = (await collection.mintToken(alice)).tokenId;
    });
  });

  itSub.ifWithPallets('[Negative] Forbids RMRK operations with the internal collection and NFT (due to the lack of mapping)', [Pallets.RmrkCore], async ({helper}) => {
    const api = helper.getApi();

    const txChangeOwner = api.tx.rmrkCore.changeCollectionIssuer(collectionId, bob.address);
    await expect(executeTransaction(api, alice, txChangeOwner), 'changing collection issuer')
      .to.be.rejectedWith(/rmrkCore\.CollectionUnknown/);

    const maxBurns = 10;
    const txBurnItem = api.tx.rmrkCore.burnNft(collectionId, nftId, maxBurns);
    await expect(executeTransaction(api, alice, txBurnItem), 'burning NFT').to.be.rejectedWith(/rmrkCore\.CollectionUnknown/);
  });
});
