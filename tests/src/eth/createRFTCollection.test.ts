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
import {Pallets, requirePalletsOrSkip} from '../util/playgrounds';
import {expect, itEth, usingEthPlaygrounds} from './util/playgrounds';


describe('Create RFT collection from EVM', () => {
  let donor: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (helper, privateKey) => {
      requirePalletsOrSkip(this, helper, [Pallets.ReFungible]);
      donor = privateKey('//Alice');
    });
  });

  itEth('Create collection', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    
    const name = 'CollectionEVM';
    const description = 'Some description';
    const prefix = 'token prefix';
  
    // todo:playgrounds this might fail when in async environment.
    const collectionCountBefore = +(await helper.callRpc('api.rpc.unique.collectionStats')).created;
    const {collectionId} = await helper.eth.createRefungibleCollection(owner, name, description, prefix);
    const collectionCountAfter = +(await helper.callRpc('api.rpc.unique.collectionStats')).created;
  
    const data = (await helper.rft.getData(collectionId))!;

    expect(collectionCountAfter - collectionCountBefore).to.be.eq(1);
    expect(collectionId).to.be.eq(collectionCountAfter);
    expect(data.name).to.be.eq(name);
    expect(data.description).to.be.eq(description);
    expect(data.raw.tokenPrefix).to.be.eq(prefix);
    expect(data.raw.mode).to.be.eq('ReFungible');
  });

  // todo:playgrounds this test will fail when in async environment.
  itEth('Check collection address exist', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);

    const expectedCollectionId = +(await helper.callRpc('api.rpc.unique.collectionStats')).created + 1;
    const expectedCollectionAddress = helper.ethAddress.fromCollectionId(expectedCollectionId);
    const collectionHelpers = helper.ethNativeContract.collectionHelpers(owner);

    expect(await collectionHelpers.methods
      .isCollectionExist(expectedCollectionAddress)
      .call()).to.be.false;

    await collectionHelpers.methods
      .createRFTCollection('A', 'A', 'A')
      .send({value: Number(2n * helper.balance.getOneTokenNominal())});
    
    expect(await collectionHelpers.methods
      .isCollectionExist(expectedCollectionAddress)
      .call()).to.be.true;
  });
  
  itEth('Set sponsorship', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const sponsor = await helper.eth.createAccountWithBalance(donor);
    const ss58Format = helper.chain.getChainProperties().ss58Format;
    const {collectionId, collectionAddress} = await helper.eth.createRefungibleCollection(owner, 'Sponsor', 'absolutely anything', 'ENVY');

    const collection = helper.ethNativeContract.collection(collectionAddress, 'rft', owner);
    await collection.methods.setCollectionSponsor(sponsor).send();

    let data = (await helper.rft.getData(collectionId))!;
    expect(data.raw.sponsorship.Unconfirmed).to.be.equal(evmToAddress(sponsor, Number(ss58Format)));

    await expect(collection.methods.confirmCollectionSponsorship().call()).to.be.rejectedWith('caller is not set as sponsor');

    const sponsorCollection = helper.ethNativeContract.collection(collectionAddress, 'rft', sponsor);
    await sponsorCollection.methods.confirmCollectionSponsorship().send();

    data = (await helper.rft.getData(collectionId))!;
    expect(data.raw.sponsorship.Confirmed).to.be.equal(evmToAddress(sponsor, Number(ss58Format)));
  });

  itEth('Set limits', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const {collectionId, collectionAddress} = await helper.eth.createRefungibleCollection(owner, 'Limits', 'absolutely anything', 'INSI');
    const limits = {
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

    const collection = helper.ethNativeContract.collection(collectionAddress, 'rft', owner);
    await collection.methods['setCollectionLimit(string,uint32)']('accountTokenOwnershipLimit', limits.accountTokenOwnershipLimit).send();
    await collection.methods['setCollectionLimit(string,uint32)']('sponsoredDataSize', limits.sponsoredDataSize).send();
    await collection.methods['setCollectionLimit(string,uint32)']('sponsoredDataRateLimit', limits.sponsoredDataRateLimit).send();
    await collection.methods['setCollectionLimit(string,uint32)']('tokenLimit', limits.tokenLimit).send();
    await collection.methods['setCollectionLimit(string,uint32)']('sponsorTransferTimeout', limits.sponsorTransferTimeout).send();
    await collection.methods['setCollectionLimit(string,uint32)']('sponsorApproveTimeout', limits.sponsorApproveTimeout).send();
    await collection.methods['setCollectionLimit(string,bool)']('ownerCanTransfer', limits.ownerCanTransfer).send();
    await collection.methods['setCollectionLimit(string,bool)']('ownerCanDestroy', limits.ownerCanDestroy).send();
    await collection.methods['setCollectionLimit(string,bool)']('transfersEnabled', limits.transfersEnabled).send();
    
    const data = (await helper.rft.getData(collectionId))!;
    expect(data.raw.limits.accountTokenOwnershipLimit).to.be.eq(limits.accountTokenOwnershipLimit);
    expect(data.raw.limits.sponsoredDataSize).to.be.eq(limits.sponsoredDataSize);
    expect(data.raw.limits.sponsoredDataRateLimit.blocks).to.be.eq(limits.sponsoredDataRateLimit);
    expect(data.raw.limits.tokenLimit).to.be.eq(limits.tokenLimit);
    expect(data.raw.limits.sponsorTransferTimeout).to.be.eq(limits.sponsorTransferTimeout);
    expect(data.raw.limits.sponsorApproveTimeout).to.be.eq(limits.sponsorApproveTimeout);
    expect(data.raw.limits.ownerCanTransfer).to.be.eq(limits.ownerCanTransfer);
    expect(data.raw.limits.ownerCanDestroy).to.be.eq(limits.ownerCanDestroy);
    expect(data.raw.limits.transfersEnabled).to.be.eq(limits.transfersEnabled);
  });

  itEth('Collection address exist', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const collectionAddressForNonexistentCollection = '0x17C4E6453CC49AAAAEACA894E6D9683E00112233';
    expect(await helper.ethNativeContract.collectionHelpers(collectionAddressForNonexistentCollection)
      .methods.isCollectionExist(collectionAddressForNonexistentCollection).call())
      .to.be.false;
    
    const {collectionAddress} = await helper.eth.createRefungibleCollection(owner, 'Exister', 'absolutely anything', 'WIWT');
    expect(await helper.ethNativeContract.collectionHelpers(collectionAddress)
      .methods.isCollectionExist(collectionAddress).call())
      .to.be.true;
  });
});

