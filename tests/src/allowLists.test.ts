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
import {usingPlaygrounds, expect, itSub} from './util/playgrounds';
import {ICollectionPermissions} from './util/playgrounds/types';

describe('Integration Test ext. Allow list tests', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;
  let charlie: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      const donor = privateKey('//Alice');
      [alice, bob, charlie] = await helper.arrange.createAccounts([30n, 10n, 10n], donor);
    });
  });

  describe('Positive', async () => {
    itSub('Owner can add address to allow list', async ({helper}) => {
      const {collectionId} = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
      // allow list does not need to be enabled to add someone in advance
      await helper.nft.addToAllowList(alice, collectionId, {Substrate: bob.address});
      const allowList = await helper.nft.getAllowList(collectionId);
      expect(allowList).to.deep.contain({Substrate: bob.address});
    });

    itSub('Admin can add address to allow list', async ({helper}) => {
      const {collectionId} = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
      await helper.nft.addAdmin(alice, collectionId, {Substrate: bob.address});

      // allow list does not need to be enabled to add someone in advance
      await helper.nft.addToAllowList(bob, collectionId, {Substrate: charlie.address});
      const allowList = await helper.nft.getAllowList(collectionId);
      expect(allowList).to.deep.contain({Substrate: charlie.address});
    });

    itSub('If address is already added to allow list, nothing happens', async ({helper}) => {
      const {collectionId} = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
      await helper.nft.addToAllowList(alice, collectionId, {Substrate: bob.address});
      await helper.nft.addToAllowList(alice, collectionId, {Substrate: bob.address});
      const allowList = await helper.nft.getAllowList(collectionId);
      expect(allowList).to.deep.contain({Substrate: bob.address});
    });
  });

  describe('Negative', async () => {
    itSub('Nobody can add address to allow list of non-existing collection', async ({helper}) => {
      const collectionId = (1<<32) - 1;
      await expect(helper.nft.addToAllowList(bob, collectionId, {Substrate: charlie.address}))
        .to.be.rejectedWith(/common\.CollectionNotFound/);
    });

    itSub('Nobody can add address to allow list of destroyed collection', async ({helper}) => {
      const {collectionId} = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
      await helper.collection.burn(alice, collectionId);
      await expect(helper.nft.addToAllowList(alice, collectionId, {Substrate: bob.address}))
        .to.be.rejectedWith(/common\.CollectionNotFound/);
    });

    itSub('Non-privileged user cannot add address to allow list', async ({helper}) => {
      const {collectionId} = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
      await expect(helper.nft.addToAllowList(bob, collectionId, {Substrate: charlie.address}))
        .to.be.rejectedWith(/common\.NoPermission/);
    });
  });
});

