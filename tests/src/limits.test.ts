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
import {expect, itSub, Pallets, requirePalletsOrSkip, usingPlaygrounds} from './util/playgrounds';

describe('Number of tokens per address (NFT)', () => {
  let alice: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      const donor = privateKey('//Alice');
      [alice] = await helper.arrange.createAccounts([10n], donor);
    });
  });

  itSub.skip('Collection limits allow greater number than chain limits, chain limits are enforced', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {});
    await collection.setLimits(alice, {accountTokenOwnershipLimit: 20});
    
    for(let i = 0; i < 10; i++){
      await expect(collection.mintToken(alice)).to.be.not.rejected;
    }
    await expect(collection.mintToken(alice)).to.be.rejectedWith(/common\.AccountTokenLimitExceeded/);
    for(let i = 1; i < 11; i++) {
      await expect(collection.burnToken(alice, i)).to.be.not.rejected;
    }
    await collection.burn(alice);
  });
  
  itSub('Collection limits allow lower number than chain limits, collection limits are enforced', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {});
    await collection.setLimits(alice, {accountTokenOwnershipLimit: 1});

    await collection.mintToken(alice);
    await expect(collection.mintToken(alice)).to.be.rejectedWith(/common\.AccountTokenLimitExceeded/);
    
    await collection.burnToken(alice, 1);
    await expect(collection.burn(alice)).to.be.not.rejected;
  });
});

describe('Number of tokens per address (ReFungible)', () => {
  let alice: IKeyringPair;

  before(async function() {
    await usingPlaygrounds(async (helper, privateKey) => {
      requirePalletsOrSkip(this, helper, [Pallets.ReFungible]);

      const donor = privateKey('//Alice');
      [alice] = await helper.arrange.createAccounts([10n], donor);
    });
  });

  itSub.skip('Collection limits allow greater number than chain limits, chain limits are enforced', async ({helper}) => {
    const collection = await helper.rft.mintCollection(alice, {});
    await collection.setLimits(alice, {accountTokenOwnershipLimit: 20});
    
    for(let i = 0; i < 10; i++){
      await expect(collection.mintToken(alice, 10n)).to.be.not.rejected;
    }
    await expect(collection.mintToken(alice, 10n)).to.be.rejectedWith(/common\.AccountTokenLimitExceeded/);
    for(let i = 1; i < 11; i++) {
      await expect(collection.burnToken(alice, i, 10n)).to.be.not.rejected;
    }
    await collection.burn(alice);
  });

  itSub('Collection limits allow lower number than chain limits, collection limits are enforced', async ({helper}) => {
    const collection = await helper.rft.mintCollection(alice, {});
    await collection.setLimits(alice, {accountTokenOwnershipLimit: 1});

    await collection.mintToken(alice);
    await expect(collection.mintToken(alice)).to.be.rejectedWith(/common\.AccountTokenLimitExceeded/);
    
    await collection.burnToken(alice, 1);
    await expect(collection.burn(alice)).to.be.not.rejected;
  });
});

