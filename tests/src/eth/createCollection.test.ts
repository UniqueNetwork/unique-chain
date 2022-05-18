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

import nonFungibleAbi from './nonFungibleAbi.json';
import {ApiPromise} from '@polkadot/api';
import {evmToAddress} from '@polkadot/util-crypto';
import {expect} from 'chai';
import {getCreatedCollectionCount, getDetailedCollectionInfo} from '../util/helpers';
import {
  evmCollectionHelper,
  collectionIdFromAddress,
  collectionIdToAddress,
  createEthAccount,
  createEthAccountWithBalance,
  evmCollection,
  GAS_ARGS,
  itWeb3,
  normalizeAddress,
  normalizeEvents,
} from './util/helpers';
import util from 'util';

async function getCollectionAddressFromResult(api: ApiPromise, result: any) {
  const collectionIdAddress = normalizeAddress(result.events[0].raw.topics[2]);
  const collectionId = collectionIdFromAddress(collectionIdAddress);  
  const collection = (await getDetailedCollectionInfo(api, collectionId))!;
  return {collectionIdAddress, collectionId, collection};
}

describe('Create collection from EVM', () => {
  itWeb3('Create collection', async ({api, web3}) => {
    const owner = await createEthAccountWithBalance(api, web3);
    const helper = evmCollectionHelper(web3, owner);
    const collectionName = 'CollectionEVM';
    const description = 'Some description';
    const tokenPrefix = 'token prefix';
  
    const collectionCountBefore = await getCreatedCollectionCount(api);
    const result = await helper.methods
      .create721Collection(collectionName, description, tokenPrefix)
      .send();
    const collectionCountAfter = await getCreatedCollectionCount(api);
  
    const {collectionId, collection} = await getCollectionAddressFromResult(api, result);
    expect(collectionCountAfter - collectionCountBefore).to.be.eq(1);
    expect(collectionId).to.be.eq(collectionCountAfter);
    expect(collection.name.map(v => String.fromCharCode(v.toNumber())).join('')).to.be.eq(collectionName);
    expect(collection.description.map(v => String.fromCharCode(v.toNumber())).join('')).to.be.eq(description);
    expect(collection.tokenPrefix.toHuman()).to.be.eq(tokenPrefix);
    expect(collection.schemaVersion.type).to.be.eq('ImageURL');
  });
  
  itWeb3('Set sponsorship', async ({api, web3}) => {
    const owner = await createEthAccountWithBalance(api, web3);
    const collectionHelper = evmCollectionHelper(web3, owner);
    let result = await collectionHelper.methods.create721Collection('Sponsor collection', '1', '1').send();
    const {collectionIdAddress, collectionId} = await getCollectionAddressFromResult(api, result);
    const sponsor = await createEthAccountWithBalance(api, web3);
    const collectionEvm = evmCollection(web3, owner, collectionIdAddress);
    result = await collectionEvm.methods.setSponsor(sponsor).send();
    let collectionSub = (await getDetailedCollectionInfo(api, collectionId))!;
    expect(collectionSub.sponsorship.isUnconfirmed).to.be.true;
    expect(collectionSub.sponsorship.asUnconfirmed.toHuman()).to.be.eq(evmToAddress(sponsor));
    await expect(collectionEvm.methods.confirmSponsorship().call()).to.be.rejectedWith('Caller is not set as sponsor');
    const sponsorCollection = evmCollection(web3, sponsor, collectionIdAddress);
    await sponsorCollection.methods.confirmSponsorship().send();
    collectionSub = (await getDetailedCollectionInfo(api, collectionId))!;
    expect(collectionSub.sponsorship.isConfirmed).to.be.true;
    expect(collectionSub.sponsorship.asConfirmed.toHuman()).to.be.eq(evmToAddress(sponsor));
  });

  itWeb3('Set limits', async ({api, web3}) => {
    const owner = await createEthAccountWithBalance(api, web3);
    const collectionHelper = evmCollectionHelper(web3, owner);
    const result = await collectionHelper.methods.create721Collection('Const collection', '5', '5').send();
    const {collectionIdAddress, collectionId} = await getCollectionAddressFromResult(api, result);
    const limits = {
      accountTokenOwnershipLimit: 1000,
      sponsoredDataSize: 1024,
      sponsoredDataRateLimit: {Blocks: 30},
      tokenLimit: 1000000,
      sponsorTransferTimeout: 6,
      sponsorApproveTimeout: 6,
      ownerCanTransfer: false,
      ownerCanDestroy: false,
      transfersEnabled: false,
    };

    const limitsJson = JSON.stringify(limits, null, 1);
    const collectionEvm = evmCollection(web3, owner, collectionIdAddress);
    await collectionEvm.methods.setLimits(limitsJson).send();
    
    const collectionSub = (await getDetailedCollectionInfo(api, collectionId))!;
    expect(collectionSub.limits.accountTokenOwnershipLimit.unwrap().toNumber()).to.be.eq(limits.accountTokenOwnershipLimit);
    expect(collectionSub.limits.sponsoredDataSize.unwrap().toNumber()).to.be.eq(limits.sponsoredDataSize);
    expect(collectionSub.limits.sponsoredDataRateLimit.unwrap().asBlocks.toNumber()).to.be.eq(limits.sponsoredDataRateLimit.Blocks);
    expect(collectionSub.limits.tokenLimit.unwrap().toNumber()).to.be.eq(limits.tokenLimit);
    expect(collectionSub.limits.sponsorTransferTimeout.unwrap().toNumber()).to.be.eq(limits.sponsorTransferTimeout);
    expect(collectionSub.limits.sponsorApproveTimeout.unwrap().toNumber()).to.be.eq(limits.sponsorApproveTimeout);
    expect(collectionSub.limits.ownerCanTransfer.toHuman()).to.be.eq(limits.ownerCanTransfer);
    expect(collectionSub.limits.ownerCanDestroy.toHuman()).to.be.eq(limits.ownerCanDestroy);
    expect(collectionSub.limits.transfersEnabled.toHuman()).to.be.eq(limits.transfersEnabled);
  });

  itWeb3('Check tokenURI', async ({web3, api}) => {
    const owner = await createEthAccountWithBalance(api, web3);
    const helper = evmCollectionHelper(web3, owner);
    let result = await helper.methods.create721Collection('Mint collection', '6', '6').send();
    const {collectionIdAddress, collectionId} = await getCollectionAddressFromResult(api, result);
    const receiver = createEthAccount(web3);
    const contract = new web3.eth.Contract(nonFungibleAbi as any, collectionIdAddress, {from: owner, ...GAS_ARGS});
    const nextTokenId = await contract.methods.nextTokenId().call();

    expect(nextTokenId).to.be.equal('1');
    result = await contract.methods.mintWithTokenURI(
      receiver,
      nextTokenId,
      'Test URI',
    ).send();

    const events = normalizeEvents(result.events);
    const address = collectionIdToAddress(collectionId);

    expect(events).to.be.deep.equal([
      {
        address,
        event: 'Transfer',
        args: {
          from: '0x0000000000000000000000000000000000000000',
          to: receiver,
          tokenId: nextTokenId,
        },
      },
    ]);

    expect(await contract.methods.tokenURI(nextTokenId).call()).to.be.equal('Test URI');

    // TODO: this wont work right now, need release 919000 first
    // await helper.methods.setOffchainSchema(collectionIdAddress, 'https://offchain-service.local/token-info/{id}').send();
    // const tokenUri = await contract.methods.tokenURI(nextTokenId).call();
    // expect(tokenUri).to.be.equal(`https://offchain-service.local/token-info/${nextTokenId}`);
  });
});

