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
import {expect, itSub, Pallets, usingPlaygrounds} from '../../util';
import {UniqueFTCollection, UniqueNFToken, UniqueRFToken} from '../../util/playgrounds/unique';

describe('Integration Test: Unnesting', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;
  let charlie: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      const donor = await privateKey({url: import.meta.url});
      [alice, bob, charlie] = await helper.arrange.createAccounts([200n, 50n, 50n], donor);
    });
  });

  [
    {mode: 'nft' as const},
    {mode: 'rft' as const},
    {mode: 'ft' as const},
  ].map(testCase => {
    itSub.only(`${testCase.mode.toUpperCase()}: token owner can unnest token`, async ({helper}) => {
      // Create parent collection and token:
      const collectionOwner = alice;
      const tokenOwner = bob;
      const parentCollection = await helper.nft.mintCollection(collectionOwner, {permissions: {nesting: {tokenOwner: true}}});
      const targetToken = await parentCollection.mintToken(collectionOwner, {owner: bob.address});

      // Create a nested token
      const nestedCollection = await helper[testCase.mode].mintCollection(collectionOwner, {permissions: {nesting: {tokenOwner: true}}});
      const nestedToken = await nestedCollection.mintToken(collectionOwner, {owner: tokenOwner.address});
      await nestedToken.nest(tokenOwner, targetToken, 1n);

      // tokenOwner can unnest using transferFrom
      await nestedToken.transferFrom(tokenOwner, targetToken.nestingAccount(), {Substrate: tokenOwner.address});

      // FT case
      if (nestedToken instanceof UniqueFTCollection) {
        expect(await nestedToken.getBalance({Substrate: tokenOwner.address})).to.eq(1n);
        expect(await nestedToken.getBalance(targetToken.nestingAccount())).to.eq(0n);
      }
      // NFT and RFT cases
      else {
        expect(await nestedToken.getOwner()).to.be.deep.equal({Substrate: tokenOwner.address});
      }
      expect(await targetToken.getChildren()).to.has.length(0);
    });
  });

  [
    {mode: 'nft' as const},
    {mode: 'rft' as const},
    {mode: 'ft' as const},
  ].map(testCase => {
    itSub.only(`${testCase.mode.toUpperCase()}: token owner can burn nested token`, async ({helper}) => {
      // Create parent collection and token:
      const collectionOwner = alice;
      const tokenOwner = bob;
      const parentCollection = await helper.nft.mintCollection(collectionOwner, {permissions: {nesting: {tokenOwner: true}}});
      const targetToken = await parentCollection.mintToken(collectionOwner, {owner: bob.address});

      // Create a nested token
      const nestedCollection = await helper[testCase.mode].mintCollection(collectionOwner, {permissions: {nesting: {tokenOwner: true}}});
      const nestedToken = await nestedCollection.mintToken(collectionOwner, {owner: tokenOwner.address});
      await nestedToken.nest(tokenOwner, targetToken, 1n);

      // tokenOwner can burn using burnFrom
      await nestedToken.burnFrom(tokenOwner, targetToken.nestingAccount());

      // FT case
      if (nestedToken instanceof UniqueFTCollection) {
        expect(await nestedToken.getBalance({Substrate: tokenOwner.address})).to.eq(0n);
        expect(await nestedToken.getBalance(targetToken.nestingAccount())).to.eq(0n);
      }
      // NFT and RFT cases
      else {
        expect(await nestedToken.doesExist()).to.be.false;
      }
      expect(await targetToken.getChildren()).to.has.length(0);
    });
  });

  async function checkNestedAmountState({
    expectedBalance,
    childrenShouldPresent,
    nested,
    targetNft,
  }: {
    expectedBalance: bigint,
    childrenShouldPresent: boolean,
    nested: UniqueFTCollection | UniqueRFToken,
    targetNft: UniqueNFToken,
  }) {
    const balance = await nested.getBalance(targetNft.nestingAccount());
    expect(balance).to.be.equal(expectedBalance);

    const children = await targetNft.getChildren();

    if (childrenShouldPresent) {
      expect(children[0]).to.be.deep.equal({
        collectionId: nested.collectionId,
        tokenId: (nested instanceof UniqueFTCollection) ? 0 : nested.tokenId,
      });
    } else {
      expect(children.length).to.be.equal(0);
    }
  }

  function ownerOrAdminUnnestCases(modes: ('ft' | 'nft' | 'rft')[]): {
    mode: 'ft' | 'nft' | 'rft',
    sender: string,
    op: 'transfer' | 'burn',
    requiredPallets: Pallets[],
  }[] {
    const senders = ['owner', 'admin'];
    const ops = ['transfer', 'burn'];

    const cases = [];
    for (const mode of modes) {
      const requiredPallets = (mode === 'rft')
        ? [Pallets.ReFungible]
        : [];

      for (const sender of senders) {
        for (const op of ops) {
          cases.push({
            mode: mode as 'ft' | 'nft' | 'rft',
            sender,
            op: op as 'transfer' | 'burn',
            requiredPallets,
          });
        }
      }
    }

    return cases;
  }

  ownerOrAdminUnnestCases(['ft', 'rft']).map(testCase =>
    itSub.ifWithPallets(`[${testCase.mode}]: allows a collection ${testCase.sender} to ${testCase.op} nested token`, testCase.requiredPallets, async({helper}) => {
      const owner = alice;
      const admin = bob;

      const unnester = (testCase.sender === 'owner')
        ? owner
        : admin;

      const collectionNFT = await helper.nft.mintCollection(owner);
      await collectionNFT.setPermissions(owner, {nesting: {tokenOwner: true}});

      const collectionNested = await helper[testCase.mode as 'ft' | 'rft'].mintCollection(owner, {
        limits: {
          ownerCanTransfer: true,
        },
      });
      await collectionNested.addAdmin(owner, {Substrate: admin.address});

      const targetNft = await collectionNFT.mintToken(owner, {owner: charlie.address});

      let nested: UniqueFTCollection | UniqueRFToken;
      const totalAmount = 5n;
      const firstUnnestAmount = 2n;
      const restUnnestAmount = totalAmount - firstUnnestAmount;

      if (collectionNested instanceof UniqueFTCollection) {
        await collectionNested.mint(owner, totalAmount, {Substrate: charlie.address});
        nested = collectionNested;
      } else {
        nested = await collectionNested.mintToken(owner, {pieces: totalAmount, owner: charlie.address});
      }

      // transfer/burn `amount` of nested assets by `unnester`.
      const doOperationAndCheck = async ({
        amount,
        shouldBeNestedAfterOp,
      }: {
        amount: bigint,
        shouldBeNestedAfterOp: boolean,
      }) => {
        const nestedBalanceBeforeOp = await nested.getBalance(targetNft.nestingAccount());

        if (testCase.op === 'transfer') {
          const bobBalanceBeforeOp = await nested.getBalance({Substrate: bob.address});

          await nested.transferFrom(unnester, targetNft.nestingAccount(), {Substrate: bob.address}, amount);
          expect(await nested.getBalance({Substrate: bob.address})).to.be.equal(bobBalanceBeforeOp + amount);
        } else {
          if (nested instanceof UniqueFTCollection) {
            await nested.burnFrom(unnester, targetNft.nestingAccount(), amount);
          } else {
            await nested.burnFrom(unnester, targetNft.nestingAccount(), amount);
          }
        }

        await checkNestedAmountState({
          expectedBalance: nestedBalanceBeforeOp - amount,
          childrenShouldPresent: shouldBeNestedAfterOp,
          nested,
          targetNft,
        });
      };

      // Initial setup: nest (fungibles/rft parts).
      // Check NFT's balance of nested assets and NFT's children.
      await nested.transfer(charlie, targetNft.nestingAccount(), totalAmount);
      await checkNestedAmountState({
        expectedBalance: totalAmount,
        childrenShouldPresent: true,
        nested,
        targetNft,
      });

      // Transfer/burn only a part of nested assets.
      // Check that NFT's balance of the nested assets correctly decreased and NFT's children are not changed.
      await doOperationAndCheck({
        amount: firstUnnestAmount,
        shouldBeNestedAfterOp: true,
      });

      // Transfer/burn all remaining nested assets.
      // Check that NFT's balance of the nested assets is 0 and NFT has no more children.
      await doOperationAndCheck({
        amount: restUnnestAmount,
        shouldBeNestedAfterOp: false,
      });
    }));

  ownerOrAdminUnnestCases(['nft']).map(testCase =>
    itSub(`[nft]: allows a collection ${testCase.sender} to ${testCase.op} nested token`, async ({helper}) => {
      const owner = alice;
      const admin = bob;

      const unnester = (testCase.sender === 'owner')
        ? owner
        : admin;

      const collectionNFT = await helper.nft.mintCollection(owner);
      await collectionNFT.setPermissions(owner, {nesting: {tokenOwner: true}});

      const collectionNested = await helper.nft.mintCollection(owner, {
        limits: {
          ownerCanTransfer: true,
        },
      });
      await collectionNested.addAdmin(owner, {Substrate: admin.address});

      const targetNft = await collectionNFT.mintToken(owner, {owner: charlie.address});
      const nested = await collectionNested.mintToken(owner, {owner: charlie.address});

      await nested.transfer(charlie, targetNft.nestingAccount());
      expect(await targetNft.getChildren()).to.be.deep.equal([{
        collectionId: nested.collectionId,
        tokenId: nested.tokenId,
      }]);

      if (testCase.op === 'transfer') {
        await nested.transferFrom(unnester, targetNft.nestingAccount(), {Substrate: bob.address});
      } else {
        await nested.burnFrom(unnester, targetNft.nestingAccount());
      }

      expect((await targetNft.getChildren()).length).to.be.equal(0);
    }));
});

