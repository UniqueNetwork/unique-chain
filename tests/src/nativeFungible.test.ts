// Copyright 2019-2023 Unique Network (Gibraltar) Ltd.
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
import {expect, itSub, usingPlaygrounds} from './util';

describe('Native fungible', () => {
  let root: IKeyringPair;
  let alice: IKeyringPair;
  let bob: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      root = await privateKey('//Alice');
      const donor = await privateKey({url: import.meta.url});
      [alice, bob] = await helper.arrange.createAccounts([10n, 10n], donor);
    });
  });

  itSub('destroy_collection()', async ({helper}) => {
    const collection = helper.ft.getCollectionObject(0);
    await expect(collection.burn(alice)).to.be.rejectedWith('common.UnsupportedOperation');
    await expect(helper.executeExtrinsic(alice, 'api.tx.unique.destroyCollection', [0])).to.be.rejectedWith('common.UnsupportedOperation');
  });

  itSub('add_to_allow_list()', async ({helper}) => {
    const collection = helper.ft.getCollectionObject(0);
    await expect(collection.addToAllowList(alice, {Substrate: bob.address})).to.be.rejectedWith('common.UnsupportedOperation');
  });

  itSub('remove_from_allow_list()', async ({helper}) => {
    const collection = helper.ft.getCollectionObject(0);
    await expect(collection.removeFromAllowList(alice, {Substrate: bob.address})).to.be.rejectedWith('common.UnsupportedOperation');
  });

  itSub('change_collection_owner()', async ({helper}) => {
    const collection = helper.ft.getCollectionObject(0);
    await expect(collection.changeOwner(alice, bob.address)).to.be.rejectedWith('common.UnsupportedOperation');
  });

  itSub('add_collection_admin()', async ({helper}) => {
    const collection = helper.ft.getCollectionObject(0);
    await expect(collection.addAdmin(alice, {Substrate: bob.address})).to.be.rejectedWith('common.UnsupportedOperation');
  });

  itSub('remove_collection_admin()', async ({helper}) => {
    const collection = helper.ft.getCollectionObject(0);
    await expect(collection.removeAdmin(alice, {Substrate: bob.address})).to.be.rejectedWith('common.UnsupportedOperation');
  });

  itSub('set_collection_sponsor()', async ({helper}) => {
    const collection = helper.ft.getCollectionObject(0);
    await expect(collection.setSponsor(alice, bob.address)).to.be.rejectedWith('common.UnsupportedOperation');
  });

  itSub('confirm_sponsorship()', async ({helper}) => {
    const collection = helper.ft.getCollectionObject(0);
    await expect(collection.confirmSponsorship(alice)).to.be.rejectedWith('common.UnsupportedOperation');
  });

  itSub('remove_collection_sponsor()', async ({helper}) => {
    const collection = helper.ft.getCollectionObject(0);
    await expect(collection.removeSponsor(alice)).to.be.rejectedWith('common.UnsupportedOperation');
  });

  itSub('create_item()', async ({helper}) => {
    const collection = helper.ft.getCollectionObject(0);
    await expect(collection.mint(alice, 100n, {Substrate: bob.address})).to.be.rejectedWith('common.UnsupportedOperation');
  });

  itSub('set_collection_properties()', async ({helper}) => {
    const collection = helper.ft.getCollectionObject(0);
    await expect(collection.setProperties(alice, [{key: 'value'}])).to.be.rejectedWith('common.UnsupportedOperation');
  });

  itSub('delete_collection_properties()', async ({helper}) => {
    const collection = helper.ft.getCollectionObject(0);
    await expect(collection.deleteProperties(alice, ['key'])).to.be.rejectedWith('common.UnsupportedOperation');
  });

  itSub('set_token_properties()', async ({helper}) => {
    await expect(helper.executeExtrinsic(
      alice,
      'api.tx.unique.setTokenProperties',
      [0, 0, [{key: 'value'}]],
      true,
    )).to.be.rejectedWith('common.UnsupportedOperation');
  });

  itSub('delete_token_properties()', async ({helper}) => {
    await expect(helper.executeExtrinsic(
      alice,
      'api.tx.unique.deleteTokenProperties',
      [0, 0, ['key']],
      true,
    )).to.be.rejectedWith('common.UnsupportedOperation');
  });

  itSub('set_transfers_enabled_flag()', async ({helper}) => {
    await expect(helper.executeExtrinsic(
      alice,
      'api.tx.unique.setTransfersEnabledFlag',
      [0, true],
      true,
    )).to.be.rejectedWith('common.UnsupportedOperation');
  });

  itSub('burn_item()', async ({helper}) => {
    await expect(helper.executeExtrinsic(
      alice,
      'api.tx.unique.burnItem',
      [0, 0, 100n],
      true,
    )).to.be.rejectedWith('common.UnsupportedOperation');
  });

  itSub('burn_from()', async ({helper}) => {
    const collection = helper.ft.getCollectionObject(0);
    await expect(collection.burnTokens(alice, 100n)).to.be.rejectedWith('common.UnsupportedOperation');
  });

  itSub('transfer()', async ({helper}) => {
    const collection = helper.ft.getCollectionObject(0);
    const balanceAliceBefore = await helper.balance.getSubstrate(alice.address);
    const balanceBobBefore = await helper.balance.getSubstrate(bob.address);
    await collection.transfer(alice, {Substrate: bob.address}, 100n);
    const balanceAliceAfter = await helper.balance.getSubstrate(alice.address);
    const balanceBobAfter = await helper.balance.getSubstrate(bob.address);
    expect(balanceAliceBefore - balanceAliceAfter > 100n).to.be.true;
    expect(balanceBobAfter - balanceBobBefore === 100n).to.be.true;
  });

  itSub('transfer_from()', async ({helper}) => {
    const collection = helper.ft.getCollectionObject(0);
    const balanceAliceBefore = await helper.balance.getSubstrate(alice.address);
    const balanceBobBefore = await helper.balance.getSubstrate(bob.address);

    await collection.transferFrom(alice, {Substrate: alice.address}, {Substrate: bob.address}, 100n);

    const balanceAliceAfter = await helper.balance.getSubstrate(alice.address);
    const balanceBobAfter = await helper.balance.getSubstrate(bob.address);
    expect(balanceAliceBefore - balanceAliceAfter > 100n).to.be.true;
    expect(balanceBobAfter - balanceBobBefore === 100n).to.be.true;

    await expect(collection.transferFrom(alice, {Substrate: bob.address}, {Substrate: alice.address}, 100n)).to.be.rejectedWith('common.ApprovedValueTooLow');
  });

  itSub('approve()', async ({helper}) => {
    const collection = helper.ft.getCollectionObject(0);
    await expect(collection.approveTokens(alice, {Substrate: bob.address}, 100n)).to.be.rejectedWith('common.UnsupportedOperation');
  });

  itSub('approve_from()', async ({helper}) => {
    await expect(helper.executeExtrinsic(
      alice,
      'api.tx.unique.approveFrom',
      [{Substrate: alice.address}, {Substrate: bob.address}, 0, 0, 100n],
      true,
    )).to.be.rejectedWith('common.UnsupportedOperation');
  });

  itSub('set_collection_limits()', async ({helper}) => {
    const collection = helper.ft.getCollectionObject(0);
    await expect(collection.setLimits(alice, {accountTokenOwnershipLimit: 1})).to.be.rejectedWith('common.UnsupportedOperation');
  });

  itSub('set_collection_permissions()', async ({helper}) => {
    const collection = helper.ft.getCollectionObject(0);
    await expect(collection.setPermissions(alice, {access: 'AllowList'})).to.be.rejectedWith('common.UnsupportedOperation');
  });

  itSub('repartition()', async ({helper}) => {
    await expect(helper.executeExtrinsic(
      alice,
      'api.tx.unique.repartition',
      [0, 0, 100n],
      true,
    )).to.be.rejectedWith('unique.RepartitionCalledOnNonRefungibleCollection');
  });

  itSub('force_repair_collection()', async ({helper}) => {
    await expect(helper.executeExtrinsic(
      alice,
      'api.tx.unique.forceRepairCollection',
      [0],
      true,
    )).to.be.rejectedWith('common.UnsupportedOperation');
  });

  itSub('force_repair_item()', async ({helper}) => {
    await expect(helper.getSudo().executeExtrinsic(
      root,
      'api.tx.unique.forceRepairItem',
      [0, 0],
      true,
    )).to.be.rejectedWith('common.UnsupportedOperation');
  });

  itSub('Nest into NFT token()', async ({helper}) => {
    const nftCollection = await helper.nft.mintCollection(alice, {permissions: {nesting: {tokenOwner: true}}});
    const targetToken = await nftCollection.mintToken(alice);

    const collection = helper.ft.getCollectionObject(0);
    await collection.transfer(alice, targetToken.nestingAccount(), 100n);

    await collection.transferFrom(alice, targetToken.nestingAccount(), {Substrate: alice.address}, 100n);
  });
});