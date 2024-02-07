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

import type {IKeyringPair} from '@polkadot/types/types';
import {evmToAddress} from '@polkadot/util-crypto';
import {Pallets, requirePalletsOrSkip} from '@unique/test-utils/util.js';
import {expect, itEth, usingEthPlaygrounds} from './util/index.js';
import {CollectionLimitField} from './util/playgrounds/types.js';

const DECIMALS = 18;

describe('Create FT collection from EVM', () => {
  let donor: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (helper, privateKey) => {
      requirePalletsOrSkip(this, helper, [Pallets.Fungible]);
      donor = await privateKey({url: import.meta.url});
    });
  });

  // TODO move sponsorship tests to another file:
  // Soft-deprecated
  itEth('[eth] Set sponsorship', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const sponsor = await helper.eth.createAccountWithBalance(donor);
    const ss58Format = helper.chain.getChainProperties().ss58Format;
    const description = 'absolutely anything';

    const {collectionId, collectionAddress} = await helper.eth.createFungibleCollection(owner, 'Sponsor', DECIMALS, description, 'ENVY');

    const collection = await helper.ethNativeContract.collection(collectionAddress, 'ft', owner, true);
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

  itEth('Collection address exist', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const collectionAddressForNonexistentCollection = '0x17C4E6453CC49AAAAEACA894E6D9683E00112233';
    const collectionHelpers = helper.ethNativeContract.collectionHelpers(owner);

    expect(await collectionHelpers
      .methods.isCollectionExist(collectionAddressForNonexistentCollection).call())
      .to.be.false;

    const {collectionAddress} = await helper.eth.createFungibleCollection(owner, 'Exister', DECIMALS, 'absolutely anything', 'WIWT');
    expect(await collectionHelpers
      .methods.isCollectionExist(collectionAddress).call())
      .to.be.true;

    // check collectionOwner:
    const collectionEvm = helper.ethNativeContract.collection(collectionAddress, 'ft', owner, true);
    const collectionOwner = await collectionEvm.methods.collectionOwner().call();
    expect(helper.address.restoreCrossAccountFromBigInt(BigInt(collectionOwner.sub))).to.eq(helper.address.ethToSubstrate(owner, true));
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
        .setCollectionLimit({field: CollectionLimitField.AccountTokenOwnership, value: {status: true, value: 1000}})
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
        .setCollectionLimit({field: CollectionLimitField.AccountTokenOwnership, value: {status: true, value: 1000}})
        .call()).to.be.rejectedWith(EXPECTED_ERROR);
    }
  });
});
