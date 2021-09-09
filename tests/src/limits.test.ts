//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

import { IKeyringPair } from '@polkadot/types/types';
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
import { expect } from 'chai';

describe('Number of tokens per address (NFT)', () => {
  let Alice: IKeyringPair;

  before(async () => {
    await usingApi(async () => {
      Alice = privateKey('//Alice');
    });
  });

  it('Collection limits allow greater number than chain limits, chain limits are enforced', async () => {
      
    const collectionId = await createCollectionExpectSuccess({ mode: { type: 'NFT' } });
    await setCollectionLimitsExpectSuccess(Alice, collectionId, { AccountTokenOwnershipLimit: 20 });
    for(let i = 0; i < 10; i++){
      await createItemExpectSuccess(Alice, collectionId, 'NFT');
    }
    await createItemExpectFailure(Alice, collectionId, 'NFT');
    await destroyCollectionExpectSuccess(collectionId);
  });

  it('Collection limits allow lower number than chain limits, collection limits are enforced', async () => {

    const collectionId = await createCollectionExpectSuccess({ mode: { type: 'NFT' } });
    await setCollectionLimitsExpectSuccess(Alice, collectionId, { AccountTokenOwnershipLimit: 1 });
    await createItemExpectSuccess(Alice, collectionId, 'NFT');
    await createItemExpectFailure(Alice, collectionId, 'NFT');
    await destroyCollectionExpectSuccess(collectionId);
  });
});

describe('Number of tokens per address (ReFungible)', () => {
  let Alice: IKeyringPair;

  before(async () => {
    await usingApi(async () => {
      Alice = privateKey('//Alice');
    });
  });

  it('Collection limits allow greater number than chain limits, chain limits are enforced', async () => {   
    const collectionId = await createCollectionExpectSuccess({mode: {type: 'ReFungible' }});
    await setCollectionLimitsExpectSuccess(Alice, collectionId, { AccountTokenOwnershipLimit: 20 });
    for(let i = 0; i < 10; i++){
      await createItemExpectSuccess(Alice, collectionId, 'ReFungible');
    }
    await createItemExpectFailure(Alice, collectionId, 'ReFungible');
    await destroyCollectionExpectSuccess(collectionId);
  });

  it('Collection limits allow lower number than chain limits, collection limits are enforced', async () => {
    const collectionId = await createCollectionExpectSuccess({mode: {type: 'ReFungible' }});
    await setCollectionLimitsExpectSuccess(Alice, collectionId, { AccountTokenOwnershipLimit: 1 });
    await createItemExpectSuccess(Alice, collectionId, 'ReFungible');
    await createItemExpectFailure(Alice, collectionId, 'ReFungible');
    await destroyCollectionExpectSuccess(collectionId);
  });
});

describe('Sponsor timeout (NFT)', () => {
  let Alice: IKeyringPair;
  let Bob: IKeyringPair;
  let Charlie: IKeyringPair;

  before(async () => {
    await usingApi(async () => {
      Alice = privateKey('//Alice');
      Bob = privateKey('//Bob');
      Charlie = privateKey('//Charlie');
    });
  });

  it('Collection limits have greater timeout value than chain limits, collection limits are enforced', async () => {  
    const collectionId = await createCollectionExpectSuccess({ mode: { type: 'NFT' } });
    await setCollectionLimitsExpectSuccess(Alice, collectionId, { SponsorTimeout: 7 });
    const tokenId = await createItemExpectSuccess(Alice, collectionId, 'NFT');
    await setCollectionSponsorExpectSuccess(collectionId, Alice.address);
    await confirmSponsorshipExpectSuccess(collectionId, '//Alice');
    await transferExpectSuccess(collectionId, tokenId, Alice, Bob);
    const aliceBalanceBefore = (await getFreeBalance(Alice)).toNumber();

    // check setting SponsorTimeout = 5, fail
    await waitNewBlocks(5);
    await transferExpectSuccess(collectionId, tokenId, Bob, Charlie);
    const aliceBalanceAfterUnsponsoredTransaction = (await getFreeBalance(Alice)).toNumber();
    expect(aliceBalanceAfterUnsponsoredTransaction).to.be.equals(aliceBalanceBefore);

    // check setting SponsorTimeout = 7, success
    await waitNewBlocks(2); // 5 + 2
    await transferExpectSuccess(collectionId, tokenId, Charlie, Bob);
    const aliceBalanceAfterSponsoredTransaction = (await getFreeBalance(Alice)).toNumber();
    expect(aliceBalanceAfterSponsoredTransaction).to.be.lessThan(aliceBalanceBefore);
    await destroyCollectionExpectSuccess(collectionId);
  });

  it('Collection limits have lower timeout value than chain limits, chain limits are enforced', async () => {

    const collectionId = await createCollectionExpectSuccess({ mode: { type: 'NFT' } });
    await setCollectionLimitsExpectSuccess(Alice, collectionId, { SponsorTimeout: 1 });
    const tokenId = await createItemExpectSuccess(Alice, collectionId, 'NFT');
    await setCollectionSponsorExpectSuccess(collectionId, Alice.address);
    await confirmSponsorshipExpectSuccess(collectionId, '//Alice');
    await transferExpectSuccess(collectionId, tokenId, Alice, Bob);
    const aliceBalanceBefore = (await getFreeBalance(Alice)).toNumber();

    // check setting SponsorTimeout = 1, fail
    await waitNewBlocks(1);
    await transferExpectSuccess(collectionId, tokenId, Bob, Charlie);
    const aliceBalanceAfterUnsponsoredTransaction = (await getFreeBalance(Alice)).toNumber();
    expect(aliceBalanceAfterUnsponsoredTransaction).to.be.equals(aliceBalanceBefore);

    // check setting SponsorTimeout = 5, success
    await waitNewBlocks(4);
    await transferExpectSuccess(collectionId, tokenId, Charlie, Bob);
    const aliceBalanceAfterSponsoredTransaction = (await getFreeBalance(Alice)).toNumber();
    expect(aliceBalanceAfterSponsoredTransaction).to.be.lessThan(aliceBalanceBefore);
    await destroyCollectionExpectSuccess(collectionId);
  });
});

