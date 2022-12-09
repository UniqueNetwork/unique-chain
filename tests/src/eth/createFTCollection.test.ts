// Copyright 2019-2022 Unique Network (Gibraltar) Ltd.
// This file is part of Unique Network.

// Unique Network is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Unique Network is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with Unique Network. If not, see <http://www.gnu.org/licenses/>.

import {IKeyringPair} from '@polkadot/types/types';
import {evmToAddress} from '@polkadot/util-crypto';
import {Pallets, requirePalletsOrSkip} from '../util';
import {CollectionLimits, expect, itEth, usingEthPlaygrounds} from './util';

const DECIMALS = 18;

describe('Create FT collection from EVM', () => {
  let donor: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (helper, privateKey) => {
      requirePalletsOrSkip(this, helper, [Pallets.Fungible]);
      donor = await privateKey({filename: __filename});
    });
  });
  
  // Soft-deprecated
  itEth('[eth] Set sponsorship', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const sponsor = await helper.eth.createAccountWithBalance(donor);
    const ss58Format = helper.chain.getChainProperties().ss58Format;
    const description = 'absolutely anything';
    
    const {collectionId, collectionAddress} = await helper.eth.createFungibleCollection(owner, 'Sponsor', DECIMALS, description, 'ENVY');

    const collection = helper.ethNativeContract.collection(collectionAddress, 'ft', owner, true);
    await collection.methods.setCollectionSponsor(sponsor).send();

    let data = (await helper.rft.getData(collectionId))!;
    expect(data.raw.sponsorship.Unconfirmed).to.be.equal(evmToAddress(sponsor, Number(ss58Format)));

    await expect(collection.methods.confirmCollectionSponsorship().call()).to.be.rejectedWith('ConfirmSponsorshipFail');

    const sponsorCollection = helper.ethNativeContract.collection(collectionAddress, 'rft', sponsor, true);
    await sponsorCollection.methods.confirmCollectionSponsorship().send();

    data = (await helper.rft.getData(collectionId))!;
    expect(data.raw.sponsorship.Confirmed).to.be.equal(evmToAddress(sponsor, Number(ss58Format)));
  });

  itEth('[cross] Set sponsorship', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const sponsor = await helper.eth.createAccountWithBalance(donor);
    const ss58Format = helper.chain.getChainProperties().ss58Format;
    const description = 'absolutely anything';
    const {collectionId, collectionAddress} = await helper.eth.createFungibleCollection(owner, 'Sponsor', DECIMALS, description, 'ENVY');
    
    const collection = helper.ethNativeContract.collection(collectionAddress, 'rft', owner);
    const sponsorCross = helper.ethCrossAccount.fromAddress(sponsor);
    await collection.methods.setCollectionSponsorCross(sponsorCross).send();

    let data = (await helper.rft.getData(collectionId))!;
    expect(data.raw.sponsorship.Unconfirmed).to.be.equal(evmToAddress(sponsor, Number(ss58Format)));

    await expect(collection.methods.confirmCollectionSponsorship().call()).to.be.rejectedWith('ConfirmSponsorshipFail');

    const sponsorCollection = helper.ethNativeContract.collection(collectionAddress, 'rft', sponsor);
    await sponsorCollection.methods.confirmCollectionSponsorship().send();

    data = (await helper.rft.getData(collectionId))!;
    expect(data.raw.sponsorship.Confirmed).to.be.equal(evmToAddress(sponsor, Number(ss58Format)));
    expect(await collection.methods.description().call()).to.deep.equal(description);
  });

  itEth('Set limits', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const {collectionId, collectionAddress} = await helper.eth.createFungibleCollection(owner, 'Limits', DECIMALS, 'absolutely anything', 'INSI');
    const limits = {
      accountTokenOwnershipLimit: 1000,
      sponsoredDataSize: 1024,
      sponsoredDataRateLimit: 30,
      tokenLimit: 1000000,
      sponsorTransferTimeout: 6,
      sponsorApproveTimeout: 6,
      ownerCanTransfer: 0,
      ownerCanDestroy: 0,
      transfersEnabled: 0,
    };
    
    const expectedLimits = {
      accountTokenOwnershipLimit: 1000,
      sponsoredDataSize: 1024,
      sponsoredDataRateLimit: 30,
      tokenLimit: 1000000,
      sponsorTransferTimeout: 6,
      sponsorApproveTimeout: 6,
      ownerCanTransfer: false,
      ownerCanDestroy: false,
      transfersEnabled: false,
    };
   
    const collection = helper.ethNativeContract.collection(collectionAddress, 'ft', owner);
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
    expect(data.raw.limits.accountTokenOwnershipLimit).to.be.eq(expectedLimits.accountTokenOwnershipLimit);
    expect(data.raw.limits.sponsoredDataSize).to.be.eq(expectedLimits.sponsoredDataSize);
    expect(data.raw.limits.sponsoredDataRateLimit.blocks).to.be.eq(expectedLimits.sponsoredDataRateLimit);
    expect(data.raw.limits.tokenLimit).to.be.eq(expectedLimits.tokenLimit);
    expect(data.raw.limits.sponsorTransferTimeout).to.be.eq(expectedLimits.sponsorTransferTimeout);
    expect(data.raw.limits.sponsorApproveTimeout).to.be.eq(expectedLimits.sponsorApproveTimeout);
    expect(data.raw.limits.ownerCanTransfer).to.be.eq(expectedLimits.ownerCanTransfer);
    expect(data.raw.limits.ownerCanDestroy).to.be.eq(expectedLimits.ownerCanDestroy);
    expect(data.raw.limits.transfersEnabled).to.be.eq(expectedLimits.transfersEnabled);
  });

  itEth('Collection address exist', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const collectionAddressForNonexistentCollection = '0x17C4E6453CC49AAAAEACA894E6D9683E00112233';
    expect(await helper.ethNativeContract.collectionHelpers(collectionAddressForNonexistentCollection)
      .methods.isCollectionExist(collectionAddressForNonexistentCollection).call())
      .to.be.false;
    
    const {collectionAddress} = await helper.eth.createFungibleCollection(owner, 'Exister', DECIMALS, 'absolutely anything', 'WIWT');
    expect(await helper.ethNativeContract.collectionHelpers(collectionAddress)
      .methods.isCollectionExist(collectionAddress).call())
      .to.be.true;
  });
  
  itEth('destroyCollection', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const {collectionAddress, collectionId} = await helper.eth.createFungibleCollection(owner, 'Exister', DECIMALS, 'absolutely anything', 'WIWT');
    const collectionHelper = helper.ethNativeContract.collectionHelpers(owner);

    const result = await collectionHelper.methods
      .destroyCollection(collectionAddress)
      .send({from: owner});

    const events = helper.eth.normalizeEvents(result.events);
    
    expect(events).to.be.deep.equal([
      {
        address: collectionHelper.options.address,
        event: 'CollectionDestroyed',
        args: {
          collectionId: collectionAddress,
        },
      },
    ]);

    expect(await collectionHelper.methods
      .isCollectionExist(collectionAddress)
      .call()).to.be.false;
    expect(await helper.collection.getData(collectionId)).to.be.null;
  });
});

