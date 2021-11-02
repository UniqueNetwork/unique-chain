//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//
import { IKeyringPair } from '@polkadot/types/types';
import { ApiPromise } from '@polkadot/api';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import privateKey from './substrate/privateKey';
import { default as usingApi } from './substrate/substrate-api';
import {
  approveExpectFail,
  approveExpectSuccess,
  createCollectionExpectSuccess,
  createItemExpectSuccess,
  destroyCollectionExpectSuccess,
  setCollectionLimitsExpectSuccess,
  transferExpectSuccess,
  addCollectionAdminExpectSuccess,
  transferFromExpectSuccess,
  transferFromExpectFail,
  getAllowance,
} from './util/helpers';

chai.use(chaiAsPromised);
const expect = chai.expect;

describe.only('Integration Test approve(spender, collection_id, item_id, amount):', () => {
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

  it('Execute the extrinsic and check approvedList', async () => {
    const nftCollectionId = await createCollectionExpectSuccess();
    // nft
    const newNftTokenId = await createItemExpectSuccess(Alice, nftCollectionId, 'NFT');
    await approveExpectSuccess(nftCollectionId, newNftTokenId, Alice, Bob);
    // fungible
    const fungibleCollectionId = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});
    const newFungibleTokenId = await createItemExpectSuccess(Alice, fungibleCollectionId, 'Fungible');
    await approveExpectSuccess(fungibleCollectionId, newFungibleTokenId, Alice, Bob);
    // reFungible
    const reFungibleCollectionId =
      await createCollectionExpectSuccess({mode: {type: 'ReFungible'}});
    const newReFungibleTokenId = await createItemExpectSuccess(Alice, reFungibleCollectionId, 'ReFungible');
    await approveExpectSuccess(reFungibleCollectionId, newReFungibleTokenId, Alice, Bob);
  });

  it('Remove approval by using 0 amount', async () => {
    const nftCollectionId = await createCollectionExpectSuccess();
    // nft
    const newNftTokenId = await createItemExpectSuccess(Alice, nftCollectionId, 'NFT');
    await approveExpectSuccess(nftCollectionId, newNftTokenId, Alice, Bob, 1);
    await approveExpectSuccess(nftCollectionId, newNftTokenId, Alice, Bob, 0);
    // fungible
    const fungibleCollectionId = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});
    const newFungibleTokenId = await createItemExpectSuccess(Alice, fungibleCollectionId, 'Fungible');
    await approveExpectSuccess(fungibleCollectionId, newFungibleTokenId, Alice, Bob, 1);
    await approveExpectSuccess(fungibleCollectionId, newFungibleTokenId, Alice, Bob, 0);
    // reFungible
    const reFungibleCollectionId =
      await createCollectionExpectSuccess({mode: {type: 'ReFungible'}});
    const newReFungibleTokenId = await createItemExpectSuccess(Alice, reFungibleCollectionId, 'ReFungible');
    await approveExpectSuccess(reFungibleCollectionId, newReFungibleTokenId, Alice, Bob, 1);
    await approveExpectSuccess(reFungibleCollectionId, newReFungibleTokenId, Alice, Bob, 0);
  });

  it('can be called by collection owner on non-owned item when OwnerCanTransfer == true', async () => {
    const collectionId = await createCollectionExpectSuccess();
    const itemId = await createItemExpectSuccess(Alice, collectionId, 'NFT', Bob.address);

    await approveExpectSuccess(collectionId, itemId, Alice, Charlie);
  });
});

describe.only('Normal user can approve other users to transfer:', () => {
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

  it('NFT', async () => {
    const collectionId = await createCollectionExpectSuccess();
    const itemId = await createItemExpectSuccess(Alice, collectionId, 'NFT', Bob.address);
    await approveExpectSuccess(collectionId, itemId, Bob, Charlie);
  });

  it('Fungible up to an approved amount', async () => {
    const collectionId = await createCollectionExpectSuccess({ mode:{ type: 'Fungible', decimalPoints: 0 }});
    const itemId = await createItemExpectSuccess(Alice, collectionId, 'Fungible', Bob.address); 
    await approveExpectSuccess(collectionId, itemId, Bob, Charlie);
  });

  it('ReFungible up to an approved amount', async () => {
    const collectionId = await createCollectionExpectSuccess({ mode:{ type: 'ReFungible' } });
    const itemId = await createItemExpectSuccess(Alice, collectionId, 'ReFungible', Bob.address);
    await approveExpectSuccess(collectionId, itemId, Bob, Charlie);
  });
});