// todo:playgrounds skipped ~ postponed
describe.skip('Sponsor timeout (NFT) (only for special chain limits test)', () => {
  /*let alice: IKeyringPair;
  let bob: IKeyringPair;
  let charlie: IKeyringPair;

  before(async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      alice = privateKeyWrapper('//Alice');
      bob = privateKeyWrapper('//Bob');
      charlie = privateKeyWrapper('//Charlie');
    });
  });

  itSub.skip('Collection limits have greater timeout value than chain limits, collection limits are enforced', async ({helper}) => {
    const collectionId = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
    await setCollectionLimitsExpectSuccess(alice, collectionId, {sponsorTransferTimeout: 7});
    const tokenId = await createItemExpectSuccess(alice, collectionId, 'NFT');
    await setCollectionSponsorExpectSuccess(collectionId, alice.address);
    await confirmSponsorshipExpectSuccess(collectionId, '//Alice');
    await transferExpectSuccess(collectionId, tokenId, alice, bob);
    const aliceBalanceBefore = await getFreeBalance(alice);

    // check setting SponsorTimeout = 5, fail
    await waitNewBlocks(5);
    await transferExpectSuccess(collectionId, tokenId, bob, charlie);
    const aliceBalanceAfterUnsponsoredTransaction = await getFreeBalance(alice);
    expect(aliceBalanceAfterUnsponsoredTransaction).to.be.equals(aliceBalanceBefore);

    // check setting SponsorTimeout = 7, success
    await waitNewBlocks(2); // 5 + 2
    await transferExpectSuccess(collectionId, tokenId, charlie, bob);
    const aliceBalanceAfterSponsoredTransaction = await getFreeBalance(alice);
    expect(aliceBalanceAfterSponsoredTransaction < aliceBalanceBefore).to.be.true;
    //expect(aliceBalanceAfterSponsoredTransaction).to.be.lessThan(aliceBalanceBefore);
    await destroyCollectionExpectSuccess(collectionId);
  });

  itSub('Collection limits have lower timeout value than chain limits, chain limits are enforced', async ({helper}) => {

    const collectionId = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
    await setCollectionLimitsExpectSuccess(alice, collectionId, {sponsorTransferTimeout: 1});
    const tokenId = await createItemExpectSuccess(alice, collectionId, 'NFT');
    await setCollectionSponsorExpectSuccess(collectionId, alice.address);
    await confirmSponsorshipExpectSuccess(collectionId, '//Alice');
    await transferExpectSuccess(collectionId, tokenId, alice, bob);
    const aliceBalanceBefore = await getFreeBalance(alice);

    // check setting SponsorTimeout = 1, fail
    await waitNewBlocks(1);
    await transferExpectSuccess(collectionId, tokenId, bob, charlie);
    const aliceBalanceAfterUnsponsoredTransaction = await getFreeBalance(alice);
    expect(aliceBalanceAfterUnsponsoredTransaction).to.be.equals(aliceBalanceBefore);

    // check setting SponsorTimeout = 5, success
    await waitNewBlocks(4);
    await transferExpectSuccess(collectionId, tokenId, charlie, bob);
    const aliceBalanceAfterSponsoredTransaction = await getFreeBalance(alice);
    expect(aliceBalanceAfterSponsoredTransaction < aliceBalanceBefore).to.be.true;
    //expect(aliceBalanceAfterSponsoredTransaction).to.be.lessThan(aliceBalanceBefore);
    await destroyCollectionExpectSuccess(collectionId);
  });
});

describe.skip('Sponsor timeout (Fungible) (only for special chain limits test)', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;
  let charlie: IKeyringPair;

  before(async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      alice = privateKeyWrapper('//Alice');
      bob = privateKeyWrapper('//Bob');
      charlie = privateKeyWrapper('//Charlie');
    });
  });

  itSub('Collection limits have greater timeout value than chain limits, collection limits are enforced', async ({helper}) => {
    const collectionId = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});
    await setCollectionLimitsExpectSuccess(alice, collectionId, {sponsorTransferTimeout: 7});
    const tokenId = await createItemExpectSuccess(alice, collectionId, 'Fungible');
    await setCollectionSponsorExpectSuccess(collectionId, alice.address);
    await confirmSponsorshipExpectSuccess(collectionId, '//Alice');
    await transferExpectSuccess(collectionId, tokenId, alice, bob, 10, 'Fungible');
    await transferExpectSuccess(collectionId, tokenId, bob, charlie, 2, 'Fungible');
    const aliceBalanceBefore = await getFreeBalance(alice);

    // check setting SponsorTimeout = 5, fail
    await waitNewBlocks(5);
    await transferExpectSuccess(collectionId, tokenId, bob, charlie, 2, 'Fungible');
    const aliceBalanceAfterUnsponsoredTransaction = await getFreeBalance(alice);
    expect(aliceBalanceAfterUnsponsoredTransaction).to.be.equals(aliceBalanceBefore);

    // check setting SponsorTimeout = 7, success
    await waitNewBlocks(2); // 5 + 2
    await transferExpectSuccess(collectionId, tokenId, bob, charlie, 2, 'Fungible');
    const aliceBalanceAfterSponsoredTransaction = await getFreeBalance(alice);
    expect(aliceBalanceAfterSponsoredTransaction < aliceBalanceBefore).to.be.true;
    //expect(aliceBalanceAfterSponsoredTransaction).to.be.lessThan(aliceBalanceBefore);

    await destroyCollectionExpectSuccess(collectionId);
  });

  itSub('Collection limits have lower timeout value than chain limits, chain limits are enforced', async ({helper}) => {

    const collectionId = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});
    await setCollectionLimitsExpectSuccess(alice, collectionId, {sponsorTransferTimeout: 1});
    const tokenId = await createItemExpectSuccess(alice, collectionId, 'Fungible');
    await setCollectionSponsorExpectSuccess(collectionId, alice.address);
    await confirmSponsorshipExpectSuccess(collectionId, '//Alice');
    await transferExpectSuccess(collectionId, tokenId, alice, bob, 10, 'Fungible');
    await transferExpectSuccess(collectionId, tokenId, bob, charlie, 2, 'Fungible');
    const aliceBalanceBefore = await getFreeBalance(alice);

    // check setting SponsorTimeout = 1, fail
    await waitNewBlocks(1);
    await transferExpectSuccess(collectionId, tokenId, bob, charlie, 2, 'Fungible');
    const aliceBalanceAfterUnsponsoredTransaction = await getFreeBalance(alice);
    expect(aliceBalanceAfterUnsponsoredTransaction).to.be.equals(aliceBalanceBefore);

    // check setting SponsorTimeout = 5, success
    await waitNewBlocks(4);
    await transferExpectSuccess(collectionId, tokenId, bob, charlie, 2, 'Fungible');
    const aliceBalanceAfterSponsoredTransaction = await getFreeBalance(alice);
    expect(aliceBalanceAfterSponsoredTransaction < aliceBalanceBefore).to.be.true;
    //expect(aliceBalanceAfterSponsoredTransaction).to.be.lessThan(aliceBalanceBefore);

    await destroyCollectionExpectSuccess(collectionId);
  });
});

describe.skip('Sponsor timeout (ReFungible) (only for special chain limits test)', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;
  let charlie: IKeyringPair;

  before(async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      alice = privateKeyWrapper('//Alice');
      bob = privateKeyWrapper('//Bob');
      charlie = privateKeyWrapper('//Charlie');
    });
  });

  itSub('Collection limits have greater timeout value than chain limits, collection limits are enforced', async ({helper}) => {
    const collectionId = await createCollectionExpectSuccess({mode: {type: 'ReFungible'}});
    await setCollectionLimitsExpectSuccess(alice, collectionId, {sponsorTransferTimeout: 7});
    const tokenId = await createItemExpectSuccess(alice, collectionId, 'ReFungible');
    await setCollectionSponsorExpectSuccess(collectionId, alice.address);
    await confirmSponsorshipExpectSuccess(collectionId, '//Alice');
    await transferExpectSuccess(collectionId, tokenId, alice, bob, 100, 'ReFungible');
    const aliceBalanceBefore = await getFreeBalance(alice);

    // check setting SponsorTimeout = 5, fail
    await waitNewBlocks(5);
    await transferExpectSuccess(collectionId, tokenId, bob, charlie, 20, 'ReFungible');
    const aliceBalanceAfterUnsponsoredTransaction = await getFreeBalance(alice);
    expect(aliceBalanceAfterUnsponsoredTransaction).to.be.equals(aliceBalanceBefore);

    // check setting SponsorTimeout = 7, success
    await waitNewBlocks(2); // 5 + 2
    await transferExpectSuccess(collectionId, tokenId, bob, charlie, 20, 'ReFungible');
    const aliceBalanceAfterSponsoredTransaction = await getFreeBalance(alice);
    expect(aliceBalanceAfterSponsoredTransaction < aliceBalanceBefore).to.be.true;
    //expect(aliceBalanceAfterSponsoredTransaction).to.be.lessThan(aliceBalanceBefore);
    await destroyCollectionExpectSuccess(collectionId);
  });

  itSub('Collection limits have lower timeout value than chain limits, chain limits are enforced', async ({helper}) => {

    const collectionId = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
    await setCollectionLimitsExpectSuccess(alice, collectionId, {sponsorTransferTimeout: 1});
    const tokenId = await createItemExpectSuccess(alice, collectionId, 'NFT');
    await setCollectionSponsorExpectSuccess(collectionId, alice.address);
    await confirmSponsorshipExpectSuccess(collectionId, '//Alice');
    await transferExpectSuccess(collectionId, tokenId, alice, bob);
    const aliceBalanceBefore = await getFreeBalance(alice);

    // check setting SponsorTimeout = 1, fail
    await waitNewBlocks(1);
    await transferExpectSuccess(collectionId, tokenId, bob, charlie);
    const aliceBalanceAfterUnsponsoredTransaction = await getFreeBalance(alice);
    expect(aliceBalanceAfterUnsponsoredTransaction).to.be.equals(aliceBalanceBefore);

    // check setting SponsorTimeout = 5, success
    await waitNewBlocks(4);
    await transferExpectSuccess(collectionId, tokenId, charlie, bob);
    const aliceBalanceAfterSponsoredTransaction = await getFreeBalance(alice);
    expect(aliceBalanceAfterSponsoredTransaction < aliceBalanceBefore).to.be.true;
    //expect(aliceBalanceAfterSponsoredTransaction).to.be.lessThan(aliceBalanceBefore);
    await destroyCollectionExpectSuccess(collectionId);
  });*/
});

