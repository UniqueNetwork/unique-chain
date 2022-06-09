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

// https://unique-network.readthedocs.io/en/latest/jsapi.html#setchainlimits
import {ApiPromise} from '@polkadot/api';
import {IKeyringPair} from '@polkadot/types/types';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import usingApi, {submitTransactionAsync, submitTransactionExpectFailAsync} from './substrate/substrate-api';
import {
  createCollectionExpectSuccess, getCreatedCollectionCount,
  getCreateItemResult,
  setCollectionLimitsExpectFailure,
  setCollectionLimitsExpectSuccess,
  addCollectionAdminExpectSuccess,
  queryCollectionExpectSuccess,
} from './util/helpers';

chai.use(chaiAsPromised);
const expect = chai.expect;

let alice: IKeyringPair;
let bob: IKeyringPair;
let collectionIdForTesting: number;

const accountTokenOwnershipLimit = 0;
const sponsoredDataSize = 0;
const sponsorTransferTimeout = 1;
const tokenLimit = 10;

describe('setCollectionLimits positive', () => {
  let tx;
  before(async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      alice = privateKeyWrapper('//Alice');
      collectionIdForTesting = await createCollectionExpectSuccess({name: 'A', description: 'B', tokenPrefix: 'C', mode: {type: 'NFT'}});
    });
  });
  it('execute setCollectionLimits with predefined params ', async () => {
    await usingApi(async (api: ApiPromise) => {
      tx = api.tx.unique.setCollectionLimits(
        collectionIdForTesting,
        {
          accountTokenOwnershipLimit: accountTokenOwnershipLimit,
          sponsoredDataSize: sponsoredDataSize,
          tokenLimit: tokenLimit,
          sponsorTransferTimeout,
          ownerCanTransfer: true,
          ownerCanDestroy: true,
        },
      );
      const events = await submitTransactionAsync(alice, tx);
      const result = getCreateItemResult(events);

      // get collection limits defined previously
      const collectionInfo = await queryCollectionExpectSuccess(api, collectionIdForTesting);

      // tslint:disable-next-line:no-unused-expression
      expect(result.success).to.be.true;
      expect(collectionInfo.limits.accountTokenOwnershipLimit.unwrap().toNumber()).to.be.equal(accountTokenOwnershipLimit);
      expect(collectionInfo.limits.sponsoredDataSize.unwrap().toNumber()).to.be.equal(sponsoredDataSize);
      expect(collectionInfo.limits.tokenLimit.unwrap().toNumber()).to.be.equal(tokenLimit);
      expect(collectionInfo.limits.sponsorTransferTimeout.unwrap().toNumber()).to.be.equal(sponsorTransferTimeout);
      expect(collectionInfo.limits.ownerCanTransfer.unwrap().toJSON()).to.be.true;
      expect(collectionInfo.limits.ownerCanDestroy.unwrap().toJSON()).to.be.true;
    });
  });

  it('Set the same token limit twice', async () => {
    await usingApi(async (api: ApiPromise) => {

      const collectionLimits = {
        accountTokenOwnershipLimit: accountTokenOwnershipLimit,
        sponsoredMintSize: sponsoredDataSize,
        tokenLimit: tokenLimit,
        sponsorTransferTimeout,
        ownerCanTransfer: true,
        ownerCanDestroy: true,
      };

      // The first time
      const tx1 = api.tx.unique.setCollectionLimits(
        collectionIdForTesting,
        collectionLimits,
      );
      const events1 = await submitTransactionAsync(alice, tx1);
      const result1 = getCreateItemResult(events1);
      expect(result1.success).to.be.true;
      const collectionInfo1 = await queryCollectionExpectSuccess(api, collectionIdForTesting);
      expect(collectionInfo1.limits.tokenLimit.unwrap().toNumber()).to.be.equal(tokenLimit);

      // The second time
      const tx2 = api.tx.unique.setCollectionLimits(
        collectionIdForTesting,
        collectionLimits,
      );
      const events2 = await submitTransactionAsync(alice, tx2);
      const result2 = getCreateItemResult(events2);
      expect(result2.success).to.be.true;
      const collectionInfo2 = await queryCollectionExpectSuccess(api, collectionIdForTesting);
      expect(collectionInfo2.limits.tokenLimit.unwrap().toNumber()).to.be.equal(tokenLimit);
    });
  });

});

