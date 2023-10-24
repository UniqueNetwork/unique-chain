import type {IKeyringPair} from '@polkadot/types/types';
import {Pallets} from '../util/index.js';
import {expect, itEth, usingEthPlaygrounds} from './util/index.js';
import {CollectionLimitField, CreateCollectionData} from './util/playgrounds/types.js';


describe('Can set collection limits', () => {
  let donor: IKeyringPair;

  before(async () => {
    await usingEthPlaygrounds(async (_helper, privateKey) => {
      donor = await privateKey({url: import.meta.url});
    });
  });

  [
    {case: 'nft' as const},
    {case: 'rft' as const, requiredPallets: [Pallets.ReFungible]},
    {case: 'ft' as const},
  ].map(testCase =>
    itEth.ifWithPallets(`for ${testCase.case}`, testCase.requiredPallets || [], async ({helper}) => {
      const owner = await helper.eth.createAccountWithBalance(donor);
      const {collectionId, collectionAddress} = await helper.eth.createCollection(owner, new CreateCollectionData('Limits', 'absolutely anything', 'FLO', testCase.case, 18)).send();
      const limits = {
        accountTokenOwnershipLimit: 1000,
        sponsoredDataSize: 1024,
        sponsoredDataRateLimit: 30,
        tokenLimit: 1000000,
        sponsorTransferTimeout: 6,
        sponsorApproveTimeout: 6,
        ownerCanTransfer: 1,
        ownerCanDestroy: 0,
        transfersEnabled: 0,
      };

      const expectedLimits = {
        accountTokenOwnershipLimit: 1000,
        sponsoredDataSize: 1024,
        sponsoredDataRateLimit: {blocks: 30},
        tokenLimit: 1000000,
        sponsorTransferTimeout: 6,
        sponsorApproveTimeout: 6,
        ownerCanTransfer: true,
        ownerCanDestroy: false,
        transfersEnabled: false,
      };

      const collectionEvm = await helper.ethNativeContract.collection(collectionAddress, testCase.case, owner);
      await collectionEvm.methods.setCollectionLimit({field: CollectionLimitField.AccountTokenOwnership, value: {status: true, value: limits.accountTokenOwnershipLimit}}).send();
      await collectionEvm.methods.setCollectionLimit({field: CollectionLimitField.SponsoredDataSize, value: {status: true, value: limits.sponsoredDataSize}}).send();
      await collectionEvm.methods.setCollectionLimit({field: CollectionLimitField.SponsoredDataRateLimit, value: {status: true, value: limits.sponsoredDataRateLimit}}).send();
      await collectionEvm.methods.setCollectionLimit({field: CollectionLimitField.TokenLimit, value: {status: true, value: limits.tokenLimit}}).send();
      await collectionEvm.methods.setCollectionLimit({field: CollectionLimitField.SponsorTransferTimeout, value: {status: true, value: limits.sponsorTransferTimeout}}).send();
      await collectionEvm.methods.setCollectionLimit({field: CollectionLimitField.SponsorApproveTimeout, value: {status: true, value: limits.sponsorApproveTimeout}}).send();
      await collectionEvm.methods.setCollectionLimit({field: CollectionLimitField.OwnerCanTransfer, value: {status: true, value: limits.ownerCanTransfer}}).send();
      await collectionEvm.methods.setCollectionLimit({field: CollectionLimitField.OwnerCanDestroy, value: {status: true, value: limits.ownerCanDestroy}}).send();
      await collectionEvm.methods.setCollectionLimit({field: CollectionLimitField.TransferEnabled, value: {status: true, value: limits.transfersEnabled}}).send();

      // Check limits from sub:
      const data = (await helper.rft.getData(collectionId))!;
      expect(data.raw.limits).to.deep.eq(expectedLimits);
      expect(await helper.collection.getEffectiveLimits(collectionId)).to.deep.eq(expectedLimits);
      // Check limits from eth:
      const limitsEvm = await collectionEvm.methods.collectionLimits().call({from: owner});
      expect(limitsEvm).to.have.length(9);
      expect(limitsEvm[0]).to.deep.eq([CollectionLimitField.AccountTokenOwnership.toString(), [true, limits.accountTokenOwnershipLimit.toString()]]);
      expect(limitsEvm[1]).to.deep.eq([CollectionLimitField.SponsoredDataSize.toString(), [true, limits.sponsoredDataSize.toString()]]);
      expect(limitsEvm[2]).to.deep.eq([CollectionLimitField.SponsoredDataRateLimit.toString(), [true, limits.sponsoredDataRateLimit.toString()]]);
      expect(limitsEvm[3]).to.deep.eq([CollectionLimitField.TokenLimit.toString(), [true, limits.tokenLimit.toString()]]);
      expect(limitsEvm[4]).to.deep.eq([CollectionLimitField.SponsorTransferTimeout.toString(), [true, limits.sponsorTransferTimeout.toString()]]);
      expect(limitsEvm[5]).to.deep.eq([CollectionLimitField.SponsorApproveTimeout.toString(), [true, limits.sponsorApproveTimeout.toString()]]);
      expect(limitsEvm[6]).to.deep.eq([CollectionLimitField.OwnerCanTransfer.toString(), [true, limits.ownerCanTransfer.toString()]]);
      expect(limitsEvm[7]).to.deep.eq([CollectionLimitField.OwnerCanDestroy.toString(), [true, limits.ownerCanDestroy.toString()]]);
      expect(limitsEvm[8]).to.deep.eq([CollectionLimitField.TransferEnabled.toString(), [true, limits.transfersEnabled.toString()]]);
    }));
});

