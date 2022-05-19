import { IKeyringPair } from '@polkadot/types/types';
import { expect } from 'chai';
import { createEthAccountWithBalance, itWeb3 } from '../../eth/util/helpers';
import privateKey from '../../substrate/privateKey';
import usingApi, { executeTransaction } from '../../substrate/substrate-api';
import { addToAllowListExpectSuccess, createCollectionExpectSuccess, createItemExpectSuccess, enableAllowListExpectSuccess, enablePublicMintingExpectSuccess, getTokenOwner, setCollectionLimitsExpectSuccess, transferExpectSuccess } from '../../util/helpers';

let alice: IKeyringPair;
let bob: IKeyringPair;

describe('Integration Test: Nesting', () => {
  before(async () => {
    await usingApi(async () => {
      alice = privateKey('//Alice');
    });
  });

  // ---------- Non-Fungible ----------

  itWeb3('NFT: allows an Owner to nest/unnest their token', async ({api, web3}) => {
    const collection = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
    await setCollectionLimitsExpectSuccess(alice, collection, {nestingRule: 'Owner'});

    // Create a nested token
    const caller = await createEthAccountWithBalance(api, web3);
    const nestedToken = await createItemExpectSuccess(alice, collection, 'NFT', {Ethereum: caller});
    // expect(await getTopmostTokenOwner(api, collection, nestedToken)).to.be.deep.equal({Substrate: alice.address});
    expect(await getTokenOwner(api, collection, nestedToken)).to.be.deep.equal({Ethereum: caller.toLowerCase()});

    // Create a token to be nested and nest
    const newToken = await createItemExpectSuccess(alice, collection, 'NFT');
    await transferExpectSuccess(collection, newToken, alice, {Ethereum: caller});
    // expect(await getTopmostTokenOwner(api, collection, newToken)).to.be.deep.equal({Substrate: alice.address});
    expect(await getTokenOwner(api, collection, newToken)).to.be.deep.equal({Ethereum: caller.toLowerCase()});
  });

  itWeb3('NFT: allows an Owner to nest/unnest their token (Restricted nesting)', async ({api, web3}) => {
    const collection = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
    await setCollectionLimitsExpectSuccess(alice, collection, {nestingRule: {OwnerRestricted:[collection]}});

    // Create a nested token
    const caller = await createEthAccountWithBalance(api, web3);
    const nestedToken = await createItemExpectSuccess(alice, collection, 'NFT', {Ethereum: caller});
    // expect(await getTopmostTokenOwner(api, collection, nestedToken)).to.be.deep.equal({Substrate: alice.address});
    expect(await getTokenOwner(api, collection, nestedToken)).to.be.deep.equal({Ethereum: caller.toLowerCase()});

    // Create a token to be nested and nest
    const newToken = await createItemExpectSuccess(alice, collection, 'NFT');
    await transferExpectSuccess(collection, newToken, alice, {Ethereum: caller});
    // expect(await getTopmostTokenOwner(api, collection, newToken)).to.be.deep.equal({Substrate: alice.address});
    expect(await getTokenOwner(api, collection, newToken)).to.be.deep.equal({Ethereum: caller.toLowerCase()});
  });
});

