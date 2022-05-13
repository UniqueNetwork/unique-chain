import {expect} from 'chai';
import {tokenIdToAddress} from '../eth/util/helpers';
import privateKey from '../substrate/privateKey';
import usingApi, {executeTransaction} from '../substrate/substrate-api';
import {
  createCollectionExpectSuccess,
  createItemExpectSuccess,
  getBalance,
  getTokenOwner,
  normalizeAccountId,
  setCollectionLimitsExpectSuccess,
  transferExpectSuccess,
  transferFromExpectSuccess,
} from '../util/helpers';
import {IKeyringPair} from '@polkadot/types/types';

let alice: IKeyringPair;
let bob: IKeyringPair;

describe('Integration Test: Unnesting', () => {
  before(async () => {
    await usingApi(async () => {
      alice = privateKey('//Alice');
      bob = privateKey('//Bob');
    });
  });

  it('NFT: allows the owner to successfully unnest a token', async () => {
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
      ), 'while unnesting').to.not.be.rejected;
      expect(await getTokenOwner(api, collection, nestedToken)).to.be.deep.equal({Substrate: alice.address});

      // Nest and burn
      await transferExpectSuccess(collection, nestedToken, alice, targetAddress);
      await expect(executeTransaction(
        api,
        alice,
        api.tx.unique.burnFrom(collection, normalizeAccountId(targetAddress), nestedToken, 1),
      ), 'while burning').to.not.be.rejected;
      await expect(getTokenOwner(api, collection, nestedToken)).to.be.rejected;
    });
  });

  it('Fungible: allows the owner to successfully unnest a token', async () => {
    await usingApi(async api => {
      const collection = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
      await setCollectionLimitsExpectSuccess(alice, collection, {nestingRule: 'Owner'});
      const targetToken = await createItemExpectSuccess(alice, collection, 'NFT');
      const targetAddress = {Ethereum: tokenIdToAddress(collection, targetToken)};

      const collectionFT = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});
      const nestedToken = await createItemExpectSuccess(alice, collectionFT, 'Fungible');

      // Nest and unnest
      await transferExpectSuccess(collectionFT, nestedToken, alice, targetAddress, 1, 'Fungible');
      await transferFromExpectSuccess(collectionFT, nestedToken, alice, targetAddress, alice, 1, 'Fungible');

      // Nest and burn
      await transferExpectSuccess(collectionFT, nestedToken, alice, targetAddress, 1, 'Fungible');
      const balanceBefore = await getBalance(api, collectionFT, normalizeAccountId(targetAddress), nestedToken);
      await expect(executeTransaction(
        api,
        alice,
        api.tx.unique.burnFrom(collectionFT, normalizeAccountId(targetAddress), nestedToken, 1),
      ), 'while burning').to.not.be.rejected;
      const balanceAfter = await getBalance(api, collectionFT, normalizeAccountId(targetAddress), nestedToken);
      expect(balanceAfter + BigInt(1)).to.be.equal(balanceBefore);
    });
  });

  it('ReFungible: allows the owner to successfully unnest a token', async () => {
    await usingApi(async api => {
      const collection = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
      await setCollectionLimitsExpectSuccess(alice, collection, {nestingRule: 'Owner'});
      const targetToken = await createItemExpectSuccess(alice, collection, 'NFT');
      const targetAddress = {Ethereum: tokenIdToAddress(collection, targetToken)};

      const collectionRFT = await createCollectionExpectSuccess({mode: {type: 'ReFungible'}});
      const nestedToken = await createItemExpectSuccess(alice, collectionRFT, 'ReFungible');

      // Nest and unnest
      await transferExpectSuccess(collectionRFT, nestedToken, alice, targetAddress, 1, 'ReFungible');
      await transferFromExpectSuccess(collectionRFT, nestedToken, alice, targetAddress, alice, 1, 'ReFungible');

      // Nest and burn
      await transferExpectSuccess(collectionRFT, nestedToken, alice, targetAddress, 1, 'ReFungible');
      await expect(executeTransaction(
        api,
        alice,
        api.tx.unique.burnFrom(collectionRFT, normalizeAccountId(targetAddress), nestedToken, 1),
      ), 'while burning').to.not.be.rejected;
      const balance = await getBalance(api, collectionRFT, normalizeAccountId(targetAddress), nestedToken);
      expect(balance).to.be.equal(0n);
    });
  });
});

describe('Negative Test: Unnesting', () => {
  before(async () => {
    await usingApi(async () => {
      alice = privateKey('//Alice');
      bob = privateKey('//Bob');
    });
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
      ), 'while unnesting').to.be.rejectedWith(/^common\.ApprovedValueTooLow$/);
      expect(await getTokenOwner(api, collection, nestedToken)).to.be.deep.equal({Ethereum: tokenIdToAddress(collection, targetToken).toLowerCase()});

      // Try to burn
      await expect(executeTransaction(
        api,
        bob,
        api.tx.unique.burnFrom(collection, normalizeAccountId(bob.address), nestedToken, 1),
      ), 'while burning').to.not.be.rejectedWith(/^common\.ApprovedValueTooLow$/);
      expect(await getTokenOwner(api, collection, nestedToken)).to.be.deep.equal({Ethereum: tokenIdToAddress(collection, targetToken).toLowerCase()});
    });
  });

  // todo another test for creating excessive depth matryoshka with Ethereum?

  // Recursive nesting
  it('Prevents Ouroboros creation', async () => {
    const collection = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
    await setCollectionLimitsExpectSuccess(alice, collection, {nestingRule: 'Owner'});
    const targetToken = await createItemExpectSuccess(alice, collection, 'NFT');

    // Create a nested token ouroboros
    const nestedToken = await createItemExpectSuccess(alice, collection, 'NFT', {Ethereum: tokenIdToAddress(collection, targetToken)});
    expect(transferExpectSuccess(collection, targetToken, alice, {Ethereum: tokenIdToAddress(collection, nestedToken)})).to.be.rejectedWith(/^structure\.OuroborosDetected$/);
  });
});
