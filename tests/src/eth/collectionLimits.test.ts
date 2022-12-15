import {IKeyringPair} from '@polkadot/types/types';
import {Pallets} from '../util';
import {CollectionLimits, expect, itEth, usingEthPlaygrounds} from './util';


describe('Can set collection limits', () => {
  let donor: IKeyringPair;

  before(async () => {
    await usingEthPlaygrounds(async (_helper, privateKey) => {
      donor = await privateKey({filename: __filename});
    });
  });

  [
    {case: 'nft' as const},
    {case: 'rft' as const, requiredPallets: [Pallets.ReFungible]},
    {case: 'ft' as const},
  ].map(testCase =>
    itEth.ifWithPallets(`for ${testCase.case}`, testCase.requiredPallets || [], async ({helper}) => {
      const owner = await helper.eth.createAccountWithBalance(donor);
      const {collectionId, collectionAddress} = await helper.eth.createCollection(testCase.case, owner, 'Limits', 'absolutely anything', 'FLO', 18);
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
     
      const collectionEvm = helper.ethNativeContract.collection(collectionAddress, testCase.case, owner);
      await collectionEvm.methods.setCollectionLimit(CollectionLimits.AccountTokenOwnership, true, limits.accountTokenOwnershipLimit).send();
      await collectionEvm.methods.setCollectionLimit(CollectionLimits.SponsoredDataSize, true, limits.sponsoredDataSize).send();
      await collectionEvm.methods.setCollectionLimit(CollectionLimits.SponsoredDataRateLimit, true, limits.sponsoredDataRateLimit).send();
      await collectionEvm.methods.setCollectionLimit(CollectionLimits.TokenLimit, true, limits.tokenLimit).send();
      await collectionEvm.methods.setCollectionLimit(CollectionLimits.SponsorTransferTimeout, true, limits.sponsorTransferTimeout).send();
      await collectionEvm.methods.setCollectionLimit(CollectionLimits.SponsorApproveTimeout, true, limits.sponsorApproveTimeout).send();
      await collectionEvm.methods.setCollectionLimit(CollectionLimits.OwnerCanTransfer, true, limits.ownerCanTransfer).send();
      await collectionEvm.methods.setCollectionLimit(CollectionLimits.OwnerCanDestroy, true, limits.ownerCanDestroy).send();
      await collectionEvm.methods.setCollectionLimit(CollectionLimits.TransferEnabled, true, limits.transfersEnabled).send();
      
      // Check limits from sub:
      const data = (await helper.rft.getData(collectionId))!;
      expect(data.raw.limits).to.deep.eq(expectedLimits);
      expect(await helper.collection.getEffectiveLimits(collectionId)).to.deep.eq(expectedLimits);
      // Check limits from eth:
      const limitsEvm = await collectionEvm.methods.collectionLimits().call({from: owner});
      expect(limitsEvm).to.have.length(9);
      expect(limitsEvm[0]).to.deep.eq(['0', true, limits.accountTokenOwnershipLimit.toString()]);
      expect(limitsEvm[1]).to.deep.eq(['1', true, limits.sponsoredDataSize.toString()]);
      expect(limitsEvm[2]).to.deep.eq(['2', true, limits.sponsoredDataRateLimit.toString()]);
      expect(limitsEvm[3]).to.deep.eq(['3', true, limits.tokenLimit.toString()]);
      expect(limitsEvm[4]).to.deep.eq(['4', true, limits.sponsorTransferTimeout.toString()]);
      expect(limitsEvm[5]).to.deep.eq(['5', true, limits.sponsorApproveTimeout.toString()]);
      expect(limitsEvm[6]).to.deep.eq(['6', true, limits.ownerCanTransfer.toString()]);
      expect(limitsEvm[7]).to.deep.eq(['7', true, limits.ownerCanDestroy.toString()]);
      expect(limitsEvm[8]).to.deep.eq(['8', true, limits.transfersEnabled.toString()]);
    }));
});

describe('Cannot set invalid collection limits', () => {
  let donor: IKeyringPair;

  before(async () => {
    await usingEthPlaygrounds(async (_helper, privateKey) => {
      donor = await privateKey({filename: __filename});
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
      const {collectionAddress} = await helper.eth.createCollection(testCase.case, owner, 'Limits', 'absolutely anything', 'ISNI', 18);
      const collectionEvm = helper.ethNativeContract.collection(collectionAddress, testCase.case, owner);

      // Cannot set non-existing limit
      await expect(collectionEvm.methods
        .setCollectionLimit(9, true, 1)
        .call()).to.be.rejectedWith('Returned error: VM Exception while processing transaction: revert Value not convertible into enum "CollectionLimits"');      
        
      // Cannot disable limits
      await expect(collectionEvm.methods
        .setCollectionLimit(CollectionLimits.AccountTokenOwnership, false, 200)
        .call()).to.be.rejectedWith('Returned error: VM Exception while processing transaction: revert user can\'t disable limits');

      await expect(collectionEvm.methods
        .setCollectionLimit(CollectionLimits.AccountTokenOwnership, true, invalidLimits.accountTokenOwnershipLimit)
        .call()).to.be.rejectedWith(`can't convert value to u32 "${invalidLimits.accountTokenOwnershipLimit}"`);
 
      await expect(collectionEvm.methods
        .setCollectionLimit(CollectionLimits.TransferEnabled, true, 3)
        .call()).to.be.rejectedWith(`can't convert value to boolean "${invalidLimits.transfersEnabled}"`);

      expect(() => collectionEvm.methods
        .setCollectionLimit(CollectionLimits.SponsoredDataSize, true, -1).send()).to.throw('value out-of-bounds');
    }));

  [
    {case: 'nft' as const, requiredPallets: []},
    {case: 'rft' as const, requiredPallets: [Pallets.ReFungible]},
    {case: 'ft' as const, requiredPallets: []},
  ].map(testCase =>
    itEth.ifWithPallets(`Non-owner and non-admin cannot set collection limits for ${testCase.case}`, testCase.requiredPallets || [], async ({helper}) => {
      const owner = await helper.eth.createAccountWithBalance(donor);
      const nonOwner = await helper.eth.createAccountWithBalance(donor);
      const {collectionAddress} = await helper.eth.createCollection(testCase.case, owner, 'Limits', 'absolutely anything', 'FLO', 18);

      const collectionEvm = helper.ethNativeContract.collection(collectionAddress, testCase.case, owner);
      await expect(collectionEvm.methods
        .setCollectionLimit(CollectionLimits.AccountTokenOwnership, true, 1000)
        .call({from: nonOwner}))
        .to.be.rejectedWith('NoPermission');

      await expect(collectionEvm.methods
        .setCollectionLimit(CollectionLimits.AccountTokenOwnership, true, 1000)
        .send({from: nonOwner}))
        .to.be.rejected;
    }));
});