describe('setCollectionLimits negative', () => {
  let tx;
  before(async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      alice = privateKeyWrapper('//Alice');
      bob = privateKeyWrapper('//Bob');
      collectionIdForTesting = await createCollectionExpectSuccess({name: 'A', description: 'B', tokenPrefix: 'C', mode: {type: 'NFT'}});
    });
  });
  it('execute setCollectionLimits for not exists collection', async () => {
    await usingApi(async (api: ApiPromise) => {
      const collectionCount = await getCreatedCollectionCount(api);
      const nonExistedCollectionId = collectionCount + 1;
      tx = api.tx.unique.setCollectionLimits(
        nonExistedCollectionId,
        {
          accountTokenOwnershipLimit,
          sponsoredDataSize,
          // sponsoredMintSize,
          tokenLimit,
        },
      );
      await expect(submitTransactionExpectFailAsync(alice, tx)).to.be.rejected;
    });
  });
  it('execute setCollectionLimits from user who is not owner of this collection', async () => {
    await usingApi(async (api: ApiPromise) => {
      tx = api.tx.unique.setCollectionLimits(
        collectionIdForTesting,
        {
          accountTokenOwnershipLimit,
          sponsoredDataSize,
          // sponsoredMintSize,
          tokenLimit,
        },
      );
      await expect(submitTransactionExpectFailAsync(bob, tx)).to.be.rejected;
    });
  });
  it('execute setCollectionLimits from admin collection', async () => {
    await addCollectionAdminExpectSuccess(alice, collectionIdForTesting, bob.address);
    await usingApi(async (api: ApiPromise) => {
      tx = api.tx.unique.setCollectionLimits(
        collectionIdForTesting,
        {
          accountTokenOwnershipLimit,
          sponsoredDataSize,
          // sponsoredMintSize,
          tokenLimit,
        },
      );
      await expect(submitTransactionExpectFailAsync(bob, tx)).to.be.rejected;
    });
  });

  it('fails when trying to enable OwnerCanTransfer after it was disabled', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await setCollectionLimitsExpectSuccess(alice, collectionId, {
      accountTokenOwnershipLimit: accountTokenOwnershipLimit,
      sponsoredMintSize: sponsoredDataSize,
      tokenLimit: tokenLimit,
      sponsorTransferTimeout,
      ownerCanTransfer: false,
      ownerCanDestroy: true,
    });
    await setCollectionLimitsExpectFailure(alice, collectionId, {
      accountTokenOwnershipLimit: accountTokenOwnershipLimit,
      sponsoredMintSize: sponsoredDataSize,
      tokenLimit: tokenLimit,
      sponsorTransferTimeout,
      ownerCanTransfer: true,
      ownerCanDestroy: true,
    });
  });

  it('fails when trying to enable OwnerCanDestroy after it was disabled', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await setCollectionLimitsExpectSuccess(alice, collectionId, {
      accountTokenOwnershipLimit: accountTokenOwnershipLimit,
      sponsoredMintSize: sponsoredDataSize,
      tokenLimit: tokenLimit,
      sponsorTransferTimeout,
      ownerCanTransfer: true,
      ownerCanDestroy: false,
    });
    await setCollectionLimitsExpectFailure(alice, collectionId, {
      accountTokenOwnershipLimit: accountTokenOwnershipLimit,
      sponsoredMintSize: sponsoredDataSize,
      tokenLimit: tokenLimit,
      sponsorTransferTimeout,
      ownerCanTransfer: true,
      ownerCanDestroy: true,
    });
  });

  it('Setting the higher token limit fails', async () => {
    await usingApi(async () => {

      const collectionId = await createCollectionExpectSuccess();
      const collectionLimits = {
        accountTokenOwnershipLimit: accountTokenOwnershipLimit,
        sponsoredMintSize: sponsoredDataSize,
        tokenLimit: tokenLimit,
        sponsorTransferTimeout,
        ownerCanTransfer: true,
        ownerCanDestroy: true,
      };

      // The first time
      await setCollectionLimitsExpectSuccess(alice, collectionId, collectionLimits);

      // The second time - higher token limit
      collectionLimits.tokenLimit += 1;
      await setCollectionLimitsExpectFailure(alice, collectionId, collectionLimits);
    });
  });

});
