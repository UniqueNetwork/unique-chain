import {expect} from 'chai';
import {tokenIdToAddress} from '../eth/util/helpers';
import privateKey from '../substrate/privateKey';
import usingApi, {executeTransaction} from '../substrate/substrate-api';
import {
  createCollectionExpectSuccess,
  createItemExpectFailure,
  createItemExpectSuccess,
  getTokenOwner,
  getTopmostTokenOwner,
  normalizeAccountId,
  setCollectionLimitsExpectSuccess,
  transferExpectSuccess,
} from '../util/helpers';
import {IKeyringPair} from '@polkadot/types/types';

let alice: IKeyringPair;
let bob: IKeyringPair;

describe('Integration Test: Unnesting', () => {
  before(async () => {
    alice = privateKey('//Alice');
    bob = privateKey('//Bob');
  });

  it('Allows the owner to successfully unnest a token', async () => {
    await usingApi(async api => {
      const collection = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
      await setCollectionLimitsExpectSuccess(alice, collection, {nestingRule: 'Owner'});
      const targetToken = await createItemExpectSuccess(alice, collection, 'NFT');
      const targetAddress = {Ethereum: tokenIdToAddress(collection, targetToken)};

      // Create a nested token
      const nestedToken = await createItemExpectSuccess(alice, collection, 'NFT', targetAddress);

      // Unnest
      await expect(executeTransaction(
        api,
        alice,
        api.tx.unique.transferFrom(normalizeAccountId(targetAddress), normalizeAccountId(alice), collection, nestedToken, 1),
      )).to.not.be.rejected;
      expect(await getTokenOwner(api, collection, nestedToken)).to.be.deep.equal({Substrate: alice.address});

      // Nest and burn
      await transferExpectSuccess(collection, nestedToken, alice, targetAddress);
      await expect(executeTransaction(
        api,
        alice,
        api.tx.unique.burnFrom(collection, normalizeAccountId(alice.address), nestedToken, 1),
      )).to.not.be.rejected;
      await expect(getTokenOwner(api, collection, nestedToken)).to.be.rejected; // 'owner == null'
    });
  });

  // todo refungible-fungible test just in case
});

describe('Negative Test: Unnesting', () => {
  before(async () => {
    alice = privateKey('//Alice');
    bob = privateKey('//Bob');
  });

  it('Disallows a non-owner to unnest/burn a token', async () => {
    await usingApi(async api => {
      const collection = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
      await setCollectionLimitsExpectSuccess(alice, collection, {nestingRule: 'Owner'});
      const targetToken = await createItemExpectSuccess(alice, collection, 'NFT');
      const targetAddress = {Ethereum: tokenIdToAddress(collection, targetToken)};

      // Create a nested token
      const nestedToken = await createItemExpectSuccess(alice, collection, 'NFT', targetAddress);

      // Try to unnest
      await expect(executeTransaction(
        api,
        bob,
        api.tx.unique.transferFrom(normalizeAccountId(targetAddress), normalizeAccountId(bob), collection, nestedToken, 1),
      )).to.be.rejectedWith(/^common\.ApprovedValueTooLow$/);
      //await transferFromExpectSuccess(collection, nestedToken, bob, targetAddress, {Substrate: bob.address});
      expect(await getTokenOwner(api, collection, nestedToken)).to.be.deep.equal({Ethereum: tokenIdToAddress(collection, targetToken).toLowerCase()});

      // Try to burn
      await expect(executeTransaction(
        api,
        bob,
        api.tx.unique.burnFrom(collection, normalizeAccountId(bob.address), nestedToken, 1),
      )).to.not.be.rejectedWith(/^common\.ApprovedValueTooLow$/);
      expect(await getTokenOwner(api, collection, nestedToken)).to.be.deep.equal({Ethereum: tokenIdToAddress(collection, targetToken).toLowerCase()});
    });
  });

  it('Disallows excessive token nesting', async () => {
    await usingApi(async api => {
      const collection = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
      await setCollectionLimitsExpectSuccess(alice, collection, {nestingRule: 'Owner'});
      const targetToken = await createItemExpectSuccess(alice, collection, 'NFT');

      // Create a nested token matryoshka
      const nestedToken1 = await createItemExpectSuccess(alice, collection, 'NFT', {Ethereum: tokenIdToAddress(collection, targetToken)});
      const nestedToken2 = await createItemExpectSuccess(alice, collection, 'NFT', {Ethereum: tokenIdToAddress(collection, nestedToken1)});
      // The nesting depth is limited by 2
      await createItemExpectFailure(alice, collection, 'NFT', {Ethereum: tokenIdToAddress(collection, nestedToken2)});

      expect(await getTopmostTokenOwner(api, collection, nestedToken2)).to.be.deep.equal({Substrate: alice.address});
    });
  });

  // todo another test for creating excessive depth matryoshka with Ethereum, move this one to nest ^

  // Recursive nesting
  it('Prevents ouroboros creation', async () => {
    const collection = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
    await setCollectionLimitsExpectSuccess(alice, collection, {nestingRule: 'Owner'});
    const targetToken = await createItemExpectSuccess(alice, collection, 'NFT');

    // Create a nested token ouroboros
    const nestedToken = await createItemExpectSuccess(alice, collection, 'NFT', {Ethereum: tokenIdToAddress(collection, targetToken)});
    expect(transferExpectSuccess(collection, targetToken, alice, {Ethereum: tokenIdToAddress(collection, nestedToken)})).to.be.rejectedWith(/^structure\.OuroborosDetected$/);
  });
});