describe('Collection zero limits (NFT)', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;
  let charlie: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      const donor = privateKey('//Alice');
      [alice, bob, charlie] = await helper.arrange.createAccounts([10n, 10n, 10n], donor);
    });
  });

  itSub.skip('Limits have 0 in tokens per address field, the chain limits are applied', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {});
    await collection.setLimits(alice, {accountTokenOwnershipLimit: 0});

    for(let i = 0; i < 10; i++){
      await collection.mintToken(alice);
    }
    await expect(collection.mintToken(alice)).to.be.rejectedWith(/common\.AccountTokenLimitExceeded/);
  });

  itSub('Limits have 0 in sponsor timeout, no limits are applied', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {});
    await collection.setLimits(alice, {sponsorTransferTimeout: 0});
    const token = await collection.mintToken(alice);

    await collection.setSponsor(alice, alice.address);
    await collection.confirmSponsorship(alice);
    
    await token.transfer(alice, {Substrate: bob.address});
    const aliceBalanceBefore = await helper.balance.getSubstrate(alice.address);

    // check setting SponsorTimeout = 0, success with next block
    await helper.wait.newBlocks(1);
    await token.transfer(bob, {Substrate: charlie.address});
    const aliceBalanceAfterSponsoredTransaction1 = await helper.balance.getSubstrate(alice.address);
    expect(aliceBalanceAfterSponsoredTransaction1 < aliceBalanceBefore).to.be.true;
  });
});

