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
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {default as usingApi} from './substrate/substrate-api';
import {
  approveExpectFail,
  approveExpectSuccess,
  createCollectionExpectSuccess,
  createItemExpectSuccess,
  destroyCollectionExpectSuccess,
  setCollectionLimitsExpectSuccess,
  transferExpectSuccess,
  addCollectionAdminExpectSuccess,
  adminApproveFromExpectSuccess,
  getCreatedCollectionCount,
  transferFromExpectSuccess,
  transferFromExpectFail,
} from './util/helpers';

chai.use(chaiAsPromised);

describe('Integration Test approve(spender, collection_id, item_id, amount):', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;
  let charlie: IKeyringPair;

  before(async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      alice =  privateKeyWrapper!('//Alice');
      bob =  privateKeyWrapper!('//Bob');
      charlie =  privateKeyWrapper!('//Charlie');
    });
  });

  it('Execute the extrinsic and check approvedList', async () => {
    const nftCollectionId = await createCollectionExpectSuccess();
    // nft
    const newNftTokenId = await createItemExpectSuccess(alice, nftCollectionId, 'NFT');
    await approveExpectSuccess(nftCollectionId, newNftTokenId, alice, bob.address);
    // fungible
    const fungibleCollectionId = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});
    const newFungibleTokenId = await createItemExpectSuccess(alice, fungibleCollectionId, 'Fungible');
    await approveExpectSuccess(fungibleCollectionId, newFungibleTokenId, alice, bob.address);
    // reFungible
    const reFungibleCollectionId =
      await createCollectionExpectSuccess({mode: {type: 'ReFungible'}});
    const newReFungibleTokenId = await createItemExpectSuccess(alice, reFungibleCollectionId, 'ReFungible');
    await approveExpectSuccess(reFungibleCollectionId, newReFungibleTokenId, alice, bob.address);
  });

  it('Remove approval by using 0 amount', async () => {
    const nftCollectionId = await createCollectionExpectSuccess();
    // nft
    const newNftTokenId = await createItemExpectSuccess(alice, nftCollectionId, 'NFT');
    await approveExpectSuccess(nftCollectionId, newNftTokenId, alice, bob.address, 1);
    await approveExpectSuccess(nftCollectionId, newNftTokenId, alice, bob.address, 0);
    // fungible
    const fungibleCollectionId = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});
    const newFungibleTokenId = await createItemExpectSuccess(alice, fungibleCollectionId, 'Fungible');
    await approveExpectSuccess(fungibleCollectionId, newFungibleTokenId, alice, bob.address, 1);
    await approveExpectSuccess(fungibleCollectionId, newFungibleTokenId, alice, bob.address, 0);
    // reFungible
    const reFungibleCollectionId =
      await createCollectionExpectSuccess({mode: {type: 'ReFungible'}});
    const newReFungibleTokenId = await createItemExpectSuccess(alice, reFungibleCollectionId, 'ReFungible');
    await approveExpectSuccess(reFungibleCollectionId, newReFungibleTokenId, alice, bob.address, 1);
    await approveExpectSuccess(reFungibleCollectionId, newReFungibleTokenId, alice, bob.address, 0);
  });

  it('can be called by collection owner on non-owned item when OwnerCanTransfer == true', async () => {
    const collectionId = await createCollectionExpectSuccess();
    const itemId = await createItemExpectSuccess(alice, collectionId, 'NFT', bob.address);

    await adminApproveFromExpectSuccess(collectionId, itemId, alice, bob.address, charlie.address);
  });
});

describe('Normal user can approve other users to transfer:', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;
  let charlie: IKeyringPair;

  before(async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      alice =  privateKeyWrapper!('//Alice');
      bob =  privateKeyWrapper!('//Bob');
      charlie =  privateKeyWrapper!('//Charlie');
    });
  });  

  it('NFT', async () => {
    const collectionId = await createCollectionExpectSuccess();
    const itemId = await createItemExpectSuccess(alice, collectionId, 'NFT', bob.address);
    await approveExpectSuccess(collectionId, itemId, bob, charlie.address);
  });

  it('Fungible up to an approved amount', async () => {
    const collectionId = await createCollectionExpectSuccess({mode:{type: 'Fungible', decimalPoints: 0}});
    const itemId = await createItemExpectSuccess(alice, collectionId, 'Fungible', bob.address); 
    await approveExpectSuccess(collectionId, itemId, bob, charlie.address);
  });

  it('ReFungible up to an approved amount', async () => {
    const collectionId = await createCollectionExpectSuccess({mode:{type: 'ReFungible'}});
    const itemId = await createItemExpectSuccess(alice, collectionId, 'ReFungible', bob.address);
    await approveExpectSuccess(collectionId, itemId, bob, charlie.address);
  });
});

