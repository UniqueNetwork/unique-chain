import {addCollectionAdminExpectSuccess, createCollectionExpectSuccess} from '../util/helpers';
import {collectionIdToAddress, createEthAccount, createEthAccountWithBalance, GAS_ARGS, itWeb3} from './util/helpers';
import nonFungibleAbi from './nonFungibleAbi.json';
import {expect} from 'chai';
import {executeTransaction} from '../substrate/substrate-api';

describe('EVM collection properties', () => {
  itWeb3('Can be set', async({web3, api, privateKeyWrapper}) => {
    const alice = privateKeyWrapper('//Alice');
    const caller = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const collection = await createCollectionExpectSuccess({mode: {type: 'NFT'}});

    await addCollectionAdminExpectSuccess(alice, collection, {Ethereum: caller});

    const address = collectionIdToAddress(collection);
    const contract = new web3.eth.Contract(nonFungibleAbi as any, address, {from: caller, ...GAS_ARGS});

    await contract.methods.setCollectionProperty('testKey', Buffer.from('testValue')).send({from: caller});

    const [{value}] = (await api.rpc.unique.collectionProperties(collection, ['testKey'])).toHuman()! as any;
    expect(value).to.equal('testValue');
  });
  itWeb3('Can be deleted', async({web3, api, privateKeyWrapper}) => {
    const alice = privateKeyWrapper('//Alice');
    const caller = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const collection = await createCollectionExpectSuccess({mode: {type: 'NFT'}});

    await executeTransaction(api, alice, api.tx.unique.setCollectionProperties(collection, [{key: 'testKey', value: 'testValue'}]));

    await addCollectionAdminExpectSuccess(alice, collection, {Ethereum: caller});

    const address = collectionIdToAddress(collection);
    const contract = new web3.eth.Contract(nonFungibleAbi as any, address, {from: caller, ...GAS_ARGS});

    await contract.methods.deleteCollectionProperty('testKey').send({from: caller});

    const result = (await api.rpc.unique.collectionProperties(collection, ['testKey'])).toJSON()! as any;
    expect(result.length).to.equal(0);
  });
  itWeb3('Can be read', async({web3, api, privateKeyWrapper}) => {
    const alice = privateKeyWrapper('//Alice');
    const caller = createEthAccount(web3);
    const collection = await createCollectionExpectSuccess({mode: {type:'NFT'}});

    await executeTransaction(api, alice, api.tx.unique.setCollectionProperties(collection, [{key: 'testKey', value: 'testValue'}]));

    const address = collectionIdToAddress(collection);
    const contract = new web3.eth.Contract(nonFungibleAbi as any, address, {from: caller, ...GAS_ARGS});

    const value = await contract.methods.collectionProperty('testKey').call();
    expect(value).to.equal(web3.utils.toHex('testValue'));
  });
});
