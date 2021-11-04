//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

import {IKeyringPair} from '@polkadot/types/types';
import privateKey from './substrate/privateKey';
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
  waitNewBlocks,
} from './util/helpers';
import {expect} from 'chai';

describe('Number of tokens per address (NFT)', () => {
  let alice: IKeyringPair;

  before(async () => {
    await usingApi(async () => {
      alice = privateKey('//Alice');
    });
  });

  it.skip('Collection limits allow greater number than chain limits, chain limits are enforced', async () => {

    const collectionId = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
    await setCollectionLimitsExpectSuccess(alice, collectionId, {accountTokenOwnershipLimit: 20});
    for(let i = 0; i < 10; i++){
      await createItemExpectSuccess(alice, collectionId, 'NFT');
    }
    await createItemExpectFailure(alice, collectionId, 'NFT');
    await destroyCollectionExpectSuccess(collectionId);
  });

  it('Collection limits allow lower number than chain limits, collection limits are enforced', async () => {

    const collectionId = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
    await setCollectionLimitsExpectSuccess(alice, collectionId, {accountTokenOwnershipLimit: 1});
    await createItemExpectSuccess(alice, collectionId, 'NFT');
    await createItemExpectFailure(alice, collectionId, 'NFT');
    await destroyCollectionExpectSuccess(collectionId);
  });
});

describe('Number of tokens per address (ReFungible)', () => {
  let alice: IKeyringPair;

  before(async () => {
    await usingApi(async () => {
      alice = privateKey('//Alice');
    });
  });

  it.skip('Collection limits allow greater number than chain limits, chain limits are enforced', async () => {
    const collectionId = await createCollectionExpectSuccess({mode: {type: 'ReFungible'}});
    await setCollectionLimitsExpectSuccess(alice, collectionId, {accountTokenOwnershipLimit: 20});
    for(let i = 0; i < 10; i++){
      await createItemExpectSuccess(alice, collectionId, 'ReFungible');
    }
    await createItemExpectFailure(alice, collectionId, 'ReFungible');
    await destroyCollectionExpectSuccess(collectionId);
  });

  it('Collection limits allow lower number than chain limits, collection limits are enforced', async () => {
    const collectionId = await createCollectionExpectSuccess({mode: {type: 'ReFungible'}});
    await setCollectionLimitsExpectSuccess(alice, collectionId, {accountTokenOwnershipLimit: 1});
    await createItemExpectSuccess(alice, collectionId, 'ReFungible');
    await createItemExpectFailure(alice, collectionId, 'ReFungible');
    await destroyCollectionExpectSuccess(collectionId);
  });
});

describe('Sponsor timeout (NFT)', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;
  let charlie: IKeyringPair;

  before(async () => {
    await usingApi(async () => {
      alice = privateKey('//Alice');
      bob = privateKey('//Bob');
      charlie = privateKey('//Charlie');
    });
  });

  it('Collection limits have greater timeout value than chain limits, collection limits are enforced', async () => {
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

describe('Sponsor timeout (Fungible)', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;
  let charlie: IKeyringPair;

  before(async () => {
    await usingApi(async () => {
      alice = privateKey('//Alice');
      bob = privateKey('//Bob');
      charlie = privateKey('//Charlie');
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

describe('Sponsor timeout (ReFungible)', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;
  let charlie: IKeyringPair;

  before(async () => {
    await usingApi(async () => {
      alice = privateKey('//Alice');
      bob = privateKey('//Bob');
      charlie = privateKey('//Charlie');
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
    await usingApi(async () => {
      alice = privateKey('//Alice');
      bob = privateKey('//Bob');
      charlie = privateKey('//Charlie');
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
    await usingApi(async () => {
      alice = privateKey('//Alice');
      bob = privateKey('//Bob');
      charlie = privateKey('//Charlie');
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

  before(async () => {
    await usingApi(async () => {
      alice = privateKey('//Alice');
      bob = privateKey('//Bob');
      charlie = privateKey('//Charlie');
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
});
