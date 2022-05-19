import {expect} from 'chai';
import {tokenIdToAddress} from '../eth/util/helpers';
import privateKey from '../substrate/privateKey';
import usingApi, {executeTransaction} from '../substrate/substrate-api';
import {createCollectionExpectSuccess, createFungibleItemExpectSuccess, createItemExpectSuccess, CrossAccountId, getCreateCollectionResult} from '../util/helpers';
import {IKeyringPair} from '@polkadot/types/types';

describe('nesting check', () => {
  let alice!: IKeyringPair;
  let nestTarget!: CrossAccountId;
  before(async() => {
    await usingApi(async api => {
      alice = privateKey('//Alice');
      const bob = privateKey('//Bob');
      const events = await executeTransaction(api, alice, api.tx.unique.createCollectionEx({
        mode: 'NFT',
        limits: {
          nestingRule: {OwnerRestricted: []},
        },
      }));
      const collection = getCreateCollectionResult(events).collectionId;
      const token = await createItemExpectSuccess(alice, collection, 'NFT', {Substrate: bob.address});
      nestTarget = {Ethereum: tokenIdToAddress(collection, token)};
    });
  });

  it('called for fungible', async () => {
    await usingApi(async api => {
      const collection = await createCollectionExpectSuccess({mode: {type: 'Fungible',decimalPoints:0}});
      await expect(executeTransaction(api, alice, api.tx.unique.createItem(collection, nestTarget, {Fungible: {Value: 1}})))
        .to.be.rejectedWith(/^common\.SourceCollectionIsNotAllowedToNest$/);

      await createFungibleItemExpectSuccess(alice, collection, {Value:1n}, {Substrate: alice.address});
      await expect(executeTransaction(api, alice, api.tx.unique.transfer(nestTarget, collection, 0, 1n)))
        .to.be.rejectedWith(/^common\.SourceCollectionIsNotAllowedToNest$/);
    });
  });

  it('called for nonfungible', async () => {
    await usingApi(async api => {
      const collection = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
      await expect(executeTransaction(api, alice, api.tx.unique.createItem(collection, nestTarget, {NFT: {ConstData: []}})))
        .to.be.rejectedWith(/^common\.SourceCollectionIsNotAllowedToNest$/);

      const token = await createItemExpectSuccess(alice, collection, 'NFT', {Substrate: alice.address});
      await expect(executeTransaction(api, alice, api.tx.unique.transfer(nestTarget, collection, token, 1n)))
        .to.be.rejectedWith(/^common\.SourceCollectionIsNotAllowedToNest$/);
    });
  });

  it('called for refungible', async () => {
    await usingApi(async api => {
      const collection = await createCollectionExpectSuccess({mode: {type: 'ReFungible'}});
      await expect(executeTransaction(api, alice, api.tx.unique.createItem(collection, nestTarget, {ReFungible: {ConstData: []}})))
        .to.be.rejectedWith(/^common\.SourceCollectionIsNotAllowedToNest$/);

      const token = await createItemExpectSuccess(alice, collection, 'ReFungible', {Substrate: alice.address});
      await expect(executeTransaction(api, alice, api.tx.unique.transfer(nestTarget, collection, token, 1n)))
        .to.be.rejectedWith(/^common\.SourceCollectionIsNotAllowedToNest$/);
    });
  });
});
