import type {IKeyringPair} from '@polkadot/types/types';
import {Pallets} from '@unique/test-utils/util.js';
import {waitParams, expect, itEth, usingEthPlaygrounds} from '@unique/test-utils/eth/util.js';
import {CollectionLimitField, CreateCollectionData} from '@unique/test-utils/eth/types.js';


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
      await (await collectionEvm.setCollectionLimit.send({field: CollectionLimitField.AccountTokenOwnership, value: {status: true, value: limits.accountTokenOwnershipLimit}})).wait(...waitParams);
      await (await collectionEvm.setCollectionLimit.send({field: CollectionLimitField.SponsoredDataSize, value: {status: true, value: limits.sponsoredDataSize}})).wait(...waitParams);
      await (await collectionEvm.setCollectionLimit.send({field: CollectionLimitField.SponsoredDataRateLimit, value: {status: true, value: limits.sponsoredDataRateLimit}})).wait(...waitParams);
      await (await collectionEvm.setCollectionLimit.send({field: CollectionLimitField.TokenLimit, value: {status: true, value: limits.tokenLimit}})).wait(...waitParams);
      await (await collectionEvm.setCollectionLimit.send({field: CollectionLimitField.SponsorTransferTimeout, value: {status: true, value: limits.sponsorTransferTimeout}})).wait(...waitParams);
      await (await collectionEvm.setCollectionLimit.send({field: CollectionLimitField.SponsorApproveTimeout, value: {status: true, value: limits.sponsorApproveTimeout}})).wait(...waitParams);
      await (await collectionEvm.setCollectionLimit.send({field: CollectionLimitField.OwnerCanTransfer, value: {status: true, value: limits.ownerCanTransfer}})).wait(...waitParams);
      await (await collectionEvm.setCollectionLimit.send({field: CollectionLimitField.OwnerCanDestroy, value: {status: true, value: limits.ownerCanDestroy}})).wait(...waitParams);
      await (await collectionEvm.setCollectionLimit.send({field: CollectionLimitField.TransferEnabled, value: {status: true, value: limits.transfersEnabled}})).wait(...waitParams);

      // Check limits from sub:
      const data = (await helper.rft.getData(collectionId))!;
      expect(data.raw.limits).to.deep.eq(expectedLimits);
      expect(await helper.collection.getEffectiveLimits(collectionId)).to.deep.eq(expectedLimits);

      // Check limits from eth:
      const limitsEvm = await collectionEvm.collectionLimits.staticCall();
      expect(limitsEvm).to.have.length(9);
      expect(limitsEvm[0]).to.deep.eq([BigInt(CollectionLimitField.AccountTokenOwnership), [true, BigInt(limits.accountTokenOwnershipLimit)]]);
      expect(limitsEvm[1]).to.deep.eq([BigInt(CollectionLimitField.SponsoredDataSize), [true, BigInt(limits.sponsoredDataSize)]]);
      expect(limitsEvm[2]).to.deep.eq([BigInt(CollectionLimitField.SponsoredDataRateLimit), [true, BigInt(limits.sponsoredDataRateLimit)]]);
      expect(limitsEvm[3]).to.deep.eq([BigInt(CollectionLimitField.TokenLimit), [true, BigInt(limits.tokenLimit)]]);
      expect(limitsEvm[4]).to.deep.eq([BigInt(CollectionLimitField.SponsorTransferTimeout), [true, BigInt(limits.sponsorTransferTimeout)]]);
      expect(limitsEvm[5]).to.deep.eq([BigInt(CollectionLimitField.SponsorApproveTimeout), [true, BigInt(limits.sponsorApproveTimeout)]]);
      expect(limitsEvm[6]).to.deep.eq([BigInt(CollectionLimitField.OwnerCanTransfer), [true, BigInt(limits.ownerCanTransfer)]]);
      expect(limitsEvm[7]).to.deep.eq([BigInt(CollectionLimitField.OwnerCanDestroy), [true, BigInt(limits.ownerCanDestroy)]]);
      expect(limitsEvm[8]).to.deep.eq([BigInt(CollectionLimitField.TransferEnabled), [true, BigInt(limits.transfersEnabled)]]);
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
      await expect(collectionEvm.setCollectionLimit.staticCall({field: 9, value: {status: true, value: 1}})).to.be.rejectedWith('execution reverted: "value not convertible into enum \\"CollectionLimitField\\"');

      // Cannot disable limits
      await expect(collectionEvm.setCollectionLimit.staticCall({field: CollectionLimitField.AccountTokenOwnership, value: {status: false, value: 0}})).to.be.rejectedWith('execution reverted: "user can\'t disable limits');

      await expect(collectionEvm.setCollectionLimit.staticCall({field: CollectionLimitField.AccountTokenOwnership, value: {status: true, value: invalidLimits.accountTokenOwnershipLimit}})).to.be.rejectedWith(`execution reverted: "can't convert value to u32 \\"${invalidLimits.accountTokenOwnershipLimit}\\"`);

      await expect(collectionEvm.setCollectionLimit.staticCall({field: CollectionLimitField.TransferEnabled, value: {status: true, value: 3}})).to.be.rejectedWith(`execution reverted: "can't convert value to boolean \\"${invalidLimits.transfersEnabled}\\"`);

      expect(await collectionEvm.setCollectionLimit.send({
        field: CollectionLimitField.SponsoredDataSize,
        value: {status: true, value: -1},
      })).to.be.rejectedWith('value out-of-bounds');
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

      const collectionEvm = await helper.ethNativeContract.collection(collectionAddress, testCase.case, nonOwner);

      await expect(collectionEvm.setCollectionLimit.staticCall({
        field: CollectionLimitField.AccountTokenOwnership,
        value: {status: true, value: 1000n},
      })).to.be.rejectedWith('NoPermission');

      await expect(collectionEvm.setCollectionLimit.send({
        field: CollectionLimitField.AccountTokenOwnership,
        value: {status: true, value: 1000n},
      })).to.be.rejected;
    }));
});