describe('(!negative tests!) Create collection from EVM', () => {
  itWeb3('(!negative test!) Create collection (bad lengths)', async ({api, web3}) => {
    const owner = await createEthAccountWithBalance(api, web3);
    const helper = evmCollectionHelper(web3, owner);
    {
      const MAX_NAME_LENGHT = 64;
      const collectionName = 'A'.repeat(MAX_NAME_LENGHT + 1);
      const description = 'A';
      const tokenPrefix = 'A';
    
      await expect(helper.methods
        .create721Collection(collectionName, description, tokenPrefix)
        .call()).to.be.rejectedWith('name is too long. Max length is ' + MAX_NAME_LENGHT);
      
    }
    {  
      const MAX_DESCRIPTION_LENGHT = 256;
      const collectionName = 'A';
      const description = 'A'.repeat(MAX_DESCRIPTION_LENGHT + 1);
      const tokenPrefix = 'A';
      await expect(helper.methods
        .create721Collection(collectionName, description, tokenPrefix)
        .call()).to.be.rejectedWith('description is too long. Max length is ' + MAX_DESCRIPTION_LENGHT);
    }
    {  
      const MAX_TOKEN_PREFIX_LENGHT = 16;
      const collectionName = 'A';
      const description = 'A';
      const tokenPrefix = 'A'.repeat(MAX_TOKEN_PREFIX_LENGHT + 1);
      await expect(helper.methods
        .create721Collection(collectionName, description, tokenPrefix)
        .call()).to.be.rejectedWith('token_prefix is too long. Max length is ' + MAX_TOKEN_PREFIX_LENGHT);
    }
  });
  
  itWeb3('(!negative test!) Create collection (no funds)', async ({web3}) => {
    const owner = await createEthAccount(web3);
    const helper = evmCollectionHelper(web3, owner);
    const collectionName = 'A';
    const description = 'A';
    const tokenPrefix = 'A';
    
    await expect(helper.methods
      .create721Collection(collectionName, description, tokenPrefix)
      .call()).to.be.rejectedWith('NotSufficientFounds');
  });

  itWeb3('(!negative test!) Collection address (Create collection handle error)', async ({api, web3}) => {
    const owner = await createEthAccountWithBalance(api, web3);
    const collectionAddressForNonexistentCollection = '0x17C4E6453CC49AAAAEACA894E6D9683E00112233';
    const collectionEvm = evmCollection(web3, owner, collectionAddressForNonexistentCollection);
    const EXPECTED_ERROR = 'Create collection handle error';
    {
      const sponsor = await createEthAccountWithBalance(api, web3);
      await expect(collectionEvm.methods
        .setSponsor(sponsor)
        .call()).to.be.rejectedWith(EXPECTED_ERROR);
      
      const sponsorCollection = evmCollection(web3, sponsor, collectionAddressForNonexistentCollection);
      await expect(sponsorCollection.methods
        .confirmSponsorship()
        .call()).to.be.rejectedWith(EXPECTED_ERROR);
    }
    {
      const limits = '{"account_token_ownership_limit":1000}';
      await expect(collectionEvm.methods
        .setLimits(limits)
        .call()).to.be.rejectedWith(EXPECTED_ERROR);
    }
  });

  itWeb3('(!negative test!) Check owner', async ({api, web3}) => {
    const owner = await createEthAccountWithBalance(api, web3);
    const notOwner = await createEthAccount(web3);
    const collectionHelper = evmCollectionHelper(web3, owner);
    const result = await collectionHelper.methods.create721Collection('A', 'A', 'A').send();
    const {collectionIdAddress} = await getCollectionAddressFromResult(api, result);
    const contractEvmFromNotOwner = evmCollection(web3, notOwner, collectionIdAddress);
    const EXPECTED_ERROR = 'NoPermission';
    {
      const sponsor = await createEthAccountWithBalance(api, web3);
      await expect(contractEvmFromNotOwner.methods
        .setSponsor(sponsor)
        .call()).to.be.rejectedWith(EXPECTED_ERROR);
      
      const sponsorCollection = evmCollection(web3, sponsor, collectionIdAddress);
      await expect(sponsorCollection.methods
        .confirmSponsorship()
        .call()).to.be.rejectedWith('Caller is not set as sponsor');
    }
    {
      const limits = '{"account_token_ownership_limit":1000}';
      await expect(contractEvmFromNotOwner.methods
        .setLimits(limits)
        .call()).to.be.rejectedWith(EXPECTED_ERROR);
    }
  });

  itWeb3('(!negative test!) Set limits', async ({api, web3}) => {
    const owner = await createEthAccountWithBalance(api, web3);
    const collectionHelper = evmCollectionHelper(web3, owner);
    const result = await collectionHelper.methods.create721Collection('Schema collection', 'A', 'A').send();
    const {collectionIdAddress} = await getCollectionAddressFromResult(api, result);
    const collectionEvm = evmCollection(web3, owner, collectionIdAddress);
    const badJson = '{accountTokenOwnershipLimit: 1000}';
    await expect(collectionEvm.methods
      .setLimits(badJson)
      .call()).to.be.rejectedWith('Parse JSON error:');
  });
});