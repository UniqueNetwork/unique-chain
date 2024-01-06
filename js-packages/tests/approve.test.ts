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
import {expect, itSub, Pallets, usingPlaygrounds} from '@unique/test-utils/util.js';
import {CrossAccountId} from '@unique-nft/playgrounds/unique.js';



[
  {method: 'approveToken', account: (account: IKeyringPair) => CrossAccountId.fromKeyring(account).toICrossAccountId()},
  {method: 'approveTokenFromEth', account: (account: IKeyringPair) => CrossAccountId.fromKeyring(account).toEthereum().toICrossAccountId()},
].map(testCase => {
  describe(`Integration Test ${testCase.method}(spender, collection_id, item_id, amount):`, () => {
    let alice: IKeyringPair;
    let bob: IKeyringPair;
    let charlie: IKeyringPair;

    before(async () => {
      await usingPlaygrounds(async (helper, privateKey) => {
        const donor = await privateKey({url: import.meta.url});
        [alice, bob, charlie] = await helper.arrange.createAccounts([100n, 100n, 100n], donor);
      });
    });

    itSub('[nft] Execute the extrinsic and check approvedList', async ({helper}) => {
      const {collectionId} = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
      const {tokenId} = await helper.nft.mintToken(alice, {collectionId: collectionId, owner: testCase.account(alice)});
      await (helper.nft as any)[testCase.method](alice, collectionId, tokenId, {Substrate: bob.address});
      expect(await helper.nft.isTokenApproved(collectionId, tokenId, {Substrate: bob.address})).to.be.true;
    });

    itSub('[fungible] Execute the extrinsic and check approvedList', async ({helper}) => {
      const {collectionId} = await helper.ft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'}, 0);
      await helper.ft.mintTokens(alice, collectionId, 10n, testCase.account(alice));
      const tokenId = await helper.ft.getLastTokenId(collectionId);
      await (helper.ft as any)[testCase.method](alice, collectionId, tokenId, {Substrate: bob.address});
      const amount = await helper.ft.getTokenApprovedPieces(collectionId, tokenId, {Substrate: bob.address}, testCase.account(alice));
      expect(amount).to.be.equal(1n);
    });

    itSub.ifWithPallets('[refungible] Execute the extrinsic and check approvedList', [Pallets.ReFungible], async ({helper}) => {
      const {collectionId} = await helper.rft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
      const {tokenId} = await helper.rft.mintToken(alice, {collectionId: collectionId, owner: testCase.account(alice), pieces: 100n});
      await (helper.rft as any)[testCase.method](alice, collectionId, tokenId, {Substrate: bob.address});
      const amount = await helper.rft.getTokenApprovedPieces(collectionId, tokenId, {Substrate: bob.address}, testCase.account(alice));
      expect(amount).to.be.equal(1n);
    });

    itSub('[nft] Remove approval by using 0 amount', async ({helper}) => {
      const collection = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
      const collectionId = collection.collectionId;
      const {tokenId} = await helper.nft.mintToken(alice, {collectionId: collectionId, owner: testCase.account(alice)});
      await (helper.nft as any)[testCase.method](alice, collectionId, tokenId, {Substrate: bob.address});
      expect(await helper.nft.isTokenApproved(collectionId, tokenId, {Substrate: bob.address})).to.be.true;
      await (helper.nft as any)[testCase.method](alice, collectionId, tokenId, {Substrate: bob.address}, 0n);
      expect(await helper.nft.isTokenApproved(collectionId, tokenId, {Substrate: bob.address})).to.be.false;
    });

    itSub('[fungible] Remove approval by using 0 amount', async ({helper}) => {
      const {collectionId} = await helper.ft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'}, 0);
      await helper.ft.mintTokens(alice, collectionId, 10n, testCase.account(alice));
      const tokenId = await helper.ft.getLastTokenId(collectionId);
      await (helper.ft as any)[testCase.method](alice, collectionId, tokenId, {Substrate: bob.address});
      const amountBefore = await helper.ft.getTokenApprovedPieces(collectionId, tokenId, {Substrate: bob.address}, testCase.account(alice));
      expect(amountBefore).to.be.equal(1n);

      await (helper.ft as any)[testCase.method](alice, collectionId, tokenId, {Substrate: bob.address}, 0n);
      const amountAfter = await helper.ft.getTokenApprovedPieces(collectionId, tokenId, {Substrate: bob.address}, testCase.account(alice));
      expect(amountAfter).to.be.equal(0n);
    });

    itSub.ifWithPallets('[refungible] Remove approval by using 0 amount', [Pallets.ReFungible], async ({helper}) => {
      const {collectionId} = await helper.rft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
      const {tokenId} = await helper.rft.mintToken(alice, {collectionId: collectionId, owner: testCase.account(alice), pieces: 100n});
      await (helper.rft as any)[testCase.method](alice, collectionId, tokenId, {Substrate: bob.address});
      const amountBefore = await helper.rft.getTokenApprovedPieces(collectionId, tokenId, {Substrate: bob.address}, testCase.account(alice));
      expect(amountBefore).to.be.equal(1n);

      await (helper.rft as any)[testCase.method](alice, collectionId, tokenId, {Substrate: bob.address}, 0n);
      const amountAfter = await helper.rft.getTokenApprovedPieces(collectionId, tokenId, {Substrate: bob.address}, testCase.account(alice));
      expect(amountAfter).to.be.equal(0n);
    });

    itSub('can`t be called by collection owner on non-owned item when OwnerCanTransfer == false', async ({helper}) => {
      const {collectionId} = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
      const {tokenId} = await helper.nft.mintToken(alice, {collectionId: collectionId, owner: testCase.account(bob)});
      const result = (helper.nft as any)[testCase.method](alice, collectionId, tokenId, {Substrate: charlie.address});
      await expect(result).to.be.rejectedWith('common.CantApproveMoreThanOwned');
    });
  });

  describe(`[${testCase.method}] Normal user can approve other users to transfer:`, () => {
    let alice: IKeyringPair;
    let bob: IKeyringPair;
    let charlie: IKeyringPair;

    before(async () => {
      await usingPlaygrounds(async (helper, privateKey) => {
        const donor = await privateKey({url: import.meta.url});
        [alice, bob, charlie] = await helper.arrange.createAccounts([100n, 100n, 100n], donor);
      });
    });

    itSub('NFT', async ({helper}) => {
      const {collectionId} = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
      const {tokenId} = await helper.nft.mintToken(alice, {collectionId: collectionId, owner: testCase.account(bob)});
      await (helper.nft as any)[testCase.method](bob, collectionId, tokenId, {Substrate: charlie.address});
      expect(await helper.nft.isTokenApproved(collectionId, tokenId, {Substrate: charlie.address})).to.be.true;
    });

    itSub('Fungible up to an approved amount', async ({helper}) => {
      const {collectionId} = await helper.ft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'}, 0);
      await helper.ft.mintTokens(alice, collectionId, 10n, testCase.account(bob));
      const tokenId = await helper.ft.getLastTokenId(collectionId);
      await (helper.ft as any)[testCase.method](bob, collectionId, tokenId, {Substrate: charlie.address});
      const amount = await helper.ft.getTokenApprovedPieces(collectionId, tokenId, {Substrate: charlie.address}, testCase.account(bob));
      expect(amount).to.be.equal(1n);
    });

    itSub.ifWithPallets('ReFungible up to an approved amount', [Pallets.ReFungible], async ({helper}) => {
      const {collectionId} = await helper.rft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
      const {tokenId} = await helper.rft.mintToken(alice, {collectionId: collectionId, owner: testCase.account(bob), pieces: 100n});
      await (helper.rft as any)[testCase.method](bob, collectionId, tokenId, {Substrate: charlie.address}, 100n);
      const amount = await helper.rft.getTokenApprovedPieces(collectionId, tokenId, {Substrate: charlie.address}, testCase.account(bob));
      expect(amount).to.be.equal(100n);
    });
  });

  describe(`[${testCase.method}] Approved users can transferFrom up to approved amount:`, () => {
    let alice: IKeyringPair;
    let bob: IKeyringPair;
    let charlie: IKeyringPair;

    before(async () => {
      await usingPlaygrounds(async (helper, privateKey) => {
        const donor = await privateKey({url: import.meta.url});
        [alice, bob, charlie] = await helper.arrange.createAccounts([100n, 100n, 100n], donor);
      });
    });

    itSub('NFT', async ({helper}) => {
      const {collectionId} = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
      const {tokenId} = await helper.nft.mintToken(alice, {collectionId: collectionId, owner: testCase.account(bob)});
      await (helper.nft as any)[testCase.method](bob, collectionId, tokenId, {Substrate: charlie.address});
      await helper.nft.transferTokenFrom(charlie, collectionId, tokenId, testCase.account(bob), {Substrate: alice.address});
      const owner = await helper.nft.getTokenOwner(collectionId, tokenId);
      expect(owner).to.be.deep.equal({Substrate: alice.address});
    });

    itSub('Fungible up to an approved amount', async ({helper}) => {
      const {collectionId} = await helper.ft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'}, 0);
      await helper.ft.mintTokens(alice, collectionId, 10n, testCase.account(bob));
      const tokenId = await helper.ft.getLastTokenId(collectionId);
      await (helper.ft as any)[testCase.method](bob, collectionId, tokenId, {Substrate: charlie.address});
      const before = await helper.ft.getBalance(collectionId, {Substrate: alice.address});
      await helper.ft.transferTokenFrom(charlie, collectionId, tokenId, testCase.account(bob), {Substrate: alice.address}, 1n);
      const after = await helper.ft.getBalance(collectionId, {Substrate: alice.address});
      expect(after - before).to.be.equal(1n);
    });

    itSub.ifWithPallets('ReFungible up to an approved amount', [Pallets.ReFungible], async ({helper}) => {
      const {collectionId} = await helper.rft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
      const {tokenId} = await helper.rft.mintToken(alice, {collectionId: collectionId, owner: testCase.account(bob), pieces: 100n});
      await (helper.rft as any)[testCase.method](bob, collectionId, tokenId, {Substrate: charlie.address});
      const before = await helper.rft.getTokenBalance(collectionId, tokenId, {Substrate: alice.address});
      await helper.rft.transferTokenFrom(charlie, collectionId, tokenId, testCase.account(bob), {Substrate: alice.address}, 1n);
      const after = await helper.rft.getTokenBalance(collectionId, tokenId, {Substrate: alice.address});
      expect(after - before).to.be.equal(1n);
    });
  });

  describe(`[${testCase.method}] Approved users cannot use transferFrom to repeat transfers if approved amount was already transferred:`, () => {
    let alice: IKeyringPair;
    let bob: IKeyringPair;
    let charlie: IKeyringPair;

    before(async () => {
      await usingPlaygrounds(async (helper, privateKey) => {
        const donor = await privateKey({url: import.meta.url});
        [alice, bob, charlie] = await helper.arrange.createAccounts([100n, 100n, 100n], donor);
      });
    });

    itSub('NFT', async ({helper}) => {
      const {collectionId} = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
      const {tokenId} = await helper.nft.mintToken(alice, {collectionId: collectionId, owner: testCase.account(bob)});
      await (helper.nft as any)[testCase.method](bob, collectionId, tokenId, {Substrate: charlie.address});
      await helper.nft.transferTokenFrom(charlie, collectionId, tokenId, testCase.account(bob), {Substrate: alice.address});
      const owner = await helper.nft.getTokenOwner(collectionId, tokenId);
      expect(owner).to.be.deep.equal({Substrate: alice.address});
      const transferTokenFromTx = () => helper.nft.transferTokenFrom(charlie, collectionId, tokenId, testCase.account(bob), {Substrate: alice.address});
      await expect(transferTokenFromTx()).to.be.rejectedWith('common.ApprovedValueTooLow');
    });

    itSub('Fungible up to an approved amount', async ({helper}) => {
      const {collectionId} = await helper.ft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'}, 0);
      await helper.ft.mintTokens(alice, collectionId, 10n, testCase.account(bob));
      const tokenId = await helper.ft.getLastTokenId(collectionId);
      await (helper.ft as any)[testCase.method](bob, collectionId, tokenId, {Substrate: charlie.address});
      const before = await helper.ft.getBalance(collectionId, {Substrate: alice.address});
      await helper.ft.transferTokenFrom(charlie, collectionId, tokenId, testCase.account(bob), {Substrate: alice.address}, 1n);
      const after = await helper.ft.getBalance(collectionId, {Substrate: alice.address});
      expect(after - before).to.be.equal(1n);

      const transferTokenFromTx = () => helper.ft.transferTokenFrom(charlie, collectionId, tokenId, testCase.account(bob), {Substrate: alice.address}, 1n);
      await expect(transferTokenFromTx()).to.be.rejectedWith('common.ApprovedValueTooLow');
    });

    itSub.ifWithPallets('ReFungible up to an approved amount', [Pallets.ReFungible], async ({helper}) => {
      const {collectionId} = await helper.rft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
      const {tokenId} = await helper.rft.mintToken(alice, {collectionId: collectionId, owner: testCase.account(bob), pieces: 100n});
      await (helper.ft as any)[testCase.method](bob, collectionId, tokenId, {Substrate: charlie.address}, 100n);
      const before = await helper.rft.getTokenBalance(collectionId, tokenId, {Substrate: alice.address});
      await helper.rft.transferTokenFrom(charlie, collectionId, tokenId, testCase.account(bob), {Substrate: alice.address}, 100n);
      const after = await helper.rft.getTokenBalance(collectionId, tokenId, {Substrate: alice.address});
      expect(after - before).to.be.equal(100n);
      const transferTokenFromTx = () => helper.rft.transferTokenFrom(charlie, collectionId, tokenId, testCase.account(bob), {Substrate: alice.address}, 100n);
      await expect(transferTokenFromTx()).to.be.rejectedWith('common.ApprovedValueTooLow');
    });
  });

  describe(`[${testCase.method}] Approved amount decreases by the transferred amount:`, () => {
    let alice: IKeyringPair;
    let bob: IKeyringPair;
    let charlie: IKeyringPair;
    let dave: IKeyringPair;

    before(async () => {
      await usingPlaygrounds(async (helper, privateKey) => {
        const donor = await privateKey({url: import.meta.url});
        [alice, bob, charlie, dave] = await helper.arrange.createAccounts([100n, 100n, 100n, 100n], donor);
      });
    });

    itSub('If a user B is approved to transfer 10 Fungible tokens from user A, they can transfer 2 tokens to user C, which will result in decreasing approval from 10 to 8. Then user B can transfer 8 tokens to user D.', async ({helper}) => {
      const {collectionId} = await helper.ft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'}, 0);
      await helper.ft.mintTokens(alice, collectionId, 10n, testCase.account(alice));
      const tokenId = await helper.ft.getLastTokenId(collectionId);
      await (helper.ft as any)[testCase.method](alice, collectionId, tokenId, {Substrate: bob.address}, 10n);

      const charlieBefore = await helper.ft.getBalance(collectionId, {Substrate: charlie.address});
      await helper.ft.transferTokenFrom(bob, collectionId, tokenId, testCase.account(alice), {Substrate: charlie.address}, 2n);
      const charlieAfter = await helper.ft.getBalance(collectionId, {Substrate: charlie.address});
      expect(charlieAfter - charlieBefore).to.be.equal(2n);

      const daveBefore = await helper.ft.getBalance(collectionId, {Substrate: dave.address});
      await helper.ft.transferTokenFrom(bob, collectionId, tokenId, testCase.account(alice), {Substrate: dave.address}, 8n);
      const daveAfter = await helper.ft.getBalance(collectionId, {Substrate: dave.address});
      expect(daveAfter - daveBefore).to.be.equal(8n);
    });
  });

  describe(`[${testCase.method}] User may clear the approvals to approving for 0 amount:`, () => {
    let alice: IKeyringPair;
    let bob: IKeyringPair;
    let charlie: IKeyringPair;

    before(async () => {
      await usingPlaygrounds(async (helper, privateKey) => {
        const donor = await privateKey({url: import.meta.url});
        [alice, bob, charlie] = await helper.arrange.createAccounts([100n, 100n, 100n], donor);
      });
    });

    itSub('NFT', async ({helper}) => {
      const owner = testCase.account(alice);
      const {collectionId} = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
      const {tokenId} = await helper.nft.mintToken(alice, {collectionId: collectionId, owner: owner});

      await (helper.nft as any)[testCase.method](alice, collectionId, tokenId, {Substrate: bob.address});
      expect(await helper.nft.isTokenApproved(collectionId, tokenId, {Substrate: bob.address})).to.be.true;

      await (helper.nft as any)[testCase.method](alice, collectionId, tokenId, {Substrate: bob.address}, 0n);
      expect(await helper.nft.isTokenApproved(collectionId, tokenId, {Substrate: bob.address})).to.be.false;

      const transferTokenFromTx = helper.nft.transferTokenFrom(bob, collectionId, tokenId, owner, {Substrate: bob.address});
      await expect(transferTokenFromTx).to.be.rejectedWith('common.ApprovedValueTooLow');
    });

    itSub('Fungible', async ({helper}) => {
      const owner = testCase.account(alice);
      const {collectionId} = await helper.ft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'}, 0);
      await helper.ft.mintTokens(alice, collectionId, 10n, owner);
      const tokenId = await helper.ft.getLastTokenId(collectionId);
      await (helper.ft as any)[testCase.method](alice, collectionId, tokenId, {Substrate: bob.address});
      const amountBefore = await helper.ft.getTokenApprovedPieces(collectionId, tokenId, {Substrate: bob.address}, owner);
      expect(amountBefore).to.be.equal(1n);

      await (helper.ft as any)[testCase.method](alice, collectionId, tokenId, {Substrate: bob.address}, 0n);
      const amountAfter = await helper.ft.getTokenApprovedPieces(collectionId, tokenId, {Substrate: bob.address}, owner);
      expect(amountAfter).to.be.equal(0n);

      const transferTokenFromTx = helper.ft.transferTokenFrom(bob, collectionId, tokenId, owner, {Substrate: charlie.address}, 1n);
      await expect(transferTokenFromTx).to.be.rejectedWith('common.ApprovedValueTooLow');
    });

    itSub.ifWithPallets('ReFungible', [Pallets.ReFungible], async ({helper}) => {
      const owner = testCase.account(alice);
      const {collectionId} = await helper.rft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
      const {tokenId} = await helper.rft.mintToken(alice, {collectionId: collectionId, owner, pieces: 100n});
      await (helper.rft as any)[testCase.method](alice, collectionId, tokenId, {Substrate: bob.address});
      const amountBefore = await helper.rft.getTokenApprovedPieces(collectionId, tokenId, {Substrate: bob.address}, owner);
      expect(amountBefore).to.be.equal(1n);

      await (helper.rft as any)[testCase.method](alice, collectionId, tokenId, {Substrate: bob.address}, 0n);
      const amountAfter = await helper.rft.getTokenApprovedPieces(collectionId, tokenId, {Substrate: bob.address}, owner);
      expect(amountAfter).to.be.equal(0n);

      const transferTokenFromTx = helper.rft.transferTokenFrom(bob, collectionId, tokenId, owner, {Substrate: charlie.address}, 1n);
      await expect(transferTokenFromTx).to.be.rejectedWith('common.ApprovedValueTooLow');
    });
  });

  describe(`[${testCase.method}] User cannot approve for the amount greater than they own:`, () => {
    let alice: IKeyringPair;
    let bob: IKeyringPair;
    let charlie: IKeyringPair;

    before(async () => {
      await usingPlaygrounds(async (helper, privateKey) => {
        const donor = await privateKey({url: import.meta.url});
        [alice, bob, charlie] = await helper.arrange.createAccounts([100n, 100n, 100n], donor);
      });
    });

    itSub('1 for NFT', async ({helper}) => {
      const {collectionId} = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
      const {tokenId} = await helper.nft.mintToken(alice, {collectionId: collectionId, owner: testCase.account(bob)});
      const result = (helper.nft as any)[testCase.method](bob, collectionId, tokenId, {Substrate: charlie.address}, 2n);
      await expect(result).to.be.rejectedWith('nonfungible.NonfungibleItemsHaveNoAmount');
      expect(await helper.nft.isTokenApproved(collectionId, tokenId, {Substrate: charlie.address})).to.be.false;
    });

    itSub('Fungible', async ({helper}) => {
      const {collectionId} = await helper.ft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'}, 0);
      await helper.ft.mintTokens(alice, collectionId, 10n, testCase.account(alice));
      const tokenId = await helper.ft.getLastTokenId(collectionId);
      const result = (helper.ft as any)[testCase.method](alice, collectionId, tokenId, {Substrate: bob.address}, 11n);
      await expect(result).to.be.rejectedWith('common.CantApproveMoreThanOwned');
    });

    itSub.ifWithPallets('ReFungible', [Pallets.ReFungible], async ({helper}) => {
      const {collectionId} = await helper.rft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
      const {tokenId} = await helper.rft.mintToken(alice, {collectionId: collectionId, owner: testCase.account(alice), pieces: 100n});
      const result = (helper.rft as any)[testCase.method](alice, collectionId, tokenId, {Substrate: bob.address}, 101n);
      await expect(result).to.be.rejectedWith('common.CantApproveMoreThanOwned');
    });
  });

  describe(`[${testCase.method}] Integration Test approve(spender, collection_id, item_id, amount) with collection admin permissions:`, () => {
    let alice: IKeyringPair;
    let bob: IKeyringPair;
    let charlie: IKeyringPair;

    before(async () => {
      await usingPlaygrounds(async (helper, privateKey) => {
        const donor = await privateKey({url: import.meta.url});
        [alice, bob, charlie] = await helper.arrange.createAccounts([100n, 100n, 100n], donor);
      });
    });

    itSub('cannot be called by collection admin on non-owned item', async ({helper}) => {
      const {collectionId} = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
      const {tokenId} = await helper.nft.mintToken(alice, {collectionId: collectionId, owner: testCase.account(alice)});
      await helper.collection.addAdmin(alice, collectionId, {Substrate: bob.address});
      const approveTx = (helper.nft as any)[testCase.method](bob, collectionId, tokenId, {Substrate: charlie.address});
      await expect(approveTx).to.be.rejectedWith('common.CantApproveMoreThanOwned');
    });
  });

  describe(`[${testCase.method}] Negative Integration Test approve(spender, collection_id, item_id, amount):`, () => {
    let alice: IKeyringPair;
    let bob: IKeyringPair;
    let charlie: IKeyringPair;
    const NONEXISTENT_COLLECTION = (2 ** 32) - 1;

    before(async () => {
      await usingPlaygrounds(async (helper, privateKey) => {
        const donor = await privateKey({url: import.meta.url});
        [alice, bob, charlie] = await helper.arrange.createAccounts([100n, 100n, 100n], donor);
      });
    });

    itSub('[nft] Approve for a collection that does not exist', async ({helper}) => {
      const approveTx = (helper.nft as any)[testCase.method](bob, NONEXISTENT_COLLECTION, 1, {Substrate: charlie.address});
      await expect(approveTx).to.be.rejectedWith('common.CollectionNotFound');
    });

    itSub('[fungible] Approve for a collection that does not exist', async ({helper}) => {
      const approveTx = (helper.ft as any)[testCase.method](bob, NONEXISTENT_COLLECTION, 1, {Substrate: charlie.address});
      await expect(approveTx).to.be.rejectedWith('common.CollectionNotFound');
    });

    itSub.ifWithPallets('[refungible] Approve for a collection that does not exist', [Pallets.ReFungible], async ({helper}) => {
      const approveTx = (helper.rft as any)[testCase.method](bob, NONEXISTENT_COLLECTION, 1, {Substrate: charlie.address});
      await expect(approveTx).to.be.rejectedWith('common.CollectionNotFound');
    });

    itSub('[nft] Approve for a collection that was destroyed', async ({helper}) => {
      const {collectionId} = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
      await helper.nft.burn(alice, collectionId);
      const approveTx = (helper.nft as any)[testCase.method](alice, collectionId, 1, {Substrate: bob.address});
      await expect(approveTx).to.be.rejectedWith('common.CollectionNotFound');
    });

    itSub('[fungible] Approve for a collection that was destroyed', async ({helper}) => {
      const {collectionId} = await helper.ft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
      await helper.ft.burn(alice, collectionId);
      const approveTx = (helper.ft as any)[testCase.method](alice, collectionId, 1, {Substrate: bob.address});
      await expect(approveTx).to.be.rejectedWith('common.CollectionNotFound');
    });

    itSub.ifWithPallets('[refungible] Approve for a collection that was destroyed', [Pallets.ReFungible], async ({helper}) => {
      const {collectionId} = await helper.rft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
      await helper.rft.burn(alice, collectionId);
      const approveTx = (helper.rft as any)[testCase.method](alice, collectionId, 1, {Substrate: bob.address});
      await expect(approveTx).to.be.rejectedWith('common.CollectionNotFound');
    });

    itSub('[nft] Approve transfer of a token that does not exist', async ({helper}) => {
      const {collectionId} = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
      const approveTx = (helper.nft as any)[testCase.method](alice, collectionId, 2, {Substrate: bob.address});
      await expect(approveTx).to.be.rejectedWith('common.TokenNotFound');
    });

    itSub.ifWithPallets('[refungible] Approve transfer of a token that does not exist', [Pallets.ReFungible], async ({helper}) => {
      const {collectionId} = await helper.rft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
      const approveTx = (helper.rft as any)[testCase.method](alice, collectionId, 2, {Substrate: bob.address});
      await expect(approveTx).to.be.rejectedWith('common.CantApproveMoreThanOwned'); // TODO: why the error is not common.TokenNotFound
    });

    itSub('[nft] Approve using the address that does not own the approved token', async ({helper}) => {
      const {collectionId} = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
      const {tokenId} = await helper.nft.mintToken(alice, {collectionId: collectionId, owner: testCase.account(alice)});
      const approveTx = (helper.nft as any)[testCase.method](bob, collectionId, tokenId, {Substrate: alice.address});
      await expect(approveTx).to.be.rejectedWith('common.CantApproveMoreThanOwned');
    });

    itSub('[fungible] Approve using the address that does not own the approved token', async ({helper}) => {
      const {collectionId} = await helper.ft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
      await helper.ft.mintTokens(alice, collectionId, 10n, testCase.account(alice));
      const tokenId = await helper.ft.getLastTokenId(collectionId);
      const approveTx = (helper.ft as any)[testCase.method](bob, collectionId, tokenId, {Substrate: alice.address});
      await expect(approveTx).to.be.rejectedWith('common.CantApproveMoreThanOwned');
    });

    itSub.ifWithPallets('[refungible] Approve using the address that does not own the approved token', [Pallets.ReFungible], async ({helper}) => {
      const {collectionId} = await helper.rft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
      const {tokenId} = await helper.rft.mintToken(alice, {collectionId: collectionId, owner: testCase.account(alice), pieces: 100n});
      const approveTx = (helper.rft as any)[testCase.method](bob, collectionId, tokenId, {Substrate: alice.address});
      await expect(approveTx).to.be.rejectedWith('common.CantApproveMoreThanOwned');
    });

    itSub.ifWithPallets('should fail if approved more ReFungibles than owned', [Pallets.ReFungible], async ({helper}) => {
      const {collectionId} = await helper.rft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
      const {tokenId} = await helper.rft.mintToken(alice, {collectionId: collectionId, owner: alice.address, pieces: 100n});
      await helper.rft.transferToken(alice, collectionId, tokenId, testCase.account(bob), 100n);
      await (helper.rft as any)[testCase.method](bob, collectionId, tokenId, {Substrate: alice.address}, 100n);

      const approveTx = (helper.rft as any)[testCase.method](bob, collectionId, tokenId, {Substrate: alice.address}, 101n);
      await expect(approveTx).to.be.rejectedWith('common.CantApproveMoreThanOwned');
    });

    itSub('should fail if approved more Fungibles than owned', async ({helper}) => {
      const {collectionId} = await helper.ft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
      await helper.ft.mintTokens(alice, collectionId, 10n, alice.address);
      const tokenId = await helper.ft.getLastTokenId(collectionId);

      await helper.ft.transferToken(alice, collectionId, tokenId, testCase.account(bob), 10n);
      await (helper.ft as any)[testCase.method](bob, collectionId, tokenId, {Substrate: alice.address}, 10n);
      const approveTx = (helper.ft as any)[testCase.method](bob, collectionId, tokenId, {Substrate: alice.address}, 11n);
      await expect(approveTx).to.be.rejectedWith('common.CantApproveMoreThanOwned');
    });

    itSub('fails when called by collection owner on non-owned item when OwnerCanTransfer == false', async ({helper}) => {
      const {collectionId} = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
      const {tokenId} = await helper.nft.mintToken(alice, {collectionId: collectionId, owner: testCase.account(bob)});
      await helper.collection.setLimits(alice, collectionId, {ownerCanTransfer: false});

      const approveTx = (helper.nft as any)[testCase.method](alice, collectionId, tokenId, {Substrate: charlie.address});
      await expect(approveTx).to.be.rejectedWith('common.CantApproveMoreThanOwned');
    });
  });
});

