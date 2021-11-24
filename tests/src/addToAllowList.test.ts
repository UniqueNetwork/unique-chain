//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

import {IKeyringPair} from '@polkadot/types/types';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import privateKey from './substrate/privateKey';
import usingApi, {submitTransactionExpectFailAsync} from './substrate/substrate-api';
import {
  addToAllowListExpectSuccess,
  createCollectionExpectSuccess,
  createItemExpectSuccess,
  destroyCollectionExpectSuccess,
  enablePublicMintingExpectSuccess,
  enableAllowListExpectSuccess,
  normalizeAccountId,
  addCollectionAdminExpectSuccess,
  addToAllowListExpectFail,
  getCreatedCollectionCount,
} from './util/helpers';

chai.use(chaiAsPromised);
const expect = chai.expect;

let alice: IKeyringPair;
let bob: IKeyringPair;
let charlie: IKeyringPair;

describe('Integration Test ext. addToAllowList()', () => {

  before(async () => {
    await usingApi(async () => {
      alice = privateKey('//Alice');
      bob = privateKey('//Bob');
    });
  });

  it('Execute the extrinsic with parameters: Collection ID and address to add to the allow list', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await addToAllowListExpectSuccess(alice, collectionId, bob.address);
  });

  it('Allowlisted minting: list restrictions', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await addToAllowListExpectSuccess(alice, collectionId, bob.address);
    await enableAllowListExpectSuccess(alice, collectionId);
    await enablePublicMintingExpectSuccess(alice, collectionId);
    await createItemExpectSuccess(bob, collectionId, 'NFT', bob.address);
  });
});

describe('Negative Integration Test ext. addToAllowList()', () => {

  it('Allow list an address in the collection that does not exist', async () => {
    await usingApi(async (api) => {
      // tslint:disable-next-line: no-bitwise
      const collectionId = await getCreatedCollectionCount(api) + 1;
      const bob = privateKey('//Bob');

      const tx = api.tx.nft.addToAllowList(collectionId, normalizeAccountId(bob.address));
      await expect(submitTransactionExpectFailAsync(alice, tx)).to.be.rejected;
    });
  });

  it('Allow list an address in the collection that was destroyed', async () => {
    await usingApi(async (api) => {
      const alice = privateKey('//Alice');
      const bob = privateKey('//Bob');
      // tslint:disable-next-line: no-bitwise
      const collectionId = await createCollectionExpectSuccess();
      await destroyCollectionExpectSuccess(collectionId);
      const tx = api.tx.nft.addToAllowList(collectionId, normalizeAccountId(bob.address));
      await expect(submitTransactionExpectFailAsync(alice, tx)).to.be.rejected;
    });
  });

  it('Allow list an address in the collection that does not have allow list access enabled', async () => {
    await usingApi(async (api) => {
      const alice = privateKey('//Alice');
      const ferdie = privateKey('//Ferdie');
      const collectionId = await createCollectionExpectSuccess();
      await enableAllowListExpectSuccess(alice, collectionId);
      await enablePublicMintingExpectSuccess(alice, collectionId);
      const tx = api.tx.nft.createItem(collectionId, normalizeAccountId(ferdie.address), 'NFT');
      await expect(submitTransactionExpectFailAsync(ferdie, tx)).to.be.rejected;
    });
  });

});

describe('Integration Test ext. addToAllowList() with collection admin permissions:', () => {

  before(async () => {
    await usingApi(async () => {
      alice = privateKey('//Alice');
      bob = privateKey('//Bob');
      charlie = privateKey('//Charlie');
    });
  });

  it('Negative. Add to the allow list by regular user', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await addToAllowListExpectFail(bob, collectionId, charlie.address);
  });

  it('Execute the extrinsic with parameters: Collection ID and address to add to the allow list', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await addCollectionAdminExpectSuccess(alice, collectionId, bob.address);
    await addToAllowListExpectSuccess(bob, collectionId, charlie.address);
  });

  it('Allowlisted minting: list restrictions', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await addCollectionAdminExpectSuccess(alice, collectionId, bob.address);
    await addToAllowListExpectSuccess(bob, collectionId, charlie.address);

    // allowed only for collection owner
    await enableAllowListExpectSuccess(alice, collectionId);
    await enablePublicMintingExpectSuccess(alice, collectionId);

    await createItemExpectSuccess(charlie, collectionId, 'NFT', charlie.address);
  });
});
