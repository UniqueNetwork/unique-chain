//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

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