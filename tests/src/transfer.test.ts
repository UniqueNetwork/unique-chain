//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

import { ApiPromise } from '@polkadot/api';
import { expect } from 'chai';
import { alicesPublicKey, bobsPublicKey } from './accounts';
import getBalance from './substrate/get-balance';
import privateKey from './substrate/privateKey';
import {default as usingApi, submitTransactionAsync, submitTransactionExpectFailAsync} from './substrate/substrate-api';
import {
  approveExpectSuccess,
  createCollectionExpectSuccess, createItemExpectSuccess,
  findUnusedAddress,
  getCreateCollectionResult,
  getCreateItemResult,
  transferExpectSuccess,
} from './util/helpers';

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
      expect(badTransaction()).to.be.rejectedWith('Inability to pay some fees , e.g. account balance too low');
    });
  });

  it('Create collection, balance transfers and check balance', async () => {
    const Alice = privateKey('//Alice');
    const Bob = privateKey('//Bob');
    const Charlie = privateKey('//CHARLIE');
    // nft
    const nftCollectionId = await createCollectionExpectSuccess();
    const newNftTokenId = await createItemExpectSuccess(Alice, nftCollectionId, 'NFT');

    await transferExpectSuccess(nftCollectionId, newNftTokenId, Alice, Bob, 1, 'NFT');

    // fungible
    const fungibleCollectionId = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});
    const newFungibleTokenId = await createItemExpectSuccess(Alice, fungibleCollectionId, 'Fungible');
    await approveExpectSuccess(fungibleCollectionId, newFungibleTokenId, Alice, Bob);
    await transferExpectSuccess(fungibleCollectionId, newFungibleTokenId, Alice, Bob, 1, 'Fungible');
    // reFungible
    const reFungibleCollectionId = await
      createCollectionExpectSuccess({mode: {type: 'ReFungible', decimalPoints: 0}});
    const newReFungibleTokenId = await createItemExpectSuccess(Alice, reFungibleCollectionId, 'ReFungible');
    await approveExpectSuccess(reFungibleCollectionId, newReFungibleTokenId, Alice, Bob);
    await transferExpectSuccess(reFungibleCollectionId,
      newReFungibleTokenId, Alice, Bob, 1, 'ReFungible');
  });
});

describe('Negative Integration Test Transfer(recipient, collection_id, item_id, value)', () => {
  it('Transfer with not existed collection_id', async () => {

  });
  it('Transfer with deleted collection_id', async () => {

  });
  it('Transfer with not existed item_id', async () => {

  });
  it('Transfer with deleted item_id', async () => {

  });
  it('Transfer with recipient that is not owner', async () => {

  });
});
