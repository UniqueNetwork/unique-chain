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

import {ApiPromise} from '@polkadot/api';
import {IKeyringPair} from '@polkadot/types/types';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {default as usingApi} from './substrate/substrate-api';
import {
  approveExpectFail,
  approveExpectSuccess,
  createCollectionExpectSuccess,
  createFungibleItemExpectSuccess,
  createItemExpectSuccess,
  getAllowance,
  transferFromExpectFail,
  transferFromExpectSuccess,
  burnItemExpectSuccess,
  setCollectionLimitsExpectSuccess,
  getCreatedCollectionCount,
} from './util/helpers';

chai.use(chaiAsPromised);
const expect = chai.expect;

describe('Integration Test transferFrom(from, recipient, collection_id, item_id, value):', () => {
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

  it('Execute the extrinsic and check nftItemList - owner of token', async () => {
    await usingApi(async () => {
      // nft
      const nftCollectionId = await createCollectionExpectSuccess();
      const newNftTokenId = await createItemExpectSuccess(alice, nftCollectionId, 'NFT');
      await approveExpectSuccess(nftCollectionId, newNftTokenId, alice, bob.address);

      await transferFromExpectSuccess(nftCollectionId, newNftTokenId, bob, alice, charlie, 1, 'NFT');

      // fungible
      const fungibleCollectionId = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});
      const newFungibleTokenId = await createItemExpectSuccess(alice, fungibleCollectionId, 'Fungible');
      await approveExpectSuccess(fungibleCollectionId, newFungibleTokenId, alice, bob.address);
      await transferFromExpectSuccess(fungibleCollectionId, newFungibleTokenId, bob, alice, charlie, 1, 'Fungible');

      // reFungible
      const reFungibleCollectionId = await
      createCollectionExpectSuccess({mode: {type: 'ReFungible'}});
      const newReFungibleTokenId = await createItemExpectSuccess(alice, reFungibleCollectionId, 'ReFungible');
      await approveExpectSuccess(reFungibleCollectionId, newReFungibleTokenId, alice, bob.address, 100);
      await transferFromExpectSuccess(
        reFungibleCollectionId,
        newReFungibleTokenId,
        bob,
        alice,
        charlie,
        100,
        'ReFungible',
      );
    });
  });

  it('Should reduce allowance if value is big', async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      const alice = privateKeyWrapper('//Alice');
      const bob = privateKeyWrapper('//Bob');
      const charlie = privateKeyWrapper('//Charlie');

      // fungible
      const fungibleCollectionId = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});
      const newFungibleTokenId = await createFungibleItemExpectSuccess(alice, fungibleCollectionId, {Value: 500000n});

      await approveExpectSuccess(fungibleCollectionId, newFungibleTokenId, alice, bob.address, 500000n);
      await transferFromExpectSuccess(fungibleCollectionId, newFungibleTokenId, bob, alice, charlie, 500000n, 'Fungible');
      expect(await getAllowance(api, fungibleCollectionId, alice.address, bob.address, newFungibleTokenId)).to.equal(0n);
    });
  });

  it('can be called by collection owner on non-owned item when OwnerCanTransfer == true', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await setCollectionLimitsExpectSuccess(alice, collectionId, {ownerCanTransfer: true});
    const itemId = await createItemExpectSuccess(alice, collectionId, 'NFT', bob.address);

    await transferFromExpectSuccess(collectionId, itemId, alice, bob, charlie);
  });
});

