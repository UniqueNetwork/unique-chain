// Copyright 2019-2022 Unique Network (Gibraltar) Ltd.
// This file is part of Unique Network.

// Unique Network is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// Unique Network is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with Unique Network. If not, see <http://www.gnu.org/licenses/>.

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
  UNIQUE,
  requirePallets,
  Pallets,
} from './util/helpers';
import {IKeyringPair} from '@polkadot/types/types';
import {usingPlaygrounds} from './util/playgrounds';

chai.use(chaiAsPromised);
const expect = chai.expect;

let donor: IKeyringPair;

before(async () => {
  await usingPlaygrounds(async (_, privateKey) => {
    donor = privateKey('//Alice');
  });
});

let alice: IKeyringPair;
let bob: IKeyringPair;
let charlie: IKeyringPair;

describe('integration test: ext. confirmSponsorship():', () => {

  before(async () => {
    await usingPlaygrounds(async (helper) => {
      [alice, bob, charlie] = await helper.arrange.createAccounts([100n, 100n, 0n], donor);
    });
  });

  it('Confirm collection sponsorship', async () => {
    await usingPlaygrounds(async (helper) => {
      const collection = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
      await collection.setSponsor(alice, bob.address);
      await collection.confirmSponsorship(bob);
    });
  });

  it('Add sponsor to a collection after the same sponsor was already added and confirmed', async () => {
    await usingPlaygrounds(async (helper) => {
      const collection = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
      await collection.setSponsor(alice, bob.address);
      await collection.confirmSponsorship(bob);
      await collection.setSponsor(alice, bob.address);
    });
  });
  it('Add new sponsor to a collection after another sponsor was already added and confirmed', async () => {
    await usingPlaygrounds(async (helper) => {
      const collection = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
      await collection.setSponsor(alice, bob.address);
      await collection.confirmSponsorship(charlie);
    });
  });

  it('NFT: Transfer fees are paid by the sponsor after confirmation', async () => {
    await usingPlaygrounds(async (helper) => {
      const collection = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
      await collection.setSponsor(alice, bob.address);
      await collection.confirmSponsorship(bob);
      const bobBalanceBefore = await helper.balance.getSubstrate(bob.address);
      const token = await collection.mintToken(alice, {Substrate: charlie.address});
      await token.transfer(charlie, {Substrate: alice.address});
      const bobBalanceAfter = await helper.balance.getSubstrate(bob.address);
      expect(bobBalanceAfter < bobBalanceBefore).to.be.true;
    });
  });

  it('Fungible: Transfer fees are paid by the sponsor after confirmation', async () => {
    await usingPlaygrounds(async (helper) => {
      const collection = await helper.ft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'}, 0);
      await collection.setSponsor(alice, bob.address);
      await collection.confirmSponsorship(bob);
      const bobBalanceBefore = await helper.balance.getSubstrate(bob.address);
      await collection.mint(alice, {Substrate: charlie.address}, 100n);
      await collection.transfer(charlie, {Substrate: alice.address}, 1n);
      const bobBalanceAfter = await helper.balance.getSubstrate(bob.address);
      expect(bobBalanceAfter < bobBalanceBefore).to.be.true;
    });
  });

  it('ReFungible: Transfer fees are paid by the sponsor after confirmation', async function() {
    await usingPlaygrounds(async (helper) => {
      const collection = await helper.rft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
      await collection.setSponsor(alice, bob.address);
      await collection.confirmSponsorship(bob);
      const bobBalanceBefore = await helper.balance.getSubstrate(bob.address);
      const token = await collection.mintToken(alice, {Substrate: charlie.address}, 100n);
      await token.transfer(charlie, {Substrate: alice.address}, 1n);
      const bobBalanceAfter = await helper.balance.getSubstrate(bob.address);
      expect(bobBalanceAfter < bobBalanceBefore).to.be.true;
    });
  });

  it('CreateItem fees are paid by the sponsor after confirmation', async () => {
    await usingPlaygrounds(async (helper) => {
      const collection = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
      await collection.setSponsor(alice, bob.address);
      await collection.confirmSponsorship(bob);
      await collection.setPermissions(alice, {access: 'AllowList', mintMode: true});
      await collection.addToAllowList(alice, {Substrate: charlie.address});

      const bobBalanceBefore = await helper.balance.getSubstrate(bob.address);
      await collection.mintToken(charlie, {Substrate: charlie.address});
      const bobBalanceAfter = await helper.balance.getSubstrate(bob.address);

      expect(bobBalanceAfter < bobBalanceBefore).to.be.true;
    });
  });

  it('NFT: Sponsoring of transfers is rate limited', async () => {
    await usingPlaygrounds(async (helper) => {
      const collection = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
      await collection.setSponsor(alice, bob.address);
      await collection.confirmSponsorship(bob);

      const token = await collection.mintToken(alice, {Substrate: alice.address});
      await token.transfer(alice, {Substrate: charlie.address});
      const bobBalanceBefore = await helper.balance.getSubstrate(bob.address);

      const transferTx = async () => token.transfer(charlie, {Substrate: alice.address});
      await expect(transferTx()).to.be.rejectedWith('Inability to pay some fees');
      const bobBalanceAfter = await helper.balance.getSubstrate(bob.address);

      expect(bobBalanceAfter === bobBalanceBefore).to.be.true;
    });
  });

  it('Fungible: Sponsoring is rate limited', async () => {
    await usingPlaygrounds(async (helper) => {
      const collection = await helper.ft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
      await collection.setSponsor(alice, bob.address);
      await collection.confirmSponsorship(bob);

      await collection.mint(alice, {Substrate: charlie.address}, 100n);
      await collection.transfer(charlie, {Substrate: charlie.address}, 1n);
      const bobBalanceBefore = await helper.balance.getSubstrate(bob.address);

      const transferTx = async () => collection.transfer(charlie, {Substrate: charlie.address});
      await expect(transferTx()).to.be.rejected;
      const bobBalanceAfter = await helper.balance.getSubstrate(bob.address);

      expect(bobBalanceAfter === bobBalanceBefore).to.be.true;
    });
  });

  it('ReFungible: Sponsoring is rate limited', async function() {
    await usingPlaygrounds(async (helper) => {
      const collection = await helper.rft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
      await collection.setSponsor(alice, bob.address);
      await collection.confirmSponsorship(bob);

      const token = await collection.mintToken(alice, {Substrate: charlie.address}, 100n);
      await token.transfer(charlie, {Substrate: alice.address});

      const bobBalanceBefore = await helper.balance.getSubstrate(bob.address);
      const transferTx = async () => token.transfer(charlie, {Substrate: alice.address});
      await expect(transferTx()).to.be.rejectedWith('Inability to pay some fees');
      const bobBalanceAfter = await helper.balance.getSubstrate(bob.address);

      expect(bobBalanceAfter === bobBalanceBefore).to.be.true;
    });
  });

  it('NFT: Sponsoring of createItem is rate limited', async () => {
    await usingPlaygrounds(async (helper) => {
      const collection = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
      await collection.setSponsor(alice, bob.address);
      await collection.confirmSponsorship(bob);
      await collection.setPermissions(alice, {mintMode: true, access: 'AllowList'});
      await collection.addToAllowList(alice, {Substrate: charlie.address});

      await collection.mintToken(charlie, {Substrate: charlie.address});

      const bobBalanceBefore = await helper.balance.getSubstrate(bob.address);
      const mintTx = async () => collection.mintToken(charlie, {Substrate: charlie.address});
      await expect(mintTx()).to.be.rejectedWith('Inability to pay some fees');
      const bobBalanceAfter = await helper.balance.getSubstrate(bob.address);

      expect(bobBalanceAfter === bobBalanceBefore).to.be.true;
    });
  });
});

describe('(!negative test!) integration test: ext. confirmSponsorship():', () => {
  before(async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      alice = privateKeyWrapper('//Alice');
      bob = privateKeyWrapper('//Bob');
      charlie = privateKeyWrapper('//Charlie');
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

    await usingApi(async (api, privateKeyWrapper) => {
      // Find unused address
      const ownerZeroBalance = await findUnusedAddress(api, privateKeyWrapper);

      // Find another unused address
      const senderZeroBalance = await findUnusedAddress(api, privateKeyWrapper);

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
