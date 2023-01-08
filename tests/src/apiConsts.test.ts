// Copyright 2019-2022 Unique Network (Gibraltar) Ltd.
// This file is part of Unique Network.

// Unique Network is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// Unique Network is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with Unique Network. If not, see <http://www.gnu.org/licenses/>.

import {ApiPromise} from '@polkadot/api';
import {usingPlaygrounds, itSub, expect} from './util';


const MAX_COLLECTION_DESCRIPTION_LENGTH = 256n;
const MAX_COLLECTION_NAME_LENGTH = 64n;
const COLLECTION_ADMINS_LIMIT = 5n;
const MAX_COLLECTION_PROPERTIES_SIZE = 40960n;
const MAX_TOKEN_PREFIX_LENGTH = 16n;
const MAX_PROPERTY_KEY_LENGTH = 256n;
const MAX_PROPERTY_VALUE_LENGTH = 32768n;
const MAX_PROPERTIES_PER_ITEM = 64n;
const MAX_TOKEN_PROPERTIES_SIZE = 32768n;
const NESTING_BUDGET = 5n;

const DEFAULT_COLLETCTION_LIMIT = {
  accountTokenOwnershipLimit: '1,000,000',
  sponsoredDataSize: '2,048',
  sponsoredDataRateLimit: 'SponsoringDisabled',
  tokenLimit: '4,294,967,295',
  sponsorTransferTimeout: '5',
  sponsorApproveTimeout: '5',
  ownerCanTransfer: false,
  ownerCanDestroy: true,
  transfersEnabled: true,
};

const EVM_COLLECTION_HELPERS_ADDRESS = '0x6c4e9fe1ae37a41e93cee429e8e1881abdcbb54f';
const HELPERS_CONTRACT_ADDRESS = '0x842899ECF380553E8a4de75bF534cdf6fBF64049';

describe('integration test: API UNIQUE consts', () => {
  let api: ApiPromise;

  before(async () => {
    await usingPlaygrounds(async (helper) => {
      api = await helper.getApi();
    });
  });

  itSub('DEFAULT_NFT_COLLECTION_LIMITS', () => {
    expect(api.consts.unique.nftDefaultCollectionLimits.toHuman()).to.deep.equal(DEFAULT_COLLETCTION_LIMIT);
  });

  itSub('DEFAULT_RFT_COLLECTION_LIMITS', () => {
    expect(api.consts.unique.rftDefaultCollectionLimits.toHuman()).to.deep.equal(DEFAULT_COLLETCTION_LIMIT);
  });

  itSub('DEFAULT_FT_COLLECTION_LIMITS', () => {
    expect(api.consts.unique.ftDefaultCollectionLimits.toHuman()).to.deep.equal(DEFAULT_COLLETCTION_LIMIT);
  });

  itSub('MAX_COLLECTION_NAME_LENGTH', () => {
    checkConst(api.consts.unique.maxCollectionNameLength, MAX_COLLECTION_NAME_LENGTH);
  });

  itSub('MAX_COLLECTION_DESCRIPTION_LENGTH', () => {
    checkConst(api.consts.unique.maxCollectionDescriptionLength, MAX_COLLECTION_DESCRIPTION_LENGTH);
  });

  itSub('MAX_COLLECTION_PROPERTIES_SIZE', () => {
    checkConst(api.consts.unique.maxCollectionPropertiesSize, MAX_COLLECTION_PROPERTIES_SIZE);
  });

  itSub('MAX_TOKEN_PREFIX_LENGTH', () => {
    checkConst(api.consts.unique.maxTokenPrefixLength, MAX_TOKEN_PREFIX_LENGTH);
  });

  itSub('MAX_PROPERTY_KEY_LENGTH', () => {
    checkConst(api.consts.unique.maxPropertyKeyLength, MAX_PROPERTY_KEY_LENGTH);
  });

  itSub('MAX_PROPERTY_VALUE_LENGTH', () => {
    checkConst(api.consts.unique.maxPropertyValueLength, MAX_PROPERTY_VALUE_LENGTH);
  });

  itSub('MAX_PROPERTIES_PER_ITEM', () => {
    checkConst(api.consts.unique.maxPropertiesPerItem, MAX_PROPERTIES_PER_ITEM);
  });

  itSub('NESTING_BUDGET', () => {
    checkConst(api.consts.unique.nestingBudget, NESTING_BUDGET);
  });

  itSub('MAX_TOKEN_PROPERTIES_SIZE', () => {
    checkConst(api.consts.unique.maxTokenPropertiesSize, MAX_TOKEN_PROPERTIES_SIZE);
  });

  itSub('COLLECTION_ADMINS_LIMIT', () => {
    checkConst(api.consts.unique.collectionAdminsLimit, COLLECTION_ADMINS_LIMIT);
  });

  itSub('HELPERS_CONTRACT_ADDRESS', () => {
    expect(api.consts.evmContractHelpers.contractAddress.toString().toLowerCase()).to.be.equal(HELPERS_CONTRACT_ADDRESS.toLowerCase());
  });

  itSub('EVM_COLLECTION_HELPERS_ADDRESS', () => {
    expect(api.consts.common.contractAddress.toString().toLowerCase()).to.be.equal(EVM_COLLECTION_HELPERS_ADDRESS.toLowerCase());
  });
});

function checkConst<T>(constValue: any, expectedValue: T) {
  expect(constValue.toBigInt()).equal(expectedValue);
}