describe('Negative Test: Unnesting', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      const donor = await privateKey({url: import.meta.url});
      [alice, bob] = await helper.arrange.createAccounts([50n, 10n], donor);
    });
  });

  itSub('Disallows a non-owner to unnest/burn a token', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {permissions: {nesting: {tokenOwner: true}}});
    const targetToken = await collection.mintToken(alice);

    // Create a nested token
    const nestedToken = await collection.mintToken(alice, {owner: targetToken.nestingAccount()});

    // Try to unnest
    await expect(nestedToken.unnest(bob, targetToken, {Substrate: alice.address})).to.be.rejectedWith(/common\.ApprovedValueTooLow/);
    expect(await nestedToken.getOwner()).to.be.deep.equal(targetToken.nestingAccount().toLowerCase());

    // Try to burn
    await expect(nestedToken.burnFrom(bob, targetToken.nestingAccount())).to.be.rejectedWith(/common\.ApprovedValueTooLow/);
    expect(await nestedToken.getOwner()).to.be.deep.equal(targetToken.nestingAccount().toLowerCase());
  });

  // todo another test for creating excessive depth matryoshka with Ethereum?

  // Recursive nesting
  itSub('Prevents Ouroboros creation', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {permissions: {nesting: {tokenOwner: true}}});
    const targetToken = await collection.mintToken(alice);

    // Fail to create a nested token ouroboros
    const nestedToken = await collection.mintToken(alice, {owner: targetToken.nestingAccount()});
    await expect(targetToken.nest(alice, nestedToken)).to.be.rejectedWith(/^structure\.OuroborosDetected$/);
  });
});
