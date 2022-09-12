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
      [alice, bob, charlie] = await helper.arrange.createAccounts([100n, 100n, 100n], donor);
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
      await collection.confirmSponsorship(bob);
      await collection.setSponsor(alice, charlie.address);
    });
  });

  it('NFT: Transfer fees are paid by the sponsor after confirmation', async () => {
    await usingPlaygrounds(async (helper) => {
      const [zeroBalance] = await helper.arrange.createAccounts([0n], donor);
      const collection = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
      await collection.setSponsor(alice, bob.address);
      await collection.confirmSponsorship(bob);
      const bobBalanceBefore = await helper.balance.getSubstrate(bob.address);
      const token = await collection.mintToken(alice, {Substrate: zeroBalance.address});
      await token.transfer(zeroBalance, {Substrate: alice.address});
      const bobBalanceAfter = await helper.balance.getSubstrate(bob.address);
      expect(bobBalanceAfter < bobBalanceBefore).to.be.true;
    });
  });

  it('Fungible: Transfer fees are paid by the sponsor after confirmation', async () => {
    await usingPlaygrounds(async (helper) => {
      const [zeroBalance] = await helper.arrange.createAccounts([0n], donor);
      const collection = await helper.ft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'}, 0);
      await collection.setSponsor(alice, bob.address);
      await collection.confirmSponsorship(bob);
      const bobBalanceBefore = await helper.balance.getSubstrate(bob.address);
      await collection.mint(alice, {Substrate: zeroBalance.address}, 100n);
      await collection.transfer(zeroBalance, {Substrate: alice.address}, 1n);
      const bobBalanceAfter = await helper.balance.getSubstrate(bob.address);
      expect(bobBalanceAfter < bobBalanceBefore).to.be.true;
    });
  });

  it('ReFungible: Transfer fees are paid by the sponsor after confirmation', async function() {
    await usingPlaygrounds(async (helper) => {
      const [zeroBalance] = await helper.arrange.createAccounts([0n], donor);
      const collection = await helper.rft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
      await collection.setSponsor(alice, bob.address);
      await collection.confirmSponsorship(bob);
      const bobBalanceBefore = await helper.balance.getSubstrate(bob.address);
      const token = await collection.mintToken(alice, {Substrate: zeroBalance.address}, 100n);
      await token.transfer(zeroBalance, {Substrate: alice.address}, 1n);
      const bobBalanceAfter = await helper.balance.getSubstrate(bob.address);
      expect(bobBalanceAfter < bobBalanceBefore).to.be.true;
    });
  });

  it('CreateItem fees are paid by the sponsor after confirmation', async () => {
    await usingPlaygrounds(async (helper) => {
      const [zeroBalance] = await helper.arrange.createAccounts([0n], donor);
      const collection = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
      await collection.setSponsor(alice, bob.address);
      await collection.confirmSponsorship(bob);
      await collection.setPermissions(alice, {access: 'AllowList', mintMode: true});
      await collection.addToAllowList(alice, {Substrate: zeroBalance.address});

      const bobBalanceBefore = await helper.balance.getSubstrate(bob.address);
      await collection.mintToken(zeroBalance, {Substrate: zeroBalance.address});
      const bobBalanceAfter = await helper.balance.getSubstrate(bob.address);

      expect(bobBalanceAfter < bobBalanceBefore).to.be.true;
    });
  });

  it('NFT: Sponsoring of transfers is rate limited', async () => {
    await usingPlaygrounds(async (helper) => {
      const [zeroBalance] = await helper.arrange.createAccounts([0n], donor);
      const collection = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
      await collection.setSponsor(alice, bob.address);
      await collection.confirmSponsorship(bob);

      const token = await collection.mintToken(alice, {Substrate: alice.address});
      await token.transfer(alice, {Substrate: zeroBalance.address});
      const bobBalanceBefore = await helper.balance.getSubstrate(bob.address);

      const transferTx = async () => token.transfer(zeroBalance, {Substrate: alice.address});
      await expect(transferTx()).to.be.rejectedWith('Inability to pay some fees');
      const bobBalanceAfter = await helper.balance.getSubstrate(bob.address);

      expect(bobBalanceAfter === bobBalanceBefore).to.be.true;
    });
  });

  it('Fungible: Sponsoring is rate limited', async () => {
    await usingPlaygrounds(async (helper) => {
      const [zeroBalance] = await helper.arrange.createAccounts([0n], donor);
      const collection = await helper.ft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
      await collection.setSponsor(alice, bob.address);
      await collection.confirmSponsorship(bob);

      await collection.mint(alice, {Substrate: zeroBalance.address}, 100n);
      await collection.transfer(zeroBalance, {Substrate: zeroBalance.address}, 1n);
      const bobBalanceBefore = await helper.balance.getSubstrate(bob.address);

      const transferTx = async () => collection.transfer(zeroBalance, {Substrate: zeroBalance.address});
      await expect(transferTx()).to.be.rejected;
      const bobBalanceAfter = await helper.balance.getSubstrate(bob.address);

      expect(bobBalanceAfter === bobBalanceBefore).to.be.true;
    });
  });

  it('ReFungible: Sponsoring is rate limited', async function() {
    await usingPlaygrounds(async (helper) => {
      const [zeroBalance] = await helper.arrange.createAccounts([0n], donor);
      const collection = await helper.rft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
      await collection.setSponsor(alice, bob.address);
      await collection.confirmSponsorship(bob);

      const token = await collection.mintToken(alice, {Substrate: zeroBalance.address}, 100n);
      await token.transfer(zeroBalance, {Substrate: alice.address});

      const bobBalanceBefore = await helper.balance.getSubstrate(bob.address);
      const transferTx = async () => token.transfer(zeroBalance, {Substrate: alice.address});
      await expect(transferTx()).to.be.rejectedWith('Inability to pay some fees');
      const bobBalanceAfter = await helper.balance.getSubstrate(bob.address);

      expect(bobBalanceAfter === bobBalanceBefore).to.be.true;
    });
  });

  it('NFT: Sponsoring of createItem is rate limited', async () => {
    await usingPlaygrounds(async (helper) => {
      const [zeroBalance] = await helper.arrange.createAccounts([0n], donor);
      const collection = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
      await collection.setSponsor(alice, bob.address);
      await collection.confirmSponsorship(bob);
      await collection.setPermissions(alice, {mintMode: true, access: 'AllowList'});
      await collection.addToAllowList(alice, {Substrate: zeroBalance.address});

      await collection.mintToken(zeroBalance, {Substrate: zeroBalance.address});

      const bobBalanceBefore = await helper.balance.getSubstrate(bob.address);
      const mintTx = async () => collection.mintToken(zeroBalance, {Substrate: zeroBalance.address});
      await expect(mintTx()).to.be.rejectedWith('Inability to pay some fees');
      const bobBalanceAfter = await helper.balance.getSubstrate(bob.address);

      expect(bobBalanceAfter === bobBalanceBefore).to.be.true;
    });
  });
});

