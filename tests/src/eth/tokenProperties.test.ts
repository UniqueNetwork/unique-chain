import {IKeyringPair} from '@polkadot/types/types';
import {usingPlaygrounds} from './../util/playgrounds/index';
import {itEth, expect} from '../eth/util/playgrounds';
import {ITokenPropertyPermission} from '../util/playgrounds/types';

describe('EVM token properties', () => {
  let donor: IKeyringPair;
  let alice: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      donor = privateKey('//Alice');
      [alice] = await helper.arrange.createAccounts([1000n], donor);
    });
  });

  itEth('Can be reconfigured', async({helper}) => {
    const caller = await helper.eth.createAccountWithBalance(donor);

    for(const [mutable,collectionAdmin, tokenOwner] of cartesian([], [false, true], [false, true], [false, true])) {
      const collection = await helper.nft.mintCollection(alice, {tokenPrefix: 'ethp'});
      await collection.addAdmin(alice, {Ethereum: caller});

      const address = helper.ethAddress.fromCollectionId(collection.collectionId);
      const contract = helper.ethNativeContract.collection(address, 'nft', caller);

      await contract.methods.setTokenPropertyPermission('testKey', mutable, collectionAdmin, tokenOwner).send({from: caller});
  
      const state = await collection.getPropertyPermissions();
      expect(state).to.be.deep.equal([{
        key: 'testKey',
        permission: {mutable, collectionAdmin, tokenOwner},
      }]);
    }
  });

  itEth('Can be set', async({helper}) => {
    const caller = await helper.eth.createAccountWithBalance(donor);
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
  
  itEth('Can be multiple set for NFT ', async({helper}) => {
    const caller = await helper.eth.createAccountWithBalance(donor);
    
    const properties = Array(5).fill(0).map((_, i) => { return {field_0: `key_${i}`, field_1: Buffer.from(`value_${i}`)}; });
    const permissions: ITokenPropertyPermission[] = properties.map(p => { return {key: p.field_0, permission: {tokenOwner: true,
      collectionAdmin: true,
      mutable: true}}; });
    
    const collection = await helper.nft.mintCollection(alice, {
      tokenPrefix: 'ethp',
      tokenPropertyPermissions: permissions,
    });
    
    const token = await collection.mintToken(alice);
    
    const valuesBefore = await token.getProperties(properties.map(p => p.field_0));
    expect(valuesBefore).to.be.deep.equal([]);
    
    await collection.addAdmin(alice, {Ethereum: caller});

    const address = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = helper.ethNativeContract.collection(address, 'nft', caller);

    await contract.methods.setProperties(token.tokenId, properties).send({from: caller});

    const values = await token.getProperties(properties.map(p => p.field_0));
    expect(values).to.be.deep.equal(properties.map(p => { return {key: p.field_0, value: p.field_1.toString()}; }));
  });
  
  itEth('Can be multiple set for RFT ', async({helper}) => {
    const caller = await helper.eth.createAccountWithBalance(donor);
    
    const properties = Array(5).fill(0).map((_, i) => { return {field_0: `key_${i}`, field_1: Buffer.from(`value_${i}`)}; });
    const permissions: ITokenPropertyPermission[] = properties.map(p => { return {key: p.field_0, permission: {tokenOwner: true,
      collectionAdmin: true,
      mutable: true}}; });
    
    const collection = await helper.rft.mintCollection(alice, {
      tokenPrefix: 'ethp',
      tokenPropertyPermissions: permissions,
    });
        
    const token = await collection.mintToken(alice);
    
    const valuesBefore = await token.getProperties(properties.map(p => p.field_0));
    expect(valuesBefore).to.be.deep.equal([]);
    
    await collection.addAdmin(alice, {Ethereum: caller});

    const address = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = helper.ethNativeContract.collection(address, 'rft', caller);

    await contract.methods.setProperties(token.tokenId, properties).send({from: caller});

    const values = await token.getProperties(properties.map(p => p.field_0));
    expect(values).to.be.deep.equal(properties.map(p => { return {key: p.field_0, value: p.field_1.toString()}; }));
  });

  itEth('Can be deleted', async({helper}) => {
    const caller = await helper.eth.createAccountWithBalance(donor);
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

  itEth('Can be read', async({helper}) => {
    const caller = await helper.eth.createAccountWithBalance(donor);
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


type ElementOf<A> = A extends readonly (infer T)[] ? T : never;
function* cartesian<T extends Array<Array<any>>, R extends Array<any>>(internalRest: [...R], ...args: [...T]): Generator<[...R, ...{[K in keyof T]: ElementOf<T[K]>}]> {
  if(args.length === 0) {
    yield internalRest as any;
    return;
  }
  for(const value of args[0]) {
    yield* cartesian([...internalRest, value], ...args.slice(1)) as any;
  }
}