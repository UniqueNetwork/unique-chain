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
import {expect} from 'chai';
import {alicesPublicKey, bobsPublicKey} from './accounts';
import getBalance from './substrate/get-balance';
import privateKey from './substrate/privateKey';
import {default as usingApi, submitTransactionAsync} from './substrate/substrate-api';
import {
  burnItemExpectSuccess, createCollectionExpectSuccess, createItemExpectSuccess,
  destroyCollectionExpectSuccess,
  findUnusedAddress,
  getCreateCollectionResult,
  getCreateItemResult,
  transferExpectFailure,
  transferExpectSuccess,
  addCollectionAdminExpectSuccess,
  getCreatedCollectionCount,
  toSubstrateAddress,
  getTokenOwner,
  normalizeAccountId,
  getBalance as getTokenBalance,
  transferFromExpectSuccess,
  transferFromExpectFail,
} from './util/helpers';
import {
  subToEth,
  itWeb3, 
} from './eth/util/helpers';

let alice: IKeyringPair;
let bob: IKeyringPair;
let charlie: IKeyringPair;

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
      const alice = privateKey('//Alice');
      const bob = privateKey('//Bob');
      // nft
      const nftCollectionId = await createCollectionExpectSuccess();
      const newNftTokenId = await createItemExpectSuccess(alice, nftCollectionId, 'NFT');
      await transferExpectSuccess(nftCollectionId, newNftTokenId, alice, bob, 1, 'NFT');
      // fungible
      const fungibleCollectionId = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});
      const newFungibleTokenId = await createItemExpectSuccess(alice, fungibleCollectionId, 'Fungible');
      await transferExpectSuccess(fungibleCollectionId, newFungibleTokenId, alice, bob, 1, 'Fungible');
      // reFungible
      const reFungibleCollectionId = await
      createCollectionExpectSuccess({mode: {type: 'ReFungible'}});
      const newReFungibleTokenId = await createItemExpectSuccess(alice, reFungibleCollectionId, 'ReFungible');
      await transferExpectSuccess(
        reFungibleCollectionId,
        newReFungibleTokenId,
        alice,
        bob,
        100,
        'ReFungible',
      );
    });
  });

  it('Collection admin can transfer owned token', async () => {
    await usingApi(async () => {
      const alice = privateKey('//Alice');
      const bob = privateKey('//Bob');
      // nft
      const nftCollectionId = await createCollectionExpectSuccess();
      await addCollectionAdminExpectSuccess(alice, nftCollectionId, bob.address);
      const newNftTokenId = await createItemExpectSuccess(bob, nftCollectionId, 'NFT', bob.address);
      await transferExpectSuccess(nftCollectionId, newNftTokenId, bob, alice, 1, 'NFT');
      // fungible
      const fungibleCollectionId = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});
      await addCollectionAdminExpectSuccess(alice, fungibleCollectionId, bob.address);
      const newFungibleTokenId = await createItemExpectSuccess(alice, fungibleCollectionId, 'Fungible', bob.address);
      await transferExpectSuccess(fungibleCollectionId, newFungibleTokenId, bob, alice, 1, 'Fungible');
      // reFungible
      const reFungibleCollectionId = await createCollectionExpectSuccess({mode: {type: 'ReFungible'}});
      await addCollectionAdminExpectSuccess(alice, reFungibleCollectionId, bob.address);
      const newReFungibleTokenId = await createItemExpectSuccess(bob, reFungibleCollectionId, 'ReFungible', bob.address);
      await transferExpectSuccess(
        reFungibleCollectionId,
        newReFungibleTokenId,
        bob,
        alice,
        100,
        'ReFungible',
      );
    });
  });
});

