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
} from './util/helpers';

chai.use(chaiAsPromised);
const expect = chai.expect;

let alice: IKeyringPair;
let bob: IKeyringPair;
let collectionIdForTesting: number;

const accountTokenOwnershipLimit = 0;
const sponsoredDataSize = 0;
const sponsoredMintSize = 0;
const tokenLimit = 0;

describe('hooks', () => {
  before(async () => {
    await usingApi(async () => {
      const keyring = new Keyring({ type: 'sr25519' });
      alice = keyring.addFromUri('//Alice');
    });
  });
  it('choose or create collection for testing', async () => {
    await usingApi(async () => {
      collectionIdForTesting = await createCollectionExpectSuccess({name: 'A', description: 'B', tokenPrefix: 'C', mode: {type: 'NFT'}});
    });
  });
});

describe('setCollectionLimits positive', () => {
  let tx;
  before(async () => {
    await usingApi(async () => {
      const keyring = new Keyring({ type: 'sr25519' });
      alice = keyring.addFromUri('//Alice');
    });
  });
  it('execute setCollectionLimits with predefined params ', async () => {
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
      const events = await submitTransactionAsync(alice, tx);
      const result = getCreateItemResult(events);
      // tslint:disable-next-line:no-unused-expression
      expect(result.success).to.be.true;
    });
  });
  it('get collection limits defined in previous test', async () => {
    await usingApi(async (api: ApiPromise) => {
      const collectionInfo = await getDetailedCollectionInfo(api, collectionIdForTesting) as ICollectionInterface;
      expect(collectionInfo.Limits.AccountTokenOwnershipLimit.toNumber()).to.be.equal(accountTokenOwnershipLimit);
      expect(collectionInfo.Limits.SponsoredMintSize.toNumber()).to.be.equal(sponsoredMintSize);
      expect(collectionInfo.Limits.TokenLimit.toNumber()).to.be.equal(tokenLimit);
      expect(collectionInfo.Limits.SponsorTimeout.toNumber()).to.be.equal(sponsoredDataSize);
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
  it('execute setCollectionLimits with incorrect limits', async () => {
    await usingApi(async (api: ApiPromise) => {
      tx = api.tx.nft.setCollectionLimits(
        collectionIdForTesting,
        {
          accountTokenOwnershipLimit: 'awdawd',
          sponsorTransferTimeout: 'awd',
          sponsoredDataSize: '12312312312312312',
          tokenLimit: '-100',
        },
      );
      await expect(submitTransactionExpectFailAsync(alice, tx)).to.be.rejected;
    });
  });
});
