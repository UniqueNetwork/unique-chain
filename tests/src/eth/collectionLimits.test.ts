import {IKeyringPair} from '@polkadot/types/types';
import {expect, itEth, usingEthPlaygrounds} from './util';


describe('Can set collection limits', () => {
  let donor: IKeyringPair;

  before(async () => {
    await usingEthPlaygrounds(async (_helper, privateKey) => {
      donor = await privateKey({filename: __filename});
    });
  });

  [
    {case: 'nft' as const, method: 'createNFTCollection' as const},
    {case: 'rft' as const, method: 'createRFTCollection' as const},
    {case: 'ft' as const, method: 'createFTCollection' as const},
  ].map(testCase =>
    itEth(`for ${testCase.case}`, async ({helper}) => {
      const owner = await helper.eth.createAccountWithBalance(donor);
      const {collectionId, collectionAddress} = await helper.eth.createCollecion(testCase.method, owner, 'Limits', 'absolutely anything', 'FLO', 18);
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
      await collection.methods.setCollectionLimit('accountTokenOwnershipLimit', limits.accountTokenOwnershipLimit).send();
      await collection.methods.setCollectionLimit('sponsoredDataSize', limits.sponsoredDataSize).send();
      await collection.methods.setCollectionLimit('sponsoredDataRateLimit', limits.sponsoredDataRateLimit).send();
      await collection.methods.setCollectionLimit('tokenLimit', limits.tokenLimit).send();
      await collection.methods.setCollectionLimit('sponsorTransferTimeout', limits.sponsorTransferTimeout).send();
      await collection.methods.setCollectionLimit('sponsorApproveTimeout', limits.sponsorApproveTimeout).send();
      await collection.methods.setCollectionLimit('ownerCanTransfer', limits.ownerCanTransfer).send();
      await collection.methods.setCollectionLimit('ownerCanDestroy', limits.ownerCanDestroy).send();
      await collection.methods.setCollectionLimit('transfersEnabled', limits.transfersEnabled).send();
      
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
    {case: 'nft' as const, method: 'createNFTCollection' as const},
    {case: 'rft' as const, method: 'createRFTCollection' as const},
    {case: 'ft' as const, method: 'createFTCollection' as const},
  ].map(testCase =>
    itEth(`for ${testCase.case}`, async ({helper}) => {
      const invalidLimits = {
        accountTokenOwnershipLimit: BigInt(Number.MAX_SAFE_INTEGER),
        transfersEnabled: 3,
      };

      const owner = await helper.eth.createAccountWithBalance(donor);
      const {collectionAddress} = await helper.eth.createCollecion(testCase.method, owner, 'Limits', 'absolutely anything', 'ISNI', 18);
      const collectionEvm = helper.ethNativeContract.collection(collectionAddress, testCase.case, owner);
      await expect(collectionEvm.methods
        .setCollectionLimit('badLimit', '1')
        .call()).to.be.rejectedWith('unknown limit "badLimit"');
      
      await expect(collectionEvm.methods
        .setCollectionLimit(Object.keys(invalidLimits)[0], invalidLimits.accountTokenOwnershipLimit)
        .call()).to.be.rejectedWith(`can't convert value to u32 "${invalidLimits.accountTokenOwnershipLimit}"`);
      
      await expect(collectionEvm.methods
        .setCollectionLimit(Object.keys(invalidLimits)[1], invalidLimits.transfersEnabled)
        .call()).to.be.rejectedWith(`can't convert value to boolean "${invalidLimits.transfersEnabled}"`);
    }));
});
  