describe('Approved users can transferFrom up to approved amount:', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;
  let charlie: IKeyringPair;

  before(async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      alice =  privateKeyWrapper!('//Alice');
      bob =  privateKeyWrapper!('//Bob');
      charlie =  privateKeyWrapper!('//Charlie');
    });
  });  

  it('NFT', async () => {
    const collectionId = await createCollectionExpectSuccess();
    const itemId = await createItemExpectSuccess(alice, collectionId, 'NFT', bob.address);
    await approveExpectSuccess(collectionId, itemId, bob, charlie.address);
    await transferFromExpectSuccess(collectionId, itemId, charlie, bob, alice, 1, 'NFT');
  });

  it('Fungible up to an approved amount', async () => {
    const collectionId = await createCollectionExpectSuccess({mode:{type: 'Fungible', decimalPoints: 0}});
    const itemId = await createItemExpectSuccess(alice, collectionId, 'Fungible', bob.address); 
    await approveExpectSuccess(collectionId, itemId, bob, charlie.address);
    await transferFromExpectSuccess(collectionId, itemId, charlie, bob, alice, 1, 'Fungible');
  });

  it('ReFungible up to an approved amount', async () => {
    const collectionId = await createCollectionExpectSuccess({mode:{type: 'ReFungible'}});
    const itemId = await createItemExpectSuccess(alice, collectionId, 'ReFungible', bob.address);
    await approveExpectSuccess(collectionId, itemId, bob, charlie.address);
    await transferFromExpectSuccess(collectionId, itemId, charlie, bob, alice, 1, 'ReFungible');
  });
});

describe('Approved users cannot use transferFrom to repeat transfers if approved amount was already transferred:', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;
  let charlie: IKeyringPair;

  before(async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      alice =  privateKeyWrapper!('//Alice');
      bob =  privateKeyWrapper!('//Bob');
      charlie =  privateKeyWrapper!('//Charlie');
    });
  });  

  it('NFT', async () => {
    const collectionId = await createCollectionExpectSuccess();
    const itemId = await createItemExpectSuccess(alice, collectionId, 'NFT', bob.address);
    await approveExpectSuccess(collectionId, itemId, bob, charlie.address);
    await transferFromExpectSuccess(collectionId, itemId, charlie, bob, alice, 1, 'NFT');
    await transferFromExpectFail(collectionId, itemId, charlie, bob, alice, 1);
  });

  it('Fungible up to an approved amount', async () => {
    const collectionId = await createCollectionExpectSuccess({mode:{type: 'Fungible', decimalPoints: 0}});
    const itemId = await createItemExpectSuccess(alice, collectionId, 'Fungible', bob.address); 
    await approveExpectSuccess(collectionId, itemId, bob, charlie.address);
    await transferFromExpectSuccess(collectionId, itemId, charlie, bob, alice, 1, 'Fungible');
    await transferFromExpectFail(collectionId, itemId, charlie, bob, alice, 1);
  });

  it('ReFungible up to an approved amount', async () => {
    const collectionId = await createCollectionExpectSuccess({mode:{type: 'ReFungible'}});
    const itemId = await createItemExpectSuccess(alice, collectionId, 'ReFungible', bob.address);
    await approveExpectSuccess(collectionId, itemId, bob, charlie.address);
    await transferFromExpectSuccess(collectionId, itemId, charlie, bob, alice, 1, 'ReFungible');
    await transferFromExpectFail(collectionId, itemId, charlie, bob, alice, 1);
  });
});

describe('Approved amount decreases by the transferred amount.:', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;
  let charlie: IKeyringPair;
  let dave: IKeyringPair;

  before(async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      alice =  privateKeyWrapper!('//Alice');
      bob =  privateKeyWrapper!('//Bob');
      charlie =  privateKeyWrapper!('//Charlie');
      dave =  privateKeyWrapper!('//Dave');
    });
  });  

  it('If a user B is approved to transfer 10 Fungible tokens from user A, they can transfer 2 tokens to user C, which will result in decreasing approval from 10 to 8. Then user B can transfer 8 tokens to user D.', async () => {
    const collectionId = await createCollectionExpectSuccess({mode:{type: 'Fungible', decimalPoints: 0}});
    const itemId = await createItemExpectSuccess(alice, collectionId, 'Fungible', alice.address); 
    await approveExpectSuccess(collectionId, itemId, alice, bob.address, 10);
    await transferFromExpectSuccess(collectionId, itemId, bob, alice, charlie, 2, 'Fungible');
    await transferFromExpectSuccess(collectionId, itemId, bob, alice, dave, 8, 'Fungible');
  });
});

