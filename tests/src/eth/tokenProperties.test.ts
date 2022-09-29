import {cartesian} from './util/helpers';
import {itEth, expect} from '../eth/util/playgrounds';

describe.only('EVM token properties', () => {
  itEth('Can be reconfigured', async({helper, privateKey}) => {
    const alice = privateKey('//Alice');
    const caller = await helper.eth.createAccountWithBalance(alice);

    for(const [mutable,collectionAdmin, tokenOwner] of cartesian([], [false, true], [false, true], [false, true])) {
      const collection = await helper.nft.mintCollection(alice, {tokenPrefix: 'ethp'});
      await collection.addAdmin(alice, {Ethereum: caller});

      const address = helper.ethAddress.fromCollectionId(collection.collectionId);
      const contract = await helper.ethNativeContract.collection(address, 'nft', caller);

      await contract.methods.setTokenPropertyPermission('testKey', mutable, collectionAdmin, tokenOwner).send({from: caller});
  
      const state = await collection.getPropertyPermissions();
      expect(state).to.be.deep.equal([{
        key: 'testKey',
        permission: {mutable, collectionAdmin, tokenOwner},
      }]);
    }
  });

  itEth('Can be set', async({helper, privateKey}) => {
    const alice = privateKey('//Alice');
    const caller = await helper.eth.createAccountWithBalance(alice);
    const collection = await helper.nft.mintCollection(alice, {
      tokenPrefix: 'ethp',
      tokenPropertyPermissions: [{
        key: 'testKey',
        permission: {
          collectionAdmin: true,
        },
      }],
    });
    const token = await collection.mintToken(alice);

    await collection.addAdmin(alice, {Ethereum: caller});

    const address = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = helper.ethNativeContract.collection(address, 'nft', caller);

    await contract.methods.setProperty(token.tokenId, 'testKey', Buffer.from('testValue')).send({from: caller});

    const [{value}] = await token.getProperties(['testKey']);
    expect(value).to.equal('testValue');
  });

  itEth('Can be deleted', async({helper, privateKey}) => {
    const alice = privateKey('//Alice');
    const caller = await helper.eth.createAccountWithBalance(alice);
    const collection = await helper.nft.mintCollection(alice, {
      tokenPrefix: 'ethp',
      tokenPropertyPermissions: [{
        key: 'testKey',
        permission: {
          mutable: true,
          collectionAdmin: true,
        },
      }],
    });

    await collection.addAdmin(alice, {Ethereum: caller});

    const token = await collection.mintToken(alice);
    await token.setProperties(alice, [{key: 'testKey', value: 'testValue'}]);

    const address = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = helper.ethNativeContract.collection(address, 'nft', caller);

    await contract.methods.deleteProperty(token.tokenId, 'testKey').send({from: caller});

    const result = await token.getProperties(['testKey']);
    expect(result.length).to.equal(0);
  });

  itEth('Can be read', async({helper, privateKey}) => {
    const alice = privateKey('//Alice');
    const caller = await helper.eth.createAccountWithBalance(alice);
    const collection = await helper.nft.mintCollection(alice, {
      tokenPrefix: 'ethp',
      tokenPropertyPermissions: [{
        key: 'testKey',
        permission: {
          collectionAdmin: true,
        },
      }],
    });
    const token = await collection.mintToken(alice);
    await token.setProperties(alice, [{key: 'testKey', value: 'testValue'}]);

    const address = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = helper.ethNativeContract.collection(address, 'nft', caller);

    const value = await contract.methods.property(token.tokenId, 'testKey').call();
    expect(value).to.equal(helper.getWeb3().utils.toHex('testValue'));
  });
});