describe('Normal user can approve other users to be wallet operator:', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      const donor = await privateKey({url: import.meta.url});
      [alice, bob] = await helper.arrange.createAccounts([100n, 100n], donor);
    });
  });

  itSub('[nft] Enable and disable approval', async ({helper}) => {
    const {collectionId} = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});

    const checkBeforeApproval = await helper.nft.allowanceForAll(collectionId, {Substrate: alice.address}, {Substrate: bob.address});
    expect(checkBeforeApproval).to.be.false;

    await helper.nft.setAllowanceForAll(alice, collectionId, {Substrate: bob.address}, true);
    const checkAfterApproval = await helper.nft.allowanceForAll(collectionId, {Substrate: alice.address}, {Substrate: bob.address});
    expect(checkAfterApproval).to.be.true;

    await helper.nft.setAllowanceForAll(alice, collectionId, {Substrate: bob.address}, false);
    const checkAfterDisapproval = await helper.nft.allowanceForAll(collectionId, {Substrate: alice.address}, {Substrate: bob.address});
    expect(checkAfterDisapproval).to.be.false;
  });

  itSub.ifWithPallets('[rft] Enable and disable approval', [Pallets.ReFungible], async ({helper}) => {
    const {collectionId} = await helper.rft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});

    const checkBeforeApproval = await helper.rft.allowanceForAll(collectionId, {Substrate: alice.address}, {Substrate: bob.address});
    expect(checkBeforeApproval).to.be.false;

    await helper.rft.setAllowanceForAll(alice, collectionId, {Substrate: bob.address}, true);
    const checkAfterApproval = await helper.rft.allowanceForAll(collectionId, {Substrate: alice.address}, {Substrate: bob.address});
    expect(checkAfterApproval).to.be.true;

    await helper.rft.setAllowanceForAll(alice, collectionId, {Substrate: bob.address}, false);
    const checkAfterDisapproval = await helper.rft.allowanceForAll(collectionId, {Substrate: alice.address}, {Substrate: bob.address});
    expect(checkAfterDisapproval).to.be.false;
  });
});