describe('Integration Test ext. Remove from Allow List', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;
  let charlie: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      const donor = privateKey('//Alice');
      [alice, bob, charlie] = await helper.arrange.createAccounts([30n, 10n, 10n], donor);
    });
  });

  describe('Positive', async () => {
    itSub('Owner can remove address from allow list', async ({helper}) => {
      const {collectionId} = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
      await helper.nft.addToAllowList(alice, collectionId, {Substrate: bob.address});

      await helper.collection.removeFromAllowList(alice, collectionId, {Substrate: bob.address});

      const allowList = await helper.nft.getAllowList(collectionId);

      expect(allowList).to.not.deep.contain({Substrate: bob.address});
    });

    itSub('Admin can remove address from allow list', async ({helper}) => {
      const {collectionId} = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
      await helper.nft.addAdmin(alice, collectionId, {Substrate: charlie.address});
      await helper.nft.addToAllowList(alice, collectionId, {Substrate: bob.address});
      await helper.collection.removeFromAllowList(charlie, collectionId, {Substrate: bob.address});

      const allowList = await helper.nft.getAllowList(collectionId);
      expect(allowList).to.not.deep.contain({Substrate: bob.address});
    });

    itSub('If address is already removed from allow list, nothing happens', async ({helper}) => {
      const {collectionId} = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
      await helper.nft.addToAllowList(alice, collectionId, {Substrate: bob.address});
      await helper.collection.removeFromAllowList(alice, collectionId, {Substrate: bob.address});
      const allowListBefore = await helper.nft.getAllowList(collectionId);
      expect(allowListBefore).to.not.deep.contain({Substrate: bob.address});

      await helper.collection.removeFromAllowList(alice, collectionId, {Substrate: bob.address});

      const allowListAfter = await helper.nft.getAllowList(collectionId);
      expect(allowListAfter).to.not.deep.contain({Substrate: bob.address});
    });
  });

  describe('Negative', async () => {
    itSub('Non-privileged user cannot remove address from allow list', async ({helper}) => {
      const {collectionId} = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
      await helper.nft.addToAllowList(alice, collectionId, {Substrate: charlie.address});
      await expect(helper.collection.removeFromAllowList(charlie, collectionId, {Substrate: charlie.address}))
        .to.be.rejectedWith(/common\.NoPermission/);

      const allowList = await helper.nft.getAllowList(collectionId);
      expect(allowList).to.deep.contain({Substrate: charlie.address});
    });

    itSub('Nobody can remove address from allow list of non-existing collection', async ({helper}) => {
      const collectionId = (1<<32) - 1;
      await expect(helper.collection.removeFromAllowList(bob, collectionId, {Substrate: charlie.address}))
        .to.be.rejectedWith(/common\.CollectionNotFound/);
    });

    itSub('Nobody can remove address from allow list of deleted collection', async ({helper}) => {
      const {collectionId} = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
      await helper.nft.addToAllowList(alice, collectionId, {Substrate: bob.address});
      await helper.collection.burn(alice, collectionId);

      await expect(helper.collection.removeFromAllowList(alice, collectionId, {Substrate: bob.address}))
        .to.be.rejectedWith(/common\.CollectionNotFound/);
    });
  });
});

