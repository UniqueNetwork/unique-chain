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
import type {IKeyringPair} from '@polkadot/types/types';
import {Pallets, requirePalletsOrSkip} from '@unique/test-utils/util.js';
import {confirmations, expect, itEth, usingEthPlaygrounds} from '@unique/test-utils/eth/util.js';
import {CollectionLimitField} from '@unique/test-utils/eth/types.js';


describe('Create RFT collection from EVM', () => {
  let donor: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (helper, privateKey) => {
      requirePalletsOrSkip(this, helper, [Pallets.ReFungible]);
      donor = await privateKey({url: import.meta.url});
    });
  });

  itEth('Create collection', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);

    const name = 'CollectionEVM';
    const description = 'Some description';
    const prefix = 'token prefix';

    const {collectionId} = await helper.eth.createRFTCollection(owner, name, description, prefix);
    const data = (await helper.rft.getData(collectionId))!;
    const collection = helper.rft.getCollectionObject(collectionId);

    expect(data.name).to.be.eq(name);
    expect(data.description).to.be.eq(description);
    expect(data.raw.tokenPrefix).to.be.eq(prefix);
    expect(data.raw.mode).to.be.eq('ReFungible');

    const options = await collection.getOptions();

    expect(options.tokenPropertyPermissions).to.be.empty;
  });



  itEth('Create collection with properties & get description', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);

    const name = 'CollectionEVM';
    const description = 'Some description';
    const prefix = 'token prefix';
    const baseUri = 'BaseURI';

    const {collectionId, collectionAddress} = await helper.eth.createERC721MetadataCompatibleRFTCollection(owner, name, description, prefix, baseUri);
    const contract = helper.ethNativeContract.collection(collectionAddress, 'nft');

    const collection = helper.rft.getCollectionObject(collectionId);
    const data = (await collection.getData())!;

    expect(data.name).to.be.eq(name);
    expect(data.description).to.be.eq(description);
    expect(data.raw.tokenPrefix).to.be.eq(prefix);
    expect(data.raw.mode).to.be.eq('ReFungible');

    expect(await contract.description.staticCall()).to.deep.equal(description);

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
    const {collectionId, collectionAddress} = await helper.eth.createRFTCollection(owner, 'Sponsor', 'absolutely anything', 'ENVY');

    const collection = helper.ethNativeContract.collection(collectionAddress, 'rft', owner, true);
    await (await collection.setCollectionSponsor.send(sponsor)).wait(confirmations);

    let data = (await helper.rft.getData(collectionId))!;
    expect(data.raw.sponsorship.Unconfirmed).to.be.equal(evmToAddress(sponsor.address, Number(ss58Format)));

    await expect(collection.confirmCollectionSponsorship.staticCall()).to.be.rejectedWith('ConfirmSponsorshipFail');

    const sponsorCollection = helper.ethNativeContract.collection(collectionAddress, 'rft', sponsor, true);
    await (await sponsorCollection.confirmCollectionSponsorship.send()).wait(confirmations);

    data = (await helper.rft.getData(collectionId))!;
    expect(data.raw.sponsorship.Confirmed).to.be.equal(evmToAddress(sponsor.address, Number(ss58Format)));
  });

  itEth('[cross] Set sponsorship', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const sponsor = await helper.eth.createAccountWithBalance(donor);
    const ss58Format = helper.chain.getChainProperties().ss58Format;
    const {collectionId, collectionAddress} = await helper.eth.createRFTCollection(owner, 'Sponsor', 'absolutely anything', 'ENVY');

    const collection = helper.ethNativeContract.collection(collectionAddress, 'rft', owner);
    const sponsorCross = helper.ethCrossAccount.fromAddress(sponsor);
    await (await collection.setCollectionSponsorCross.send(sponsorCross)).wait(confirmations);

    let data = (await helper.rft.getData(collectionId))!;
    expect(data.raw.sponsorship.Unconfirmed).to.be.equal(evmToAddress(sponsor.address, Number(ss58Format)));

    await expect(collection.confirmCollectionSponsorship.staticCall()).to.be.rejectedWith('ConfirmSponsorshipFail');

    const sponsorCollection = helper.ethNativeContract.collection(collectionAddress, 'rft', sponsor);
    await (await sponsorCollection.confirmCollectionSponsorship.send()).wait(confirmations);

    data = (await helper.rft.getData(collectionId))!;
    expect(data.raw.sponsorship.Confirmed).to.be.equal(evmToAddress(sponsor.address, Number(ss58Format)));
  });

  itEth('Collection address exist', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const collectionAddressForNonexistentCollection = '0x17C4E6453CC49AAAAEACA894E6D9683E00112233';
    const collectionHelpers = helper.ethNativeContract.collectionHelpers(owner);

    expect(await collectionHelpers
      .isCollectionExist.staticCall(collectionAddressForNonexistentCollection))
      .to.be.false;

    const {collectionAddress} = await helper.eth.createRFTCollection(owner, 'Exister', 'absolutely anything', 'WIWT');
    expect(await collectionHelpers
      .isCollectionExist.staticCall(collectionAddress))
      .to.be.true;

    // check collectionOwner:
    const collectionEvm = helper.ethNativeContract.collection(collectionAddress, 'ft', owner, true);
    const collectionOwner = await collectionEvm.collectionOwner.staticCall();
    expect(helper.address.restoreCrossAccountFromBigInt(BigInt(collectionOwner.sub))).to.eq(helper.address.ethToSubstrate(owner.address, true));
  });
});