describe('Administrator and collection owner do not need approval in order to execute TransferFrom (with owner_can_transfer_flag = true):', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;
  let charlie: IKeyringPair;
  let dave: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      const donor = await privateKey({url: import.meta.url});
      [alice, bob, charlie, dave] = await helper.arrange.createAccounts([100n, 100n, 100n, 100n], donor);
    });
  });

  itSub('NFT', async ({helper}) => {
    const {collectionId} = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
    await helper.collection.setLimits(alice, collectionId, {ownerCanTransfer: true});
    const {tokenId} = await helper.nft.mintToken(alice, {collectionId: collectionId, owner: charlie.address});

    await helper.nft.transferTokenFrom(alice, collectionId, tokenId, {Substrate: charlie.address}, {Substrate: dave.address});
    const owner1 = await helper.nft.getTokenOwner(collectionId, tokenId);
    expect(owner1).to.be.deep.equal({Substrate: dave.address});

    await helper.collection.addAdmin(alice, collectionId, {Substrate: bob.address});
    await helper.nft.transferTokenFrom(bob, collectionId, tokenId, {Substrate: dave.address}, {Substrate: alice.address});
    const owner2 = await helper.nft.getTokenOwner(collectionId, tokenId);
    expect(owner2).to.be.deep.equal({Substrate: alice.address});
  });

  itSub('Fungible up to an approved amount', async ({helper}) => {
    const {collectionId} = await helper.ft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'}, 0);
    await helper.collection.setLimits(alice, collectionId, {ownerCanTransfer: true});
    await helper.ft.mintTokens(alice, collectionId, 10n, charlie.address);
    const tokenId = await helper.ft.getLastTokenId(collectionId);

    const daveBalanceBefore = await helper.ft.getBalance(collectionId, {Substrate: dave.address});
    await helper.ft.transferTokenFrom(alice, collectionId, tokenId, {Substrate: charlie.address}, {Substrate: dave.address}, 1n);
    const daveBalanceAfter = await helper.ft.getBalance(collectionId, {Substrate: dave.address});
    expect(daveBalanceAfter - daveBalanceBefore).to.be.equal(1n);

    await helper.collection.addAdmin(alice ,collectionId, {Substrate: bob.address});

    const aliceBalanceBefore = await helper.ft.getBalance(collectionId, {Substrate: alice.address});
    await helper.ft.transferTokenFrom(bob, collectionId, tokenId, {Substrate: dave.address}, {Substrate: alice.address}, 1n);
    const aliceBalanceAfter = await helper.ft.getBalance(collectionId, {Substrate: alice.address});
    expect(aliceBalanceAfter - aliceBalanceBefore).to.be.equal(1n);
  });

  itSub.ifWithPallets('ReFungible up to an approved amount', [Pallets.ReFungible], async ({helper}) => {
    const {collectionId} = await helper.rft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
    await helper.collection.setLimits(alice, collectionId, {ownerCanTransfer: true});
    const {tokenId} = await helper.rft.mintToken(alice, {collectionId: collectionId, owner: charlie.address, pieces: 100n});

    const daveBefore = await helper.rft.getTokenBalance(collectionId, tokenId, {Substrate: dave.address});
    await helper.rft.transferTokenFrom(alice, collectionId, tokenId, {Substrate: charlie.address}, {Substrate: dave.address}, 1n);
    const daveAfter = await helper.rft.getTokenBalance(collectionId, tokenId, {Substrate: dave.address});
    expect(daveAfter - daveBefore).to.be.equal(1n);

    await helper.collection.addAdmin(alice, collectionId, {Substrate: bob.address});

    const aliceBefore = await helper.rft.getTokenBalance(collectionId, tokenId, {Substrate: alice.address});
    await helper.rft.transferTokenFrom(bob, collectionId, tokenId, {Substrate: dave.address}, {Substrate: alice.address}, 1n);
    const aliceAfter = await helper.rft.getTokenBalance(collectionId, tokenId, {Substrate: alice.address});
    expect(aliceAfter - aliceBefore).to.be.equal(1n);
  });
});

