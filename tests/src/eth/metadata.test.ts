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

import {expect} from 'chai';
import {createCollectionExpectSuccess} from '../util/helpers';
import {collectionIdToAddress, createEthAccountWithBalance, GAS_ARGS, itWeb3} from './util/helpers';
import fungibleMetadataAbi from './fungibleMetadataAbi.json';

describe('Common metadata', () => {
  itWeb3('Returns collection name', async ({api, web3}) => {
    const collection = await createCollectionExpectSuccess({
      name: 'token name',
      mode: {type: 'NFT'},
    });
    const caller = await createEthAccountWithBalance(api, web3);

    const address = collectionIdToAddress(collection);
    const contract = new web3.eth.Contract(fungibleMetadataAbi as any, address, {from: caller, ...GAS_ARGS});
    const name = await contract.methods.name().call();

    expect(name).to.equal('token name');
  });

  itWeb3('Returns symbol name', async ({api, web3}) => {
    const collection = await createCollectionExpectSuccess({
      tokenPrefix: 'TOK',
      mode: {type: 'NFT'},
    });
    const caller = await createEthAccountWithBalance(api, web3);

    const address = collectionIdToAddress(collection);
    const contract = new web3.eth.Contract(fungibleMetadataAbi as any, address, {from: caller, ...GAS_ARGS});
    const symbol = await contract.methods.symbol().call();

    expect(symbol).to.equal('TOK');
  });
});

describe('Fungible metadata', () => {
  itWeb3('Returns fungible decimals', async ({api, web3}) => {
    const collection = await createCollectionExpectSuccess({
      mode: {type: 'Fungible', decimalPoints: 6},
    });
    const caller = await createEthAccountWithBalance(api, web3);

    const address = collectionIdToAddress(collection);
    const contract = new web3.eth.Contract(fungibleMetadataAbi as any, address, {from: caller, ...GAS_ARGS});
    const decimals = await contract.methods.decimals().call();

    expect(+decimals).to.equal(6);
  });
});