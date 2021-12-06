//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {default as usingApi, submitTransactionAsync, submitTransactionExpectFailAsync} from './substrate/substrate-api';
import {
  createCollectionExpectSuccess,
  setCollectionSponsorExpectSuccess,
  destroyCollectionExpectSuccess,
  confirmSponsorshipExpectSuccess,
  confirmSponsorshipExpectFailure,
  createItemExpectSuccess,
  findUnusedAddress,
  getGenericResult,
  enableAllowListExpectSuccess,
  enablePublicMintingExpectSuccess,
  addToAllowListExpectSuccess,
  normalizeAccountId,
  addCollectionAdminExpectSuccess,
  getCreatedCollectionCount,
} from './util/helpers';
import {Keyring} from '@polkadot/api';
import {IKeyringPair} from '@polkadot/types/types';

chai.use(chaiAsPromised);
const expect = chai.expect;

let alice: IKeyringPair;
let bob: IKeyringPair;
let charlie: IKeyringPair;

describe('integration test: ext. confirmSponsorship():', () => {

  before(async () => {
    await usingApi(async () => {
      const keyring = new Keyring({type: 'sr25519'});
      alice = keyring.addFromUri('//Alice');
      bob = keyring.addFromUri('//Bob');
      charlie = keyring.addFromUri('//Charlie');
    });
  });

  it('Confirm collection sponsorship', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await setCollectionSponsorExpectSuccess(collectionId, bob.address);
    await confirmSponsorshipExpectSuccess(collectionId, '//Bob');
  });
  it('Add sponsor to a collection after the same sponsor was already added and confirmed', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await setCollectionSponsorExpectSuccess(collectionId, bob.address);
    await confirmSponsorshipExpectSuccess(collectionId, '//Bob');
    await setCollectionSponsorExpectSuccess(collectionId, bob.address);
  });
  it('Add new sponsor to a collection after another sponsor was already added and confirmed', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await setCollectionSponsorExpectSuccess(collectionId, bob.address);
    await confirmSponsorshipExpectSuccess(collectionId, '//Bob');
    await setCollectionSponsorExpectSuccess(collectionId, charlie.address);
  });

  it('NFT: Transfer fees are paid by the sponsor after confirmation', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await setCollectionSponsorExpectSuccess(collectionId, bob.address);
    await confirmSponsorshipExpectSuccess(collectionId, '//Bob');

    await usingApi(async (api) => {
      const sponsorBalanceBefore = (await api.query.system.account(bob.address)).data.free.toBigInt();

      // Find unused address
      const zeroBalance = await findUnusedAddress(api);

      // Mint token for unused address
      const itemId = await createItemExpectSuccess(alice, collectionId, 'NFT', zeroBalance.address);

      // Transfer this tokens from unused address to Alice
      const zeroToAlice = api.tx.unique.transfer(normalizeAccountId(zeroBalance.address), collectionId, itemId, 0);
      const events = await submitTransactionAsync(zeroBalance, zeroToAlice);
      const result = getGenericResult(events);
      expect(result.success).to.be.true;

      const sponsorBalanceAfter = (await api.query.system.account(bob.address)).data.free.toBigInt();

      expect(sponsorBalanceAfter < sponsorBalanceBefore).to.be.true;
    });

  });

  it('Fungible: Transfer fees are paid by the sponsor after confirmation', async () => {
    const collectionId = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});
    await setCollectionSponsorExpectSuccess(collectionId, bob.address);
    await confirmSponsorshipExpectSuccess(collectionId, '//Bob');

    await usingApi(async (api) => {
      const sponsorBalanceBefore = (await api.query.system.account(bob.address)).data.free.toBigInt();

      // Find unused address
      const zeroBalance = await findUnusedAddress(api);

      // Mint token for unused address
      const itemId = await createItemExpectSuccess(alice, collectionId, 'Fungible', zeroBalance.address);

      // Transfer this tokens from unused address to Alice
      const zeroToAlice = api.tx.unique.transfer(normalizeAccountId(zeroBalance.address), collectionId, itemId, 1);
      const events1 = await submitTransactionAsync(zeroBalance, zeroToAlice);
      const result1 = getGenericResult(events1);
      expect(result1.success).to.be.true;

      const sponsorBalanceAfter = (await api.query.system.account(bob.address)).data.free.toBigInt();

      expect(sponsorBalanceAfter < sponsorBalanceBefore).to.be.true;
    });
  });

  it('ReFungible: Transfer fees are paid by the sponsor after confirmation', async () => {
    const collectionId = await createCollectionExpectSuccess({mode: {type: 'ReFungible'}});
    await setCollectionSponsorExpectSuccess(collectionId, bob.address);
    await confirmSponsorshipExpectSuccess(collectionId, '//Bob');

    await usingApi(async (api) => {
      const sponsorBalanceBefore = (await api.query.system.account(bob.address)).data.free.toBigInt();

      // Find unused address
      const zeroBalance = await findUnusedAddress(api);

      // Mint token for unused address
      const itemId = await createItemExpectSuccess(alice, collectionId, 'ReFungible', zeroBalance.address);

      // Transfer this tokens from unused address to Alice
      const zeroToAlice = api.tx.unique.transfer(normalizeAccountId(zeroBalance.address), collectionId, itemId, 1);
      const events1 = await submitTransactionAsync(zeroBalance, zeroToAlice);
      const result1 = getGenericResult(events1);

      const sponsorBalanceAfter = (await api.query.system.account(bob.address)).data.free.toBigInt();

      expect(result1.success).to.be.true;
      expect(sponsorBalanceAfter < sponsorBalanceBefore).to.be.true;
    });
  });

  it('CreateItem fees are paid by the sponsor after confirmation', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await setCollectionSponsorExpectSuccess(collectionId, bob.address);
    await confirmSponsorshipExpectSuccess(collectionId, '//Bob');

    // Enable collection allow list
    await enableAllowListExpectSuccess(alice, collectionId);

    // Enable public minting
    await enablePublicMintingExpectSuccess(alice, collectionId);

    // Create Item
    await usingApi(async (api) => {
      const sponsorBalanceBefore = (await api.query.system.account(bob.address)).data.free.toBigInt();

      // Find unused address
      const zeroBalance = await findUnusedAddress(api);

      // Add zeroBalance address to allow list
      await addToAllowListExpectSuccess(alice, collectionId, zeroBalance.address);

      // Mint token using unused address as signer
      await createItemExpectSuccess(zeroBalance, collectionId, 'NFT', zeroBalance.address);

      const sponsorBalanceAfter = (await api.query.system.account(bob.address)).data.free.toBigInt();

      expect(sponsorBalanceAfter < sponsorBalanceBefore).to.be.true;
    });
  });

  it('NFT: Sponsoring of transfers is rate limited', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await setCollectionSponsorExpectSuccess(collectionId, bob.address);
    await confirmSponsorshipExpectSuccess(collectionId, '//Bob');

    await usingApi(async (api) => {
      // Find unused address
      const zeroBalance = await findUnusedAddress(api);

      // Mint token for alice
      const itemId = await createItemExpectSuccess(alice, collectionId, 'NFT', alice.address);

      // Transfer this token from Alice to unused address and back
      // Alice to Zero gets sponsored
      const aliceToZero = api.tx.unique.transfer(normalizeAccountId(zeroBalance.address), collectionId, itemId, 0);
      const events1 = await submitTransactionAsync(alice, aliceToZero);
      const result1 = getGenericResult(events1);

      // Second transfer should fail
      const sponsorBalanceBefore = (await api.query.system.account(bob.address)).data.free.toBigInt();
      const zeroToAlice = api.tx.unique.transfer(normalizeAccountId(alice.address), collectionId, itemId, 0);
      const badTransaction = async function () {
        await submitTransactionExpectFailAsync(zeroBalance, zeroToAlice);
      };
      await expect(badTransaction()).to.be.rejectedWith('Inability to pay some fees');
      const sponsorBalanceAfter = (await api.query.system.account(bob.address)).data.free.toBigInt();

      // Try again after Zero gets some balance - now it should succeed
      const balancetx = api.tx.balances.transfer(zeroBalance.address, 1e15);
      await submitTransactionAsync(alice, balancetx);
      const events2 = await submitTransactionAsync(zeroBalance, zeroToAlice);
      const result2 = getGenericResult(events2);

      expect(result1.success).to.be.true;
      expect(result2.success).to.be.true;
      expect(sponsorBalanceAfter).to.be.equal(sponsorBalanceBefore);
    });
  });

  it('Fungible: Sponsoring is rate limited', async () => {
    const collectionId = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});
    await setCollectionSponsorExpectSuccess(collectionId, bob.address);
    await confirmSponsorshipExpectSuccess(collectionId, '//Bob');

    await usingApi(async (api) => {
      // Find unused address
      const zeroBalance = await findUnusedAddress(api);

      // Mint token for unused address
      const itemId = await createItemExpectSuccess(alice, collectionId, 'Fungible', zeroBalance.address);

      // Transfer this tokens in parts from unused address to Alice
      const zeroToAlice = api.tx.unique.transfer(normalizeAccountId(zeroBalance.address), collectionId, itemId, 1);
      const events1 = await submitTransactionAsync(zeroBalance, zeroToAlice);
      const result1 = getGenericResult(events1);
      expect(result1.success).to.be.true;

      const sponsorBalanceBefore = (await api.query.system.account(bob.address)).data.free.toBigInt();
      await expect(submitTransactionExpectFailAsync(zeroBalance, zeroToAlice)).to.be.rejected;
      const sponsorBalanceAfter = (await api.query.system.account(bob.address)).data.free.toBigInt();

      // Try again after Zero gets some balance - now it should succeed
      const balancetx = api.tx.balances.transfer(zeroBalance.address, 1e15);
      await submitTransactionAsync(alice, balancetx);
      const events2 = await submitTransactionAsync(zeroBalance, zeroToAlice);
      const result2 = getGenericResult(events2);
      expect(result2.success).to.be.true;

      expect(sponsorBalanceAfter).to.be.equal(sponsorBalanceBefore);
    });
  });

  it('ReFungible: Sponsoring is rate limited', async () => {
    const collectionId = await createCollectionExpectSuccess({mode: {type: 'ReFungible'}});
    await setCollectionSponsorExpectSuccess(collectionId, bob.address);
    await confirmSponsorshipExpectSuccess(collectionId, '//Bob');

    await usingApi(async (api) => {
      // Find unused address
      const zeroBalance = await findUnusedAddress(api);

      // Mint token for alice
      const itemId = await createItemExpectSuccess(alice, collectionId, 'ReFungible', zeroBalance.address);

      const zeroToAlice = api.tx.unique.transfer(normalizeAccountId(alice.address), collectionId, itemId, 1);

      // Zero to alice gets sponsored
      const events1 = await submitTransactionAsync(zeroBalance, zeroToAlice);
      const result1 = getGenericResult(events1);
      expect(result1.success).to.be.true;

      // Second transfer should fail
      const sponsorBalanceBefore = (await api.query.system.account(bob.address)).data.free.toBigInt();
      await expect(submitTransactionExpectFailAsync(zeroBalance, zeroToAlice)).to.be.rejectedWith('Inability to pay some fees');
      const sponsorBalanceAfter = (await api.query.system.account(bob.address)).data.free.toBigInt();
      expect(sponsorBalanceAfter).to.be.equal(sponsorBalanceBefore);

      // Try again after Zero gets some balance - now it should succeed
      const balancetx = api.tx.balances.transfer(zeroBalance.address, 1e15);
      await submitTransactionAsync(alice, balancetx);
      const events2 = await submitTransactionAsync(zeroBalance, zeroToAlice);
      const result2 = getGenericResult(events2);
      expect(result2.success).to.be.true;
    });
  });

  it('NFT: Sponsoring of createItem is rate limited', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await setCollectionSponsorExpectSuccess(collectionId, bob.address);
    await confirmSponsorshipExpectSuccess(collectionId, '//Bob');

    // Enable collection allow list
    await enableAllowListExpectSuccess(alice, collectionId);

    // Enable public minting
    await enablePublicMintingExpectSuccess(alice, collectionId);

    await usingApi(async (api) => {
      // Find unused address
      const zeroBalance = await findUnusedAddress(api);

      // Add zeroBalance address to allow list
      await addToAllowListExpectSuccess(alice, collectionId, zeroBalance.address);

      // Mint token using unused address as signer - gets sponsored
      await createItemExpectSuccess(zeroBalance, collectionId, 'NFT', zeroBalance.address);

      // Second mint should fail
      const sponsorBalanceBefore = (await api.query.system.account(bob.address)).data.free.toBigInt();

      const badTransaction = async function () {
        await createItemExpectSuccess(zeroBalance, collectionId, 'NFT', zeroBalance.address);
      };
      await expect(badTransaction()).to.be.rejectedWith('Inability to pay some fees');
      const sponsorBalanceAfter = (await api.query.system.account(bob.address)).data.free.toBigInt();

      // Try again after Zero gets some balance - now it should succeed
      const balancetx = api.tx.balances.transfer(zeroBalance.address, 1e15);
      await submitTransactionAsync(alice, balancetx);
      await createItemExpectSuccess(zeroBalance, collectionId, 'NFT', zeroBalance.address);

      expect(sponsorBalanceAfter).to.be.equal(sponsorBalanceBefore);
    });
  });

});