describe('User may clear the approvals to approving for 0 amount:', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;
  let charlie: IKeyringPair;

  before(async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      alice =  privateKeyWrapper!('//Alice');
      bob =  privateKeyWrapper!('//Bob');
      charlie =  privateKeyWrapper!('//Charlie');
    });
  });

  it('NFT', async () => {
    const collectionId = await createCollectionExpectSuccess();
    const itemId = await createItemExpectSuccess(alice, collectionId, 'NFT');
    await approveExpectSuccess(collectionId, itemId, alice, bob.address, 1);
    await approveExpectSuccess(collectionId, itemId, alice, bob.address, 0);
    await transferFromExpectFail(collectionId, itemId, bob, bob, charlie, 1);
  });

  it('Fungible', async () => {
    const fungibleCollectionId = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});
    const newFungibleTokenId = await createItemExpectSuccess(alice, fungibleCollectionId, 'Fungible');
    await approveExpectSuccess(fungibleCollectionId, newFungibleTokenId, alice, bob.address, 1);
    await approveExpectSuccess(fungibleCollectionId, newFungibleTokenId, alice, bob.address, 0);
    await transferFromExpectFail(fungibleCollectionId, newFungibleTokenId, bob, bob, charlie, 1);
  });

  it('ReFungible', async () => {
    const reFungibleCollectionId =
      await createCollectionExpectSuccess({mode: {type: 'ReFungible'}});
    const newReFungibleTokenId = await createItemExpectSuccess(alice, reFungibleCollectionId, 'ReFungible');
    await approveExpectSuccess(reFungibleCollectionId, newReFungibleTokenId, alice, bob.address, 1);
    await approveExpectSuccess(reFungibleCollectionId, newReFungibleTokenId, alice, bob.address, 0);
    await transferFromExpectFail(reFungibleCollectionId, newReFungibleTokenId, bob, bob, charlie, 1);
  });
});

describe('User cannot approve for the amount greater than they own:', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;
  let charlie: IKeyringPair;

  before(async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      alice =  privateKeyWrapper!('//Alice');
      bob =  privateKeyWrapper!('//Bob');
      charlie =  privateKeyWrapper!('//Charlie');
    });
  });

  it('1 for NFT', async () => {
    const collectionId = await createCollectionExpectSuccess();
    const itemId = await createItemExpectSuccess(alice, collectionId, 'NFT', bob.address);
    await approveExpectFail(collectionId, itemId, bob, charlie, 2);
  });

  it('Fungible', async () => {
    const fungibleCollectionId = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});
    const newFungibleTokenId = await createItemExpectSuccess(alice, fungibleCollectionId, 'Fungible');
    await approveExpectFail(fungibleCollectionId, newFungibleTokenId, bob, charlie, 11);
  });

  it('ReFungible', async () => {
    const reFungibleCollectionId = await createCollectionExpectSuccess({mode: {type: 'ReFungible'}});
    const newReFungibleTokenId = await createItemExpectSuccess(alice, reFungibleCollectionId, 'ReFungible');
    await approveExpectFail(reFungibleCollectionId, newReFungibleTokenId, bob, charlie, 101);
  });
});

describe('Administrator and collection owner do not need approval in order to execute TransferFrom:', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;
  let charlie: IKeyringPair;
  let dave: IKeyringPair;

  before(async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      alice =  privateKeyWrapper!('//Alice');
      bob =  privateKeyWrapper!('//Bob');
      charlie =  privateKeyWrapper!('//Charlie');
      dave =  privateKeyWrapper!('//Dave');
    });
  });  

  it('NFT', async () => {
    const collectionId = await createCollectionExpectSuccess();
    const itemId = await createItemExpectSuccess(alice, collectionId, 'NFT', charlie.address);
    await transferFromExpectSuccess(collectionId, itemId, alice, charlie, dave, 1, 'NFT');
    await addCollectionAdminExpectSuccess(alice, collectionId, bob.address);
    await transferFromExpectSuccess(collectionId, itemId, bob, dave, alice, 1, 'NFT');
  });

  it('Fungible up to an approved amount', async () => {
    const collectionId = await createCollectionExpectSuccess({mode:{type: 'Fungible', decimalPoints: 0}});
    const itemId = await createItemExpectSuccess(alice, collectionId, 'Fungible', charlie.address); 
    await transferFromExpectSuccess(collectionId, itemId, alice, charlie, dave, 1, 'Fungible');
    await addCollectionAdminExpectSuccess(alice, collectionId, bob.address);
    await transferFromExpectSuccess(collectionId, itemId, bob, dave, alice, 1, 'Fungible');
  });

  it('ReFungible up to an approved amount', async () => {
    const collectionId = await createCollectionExpectSuccess({mode:{type: 'ReFungible'}});
    const itemId = await createItemExpectSuccess(alice, collectionId, 'ReFungible', charlie.address);
    await transferFromExpectSuccess(collectionId, itemId, alice, charlie, dave, 1, 'ReFungible');
    await addCollectionAdminExpectSuccess(alice, collectionId, bob.address);
    await transferFromExpectSuccess(collectionId, itemId, bob, dave, alice, 1, 'ReFungible');
  });
});