describe('Integration Test ext. Transfer if included in Allow List', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;
  let charlie: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      const donor = privateKey('//Alice');
      [alice, bob, charlie] = await helper.arrange.createAccounts([30n, 10n, 10n], donor);
    });
  });

  describe('Positive', async () => {
    itSub('If Public Access mode is set to AllowList, tokens can be transferred to a allowlisted address with transfer.', async ({helper}) => {
      const {collectionId} = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
      const {tokenId} = await helper.nft.mintToken(alice, {collectionId: collectionId, owner: alice.address});
      await helper.nft.setPermissions(alice, collectionId, {access: 'AllowList'});
      await helper.nft.addToAllowList(alice, collectionId, {Substrate: alice.address});
      await helper.nft.addToAllowList(alice, collectionId, {Substrate: charlie.address});
      await helper.nft.transferToken(alice, collectionId, tokenId, {Substrate: charlie.address});
      const owner = await helper.nft.getTokenOwner(collectionId, tokenId);
      expect(owner.Substrate).to.be.equal(charlie.address);
    });

    itSub('If Public Access mode is set to AllowList, tokens can be transferred to a allowlisted address with transferFrom.', async ({helper}) => {
      const {collectionId} = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
      const {tokenId} = await helper.nft.mintToken(alice, {collectionId: collectionId, owner: alice.address});
      await helper.nft.setPermissions(alice, collectionId, {access: 'AllowList'});
      await helper.nft.addToAllowList(alice, collectionId, {Substrate: alice.address});
      await helper.nft.addToAllowList(alice, collectionId, {Substrate: charlie.address});
      await helper.nft.approveToken(alice, collectionId, tokenId, {Substrate: charlie.address});

      await helper.nft.transferTokenFrom(alice, collectionId, tokenId, {Substrate: alice.address}, {Substrate: charlie.address});
      const owner = await helper.nft.getTokenOwner(collectionId, tokenId);
      expect(owner.Substrate).to.be.equal(charlie.address);
    });

    itSub('If Public Access mode is set to AllowList, tokens can be transferred from a allowlisted address with transfer', async ({helper}) => {
      const {collectionId} = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
      const {tokenId} = await helper.nft.mintToken(alice, {collectionId: collectionId, owner: alice.address});
      await helper.nft.setPermissions(alice, collectionId, {access: 'AllowList'});
      await helper.nft.addToAllowList(alice, collectionId, {Substrate: alice.address});
      await helper.nft.addToAllowList(alice, collectionId, {Substrate: charlie.address});

      await helper.nft.transferToken(alice, collectionId, tokenId, {Substrate: charlie.address});
      const owner = await helper.nft.getTokenOwner(collectionId, tokenId);
      expect(owner.Substrate).to.be.equal(charlie.address);
    });

    itSub('If Public Access mode is set to AllowList, tokens can be transferred from a allowlisted address with transferFrom', async ({helper}) => {
      const {collectionId} = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
      const {tokenId} = await helper.nft.mintToken(alice, {collectionId: collectionId, owner: alice.address});
      await helper.nft.setPermissions(alice, collectionId, {access: 'AllowList'});
      await helper.nft.addToAllowList(alice, collectionId, {Substrate: alice.address});
      await helper.nft.addToAllowList(alice, collectionId, {Substrate: charlie.address});
      await helper.nft.approveToken(alice, collectionId, tokenId, {Substrate: charlie.address});

      await helper.nft.transferTokenFrom(alice, collectionId, tokenId, {Substrate: alice.address}, {Substrate: charlie.address});
      const owner = await helper.nft.getTokenOwner(collectionId, tokenId);
      expect(owner.Substrate).to.be.equal(charlie.address);
    });
  });

  describe('Negative', async () => {
    itSub('If Public Access mode is set to AllowList, tokens can\'t be transferred from a non-allowlisted address with transfer or transferFrom. Test1', async ({helper}) => {
      const {collectionId} = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
      const {tokenId} = await helper.nft.mintToken(alice, {collectionId: collectionId, owner: alice.address});
      await helper.nft.setPermissions(alice, collectionId, {access: 'AllowList'});
      await helper.nft.addToAllowList(alice, collectionId, {Substrate: charlie.address});

      await expect(helper.nft.transferToken(alice, collectionId, tokenId, {Substrate: charlie.address}))
        .to.be.rejectedWith(/common\.AddressNotInAllowlist/);
    });

    itSub('If Public Access mode is set to AllowList, tokens can\'t be transferred from a non-allowlisted address with transfer or transferFrom. Test2', async ({helper}) => {
      const {collectionId} = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
      const {tokenId} = await helper.nft.mintToken(alice, {collectionId: collectionId, owner: alice.address});
      await helper.nft.setPermissions(alice, collectionId, {access: 'AllowList'});
      await helper.nft.addToAllowList(alice, collectionId, {Substrate: alice.address});
      await helper.nft.addToAllowList(alice, collectionId, {Substrate: charlie.address});
      await helper.nft.approveToken(alice, collectionId, tokenId, {Substrate: charlie.address});
      await helper.collection.removeFromAllowList(alice, collectionId, {Substrate: alice.address});

      await expect(helper.nft.transferToken(alice, collectionId, tokenId, {Substrate: charlie.address}))
        .to.be.rejectedWith(/common\.AddressNotInAllowlist/);
    });

    itSub('If Public Access mode is set to AllowList, tokens can\'t be transferred to a non-allowlisted address with transfer or transferFrom. Test1', async ({helper}) => {
      const {collectionId} = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
      const {tokenId} = await helper.nft.mintToken(alice, {collectionId: collectionId, owner: alice.address});
      await helper.nft.setPermissions(alice, collectionId, {access: 'AllowList'});
      await helper.nft.addToAllowList(alice, collectionId, {Substrate: alice.address});

      await expect(helper.nft.transferToken(alice, collectionId, tokenId, {Substrate: charlie.address}))
        .to.be.rejectedWith(/common\.AddressNotInAllowlist/);
    });

    itSub('If Public Access mode is set to AllowList, tokens can\'t be transferred to a non-allowlisted address with transfer or transferFrom. Test2', async ({helper}) => {
      const {collectionId} = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
      const {tokenId} = await helper.nft.mintToken(alice, {collectionId: collectionId, owner: alice.address});
      await helper.nft.setPermissions(alice, collectionId, {access: 'AllowList'});
      await helper.nft.addToAllowList(alice, collectionId, {Substrate: alice.address});
      await helper.nft.addToAllowList(alice, collectionId, {Substrate: charlie.address});

      await helper.nft.approveToken(alice, collectionId, tokenId, {Substrate: charlie.address});
      await helper.collection.removeFromAllowList(alice, collectionId, {Substrate: alice.address});

      await expect(helper.nft.transferToken(alice, collectionId, tokenId, {Substrate: charlie.address}))
        .to.be.rejectedWith(/common\.AddressNotInAllowlist/);
    });

    itSub('If Public Access mode is set to AllowList, tokens can\'t be destroyed by a non-allowlisted address (even if it owned them before enabling AllowList mode)', async ({helper}) => {
      const {collectionId} = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
      const {tokenId} = await helper.nft.mintToken(alice, {collectionId: collectionId, owner: alice.address});
      await helper.nft.setPermissions(alice, collectionId, {access: 'AllowList'});
      await expect(helper.nft.burnToken(bob, collectionId, tokenId))
        .to.be.rejectedWith(/common\.NoPermission/);
    });

    itSub('If Public Access mode is set to AllowList, token transfers can\'t be Approved by a non-allowlisted address (see Approve method)', async ({helper}) => {
      const {collectionId} = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
      const {tokenId} = await helper.nft.mintToken(alice, {collectionId: collectionId, owner: alice.address});
      await helper.nft.setPermissions(alice, collectionId, {access: 'AllowList'});
      await expect(helper.nft.approveToken(alice, collectionId, tokenId, {Substrate: bob.address}))
        .to.be.rejectedWith(/common\.AddressNotInAllowlist/);
    });
  });
});

