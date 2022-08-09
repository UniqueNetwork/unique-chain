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
import usingApi from './substrate/substrate-api';
import {
  createCollectionExpectSuccess,
  destroyCollectionExpectSuccess,
  setCollectionLimitsExpectSuccess,
  setCollectionSponsorExpectSuccess,
  confirmSponsorshipExpectSuccess,
  createItemExpectSuccess,
  createItemExpectFailure,
  transferExpectSuccess,
  getFreeBalance,
  waitNewBlocks, burnItemExpectSuccess,
  requirePallets,
  Pallets
} from './util/helpers';
import {expect} from 'chai';

describe('Number of tokens per address (NFT)', () => {
  let alice: IKeyringPair;

  before(async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      alice = privateKeyWrapper('//Alice');
    });
  });

  it.skip('Collection limits allow greater number than chain limits, chain limits are enforced', async () => {

    const collectionId = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
    await setCollectionLimitsExpectSuccess(alice, collectionId, {accountTokenOwnershipLimit: 20});
    for(let i = 0; i < 10; i++){
      await createItemExpectSuccess(alice, collectionId, 'NFT');
    }
    await createItemExpectFailure(alice, collectionId, 'NFT');
    for(let i = 1; i < 11; i++) {
      await burnItemExpectSuccess(alice, collectionId, i);
    }
    await destroyCollectionExpectSuccess(collectionId);
  });

  it('Collection limits allow lower number than chain limits, collection limits are enforced', async () => {

    const collectionId = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
    await setCollectionLimitsExpectSuccess(alice, collectionId, {accountTokenOwnershipLimit: 1});
    await createItemExpectSuccess(alice, collectionId, 'NFT');
    await createItemExpectFailure(alice, collectionId, 'NFT');
    await burnItemExpectSuccess(alice, collectionId, 1);
    await destroyCollectionExpectSuccess(collectionId);
  });
});

describe('Number of tokens per address (ReFungible)', () => {
  let alice: IKeyringPair;

  before(async function() {
    await requirePallets(this, [Pallets.ReFungible]);

    await usingApi(async (api, privateKeyWrapper) => {
      alice = privateKeyWrapper('//Alice');
    });
  });

  it.skip('Collection limits allow greater number than chain limits, chain limits are enforced', async () => {
    const collectionId = await createCollectionExpectSuccess({mode: {type: 'ReFungible'}});
    await setCollectionLimitsExpectSuccess(alice, collectionId, {accountTokenOwnershipLimit: 20});
    for(let i = 0; i < 10; i++){
      await createItemExpectSuccess(alice, collectionId, 'ReFungible');
    }
    await createItemExpectFailure(alice, collectionId, 'ReFungible');
    for(let i = 1; i < 11; i++) {
      await burnItemExpectSuccess(alice, collectionId, i, 100);
    }
    await destroyCollectionExpectSuccess(collectionId);
  });

  it('Collection limits allow lower number than chain limits, collection limits are enforced', async () => {
    const collectionId = await createCollectionExpectSuccess({mode: {type: 'ReFungible'}});
    await setCollectionLimitsExpectSuccess(alice, collectionId, {accountTokenOwnershipLimit: 1});
    await createItemExpectSuccess(alice, collectionId, 'ReFungible');
    await createItemExpectFailure(alice, collectionId, 'ReFungible');
    await burnItemExpectSuccess(alice, collectionId, 1, 100);
    await destroyCollectionExpectSuccess(collectionId);
  });
});