describe('Repeated approvals add up', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;
  let charlie: IKeyringPair;
  let dave: IKeyringPair;

  before(async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      alice =  privateKeyWrapper!('//Alice');
      bob =  privateKeyWrapper!('//Bob');
      charlie =  privateKeyWrapper!('//Charlie');
      dave =  privateKeyWrapper!('//Dave');
    });
  });  

  it.skip('Owned 10, approval 1: 1, approval 2: 1, resulting approved value: 2. Fungible', async () => {
    const collectionId = await createCollectionExpectSuccess({mode:{type: 'Fungible', decimalPoints: 0}});
    await createItemExpectSuccess(alice, collectionId, 'Fungible', alice.address);
    await approveExpectSuccess(collectionId, 0, alice, bob.address, 1);
    await approveExpectSuccess(collectionId, 0, alice, charlie.address, 1);
    // const allowances1 = await getAllowance(collectionId, 0, Alice.address, Bob.address);
    // const allowances2 = await getAllowance(collectionId, 0, Alice.address, Charlie.address);
    // expect(allowances1 + allowances2).to.be.eq(BigInt(2));
  });

  it.skip('Owned 10, approval 1: 1, approval 2: 1, resulting approved value: 2. ReFungible', async () => {
    const collectionId = await createCollectionExpectSuccess({mode:{type: 'ReFungible'}});
    const itemId = await createItemExpectSuccess(alice, collectionId, 'ReFungible', alice.address);
    await approveExpectSuccess(collectionId, itemId, alice, bob.address, 1);
    await approveExpectSuccess(collectionId, itemId, alice, charlie.address, 1);
    // const allowances1 = await getAllowance(collectionId, itemId, Alice.address, Bob.address);
    // const allowances2 = await getAllowance(collectionId, itemId, Alice.address, Charlie.address);
    // expect(allowances1 + allowances2).to.be.eq(BigInt(2));
  });

  // Canceled by changing approve logic
  it.skip('Cannot approve for more than total user`s amount (owned: 10, approval 1: 5 - should succeed, approval 2: 6 - should fail). Fungible', async () => {
    const collectionId = await createCollectionExpectSuccess({mode:{type: 'Fungible', decimalPoints: 0}});
    await createItemExpectSuccess(alice, collectionId, 'Fungible', dave.address);
    await approveExpectSuccess(collectionId, 0, dave, bob.address, 5);
    await approveExpectFail(collectionId, 0, dave, charlie, 6);
  });

  // Canceled by changing approve logic
  it.skip('Cannot approve for more than total users amount (owned: 100, approval 1: 50 - should succeed, approval 2: 51 - should fail). ReFungible', async () => {
    const collectionId = await createCollectionExpectSuccess({mode:{type: 'ReFungible'}});
    const itemId = await createItemExpectSuccess(alice, collectionId, 'ReFungible', dave.address);
    await approveExpectSuccess(collectionId, itemId, dave, bob.address, 50);
    await approveExpectFail(collectionId, itemId, dave, charlie, 51);
  });
});

describe('Integration Test approve(spender, collection_id, item_id, amount) with collection admin permissions:', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;
  let charlie: IKeyringPair;

  before(async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      alice =  privateKeyWrapper!('//Alice');
      bob =  privateKeyWrapper!('//Bob');
      charlie =  privateKeyWrapper!('//Charlie');
    });
  });

  it('can be called by collection admin on non-owned item', async () => {
    const collectionId = await createCollectionExpectSuccess();
    const itemId = await createItemExpectSuccess(alice, collectionId, 'NFT', alice.address);

    await addCollectionAdminExpectSuccess(alice, collectionId, bob.address);
    await adminApproveFromExpectSuccess(collectionId, itemId, bob, alice.address, charlie.address);
  });
});