describe('Negative Integration Test Transfer(recipient, collection_id, item_id, value)', () => {
  before(async () => {
    await usingApi(async () => {
      alice = privateKey('//Alice');
      bob = privateKey('//Bob');
      charlie = privateKey('//Charlie');
    });
  });
  it('Transfer with not existed collection_id', async () => {
    await usingApi(async (api) => {
      // nft
      const nftCollectionCount = await getCreatedCollectionCount(api);
      await transferExpectFailure(nftCollectionCount + 1, 1, alice, bob, 1);
      // fungible
      const fungibleCollectionCount = await getCreatedCollectionCount(api);
      await transferExpectFailure(fungibleCollectionCount + 1, 0, alice, bob, 1);
      // reFungible
      const reFungibleCollectionCount = await getCreatedCollectionCount(api);
      await transferExpectFailure(reFungibleCollectionCount + 1, 1, alice, bob, 1);
    });
  });
  it('Transfer with deleted collection_id', async () => {
    // nft
    const nftCollectionId = await createCollectionExpectSuccess();
    const newNftTokenId = await createItemExpectSuccess(alice, nftCollectionId, 'NFT');
    await burnItemExpectSuccess(alice, nftCollectionId, newNftTokenId);
    await destroyCollectionExpectSuccess(nftCollectionId);
    await transferExpectFailure(nftCollectionId, newNftTokenId, alice, bob, 1);
    // fungible
    const fungibleCollectionId = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});
    const newFungibleTokenId = await createItemExpectSuccess(alice, fungibleCollectionId, 'Fungible');
    await burnItemExpectSuccess(alice, fungibleCollectionId, newFungibleTokenId, 10);
    await destroyCollectionExpectSuccess(fungibleCollectionId);
    await transferExpectFailure(fungibleCollectionId, newFungibleTokenId, alice, bob, 1);
    // reFungible
    const reFungibleCollectionId = await
    createCollectionExpectSuccess({mode: {type: 'ReFungible'}});
    const newReFungibleTokenId = await createItemExpectSuccess(alice, reFungibleCollectionId, 'ReFungible');
    await burnItemExpectSuccess(alice, reFungibleCollectionId, newReFungibleTokenId, 100);
    await destroyCollectionExpectSuccess(reFungibleCollectionId);
    await transferExpectFailure(
      reFungibleCollectionId,
      newReFungibleTokenId,
      alice,
      bob,
      1,
    );
  });
  it('Transfer with not existed item_id', async () => {
    // nft
    const nftCollectionId = await createCollectionExpectSuccess();
    await transferExpectFailure(nftCollectionId, 2, alice, bob, 1);
    // fungible
    const fungibleCollectionId = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});
    await transferExpectFailure(fungibleCollectionId, 2, alice, bob, 1);
    // reFungible
    const reFungibleCollectionId = await
    createCollectionExpectSuccess({mode: {type: 'ReFungible'}});
    await transferExpectFailure(
      reFungibleCollectionId,
      2,
      alice,
      bob,
      1,
    );
  });
  it('Transfer with deleted item_id', async () => {
    // nft
    const nftCollectionId = await createCollectionExpectSuccess();
    const newNftTokenId = await createItemExpectSuccess(alice, nftCollectionId, 'NFT');
    await burnItemExpectSuccess(alice, nftCollectionId, newNftTokenId, 1);
    await transferExpectFailure(nftCollectionId, newNftTokenId, alice, bob, 1);
    // fungible
    const fungibleCollectionId = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});
    const newFungibleTokenId = await createItemExpectSuccess(alice, fungibleCollectionId, 'Fungible');
    await burnItemExpectSuccess(alice, fungibleCollectionId, newFungibleTokenId, 10);
    await transferExpectFailure(fungibleCollectionId, newFungibleTokenId, alice, bob, 1);
    // reFungible
    const reFungibleCollectionId = await
    createCollectionExpectSuccess({mode: {type: 'ReFungible'}});
    const newReFungibleTokenId = await createItemExpectSuccess(alice, reFungibleCollectionId, 'ReFungible');
    await burnItemExpectSuccess(alice, reFungibleCollectionId, newReFungibleTokenId, 100);
    await transferExpectFailure(
      reFungibleCollectionId,
      newReFungibleTokenId,
      alice,
      bob,
      1,
    );
  });
  it('Transfer with recipient that is not owner', async () => {
    // nft
    const nftCollectionId = await createCollectionExpectSuccess();
    const newNftTokenId = await createItemExpectSuccess(alice, nftCollectionId, 'NFT');
    await transferExpectFailure(nftCollectionId, newNftTokenId, charlie, bob, 1);
    // fungible
    const fungibleCollectionId = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});
    const newFungibleTokenId = await createItemExpectSuccess(alice, fungibleCollectionId, 'Fungible');
    await transferExpectFailure(fungibleCollectionId, newFungibleTokenId, charlie, bob, 1);
    // reFungible
    const reFungibleCollectionId = await
    createCollectionExpectSuccess({mode: {type: 'ReFungible'}});
    const newReFungibleTokenId = await createItemExpectSuccess(alice, reFungibleCollectionId, 'ReFungible');
    await transferExpectFailure(
      reFungibleCollectionId,
      newReFungibleTokenId,
      charlie,
      bob,
      1,
    );
  });
});

