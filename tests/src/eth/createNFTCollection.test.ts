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

import {evmToAddress} from '@polkadot/util-crypto';
import {IKeyringPair} from '@polkadot/types/types';
import {expect, itEth, usingEthPlaygrounds} from './util';


describe('Create NFT collection from EVM', () => {
  let donor: IKeyringPair;

  before(async function () {
    await usingEthPlaygrounds(async (_helper, privateKey) => {
      donor = await privateKey({filename: __filename});
    });
  });

  itEth('Create collection with properties & get desctription', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);

    const name = 'CollectionEVM';
    const description = 'Some description';
    const prefix = 'token prefix';
    const baseUri = 'BaseURI';

    const {collectionId, collectionAddress, events} = await helper.eth.createERC721MetadataCompatibleNFTCollection(owner, name, description, prefix, baseUri);
    const contract = helper.ethNativeContract.collection(collectionAddress, 'nft');
    
    expect(events).to.be.deep.equal([
      {
        address: '0x6C4E9fE1AE37a41E93CEE429e8E1881aBdcbb54F',
        event: 'CollectionCreated',
        args: {
          owner: owner,
          collectionId: collectionAddress,
        },
      },
    ]);

    const collection = helper.nft.getCollectionObject(collectionId);
    const data = (await collection.getData())!;
    
    expect(data.name).to.be.eq(name);
    expect(data.description).to.be.eq(description);
    expect(data.raw.tokenPrefix).to.be.eq(prefix);
    expect(data.raw.mode).to.be.eq('NFT');
    
    expect(await contract.methods.description().call()).to.deep.equal(description);
    
    const options = await collection.getOptions();
    expect(options.tokenPropertyPermissions).to.be.deep.equal([
      {
        key: 'URI',
        permission: {mutable: true, collectionAdmin: true, tokenOwner: false},
      },
      {
        key: 'URISuffix',
        permission: {mutable: true, collectionAdmin: true, tokenOwner: false},
      },
    ]);
  });

  // Soft-deprecated
  itEth('[eth] Set sponsorship', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const sponsor = await helper.eth.createAccountWithBalance(donor);
    const ss58Format = helper.chain.getChainProperties().ss58Format;
    const {collectionId, collectionAddress} = await helper.eth.createNFTCollection(owner, 'Sponsor', 'absolutely anything', 'ROC');

    const collection = helper.ethNativeContract.collection(collectionAddress, 'nft', owner, true);
    await collection.methods.setCollectionSponsor(sponsor).send();

    let data = (await helper.nft.getData(collectionId))!;
    expect(data.raw.sponsorship.Unconfirmed).to.be.equal(evmToAddress(sponsor, Number(ss58Format)));

    await expect(collection.methods.confirmCollectionSponsorship().call()).to.be.rejectedWith('caller is not set as sponsor');

    const sponsorCollection = helper.ethNativeContract.collection(collectionAddress, 'nft', sponsor, true);
    await sponsorCollection.methods.confirmCollectionSponsorship().send();

    data = (await helper.nft.getData(collectionId))!;
    expect(data.raw.sponsorship.Confirmed).to.be.equal(evmToAddress(sponsor, Number(ss58Format)));
  });

  itEth('[cross] Set sponsorship & get description', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const sponsor = await helper.eth.createAccountWithBalance(donor);
    const ss58Format = helper.chain.getChainProperties().ss58Format;
    const description = 'absolutely anything';
    const {collectionId, collectionAddress} = await helper.eth.createNFTCollection(owner, 'Sponsor', description, 'ROC');

    const collection = helper.ethNativeContract.collection(collectionAddress, 'nft', owner);
    const sponsorCross = helper.ethCrossAccount.fromAddress(sponsor);
    await collection.methods.setCollectionSponsorCross(sponsorCross).send();

    let data = (await helper.nft.getData(collectionId))!;
    expect(data.raw.sponsorship.Unconfirmed).to.be.equal(evmToAddress(sponsor, Number(ss58Format)));

    await expect(collection.methods.confirmCollectionSponsorship().call()).to.be.rejectedWith('caller is not set as sponsor');

    const sponsorCollection = helper.ethNativeContract.collection(collectionAddress, 'nft', sponsor);
    await sponsorCollection.methods.confirmCollectionSponsorship().send();

    data = (await helper.nft.getData(collectionId))!;
    expect(data.raw.sponsorship.Confirmed).to.be.equal(evmToAddress(sponsor, Number(ss58Format)));
    
    expect(await sponsorCollection.methods.description().call()).to.deep.equal(description);
  });

  itEth('Set limits', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const {collectionId, collectionAddress} = await helper.eth.createNFTCollection(owner, 'Limits', 'absolutely anything', 'FLO');
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

    const collection = helper.ethNativeContract.collection(collectionAddress, 'nft', owner);
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

    const {collectionAddress} = await helper.eth.createNFTCollection(owner, 'Exister', 'absolutely anything', 'EVC');
    expect(await helper.ethNativeContract.collectionHelpers(collectionAddress)
      .methods.isCollectionExist(collectionAddress).call())
      .to.be.true;
  });
});

