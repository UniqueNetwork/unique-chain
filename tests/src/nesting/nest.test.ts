import {expect} from 'chai';
import {tokenIdToAddress} from '../eth/util/helpers';
import usingApi, {executeTransaction} from '../substrate/substrate-api';
import {
  addToAllowListExpectSuccess,
  createCollectionExpectSuccess,
  createItemExpectSuccess,
  enableAllowListExpectSuccess,
  enablePublicMintingExpectSuccess,
  getTokenChildren,
  getTokenOwner,
  getTopmostTokenOwner,
  normalizeAccountId,
  setCollectionPermissionsExpectSuccess,
  transferExpectFailure,
  transferExpectSuccess,
  transferFromExpectSuccess,
} from '../util/helpers';
import {IKeyringPair} from '@polkadot/types/types';

let alice: IKeyringPair;
let bob: IKeyringPair;

describe('Integration Test: Nesting', () => {
  before(async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      alice = privateKeyWrapper('//Alice');
      bob = privateKeyWrapper('//Bob');
    });
  });

  it('Performs the full suite: bundles a token, transfers, and unnests', async () => {
    await usingApi(async api => {
      const collection = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
      await setCollectionPermissionsExpectSuccess(alice, collection, {nesting: 'Owner'});
      const targetToken = await createItemExpectSuccess(alice, collection, 'NFT');

      // Create a nested token
      const nestedToken = await createItemExpectSuccess(alice, collection, 'NFT', {Ethereum: tokenIdToAddress(collection, targetToken)});
      expect(await getTopmostTokenOwner(api, collection, nestedToken)).to.be.deep.equal({Substrate: alice.address});
      expect(await getTokenOwner(api, collection, nestedToken)).to.be.deep.equal({Ethereum: tokenIdToAddress(collection, targetToken).toLowerCase()});

      // Create a token to be nested
      const newToken = await createItemExpectSuccess(alice, collection, 'NFT');

      // Nest
      await transferExpectSuccess(collection, newToken, alice, {Ethereum: tokenIdToAddress(collection, targetToken)});
      expect(await getTopmostTokenOwner(api, collection, newToken)).to.be.deep.equal({Substrate: alice.address});
      expect(await getTokenOwner(api, collection, newToken)).to.be.deep.equal({Ethereum: tokenIdToAddress(collection, targetToken).toLowerCase()});

      // Move bundle to different user
      await transferExpectSuccess(collection, targetToken, alice, {Substrate: bob.address});
      expect(await getTopmostTokenOwner(api, collection, nestedToken)).to.be.deep.equal({Substrate: bob.address});
      expect(await getTokenOwner(api, collection, nestedToken)).to.be.deep.equal({Ethereum: tokenIdToAddress(collection, targetToken).toLowerCase()});

      // Unnest
      await transferFromExpectSuccess(collection, newToken, bob, {Ethereum: tokenIdToAddress(collection, targetToken)}, {Substrate: bob.address});
      expect(await getTokenOwner(api, collection, newToken)).to.be.deep.equal({Substrate: bob.address});
    });
  });

  it('Transfers an already bundled token', async () => {
    await usingApi(async api => {
      const collection = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
      await setCollectionPermissionsExpectSuccess(alice, collection, {nesting: 'Owner'});

      const tokenA = await createItemExpectSuccess(alice, collection, 'NFT');
      const tokenB = await createItemExpectSuccess(alice, collection, 'NFT');

      // Create a nested token
      const tokenC = await createItemExpectSuccess(alice, collection, 'NFT', {Ethereum: tokenIdToAddress(collection, tokenA)});
      expect(await getTopmostTokenOwner(api, collection, tokenC)).to.be.deep.equal({Substrate: alice.address});
      expect(await getTokenOwner(api, collection, tokenC)).to.be.deep.equal({Ethereum: tokenIdToAddress(collection, tokenA).toLowerCase()});

      // Transfer the nested token to another token
      await expect(executeTransaction(
        api,
        alice,
        api.tx.unique.transferFrom(
          normalizeAccountId({Ethereum: tokenIdToAddress(collection, tokenA)}),
          normalizeAccountId({Ethereum: tokenIdToAddress(collection, tokenB)}),
          collection,
          tokenC,
          1,
        ),
      )).to.not.be.rejected;
      expect(await getTopmostTokenOwner(api, collection, tokenC)).to.be.deep.equal({Substrate: alice.address});
      expect(await getTokenOwner(api, collection, tokenC)).to.be.deep.equal({Ethereum: tokenIdToAddress(collection, tokenB).toLowerCase()});
    });
  });

  it('Checks token children', async () => {
    await usingApi(async api => {
      const collectionA = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
      await setCollectionPermissionsExpectSuccess(alice, collectionA, {nesting: 'Owner'});
      const collectionB = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});

      const targetToken = await createItemExpectSuccess(alice, collectionA, 'NFT');
      const targetAddress = {Ethereum: tokenIdToAddress(collectionA, targetToken)};
      let children = await getTokenChildren(api, collectionA, targetToken);
      expect(children.length).to.be.equal(0, 'Children length check at creation');

      // Create a nested NFT token
      const tokenA = await createItemExpectSuccess(alice, collectionA, 'NFT', targetAddress);
      children = await getTokenChildren(api, collectionA, targetToken);
      expect(children.length).to.be.equal(1, 'Children length check at nesting #1');
      expect(children).to.have.deep.members([
        {token: tokenA, collection: collectionA},
      ], 'Children contents check at nesting #1');

      // Create then nest
      const tokenB = await createItemExpectSuccess(alice, collectionA, 'NFT');
      await transferExpectSuccess(collectionA, tokenB, alice, targetAddress);
      children = await getTokenChildren(api, collectionA, targetToken);
      expect(children.length).to.be.equal(2, 'Children length check at nesting #2');
      expect(children).to.have.deep.members([
        {token: tokenA, collection: collectionA},
        {token: tokenB, collection: collectionA},
      ], 'Children contents check at nesting #2');

      // Move token B to a different user outside the nesting tree
      await transferExpectSuccess(collectionA, tokenB, alice, bob);
      children = await getTokenChildren(api, collectionA, targetToken);
      expect(children.length).to.be.equal(1, 'Children length check at unnesting');
      expect(children).to.be.have.deep.members([
        {token: tokenA, collection: collectionA},
      ], 'Children contents check at unnesting');

      // Create a fungible token in another collection and then nest
      const tokenC = await createItemExpectSuccess(alice, collectionB, 'Fungible');
      await transferExpectSuccess(collectionB, tokenC, alice, targetAddress, 1, 'Fungible');
      children = await getTokenChildren(api, collectionA, targetToken);
      expect(children.length).to.be.equal(2, 'Children length check at nesting #3 (from another collection)');
      expect(children).to.be.have.deep.members([
        {token: tokenA, collection: collectionA},
        {token: tokenC, collection: collectionB},
      ], 'Children contents check at nesting #3 (from another collection)');

      // Move the fungible token inside token A deeper in the nesting tree
      await transferFromExpectSuccess(collectionB, tokenC, alice, targetAddress, {Ethereum: tokenIdToAddress(collectionA, tokenA)}, 1, 'Fungible');
      children = await getTokenChildren(api, collectionA, targetToken);
      expect(children.length).to.be.equal(1, 'Children length check at deeper nesting');
      expect(children).to.be.have.deep.members([
        {token: tokenA, collection: collectionA},
      ], 'Children contents check at deeper nesting');
    });
  });

  // ---------- Non-Fungible ----------

  it('NFT: allows an Owner to nest/unnest their token', async () => {
    await usingApi(async api => {
      const collection = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
      await setCollectionPermissionsExpectSuccess(alice, collection, {nesting: 'Owner'});
      const targetToken = await createItemExpectSuccess(alice, collection, 'NFT');

      // Create a nested token
      const nestedToken = await createItemExpectSuccess(alice, collection, 'NFT', {Ethereum: tokenIdToAddress(collection, targetToken)});
      expect(await getTopmostTokenOwner(api, collection, nestedToken)).to.be.deep.equal({Substrate: alice.address});
      expect(await getTokenOwner(api, collection, nestedToken)).to.be.deep.equal({Ethereum: tokenIdToAddress(collection, targetToken).toLowerCase()});

      // Create a token to be nested and nest
      const newToken = await createItemExpectSuccess(alice, collection, 'NFT');
      await transferExpectSuccess(collection, newToken, alice, {Ethereum: tokenIdToAddress(collection, targetToken)});
      expect(await getTopmostTokenOwner(api, collection, newToken)).to.be.deep.equal({Substrate: alice.address});
      expect(await getTokenOwner(api, collection, newToken)).to.be.deep.equal({Ethereum: tokenIdToAddress(collection, targetToken).toLowerCase()});
    });
  });

  it('NFT: allows an Owner to nest/unnest their token (Restricted nesting)', async () => {
    await usingApi(async api => {
      const collection = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
      await setCollectionPermissionsExpectSuccess(alice, collection, {nesting: {OwnerRestricted:[collection]}});
      const targetToken = await createItemExpectSuccess(alice, collection, 'NFT');

      // Create a nested token
      const nestedToken = await createItemExpectSuccess(alice, collection, 'NFT', {Ethereum: tokenIdToAddress(collection, targetToken)});
      expect(await getTopmostTokenOwner(api, collection, nestedToken)).to.be.deep.equal({Substrate: alice.address});
      expect(await getTokenOwner(api, collection, nestedToken)).to.be.deep.equal({Ethereum: tokenIdToAddress(collection, targetToken).toLowerCase()});

      // Create a token to be nested and nest
      const newToken = await createItemExpectSuccess(alice, collection, 'NFT');
      await transferExpectSuccess(collection, newToken, alice, {Ethereum: tokenIdToAddress(collection, targetToken)});
      expect(await getTopmostTokenOwner(api, collection, newToken)).to.be.deep.equal({Substrate: alice.address});
      expect(await getTokenOwner(api, collection, newToken)).to.be.deep.equal({Ethereum: tokenIdToAddress(collection, targetToken).toLowerCase()});
    });
  });

  // ---------- Fungible ----------

  it('Fungible: allows an Owner to nest/unnest their token', async () => {
    await usingApi(async api => {
      const collectionNFT = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
      await setCollectionPermissionsExpectSuccess(alice, collectionNFT, {nesting: 'Owner'});
      const targetToken = await createItemExpectSuccess(alice, collectionNFT, 'NFT', {Substrate: alice.address});
      const targetAddress = {Ethereum: tokenIdToAddress(collectionNFT, targetToken)};

      const collectionFT = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});

      // Create a nested token
      await expect(executeTransaction(api, alice, api.tx.unique.createItem(
        collectionFT,
        targetAddress,
        {Fungible: {Value: 10}},
      ))).to.not.be.rejected;

      // Nest a new token
      const newToken = await createItemExpectSuccess(alice, collectionFT, 'Fungible');
      await transferExpectSuccess(collectionFT, newToken, alice, targetAddress, 1, 'Fungible');
    });
  });

  it('Fungible: allows an Owner to nest/unnest their token (Restricted nesting)', async () => {
    await usingApi(async api => {
      const collectionNFT = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
      const targetToken = await createItemExpectSuccess(alice, collectionNFT, 'NFT', {Substrate: alice.address});
      const targetAddress = {Ethereum: tokenIdToAddress(collectionNFT, targetToken)};

      const collectionFT = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});

      await setCollectionPermissionsExpectSuccess(alice, collectionNFT, {nesting: {OwnerRestricted: [collectionFT]}});

      // Create a nested token
      await expect(executeTransaction(api, alice, api.tx.unique.createItem(
        collectionFT,
        targetAddress,
        {Fungible: {Value: 10}},
      ))).to.not.be.rejected;

      // Nest a new token
      const newToken = await createItemExpectSuccess(alice, collectionFT, 'Fungible');
      await transferExpectSuccess(collectionFT, newToken, alice, targetAddress, 1, 'Fungible');
    });
  });

  // ---------- Re-Fungible ----------

  it('ReFungible: allows an Owner to nest/unnest their token', async () => {
    await usingApi(async api => {
      const collectionNFT = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
      await setCollectionPermissionsExpectSuccess(alice, collectionNFT, {nesting: 'Owner'});
      const targetToken = await createItemExpectSuccess(alice, collectionNFT, 'NFT', {Substrate: alice.address});
      const targetAddress = {Ethereum: tokenIdToAddress(collectionNFT, targetToken)};

      const collectionRFT = await createCollectionExpectSuccess({mode: {type: 'ReFungible'}});

      // Create a nested token
      await expect(executeTransaction(api, alice, api.tx.unique.createItem(
        collectionRFT,
        targetAddress,
        {ReFungible: {const_data: [], pieces: 100}},
      ))).to.not.be.rejected;

      // Nest a new token
      const newToken = await createItemExpectSuccess(alice, collectionRFT, 'ReFungible');
      await transferExpectSuccess(collectionRFT, newToken, alice, targetAddress, 100, 'ReFungible');
    });
  });

  it('ReFungible: allows an Owner to nest/unnest their token (Restricted nesting)', async () => {
    await usingApi(async api => {
      const collectionNFT = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
      const targetToken = await createItemExpectSuccess(alice, collectionNFT, 'NFT', {Substrate: alice.address});
      const targetAddress = {Ethereum: tokenIdToAddress(collectionNFT, targetToken)};

      const collectionRFT = await createCollectionExpectSuccess({mode: {type: 'ReFungible'}});

      await setCollectionPermissionsExpectSuccess(alice, collectionNFT, {nesting: {OwnerRestricted:[collectionRFT]}});

      // Create a nested token
      await expect(executeTransaction(api, alice, api.tx.unique.createItem(
        collectionRFT,
        targetAddress,
        {ReFungible: {const_data: [], pieces: 100}},
      ))).to.not.be.rejected;

      // Nest a new token
      const newToken = await createItemExpectSuccess(alice, collectionRFT, 'ReFungible');
      await transferExpectSuccess(collectionRFT, newToken, alice, targetAddress, 100, 'ReFungible');
    });
  });
});

