//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

import { ApiPromise } from '@polkadot/api';
import { IKeyringPair } from '@polkadot/types/types';
import { expect } from 'chai';
import { alicesPublicKey, bobsPublicKey } from './accounts';
import getBalance from './substrate/get-balance';
import privateKey from './substrate/privateKey';
import { default as usingApi, submitTransactionAsync } from './substrate/substrate-api';
import {
  burnItemExpectSuccess, createCollectionExpectSuccess, createItemExpectSuccess,
  destroyCollectionExpectSuccess,
  findUnusedAddress,
  getCreateCollectionResult,
  getCreateItemResult,
  transferExpectFailure,
  transferExpectSuccess,
  addCollectionAdminExpectSuccess,
} from './util/helpers';

let Alice: IKeyringPair;
let Bob: IKeyringPair;
let Charlie: IKeyringPair;

describe('Integration Test Transfer(recipient, collection_id, item_id, value)', () => {
  it('Balance transfers and check balance', async () => {
    await usingApi(async (api: ApiPromise) => {
      const [alicesBalanceBefore, bobsBalanceBefore] = await getBalance(api, [alicesPublicKey, bobsPublicKey]);

      const alicePrivateKey = privateKey('//Alice');

      const transfer = api.tx.balances.transfer(bobsPublicKey, 1n);
      const events = await submitTransactionAsync(alicePrivateKey, transfer);
      const result = getCreateItemResult(events);
      // tslint:disable-next-line:no-unused-expression
      expect(result.success).to.be.true;

      const [alicesBalanceAfter, bobsBalanceAfter] = await getBalance(api, [alicesPublicKey, bobsPublicKey]);

      // tslint:disable-next-line:no-unused-expression
      expect(alicesBalanceAfter < alicesBalanceBefore).to.be.true;
      // tslint:disable-next-line:no-unused-expression
      expect(bobsBalanceAfter > bobsBalanceBefore).to.be.true;
    });
  });

  it('Inability to pay fees error message is correct', async () => {
    await usingApi(async (api) => {
      // Find unused address
      const pk = await findUnusedAddress(api);

      const badTransfer = api.tx.balances.transfer(bobsPublicKey, 1n);
      // const events = await submitTransactionAsync(pk, badTransfer);
      const badTransaction = async () => {
        const events = await submitTransactionAsync(pk, badTransfer);
        const result = getCreateCollectionResult(events);
        // tslint:disable-next-line:no-unused-expression
        expect(result.success).to.be.false;
      };
      await expect(badTransaction()).to.be.rejectedWith('Inability to pay some fees , e.g. account balance too low');
    });
  });

  it('User can transfer owned token', async () => {
    await usingApi(async () => {
      const Alice = privateKey('//Alice');
      const Bob = privateKey('//Bob');
      // nft
      const nftCollectionId = await createCollectionExpectSuccess();
      const newNftTokenId = await createItemExpectSuccess(Alice, nftCollectionId, 'NFT');
      await transferExpectSuccess(nftCollectionId, newNftTokenId, Alice, Bob, 1, 'NFT');
      // fungible
      const fungibleCollectionId = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});
      const newFungibleTokenId = await createItemExpectSuccess(Alice, fungibleCollectionId, 'Fungible');
      await transferExpectSuccess(fungibleCollectionId, newFungibleTokenId, Alice, Bob, 1, 'Fungible');
      // reFungible
      const reFungibleCollectionId = await
      createCollectionExpectSuccess({mode: {type: 'ReFungible'}});
      const newReFungibleTokenId = await createItemExpectSuccess(Alice, reFungibleCollectionId, 'ReFungible');
      await transferExpectSuccess(
        reFungibleCollectionId,
        newReFungibleTokenId,
        Alice,
        Bob,
        100,
        'ReFungible',
      );
    });
  });

  it('Collection admin can transfer owned token', async () => {
    await usingApi(async () => {
      const Alice = privateKey('//Alice');
      const Bob = privateKey('//Bob');
      // nft
      const nftCollectionId = await createCollectionExpectSuccess();
      await addCollectionAdminExpectSuccess(Alice, nftCollectionId, Bob);
      const newNftTokenId = await createItemExpectSuccess(Bob, nftCollectionId, 'NFT', Bob.address);
      await transferExpectSuccess(nftCollectionId, newNftTokenId, Bob, Alice, 1, 'NFT');
      // fungible
      const fungibleCollectionId = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});
      await addCollectionAdminExpectSuccess(Alice, fungibleCollectionId, Bob);
      const newFungibleTokenId = await createItemExpectSuccess(Alice, fungibleCollectionId, 'Fungible', Bob.address);
      await transferExpectSuccess(fungibleCollectionId, newFungibleTokenId, Bob, Alice, 1, 'Fungible');
      // reFungible
      const reFungibleCollectionId = await createCollectionExpectSuccess({mode: {type: 'ReFungible'}});
      await addCollectionAdminExpectSuccess(Alice, reFungibleCollectionId, Bob);
      const newReFungibleTokenId = await createItemExpectSuccess(Bob, reFungibleCollectionId, 'ReFungible', Bob.address);
      await transferExpectSuccess(
        reFungibleCollectionId,
        newReFungibleTokenId,
        Bob,
        Alice,
        100,
        'ReFungible',
      );
    });
  });
});

