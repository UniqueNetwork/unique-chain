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

import type {IKeyringPair} from '@polkadot/types/types';
import {ApiPromise} from '@polkadot/api';
import {expect, itSub, Pallets, requirePalletsOrSkip, usingPlaygrounds} from '@unique/test-utils/util.js';
import {itEth} from '@unique/test-utils/eth/util.js';
import {main as correctState} from '@unique/scripts/correctStateAfterMaintenance.js';
import type {FrameSupportTokensMiscIdAmount} from '@polkadot/types/lookup';
import type {Vec} from '@polkadot/types-codec';

async function maintenanceEnabled(api: ApiPromise): Promise<boolean> {
  return (await api.query.maintenance.enabled()).toJSON() as boolean;
}

describe('Integration Test: Maintenance Functionality', () => {
  let superuser: IKeyringPair;
  let donor: IKeyringPair;
  let bob: IKeyringPair;

  before(async function() {
    await usingPlaygrounds(async (helper, privateKey) => {
      requirePalletsOrSkip(this, helper, [Pallets.Maintenance]);
      superuser = await privateKey('//Alice');
      donor = await privateKey({url: import.meta.url});
      [bob] = await helper.arrange.createAccounts([10000n], donor);

    });
  });

  describe('Maintenance Mode', () => {
    before(async function() {
      await usingPlaygrounds(async (helper) => {
        if(await maintenanceEnabled(helper.getApi())) {
          console.warn('\tMaintenance mode was left enabled BEFORE the test suite! Disabling it now.');
          await expect(helper.getSudo().executeExtrinsic(superuser, 'api.tx.maintenance.disable', [])).to.be.fulfilled;
        }
      });
    });

    itSub('Allows superuser to enable and disable maintenance mode - and disallows anyone else', async ({helper}) => {
      // Make sure non-sudo can't enable maintenance mode
      await expect(helper.executeExtrinsic(superuser, 'api.tx.maintenance.enable', []), 'on commoner enabling MM')
        .to.be.rejectedWith(/BadOrigin/);

      // Set maintenance mode
      await helper.getSudo().executeExtrinsic(superuser, 'api.tx.maintenance.enable', []);
      expect(await maintenanceEnabled(helper.getApi()), 'MM is OFF when it should be ON').to.be.true;

      // Make sure non-sudo can't disable maintenance mode
      await expect(helper.executeExtrinsic(bob, 'api.tx.maintenance.disable', []), 'on commoner disabling MM')
        .to.be.rejectedWith(/BadOrigin/);

      // Disable maintenance mode
      await helper.getSudo().executeExtrinsic(superuser, 'api.tx.maintenance.disable', []);
      expect(await maintenanceEnabled(helper.getApi()), 'MM is ON when it should be OFF').to.be.false;
    });

    itSub('MM blocks unique pallet calls', async ({helper}) => {
      // Can create an NFT collection before enabling the MM
      const nftCollection = await helper.nft.mintCollection(bob, {
        tokenPropertyPermissions: [{
          key: 'test', permission: {
            collectionAdmin: true,
            tokenOwner: true,
            mutable: true,
          },
        }],
      });

      // Can mint an NFT before enabling the MM
      const nft = await nftCollection.mintToken(bob);

      // Can create an FT collection before enabling the MM
      const ftCollection = await helper.ft.mintCollection(superuser);

      // Can mint an FT before enabling the MM
      await expect(ftCollection.mint(superuser)).to.be.fulfilled;

      await helper.getSudo().executeExtrinsic(superuser, 'api.tx.maintenance.enable', []);
      expect(await maintenanceEnabled(helper.getApi()), 'MM is OFF when it should be ON').to.be.true;

      // Unable to create a collection when the MM is enabled
      await expect(helper.nft.mintCollection(superuser), 'cudo forbidden stuff')
        .to.be.rejectedWith(/Invalid Transaction: Transaction call is not expected/);

      // Unable to set token properties when the MM is enabled
      await expect(nft.setProperties(
        bob,
        [{key: 'test', value: 'test-val'}],
      )).to.be.rejectedWith(/Invalid Transaction: Transaction call is not expected/);

      // Unable to mint an NFT when the MM is enabled
      await expect(nftCollection.mintToken(superuser))
        .to.be.rejectedWith(/Invalid Transaction: Transaction call is not expected/);

      // Unable to mint an FT when the MM is enabled
      await expect(ftCollection.mint(superuser))
        .to.be.rejectedWith(/Invalid Transaction: Transaction call is not expected/);

      await helper.getSudo().executeExtrinsic(superuser, 'api.tx.maintenance.disable', []);
      expect(await maintenanceEnabled(helper.getApi()), 'MM is ON when it should be OFF').to.be.false;

      // Can create a collection after disabling the MM
      await expect(helper.nft.mintCollection(bob), 'MM is disabled, the collection should be created').to.be.fulfilled;

      // Can set token properties after disabling the MM
      await nft.setProperties(bob, [{key: 'test', value: 'test-val'}]);

      // Can mint an NFT after disabling the MM
      await nftCollection.mintToken(bob);

      // Can mint an FT after disabling the MM
      await ftCollection.mint(superuser);
    });

    itSub.ifWithPallets('MM blocks unique pallet calls (Re-Fungible)', [Pallets.ReFungible], async ({helper}) => {
      // Can create an RFT collection before enabling the MM
      const rftCollection = await helper.rft.mintCollection(superuser);

      // Can mint an RFT before enabling the MM
      await expect(rftCollection.mintToken(superuser)).to.be.fulfilled;

      await helper.getSudo().executeExtrinsic(superuser, 'api.tx.maintenance.enable', []);
      expect(await maintenanceEnabled(helper.getApi()), 'MM is OFF when it should be ON').to.be.true;

      // Unable to mint an RFT when the MM is enabled
      await expect(rftCollection.mintToken(superuser))
        .to.be.rejectedWith(/Invalid Transaction: Transaction call is not expected/);

      await helper.getSudo().executeExtrinsic(superuser, 'api.tx.maintenance.disable', []);
      expect(await maintenanceEnabled(helper.getApi()), 'MM is ON when it should be OFF').to.be.false;

      // Can mint an RFT after disabling the MM
      await rftCollection.mintToken(superuser);
    });

    itSub('MM allows native token transfers and RPC calls', async ({helper}) => {
      // We can use RPC before the MM is enabled
      const totalCount = await helper.collection.getTotalCount();

      // We can transfer funds before the MM is enabled
      await expect(helper.balance.transferToSubstrate(superuser, bob.address, 2n)).to.be.fulfilled;

      await helper.getSudo().executeExtrinsic(superuser, 'api.tx.maintenance.enable', []);
      expect(await maintenanceEnabled(helper.getApi()), 'MM is OFF when it should be ON').to.be.true;

      // RPCs work while in maintenance
      expect(await helper.collection.getTotalCount()).to.be.deep.equal(totalCount);

      // We still able to transfer funds
      await expect(helper.balance.transferToSubstrate(bob, superuser.address, 1n)).to.be.fulfilled;

      await helper.getSudo().executeExtrinsic(superuser, 'api.tx.maintenance.disable', []);
      expect(await maintenanceEnabled(helper.getApi()), 'MM is ON when it should be OFF').to.be.false;

      // RPCs work after maintenance
      expect(await helper.collection.getTotalCount()).to.be.deep.equal(totalCount);

      // Transfers work after maintenance
      await expect(helper.balance.transferToSubstrate(bob, superuser.address, 1n)).to.be.fulfilled;
    });

    itEth('Disallows Ethereum transactions to execute while in maintenance', async ({helper}) => {
      const owner = await helper.eth.createAccountWithBalance(donor);
      const receiver = helper.eth.createAccount();

      const {collectionAddress} = await helper.eth.createERC721MetadataCompatibleNFTCollection(owner, 'A', 'B', 'C', '');

      // Set maintenance mode
      await helper.getSudo().executeExtrinsic(superuser, 'api.tx.maintenance.enable', []);
      expect(await maintenanceEnabled(helper.getApi()), 'MM is OFF when it should be ON').to.be.true;

      const contract = await helper.ethNativeContract.collection(collectionAddress, 'nft', owner);
      const tokenId = await contract.nextTokenId.staticCall();
      expect(tokenId).to.be.equal(1n);

      await expect(contract.mintWithTokenURI.send(receiver, 'Test URI'))
        .to.be.rejectedWith(/could not coalesce error/);

      await expect(contract.ownerOf.staticCall(tokenId)).rejectedWith(/token not found/);

      // Disable maintenance mode
      await helper.getSudo().executeExtrinsic(superuser, 'api.tx.maintenance.disable', []);
      expect(await maintenanceEnabled(helper.getApi()), 'MM is ON when it should be OFF').to.be.false;
    });

    itSub('Allows to enable and disable MM repeatedly', async ({helper}) => {
      // Set maintenance mode
      await helper.getSudo().executeExtrinsic(superuser, 'api.tx.maintenance.enable', []);
      await helper.getSudo().executeExtrinsic(superuser, 'api.tx.maintenance.enable', []);
      expect(await maintenanceEnabled(helper.getApi()), 'MM is OFF when it should be ON').to.be.true;

      // Disable maintenance mode
      await helper.getSudo().executeExtrinsic(superuser, 'api.tx.maintenance.disable', []);
      await helper.getSudo().executeExtrinsic(superuser, 'api.tx.maintenance.disable', []);
      expect(await maintenanceEnabled(helper.getApi()), 'MM is ON when it should be OFF').to.be.false;
    });

    afterEach(async () => {
      await usingPlaygrounds(async helper => {
        if(helper.fetchMissingPalletNames([Pallets.Maintenance]).length != 0) return;
        if(await maintenanceEnabled(helper.getApi())) {
          console.warn('\tMaintenance mode was left enabled AFTER a test has finished! Be careful. Disabling it now.');
          await helper.getSudo().executeExtrinsic(superuser, 'api.tx.maintenance.disable', []);
        }
        expect(await maintenanceEnabled(helper.getApi()), 'Disastrous! Exited the test suite with maintenance mode on.').to.be.false;
      });
    });
  });

  describe('Integration Test: Maintenance mode & App Promo', () => {
    let superuser: IKeyringPair;

    before(async function() {
      await usingPlaygrounds(async (helper, privateKey) => {
        requirePalletsOrSkip(this, helper, [Pallets.Maintenance]);
        superuser = await privateKey('//Alice');
      });
    });

    describe('Test AppPromo script for check state after Maintenance mode', () => {
      before(async function () {
        await usingPlaygrounds(async (helper) => {
          if(await maintenanceEnabled(helper.getApi())) {
            console.warn('\tMaintenance mode was left enabled BEFORE the test suite! Disabling it now.');
            await expect(helper.getSudo().executeExtrinsic(superuser, 'api.tx.maintenance.disable', [])).to.be.fulfilled;
          }
        });
      });
      itSub('Can find and fix inconsistent state', async ({helper}) => {
        const api = helper.getApi();

        await helper.executeExtrinsic(superuser, 'api.tx.sudo.sudo', [api.tx.system.setStorage([
          // pendingUnstake(1 -> [superuser.address, 100UNQ])
          ['0x42b67acb8bd223c60d0c8f621ffefc0ae280fa2db99bd3827aac976de75af95f5153cb1f00942ff401000000',
            '0x04d43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d000010632d5ec76b0500000000000000'],
          // pendingUnstake(2 -> [superuser.address, 100UNQ])
          ['0x42b67acb8bd223c60d0c8f621ffefc0ae280fa2db99bd3827aac976de75af95f9eb2dcce60f37a2702000000',
            '0x04d43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d000010632d5ec76b0500000000000000'],
          // Balances.freezes(superuser.address -> freeze with app promo id and 200 UNQ )
          ['0xc2261276cc9d1f8598ea4b6a74b15c2fb1c0eb12e038e5c7f91e120ed4b7ebf1de1e86a9a8c739864cf3cc5ec2bea59fd43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d',
            '0x046170707374616b656170707374616b65000020c65abc8ed70a00000000000000'],
        ])]);

        expect((await api.query.appPromotion.pendingUnstake(1)).toJSON()).to.be.deep.equal([[superuser.address, '0x00000000000000056bc75e2d63100000']]);
        expect((await api.query.appPromotion.pendingUnstake(2)).toJSON()).to.be.deep.equal([[superuser.address, '0x00000000000000056bc75e2d63100000']]);
        expect((await api.query.balances.freezes(superuser.address) as Vec<FrameSupportTokensMiscIdAmount>)
          .map(lock => ({id: lock.id.toUtf8(), amount: lock.amount.toBigInt()})))
          .to.be.deep.equal([{id: 'appstakeappstake', amount: 200000000000000000000n}]);
        await correctState();

        expect((await api.query.appPromotion.pendingUnstake(1)).toJSON()).to.be.deep.equal([]);
        expect((await api.query.appPromotion.pendingUnstake(2)).toJSON()).to.be.deep.equal([]);
        expect((await api.query.balances.freezes(superuser.address)).toJSON()).to.be.deep.equal([]);

      });

      itSub('(!negative test!) Only works when Maintenance mode is disabled', async({helper}) => {
        await expect(helper.getSudo().executeExtrinsic(superuser, 'api.tx.maintenance.enable', [])).to.be.fulfilled;
        await expect(correctState()).to.be.rejectedWith('The network is still in maintenance mode');
        await expect(helper.getSudo().executeExtrinsic(superuser, 'api.tx.maintenance.disable', [])).to.be.fulfilled;
      });
    });
  });

  after(async () => {
    await usingPlaygrounds(async(helper) => {
      await helper.getSudo().executeExtrinsic(superuser, 'api.tx.maintenance.disable', []);
    });
  });
});