describe('(!negative tests!) Create NFT collection from EVM', () => {
  let donor: IKeyringPair;
  let nominal: bigint;

  before(async function () {
    await usingEthPlaygrounds(async (helper, privateKey) => {
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
        .createNFTCollection(collectionName, description, tokenPrefix)
        .call({value: Number(2n * nominal)})).to.be.rejectedWith('name is too long. Max length is ' + MAX_NAME_LENGTH);

    }
    {
      const MAX_DESCRIPTION_LENGTH = 256;
      const collectionName = 'A';
      const description = 'A'.repeat(MAX_DESCRIPTION_LENGTH + 1);
      const tokenPrefix = 'A';
      await expect(collectionHelper.methods
        .createNFTCollection(collectionName, description, tokenPrefix)
        .call({value: Number(2n * nominal)})).to.be.rejectedWith('description is too long. Max length is ' + MAX_DESCRIPTION_LENGTH);
    }
    {
      const MAX_TOKEN_PREFIX_LENGTH = 16;
      const collectionName = 'A';
      const description = 'A';
      const tokenPrefix = 'A'.repeat(MAX_TOKEN_PREFIX_LENGTH + 1);
      await expect(collectionHelper.methods
        .createNFTCollection(collectionName, description, tokenPrefix)
        .call({value: Number(2n * nominal)})).to.be.rejectedWith('token_prefix is too long. Max length is ' + MAX_TOKEN_PREFIX_LENGTH);
    }
  });

  itEth('(!negative test!) Create collection (no funds)', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const collectionHelper = helper.ethNativeContract.collectionHelpers(owner);
    await expect(collectionHelper.methods
      .createNFTCollection('Peasantry', 'absolutely anything', 'CVE')
      .call({value: Number(1n * nominal)})).to.be.rejectedWith('Sent amount not equals to collection creation price (2000000000000000000)');
  });

  // Soft-deprecated
  itEth('(!negative test!) [eth] Check owner', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const malfeasant = helper.eth.createAccount();
    const {collectionAddress} = await helper.eth.createNFTCollection(owner, 'Transgressed', 'absolutely anything', 'COR');
    const malfeasantCollection = helper.ethNativeContract.collection(collectionAddress, 'nft', malfeasant, true);
    const EXPECTED_ERROR = 'NoPermission';
    {
      const sponsor = await helper.eth.createAccountWithBalance(donor);
      await expect(malfeasantCollection.methods
        .setCollectionSponsor(sponsor)
        .call()).to.be.rejectedWith(EXPECTED_ERROR);

      const sponsorCollection = helper.ethNativeContract.collection(collectionAddress, 'nft', sponsor, true);
      await expect(sponsorCollection.methods
        .confirmCollectionSponsorship()
        .call()).to.be.rejectedWith('caller is not set as sponsor');
    }
    {
      await expect(malfeasantCollection.methods
        .setCollectionLimit('account_token_ownership_limit', '1000')
        .call()).to.be.rejectedWith(EXPECTED_ERROR);
    }
  });

  itEth('(!negative test!) [cross] Check owner', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const malfeasant = helper.eth.createAccount();
    const {collectionAddress} = await helper.eth.createNFTCollection(owner, 'Transgressed', 'absolutely anything', 'COR');
    const malfeasantCollection = helper.ethNativeContract.collection(collectionAddress, 'nft', malfeasant);
    const EXPECTED_ERROR = 'NoPermission';
    {
      const sponsor = await helper.eth.createAccountWithBalance(donor);
      const sponsorCross = helper.ethCrossAccount.fromAddress(sponsor);
      await expect(malfeasantCollection.methods
        .setCollectionSponsorCross(sponsorCross)
        .call()).to.be.rejectedWith(EXPECTED_ERROR);

      const sponsorCollection = helper.ethNativeContract.collection(collectionAddress, 'nft', sponsor);
      await expect(sponsorCollection.methods
        .confirmCollectionSponsorship()
        .call()).to.be.rejectedWith('caller is not set as sponsor');
    }
    {
      await expect(malfeasantCollection.methods
        .setCollectionLimit('account_token_ownership_limit', '1000')
        .call()).to.be.rejectedWith(EXPECTED_ERROR);
    }
  });

  itEth('(!negative test!) Set limits', async ({helper}) => {
    const invalidLimits = {
      accountTokenOwnershipLimit: BigInt(Number.MAX_SAFE_INTEGER),
      transfersEnabled: 3,
    };

    const owner = await helper.eth.createAccountWithBalance(donor);
    const {collectionAddress} = await helper.eth.createNFTCollection(owner, 'Limits', 'absolutely anything', 'OLF');
    const collectionEvm = helper.ethNativeContract.collection(collectionAddress, 'nft', owner);
    
    await expect(collectionEvm.methods
      .setCollectionLimit(Object.keys(invalidLimits)[0], invalidLimits.accountTokenOwnershipLimit)
      .call()).to.be.rejectedWith(`can't convert value to u32 "${invalidLimits.accountTokenOwnershipLimit}"`);
    
    await expect(collectionEvm.methods
      .setCollectionLimit(Object.keys(invalidLimits)[1], invalidLimits.transfersEnabled)
      .call()).to.be.rejectedWith(`can't convert value to boolean "${invalidLimits.transfersEnabled}"`);
  });

  itEth('destroyCollection', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const {collectionAddress} = await helper.eth.createNFTCollection(owner, 'Limits', 'absolutely anything', 'OLF');
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
  });
});