describe('Repeated approvals add up', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;
  let charlie: IKeyringPair;
  let dave: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      const donor = await privateKey({url: import.meta.url});
      [alice, bob, charlie, dave] = await helper.arrange.createAccounts([100n, 100n, 100n, 100n], donor);
    });
  });

  itSub.skip('Owned 10, approval 1: 1, approval 2: 1, resulting approved value: 2. Fungible', async ({helper}) => {
    const collection = await helper.ft.mintCollection(alice, {});
    await collection.mint(alice, 10n);
    await collection.approveTokens(alice, {Substrate: bob.address}, 1n);
    await collection.approveTokens(alice, {Substrate: charlie.address}, 1n);
    // const allowances1 = await getAllowance(collectionId, 0, Alice.address, Bob.address);
    // const allowances2 = await getAllowance(collectionId, 0, Alice.address, Charlie.address);
    // expect(allowances1 + allowances2).to.be.eq(2n);
  });

  itSub.skip('Owned 10, approval 1: 1, approval 2: 1, resulting approved value: 2. ReFungible', async ({helper}) => {
    const collection = await helper.rft.mintCollection(alice, {});
    const token = await collection.mintToken(alice, 10n);
    await token.approve(alice, {Substrate: bob.address}, 1n);
    await token.approve(alice, {Substrate: charlie.address}, 1n);
    // const allowances1 = await getAllowance(collectionId, itemId, Alice.address, Bob.address);
    // const allowances2 = await getAllowance(collectionId, itemId, Alice.address, Charlie.address);
    // expect(allowances1 + allowances2).to.be.eq(2n);
  });

  // Canceled by changing approve logic
  itSub.skip('Cannot approve for more than total user\'s amount (owned: 10, approval 1: 5 - should succeed, approval 2: 6 - should fail). Fungible', async ({helper}) => {
    const collection = await helper.ft.mintCollection(alice, {});
    await collection.mint(alice, 10n, {Substrate: dave.address});
    await collection.approveTokens(dave, {Substrate: bob.address}, 5n);
    await expect(collection.approveTokens(dave, {Substrate: charlie.address}, 6n))
      .to.be.rejectedWith('this test would fail (since it is skipped), replace this expecting message with what would have been received');
  });

  // Canceled by changing approve logic
  itSub.skip('Cannot approve for more than total user\'s amount (owned: 100, approval 1: 50 - should succeed, approval 2: 51 - should fail). ReFungible', async ({helper}) => {
    const collection = await helper.rft.mintCollection(alice, {});
    const token = await collection.mintToken(alice, 100n, {Substrate: dave.address});
    await token.approve(dave, {Substrate: bob.address}, 50n);
    await expect(token.approve(dave, {Substrate: charlie.address}, 51n))
      .to.be.rejectedWith('this test would fail (since it is skipped), replace this expecting message with what would have been received');
  });
});