describe('Zero value transfer(From)', () => {
  before(async () => {
    await usingApi(async () => {
      alice = privateKey('//Alice');
      bob = privateKey('//Bob');
    });
  });

  it('NFT', async () => {
    await usingApi(async (api: ApiPromise) => {
      const nftCollectionId = await createCollectionExpectSuccess();
      const newNftTokenId = await createItemExpectSuccess(alice, nftCollectionId, 'NFT');

      const transferTx = api.tx.unique.transfer(normalizeAccountId(bob), nftCollectionId, newNftTokenId, 0);
      await submitTransactionAsync(alice, transferTx);
      const address = normalizeAccountId(await getTokenOwner(api, nftCollectionId, newNftTokenId));

      expect(toSubstrateAddress(address)).to.be.equal(alice.address);
    });
  });

  it('RFT', async () => {
    await usingApi(async (api: ApiPromise) => {
      const reFungibleCollectionId = await createCollectionExpectSuccess({mode: {type: 'ReFungible'}});
      const newReFungibleTokenId = await createItemExpectSuccess(alice, reFungibleCollectionId, 'ReFungible');
      const balanceBeforeAlice = await getTokenBalance(api, reFungibleCollectionId, normalizeAccountId(alice), newReFungibleTokenId);
      const balanceBeforeBob = await getTokenBalance(api, reFungibleCollectionId, normalizeAccountId(bob), newReFungibleTokenId);

      const transferTx = api.tx.unique.transfer(normalizeAccountId(bob), reFungibleCollectionId, newReFungibleTokenId, 0);
      await submitTransactionAsync(alice, transferTx);

      const balanceAfterAlice = await getTokenBalance(api, reFungibleCollectionId, normalizeAccountId(alice), newReFungibleTokenId);
      const balanceAfterBob = await getTokenBalance(api, reFungibleCollectionId, normalizeAccountId(bob), newReFungibleTokenId);

      expect((balanceBeforeAlice)).to.be.equal(balanceAfterAlice);
      expect((balanceBeforeBob)).to.be.equal(balanceAfterBob);
    });
  });

  it('Fungible', async () => {
    await usingApi(async (api: ApiPromise) => {
      const fungibleCollectionId = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});
      const newFungibleTokenId = await createItemExpectSuccess(alice, fungibleCollectionId, 'Fungible');
      const balanceBeforeAlice = await getTokenBalance(api, fungibleCollectionId, normalizeAccountId(alice), newFungibleTokenId);
      const balanceBeforeBob = await getTokenBalance(api, fungibleCollectionId, normalizeAccountId(bob), newFungibleTokenId);

      const transferTx = api.tx.unique.transfer(normalizeAccountId(bob), fungibleCollectionId, newFungibleTokenId, 0);
      await submitTransactionAsync(alice, transferTx);

      const balanceAfterAlice = await getTokenBalance(api, fungibleCollectionId, normalizeAccountId(alice), newFungibleTokenId);
      const balanceAfterBob = await getTokenBalance(api, fungibleCollectionId, normalizeAccountId(bob), newFungibleTokenId);

      expect((balanceBeforeAlice)).to.be.equal(balanceAfterAlice);
      expect((balanceBeforeBob)).to.be.equal(balanceAfterBob);
    });
  });
});