describe('Sponsor timeout (Fungible)', () => {
  let Alice: IKeyringPair;
  let Bob: IKeyringPair;
  let Charlie: IKeyringPair;

  before(async () => {
    await usingApi(async () => {
      Alice = privateKey('//Alice');
      Bob = privateKey('//Bob');
      Charlie = privateKey('//Charlie');
    });
  });

  it('Collection limits have greater timeout value than chain limits, collection limits are enforced', async () => {  
    const collectionId = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});
    await setCollectionLimitsExpectSuccess(Alice, collectionId, { SponsorTimeout: 7 });
    const tokenId = await createItemExpectSuccess(Alice, collectionId, 'Fungible');
    await setCollectionSponsorExpectSuccess(collectionId, Alice.address);
    await confirmSponsorshipExpectSuccess(collectionId, '//Alice');
    await transferExpectSuccess(collectionId, tokenId, Alice, Bob, 10, 'Fungible');
    await transferExpectSuccess(collectionId, tokenId, Bob, Charlie, 2, 'Fungible');
    const aliceBalanceBefore = (await getFreeBalance(Alice)).toNumber();

    // check setting SponsorTimeout = 5, fail
    await waitNewBlocks(5);
    await transferExpectSuccess(collectionId, tokenId, Bob, Charlie, 2, 'Fungible');
    const aliceBalanceAfterUnsponsoredTransaction = (await getFreeBalance(Alice)).toNumber();
    expect(aliceBalanceAfterUnsponsoredTransaction).to.be.equals(aliceBalanceBefore);

    // check setting SponsorTimeout = 7, success
    await waitNewBlocks(2); // 5 + 2
    await transferExpectSuccess(collectionId, tokenId, Bob, Charlie, 2, 'Fungible');
    const aliceBalanceAfterSponsoredTransaction = (await getFreeBalance(Alice)).toNumber();
    expect(aliceBalanceAfterSponsoredTransaction).to.be.lessThan(aliceBalanceBefore);

    await destroyCollectionExpectSuccess(collectionId);
  });

  it('Collection limits have lower timeout value than chain limits, chain limits are enforced', async () => {

    const collectionId = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});
    await setCollectionLimitsExpectSuccess(Alice, collectionId, { SponsorTimeout: 1 });
    const tokenId = await createItemExpectSuccess(Alice, collectionId, 'Fungible');
    await setCollectionSponsorExpectSuccess(collectionId, Alice.address);
    await confirmSponsorshipExpectSuccess(collectionId, '//Alice');
    await transferExpectSuccess(collectionId, tokenId, Alice, Bob, 10, 'Fungible');
    await transferExpectSuccess(collectionId, tokenId, Bob, Charlie, 2, 'Fungible');
    const aliceBalanceBefore = (await getFreeBalance(Alice)).toNumber();

    // check setting SponsorTimeout = 1, fail
    await waitNewBlocks(1);
    await transferExpectSuccess(collectionId, tokenId, Bob, Charlie, 2, 'Fungible');
    const aliceBalanceAfterUnsponsoredTransaction = (await getFreeBalance(Alice)).toNumber();
    expect(aliceBalanceAfterUnsponsoredTransaction).to.be.equals(aliceBalanceBefore);

    // check setting SponsorTimeout = 5, success
    await waitNewBlocks(4);
    await transferExpectSuccess(collectionId, tokenId, Bob, Charlie, 2, 'Fungible');
    const aliceBalanceAfterSponsoredTransaction = (await getFreeBalance(Alice)).toNumber();
    expect(aliceBalanceAfterSponsoredTransaction).to.be.lessThan(aliceBalanceBefore);

    await destroyCollectionExpectSuccess(collectionId);
  });
});