describe('Integration Test ext. Mint if included in Allow List', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      const donor = privateKey('//Alice');
      [alice, bob] = await helper.arrange.createAccounts([100n, 100n], donor);
    });
  });

  const permissionSet: ICollectionPermissions[] = [
    {access: 'Normal', mintMode: false},
    {access: 'Normal', mintMode: true},
    {access: 'AllowList', mintMode: false},
    {access: 'AllowList', mintMode: true},
  ];

  const testPermissionSuite = async (permissions: ICollectionPermissions) => {
    const allowlistedMintingShouldFail = !permissions.mintMode!;

    const appropriateRejectionMessage = permissions.mintMode! ? /common\.AddressNotInAllowlist/ : /common\.PublicMintingNotAllowed/;

    const allowlistedMintingTest = () => itSub(
      `With the condtions above, tokens can${allowlistedMintingShouldFail ? '\'t' : ''} be created by allow-listed addresses`,
      async ({helper}) => {
        const collection = await helper.nft.mintCollection(alice, {});
        await collection.setPermissions(alice, permissions);
        await collection.addToAllowList(alice, {Substrate: bob.address});

        if (allowlistedMintingShouldFail)
          await expect(collection.mintToken(bob, {Substrate: bob.address})).to.be.rejectedWith(appropriateRejectionMessage);
        else
          await expect(collection.mintToken(bob, {Substrate: bob.address})).to.not.be.rejected;
      },
    );


    describe(`Public Access Mode = ${permissions.access}, Mint Mode = ${permissions.mintMode}`, async () => {
      describe('Positive', async () => {
        itSub('With the condtions above, tokens can be created by owner', async ({helper}) => {
          const collection = await helper.nft.mintCollection(alice, {});
          await collection.setPermissions(alice, permissions);
          await expect(collection.mintToken(alice, {Substrate: alice.address})).to.not.be.rejected;
        });

        itSub('With the condtions above, tokens can be created by admin', async ({helper}) => {
          const collection = await helper.nft.mintCollection(alice, {});
          await collection.setPermissions(alice, permissions);
          await collection.addAdmin(alice, {Substrate: bob.address});
          await expect(collection.mintToken(bob, {Substrate: bob.address})).to.not.be.rejected;
        });

        if (!allowlistedMintingShouldFail) allowlistedMintingTest();
      });

      describe('Negative', async () => {
        itSub('With the condtions above, tokens can\'t be created by non-priviliged non-allow-listed address', async ({helper}) => {
          const collection = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
          await collection.setPermissions(alice, permissions);
          await expect(collection.mintToken(bob, {Substrate: bob.address}))
            .to.be.rejectedWith(appropriateRejectionMessage);
        });

        if (allowlistedMintingShouldFail) allowlistedMintingTest();
      });
    });
  };

  for (const permissions of permissionSet) {
    testPermissionSuite(permissions);
  }
});