describe('Transfers to self (potentially over substrate-evm boundary)', () => {
  itWeb3('Transfers to self. In case of same frontend', async ({api}) => {
    const collectionId = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});
    const alice = privateKey('//Alice');
    const aliceProxy = subToEth(alice.address);
    const tokenId = await createItemExpectSuccess(alice, collectionId, 'Fungible', {Substrate: alice.address});
    await transferExpectSuccess(collectionId, tokenId, alice, {Ethereum: aliceProxy}, 10, 'Fungible');
    const balanceAliceBefore = await getTokenBalance(api, collectionId, {Ethereum: aliceProxy}, tokenId);
    await transferFromExpectSuccess(collectionId, tokenId, alice, {Ethereum: aliceProxy}, {Ethereum: aliceProxy}, 10, 'Fungible');
    const balanceAliceAfter = await getTokenBalance(api, collectionId, {Ethereum: aliceProxy}, tokenId);
    expect(balanceAliceBefore).to.be.eq(balanceAliceAfter);
  });

  itWeb3('Transfers to self. In case of substrate-evm boundary', async ({api}) => {
    const collectionId = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});
    const alice = privateKey('//Alice');
    const aliceProxy = subToEth(alice.address);
    const tokenId = await createItemExpectSuccess(alice, collectionId, 'Fungible', {Substrate: alice.address});
    const balanceAliceBefore = await getTokenBalance(api, collectionId, normalizeAccountId(alice), tokenId);
    await transferExpectSuccess(collectionId, tokenId, alice, {Ethereum: aliceProxy} , 10, 'Fungible');
    await transferFromExpectSuccess(collectionId, tokenId, alice, {Ethereum: aliceProxy}, alice, 10, 'Fungible');
    const balanceAliceAfter = await getTokenBalance(api, collectionId, normalizeAccountId(alice), tokenId);
    expect(balanceAliceBefore).to.be.eq(balanceAliceAfter);
  });

  itWeb3('Transfers to self. In case of inside substrate-evm', async ({api}) => {
    const collectionId = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});
    const alice = privateKey('//Alice');
    const tokenId = await createItemExpectSuccess(alice, collectionId, 'Fungible', {Substrate: alice.address});
    const balanceAliceBefore = await getTokenBalance(api, collectionId, normalizeAccountId(alice), tokenId);
    await transferExpectSuccess(collectionId, tokenId, alice, alice , 10, 'Fungible');
    await transferFromExpectSuccess(collectionId, tokenId, alice, alice, alice, 10, 'Fungible');
    const balanceAliceAfter = await getTokenBalance(api, collectionId, normalizeAccountId(alice), tokenId);
    expect(balanceAliceBefore).to.be.eq(balanceAliceAfter);
  });

  itWeb3('Transfers to self. In case of inside substrate-evm when not enought "Fungibles"', async ({api}) => {
    const collectionId = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});
    const alice = privateKey('//Alice');
    const tokenId = await createItemExpectSuccess(alice, collectionId, 'Fungible', {Substrate: alice.address});
    const balanceAliceBefore = await getTokenBalance(api, collectionId, normalizeAccountId(alice), tokenId);
    await transferExpectFailure(collectionId, tokenId, alice, alice , 11);
    await transferFromExpectFail(collectionId, tokenId, alice, alice, alice, 11);
    const balanceAliceAfter = await getTokenBalance(api, collectionId, normalizeAccountId(alice), tokenId);
    expect(balanceAliceBefore).to.be.eq(balanceAliceAfter);
  });
});