describe('Negative Integration Test Transfer(recipient, collection_id, item_id, value)', () => {
  before(async () => {
    await usingApi(async () => {
      Alice = privateKey('//Alice');
      Bob = privateKey('//Bob');
      Charlie = privateKey('//Charlie');
    });
  });
  it('Transfer with not existed collection_id', async () => {
    await usingApi(async (api) => {
      // nft
      const nftCollectionCount = await api.query.nft.createdCollectionCount() as unknown as number;
      await transferExpectFailure(nftCollectionCount + 1, 1, Alice, Bob, 1);
      // fungible
      const fungibleCollectionCount = await api.query.nft.createdCollectionCount() as unknown as number;
      await transferExpectFailure(fungibleCollectionCount + 1, 1, Alice, Bob, 1);
      // reFungible
      const reFungibleCollectionCount = await api.query.nft.createdCollectionCount() as unknown as number;
      await transferExpectFailure(reFungibleCollectionCount + 1, 1, Alice, Bob, 1);
    });
  });
  it('Transfer with deleted collection_id', async () => {
    // nft
    const nftCollectionId = await createCollectionExpectSuccess();
    const newNftTokenId = await createItemExpectSuccess(Alice, nftCollectionId, 'NFT');
    await destroyCollectionExpectSuccess(nftCollectionId);
    await transferExpectFailure(nftCollectionId, newNftTokenId, Alice, Bob, 1);
    // fungible
    const fungibleCollectionId = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});
    const newFungibleTokenId = await createItemExpectSuccess(Alice, fungibleCollectionId, 'Fungible');
    await destroyCollectionExpectSuccess(fungibleCollectionId);
    await transferExpectFailure(fungibleCollectionId, newFungibleTokenId, Alice, Bob, 1);
    // reFungible
    const reFungibleCollectionId = await
    createCollectionExpectSuccess({mode: {type: 'ReFungible'}});
    const newReFungibleTokenId = await createItemExpectSuccess(Alice, reFungibleCollectionId, 'ReFungible');
    await destroyCollectionExpectSuccess(reFungibleCollectionId);
    await transferExpectFailure(
      reFungibleCollectionId,
      newReFungibleTokenId,
      Alice,
      Bob,
      1,
    );
  });
  it('Transfer with not existed item_id', async () => {
    // nft
    const nftCollectionId = await createCollectionExpectSuccess();
    await transferExpectFailure(nftCollectionId, 2, Alice, Bob, 1);
    // fungible
    const fungibleCollectionId = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});
    await transferExpectFailure(fungibleCollectionId, 2, Alice, Bob, 1);
    // reFungible
    const reFungibleCollectionId = await
    createCollectionExpectSuccess({mode: {type: 'ReFungible'}});
    await transferExpectFailure(
      reFungibleCollectionId,
      2,
      Alice,
      Bob,
      1,
    );
  });
  it('Transfer with deleted item_id', async () => {
    // nft
    const nftCollectionId = await createCollectionExpectSuccess();
    const newNftTokenId = await createItemExpectSuccess(Alice, nftCollectionId, 'NFT');
    await burnItemExpectSuccess(Alice, nftCollectionId, newNftTokenId, 1);
    await transferExpectFailure(nftCollectionId, newNftTokenId, Alice, Bob, 1);
    // fungible
    const fungibleCollectionId = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});
    const newFungibleTokenId = await createItemExpectSuccess(Alice, fungibleCollectionId, 'Fungible');
    await burnItemExpectSuccess(Alice, fungibleCollectionId, newFungibleTokenId, 10);
    await transferExpectFailure(fungibleCollectionId, newFungibleTokenId, Alice, Bob, 1);
    // reFungible
    const reFungibleCollectionId = await
    createCollectionExpectSuccess({mode: {type: 'ReFungible'}});
    const newReFungibleTokenId = await createItemExpectSuccess(Alice, reFungibleCollectionId, 'ReFungible');
    await burnItemExpectSuccess(Alice, reFungibleCollectionId, newReFungibleTokenId, 100);
    await transferExpectFailure(
      reFungibleCollectionId,
      newReFungibleTokenId,
      Alice,
      Bob,
      1,
    );
  });
  it('Transfer with recipient that is not owner', async () => {
    // nft
    const nftCollectionId = await createCollectionExpectSuccess();
    const newNftTokenId = await createItemExpectSuccess(Alice, nftCollectionId, 'NFT');
    await transferExpectFailure(nftCollectionId, newNftTokenId, Charlie, Bob, 1);
    // fungible
    const fungibleCollectionId = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});
    const newFungibleTokenId = await createItemExpectSuccess(Alice, fungibleCollectionId, 'Fungible');
    await transferExpectFailure(fungibleCollectionId, newFungibleTokenId, Charlie, Bob, 1);
    // reFungible
    const reFungibleCollectionId = await
    createCollectionExpectSuccess({mode: {type: 'ReFungible'}});
    const newReFungibleTokenId = await createItemExpectSuccess(Alice, reFungibleCollectionId, 'ReFungible');
    await transferExpectFailure(
      reFungibleCollectionId,
      newReFungibleTokenId,
      Charlie,
      Bob,
      1,
    );
  });
});
