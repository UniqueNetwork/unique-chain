//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

// https://unique-network.readthedocs.io/en/latest/jsapi.html#setchainlimits
import { ApiPromise, Keyring } from '@polkadot/api';
import { IKeyringPair } from '@polkadot/types/types';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import usingApi, {submitTransactionAsync, submitTransactionExpectFailAsync} from './substrate/substrate-api';
import { ICollectionInterface } from './types';
import {
  createCollectionExpectSuccess, getCreatedCollectionCount,
  getCreateItemResult,
  getDetailedCollectionInfo,
  setCollectionLimitsExpectFailure,
  setCollectionLimitsExpectSuccess,
  addCollectionAdminExpectSuccess,
} from './util/helpers';

chai.use(chaiAsPromised);
const expect = chai.expect;

let alice: IKeyringPair;
let bob: IKeyringPair;
let collectionIdForTesting: number;

const accountTokenOwnershipLimit = 0;
const sponsoredDataSize = 0;
const sponsoredMintSize = 0;
const sponsorTimeout = 1;
const tokenLimit = 10;

describe('setCollectionLimits positive', () => {
  let tx;
  before(async () => {
    await usingApi(async () => {
      const keyring = new Keyring({ type: 'sr25519' });
      alice = keyring.addFromUri('//Alice');
      collectionIdForTesting = await createCollectionExpectSuccess({name: 'A', description: 'B', tokenPrefix: 'C', mode: {type: 'NFT'}});
    });
  });
  it('execute setCollectionLimits with predefined params ', async () => {
    await usingApi(async (api: ApiPromise) => {
      tx = api.tx.nft.setCollectionLimits(
        collectionIdForTesting,
        {
          accountTokenOwnershipLimit: accountTokenOwnershipLimit,
          sponsoredMintSize: sponsoredDataSize,
          tokenLimit: tokenLimit,
          sponsorTimeout: sponsorTimeout,
          ownerCanTransfer: true,
          ownerCanDestroy: true,
        },
      );
      const events = await submitTransactionAsync(alice, tx);
      const result = getCreateItemResult(events);

      // get collection limits defined previously
      const collectionInfo = await getDetailedCollectionInfo(api, collectionIdForTesting) as ICollectionInterface;

      // tslint:disable-next-line:no-unused-expression
      expect(result.success).to.be.true;
      expect(collectionInfo.limits.accountTokenOwnershipLimit).to.be.equal(accountTokenOwnershipLimit);
      expect(collectionInfo.limits.sponsoredDataSize).to.be.equal(sponsoredDataSize);
      expect(collectionInfo.limits.tokenLimit).to.be.equal(tokenLimit);
      expect(collectionInfo.limits.sponsorTimeout).to.be.equal(sponsorTimeout);
      expect(collectionInfo.limits.ownerCanTransfer).to.be.true;
      expect(collectionInfo.limits.ownerCanDestroy).to.be.true;
    });
  });

  it('Set the same token limit twice', async () => {
    await usingApi(async (api: ApiPromise) => {

      const collectionLimits = {
        accountTokenOwnershipLimit: accountTokenOwnershipLimit,
        sponsoredMintSize: sponsoredDataSize,
        tokenLimit: tokenLimit,
        sponsorTimeout: sponsorTimeout,
        ownerCanTransfer: true,
        ownerCanDestroy: true,
      };

      // The first time
      const tx1 = api.tx.nft.setCollectionLimits(
        collectionIdForTesting,
        collectionLimits,
      );
      const events1 = await submitTransactionAsync(alice, tx1);
      const result1 = getCreateItemResult(events1);
      const collectionInfo1 = await getDetailedCollectionInfo(api, collectionIdForTesting) as ICollectionInterface;

      // The second time
      const tx2 = api.tx.nft.setCollectionLimits(
        collectionIdForTesting,
        collectionLimits,
      );
      const events2 = await submitTransactionAsync(alice, tx2);
      const result2 = getCreateItemResult(events2);
      const collectionInfo2 = await getDetailedCollectionInfo(api, collectionIdForTesting) as ICollectionInterface;

      // tslint:disable-next-line:no-unused-expression
      expect(result1.success).to.be.true;
      expect(collectionInfo1.limits.tokenLimit).to.be.equal(tokenLimit);
      expect(result2.success).to.be.true;
      expect(collectionInfo2.limits.tokenLimit).to.be.equal(tokenLimit);
    });
  });

});

describe('setCollectionLimits negative', () => {
  let tx;
  before(async () => {
    await usingApi(async () => {
      const keyring = new Keyring({ type: 'sr25519' });
      alice = keyring.addFromUri('//Alice');
      bob = keyring.addFromUri('//Bob');
      collectionIdForTesting = await createCollectionExpectSuccess({name: 'A', description: 'B', tokenPrefix: 'C', mode: {type: 'NFT'}});
    });
  });
  it('execute setCollectionLimits for not exists collection', async () => {
    await usingApi(async (api: ApiPromise) => {
      const collectionCount = await getCreatedCollectionCount(api);
      const nonExistedCollectionId = collectionCount + 1;
      tx = api.tx.nft.setCollectionLimits(
        nonExistedCollectionId,
        {
          accountTokenOwnershipLimit,
          sponsoredDataSize,
          sponsoredMintSize,
          tokenLimit,
        },
      );
      await expect(submitTransactionExpectFailAsync(alice, tx)).to.be.rejected;
    });
  });
  it('execute setCollectionLimits from user who is not owner of this collection', async () => {
    await usingApi(async (api: ApiPromise) => {
      tx = api.tx.nft.setCollectionLimits(
        collectionIdForTesting,
        {
          accountTokenOwnershipLimit,
          sponsoredDataSize,
          sponsoredMintSize,
          tokenLimit,
        },
      );
      await expect(submitTransactionExpectFailAsync(bob, tx)).to.be.rejected;
    });
  });
  it('execute setCollectionLimits from admin collection', async () => {
    await addCollectionAdminExpectSuccess(alice, collectionIdForTesting, bob);
    await usingApi(async (api: ApiPromise) => {
      tx = api.tx.nft.setCollectionLimits(
        collectionIdForTesting,
        {
          accountTokenOwnershipLimit,
          sponsoredDataSize,
          sponsoredMintSize,
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
      sponsorTimeout: sponsorTimeout,
      ownerCanTransfer: false,
      ownerCanDestroy: true,
    });
    await setCollectionLimitsExpectFailure(alice, collectionId, {
      accountTokenOwnershipLimit: accountTokenOwnershipLimit,
      sponsoredMintSize: sponsoredDataSize,
      tokenLimit: tokenLimit,
      sponsorTimeout: sponsorTimeout,
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
      sponsorTimeout: sponsorTimeout,
      ownerCanTransfer: true,
      ownerCanDestroy: false,
    });
    await setCollectionLimitsExpectFailure(alice, collectionId, {
      accountTokenOwnershipLimit: accountTokenOwnershipLimit,
      sponsoredMintSize: sponsoredDataSize,
      tokenLimit: tokenLimit,
      sponsorTimeout: sponsorTimeout,
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
        sponsorTimeout: sponsorTimeout,
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
