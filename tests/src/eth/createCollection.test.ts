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
  collectionHelper,
  collectionIdFromAddress,
  collectionIdToAddress,
  createEthAccount,
  createEthAccountWithBalance,
  GAS_ARGS,
  itWeb3,
  normalizeAddress,
  normalizeEvents,
} from './util/helpers';

async function getCollectionAddressFromResult(api: ApiPromise, result: any) {
  const collectionIdAddress = normalizeAddress(result.events[0].raw.topics[2]);
  const collectionId = collectionIdFromAddress(collectionIdAddress);  
  const collection = (await getDetailedCollectionInfo(api, collectionId))!;
  return {collectionIdAddress, collectionId, collection};
}

describe('Create collection from EVM', () => {
  itWeb3('Create collection', async ({api, web3}) => {
    const owner = await createEthAccountWithBalance(api, web3);
    const helper = collectionHelper(web3, owner);
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
    const helper = collectionHelper(web3, owner);
    let result = await helper.methods.create721Collection('Sponsor collection', '1', '1').send();
    const {collectionIdAddress, collectionId} = await getCollectionAddressFromResult(api, result);
    const sponsor = await createEthAccountWithBalance(api, web3);
    result = await helper.methods.setSponsor(collectionIdAddress, sponsor).send();
    let collection = (await getDetailedCollectionInfo(api, collectionId))!;
    expect(collection.sponsorship.isUnconfirmed).to.be.true;
    expect(collection.sponsorship.asUnconfirmed.toHuman()).to.be.eq(evmToAddress(sponsor));
    await expect(helper.methods.confirmSponsorship(collectionIdAddress).call()).to.be.rejectedWith('Caller is not set as sponsor');
    const sponsorHelper = collectionHelper(web3, sponsor);
    await sponsorHelper.methods.confirmSponsorship(collectionIdAddress).send();
    collection = (await getDetailedCollectionInfo(api, collectionId))!;
    expect(collection.sponsorship.isConfirmed).to.be.true;
    expect(collection.sponsorship.asConfirmed.toHuman()).to.be.eq(evmToAddress(sponsor));
  });
  
  itWeb3('Set offchain schema', async ({api, web3}) => {
    const owner = await createEthAccountWithBalance(api, web3);
    const helper = collectionHelper(web3, owner);
    let result = await helper.methods.create721Collection('Schema collection', '2', '2').send();
    const {collectionIdAddress, collectionId} = await getCollectionAddressFromResult(api, result);
    const schema = 'Some schema';
    result = await helper.methods.setOffchainSchema(collectionIdAddress, schema).send();
    const collection = (await getDetailedCollectionInfo(api, collectionId))!;
    expect(collection.offchainSchema.toHuman()).to.be.eq(schema);
  });
  
  itWeb3('Set variable on chain schema', async ({api, web3}) => {
    const owner = await createEthAccountWithBalance(api, web3);
    const helper = collectionHelper(web3, owner);
    let result = await helper.methods.create721Collection('Variable collection', '3', '3').send();
    const {collectionIdAddress, collectionId} = await getCollectionAddressFromResult(api, result);
    const variable = 'Some variable';
    result = await helper.methods.setVariableOnChainSchema(collectionIdAddress, variable).send();
    const collection = (await getDetailedCollectionInfo(api, collectionId))!;
    expect(collection.variableOnChainSchema.toHuman()).to.be.eq(variable);
  });
  
  itWeb3('Set const on chain schema', async ({api, web3}) => {
    const owner = await createEthAccountWithBalance(api, web3);
    const helper = collectionHelper(web3, owner);
    let result = await helper.methods.create721Collection('Const collection', '4', '4').send();
    const {collectionIdAddress, collectionId} = await getCollectionAddressFromResult(api, result);
    const constSchema = 'Some const';
    result = await helper.methods.setConstOnChainSchema(collectionIdAddress, constSchema).send();
    const collection = (await getDetailedCollectionInfo(api, collectionId))!;
    expect(collection.constOnChainSchema.toHuman()).to.be.eq(constSchema);
  });

  itWeb3('Set limits', async ({api, web3}) => {
    const owner = await createEthAccountWithBalance(api, web3);
    const helper = collectionHelper(web3, owner);
    const result = await helper.methods.create721Collection('Const collection', '5', '5').send();
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
    await helper.methods.setLimits(collectionIdAddress, limitsJson).send();
    
    const collection = (await getDetailedCollectionInfo(api, collectionId))!;
    expect(collection.limits.accountTokenOwnershipLimit.unwrap().toNumber()).to.be.eq(limits.accountTokenOwnershipLimit);
    expect(collection.limits.sponsoredDataSize.unwrap().toNumber()).to.be.eq(limits.sponsoredDataSize);
    expect(collection.limits.sponsoredDataRateLimit.unwrap().asBlocks.toNumber()).to.be.eq(limits.sponsoredDataRateLimit.Blocks);
    expect(collection.limits.tokenLimit.unwrap().toNumber()).to.be.eq(limits.tokenLimit);
    expect(collection.limits.sponsorTransferTimeout.unwrap().toNumber()).to.be.eq(limits.sponsorTransferTimeout);
    expect(collection.limits.sponsorApproveTimeout.unwrap().toNumber()).to.be.eq(limits.sponsorApproveTimeout);
    expect(collection.limits.ownerCanTransfer.toHuman()).to.be.eq(limits.ownerCanTransfer);
    expect(collection.limits.ownerCanDestroy.toHuman()).to.be.eq(limits.ownerCanDestroy);
    expect(collection.limits.transfersEnabled.toHuman()).to.be.eq(limits.transfersEnabled);
  });

  itWeb3('Check tokenURI', async ({web3, api}) => {
    const owner = await createEthAccountWithBalance(api, web3);
    const helper = collectionHelper(web3, owner);
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
    const helper = collectionHelper(web3, owner);
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
    const helper = collectionHelper(web3, owner);
    const collectionName = 'A';
    const description = 'A';
    const tokenPrefix = 'A';
    
    await expect(helper.methods
      .create721Collection(collectionName, description, tokenPrefix)
      .call()).to.be.rejectedWith('NotSufficientFounds');
  });

  itWeb3('(!negative test!) Collection address (Contract is not an unique collection)', async ({api, web3}) => {
    const owner = await createEthAccountWithBalance(api, web3);
    const helper = collectionHelper(web3, owner);
    const collectionAddressWithBadPrefix = '0x00112233445566778899AABBCCDDEEFF00112233';
    const EXPECTED_ERROR = 'Contract is not an unique collection';
    {
      const sponsor = await createEthAccountWithBalance(api, web3);
      await expect(helper.methods
        .setSponsor(collectionAddressWithBadPrefix, sponsor)
        .call()).to.be.rejectedWith(EXPECTED_ERROR);
      
      const sponsorHelper = collectionHelper(web3, sponsor);
      await expect(sponsorHelper.methods
        .confirmSponsorship(collectionAddressWithBadPrefix)
        .call()).to.be.rejectedWith(EXPECTED_ERROR);
    }
    {
      const schema = 'Some schema';
      await expect(helper.methods
        .setOffchainSchema(collectionAddressWithBadPrefix, schema)
        .call()).to.be.rejectedWith(EXPECTED_ERROR);
    }
    {
      const variable = 'Some variable';
      await expect(helper.methods
        .setVariableOnChainSchema(collectionAddressWithBadPrefix, variable)
        .call()).to.be.rejectedWith(EXPECTED_ERROR);
    }
    {
      const constData = 'Some const';
      await expect(helper.methods
        .setConstOnChainSchema(collectionAddressWithBadPrefix, constData)
        .call()).to.be.rejectedWith(EXPECTED_ERROR);
    }
    {
      const limits = '{"account_token_ownership_limit":1000}';
      await expect(helper.methods
        .setLimits(collectionAddressWithBadPrefix, limits)
        .call()).to.be.rejectedWith(EXPECTED_ERROR);
    }
  });

  itWeb3('(!negative test!) Check owner', async ({api, web3}) => {
    const owner = await createEthAccountWithBalance(api, web3);
    const notOwner = await createEthAccount(web3);
    const helperFromOwner = collectionHelper(web3, owner);
    const helperFromNotOwner = collectionHelper(web3, notOwner);
    const result = await helperFromOwner.methods.create721Collection('A', 'A', 'A').send();
    const {collectionIdAddress} = await getCollectionAddressFromResult(api, result);
    const EXPECTED_ERROR = 'NoPermission';
    {
      const sponsor = await createEthAccountWithBalance(api, web3);
      await expect(helperFromNotOwner.methods
        .setSponsor(collectionIdAddress, sponsor)
        .call()).to.be.rejectedWith(EXPECTED_ERROR);
      
      const sponsorHelper = collectionHelper(web3, sponsor);
      await expect(sponsorHelper.methods
        .confirmSponsorship(collectionIdAddress)
        .call()).to.be.rejectedWith('Caller is not set as sponsor');
    }
    {
      const schema = 'Some schema';
      await expect(helperFromNotOwner.methods
        .setOffchainSchema(collectionIdAddress, schema)
        .call()).to.be.rejectedWith(EXPECTED_ERROR);
    }
    {
      const variable = 'Some variable';
      await expect(helperFromNotOwner.methods
        .setVariableOnChainSchema(collectionIdAddress, variable)
        .call()).to.be.rejectedWith(EXPECTED_ERROR);
    }
    {
      const constData = 'Some const';
      await expect(helperFromNotOwner.methods
        .setConstOnChainSchema(collectionIdAddress, constData)
        .call()).to.be.rejectedWith(EXPECTED_ERROR);
    }
    {
      const limits = '{"account_token_ownership_limit":1000}';
      await expect(helperFromNotOwner.methods
        .setLimits(collectionIdAddress, limits)
        .call()).to.be.rejectedWith(EXPECTED_ERROR);
    }
  });

  itWeb3('(!negative test!) Set offchain schema (length limit)', async ({api, web3}) => {
    const owner = await createEthAccountWithBalance(api, web3);
    const helper = collectionHelper(web3, owner);
    const result = await helper.methods.create721Collection('Schema collection', 'A', 'A').send();
    const {collectionIdAddress} = await getCollectionAddressFromResult(api, result);
    const OFFCHAIN_SCHEMA_LIMIT = 8192;
    const schema = 'A'.repeat(OFFCHAIN_SCHEMA_LIMIT + 1);
    await expect(helper.methods
      .setOffchainSchema(collectionIdAddress, schema)
      .call()).to.be.rejectedWith('schema is too long. Max length is ' + OFFCHAIN_SCHEMA_LIMIT);
  });

  itWeb3('(!negative test!) Set variable on chain schema (length limit)', async ({api, web3}) => {
    const owner = await createEthAccountWithBalance(api, web3);
    const helper = collectionHelper(web3, owner);
    const result = await helper.methods.create721Collection('Schema collection', 'A', 'A').send();
    const {collectionIdAddress} = await getCollectionAddressFromResult(api, result);
    const VARIABLE_ON_CHAIN_SCHEMA_LIMIT = 8192;
    const variable = 'A'.repeat(VARIABLE_ON_CHAIN_SCHEMA_LIMIT + 1);
    await expect(helper.methods
      .setVariableOnChainSchema(collectionIdAddress, variable)
      .call()).to.be.rejectedWith('variable is too long. Max length is ' + VARIABLE_ON_CHAIN_SCHEMA_LIMIT);
  });

  itWeb3('(!negative test!) Set const on chain schema (length limit)', async ({api, web3}) => {
    const owner = await createEthAccountWithBalance(api, web3);
    const helper = collectionHelper(web3, owner);
    const result = await helper.methods.create721Collection('Schema collection', 'A', 'A').send();
    const {collectionIdAddress} = await getCollectionAddressFromResult(api, result);
    const CONST_ON_CHAIN_SCHEMA_LIMIT = 32768;
    const constData = 'A'.repeat(CONST_ON_CHAIN_SCHEMA_LIMIT + 1);
    await expect(helper.methods
      .setConstOnChainSchema(collectionIdAddress, constData)
      .call()).to.be.rejectedWith('const_on_chain is too long. Max length is ' + CONST_ON_CHAIN_SCHEMA_LIMIT);
  });

  itWeb3('(!negative test!) Set limits', async ({api, web3}) => {
    const owner = await createEthAccountWithBalance(api, web3);
    const helper = collectionHelper(web3, owner);
    const result = await helper.methods.create721Collection('Schema collection', 'A', 'A').send();
    const {collectionIdAddress} = await getCollectionAddressFromResult(api, result);
    const badJson = '{accountTokenOwnershipLimit: 1000}';
    await expect(helper.methods
      .setLimits(collectionIdAddress, badJson)
      .call()).to.be.rejectedWith('Parse JSON error:');
  });
});