describe.only('Approved users can transferFrom up to approved amount:', () => {
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

  it('NFT', async () => {
    const collectionId = await createCollectionExpectSuccess();
    const itemId = await createItemExpectSuccess(Alice, collectionId, 'NFT', Bob.address);
    await approveExpectSuccess(collectionId, itemId, Bob, Charlie);
    await transferFromExpectSuccess(collectionId, itemId, Charlie, Bob, Alice, 1, 'NFT');
  });

  it('Fungible up to an approved amount', async () => {
    const collectionId = await createCollectionExpectSuccess({ mode:{ type: 'Fungible', decimalPoints: 0 }});
    const itemId = await createItemExpectSuccess(Alice, collectionId, 'Fungible', Bob.address); 
    await approveExpectSuccess(collectionId, itemId, Bob, Charlie);
    await transferFromExpectSuccess(collectionId, itemId, Charlie, Bob, Alice, 1, 'Fungible');
  });

  it('ReFungible up to an approved amount', async () => {
    const collectionId = await createCollectionExpectSuccess({ mode:{ type: 'ReFungible' } });
    const itemId = await createItemExpectSuccess(Alice, collectionId, 'ReFungible', Bob.address);
    await approveExpectSuccess(collectionId, itemId, Bob, Charlie);
    await transferFromExpectSuccess(collectionId, itemId, Charlie, Bob, Alice, 1, 'ReFungible');
  });
});

describe.only('Approved users cannot use transferFrom to repeat transfers if approved amount was already transferred:', () => {
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

  it('NFT', async () => {
    const collectionId = await createCollectionExpectSuccess();
    const itemId = await createItemExpectSuccess(Alice, collectionId, 'NFT', Bob.address);
    await approveExpectSuccess(collectionId, itemId, Bob, Charlie);
    await transferFromExpectSuccess(collectionId, itemId, Charlie, Bob, Alice, 1, 'NFT');
    await transferFromExpectFail(collectionId, itemId, Charlie, Bob, Alice, 1);
  });

  it('Fungible up to an approved amount', async () => {
    const collectionId = await createCollectionExpectSuccess({ mode:{ type: 'Fungible', decimalPoints: 0 }});
    const itemId = await createItemExpectSuccess(Alice, collectionId, 'Fungible', Bob.address); 
    await approveExpectSuccess(collectionId, itemId, Bob, Charlie);
    await transferFromExpectSuccess(collectionId, itemId, Charlie, Bob, Alice, 1, 'Fungible');
    await transferFromExpectFail(collectionId, itemId, Charlie, Bob, Alice, 1);
  });

  it('ReFungible up to an approved amount', async () => {
    const collectionId = await createCollectionExpectSuccess({ mode:{ type: 'ReFungible' } });
    const itemId = await createItemExpectSuccess(Alice, collectionId, 'ReFungible', Bob.address);
    await approveExpectSuccess(collectionId, itemId, Bob, Charlie);
    await transferFromExpectSuccess(collectionId, itemId, Charlie, Bob, Alice, 1, 'ReFungible');
    await transferFromExpectFail(collectionId, itemId, Charlie, Bob, Alice, 1);
  });
});

describe.only('Approved amount decreases by the transferred amount.:', () => {
  let Alice: IKeyringPair;
  let Bob: IKeyringPair;
  let Charlie: IKeyringPair;
  let Dave: IKeyringPair;

  before(async () => {
    await usingApi(async () => {
      Alice = privateKey('//Alice');
      Bob = privateKey('//Bob');
      Charlie = privateKey('//Charlie');
      Dave = privateKey('//Dave');
    });
  });  

  it('If a user B is approved to transfer 10 Fungible tokens from user A, they can transfer 2 tokens to user C, which will result in decreasing approval from 10 to 8. Then user B can transfer 8 tokens to user D.', async () => {
    const collectionId = await createCollectionExpectSuccess({ mode:{ type: 'Fungible', decimalPoints: 0 }});
    const itemId = await createItemExpectSuccess(Alice, collectionId, 'Fungible', Alice.address); 
    await approveExpectSuccess(collectionId, itemId, Alice, Bob, 10);
    await transferFromExpectSuccess(collectionId, itemId, Bob, Alice, Charlie, 2, 'Fungible');
    await transferFromExpectSuccess(collectionId, itemId, Bob, Alice, Dave, 8, 'Fungible');
  });
});