describe('(!negative tests!) Create RFT collection from EVM', () => {
  let donor: IKeyringPair;
  let nominal: bigint;

  before(async function() {
    await usingEthPlaygrounds(async (helper, privateKey) => {
      requirePalletsOrSkip(this, helper, [Pallets.ReFungible]);
      donor = await privateKey({url: import.meta.url});
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

      await expect(
        collectionHelper.createRFTCollection.staticCall(collectionName, description, tokenPrefix, {value: Number(2n * nominal)})
      ).to.be.rejectedWith('name is too long. Max length is ' + MAX_NAME_LENGTH);
    }
    {
      const MAX_DESCRIPTION_LENGTH = 256;
      const collectionName = 'A';
      const description = 'A'.repeat(MAX_DESCRIPTION_LENGTH + 1);
      const tokenPrefix = 'A';
      await expect(
        collectionHelper.createRFTCollection(collectionName, description, tokenPrefix, {value: Number(2n * nominal)})
      ).to.be.rejectedWith('description is too long. Max length is ' + MAX_DESCRIPTION_LENGTH);
    }
    {
      const MAX_TOKEN_PREFIX_LENGTH = 16;
      const collectionName = 'A';
      const description = 'A';
      const tokenPrefix = 'A'.repeat(MAX_TOKEN_PREFIX_LENGTH + 1);
      await expect(
        collectionHelper.createRFTCollection.staticCall(collectionName, description, tokenPrefix, {value: Number(2n * nominal)})
      ).to.be.rejectedWith('token_prefix is too long. Max length is ' + MAX_TOKEN_PREFIX_LENGTH);
    }
  });

  itEth('(!negative test!) Create collection (no funds)', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const collectionHelper = helper.ethNativeContract.collectionHelpers(owner);
    await expect(
      collectionHelper.createRFTCollection.staticCall('Peasantry', 'absolutely anything', 'TWIW', {value: Number(1n * nominal)})
    ).to.be.rejectedWith('Sent amount not equals to collection creation price (2000000000000000000)');
  });

  // Soft-deprecated
  itEth('(!negative test!) [eth] Check owner', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const peasant = helper.eth.createAccount();
    const {collectionAddress} = await helper.eth.createRFTCollection(owner, 'Transgressed', 'absolutely anything', 'YVNE');
    const peasantCollection = helper.ethNativeContract.collection(collectionAddress, 'rft', peasant, true);
    const EXPECTED_ERROR = 'NoPermission';
    {
      const sponsor = await helper.eth.createAccountWithBalance(donor);
      await expect(
        peasantCollection.setCollectionSponsor.staticCall(sponsor)
      ).to.be.rejectedWith(EXPECTED_ERROR);

      const sponsorCollection = helper.ethNativeContract.collection(collectionAddress, 'rft', sponsor, true);
      await expect(
        sponsorCollection.confirmCollectionSponsorship.staticCall()
      ).to.be.rejectedWith('ConfirmSponsorshipFail');
    }
    {
      await expect(
        peasantCollection.setCollectionLimit.staticCall({field: CollectionLimitField.AccountTokenOwnership, value: {status: true, value: 1000}})
      ).to.be.rejectedWith(EXPECTED_ERROR);
    }
  });

  itEth('(!negative test!) [cross] Check owner', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const peasant = helper.eth.createAccount();
    const {collectionAddress} = await helper.eth.createRFTCollection(owner, 'Transgressed', 'absolutely anything', 'YVNE');
    const peasantCollection = helper.ethNativeContract.collection(collectionAddress, 'rft', peasant);
    const EXPECTED_ERROR = 'NoPermission';
    {
      const sponsor = await helper.eth.createAccountWithBalance(donor);
      const sponsorCross = helper.ethCrossAccount.fromAddress(sponsor);
      await expect(
        peasantCollection.setCollectionSponsorCross.staticCall(sponsorCross)
      ).to.be.rejectedWith(EXPECTED_ERROR);

      const sponsorCollection = helper.ethNativeContract.collection(collectionAddress, 'rft', sponsor);
      await expect(
        sponsorCollection.confirmCollectionSponsorship.staticCall()
      ).to.be.rejectedWith('ConfirmSponsorshipFail');
    }
    {
      await expect(
        peasantCollection.setCollectionLimit.staticCall({field: CollectionLimitField.AccountTokenOwnership, value: {status: true, value: 1000}})
      ).to.be.rejectedWith(EXPECTED_ERROR);
    }
  });

  itEth('destroyCollection', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const {collectionAddress, collectionId} = await helper.eth.createRFTCollection(owner, 'Limits', 'absolutely anything', 'OLF');
    const collectionHelper = helper.ethNativeContract.collectionHelpers(owner);

    await expect(
      collectionHelper.destroyCollection.send(collectionAddress)
    ).to.be.fulfilled;

    expect(
      collectionHelper.isCollectionExist.staticCall(collectionAddress)
    ).to.be.false;

    expect(
      await helper.collection.getData(collectionId)
    ).to.be.null;
  });
});