describe('Negative Test: Nesting', async() => {
  before(async () => {
    await usingApi(async () => {
      alice = privateKey('//Alice');
      bob = privateKey('//Bob');
    });
  });

  itWeb3('NFT: disallows to nest token if nesting is disabled', async ({api, web3}) => {
    const collection = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
    await setCollectionLimitsExpectSuccess(alice, collection, {nestingRule: 'Disabled'});
    const caller = await createEthAccountWithBalance(api, web3);

    // Try to create a nested token
    await expect(executeTransaction(api, alice, api.tx.unique.createItem(
      collection, 
      {Ethereum: caller}, 
          {nft: {const_data: [], variable_data: []}} as any,
    )), 'while creating nested token').to.be.rejectedWith(/^common\.NestingIsDisabled$/);

    // Create a token to be nested
    const newToken = await createItemExpectSuccess(alice, collection, 'NFT');
    // Try to nest
    await expect(executeTransaction(api, alice, api.tx.unique.transfer({Ethereum: caller}, collection, newToken, 1)), 'while nesting new token').to.be.rejectedWith(/common\.NestingIsDisabled/);
    // expect(await getTopmostTokenOwner(api, collection, newToken)).to.be.deep.equal({Substrate: alice.address});
    expect(await getTokenOwner(api, collection, newToken)).to.be.deep.equal({Substrate: alice.address});
  });
  
  itWeb3('NFT: disallows a non-Owner to nest someone else\'s token', async ({api, web3}) => {
    const collection = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
    await setCollectionLimitsExpectSuccess(alice, collection, {nestingRule: 'Owner'});

    await addToAllowListExpectSuccess(alice, collection, bob.address);
    await enableAllowListExpectSuccess(alice, collection);
    await enablePublicMintingExpectSuccess(alice, collection);

    // Create a token to attempt to be nested into
    const caller = await createEthAccountWithBalance(api, web3);

    // Try to create a nested token in the wrong collection
    await expect(executeTransaction(api, alice, api.tx.unique.createItem(
      collection, 
      {Ethereum: caller}, 
          {nft: {const_data: [], variable_data: []}} as any,
    )), 'while creating nested token').to.be.rejectedWith(/common\.OnlyOwnerAllowedToNest/);

    // Try to create and nest a token in the wrong collection
    const newToken = await createItemExpectSuccess(alice, collection, 'NFT');
    await expect(executeTransaction(api, alice, api.tx.unique.transfer({Ethereum: caller}, collection, newToken, 1)), 'while nesting new token').to.be.rejectedWith(/common\.AddressNotInAllowlist/);
    expect(await getTokenOwner(api, collection, newToken)).to.be.deep.equal({Substrate: alice.address});
  });
  
  itWeb3('NFT: disallows a non-Owner to nest someone else\'s token (Restricted nesting)', async ({api, web3}) => {
    const collection = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
    await setCollectionLimitsExpectSuccess(alice, collection, {nestingRule: {OwnerRestricted:[collection]}});

    await addToAllowListExpectSuccess(alice, collection, bob.address);
    await enableAllowListExpectSuccess(alice, collection);
    await enablePublicMintingExpectSuccess(alice, collection);

    // Create a token to attempt to be nested into
    const caller = await createEthAccountWithBalance(api, web3);

    // Try to create a nested token in the wrong collection
    await expect(executeTransaction(api, alice, api.tx.unique.createItem(
      collection, 
      {Ethereum: caller}, 
          {nft: {const_data: [], variable_data: []}} as any,
    )), 'while creating nested token').to.be.rejectedWith(/common\.OnlyOwnerAllowedToNest/);

    // Try to create and nest a token in the wrong collection
    const newToken = await createItemExpectSuccess(alice, collection, 'NFT');
    await expect(executeTransaction(api, alice, api.tx.unique.transfer({Ethereum: caller}, collection, newToken, 1)), 'while nesting new token').to.be.rejectedWith(/common\.AddressNotInAllowlist/);
    expect(await getTokenOwner(api, collection, newToken)).to.be.deep.equal({Substrate: alice.address});
  });
  
  itWeb3('NFT: disallows to nest token in an unlisted collection', async ({api, web3}) => {
    const collection = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
    await setCollectionLimitsExpectSuccess(alice, collection, {nestingRule: {OwnerRestricted:[]}});

    // Create a token to attempt to be nested into
    const caller = await createEthAccountWithBalance(api, web3);

    // Try to create a nested token in the wrong collection
    await expect(executeTransaction(api, alice, api.tx.unique.createItem(
      collection, 
      {Ethereum: caller}, 
          {nft: {const_data: [], variable_data: []}} as any,
    )), 'while creating nested token').to.be.rejectedWith(/common\.SourceCollectionIsNotAllowedToNest/);

    // Try to create and nest a token in the wrong collection
    const newToken = await createItemExpectSuccess(alice, collection, 'NFT');
    await expect(executeTransaction(api, alice, api.tx.unique.transfer({Ethereum: caller}, collection, newToken, 1)), 'while nesting new token').to.be.rejectedWith(/common\.SourceCollectionIsNotAllowedToNest/);
    expect(await getTokenOwner(api, collection, newToken)).to.be.deep.equal({Substrate: alice.address});
  });
});
