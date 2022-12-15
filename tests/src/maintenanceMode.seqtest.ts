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

import {IKeyringPair} from '@polkadot/types/types';
import {ApiPromise} from '@polkadot/api';
import {expect, itSub, Pallets, usingPlaygrounds} from './util';
import {itEth} from './eth/util';

async function maintenanceEnabled(api: ApiPromise): Promise<boolean> {
  return (await api.query.maintenance.enabled()).toJSON() as boolean;
}

describe('Integration Test: Maintenance Mode', () => {
  let superuser: IKeyringPair;
  let donor: IKeyringPair;
  let bob: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      superuser = await privateKey('//Alice');
      donor = await privateKey({filename: __filename});
      [bob] = await helper.arrange.createAccounts([100n], donor);

      if (await maintenanceEnabled(helper.getApi())) {
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
      tokenPropertyPermissions: [{key: 'test', permission: {
        collectionAdmin: true,
        tokenOwner: true,
        mutable: true,
      }}],
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

  itSub.ifWithPallets('MM blocks scheduled calls and the scheduler itself', [Pallets.Scheduler], async ({helper}) => {
    const collection = await helper.nft.mintCollection(bob);

    const nftBeforeMM = await collection.mintToken(bob);
    const nftDuringMM = await collection.mintToken(bob);
    const nftAfterMM = await collection.mintToken(bob);

    const scheduledIdBeforeMM = '0x' + '0'.repeat(31) + '0';
    const scheduledIdDuringMM = '0x' + '0'.repeat(31) + '1';
    const scheduledIdBunkerThroughMM = '0x' + '0'.repeat(31) + '2';
    const scheduledIdAttemptDuringMM = '0x' + '0'.repeat(31) + '3';
    const scheduledIdAfterMM = '0x' + '0'.repeat(31) + '4';

    const blocksToWait = 6;

    // Scheduling works before the maintenance
    await nftBeforeMM.scheduleAfter(scheduledIdBeforeMM, blocksToWait)
      .transfer(bob, {Substrate: superuser.address});

    await helper.wait.newBlocks(blocksToWait + 1);
    expect(await nftBeforeMM.getOwner()).to.be.deep.equal({Substrate: superuser.address});

    // Schedule a transaction that should occur *during* the maintenance
    await nftDuringMM.scheduleAfter(scheduledIdDuringMM, blocksToWait)
      .transfer(bob, {Substrate: superuser.address});
    
    // Schedule a transaction that should occur *after* the maintenance
    await nftDuringMM.scheduleAfter(scheduledIdBunkerThroughMM, blocksToWait * 2)
      .transfer(bob, {Substrate: superuser.address});

    await helper.getSudo().executeExtrinsic(superuser, 'api.tx.maintenance.enable', []);
    expect(await maintenanceEnabled(helper.getApi()), 'MM is OFF when it should be ON').to.be.true;

    await helper.wait.newBlocks(blocksToWait + 1);
    // The owner should NOT change since the scheduled transaction should be rejected
    expect(await nftDuringMM.getOwner()).to.be.deep.equal({Substrate: bob.address});

    // Any attempts to schedule a tx during the MM should be rejected
    await expect(nftDuringMM.scheduleAfter(scheduledIdAttemptDuringMM, blocksToWait)
      .transfer(bob, {Substrate: superuser.address}))
      .to.be.rejectedWith(/Invalid Transaction: Transaction call is not expected/);

    await helper.getSudo().executeExtrinsic(superuser, 'api.tx.maintenance.disable', []);
    expect(await maintenanceEnabled(helper.getApi()), 'MM is ON when it should be OFF').to.be.false;

    // Scheduling works after the maintenance
    await nftAfterMM.scheduleAfter(scheduledIdAfterMM, blocksToWait)
      .transfer(bob, {Substrate: superuser.address});
    
    await helper.wait.newBlocks(blocksToWait + 1);

    expect(await nftAfterMM.getOwner()).to.be.deep.equal({Substrate: superuser.address});
    // The owner of the token scheduled for transaction *before* maintenance should now change *after* maintenance
    expect(await nftDuringMM.getOwner()).to.be.deep.equal({Substrate: superuser.address});
  });

  itEth('Disallows Ethereum transactions to execute while in maintenance', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const receiver = helper.eth.createAccount();
    
    const {collectionAddress} = await helper.eth.createERC721MetadataCompatibleNFTCollection(owner, 'A', 'B', 'C', '');

    // Set maintenance mode
    await helper.getSudo().executeExtrinsic(superuser, 'api.tx.maintenance.enable', []);
    expect(await maintenanceEnabled(helper.getApi()), 'MM is OFF when it should be ON').to.be.true;

    const contract = helper.ethNativeContract.collection(collectionAddress, 'nft', owner);
    const tokenId = await contract.methods.nextTokenId().call();
    expect(tokenId).to.be.equal('1');

    await expect(contract.methods.mintWithTokenURI(receiver, 'Test URI').send())
      .to.be.rejectedWith(/(Returned error: unknown error)|(submit transaction to pool failed: Pool\(InvalidTransaction\(InvalidTransaction::Call\)\))/);

    await expect(contract.methods.ownerOf(tokenId).call()).rejectedWith(/token not found/);

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
      if (await maintenanceEnabled(helper.getApi())) {
        console.warn('\tMaintenance mode was left enabled AFTER a test has finished! Be careful. Disabling it now.');
        await helper.getSudo().executeExtrinsic(superuser, 'api.tx.maintenance.disable', []);
      }
      expect(await maintenanceEnabled(helper.getApi()), 'Disastrous! Exited the test suite with maintenance mode on.').to.be.false;
    });
  });
});
