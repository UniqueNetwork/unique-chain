import {expect} from 'chai';
import {tokenIdToAddress} from '../eth/util/helpers';
import privateKey from '../substrate/privateKey';
import usingApi, {executeTransaction} from '../substrate/substrate-api';
import {
  addToAllowListExpectSuccess,
  createCollectionExpectSuccess,
  createItemExpectSuccess,
  enableAllowListExpectSuccess,
  enablePublicMintingExpectSuccess,
  getTokenOwner, 
  getTopmostTokenOwner,
  setCollectionLimitsExpectSuccess, 
  transferExpectFailure, 
  transferExpectSuccess, 
  transferFromExpectSuccess,
} from '../util/helpers';
import {IKeyringPair} from '@polkadot/types/types';

let alice: IKeyringPair;
let bob: IKeyringPair;

describe('Integration Test: Nesting', () => {
  before(async () => {
    await usingApi(async () => {
      alice = privateKey('//Alice');
      bob = privateKey('//Bob');
    });
  });

  it('Performs the full suite: bundles a token, transfers, and allows to unnest', async () => {
    await usingApi(async api => {
      const collection = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
      await setCollectionLimitsExpectSuccess(alice, collection, {nestingRule: 'Owner'});
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

  // ---------- Non-Fungible ----------

  it('NFT: allows an Owner to nest/unnest their token', async () => {
    await usingApi(async api => {
      const collection = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
      await setCollectionLimitsExpectSuccess(alice, collection, {nestingRule: 'Owner'});
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
      await setCollectionLimitsExpectSuccess(alice, collection, {nestingRule: {OwnerRestricted:[collection]}});
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
      await setCollectionLimitsExpectSuccess(alice, collectionNFT, {nestingRule: 'Owner'});
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

      await setCollectionLimitsExpectSuccess(alice, collectionNFT, {nestingRule: {OwnerRestricted:[collectionFT]}});

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
      await setCollectionLimitsExpectSuccess(alice, collectionNFT, {nestingRule: 'Owner'});
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

      await setCollectionLimitsExpectSuccess(alice, collectionNFT, {nestingRule: {OwnerRestricted:[collectionRFT]}});

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
    await usingApi(async () => {
      alice = privateKey('//Alice');
      bob = privateKey('//Bob');
    });
  });

  it('Disallows excessive token nesting', async () => {
    await usingApi(async api => {
      const collection = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
      await setCollectionLimitsExpectSuccess(alice, collection, {nestingRule: 'Owner'});
      const targetToken = await createItemExpectSuccess(alice, collection, 'NFT');

      // Create a nested-token matryoshka
      const nestedToken1 = await createItemExpectSuccess(alice, collection, 'NFT', {Ethereum: tokenIdToAddress(collection, targetToken)});
      const nestedToken2 = await createItemExpectSuccess(alice, collection, 'NFT', {Ethereum: tokenIdToAddress(collection, nestedToken1)});
      // The nesting depth is limited by 2
      await expect(executeTransaction(api, alice, api.tx.unique.createItem(
        collection, 
        {Ethereum: tokenIdToAddress(collection, nestedToken2)}, 
          {nft: {const_data: [], variable_data: []}} as any,
      )), 'while creating nested token').to.be.rejectedWith(/^structure\.DepthLimit$/);

      expect(await getTopmostTokenOwner(api, collection, nestedToken2)).to.be.deep.equal({Substrate: alice.address});
    });
  });

  // ---------- Non-Fungible ----------

  it('NFT: disallows to nest token if nesting is disabled', async () => {
    await usingApi(async api => {
      const collection = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
      await setCollectionLimitsExpectSuccess(alice, collection, {nestingRule: 'Disabled'});
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
      await setCollectionLimitsExpectSuccess(alice, collection, {nestingRule: 'Owner'});

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
      await setCollectionLimitsExpectSuccess(alice, collection, {nestingRule: {OwnerRestricted:[collection]}});

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
      await setCollectionLimitsExpectSuccess(alice, collection, {nestingRule: {OwnerRestricted:[]}});

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
      await setCollectionLimitsExpectSuccess(alice, collectionNFT, {nestingRule: 'Disabled'});
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
      await setCollectionLimitsExpectSuccess(alice, collectionNFT, {nestingRule: 'Owner'});

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
      await setCollectionLimitsExpectSuccess(alice, collectionNFT, {nestingRule: {OwnerRestricted:[collectionFT]}});

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
      await setCollectionLimitsExpectSuccess(alice, collectionNFT, {nestingRule: {OwnerRestricted:[]}});

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
      await setCollectionLimitsExpectSuccess(alice, collectionNFT, {nestingRule: 'Disabled'});
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
      await setCollectionLimitsExpectSuccess(alice, collectionNFT, {nestingRule: 'Owner'});

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
      await setCollectionLimitsExpectSuccess(alice, collectionNFT, {nestingRule: {OwnerRestricted:[collectionRFT]}});

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
      await setCollectionLimitsExpectSuccess(alice, collectionNFT, {nestingRule: {OwnerRestricted:[]}});

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
