import privateKey from '../substrate/privateKey';
import {addCollectionAdminExpectSuccess, createCollectionExpectSuccess, createItemExpectSuccess} from '../util/helpers';
import {cartesian, collectionIdToAddress, createEthAccount, createEthAccountWithBalance, GAS_ARGS, itWeb3} from './util/helpers';
import nonFungibleAbi from './nonFungibleAbi.json';
import {expect} from 'chai';
import {executeTransaction} from '../substrate/substrate-api';

describe('EVM token properties', () => {
  itWeb3('Can be reconfigured', async({web3, api}) => {
    const alice = privateKey('//Alice');
    const caller = await createEthAccountWithBalance(api, web3);
    for(const [mutable,collectionAdmin, tokenOwner] of cartesian([], [false, true], [false, true], [false, true])) {
      const collection = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
      await addCollectionAdminExpectSuccess(alice, collection, {Ethereum: caller});
      
      const address = collectionIdToAddress(collection);
      const contract = new web3.eth.Contract(nonFungibleAbi as any, address, {from: caller, ...GAS_ARGS});
  
      await contract.methods.setTokenPropertyPermission('testKey', mutable, collectionAdmin, tokenOwner).send({from: caller});
  
      const state = (await api.query.common.collectionPropertyPermissions(collection)).toJSON();
      expect(state).to.be.deep.equal({
        [web3.utils.toHex('testKey')]: {mutable, collectionAdmin, tokenOwner},
      });
    }
  });
  itWeb3('Can be set', async({web3, api}) => {
    const alice = privateKey('//Alice');
    const caller = await createEthAccountWithBalance(api, web3);
    const collection = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
    const token = await createItemExpectSuccess(alice, collection, 'NFT');

    await executeTransaction(api, alice, api.tx.unique.setPropertyPermissions(collection, [{
      key: 'testKey',
      permission: {
        collectionAdmin: true,
      },
    }]));

    await addCollectionAdminExpectSuccess(alice, collection, {Ethereum: caller});

    const address = collectionIdToAddress(collection);
    const contract = new web3.eth.Contract(nonFungibleAbi as any, address, {from: caller, ...GAS_ARGS});

    await contract.methods.setProperty(token, 'testKey', Buffer.from('testValue')).send({from: caller});

    const [{value}] = (await api.rpc.unique.tokenProperties(collection, token, ['testKey'])).toHuman()! as any;
    expect(value).to.equal('testValue');
  });
  itWeb3('Can be deleted', async({web3, api}) => {
    const alice = privateKey('//Alice');
    const caller = await createEthAccountWithBalance(api, web3);
    const collection = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
    const token = await createItemExpectSuccess(alice, collection, 'NFT');

    await executeTransaction(api, alice, api.tx.unique.setPropertyPermissions(collection, [{
      key: 'testKey',
      permission: {
        mutable: true,
        collectionAdmin: true,
      },
    }]));
    await executeTransaction(api, alice, api.tx.unique.setTokenProperties(collection, token, [{key: 'testKey', value: 'testValue'}]));

    await addCollectionAdminExpectSuccess(alice, collection, {Ethereum: caller});

    const address = collectionIdToAddress(collection);
    const contract = new web3.eth.Contract(nonFungibleAbi as any, address, {from: caller, ...GAS_ARGS});

    await contract.methods.deleteProperty(token, 'testKey').send({from: caller});

    const result = (await api.rpc.unique.tokenProperties(collection, token, ['testKey'])).toJSON()! as any;
    expect(result.length).to.equal(0);
  });
  itWeb3('Can be read', async({web3, api}) => {
    const alice = privateKey('//Alice');
    const caller = createEthAccount(web3);
    const collection = await createCollectionExpectSuccess({mode: {type:'NFT'}});
    const token = await createItemExpectSuccess(alice, collection, 'NFT');

    await executeTransaction(api, alice, api.tx.unique.setPropertyPermissions(collection, [{
      key: 'testKey',
      permission: {
        collectionAdmin: true,
      },
    }]));
    await executeTransaction(api, alice, api.tx.unique.setTokenProperties(collection, token, [{key: 'testKey', value: 'testValue'}]));

    const address = collectionIdToAddress(collection);
    const contract = new web3.eth.Contract(nonFungibleAbi as any, address, {from: caller, ...GAS_ARGS});

    const value = await contract.methods.property(token, 'testKey').call();
    expect(value).to.equal(web3.utils.toHex('testValue'));
  });
});
