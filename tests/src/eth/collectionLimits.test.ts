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
     
      const collection = helper.ethNativeContract.collection(collectionAddress, testCase.case, owner);
      await collection.methods.setCollectionLimit(CollectionLimits.AccountTokenOwnership, true, limits.accountTokenOwnershipLimit).send();
      await collection.methods.setCollectionLimit(CollectionLimits.SponsoredDataSize, true, limits.sponsoredDataSize).send();
      await collection.methods.setCollectionLimit(CollectionLimits.SponsoredDataRateLimit, true, limits.sponsoredDataRateLimit).send();
      await collection.methods.setCollectionLimit(CollectionLimits.TokenLimit, true, limits.tokenLimit).send();
      await collection.methods.setCollectionLimit(CollectionLimits.SponsorTransferTimeout, true, limits.sponsorTransferTimeout).send();
      await collection.methods.setCollectionLimit(CollectionLimits.SponsorApproveTimeout, true, limits.sponsorApproveTimeout).send();
      await collection.methods.setCollectionLimit(CollectionLimits.OwnerCanTransfer, true, limits.ownerCanTransfer).send();
      await collection.methods.setCollectionLimit(CollectionLimits.OwnerCanDestroy, true, limits.ownerCanDestroy).send();
      await collection.methods.setCollectionLimit(CollectionLimits.TransferEnabled, true, limits.transfersEnabled).send();
      
      const data = (await helper.rft.getData(collectionId))!;
      expect(data.raw.limits).to.deep.eq(expectedLimits);
      expect(await helper.collection.getEffectiveLimits(collectionId)).to.deep.eq(expectedLimits);
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

      await expect(collectionEvm.methods
        .setCollectionLimit(CollectionLimits.SponsoredDataSize, true, -1)
        .call()).to.be.rejectedWith('Error: value out-of-bounds (argument="value", value=-1, code=INVALID_ARGUMENT');
    }));
});