describe('(!negative tests!) Create FT collection from EVM', () => {
  let donor: IKeyringPair;
  let nominal: bigint;

  before(async function() {
    await usingEthPlaygrounds(async (helper, privateKey) => {
      requirePalletsOrSkip(this, helper, [Pallets.Fungible]);
      donor = await privateKey({filename: __filename});
      nominal = helper.balance.getOneTokenNominal();
    });
  });

  itEth('(!negative test!) Create collection (bad lengths)', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const collectionHelper = helper.ethNativeContract.collectionHelpers(owner);
    {
      const MAX_NAME_LENGTH = 64;
      const collectionName = 'A'.repeat(MAX_NAME_LENGTH + 1);
      const description = 'A';
      const tokenPrefix = 'A';

      await expect(collectionHelper.methods
        .createFTCollection(collectionName, DECIMALS, description, tokenPrefix)
        .call({value: Number(2n * nominal)})).to.be.rejectedWith('name is too long. Max length is ' + MAX_NAME_LENGTH);
    }
    {
      const MAX_DESCRIPTION_LENGTH = 256;
      const collectionName = 'A';
      const description = 'A'.repeat(MAX_DESCRIPTION_LENGTH + 1);
      const tokenPrefix = 'A';
      await expect(collectionHelper.methods
        .createFTCollection(collectionName, DECIMALS, description, tokenPrefix)
        .call({value: Number(2n * nominal)})).to.be.rejectedWith('description is too long. Max length is ' + MAX_DESCRIPTION_LENGTH);
    }
    {
      const MAX_TOKEN_PREFIX_LENGTH = 16;
      const collectionName = 'A';
      const description = 'A';
      const tokenPrefix = 'A'.repeat(MAX_TOKEN_PREFIX_LENGTH + 1);
      await expect(collectionHelper.methods
        .createFTCollection(collectionName, DECIMALS, description, tokenPrefix)
        .call({value: Number(2n * nominal)})).to.be.rejectedWith('token_prefix is too long. Max length is ' + MAX_TOKEN_PREFIX_LENGTH);
    }
  });
  
  itEth('(!negative test!) cannot create collection if value !== 2', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const collectionHelper = helper.ethNativeContract.collectionHelpers(owner);
    const expects = [0n, 1n, 30n].map(async value => {
      await expect(collectionHelper.methods
        .createFTCollection('Peasantry', DECIMALS, 'absolutely anything', 'TWIW')
        .call({value: Number(value * nominal)})).to.be.rejectedWith('Sent amount not equals to collection creation price (2000000000000000000)');
    });
    await Promise.all(expects);
  });

  // Soft-deprecated
  itEth('(!negative test!) [eth] Check owner', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const peasant = helper.eth.createAccount();
    const {collectionAddress} = await helper.eth.createFungibleCollection(owner, 'Transgressed', DECIMALS, 'absolutely anything', 'YVNE');
    const peasantCollection = helper.ethNativeContract.collection(collectionAddress, 'ft', peasant, true);
    const EXPECTED_ERROR = 'NoPermission';
    {
      const sponsor = await helper.eth.createAccountWithBalance(donor);
      await expect(peasantCollection.methods
        .setCollectionSponsor(sponsor)
        .call()).to.be.rejectedWith(EXPECTED_ERROR);
      
      const sponsorCollection = helper.ethNativeContract.collection(collectionAddress, 'ft', sponsor, true);
      await expect(sponsorCollection.methods
        .confirmCollectionSponsorship()
        .call()).to.be.rejectedWith('ConfirmSponsorshipFail');
    }
    {
      await expect(peasantCollection.methods
        .setCollectionLimit('accountTokenOwnershipLimit', '1000')
        .setCollectionLimit(CollectionLimits.AccountTokenOwnership, true, 1000)
        .call()).to.be.rejectedWith(EXPECTED_ERROR);
    }
  });

  itEth('(!negative test!) [cross] Check owner', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const peasant = helper.eth.createAccount();
    const {collectionAddress} = await helper.eth.createFungibleCollection(owner, 'Transgressed', DECIMALS, 'absolutely anything', 'YVNE');
    const peasantCollection = helper.ethNativeContract.collection(collectionAddress, 'ft', peasant);
    const EXPECTED_ERROR = 'NoPermission';
    {
      const sponsor = await helper.eth.createAccountWithBalance(donor);
      const sponsorCross = helper.ethCrossAccount.fromAddress(sponsor);
      await expect(peasantCollection.methods
        .setCollectionSponsorCross(sponsorCross)
        .call()).to.be.rejectedWith(EXPECTED_ERROR);
      
      const sponsorCollection = helper.ethNativeContract.collection(collectionAddress, 'ft', sponsor);
      await expect(sponsorCollection.methods
        .confirmCollectionSponsorship()
        .call()).to.be.rejectedWith('ConfirmSponsorshipFail');
    }
    {
      await expect(peasantCollection.methods
        .setCollectionLimit('accountTokenOwnershipLimit', '1000')
        .call()).to.be.rejectedWith(EXPECTED_ERROR);
    }
  });

  itEth('(!negative test!) Set limits', async ({helper}) => {

    const invalidLimits = {
      accountTokenOwnershipLimit: BigInt(Number.MAX_SAFE_INTEGER),
      transfersEnabled: 3,
    };

    const owner = await helper.eth.createAccountWithBalance(donor);
    const {collectionAddress} = await helper.eth.createFungibleCollection(owner, 'Limits', DECIMALS, 'absolutely anything', 'ISNI');
    const collectionEvm = helper.ethNativeContract.collection(collectionAddress, 'ft', owner);
    await expect(collectionEvm.methods
      .setCollectionLimit(20, true, '1')
      .call()).to.be.rejectedWith('Returned error: VM Exception while processing transaction: revert Value not convertible into enum "CollectionLimits"');
    
    await expect(collectionEvm.methods
      .setCollectionLimit(CollectionLimits.AccountTokenOwnership, true, invalidLimits.accountTokenOwnershipLimit)
      .call()).to.be.rejectedWith(`can't convert value to u32 "${invalidLimits.accountTokenOwnershipLimit}"`);
    
    await expect(collectionEvm.methods
      .setCollectionLimit(CollectionLimits.TransferEnabled, true, invalidLimits.transfersEnabled)
      .call()).to.be.rejectedWith(`can't convert value to boolean "${invalidLimits.transfersEnabled}"`);
  });

   
    
});
