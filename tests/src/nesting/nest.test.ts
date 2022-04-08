import {expect} from 'chai';
import {tokenIdToAddress} from '../eth/util/helpers';
import privateKey from '../substrate/privateKey';
import usingApi, {executeTransaction} from '../substrate/substrate-api';
import {
  addToAllowListExpectSuccess,
  createCollectionExpectSuccess,
  createItemExpectFailure, 
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
    alice = privateKey('//Alice');
    bob = privateKey('//Bob');
  });

  // ---------- Non-Fungible ----------

  // todo refactor names
  // todo remove excessive bundling, leave it for a single test
  it('NFT: allows to nest/unnest token if nesting rule is Owner', async () => {
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
      expect(await getTopmostTokenOwner(api, collection, nestedToken)).to.be.deep.equal({Substrate: alice.address});
      expect(await getTokenOwner(api, collection, nestedToken)).to.be.deep.equal({Ethereum: tokenIdToAddress(collection, targetToken).toLowerCase()});

      // Move bundle to different user
      await transferExpectSuccess(collection, targetToken, alice, {Substrate: bob.address});
      expect(await getTopmostTokenOwner(api, collection, nestedToken)).to.be.deep.equal({Substrate: bob.address});
      expect(await getTokenOwner(api, collection, nestedToken)).to.be.deep.equal({Ethereum: tokenIdToAddress(collection, targetToken).toLowerCase()});

      // Unnest
      await transferFromExpectSuccess(collection, newToken, bob, {Ethereum: tokenIdToAddress(collection, targetToken)}, {Substrate: bob.address});
      expect(await getTokenOwner(api, collection, newToken)).to.be.deep.equal({Substrate: bob.address});
    });
  });

  it('NFT: allows to nest/unnest token if Owner-Restricted', async () => {
    await usingApi(async api => {
      const collection = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
      await setCollectionLimitsExpectSuccess(alice, collection, {nestingRule: {OwnerRestricted:[collection]}});
      const targetToken = await createItemExpectSuccess(alice, collection, 'NFT');

      // Create a nested token
      const nestedToken = await createItemExpectSuccess(alice, collection, 'NFT', {Ethereum: tokenIdToAddress(collection, targetToken)});
      expect(await getTopmostTokenOwner(api, collection, nestedToken)).to.be.deep.equal({Substrate: alice.address});
      expect(await getTokenOwner(api, collection, nestedToken)).to.be.deep.equal({Ethereum: tokenIdToAddress(collection, targetToken).toLowerCase()});

      // Create a token to be nested
      const newToken = await createItemExpectSuccess(alice, collection, 'NFT');
      
      // Nest
      await transferExpectSuccess(collection, newToken, alice, {Ethereum: tokenIdToAddress(collection, targetToken)});
      expect(await getTopmostTokenOwner(api, collection, nestedToken)).to.be.deep.equal({Substrate: alice.address});
      expect(await getTokenOwner(api, collection, nestedToken)).to.be.deep.equal({Ethereum: tokenIdToAddress(collection, targetToken).toLowerCase()});

      // Move bundle to different user
      await transferExpectSuccess(collection, targetToken, alice, {Substrate: bob.address});
      expect(await getTopmostTokenOwner(api, collection, nestedToken)).to.be.deep.equal({Substrate: bob.address});
      expect(await getTokenOwner(api, collection, nestedToken)).to.be.deep.equal({Ethereum: tokenIdToAddress(collection, targetToken).toLowerCase()});
      
      // Unnest
      await transferFromExpectSuccess(collection, newToken, bob, {Ethereum: tokenIdToAddress(collection, targetToken)}, {Substrate: bob.address});
      expect(await getTokenOwner(api, collection, newToken)).to.be.deep.equal({Substrate: bob.address});
    });
  });

  // ---------- Fungible ----------

  it('Fungible: allows to nest/unnest token if Owner', async () => {
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

      // Create a token to be nested
      const newToken = await createItemExpectSuccess(alice, collectionFT, 'Fungible');
      // Nest
      await transferExpectSuccess(collectionFT, newToken, alice, targetAddress, 1, 'Fungible');
      // Move bundle to different user
      await transferExpectSuccess(collectionNFT, targetToken, alice, {Substrate: bob.address});
      // Unnest
      await transferFromExpectSuccess(collectionFT, newToken, bob, targetAddress, {Substrate: bob.address}, 1, 'Fungible');
    });
  });

  it('Fungible: allows to nest/unnest token if Owner-Restricted', async () => {
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

      // Create a token to be nested
      const newToken = await createItemExpectSuccess(alice, collectionFT, 'Fungible');
      // Nest
      await transferExpectSuccess(collectionFT, newToken, alice, targetAddress, 1, 'Fungible');
      // Move bundle to different user
      await transferExpectSuccess(collectionNFT, targetToken, alice, {Substrate: bob.address});
      // Unnest
      await transferFromExpectSuccess(collectionFT, newToken, bob, targetAddress, {Substrate: bob.address}, 1, 'Fungible');
    });
  });

  // ---------- Re-Fungible ----------

  it('ReFungible: allows to nest/unnest token if Owner', async () => {
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
        {ReFungible: {const_data: [], variable_data: [], pieces: 100}},
      ))).to.not.be.rejected;

      // Create a token to be nested
      const newToken = await createItemExpectSuccess(alice, collectionRFT, 'ReFungible');
      // Nest
      await transferExpectSuccess(collectionRFT, newToken, alice, targetAddress, 100, 'ReFungible');
      // Move bundle to different user
      await transferExpectSuccess(collectionNFT, targetToken, alice, {Substrate: bob.address});
      // Unnest
      await transferFromExpectSuccess(collectionRFT, newToken, bob, targetAddress, {Substrate: bob.address}, 100, 'ReFungible');
    });
  });

  it('ReFungible: allows to nest/unnest token if Owner-Restricted', async () => {
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
        {ReFungible: {const_data: [], variable_data: [], pieces: 100}},
      ))).to.not.be.rejected;

      // Create a token to be nested
      const newToken = await createItemExpectSuccess(alice, collectionRFT, 'ReFungible');
      // Nest
      await transferExpectSuccess(collectionRFT, newToken, alice, targetAddress, 100, 'ReFungible');
      // Move bundle to different user
      await transferExpectSuccess(collectionNFT, targetToken, alice, {Substrate: bob.address});
      // Unnest
      await transferFromExpectSuccess(collectionRFT, newToken, bob, targetAddress, {Substrate: bob.address}, 100, 'ReFungible');
    });
  });
});