describe.only('User may clear the approvals to approving for 0 amount:', () => {
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

  it('NFT', async () => {
    const collectionId = await createCollectionExpectSuccess();
    const itemId = await createItemExpectSuccess(Alice, collectionId, 'NFT');
    await approveExpectSuccess(collectionId, itemId, Alice, Bob, 1);
    await approveExpectSuccess(collectionId, itemId, Alice, Bob, 0);
    await transferFromExpectFail(collectionId, itemId, Bob, Bob, Charlie, 1);
  });

  it('Fungible', async () => {
    const fungibleCollectionId = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});
    const newFungibleTokenId = await createItemExpectSuccess(Alice, fungibleCollectionId, 'Fungible');
    await approveExpectSuccess(fungibleCollectionId, newFungibleTokenId, Alice, Bob, 1);
    await approveExpectSuccess(fungibleCollectionId, newFungibleTokenId, Alice, Bob, 0);
    await transferFromExpectFail(fungibleCollectionId, newFungibleTokenId, Bob, Bob, Charlie, 1);
  });

  it('ReFungible', async () => {
    const reFungibleCollectionId =
      await createCollectionExpectSuccess({mode: {type: 'ReFungible'}});
    const newReFungibleTokenId = await createItemExpectSuccess(Alice, reFungibleCollectionId, 'ReFungible');
    await approveExpectSuccess(reFungibleCollectionId, newReFungibleTokenId, Alice, Bob, 1);
    await approveExpectSuccess(reFungibleCollectionId, newReFungibleTokenId, Alice, Bob, 0);
    await transferFromExpectFail(reFungibleCollectionId, newReFungibleTokenId, Bob, Bob, Charlie, 1);
  });
});

describe.only('User cannot approve for the amount greater than they own:', () => {
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

  it('1 for NFT', async () => {
    const collectionId = await createCollectionExpectSuccess();
    const itemId = await createItemExpectSuccess(Alice, collectionId, 'NFT', Bob.address);
    await approveExpectFail(collectionId, itemId, Bob, Charlie, 2);
  });

  it('Fungible', async () => {
    const fungibleCollectionId = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});
    const newFungibleTokenId = await createItemExpectSuccess(Alice, fungibleCollectionId, 'Fungible');
    await approveExpectFail(fungibleCollectionId, newFungibleTokenId, Bob, Charlie, 11);
  });

  it('ReFungible', async () => {
    const reFungibleCollectionId = await createCollectionExpectSuccess({mode: {type: 'ReFungible'}});
    const newReFungibleTokenId = await createItemExpectSuccess(Alice, reFungibleCollectionId, 'ReFungible');
    await approveExpectFail(reFungibleCollectionId, newReFungibleTokenId, Bob, Charlie, 101);
  });
});

describe.only('Administrator and collection owner do not need approval in order to execute TransferFrom:', () => {
  let Alice: IKeyringPair;
  let Bob: IKeyringPair;
  let Charlie: IKeyringPair;
  let Dave: IKeyringPair;

  before(async () => {
    await usingApi(async () => {
      Alice = privateKey('//Alice');
      Bob = privateKey('//Bob');
      Charlie = privateKey('//Charlie');
      Dave = privateKey('//Dave');
    });
  });  

  it('NFT', async () => {
    const collectionId = await createCollectionExpectSuccess();
    const itemId = await createItemExpectSuccess(Alice, collectionId, 'NFT', Charlie.address);
    await transferFromExpectSuccess(collectionId, itemId, Alice, Charlie, Dave, 1, 'NFT');
    await addCollectionAdminExpectSuccess(Alice, collectionId, Bob);
    await transferFromExpectSuccess(collectionId, itemId, Bob, Dave, Alice, 1, 'NFT');
  });

  it('Fungible up to an approved amount', async () => {
    const collectionId = await createCollectionExpectSuccess({ mode:{ type: 'Fungible', decimalPoints: 0 }});
    const itemId = await createItemExpectSuccess(Alice, collectionId, 'Fungible', Charlie.address); 
    await transferFromExpectSuccess(collectionId, itemId, Alice, Charlie, Dave, 1, 'Fungible');
    await addCollectionAdminExpectSuccess(Alice, collectionId, Bob);
    await transferFromExpectSuccess(collectionId, itemId, Bob, Dave, Alice, 1, 'Fungible');
  });

  it('ReFungible up to an approved amount', async () => {
    const collectionId = await createCollectionExpectSuccess({ mode:{ type: 'ReFungible' } });
    const itemId = await createItemExpectSuccess(Alice, collectionId, 'ReFungible', Charlie.address);
    await transferFromExpectSuccess(collectionId, itemId, Alice, Charlie, Dave, 1, 'ReFungible');
    await addCollectionAdminExpectSuccess(Alice, collectionId, Bob);
    await transferFromExpectSuccess(collectionId, itemId, Bob, Dave, Alice, 1, 'ReFungible');
  });
});

