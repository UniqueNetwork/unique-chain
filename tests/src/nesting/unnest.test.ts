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
import {expect, itSub, Pallets, usingPlaygrounds} from '../util';
import {UniqueFTCollection, UniqueNFToken, UniqueRFToken} from '../util/playgrounds/unique';

describe('Integration Test: Unnesting', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;
  let charlie: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      const donor = await privateKey({filename: __filename});
      [alice, bob, charlie] = await helper.arrange.createAccounts([200n, 50n, 50n], donor);
    });
  });

  itSub('NFT: allows the owner to successfully unnest a token', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {permissions: {nesting: {tokenOwner: true}}});
    const targetToken = await collection.mintToken(alice);

    // Create a nested token
    const nestedToken = await collection.mintToken(alice, targetToken.nestingAccount());

    // Unnest
    await expect(nestedToken.transferFrom(alice, targetToken.nestingAccount(), {Substrate: alice.address}), 'while unnesting').to.be.fulfilled;
    expect(await nestedToken.getOwner()).to.be.deep.equal({Substrate: alice.address});

    // Nest and burn
    await nestedToken.nest(alice, targetToken);
    await expect(nestedToken.burnFrom(alice, targetToken.nestingAccount()), 'while burning').to.be.fulfilled;
    await expect(nestedToken.getOwner()).to.be.rejected;
  });

  itSub('Fungible: allows the owner to successfully unnest a token', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {permissions: {nesting: {tokenOwner: true}}});
    const targetToken = await collection.mintToken(alice);

    const collectionFT = await helper.ft.mintCollection(alice);

    // Nest and unnest
    await collectionFT.mint(alice, 10n, targetToken.nestingAccount());
    await expect(collectionFT.transferFrom(alice, targetToken.nestingAccount(), {Substrate: alice.address}, 9n), 'while unnesting').to.be.fulfilled;
    expect(await collectionFT.getBalance({Substrate: alice.address})).to.be.equal(9n);
    expect(await collectionFT.getBalance(targetToken.nestingAccount())).to.be.equal(1n);

    // Nest and burn
    await collectionFT.transfer(alice, targetToken.nestingAccount(), 5n);
    await expect(collectionFT.burnTokensFrom(alice, targetToken.nestingAccount(), 6n), 'while burning').to.be.fulfilled;
    expect(await collectionFT.getBalance({Substrate: alice.address})).to.be.equal(4n);
    expect(await collectionFT.getBalance(targetToken.nestingAccount())).to.be.equal(0n);
    expect(await targetToken.getChildren()).to.be.length(0);
  });
<<<<<<< HEAD

  itSub.ifWithPallets('ReFungible: allows the owner to successfully unnest a token', [Pallets.ReFungible], async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {permissions: {nesting: {tokenOwner: true}}});
    const targetToken = await collection.mintToken(alice);

    const collectionRFT = await helper.rft.mintCollection(alice);

    // Nest and unnest
    const token = await collectionRFT.mintToken(alice, 10n, targetToken.nestingAccount());
    await expect(token.transferFrom(alice, targetToken.nestingAccount(), {Substrate: alice.address}, 9n), 'while unnesting').to.be.fulfilled;
    expect(await token.getBalance({Substrate: alice.address})).to.be.equal(9n);
    expect(await token.getBalance(targetToken.nestingAccount())).to.be.equal(1n);

    // Nest and burn
    await token.transfer(alice, targetToken.nestingAccount(), 5n);
    await expect(token.burnFrom(alice, targetToken.nestingAccount(), 6n), 'while burning').to.be.fulfilled;
    expect(await token.getBalance({Substrate: alice.address})).to.be.equal(4n);
    expect(await token.getBalance(targetToken.nestingAccount())).to.be.equal(0n);
    expect(await targetToken.getChildren()).to.be.length(0);
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

      const targetNft = await collectionNFT.mintToken(owner, {Substrate: charlie.address});

      let nested: UniqueFTCollection | UniqueRFToken;
      const totalAmount = 5n;
      const firstUnnestAmount = 2n;
      const restUnnestAmount = totalAmount - firstUnnestAmount;

      if (collectionNested instanceof UniqueFTCollection) {
        await collectionNested.mint(owner, totalAmount, {Substrate: charlie.address});
        nested = collectionNested;
      } else {
        nested = await collectionNested.mintToken(owner, totalAmount, {Substrate: charlie.address});
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
            await nested.burnTokensFrom(unnester, targetNft.nestingAccount(), amount);
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

      const targetNft = await collectionNFT.mintToken(owner, {Substrate: charlie.address});
      const nested = await collectionNested.mintToken(owner, {Substrate: charlie.address});

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
=======
>>>>>>> 483c1f0f (Combine refungible tests)
});

describe('Negative Test: Unnesting', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      const donor = await privateKey({filename: __filename});
      [alice, bob] = await helper.arrange.createAccounts([50n, 10n], donor);
    });
  });

  itSub('Disallows a non-owner to unnest/burn a token', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {permissions: {nesting: {tokenOwner: true}}});
    const targetToken = await collection.mintToken(alice);

    // Create a nested token
    const nestedToken = await collection.mintToken(alice, targetToken.nestingAccount());

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
    const nestedToken = await collection.mintToken(alice, targetToken.nestingAccount());
    await expect(targetToken.nest(alice, nestedToken)).to.be.rejectedWith(/^structure\.OuroborosDetected$/);
  });
});