describe('Negative Test: Nesting', async() => {
  before(async () => {
    alice = privateKey('//Alice');
    bob = privateKey('//Bob');
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
      ))).to.be.rejectedWith(/^common\.NestingIsDisabled$/);

      // Create a token to be nested
      const newToken = await createItemExpectSuccess(alice, collection, 'NFT');
      // Try to nest
      await transferExpectFailure(collection, newToken, alice, {Ethereum: tokenIdToAddress(collection, targetToken)}); // todo to.be.rejected
      expect(await getTopmostTokenOwner(api, collection, newToken)).to.be.deep.equal({Substrate: alice.address});
      expect(await getTokenOwner(api, collection, newToken)).to.be.deep.equal({Substrate: alice.address});
    });
  });

  it('NFT: disallows to nest token if not Owner', async () => {
    await usingApi(async api => {
      const collection = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
      await setCollectionLimitsExpectSuccess(alice, collection, {nestingRule: 'Owner'});

      await addToAllowListExpectSuccess(alice, collection, bob.address);
      await enableAllowListExpectSuccess(alice, collection);
      await enablePublicMintingExpectSuccess(alice, collection);

      // Create a token to attempt to be nested into
      const targetToken = await createItemExpectSuccess(bob, collection, 'NFT');

      // Try to create a nested token in the wrong collection
      await createItemExpectFailure(alice, collection, 'NFT', {Ethereum: tokenIdToAddress(collection, targetToken)});

      // Try to create and nest a token in the wrong collection
      const newToken = await createItemExpectSuccess(alice, collection, 'NFT');
      await transferExpectFailure(collection, newToken, alice, {Ethereum: tokenIdToAddress(collection, targetToken)});
      expect(await getTokenOwner(api, collection, newToken)).to.be.deep.equal({Substrate: alice.address});
    });
  });

  it('NFT: disallows to nest token if not Owner (Restricted nesting)', async () => {
    await usingApi(async api => {
      const collection = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
      await setCollectionLimitsExpectSuccess(alice, collection, {nestingRule: {OwnerRestricted:[collection]}});

      await addToAllowListExpectSuccess(alice, collection, bob.address);
      await enableAllowListExpectSuccess(alice, collection);
      await enablePublicMintingExpectSuccess(alice, collection);

      // Create a token to attempt to be nested into
      const targetToken = await createItemExpectSuccess(bob, collection, 'NFT');

      // Try to create a nested token in the wrong collection
      await createItemExpectFailure(alice, collection, 'NFT', {Ethereum: tokenIdToAddress(collection, targetToken)});

      // Try to create and nest a token in the wrong collection
      const newToken = await createItemExpectSuccess(alice, collection, 'NFT');
      await transferExpectFailure(collection, newToken, alice, {Ethereum: tokenIdToAddress(collection, targetToken)});
      expect(await getTokenOwner(api, collection, newToken)).to.be.deep.equal({Substrate: alice.address});
    });
  });

  it('NFT: disallows to nest token to an unlisted collection', async () => {
    await usingApi(async api => {
      const collection = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
      await setCollectionLimitsExpectSuccess(alice, collection, {nestingRule: {OwnerRestricted:[]}});

      // Create a token to attempt to be nested into
      const targetToken = await createItemExpectSuccess(alice, collection, 'NFT');

      // Try to create a nested token in the wrong collection
      await createItemExpectFailure(alice, collection, 'NFT', {Ethereum: tokenIdToAddress(collection, targetToken)});

      // Try to create and nest a token in the wrong collection
      const newToken = await createItemExpectSuccess(alice, collection, 'NFT');
      await transferExpectFailure(collection, newToken, alice, {Ethereum: tokenIdToAddress(collection, targetToken)});
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
      ))).to.be.rejectedWith(/^common\.NestingIsDisabled$/);

      // Create a token to be nested
      const newToken = await createItemExpectSuccess(alice, collectionFT, 'Fungible');
      // Try to nest
      await transferExpectFailure(collectionFT, newToken, alice, targetAddress, 1);
    });
  });

  it('Fungible: disallows to nest token if not Owner', async () => {
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
      ))).to.be.rejected;

      // Try to create and nest a token in the wrong collection
      const newToken = await createItemExpectSuccess(alice, collectionFT, 'Fungible');
      await transferExpectFailure(collectionFT, newToken, alice, targetAddress, 1);
    });
  });

  it('Fungible: disallows to nest token if not Owner (Restricted nesting)', async () => {
    await usingApi(async api => {
      const collectionNFT = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
      await setCollectionLimitsExpectSuccess(alice, collectionNFT, {nestingRule: {OwnerRestricted:[collectionNFT]}}); // todo clear redundant restrictions

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
      ))).to.be.rejected;

      // Try to create and nest a token in the wrong collection
      const newToken = await createItemExpectSuccess(alice, collectionFT, 'Fungible');
      await transferExpectFailure(collectionFT, newToken, alice, targetAddress, 1);
    });
  });

  it('Fungible: disallows to nest token to an unlisted collection', async () => {
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
      ))).to.be.rejected;

      // Try to create and nest a token in the wrong collection
      const newToken = await createItemExpectSuccess(alice, collectionFT, 'Fungible');
      await transferExpectFailure(collectionFT, newToken, alice, targetAddress, 1);
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
        {ReFungible: {const_data: [], variable_data: [], pieces: 100}},
      ))).to.be.rejectedWith(/^common\.NestingIsDisabled$/);

      // Create a token to be nested
      const newToken = await createItemExpectSuccess(alice, collectionRFT, 'ReFungible');
      // Try to nest
      await transferExpectFailure(collectionRFT, newToken, alice, targetAddress, 100);
    });
  });

  it('ReFungible: disallows to nest token if not Owner', async () => {
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
        {ReFungible: {const_data: [], variable_data: [], pieces: 100}},
      ))).to.be.rejected;

      // Try to create and nest a token in the wrong collection
      const newToken = await createItemExpectSuccess(alice, collectionRFT, 'ReFungible');
      await transferExpectFailure(collectionRFT, newToken, alice, targetAddress, 100);
    });
  });

  it('ReFungible: disallows to nest token if not Owner (Restricted nesting)', async () => {
    await usingApi(async api => {
      const collectionNFT = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
      await setCollectionLimitsExpectSuccess(alice, collectionNFT, {nestingRule: {OwnerRestricted:[collectionNFT]}});

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
        {ReFungible: {const_data: [], variable_data: [], pieces: 100}},
      ))).to.be.rejected;

      // Try to create and nest a token in the wrong collection
      const newToken = await createItemExpectSuccess(alice, collectionRFT, 'ReFungible');
      await transferExpectFailure(collectionRFT, newToken, alice, targetAddress, 100);
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
        {ReFungible: {const_data: [], variable_data: [], pieces: 100}},
      ))).to.be.rejected;

      // Try to create and nest a token in the wrong collection
      const newToken = await createItemExpectSuccess(alice, collectionRFT, 'ReFungible');
      await transferExpectFailure(collectionRFT, newToken, alice, targetAddress, 100);
    });
  });
});