describe.only('Repeated approvals add up', () => {
  let Alice: IKeyringPair;
  let Bob: IKeyringPair;
  let Charlie: IKeyringPair;
  let Dave: IKeyringPair;

  before(async () => {
    await usingApi(async () => {
      Alice = privateKey('//Alice');
      Bob = privateKey('//Bob');
      Charlie = privateKey('//Charlie');
      Dave = privateKey('//Dave');
    });
  });  

  it('Owned 10, approval 1: 1, approval 2: 1, resulting approved value: 2. Fungible', async () => {
    const collectionId = await createCollectionExpectSuccess({ mode:{ type: 'Fungible', decimalPoints: 0 }});
    await createItemExpectSuccess(Alice, collectionId, 'Fungible', Alice.address);
    await approveExpectSuccess(collectionId, 0, Alice, Bob, 1);
    await approveExpectSuccess(collectionId, 0, Alice, Charlie, 1);
    const allowances1 = await getAllowance(collectionId, 0, Alice.address, Bob.address);
    const allowances2 = await getAllowance(collectionId, 0, Alice.address, Charlie.address);
    expect(allowances1 + allowances2).to.be.eq(BigInt(2));
  });

  it('Owned 10, approval 1: 1, approval 2: 1, resulting approved value: 2. ReFungible', async () => {
    const collectionId = await createCollectionExpectSuccess({ mode:{ type: 'ReFungible' } });
    const itemId = await createItemExpectSuccess(Alice, collectionId, 'ReFungible', Alice.address);
    await approveExpectSuccess(collectionId, itemId, Alice, Bob, 1);
    await approveExpectSuccess(collectionId, itemId, Alice, Charlie, 1);
    const allowances1 = await getAllowance(collectionId, itemId, Alice.address, Bob.address);
    const allowances2 = await getAllowance(collectionId, itemId, Alice.address, Charlie.address);
    expect(allowances1 + allowances2).to.be.eq(BigInt(2));
  });

  // Canceled by changing approve logic
  it.skip('Cannot approve for more than total user`s amount (owned: 10, approval 1: 5 - should succeed, approval 2: 6 - should fail). Fungible', async () => {
    const collectionId = await createCollectionExpectSuccess({ mode:{ type: 'Fungible', decimalPoints: 0 }});
    await createItemExpectSuccess(Alice, collectionId, 'Fungible', Dave.address);
    await approveExpectSuccess(collectionId, 0, Dave, Bob, 5);
    await approveExpectFail(collectionId, 0, Dave, Charlie, 6);
  });

  // Canceled by changing approve logic
  it.skip('Cannot approve for more than total users amount (owned: 100, approval 1: 50 - should succeed, approval 2: 51 - should fail). ReFungible', async () => {
    const collectionId = await createCollectionExpectSuccess({ mode:{ type: 'ReFungible' } });
    const itemId = await createItemExpectSuccess(Alice, collectionId, 'ReFungible', Dave.address);
    await approveExpectSuccess(collectionId, itemId, Dave, Bob, 50);
    await approveExpectFail(collectionId, itemId, Dave, Charlie, 51);
  });
});