describe('(!negative test!) integration test: ext. confirmSponsorship():', () => {
  before(async () => {
    await usingPlaygrounds(async (helper) => {
      [alice, bob, charlie] = await helper.arrange.createAccounts([100n, 100n, 100n], donor);
    });
  });

  it('(!negative test!) Confirm sponsorship for a collection that never existed', async () => {
    await usingPlaygrounds(async (helper) => {
      const collectionId = 1 << 32 - 1;
      const confirmSponsorshipTx = async () => helper.collection.confirmSponsorship(bob, collectionId);
      await expect(confirmSponsorshipTx()).to.be.rejected;
    });
  });

  it('(!negative test!) Confirm sponsorship using a non-sponsor address', async () => {
    await usingPlaygrounds(async (helper) => {
      const collection = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
      await collection.setSponsor(alice, bob.address);
      const confirmSponsorshipTx = async () => collection.confirmSponsorship(charlie);
      await expect(confirmSponsorshipTx()).to.be.rejected;
    });
  });

  it('(!negative test!) Confirm sponsorship using owner address', async () => {
    await usingPlaygrounds(async (helper) => {
      const collection = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
      await collection.setSponsor(alice, bob.address);
      const confirmSponsorshipTx = async () => collection.confirmSponsorship(alice);
      await expect(confirmSponsorshipTx()).to.be.rejected;
    });
  });

  it('(!negative test!) Confirm sponsorship by collection admin', async () => {
    await usingPlaygrounds(async (helper) => {
      const collection = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
      await collection.setSponsor(alice, bob.address);
      await collection.addAdmin(alice, {Substrate: charlie.address});
      const confirmSponsorshipTx = async () => collection.confirmSponsorship(charlie);
      await expect(confirmSponsorshipTx()).to.be.rejected;
    });
  });

  it('(!negative test!) Confirm sponsorship without sponsor being set with setCollectionSponsor', async () => {
    await usingPlaygrounds(async (helper) => {
      const collection = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
      const confirmSponsorshipTx = async () => collection.confirmSponsorship(charlie);
      await expect(confirmSponsorshipTx()).to.be.rejected;
    });
  });

  it('(!negative test!) Confirm sponsorship in a collection that was destroyed', async () => {
    await usingPlaygrounds(async (helper) => {
      const collection = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
      await collection.burn(alice);
      const confirmSponsorshipTx = async () => collection.confirmSponsorship(charlie);
      await expect(confirmSponsorshipTx()).to.be.rejected;
    });
  });

  it('(!negative test!) Transfer fees are not paid by the sponsor if the transfer failed', async () => {
    await usingPlaygrounds(async (helper) => {
      const collection = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
      await collection.setSponsor(alice, bob.address);
      await collection.confirmSponsorship(bob);
      const [ownerZeroBalance, senderZeroBalance] = await helper.arrange.createAccounts([0n, 0n], donor);
      const token = await collection.mintToken(alice, {Substrate: ownerZeroBalance.address});
      const sponsorBalanceBefore = await helper.balance.getSubstrate(bob.address);
      const transferTx = async () =>  token.transfer(senderZeroBalance, {Substrate: alice.address});
      await expect(transferTx()).to.be.rejected;
      const sponsorBalanceAfter = await helper.balance.getSubstrate(bob.address);
      expect(sponsorBalanceAfter).to.equal(sponsorBalanceBefore);
    });
  });
});