describe('Negative Integration Test approve(spender, collection_id, item_id, amount):', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;
  let charlie: IKeyringPair;

  before(async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      alice =  privateKeyWrapper!('//Alice');
      bob =  privateKeyWrapper!('//Bob');
      charlie =  privateKeyWrapper!('//Charlie');
    });
  });

  it('Approve for a collection that does not exist', async () => {
    await usingApi(async (api: ApiPromise) => {
      // nft
      const nftCollectionCount = await getCreatedCollectionCount(api);
      await approveExpectFail(nftCollectionCount + 1, 1, alice, bob);
      // fungible
      const fungibleCollectionCount = await getCreatedCollectionCount(api);
      await approveExpectFail(fungibleCollectionCount + 1, 0, alice, bob);
      // reFungible
      const reFungibleCollectionCount = await getCreatedCollectionCount(api);
      await approveExpectFail(reFungibleCollectionCount + 1, 1, alice, bob);
    });
  });

  it('Approve for a collection that was destroyed', async () => {
    // nft
    const nftCollectionId = await createCollectionExpectSuccess();
    await destroyCollectionExpectSuccess(nftCollectionId);
    await approveExpectFail(nftCollectionId, 1, alice, bob);
    // fungible
    const fungibleCollectionId = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});
    await destroyCollectionExpectSuccess(fungibleCollectionId);
    await approveExpectFail(fungibleCollectionId, 0, alice, bob);
    // reFungible
    const reFungibleCollectionId =
      await createCollectionExpectSuccess({mode: {type: 'ReFungible'}});
    await destroyCollectionExpectSuccess(reFungibleCollectionId);
    await approveExpectFail(reFungibleCollectionId, 1, alice, bob);
  });

  it('Approve transfer of a token that does not exist', async () => {
    // nft
    const nftCollectionId = await createCollectionExpectSuccess();
    await approveExpectFail(nftCollectionId, 2, alice, bob);
    // reFungible
    const reFungibleCollectionId =
      await createCollectionExpectSuccess({mode: {type: 'ReFungible'}});
    await approveExpectFail(reFungibleCollectionId, 2, alice, bob);
  });

  it('Approve using the address that does not own the approved token', async () => {
    const nftCollectionId = await createCollectionExpectSuccess();
    // nft
    const newNftTokenId = await createItemExpectSuccess(alice, nftCollectionId, 'NFT');
    await approveExpectFail(nftCollectionId, newNftTokenId, bob, alice);
    // fungible
    const fungibleCollectionId = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});
    const newFungibleTokenId = await createItemExpectSuccess(alice, fungibleCollectionId, 'Fungible');
    await approveExpectFail(fungibleCollectionId, newFungibleTokenId, bob, alice);
    // reFungible
    const reFungibleCollectionId =
      await createCollectionExpectSuccess({mode: {type: 'ReFungible'}});
    const newReFungibleTokenId = await createItemExpectSuccess(alice, reFungibleCollectionId, 'ReFungible');
    await approveExpectFail(reFungibleCollectionId, newReFungibleTokenId, bob, alice);
  });

  it('should fail if approved more ReFungibles than owned', async () => {
    const nftCollectionId = await createCollectionExpectSuccess({mode: {type: 'ReFungible'}});
    const newNftTokenId = await createItemExpectSuccess(alice, nftCollectionId, 'ReFungible');
    await transferExpectSuccess(nftCollectionId, newNftTokenId, alice, bob, 100, 'ReFungible');
    await approveExpectSuccess(nftCollectionId, newNftTokenId, bob, alice.address, 100);
    await approveExpectFail(nftCollectionId, newNftTokenId, bob, alice, 101);
  });

  it('should fail if approved more Fungibles than owned', async () => {
    const nftCollectionId = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});
    const newNftTokenId = await createItemExpectSuccess(alice, nftCollectionId, 'Fungible');
    await transferExpectSuccess(nftCollectionId, newNftTokenId, alice, bob, 10, 'Fungible');
    await approveExpectSuccess(nftCollectionId, newNftTokenId, bob, alice.address, 10);
    await approveExpectFail(nftCollectionId, newNftTokenId, bob, alice, 11);
  });

  it('fails when called by collection owner on non-owned item when OwnerCanTransfer == false', async () => {
    const collectionId = await createCollectionExpectSuccess();
    const itemId = await createItemExpectSuccess(alice, collectionId, 'NFT', bob.address);
    await setCollectionLimitsExpectSuccess(alice, collectionId, {ownerCanTransfer: false});

    await approveExpectFail(collectionId, itemId, alice, charlie);
  });
});
