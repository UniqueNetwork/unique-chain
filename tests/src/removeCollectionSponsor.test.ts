//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {default as usingApi, submitTransactionExpectFailAsync} from './substrate/substrate-api';
import {
  createCollectionExpectSuccess,
  setCollectionSponsorExpectSuccess,
  destroyCollectionExpectSuccess,
  confirmSponsorshipExpectSuccess,
  confirmSponsorshipExpectFailure,
  createItemExpectSuccess,
  findUnusedAddress,
  removeCollectionSponsorExpectSuccess,
  removeCollectionSponsorExpectFailure,
  normalizeAccountId,
  addCollectionAdminExpectSuccess,
} from './util/helpers';
import {Keyring} from '@polkadot/api';
import {IKeyringPair} from '@polkadot/types/types';

chai.use(chaiAsPromised);
const expect = chai.expect;

let alice: IKeyringPair;
let bob: IKeyringPair;

describe('integration test: ext. removeCollectionSponsor():', () => {

  before(async () => {
    await usingApi(async () => {
      const keyring = new Keyring({type: 'sr25519'});
      alice = keyring.addFromUri('//Alice');
      bob = keyring.addFromUri('//Bob');
    });
  });

  it('Removing NFT collection sponsor stops sponsorship', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await setCollectionSponsorExpectSuccess(collectionId, bob.address);
    await confirmSponsorshipExpectSuccess(collectionId, '//Bob');
    await removeCollectionSponsorExpectSuccess(collectionId);

    await usingApi(async (api) => {
      // Find unused address
      const zeroBalance = await findUnusedAddress(api);

      // Mint token for unused address
      const itemId = await createItemExpectSuccess(alice, collectionId, 'NFT', zeroBalance.address);

      // Transfer this tokens from unused address to Alice - should fail
      const sponsorBalanceBefore = (await api.query.system.account(bob.address)).data.free.toBigInt();
      const zeroToAlice = api.tx.nft.transfer(normalizeAccountId(alice.address), collectionId, itemId, 0);
      const badTransaction = async function () {
        await submitTransactionExpectFailAsync(zeroBalance, zeroToAlice);
      };
      await expect(badTransaction()).to.be.rejectedWith('Inability to pay some fees');
      const sponsorBalanceAfter = (await api.query.system.account(bob.address)).data.free.toBigInt();

      expect(sponsorBalanceAfter).to.be.equal(sponsorBalanceBefore);
    });
  });

  it('Remove a sponsor after it was already removed', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await setCollectionSponsorExpectSuccess(collectionId, bob.address);
    await confirmSponsorshipExpectSuccess(collectionId, '//Bob');
    await removeCollectionSponsorExpectSuccess(collectionId);
    await removeCollectionSponsorExpectSuccess(collectionId);
  });

  it('Remove sponsor in a collection that never had the sponsor set', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await removeCollectionSponsorExpectSuccess(collectionId);
  });

  it('Remove sponsor for a collection that had the sponsor set, but not confirmed', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await setCollectionSponsorExpectSuccess(collectionId, bob.address);
    await removeCollectionSponsorExpectSuccess(collectionId);
  });

});

describe('(!negative test!) integration test: ext. removeCollectionSponsor():', () => {
  before(async () => {
    await usingApi(async () => {
      const keyring = new Keyring({type: 'sr25519'});
      alice = keyring.addFromUri('//Alice');
      bob = keyring.addFromUri('//Bob');
    });
  });

  it('(!negative test!) Remove sponsor for a collection that never existed', async () => {
    // Find the collection that never existed
    let collectionId = 0;
    await usingApi(async (api) => {
      collectionId = (await api.query.common.createdCollectionCount()).toNumber() + 1;
    });

    await removeCollectionSponsorExpectFailure(collectionId);
  });

  it('(!negative test!) Remove sponsor for a collection with collection admin permissions', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await setCollectionSponsorExpectSuccess(collectionId, bob.address);
    await addCollectionAdminExpectSuccess(alice, collectionId, bob.address);
    await removeCollectionSponsorExpectFailure(collectionId, '//Bob');
  });

  it('(!negative test!) Remove sponsor for a collection by regular user', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await setCollectionSponsorExpectSuccess(collectionId, bob.address);
    await removeCollectionSponsorExpectFailure(collectionId, '//Bob');
  });

  it('(!negative test!) Remove sponsor in a destroyed collection', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await setCollectionSponsorExpectSuccess(collectionId, bob.address);
    await destroyCollectionExpectSuccess(collectionId);
    await removeCollectionSponsorExpectFailure(collectionId);
  });

  it('Set - remove - confirm: fails', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await setCollectionSponsorExpectSuccess(collectionId, bob.address);
    await removeCollectionSponsorExpectSuccess(collectionId);
    await confirmSponsorshipExpectFailure(collectionId, '//Bob');
  });

  it('Set - confirm - remove - confirm: Sponsor cannot come back', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await setCollectionSponsorExpectSuccess(collectionId, bob.address);
    await confirmSponsorshipExpectSuccess(collectionId, '//Bob');
    await removeCollectionSponsorExpectSuccess(collectionId);
    await confirmSponsorshipExpectFailure(collectionId, '//Bob');
  });

});