describe('Sponsor timeout (ReFungible)', () => {
  let Alice: IKeyringPair;
  let Bob: IKeyringPair;
  let Charlie: IKeyringPair;

  before(async () => {
    await usingApi(async () => {
      Alice = privateKey('//Alice');
      Bob = privateKey('//Bob');
      Charlie = privateKey('//Charlie');
    });
  });

  it('Collection limits have greater timeout value than chain limits, collection limits are enforced', async () => {  
    const collectionId = await createCollectionExpectSuccess({mode: {type: 'ReFungible' }});
    await setCollectionLimitsExpectSuccess(Alice, collectionId, { SponsorTimeout: 7 });
    const tokenId = await createItemExpectSuccess(Alice, collectionId, 'ReFungible');
    await setCollectionSponsorExpectSuccess(collectionId, Alice.address);
    await confirmSponsorshipExpectSuccess(collectionId, '//Alice');
    await transferExpectSuccess(collectionId, tokenId, Alice, Bob, 100, 'ReFungible');
    const aliceBalanceBefore = (await getFreeBalance(Alice)).toNumber();

    // check setting SponsorTimeout = 5, fail
    await waitNewBlocks(5);
    await transferExpectSuccess(collectionId, tokenId, Bob, Charlie, 20, 'ReFungible');
    const aliceBalanceAfterUnsponsoredTransaction = (await getFreeBalance(Alice)).toNumber();
    expect(aliceBalanceAfterUnsponsoredTransaction).to.be.equals(aliceBalanceBefore);

    // check setting SponsorTimeout = 7, success
    await waitNewBlocks(2); // 5 + 2
    await transferExpectSuccess(collectionId, tokenId, Bob, Charlie, 20, 'ReFungible');
    const aliceBalanceAfterSponsoredTransaction = (await getFreeBalance(Alice)).toNumber();
    expect(aliceBalanceAfterSponsoredTransaction).to.be.lessThan(aliceBalanceBefore);
    await destroyCollectionExpectSuccess(collectionId);
  });

  it('Collection limits have lower timeout value than chain limits, chain limits are enforced', async () => {

    const collectionId = await createCollectionExpectSuccess({ mode: { type: 'NFT' } });
    await setCollectionLimitsExpectSuccess(Alice, collectionId, { SponsorTimeout: 1 });
    const tokenId = await createItemExpectSuccess(Alice, collectionId, 'NFT');
    await setCollectionSponsorExpectSuccess(collectionId, Alice.address);
    await confirmSponsorshipExpectSuccess(collectionId, '//Alice');
    await transferExpectSuccess(collectionId, tokenId, Alice, Bob);
    const aliceBalanceBefore = (await getFreeBalance(Alice)).toNumber();

    // check setting SponsorTimeout = 1, fail
    await waitNewBlocks(1);
    await transferExpectSuccess(collectionId, tokenId, Bob, Charlie);
    const aliceBalanceAfterUnsponsoredTransaction = (await getFreeBalance(Alice)).toNumber();
    expect(aliceBalanceAfterUnsponsoredTransaction).to.be.equals(aliceBalanceBefore);

    // check setting SponsorTimeout = 5, success
    await waitNewBlocks(4);
    await transferExpectSuccess(collectionId, tokenId, Charlie, Bob);
    const aliceBalanceAfterSponsoredTransaction = (await getFreeBalance(Alice)).toNumber();
    expect(aliceBalanceAfterSponsoredTransaction).to.be.lessThan(aliceBalanceBefore);
    await destroyCollectionExpectSuccess(collectionId);
  });
});