describe('Cannot set invalid collection limits', () => {
  let donor: IKeyringPair;

  before(async () => {
    await usingEthPlaygrounds(async (_helper, privateKey) => {
      donor = await privateKey({url: import.meta.url});
    });
  });

  [
    {case: 'nft' as const},
    {case: 'rft' as const, requiredPallets: [Pallets.ReFungible]},
    {case: 'ft' as const},
  ].map(testCase =>
    itEth.ifWithPallets(`for ${testCase.case}`, testCase.requiredPallets || [], async ({helper}) => {
      const invalidLimits = {
        accountTokenOwnershipLimit: BigInt(Number.MAX_SAFE_INTEGER),
        transfersEnabled: 3,
      };

      const owner = await helper.eth.createAccountWithBalance(donor);
      const {collectionAddress} = await helper.eth.createCollection(owner, new CreateCollectionData('Limits', 'absolutely anything', 'ISNI', testCase.case, 18)).send();
      const collectionEvm = helper.ethNativeContract.collection(collectionAddress, testCase.case, owner);

      // Cannot set non-existing limit
      await expect(collectionEvm.methods
        .setCollectionLimit({field: 9, value: {status: true, value: 1}})
        .call()).to.be.rejectedWith('Returned error: VM Exception while processing transaction: revert value not convertible into enum "CollectionLimitField"');

      // Cannot disable limits
      await expect(collectionEvm.methods
        .setCollectionLimit({field: CollectionLimitField.AccountTokenOwnership, value: {status: false, value: 0}})
        .call()).to.be.rejectedWith('user can\'t disable limits');

      await expect(collectionEvm.methods
        .setCollectionLimit({field: CollectionLimitField.AccountTokenOwnership, value: {status: true, value: invalidLimits.accountTokenOwnershipLimit}})
        .call()).to.be.rejectedWith(`can't convert value to u32 "${invalidLimits.accountTokenOwnershipLimit}"`);

      await expect(collectionEvm.methods
        .setCollectionLimit({field: CollectionLimitField.TransferEnabled, value: {status: true, value: 3}})
        .call()).to.be.rejectedWith(`can't convert value to boolean "${invalidLimits.transfersEnabled}"`);

      expect(() => collectionEvm.methods
        .setCollectionLimit({field: CollectionLimitField.SponsoredDataSize, value: {status: true, value: -1}}).send()).to.throw('value out-of-bounds');
    }));

  [
    {case: 'nft' as const, requiredPallets: []},
    {case: 'rft' as const, requiredPallets: [Pallets.ReFungible]},
    {case: 'ft' as const, requiredPallets: []},
  ].map(testCase =>
    itEth.ifWithPallets(`Non-owner and non-admin cannot set collection limits for ${testCase.case}`, testCase.requiredPallets || [], async ({helper}) => {
      const owner = await helper.eth.createAccountWithBalance(donor);
      const nonOwner = await helper.eth.createAccountWithBalance(donor);
      const {collectionAddress} = await helper.eth.createCollection(owner, new CreateCollectionData('Limits', 'absolutely anything', 'FLO', testCase.case, 18)).send();

      const collectionEvm = await helper.ethNativeContract.collection(collectionAddress, testCase.case, owner);
      await expect(collectionEvm.methods
        .setCollectionLimit({field: CollectionLimitField.AccountTokenOwnership, value: {status: true, value: 1000}})
        .call({from: nonOwner}))
        .to.be.rejectedWith('NoPermission');

      await expect(collectionEvm.methods
        .setCollectionLimit({field: CollectionLimitField.AccountTokenOwnership, value: {status: true, value: 1000}})
        .send({from: nonOwner}))
        .to.be.rejected;
    }));
});