describe.skip('Sponsor timeout (NFT) (only for special chain limits test)', () => {
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

  it.skip('Collection limits have greater timeout value than chain limits, collection limits are enforced', async () => {
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

  it('Collection limits have lower timeout value than chain limits, chain limits are enforced', async () => {

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

  it('Collection limits have greater timeout value than chain limits, collection limits are enforced', async () => {
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

  it('Collection limits have lower timeout value than chain limits, chain limits are enforced', async () => {

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

  it('Collection limits have greater timeout value than chain limits, collection limits are enforced', async () => {
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

  it('Collection limits have lower timeout value than chain limits, chain limits are enforced', async () => {

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

describe('Collection zero limits (NFT)', () => {
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

  it.skip('Limits have 0 in tokens per address field, the chain limits are applied', async () => {
    const collectionId = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
    await setCollectionLimitsExpectSuccess(alice, collectionId, {accountTokenOwnershipLimit: 0});
    for(let i = 0; i < 10; i++){
      await createItemExpectSuccess(alice, collectionId, 'NFT');
    }
    await createItemExpectFailure(alice, collectionId, 'NFT');
  });

  it('Limits have 0 in sponsor timeout, no limits are applied', async () => {

    const collectionId = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
    await setCollectionLimitsExpectSuccess(alice, collectionId, {sponsorTransferTimeout: 0});
    const tokenId = await createItemExpectSuccess(alice, collectionId, 'NFT');
    await setCollectionSponsorExpectSuccess(collectionId, alice.address);
    await confirmSponsorshipExpectSuccess(collectionId, '//Alice');
    await transferExpectSuccess(collectionId, tokenId, alice, bob);
    const aliceBalanceBefore = await getFreeBalance(alice);

    // check setting SponsorTimeout = 0, success with next block
    await waitNewBlocks(1);
    await transferExpectSuccess(collectionId, tokenId, bob, charlie);
    const aliceBalanceAfterSponsoredTransaction1 = await getFreeBalance(alice);
    expect(aliceBalanceAfterSponsoredTransaction1 < aliceBalanceBefore).to.be.true;
    //expect(aliceBalanceAfterSponsoredTransaction1).to.be.lessThan(aliceBalanceBefore);
  });
});

describe('Collection zero limits (Fungible)', () => {
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

  it('Limits have 0 in sponsor timeout, no limits are applied', async () => {
    const collectionId = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});
    await setCollectionLimitsExpectSuccess(alice, collectionId, {sponsorTransferTimeout: 0});
    const tokenId = await createItemExpectSuccess(alice, collectionId, 'Fungible');
    await setCollectionSponsorExpectSuccess(collectionId, alice.address);
    await confirmSponsorshipExpectSuccess(collectionId, '//Alice');
    await transferExpectSuccess(collectionId, tokenId, alice, bob, 10, 'Fungible');
    const aliceBalanceBefore = await getFreeBalance(alice);
    await transferExpectSuccess(collectionId, tokenId, bob, charlie, 2, 'Fungible');

    // check setting SponsorTimeout = 0, success with next block
    await waitNewBlocks(1);
    await transferExpectSuccess(collectionId, tokenId, bob, charlie, 2, 'Fungible');
    const aliceBalanceAfterSponsoredTransaction1 = await getFreeBalance(alice);
    expect(aliceBalanceAfterSponsoredTransaction1 < aliceBalanceBefore).to.be.true;
    //expect(aliceBalanceAfterSponsoredTransaction1).to.be.lessThan(aliceBalanceBefore);
  });
});

describe('Collection zero limits (ReFungible)', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;
  let charlie: IKeyringPair;

  before(async function() {
    await requirePallets(this, [Pallets.ReFungible]);

    await usingApi(async (api, privateKeyWrapper) => {
      alice = privateKeyWrapper('//Alice');
      bob = privateKeyWrapper('//Bob');
      charlie = privateKeyWrapper('//Charlie');
    });
  });

  it.skip('Limits have 0 in tokens per address field, the chain limits are applied', async () => {
    const collectionId = await createCollectionExpectSuccess({mode: {type: 'ReFungible'}});
    await setCollectionLimitsExpectSuccess(alice, collectionId, {accountTokenOwnershipLimit: 0});
    for(let i = 0; i < 10; i++){
      await createItemExpectSuccess(alice, collectionId, 'ReFungible');
    }
    await createItemExpectFailure(alice, collectionId, 'ReFungible');
  });

  it('Limits have 0 in sponsor timeout, no limits are applied', async () => {

    const collectionId = await createCollectionExpectSuccess({mode: {type: 'ReFungible'}});
    await setCollectionLimitsExpectSuccess(alice, collectionId, {sponsorTransferTimeout: 0});
    const tokenId = await createItemExpectSuccess(alice, collectionId, 'ReFungible');
    await setCollectionSponsorExpectSuccess(collectionId, alice.address);
    await confirmSponsorshipExpectSuccess(collectionId, '//Alice');
    await transferExpectSuccess(collectionId, tokenId, alice, bob, 100, 'ReFungible');
    await transferExpectSuccess(collectionId, tokenId, bob, charlie, 20, 'ReFungible');
    const aliceBalanceBefore = await getFreeBalance(alice);

    // check setting SponsorTimeout = 0, success with next block
    await waitNewBlocks(1);
    await transferExpectSuccess(collectionId, tokenId, bob, charlie, 20, 'ReFungible');
    const aliceBalanceAfterSponsoredTransaction1 = await getFreeBalance(alice);
    expect(aliceBalanceAfterSponsoredTransaction1 < aliceBalanceBefore).to.be.true;
    //expect(aliceBalanceAfterSponsoredTransaction1).to.be.lessThan(aliceBalanceBefore);
  });
  
  it('Effective collection limits', async () => {
    await usingApi(async (api) => {
      const collectionId = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
      await setCollectionLimitsExpectSuccess(alice, collectionId, {ownerCanTransfer: true});
      
      { // Check that limits is undefined
        const collection = await api.rpc.unique.collectionById(collectionId);
        expect(collection.isSome).to.be.true;
        const limits = collection.unwrap().limits;
        expect(limits).to.be.any;
        
        expect(limits.accountTokenOwnershipLimit.toHuman()).to.be.null;
        expect(limits.sponsoredDataSize.toHuman()).to.be.null;
        expect(limits.sponsoredDataRateLimit.toHuman()).to.be.null;
        expect(limits.tokenLimit.toHuman()).to.be.null;
        expect(limits.sponsorTransferTimeout.toHuman()).to.be.null;
        expect(limits.sponsorApproveTimeout.toHuman()).to.be.null;
        expect(limits.ownerCanTransfer.toHuman()).to.be.true;
        expect(limits.ownerCanDestroy.toHuman()).to.be.null;
        expect(limits.transfersEnabled.toHuman()).to.be.null;
      }
  
      { // Check that limits is undefined for non-existent collection
        const limits = await api.rpc.unique.effectiveCollectionLimits(11111);
        expect(limits.toHuman()).to.be.null;
      }
  
      { // Check that default values defined for collection limits
        const limitsOpt = await api.rpc.unique.effectiveCollectionLimits(collectionId);
        expect(limitsOpt.isNone).to.be.false;
        const limits = limitsOpt.unwrap();
  
        expect(limits.accountTokenOwnershipLimit.toHuman()).to.be.eq('100,000');
        expect(limits.sponsoredDataSize.toHuman()).to.be.eq('2,048');
        expect(limits.sponsoredDataRateLimit.toHuman()).to.be.eq('SponsoringDisabled');
        expect(limits.tokenLimit.toHuman()).to.be.eq('4,294,967,295');
        expect(limits.sponsorTransferTimeout.toHuman()).to.be.eq('5');
        expect(limits.sponsorApproveTimeout.toHuman()).to.be.eq('5');
        expect(limits.ownerCanTransfer.toHuman()).to.be.true;
        expect(limits.ownerCanDestroy.toHuman()).to.be.true;
        expect(limits.transfersEnabled.toHuman()).to.be.true;
      }

      { //Check the values for collection limits
        await setCollectionLimitsExpectSuccess(alice, collectionId, {
          accountTokenOwnershipLimit: 99_999,
          sponsoredDataSize: 1024,
          tokenLimit: 123,
          transfersEnabled: false,
        });

        const limitsOpt = await api.rpc.unique.effectiveCollectionLimits(collectionId);
        expect(limitsOpt.isNone).to.be.false;
        const limits = limitsOpt.unwrap();
  
        expect(limits.accountTokenOwnershipLimit.toHuman()).to.be.eq('99,999');
        expect(limits.sponsoredDataSize.toHuman()).to.be.eq('1,024');
        expect(limits.sponsoredDataRateLimit.toHuman()).to.be.eq('SponsoringDisabled');
        expect(limits.tokenLimit.toHuman()).to.be.eq('123');
        expect(limits.sponsorTransferTimeout.toHuman()).to.be.eq('5');
        expect(limits.sponsorApproveTimeout.toHuman()).to.be.eq('5');
        expect(limits.ownerCanTransfer.toHuman()).to.be.true;
        expect(limits.ownerCanDestroy.toHuman()).to.be.true;
        expect(limits.transfersEnabled.toHuman()).to.be.false;
      }
    });
  });
});