describe('(!negative test!) integration test: ext. confirmSponsorship():', () => {
  before(async () => {
    await usingApi(async () => {
      const keyring = new Keyring({type: 'sr25519'});
      alice = keyring.addFromUri('//Alice');
      bob = keyring.addFromUri('//Bob');
      charlie = keyring.addFromUri('//Charlie');
    });
  });

  it('(!negative test!) Confirm sponsorship for a collection that never existed', async () => {
    // Find the collection that never existed
    let collectionId = 0;
    await usingApi(async (api) => {
      collectionId = await getCreatedCollectionCount(api) + 1;
    });

    await confirmSponsorshipExpectFailure(collectionId, '//Bob');
  });

  it('(!negative test!) Confirm sponsorship using a non-sponsor address', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await setCollectionSponsorExpectSuccess(collectionId, bob.address);

    await usingApi(async (api) => {
      const transfer = api.tx.balances.transfer(charlie.address, 1e15);
      await submitTransactionAsync(alice, transfer);
    });

    await confirmSponsorshipExpectFailure(collectionId, '//Charlie');
  });

  it('(!negative test!) Confirm sponsorship using owner address', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await setCollectionSponsorExpectSuccess(collectionId, bob.address);
    await confirmSponsorshipExpectFailure(collectionId, '//Alice');
  });

  it('(!negative test!) Confirm sponsorship by collection admin', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await setCollectionSponsorExpectSuccess(collectionId, bob.address);
    await addCollectionAdminExpectSuccess(alice, collectionId, charlie.address);
    await confirmSponsorshipExpectFailure(collectionId, '//Charlie');
  });

  it('(!negative test!) Confirm sponsorship without sponsor being set with setCollectionSponsor', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await confirmSponsorshipExpectFailure(collectionId, '//Bob');
  });

  it('(!negative test!) Confirm sponsorship in a collection that was destroyed', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await destroyCollectionExpectSuccess(collectionId);
    await confirmSponsorshipExpectFailure(collectionId, '//Bob');
  });

  it('(!negative test!) Transfer fees are not paid by the sponsor if the transfer failed', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await setCollectionSponsorExpectSuccess(collectionId, bob.address);
    await confirmSponsorshipExpectSuccess(collectionId, '//Bob');

    await usingApi(async (api) => {
      // Find unused address
      const ownerZeroBalance = await findUnusedAddress(api);

      // Find another unused address
      const senderZeroBalance = await findUnusedAddress(api);

      // Mint token for an unused address
      const itemId = await createItemExpectSuccess(alice, collectionId, 'NFT', ownerZeroBalance.address);

      const sponsorBalanceBeforeTx = (await api.query.system.account(bob.address)).data.free.toBigInt();

      // Try to transfer this token from an unsponsored unused adress to Alice
      const zeroToAlice = api.tx.unique.transfer(normalizeAccountId(alice.address), collectionId, itemId, 0);
      await expect(submitTransactionExpectFailAsync(senderZeroBalance, zeroToAlice)).to.be.rejected;

      const sponsorBalanceAfterTx = (await api.query.system.account(bob.address)).data.free.toBigInt();

      expect(sponsorBalanceAfterTx).to.equal(sponsorBalanceBeforeTx);
    });
  });
});