describe('Negative Test: Nesting', async() => {
  before(async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      alice = privateKeyWrapper('//Alice');
      bob = privateKeyWrapper('//Bob');
    });
  });

  it('Disallows excessive token nesting', async () => {
    await usingApi(async api => {
      const collection = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
      await setCollectionPermissionsExpectSuccess(alice, collection, {nesting: 'Owner'});
      const targetToken = await createItemExpectSuccess(alice, collection, 'NFT');

      const maxNestingLevel = 5;
      let prevToken = targetToken;

      // Create a nested-token matryoshka
      for (let i = 0; i < maxNestingLevel; i++) {
        const nestedToken = await createItemExpectSuccess(
          alice,
          collection,
          'NFT',
          {Ethereum: tokenIdToAddress(collection, prevToken)},
        );

        prevToken = nestedToken;
      }

      // The nesting depth is limited by `maxNestingLevel`
      await expect(executeTransaction(api, alice, api.tx.unique.createItem(
        collection,
        {Ethereum: tokenIdToAddress(collection, prevToken)},
          {nft: {const_data: [], variable_data: []}} as any,
      )), 'while creating nested token').to.be.rejectedWith(/^structure\.DepthLimit$/);

      expect(await getTopmostTokenOwner(api, collection, prevToken)).to.be.deep.equal({Substrate: alice.address});
    });
  });

  // ---------- Non-Fungible ----------

  it('NFT: disallows to nest token if nesting is disabled', async () => {
    await usingApi(async api => {
      const collection = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
      await setCollectionPermissionsExpectSuccess(alice, collection, {nesting: 'Disabled'});
      const targetToken = await createItemExpectSuccess(alice, collection, 'NFT');

      // Try to create a nested token
      await expect(executeTransaction(api, alice, api.tx.unique.createItem(
        collection,
        {Ethereum: tokenIdToAddress(collection, targetToken)},
          {nft: {const_data: [], variable_data: []}} as any,
      )), 'while creating nested token').to.be.rejectedWith(/^common\.NestingIsDisabled$/);

      // Create a token to be nested
      const newToken = await createItemExpectSuccess(alice, collection, 'NFT');
      // Try to nest
      await expect(executeTransaction(api, alice, api.tx.unique.transfer({Ethereum: tokenIdToAddress(collection, targetToken)}, collection, newToken, 1)), 'while nesting new token').to.be.rejectedWith(/common\.NestingIsDisabled/);
      expect(await getTopmostTokenOwner(api, collection, newToken)).to.be.deep.equal({Substrate: alice.address});
      expect(await getTokenOwner(api, collection, newToken)).to.be.deep.equal({Substrate: alice.address});
    });
  });

  it('NFT: disallows a non-Owner to nest someone else\'s token', async () => {
    await usingApi(async api => {
      const collection = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
      await setCollectionPermissionsExpectSuccess(alice, collection, {nesting: 'Owner'});

      await addToAllowListExpectSuccess(alice, collection, bob.address);
      await enableAllowListExpectSuccess(alice, collection);
      await enablePublicMintingExpectSuccess(alice, collection);

      // Create a token to attempt to be nested into
      const targetToken = await createItemExpectSuccess(bob, collection, 'NFT');

      // Try to create a nested token in the wrong collection
      await expect(executeTransaction(api, alice, api.tx.unique.createItem(
        collection,
        {Ethereum: tokenIdToAddress(collection, targetToken)},
          {nft: {const_data: [], variable_data: []}} as any,
      )), 'while creating nested token').to.be.rejectedWith(/common\.OnlyOwnerAllowedToNest/);

      // Try to create and nest a token in the wrong collection
      const newToken = await createItemExpectSuccess(alice, collection, 'NFT');
      await expect(executeTransaction(api, alice, api.tx.unique.transfer({Ethereum: tokenIdToAddress(collection, targetToken)}, collection, newToken, 1)), 'while nesting new token').to.be.rejectedWith(/common\.AddressNotInAllowlist/);
      expect(await getTokenOwner(api, collection, newToken)).to.be.deep.equal({Substrate: alice.address});
    });
  });

  it('NFT: disallows a non-Owner to nest someone else\'s token (Restricted nesting)', async () => {
    await usingApi(async api => {
      const collection = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
      await setCollectionPermissionsExpectSuccess(alice, collection, {nesting: {OwnerRestricted:[collection]}});

      await addToAllowListExpectSuccess(alice, collection, bob.address);
      await enableAllowListExpectSuccess(alice, collection);
      await enablePublicMintingExpectSuccess(alice, collection);

      // Create a token to attempt to be nested into
      const targetToken = await createItemExpectSuccess(bob, collection, 'NFT');

      // Try to create a nested token in the wrong collection
      await expect(executeTransaction(api, alice, api.tx.unique.createItem(
        collection,
        {Ethereum: tokenIdToAddress(collection, targetToken)},
          {nft: {const_data: [], variable_data: []}} as any,
      )), 'while creating nested token').to.be.rejectedWith(/common\.OnlyOwnerAllowedToNest/);

      // Try to create and nest a token in the wrong collection
      const newToken = await createItemExpectSuccess(alice, collection, 'NFT');
      await expect(executeTransaction(api, alice, api.tx.unique.transfer({Ethereum: tokenIdToAddress(collection, targetToken)}, collection, newToken, 1)), 'while nesting new token').to.be.rejectedWith(/common\.AddressNotInAllowlist/);
      expect(await getTokenOwner(api, collection, newToken)).to.be.deep.equal({Substrate: alice.address});
    });
  });

  it('NFT: disallows to nest token in an unlisted collection', async () => {
    await usingApi(async api => {
      const collection = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
      await setCollectionPermissionsExpectSuccess(alice, collection, {nesting: {OwnerRestricted:[]}});

      // Create a token to attempt to be nested into
      const targetToken = await createItemExpectSuccess(alice, collection, 'NFT');

      // Try to create a nested token in the wrong collection
      await expect(executeTransaction(api, alice, api.tx.unique.createItem(
        collection,
        {Ethereum: tokenIdToAddress(collection, targetToken)},
          {nft: {const_data: [], variable_data: []}} as any,
      )), 'while creating nested token').to.be.rejectedWith(/common\.SourceCollectionIsNotAllowedToNest/);

      // Try to create and nest a token in the wrong collection
      const newToken = await createItemExpectSuccess(alice, collection, 'NFT');
      await expect(executeTransaction(api, alice, api.tx.unique.transfer({Ethereum: tokenIdToAddress(collection, targetToken)}, collection, newToken, 1)), 'while nesting new token').to.be.rejectedWith(/common\.SourceCollectionIsNotAllowedToNest/);
      expect(await getTokenOwner(api, collection, newToken)).to.be.deep.equal({Substrate: alice.address});
    });
  });

  // ---------- Fungible ----------

  it('Fungible: disallows to nest token if nesting is disabled', async () => {
    await usingApi(async api => {
      const collectionNFT = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
      await setCollectionPermissionsExpectSuccess(alice, collectionNFT, {nesting: 'Disabled'});
      const targetToken = await createItemExpectSuccess(alice, collectionNFT, 'NFT');
      const targetAddress = {Ethereum: tokenIdToAddress(collectionNFT, targetToken)};

      const collectionFT = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});

      // Try to create a nested token
      await expect(executeTransaction(api, alice, api.tx.unique.createItem(
        collectionFT,
        targetAddress,
        {Fungible: {Value: 10}},
      )), 'while creating nested token').to.be.rejectedWith(/^common\.NestingIsDisabled$/);

      // Create a token to be nested
      const newToken = await createItemExpectSuccess(alice, collectionFT, 'Fungible');
      // Try to nest
      await expect(executeTransaction(api, alice, api.tx.unique.transfer(targetAddress, collectionFT, newToken, 1)), 'while nesting new token').to.be.rejectedWith(/common\.NestingIsDisabled/);

      // Create another token to be nested
      const newToken2 = await createItemExpectSuccess(alice, collectionFT, 'Fungible');
      // Try to nest inside a fungible token
      await expect(executeTransaction(api, alice, api.tx.unique.transfer({Ethereum: tokenIdToAddress(collectionFT, newToken)}, collectionFT, newToken2, 1)), 'while nesting new token inside fungible').to.be.rejectedWith(/fungible\.FungibleDisallowsNesting/);
    });
  });

  it('Fungible: disallows a non-Owner to nest someone else\'s token', async () => {
    await usingApi(async api => {
      const collectionNFT = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
      await setCollectionPermissionsExpectSuccess(alice, collectionNFT, {nesting: 'Owner'});

      await addToAllowListExpectSuccess(alice, collectionNFT, bob.address);
      await enableAllowListExpectSuccess(alice, collectionNFT);
      await enablePublicMintingExpectSuccess(alice, collectionNFT);

      // Create a token to attempt to be nested into
      const targetToken = await createItemExpectSuccess(bob, collectionNFT, 'NFT');
      const targetAddress = {Ethereum: tokenIdToAddress(collectionNFT, targetToken)};

      const collectionFT = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});

      // Try to create a nested token in the wrong collection
      await expect(executeTransaction(api, alice, api.tx.unique.createItem(
        collectionFT,
        targetAddress,
        {Fungible: {Value: 10}},
      )), 'while creating nested token').to.be.rejectedWith(/common\.OnlyOwnerAllowedToNest/);

      // Try to create and nest a token in the wrong collection
      const newToken = await createItemExpectSuccess(alice, collectionFT, 'Fungible');
      await expect(executeTransaction(api, alice, api.tx.unique.transfer(targetAddress, collectionFT, newToken, 1)), 'while nesting new token').to.be.rejectedWith(/common\.OnlyOwnerAllowedToNest/);
    });
  });

  it('Fungible: disallows a non-Owner to nest someone else\'s token (Restricted nesting)', async () => {
    await usingApi(async api => {
      const collectionNFT = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
      await addToAllowListExpectSuccess(alice, collectionNFT, bob.address);
      await enableAllowListExpectSuccess(alice, collectionNFT);
      await enablePublicMintingExpectSuccess(alice, collectionNFT);

      // Create a token to attempt to be nested into
      const targetToken = await createItemExpectSuccess(bob, collectionNFT, 'NFT');
      const targetAddress = {Ethereum: tokenIdToAddress(collectionNFT, targetToken)};

      const collectionFT = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});
      await setCollectionPermissionsExpectSuccess(alice, collectionNFT, {nesting: {OwnerRestricted:[collectionFT]}});

      // Try to create a nested token in the wrong collection
      await expect(executeTransaction(api, alice, api.tx.unique.createItem(
        collectionFT,
        targetAddress,
        {Fungible: {Value: 10}},
      )), 'while creating nested token').to.be.rejectedWith(/common\.OnlyOwnerAllowedToNest/);

      // Try to create and nest a token in the wrong collection
      const newToken = await createItemExpectSuccess(alice, collectionFT, 'Fungible');
      await expect(executeTransaction(api, alice, api.tx.unique.transfer(targetAddress, collectionFT, newToken, 1)), 'while nesting new token').to.be.rejectedWith(/common\.OnlyOwnerAllowedToNest/);
    });
  });

  it('Fungible: disallows to nest token in an unlisted collection', async () => {
    await usingApi(async api => {
      const collectionNFT = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
      await setCollectionPermissionsExpectSuccess(alice, collectionNFT, {nesting: {OwnerRestricted:[]}});

      // Create a token to attempt to be nested into
      const targetToken = await createItemExpectSuccess(alice, collectionNFT, 'NFT');
      const targetAddress = {Ethereum: tokenIdToAddress(collectionNFT, targetToken)};

      const collectionFT = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});

      // Try to create a nested token in the wrong collection
      await expect(executeTransaction(api, alice, api.tx.unique.createItem(
        collectionFT,
        targetAddress,
        {Fungible: {Value: 10}},
      )), 'while creating a nested token').to.be.rejectedWith(/common\.SourceCollectionIsNotAllowedToNest/);

      // Try to create and nest a token in the wrong collection
      const newToken = await createItemExpectSuccess(alice, collectionFT, 'Fungible');
      await expect(executeTransaction(api, alice, api.tx.unique.transfer(targetAddress, collectionFT, newToken, 1)), 'while nesting new token').to.be.rejectedWith(/common\.SourceCollectionIsNotAllowedToNest/);
    });
  });

  // ---------- Re-Fungible ----------

  it('ReFungible: disallows to nest token if nesting is disabled', async () => {
    await usingApi(async api => {
      const collectionNFT = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
      await setCollectionPermissionsExpectSuccess(alice, collectionNFT, {nesting: 'Disabled'});
      const targetToken = await createItemExpectSuccess(alice, collectionNFT, 'NFT');
      const targetAddress = {Ethereum: tokenIdToAddress(collectionNFT, targetToken)};

      const collectionRFT = await createCollectionExpectSuccess({mode: {type: 'ReFungible'}});

      // Create a nested token
      await expect(executeTransaction(api, alice, api.tx.unique.createItem(
        collectionRFT,
        targetAddress,
        {ReFungible: {const_data: [], pieces: 100}},
      )), 'while creating a nested token').to.be.rejectedWith(/^common\.NestingIsDisabled$/);

      // Create a token to be nested
      const newToken = await createItemExpectSuccess(alice, collectionRFT, 'ReFungible');
      // Try to nest
      await transferExpectFailure(collectionRFT, newToken, alice, targetAddress, 100);
      // Try to nest
      await expect(executeTransaction(api, alice, api.tx.unique.transfer(targetAddress, collectionRFT, newToken, 1)), 'while nesting new token').to.be.rejectedWith(/common\.NestingIsDisabled/);

      // Create another token to be nested
      const newToken2 = await createItemExpectSuccess(alice, collectionRFT, 'ReFungible');
      // Try to nest inside a fungible token
      await expect(executeTransaction(api, alice, api.tx.unique.transfer({Ethereum: tokenIdToAddress(collectionRFT, newToken)}, collectionRFT, newToken2, 1)), 'while nesting new token inside refungible').to.be.rejectedWith(/refungible\.RefungibleDisallowsNesting/);
    });
  });

  it('ReFungible: disallows a non-Owner to nest someone else\'s token', async () => {
    await usingApi(async api => {
      const collectionNFT = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
      await setCollectionPermissionsExpectSuccess(alice, collectionNFT, {nesting: 'Owner'});

      await addToAllowListExpectSuccess(alice, collectionNFT, bob.address);
      await enableAllowListExpectSuccess(alice, collectionNFT);
      await enablePublicMintingExpectSuccess(alice, collectionNFT);

      // Create a token to attempt to be nested into
      const targetToken = await createItemExpectSuccess(bob, collectionNFT, 'NFT');
      const targetAddress = {Ethereum: tokenIdToAddress(collectionNFT, targetToken)};

      const collectionRFT = await createCollectionExpectSuccess({mode: {type: 'ReFungible'}});

      // Try to create a nested token in the wrong collection
      await expect(executeTransaction(api, alice, api.tx.unique.createItem(
        collectionRFT,
        targetAddress,
        {ReFungible: {const_data: [], pieces: 100}},
      )), 'while creating a nested token').to.be.rejectedWith(/common\.OnlyOwnerAllowedToNest/);

      // Try to create and nest a token in the wrong collection
      const newToken = await createItemExpectSuccess(alice, collectionRFT, 'ReFungible');
      await expect(executeTransaction(api, alice, api.tx.unique.transfer(targetAddress, collectionRFT, newToken, 1)), 'while nesting new token').to.be.rejectedWith(/common\.OnlyOwnerAllowedToNest/);
    });
  });

  it('ReFungible: disallows a non-Owner to nest someone else\'s token (Restricted nesting)', async () => {
    await usingApi(async api => {
      const collectionNFT = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
      await addToAllowListExpectSuccess(alice, collectionNFT, bob.address);
      await enableAllowListExpectSuccess(alice, collectionNFT);
      await enablePublicMintingExpectSuccess(alice, collectionNFT);

      // Create a token to attempt to be nested into
      const targetToken = await createItemExpectSuccess(bob, collectionNFT, 'NFT');
      const targetAddress = {Ethereum: tokenIdToAddress(collectionNFT, targetToken)};

      const collectionRFT = await createCollectionExpectSuccess({mode: {type: 'ReFungible'}});
      await setCollectionPermissionsExpectSuccess(alice, collectionNFT, {nesting: {OwnerRestricted:[collectionRFT]}});

      // Try to create a nested token in the wrong collection
      await expect(executeTransaction(api, alice, api.tx.unique.createItem(
        collectionRFT,
        targetAddress,
        {ReFungible: {const_data: [], pieces: 100}},
      )), 'while creating a nested token').to.be.rejectedWith(/common\.OnlyOwnerAllowedToNest/);

      // Try to create and nest a token in the wrong collection
      const newToken = await createItemExpectSuccess(alice, collectionRFT, 'ReFungible');
      await expect(executeTransaction(api, alice, api.tx.unique.transfer(targetAddress, collectionRFT, newToken, 1)), 'while nesting new token').to.be.rejectedWith(/common\.OnlyOwnerAllowedToNest/);
    });
  });

  it('ReFungible: disallows to nest token to an unlisted collection', async () => {
    await usingApi(async api => {
      const collectionNFT = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
      await setCollectionPermissionsExpectSuccess(alice, collectionNFT, {nesting: {OwnerRestricted:[]}});

      // Create a token to attempt to be nested into
      const targetToken = await createItemExpectSuccess(alice, collectionNFT, 'NFT');
      const targetAddress = {Ethereum: tokenIdToAddress(collectionNFT, targetToken)};

      const collectionRFT = await createCollectionExpectSuccess({mode: {type: 'ReFungible'}});

      // Try to create a nested token in the wrong collection
      await expect(executeTransaction(api, alice, api.tx.unique.createItem(
        collectionRFT,
        targetAddress,
        {ReFungible: {const_data: [], pieces: 100}},
      )), 'while creating a nested token').to.be.rejectedWith(/common\.SourceCollectionIsNotAllowedToNest/);

      // Try to create and nest a token in the wrong collection
      const newToken = await createItemExpectSuccess(alice, collectionRFT, 'ReFungible');
      await expect(executeTransaction(api, alice, api.tx.unique.transfer(targetAddress, collectionRFT, newToken, 1)), 'while nesting new token').to.be.rejectedWith(/common\.SourceCollectionIsNotAllowedToNest/);
    });
  });
});
