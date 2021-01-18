//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { default as usingApi, submitTransactionAsync, submitTransactionExpectFailAsync } from "./substrate/substrate-api";
import { 
  createCollectionExpectSuccess, 
  setCollectionSponsorExpectSuccess, 
  destroyCollectionExpectSuccess, 
  setCollectionSponsorExpectFailure,
  confirmSponsorshipExpectSuccess,
  confirmSponsorshipExpectFailure,
  createItemExpectSuccess,
  findUnusedAddress,
  getGenericResult,
  enableWhiteListExpectSuccess,
  enablePublicMintingExpectSuccess,
  addToWhiteListExpectSuccess,
} from "./util/helpers";
import { Keyring } from "@polkadot/api";
import { IKeyringPair } from "@polkadot/types/types";
import type { AccountId } from '@polkadot/types/interfaces';
import { BigNumber } from 'bignumber.js';

chai.use(chaiAsPromised);
const expect = chai.expect;

let alice: IKeyringPair;
let bob: IKeyringPair;
let charlie: IKeyringPair;

describe('integration test: ext. confirmSponsorship():', () => {

  before(async () => {
    await usingApi(async (api) => {
      const keyring = new Keyring({ type: 'sr25519' });
      alice = keyring.addFromUri(`//Alice`);
      bob = keyring.addFromUri(`//Bob`);
      charlie = keyring.addFromUri(`//Charlie`);
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
      const AsponsorBalance = new BigNumber((await api.query.system.account(bob.address)).data.free.toString());

      // Find unused address
      const zeroBalance = await findUnusedAddress(api);

      // Mint token for unused address
      const itemId = await createItemExpectSuccess(alice, collectionId, 'NFT', zeroBalance.address);

      // Transfer this tokens from unused address to Alice
      const zeroToAlice = api.tx.nft.transfer(zeroBalance.address, collectionId, itemId, 0);
      const events = await submitTransactionAsync(zeroBalance, zeroToAlice);
      const result = getGenericResult(events);

      const BsponsorBalance = new BigNumber((await api.query.system.account(bob.address)).data.free.toString());

      expect(result.success).to.be.true;
      expect(BsponsorBalance.lt(AsponsorBalance)).to.be.true;
    });

  });

  it('Fungible: Transfer fees are paid by the sponsor after confirmation', async () => {
    const collectionId = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0 }});
    await setCollectionSponsorExpectSuccess(collectionId, bob.address);
    await confirmSponsorshipExpectSuccess(collectionId, '//Bob');

    await usingApi(async (api) => {
      const AsponsorBalance = new BigNumber((await api.query.system.account(bob.address)).data.free.toString());

      // Find unused address
      const zeroBalance = await findUnusedAddress(api);

      // Mint token for unused address
      const itemId = await createItemExpectSuccess(alice, collectionId, 'Fungible', zeroBalance.address);

      // Transfer this tokens from unused address to Alice
      const zeroToAlice = api.tx.nft.transfer(zeroBalance.address, collectionId, itemId, 1);
      const events1 = await submitTransactionAsync(zeroBalance, zeroToAlice);
      const result1 = getGenericResult(events1);

      const BsponsorBalance = new BigNumber((await api.query.system.account(bob.address)).data.free.toString());

      expect(result1.success).to.be.true;
      expect(BsponsorBalance.lt(AsponsorBalance)).to.be.true;
    });
  });

  it('ReFungible: Transfer fees are paid by the sponsor after confirmation', async () => {
    const collectionId = await createCollectionExpectSuccess({mode: {type: 'ReFungible', decimalPoints: 0 }});
    await setCollectionSponsorExpectSuccess(collectionId, bob.address);
    await confirmSponsorshipExpectSuccess(collectionId, '//Bob');

    await usingApi(async (api) => {
      const AsponsorBalance = new BigNumber((await api.query.system.account(bob.address)).data.free.toString());

      // Find unused address
      const zeroBalance = await findUnusedAddress(api);

      // Mint token for unused address
      const itemId = await createItemExpectSuccess(alice, collectionId, 'ReFungible', zeroBalance.address);

      // Transfer this tokens from unused address to Alice
      const zeroToAlice = api.tx.nft.transfer(zeroBalance.address, collectionId, itemId, 1);
      const events1 = await submitTransactionAsync(zeroBalance, zeroToAlice);
      const result1 = getGenericResult(events1);

      const BsponsorBalance = new BigNumber((await api.query.system.account(bob.address)).data.free.toString());

      expect(result1.success).to.be.true;
      expect(BsponsorBalance.lt(AsponsorBalance)).to.be.true;
    });
  });

  it('CreateItem fees are paid by the sponsor after confirmation', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await setCollectionSponsorExpectSuccess(collectionId, bob.address);
    await confirmSponsorshipExpectSuccess(collectionId, '//Bob');

    // Enable collection white list 
    await enableWhiteListExpectSuccess(alice, collectionId);

    // Enable public minting
    await enablePublicMintingExpectSuccess(alice, collectionId);

    // Create Item 
    await usingApi(async (api) => {
      const AsponsorBalance = new BigNumber((await api.query.system.account(bob.address)).data.free.toString());

      // Find unused address
      const zeroBalance = await findUnusedAddress(api);

      // Add zeroBalance address to white list
      await addToWhiteListExpectSuccess(alice, collectionId, zeroBalance.address);

      // Mint token using unused address as signer
      const tokenId = await createItemExpectSuccess(zeroBalance, collectionId, 'NFT', zeroBalance.address);

      const BsponsorBalance = new BigNumber((await api.query.system.account(bob.address)).data.free.toString());

      expect(BsponsorBalance.lt(AsponsorBalance)).to.be.true;
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
      const aliceToZero = api.tx.nft.transfer(zeroBalance.address, collectionId, itemId, 0);
      const events1 = await submitTransactionAsync(alice, aliceToZero);
      const result1 = getGenericResult(events1);

      // Second transfer should fail
      const AsponsorBalance = new BigNumber((await api.query.system.account(bob.address)).data.free.toString());
      const zeroToAlice = api.tx.nft.transfer(alice.address, collectionId, itemId, 0);
      const badTransaction = async function () { 
        await submitTransactionExpectFailAsync(zeroBalance, zeroToAlice);
      };
      await expect(badTransaction()).to.be.rejectedWith("Inability to pay some fees");
      const BsponsorBalance = new BigNumber((await api.query.system.account(bob.address)).data.free.toString());

      // Try again after Zero gets some balance - now it should succeed
      const balancetx = api.tx.balances.transfer(zeroBalance.address, 1e15);
      await submitTransactionAsync(alice, balancetx);
      const events2 = await submitTransactionAsync(zeroBalance, zeroToAlice);
      const result2 = getGenericResult(events2);

      expect(result1.success).to.be.true;
      expect(result2.success).to.be.true;
      expect(BsponsorBalance.isEqualTo(AsponsorBalance)).to.be.true;
    });
  });

  it('Fungible: Sponsoring is rate limited', async () => {
    const collectionId = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0 }});
    await setCollectionSponsorExpectSuccess(collectionId, bob.address);
    await confirmSponsorshipExpectSuccess(collectionId, '//Bob');

    await usingApi(async (api) => {
      // Find unused address
      const zeroBalance = await findUnusedAddress(api);

      // Mint token for unused address
      const itemId = await createItemExpectSuccess(alice, collectionId, 'Fungible', zeroBalance.address);

      // Transfer this tokens in parts from unused address to Alice
      const zeroToAlice = api.tx.nft.transfer(zeroBalance.address, collectionId, itemId, 1);
      const events1 = await submitTransactionAsync(zeroBalance, zeroToAlice);
      const result1 = getGenericResult(events1);

      const AsponsorBalance = new BigNumber((await api.query.system.account(bob.address)).data.free.toString());

      const badTransaction = async function () { 
        await submitTransactionExpectFailAsync(zeroBalance, zeroToAlice);
      };

      const BsponsorBalance = new BigNumber((await api.query.system.account(bob.address)).data.free.toString());

      // Try again after Zero gets some balance - now it should succeed
      const balancetx = api.tx.balances.transfer(zeroBalance.address, 1e15);
      await submitTransactionAsync(alice, balancetx);
      const events2 = await submitTransactionAsync(zeroBalance, zeroToAlice);
      const result2 = getGenericResult(events2);

      expect(result1.success).to.be.true;
      expect(result2.success).to.be.true;
      expect(BsponsorBalance.isEqualTo(AsponsorBalance)).to.be.true;
    });
  });

  it('ReFungible: Sponsoring is rate limited', async () => {
    const collectionId = await createCollectionExpectSuccess({mode: {type: 'ReFungible', decimalPoints: 0 }});
    await setCollectionSponsorExpectSuccess(collectionId, bob.address);
    await confirmSponsorshipExpectSuccess(collectionId, '//Bob');

    await usingApi(async (api) => {
      // Find unused address
      const zeroBalance = await findUnusedAddress(api);

      // Mint token for alice
      const itemId = await createItemExpectSuccess(alice, collectionId, 'ReFungible', alice.address);

      // Transfer this token from Alice to unused address and back
      // Alice to Zero gets sponsored
      const aliceToZero = api.tx.nft.transfer(zeroBalance.address, collectionId, itemId, 1);
      const events1 = await submitTransactionAsync(alice, aliceToZero);
      const result1 = getGenericResult(events1);

      // Second transfer should fail
      const AsponsorBalance = new BigNumber((await api.query.system.account(bob.address)).data.free.toString());
      const zeroToAlice = api.tx.nft.transfer(alice.address, collectionId, itemId, 1);
      const badTransaction = async function () { 
        await submitTransactionExpectFailAsync(zeroBalance, zeroToAlice);
      };
      await expect(badTransaction()).to.be.rejectedWith("Inability to pay some fees");
      const BsponsorBalance = new BigNumber((await api.query.system.account(bob.address)).data.free.toString());

      // Try again after Zero gets some balance - now it should succeed
      const balancetx = api.tx.balances.transfer(zeroBalance.address, 1e15);
      await submitTransactionAsync(alice, balancetx);
      const events2 = await submitTransactionAsync(zeroBalance, zeroToAlice);
      const result2 = getGenericResult(events2);

      expect(result1.success).to.be.true;
      expect(result2.success).to.be.true;
      expect(BsponsorBalance.isEqualTo(AsponsorBalance)).to.be.true;
    });
  });

  it('NFT: Sponsoring of createItem is rate limited', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await setCollectionSponsorExpectSuccess(collectionId, bob.address);
    await confirmSponsorshipExpectSuccess(collectionId, '//Bob');

    // Enable collection white list 
    await enableWhiteListExpectSuccess(alice, collectionId);

    // Enable public minting
    await enablePublicMintingExpectSuccess(alice, collectionId);

    await usingApi(async (api) => {
      // Find unused address
      const zeroBalance = await findUnusedAddress(api);

      // Add zeroBalance address to white list
      await addToWhiteListExpectSuccess(alice, collectionId, zeroBalance.address);

      // Mint token using unused address as signer - gets sponsored
      await createItemExpectSuccess(zeroBalance, collectionId, 'NFT', zeroBalance.address);

      // Second mint should fail
      const AsponsorBalance = new BigNumber((await api.query.system.account(bob.address)).data.free.toString());
      
      const consoleError = console.error;
      const consoleLog = console.log;
      console.error = () => {};
      console.log = () => {};
      const badTransaction = async function () { 
        await createItemExpectSuccess(zeroBalance, collectionId, 'NFT', zeroBalance.address);
      };
      await expect(badTransaction()).to.be.rejectedWith("Inability to pay some fees");
      console.error = consoleError;
      console.log = consoleLog;
      const BsponsorBalance = new BigNumber((await api.query.system.account(bob.address)).data.free.toString());

      // Try again after Zero gets some balance - now it should succeed
      const balancetx = api.tx.balances.transfer(zeroBalance.address, 1e15);
      await submitTransactionAsync(alice, balancetx);
      await createItemExpectSuccess(zeroBalance, collectionId, 'NFT', zeroBalance.address);

      expect(BsponsorBalance.isEqualTo(AsponsorBalance)).to.be.true;
    });
  });

});

describe('(!negative test!) integration test: ext. removeCollectionSponsor():', () => {
  before(async () => {
    await usingApi(async (api) => {
      const keyring = new Keyring({ type: 'sr25519' });
      alice = keyring.addFromUri(`//Alice`);
      bob = keyring.addFromUri(`//Bob`);
      charlie = keyring.addFromUri(`//Charlie`);
    });
  });

  it('(!negative test!) Confirm sponsorship for a collection that never existed', async () => {
    // Find the collection that never existed
    const collectionId = 0;
    await usingApi(async (api) => {
      const collectionId = parseInt((await api.query.nft.createdCollectionCount()).toString()) + 1;
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

  it('(!negative test!) Confirm sponsorship without sponsor being set with setCollectionSponsor', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await confirmSponsorshipExpectFailure(collectionId, '//Bob');
  });
    
  it('(!negative test!) Confirm sponsorship in a collection that was destroyed', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await destroyCollectionExpectSuccess(collectionId);
    await confirmSponsorshipExpectFailure(collectionId, '//Bob');
  });
});