describe('Negative Integration Test transferFrom(from, recipient, collection_id, item_id, value):', () => {
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

  it('transferFrom for a collection that does not exist', async () => {
    await usingApi(async (api: ApiPromise) => {
      // nft
      const nftCollectionCount = await getCreatedCollectionCount(api);
      await approveExpectFail(nftCollectionCount + 1, 1, alice, bob);

      await transferFromExpectFail(nftCollectionCount + 1, 1, bob, alice, charlie, 1);

      // fungible
      const fungibleCollectionCount = await getCreatedCollectionCount(api);
      await approveExpectFail(fungibleCollectionCount + 1, 0, alice, bob);

      await transferFromExpectFail(fungibleCollectionCount + 1, 0, bob, alice, charlie, 1);
      // reFungible
      const reFungibleCollectionCount = await getCreatedCollectionCount(api);
      await approveExpectFail(reFungibleCollectionCount + 1, 1, alice, bob);

      await transferFromExpectFail(reFungibleCollectionCount + 1, 1, bob, alice, charlie, 1);
    });
  });

  /* it('transferFrom for a collection that was destroyed', async () => {
    await usingApi(async (api: ApiPromise) => {
      this test copies approve negative test
    });
  }); */

  /* it('transferFrom a token that does not exist', async () => {
    await usingApi(async (api: ApiPromise) => {
      this test copies approve negative test
    });
  }); */

  /* it('transferFrom a token that was deleted', async () => {
    await usingApi(async (api: ApiPromise) => {
      this test copies approve negative test
    });
  }); */

  it('transferFrom for not approved address', async () => {
    await usingApi(async () => {
      // nft
      const nftCollectionId = await createCollectionExpectSuccess();
      const newNftTokenId = await createItemExpectSuccess(alice, nftCollectionId, 'NFT');

      await transferFromExpectFail(nftCollectionId, newNftTokenId, bob, alice, charlie, 1);

      // fungible
      const fungibleCollectionId = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});
      const newFungibleTokenId = await createItemExpectSuccess(alice, fungibleCollectionId, 'Fungible');
      await transferFromExpectFail(fungibleCollectionId, newFungibleTokenId, bob, alice, charlie, 1);
      // reFungible
      const reFungibleCollectionId = await
      createCollectionExpectSuccess({mode: {type: 'ReFungible'}});
      const newReFungibleTokenId = await createItemExpectSuccess(alice, reFungibleCollectionId, 'ReFungible');
      await transferFromExpectFail(
        reFungibleCollectionId,
        newReFungibleTokenId,
        bob,
        alice,
        charlie,
        1,
      );
    });
  });

  it('transferFrom incorrect token count', async () => {
    await usingApi(async () => {
      // nft
      const nftCollectionId = await createCollectionExpectSuccess();
      const newNftTokenId = await createItemExpectSuccess(alice, nftCollectionId, 'NFT');
      await approveExpectSuccess(nftCollectionId, newNftTokenId, alice, bob.address);

      await transferFromExpectFail(nftCollectionId, newNftTokenId, bob, alice, charlie, 2);

      // fungible
      const fungibleCollectionId = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});
      const newFungibleTokenId = await createItemExpectSuccess(alice, fungibleCollectionId, 'Fungible');
      await approveExpectSuccess(fungibleCollectionId, newFungibleTokenId, alice, bob.address);
      await transferFromExpectFail(fungibleCollectionId, newFungibleTokenId, bob, alice, charlie, 2);
      // reFungible
      const reFungibleCollectionId = await
      createCollectionExpectSuccess({mode: {type: 'ReFungible'}});
      const newReFungibleTokenId = await createItemExpectSuccess(alice, reFungibleCollectionId, 'ReFungible');
      await approveExpectSuccess(reFungibleCollectionId, newReFungibleTokenId, alice, bob.address);
      await transferFromExpectFail(
        reFungibleCollectionId,
        newReFungibleTokenId,
        bob,
        alice,
        charlie,
        2,
      );
    });
  });

  it('execute transferFrom from account that is not owner of collection', async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      const dave = privateKeyWrapper('//Dave');
      // nft
      const nftCollectionId = await createCollectionExpectSuccess();
      const newNftTokenId = await createItemExpectSuccess(alice, nftCollectionId, 'NFT');
      try {
        await approveExpectFail(nftCollectionId, newNftTokenId, dave, bob);
        await transferFromExpectFail(nftCollectionId, newNftTokenId, dave, alice, charlie, 1);
      } catch (e) {
        // tslint:disable-next-line:no-unused-expression
        expect(e).to.be.exist;
      }

      // await transferFromExpectFail(nftCollectionId, newNftTokenId, Dave, Alice, Charlie, 1);

      // fungible
      const fungibleCollectionId = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});
      const newFungibleTokenId = await createItemExpectSuccess(alice, fungibleCollectionId, 'Fungible');
      try {
        await approveExpectFail(fungibleCollectionId, newFungibleTokenId, dave, bob);
        await transferFromExpectFail(fungibleCollectionId, newFungibleTokenId, dave, alice, charlie, 1);
      } catch (e) {
        // tslint:disable-next-line:no-unused-expression
        expect(e).to.be.exist;
      }
      // reFungible
      const reFungibleCollectionId = await
      createCollectionExpectSuccess({mode: {type: 'ReFungible'}});
      const newReFungibleTokenId = await createItemExpectSuccess(alice, reFungibleCollectionId, 'ReFungible');
      try {
        await approveExpectFail(reFungibleCollectionId, newReFungibleTokenId, dave, bob);
        await transferFromExpectFail(reFungibleCollectionId, newReFungibleTokenId, dave, alice, charlie, 1);
      } catch (e) {
        // tslint:disable-next-line:no-unused-expression
        expect(e).to.be.exist;
      }
    });
  });
  it('transferFrom burnt token before approve NFT', async () => {
    await usingApi(async () => {
      // nft
      const nftCollectionId = await createCollectionExpectSuccess();
      await setCollectionLimitsExpectSuccess(alice, nftCollectionId, {ownerCanTransfer: true});
      const newNftTokenId = await createItemExpectSuccess(alice, nftCollectionId, 'NFT');
      await burnItemExpectSuccess(alice, nftCollectionId, newNftTokenId, 1);
      await approveExpectFail(nftCollectionId, newNftTokenId, alice, bob);
      await transferFromExpectFail(nftCollectionId, newNftTokenId, bob, alice, charlie, 1);
    });
  });
  it('transferFrom burnt token before approve Fungible', async () => {
    await usingApi(async () => {
      const fungibleCollectionId = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});
      await setCollectionLimitsExpectSuccess(alice, fungibleCollectionId, {ownerCanTransfer: true});
      const newFungibleTokenId = await createItemExpectSuccess(alice, fungibleCollectionId, 'Fungible');
      await burnItemExpectSuccess(alice, fungibleCollectionId, newFungibleTokenId, 10);
      await approveExpectSuccess(fungibleCollectionId, newFungibleTokenId, alice, bob.address);
      await transferFromExpectFail(fungibleCollectionId, newFungibleTokenId, bob, alice, charlie, 1);

    });
  });
  it('transferFrom burnt token before approve ReFungible', async () => {
    await usingApi(async () => {
      const reFungibleCollectionId = await createCollectionExpectSuccess({mode: {type: 'ReFungible'}});
      await setCollectionLimitsExpectSuccess(alice, reFungibleCollectionId, {ownerCanTransfer: true});
      const newReFungibleTokenId = await createItemExpectSuccess(alice, reFungibleCollectionId, 'ReFungible');
      await burnItemExpectSuccess(alice, reFungibleCollectionId, newReFungibleTokenId, 100);
      await approveExpectFail(reFungibleCollectionId, newReFungibleTokenId, alice, bob);
      await transferFromExpectFail(reFungibleCollectionId, newReFungibleTokenId, bob, alice, charlie, 1);

    });
  });

  it('transferFrom burnt token after approve NFT', async () => {
    await usingApi(async () => {
      // nft
      const nftCollectionId = await createCollectionExpectSuccess();
      const newNftTokenId = await createItemExpectSuccess(alice, nftCollectionId, 'NFT');
      await approveExpectSuccess(nftCollectionId, newNftTokenId, alice, bob.address);
      await burnItemExpectSuccess(alice, nftCollectionId, newNftTokenId, 1);
      await transferFromExpectFail(nftCollectionId, newNftTokenId, bob, alice, charlie, 1);
    });
  });
  it('transferFrom burnt token after approve Fungible', async () => {
    await usingApi(async () => {
      const fungibleCollectionId = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});
      const newFungibleTokenId = await createItemExpectSuccess(alice, fungibleCollectionId, 'Fungible');
      await approveExpectSuccess(fungibleCollectionId, newFungibleTokenId, alice, bob.address);
      await burnItemExpectSuccess(alice, fungibleCollectionId, newFungibleTokenId, 10);
      await transferFromExpectFail(fungibleCollectionId, newFungibleTokenId, bob, alice, charlie, 1);

    });
  });
  it('transferFrom burnt token after approve ReFungible', async () => {
    await usingApi(async () => {
      const reFungibleCollectionId = await createCollectionExpectSuccess({mode: {type: 'ReFungible'}});
      const newReFungibleTokenId = await createItemExpectSuccess(alice, reFungibleCollectionId, 'ReFungible');
      await approveExpectSuccess(reFungibleCollectionId, newReFungibleTokenId, alice, bob.address);
      await burnItemExpectSuccess(alice, reFungibleCollectionId, newReFungibleTokenId, 100);
      await transferFromExpectFail(reFungibleCollectionId, newReFungibleTokenId, bob, alice, charlie, 1);

    });
  });

  it('fails when called by collection owner on non-owned item when OwnerCanTransfer == false', async () => {
    const collectionId = await createCollectionExpectSuccess();
    const itemId = await createItemExpectSuccess(alice, collectionId, 'NFT', bob.address);
    await setCollectionLimitsExpectSuccess(alice, collectionId, {ownerCanTransfer: false});

    await transferFromExpectFail(collectionId, itemId, alice, bob, charlie);
  });
});