describe('Collection zero limits (Fungible)', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;
  let charlie: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      const donor = privateKey('//Alice');
      [alice, bob, charlie] = await helper.arrange.createAccounts([10n, 10n, 10n], donor);
    });
  });

  itSub('Limits have 0 in sponsor timeout, no limits are applied', async ({helper}) => {
    const collection = await helper.ft.mintCollection(alice, {});
    await collection.setLimits(alice, {sponsorTransferTimeout: 0});
    await collection.mint(alice, 3n);

    await collection.setSponsor(alice, alice.address);
    await collection.confirmSponsorship(alice);
    
    await collection.transfer(alice, {Substrate: bob.address}, 2n);
    const aliceBalanceBefore = await helper.balance.getSubstrate(alice.address);

    // check setting SponsorTimeout = 0, success with next block
    await helper.wait.newBlocks(1);
    await collection.transfer(bob, {Substrate: charlie.address});
    const aliceBalanceAfterSponsoredTransaction1 = await helper.balance.getSubstrate(alice.address);
    expect(aliceBalanceAfterSponsoredTransaction1 < aliceBalanceBefore).to.be.true;
  });
});

describe('Collection zero limits (ReFungible)', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;
  let charlie: IKeyringPair;

  before(async function() {
    await usingPlaygrounds(async (helper, privateKey) => {
      requirePalletsOrSkip(this, helper, [Pallets.ReFungible]);

      const donor = privateKey('//Alice');
      [alice, bob, charlie] = await helper.arrange.createAccounts([10n, 10n, 10n], donor);
    });
  });

  itSub.skip('Limits have 0 in tokens per address field, the chain limits are applied', async ({helper}) => {
    const collection = await helper.rft.mintCollection(alice, {});
    await collection.setLimits(alice, {accountTokenOwnershipLimit: 0});
    for(let i = 0; i < 10; i++){
      await collection.mintToken(alice);
    }
    await expect(collection.mintToken(alice)).to.be.rejectedWith(/common\.AccountTokenLimitExceeded/);
  });

  itSub('Limits have 0 in sponsor timeout, no limits are applied', async ({helper}) => {
    const collection = await helper.rft.mintCollection(alice, {});
    await collection.setLimits(alice, {sponsorTransferTimeout: 0});
    const token = await collection.mintToken(alice, 3n);

    await collection.setSponsor(alice, alice.address);
    await collection.confirmSponsorship(alice);
    
    await token.transfer(alice, {Substrate: bob.address}, 2n);
    const aliceBalanceBefore = await helper.balance.getSubstrate(alice.address);

    // check setting SponsorTimeout = 0, success with next block
    await helper.wait.newBlocks(1);
    await token.transfer(bob, {Substrate: charlie.address});
    const aliceBalanceAfterSponsoredTransaction1 = await helper.balance.getSubstrate(alice.address);
    expect(aliceBalanceAfterSponsoredTransaction1 < aliceBalanceBefore).to.be.true;
  });
});