describe('Collection zero limits (NFT)', () => {
  let Alice: IKeyringPair;
  let Bob: IKeyringPair;
  let Charlie: IKeyringPair;

  before(async () => {
    await usingApi(async () => {
      Alice = privateKey('//Alice');
      Bob = privateKey('//Bob');
      Charlie = privateKey('//Charlie');
    });
  });

  it('Limits have 0 in tokens per address field, the chain limits are applied', async () => {  
    const collectionId = await createCollectionExpectSuccess({ mode: { type: 'NFT' } });
    await setCollectionLimitsExpectSuccess(Alice, collectionId, { AccountTokenOwnershipLimit: 0 });
    for(let i = 0; i < 10; i++){
      await createItemExpectSuccess(Alice, collectionId, 'NFT');
    }
    await createItemExpectFailure(Alice, collectionId, 'NFT');
  });

  it('Limits have 0 in sponsor timeout, no limits are applied', async () => {

    const collectionId = await createCollectionExpectSuccess({ mode: { type: 'NFT' } });
    await setCollectionLimitsExpectSuccess(Alice, collectionId, { SponsorTimeout: 0 });
    const tokenId = await createItemExpectSuccess(Alice, collectionId, 'NFT');
    await setCollectionSponsorExpectSuccess(collectionId, Alice.address);
    await confirmSponsorshipExpectSuccess(collectionId, '//Alice');
    await transferExpectSuccess(collectionId, tokenId, Alice, Bob);
    const aliceBalanceBefore = (await getFreeBalance(Alice)).toNumber();

    // check setting SponsorTimeout = 0, success with next block
    await waitNewBlocks(1);
    await transferExpectSuccess(collectionId, tokenId, Bob, Charlie);
    const aliceBalanceAfterSponsoredTransaction1 = (await getFreeBalance(Alice)).toNumber();
    expect(aliceBalanceAfterSponsoredTransaction1).to.be.lessThan(aliceBalanceBefore);
  });
});

describe('Collection zero limits (Fungible)', () => {
  let Alice: IKeyringPair;
  let Bob: IKeyringPair;
  let Charlie: IKeyringPair;

  before(async () => {
    await usingApi(async () => {
      Alice = privateKey('//Alice');
      Bob = privateKey('//Bob');
      Charlie = privateKey('//Charlie');
    });
  });

  it('Limits have 0 in sponsor timeout, no limits are applied', async () => {
    const collectionId = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});
    await setCollectionLimitsExpectSuccess(Alice, collectionId, { SponsorTimeout: 0 });
    const tokenId = await createItemExpectSuccess(Alice, collectionId, 'Fungible');
    await setCollectionSponsorExpectSuccess(collectionId, Alice.address);
    await confirmSponsorshipExpectSuccess(collectionId, '//Alice');
    await transferExpectSuccess(collectionId, tokenId, Alice, Bob, 10, 'Fungible');
    const aliceBalanceBefore = (await getFreeBalance(Alice)).toNumber();
    await transferExpectSuccess(collectionId, tokenId, Bob, Charlie, 2, 'Fungible');

    // check setting SponsorTimeout = 0, success with next block
    await waitNewBlocks(1);
    await transferExpectSuccess(collectionId, tokenId, Bob, Charlie, 2, 'Fungible');
    const aliceBalanceAfterSponsoredTransaction1 = (await getFreeBalance(Alice)).toNumber();
    expect(aliceBalanceAfterSponsoredTransaction1).to.be.lessThan(aliceBalanceBefore);
  });
});

describe('Collection zero limits (ReFungible)', () => {
  let Alice: IKeyringPair;
  let Bob: IKeyringPair;
  let Charlie: IKeyringPair;

  before(async () => {
    await usingApi(async () => {
      Alice = privateKey('//Alice');
      Bob = privateKey('//Bob');
      Charlie = privateKey('//Charlie');
    });
  });

  it('Limits have 0 in tokens per address field, the chain limits are applied', async () => {  
    const collectionId = await createCollectionExpectSuccess({mode: {type: 'ReFungible' }});
    await setCollectionLimitsExpectSuccess(Alice, collectionId, { AccountTokenOwnershipLimit: 0 });
    for(let i = 0; i < 10; i++){
      await createItemExpectSuccess(Alice, collectionId, 'ReFungible');
    }
    await createItemExpectFailure(Alice, collectionId, 'ReFungible');
  });

  it('Limits have 0 in sponsor timeout, no limits are applied', async () => {

    const collectionId = await createCollectionExpectSuccess({ mode: { type: 'ReFungible' } });
    await setCollectionLimitsExpectSuccess(Alice, collectionId, { SponsorTimeout: 0 });
    const tokenId = await createItemExpectSuccess(Alice, collectionId, 'ReFungible');
    await setCollectionSponsorExpectSuccess(collectionId, Alice.address);
    await confirmSponsorshipExpectSuccess(collectionId, '//Alice');
    await transferExpectSuccess(collectionId, tokenId, Alice, Bob, 100, 'ReFungible');
    await transferExpectSuccess(collectionId, tokenId, Bob, Charlie, 20, 'ReFungible');
    const aliceBalanceBefore = (await getFreeBalance(Alice)).toNumber();

    // check setting SponsorTimeout = 0, success with next block
    await waitNewBlocks(1);
    await transferExpectSuccess(collectionId, tokenId, Bob, Charlie, 20, 'ReFungible');
    const aliceBalanceAfterSponsoredTransaction1 = (await getFreeBalance(Alice)).toNumber();
    expect(aliceBalanceAfterSponsoredTransaction1).to.be.lessThan(aliceBalanceBefore);
  });
});
