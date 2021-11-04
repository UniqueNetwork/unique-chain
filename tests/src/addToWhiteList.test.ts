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
  addToWhiteListExpectSuccess,
  createCollectionExpectSuccess,
  createItemExpectSuccess,
  destroyCollectionExpectSuccess,
  enablePublicMintingExpectSuccess,
  enableWhiteListExpectSuccess,
  normalizeAccountId,
  addCollectionAdminExpectSuccess,
  addToWhiteListExpectFail,
} from './util/helpers';

chai.use(chaiAsPromised);
const expect = chai.expect;

let alice: IKeyringPair;
let bob: IKeyringPair;
let charlie: IKeyringPair;

describe('Integration Test ext. addToWhiteList()', () => {

  before(async () => {
    await usingApi(async () => {
      alice = privateKey('//Alice');
      bob = privateKey('//Bob');
    });
  });

  it('Execute the extrinsic with parameters: Collection ID and address to add to the white list', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await addToWhiteListExpectSuccess(alice, collectionId, bob.address);
  });

  it('Whitelisted minting: list restrictions', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await addToWhiteListExpectSuccess(alice, collectionId, bob.address);
    await enableWhiteListExpectSuccess(alice, collectionId);
    await enablePublicMintingExpectSuccess(alice, collectionId);
    await createItemExpectSuccess(bob, collectionId, 'NFT', bob.address);
  });
});

describe('Negative Integration Test ext. addToWhiteList()', () => {

  it('White list an address in the collection that does not exist', async () => {
    await usingApi(async (api) => {
      // tslint:disable-next-line: no-bitwise
      const collectionId = ((await api.query.common.createdCollectionCount()).toNumber()) + 1;
      const bob = privateKey('//Bob');

      const tx = api.tx.nft.addToWhiteList(collectionId, normalizeAccountId(bob.address));
      await expect(submitTransactionExpectFailAsync(alice, tx)).to.be.rejected;
    });
  });

  it('White list an address in the collection that was destroyed', async () => {
    await usingApi(async (api) => {
      const alice = privateKey('//Alice');
      const bob = privateKey('//Bob');
      // tslint:disable-next-line: no-bitwise
      const collectionId = await createCollectionExpectSuccess();
      await destroyCollectionExpectSuccess(collectionId);
      const tx = api.tx.nft.addToWhiteList(collectionId, normalizeAccountId(bob.address));
      await expect(submitTransactionExpectFailAsync(alice, tx)).to.be.rejected;
    });
  });

  it('White list an address in the collection that does not have white list access enabled', async () => {
    await usingApi(async (api) => {
      const alice = privateKey('//Alice');
      const ferdie = privateKey('//Ferdie');
      const collectionId = await createCollectionExpectSuccess();
      await enableWhiteListExpectSuccess(alice, collectionId);
      await enablePublicMintingExpectSuccess(alice, collectionId);
      const tx = api.tx.nft.createItem(collectionId, normalizeAccountId(ferdie.address), 'NFT');
      await expect(submitTransactionExpectFailAsync(ferdie, tx)).to.be.rejected;
    });
  });

});

describe('Integration Test ext. addToWhiteList() with collection admin permissions:', () => {

  before(async () => {
    await usingApi(async () => {
      alice = privateKey('//Alice');
      bob = privateKey('//Bob');
      charlie = privateKey('//Charlie');
    });
  });

  it('Negative. Add to the white list by regular user', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await addToWhiteListExpectFail(bob, collectionId, charlie.address);
  });

  it('Execute the extrinsic with parameters: Collection ID and address to add to the white list', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await addCollectionAdminExpectSuccess(alice, collectionId, bob.address);
    await addToWhiteListExpectSuccess(bob, collectionId, charlie.address);
  });

  it('Whitelisted minting: list restrictions', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await addCollectionAdminExpectSuccess(alice, collectionId, bob.address);
    await addToWhiteListExpectSuccess(bob, collectionId, charlie.address);

    // allowed only for collection owner
    await enableWhiteListExpectSuccess(alice, collectionId);
    await enablePublicMintingExpectSuccess(alice, collectionId);

    await createItemExpectSuccess(charlie, collectionId, 'NFT', charlie.address);
  });
});