describe('Effective collection limits (NFT)', () => {
  let alice: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      const donor = privateKey('//Alice');
      [alice] = await helper.arrange.createAccounts([10n], donor);
    });
  });
  
  itSub('Effective collection limits', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {});
    await collection.setLimits(alice, {ownerCanTransfer: true});    
    
    { 
      // Check that limits are undefined
      const collectionInfo = await collection.getData();
      const limits = collectionInfo?.raw.limits;
      expect(limits).to.be.any;
      
      expect(limits.accountTokenOwnershipLimit).to.be.null;
      expect(limits.sponsoredDataSize).to.be.null;
      expect(limits.sponsoredDataRateLimit).to.be.null;
      expect(limits.tokenLimit).to.be.null;
      expect(limits.sponsorTransferTimeout).to.be.null;
      expect(limits.sponsorApproveTimeout).to.be.null;
      expect(limits.ownerCanTransfer).to.be.true;
      expect(limits.ownerCanDestroy).to.be.null;
      expect(limits.transfersEnabled).to.be.null;
    }

    { // Check that limits is undefined for non-existent collection
      const limits = await helper.collection.getEffectiveLimits(999999);
      expect(limits).to.be.null;
    }

    { // Check that default values defined for collection limits
      const limits = await collection.getEffectiveLimits();

      expect(limits.accountTokenOwnershipLimit).to.be.eq(100000);
      expect(limits.sponsoredDataSize).to.be.eq(2048);
      expect(limits.sponsoredDataRateLimit).to.be.deep.eq({sponsoringDisabled: null});
      expect(limits.tokenLimit).to.be.eq(4294967295);
      expect(limits.sponsorTransferTimeout).to.be.eq(5);
      expect(limits.sponsorApproveTimeout).to.be.eq(5);
      expect(limits.ownerCanTransfer).to.be.true;
      expect(limits.ownerCanDestroy).to.be.true;
      expect(limits.transfersEnabled).to.be.true;
    }

    { 
      // Check the values for collection limits
      await collection.setLimits(alice, {
        accountTokenOwnershipLimit: 99_999,
        sponsoredDataSize: 1024,
        tokenLimit: 123,
        transfersEnabled: false,
      });

      const limits = await collection.getEffectiveLimits();

      expect(limits.accountTokenOwnershipLimit).to.be.eq(99999);
      expect(limits.sponsoredDataSize).to.be.eq(1024);
      expect(limits.sponsoredDataRateLimit).to.be.deep.eq({sponsoringDisabled: null});
      expect(limits.tokenLimit).to.be.eq(123);
      expect(limits.sponsorTransferTimeout).to.be.eq(5);
      expect(limits.sponsorApproveTimeout).to.be.eq(5);
      expect(limits.ownerCanTransfer).to.be.true;
      expect(limits.ownerCanDestroy).to.be.true;
      expect(limits.transfersEnabled).to.be.false;
    }
  });
});