describe('(!negative tests!) Create RFT collection from EVM', () => {
  let donor: IKeyringPair;
  let nominal: bigint;

  before(async function() {
    await usingEthPlaygrounds(async (helper, privateKey) => {
      requirePalletsOrSkip(this, helper, [Pallets.ReFungible]);
      donor = privateKey('//Alice');
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
        .createRFTCollection(collectionName, description, tokenPrefix)
        .call({value: Number(2n * nominal)})).to.be.rejectedWith('name is too long. Max length is ' + MAX_NAME_LENGTH);
    }
    {
      const MAX_DESCRIPTION_LENGTH = 256;
      const collectionName = 'A';
      const description = 'A'.repeat(MAX_DESCRIPTION_LENGTH + 1);
      const tokenPrefix = 'A';
      await expect(collectionHelper.methods
        .createRFTCollection(collectionName, description, tokenPrefix)
        .call({value: Number(2n * nominal)})).to.be.rejectedWith('description is too long. Max length is ' + MAX_DESCRIPTION_LENGTH);
    }
    {
      const MAX_TOKEN_PREFIX_LENGTH = 16;
      const collectionName = 'A';
      const description = 'A';
      const tokenPrefix = 'A'.repeat(MAX_TOKEN_PREFIX_LENGTH + 1);
      await expect(collectionHelper.methods
        .createRFTCollection(collectionName, description, tokenPrefix)
        .call({value: Number(2n * nominal)})).to.be.rejectedWith('token_prefix is too long. Max length is ' + MAX_TOKEN_PREFIX_LENGTH);
    }
  });
  
  itEth('(!negative test!) Create collection (no funds)', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const collectionHelper = helper.ethNativeContract.collectionHelpers(owner);
    await expect(collectionHelper.methods
      .createRFTCollection('Peasantry', 'absolutely anything', 'TWIW')
      .call({value: Number(1n * nominal)})).to.be.rejectedWith('Sent amount not equals to collection creation price (2000000000000000000)');
  });

  itEth('(!negative test!) Check owner', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const peasant = helper.eth.createAccount();
    const {collectionAddress} = await helper.eth.createRefungibleCollection(owner, 'Transgressed', 'absolutely anything', 'YVNE');
    const peasantCollection = helper.ethNativeContract.collection(collectionAddress, 'rft', peasant);
    const EXPECTED_ERROR = 'NoPermission';
    {
      const sponsor = await helper.eth.createAccountWithBalance(donor);
      await expect(peasantCollection.methods
        .setCollectionSponsor(sponsor)
        .call()).to.be.rejectedWith(EXPECTED_ERROR);
      
      const sponsorCollection = helper.ethNativeContract.collection(collectionAddress, 'rft', sponsor);
      await expect(sponsorCollection.methods
        .confirmCollectionSponsorship()
        .call()).to.be.rejectedWith('caller is not set as sponsor');
    }
    {
      await expect(peasantCollection.methods
        .setCollectionLimit('account_token_ownership_limit', '1000')
        .call()).to.be.rejectedWith(EXPECTED_ERROR);
    }
  });

  itEth('(!negative test!) Set limits', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const {collectionAddress} = await helper.eth.createRefungibleCollection(owner, 'Limits', 'absolutely anything', 'ISNI');
    const collectionEvm = helper.ethNativeContract.collection(collectionAddress, 'rft', owner);
    await expect(collectionEvm.methods
      .setCollectionLimit('badLimit', 'true')
      .call()).to.be.rejectedWith('unknown boolean limit "badLimit"');
  });
});