describe.only('Negative Integration Test approve(spender, collection_id, item_id, amount):', () => {
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

  it('Approve for a collection that does not exist', async () => {
    await usingApi(async (api: ApiPromise) => {
      // nft
      const nftCollectionCount = await api.query.nft.createdCollectionCount() as unknown as number;
      await approveExpectFail(nftCollectionCount + 1, 1, Alice, Bob);
      // fungible
      const fungibleCollectionCount = await api.query.nft.createdCollectionCount() as unknown as number;
      await approveExpectFail(fungibleCollectionCount + 1, 1, Alice, Bob);
      // reFungible
      const reFungibleCollectionCount = await api.query.nft.createdCollectionCount() as unknown as number;
      await approveExpectFail(reFungibleCollectionCount + 1, 1, Alice, Bob);
    });
  });

  it('Approve for a collection that was destroyed', async () => {
    // nft
    const nftCollectionId = await createCollectionExpectSuccess();
    await destroyCollectionExpectSuccess(nftCollectionId);
    await approveExpectFail(nftCollectionId, 1, Alice, Bob);
    // fungible
    const fungibleCollectionId = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});
    await destroyCollectionExpectSuccess(fungibleCollectionId);
    await approveExpectFail(fungibleCollectionId, 1, Alice, Bob);
    // reFungible
    const reFungibleCollectionId =
      await createCollectionExpectSuccess({mode: {type: 'ReFungible'}});
    await destroyCollectionExpectSuccess(reFungibleCollectionId);
    await approveExpectFail(reFungibleCollectionId, 1, Alice, Bob);
  });

  it('Approve transfer of a token that does not exist', async () => {
    // nft
    const nftCollectionId = await createCollectionExpectSuccess();
    await approveExpectFail(nftCollectionId, 2, Alice, Bob);
    // reFungible
    const reFungibleCollectionId =
      await createCollectionExpectSuccess({mode: {type: 'ReFungible'}});
    await approveExpectFail(reFungibleCollectionId, 2, Alice, Bob);
  });

  it('Approve using the address that does not own the approved token', async () => {
    const nftCollectionId = await createCollectionExpectSuccess();
    // nft
    const newNftTokenId = await createItemExpectSuccess(Alice, nftCollectionId, 'NFT');
    await approveExpectFail(nftCollectionId, newNftTokenId, Bob, Alice);
    // fungible
    const fungibleCollectionId = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});
    const newFungibleTokenId = await createItemExpectSuccess(Alice, fungibleCollectionId, 'Fungible');
    await approveExpectFail(fungibleCollectionId, newFungibleTokenId, Bob, Alice);
    // reFungible
    const reFungibleCollectionId =
      await createCollectionExpectSuccess({mode: {type: 'ReFungible'}});
    const newReFungibleTokenId = await createItemExpectSuccess(Alice, reFungibleCollectionId, 'ReFungible');
    await approveExpectFail(reFungibleCollectionId, newReFungibleTokenId, Bob, Alice);
  });

  it('should fail if approved more NFTs than owned', async () => {
    const nftCollectionId = await createCollectionExpectSuccess({ mode: { type: 'NFT' } });
    const newNftTokenId = await createItemExpectSuccess(Alice, nftCollectionId, 'NFT');
    await transferExpectSuccess(nftCollectionId, newNftTokenId, Alice, Bob, 1, 'NFT');
    await approveExpectSuccess(nftCollectionId, newNftTokenId, Bob, Alice);
    await approveExpectFail(nftCollectionId, newNftTokenId, Bob, Alice, 2);
  });

  it('should fail if approved more ReFungibles than owned', async () => {
    const nftCollectionId = await createCollectionExpectSuccess({ mode: { type: 'ReFungible' } });
    const newNftTokenId = await createItemExpectSuccess(Alice, nftCollectionId, 'ReFungible');
    await transferExpectSuccess(nftCollectionId, newNftTokenId, Alice, Bob, 100, 'ReFungible');
    await approveExpectSuccess(nftCollectionId, newNftTokenId, Bob, Alice, 100);
    await approveExpectFail(nftCollectionId, newNftTokenId, Bob, Alice, 101);
  });

  it('should fail if approved more Fungibles than owned', async () => {
    const nftCollectionId = await createCollectionExpectSuccess({ mode: { type: 'Fungible', decimalPoints: 0 } });
    const newNftTokenId = await createItemExpectSuccess(Alice, nftCollectionId, 'Fungible');
    await transferExpectSuccess(nftCollectionId, newNftTokenId, Alice, Bob, 10, 'Fungible');
    await approveExpectSuccess(nftCollectionId, newNftTokenId, Bob, Alice, 10);
    await approveExpectFail(nftCollectionId, newNftTokenId, Bob, Alice, 101);
  });

  it('fails when called by collection owner on non-owned item when OwnerCanTransfer == false', async () => {
    const collectionId = await createCollectionExpectSuccess();
    const itemId = await createItemExpectSuccess(Alice, collectionId, 'NFT', Bob.address);
    await setCollectionLimitsExpectSuccess(Alice, collectionId, { ownerCanTransfer: false });
    await approveExpectFail(collectionId, itemId, Alice, Charlie);
  });
});

describe.only('Integration Test approve(spender, collection_id, item_id, amount) with collection admin permissions:', () => {
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

  it('can be called by collection admin on non-owned item', async () => {
    const collectionId = await createCollectionExpectSuccess();
    const itemId = await createItemExpectSuccess(Alice, collectionId, 'NFT', Alice.address);

    await addCollectionAdminExpectSuccess(Alice, collectionId, Bob);
    await approveExpectSuccess(collectionId, itemId, Bob, Charlie);
  });
});
