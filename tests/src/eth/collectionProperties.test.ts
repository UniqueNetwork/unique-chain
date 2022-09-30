import {itEth, usingEthPlaygrounds, expect} from './util/playgrounds';
import {IKeyringPair} from '@polkadot/types/types';

describe('EVM collection properties', () => {
  let donor: IKeyringPair;
  let alice: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (_helper, privateKey) => {
      donor = privateKey('//Alice');
      [alice] = await _helper.arrange.createAccounts([10n], donor);
    });
  });

  itEth('Can be set', async({helper}) => {
    const caller = await helper.eth.createAccountWithBalance(donor);
    const collection = await helper.nft.mintCollection(alice, {name: 'name', description: 'test', tokenPrefix: 'test'});
    await collection.addAdmin(alice, {Ethereum: caller});

    const address = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = helper.ethNativeContract.collection(address, 'nft', caller);

    await contract.methods.setCollectionProperty('testKey', Buffer.from('testValue')).send({from: caller});

    const raw = (await collection.getData())?.raw;

    expect(raw.properties[0].value).to.equal('testValue');
  });

  itEth('Can be deleted', async({helper}) => {
    const caller = await helper.eth.createAccountWithBalance(donor);
    const collection = await helper.nft.mintCollection(alice, {name: 'name', description: 'test', tokenPrefix: 'test', properties: [{key: 'testKey', value: 'testValue'}]});

    await collection.addAdmin(alice, {Ethereum: caller});

    const address = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = helper.ethNativeContract.collection(address, 'nft', caller);

    await contract.methods.deleteCollectionProperty('testKey').send({from: caller});

    const raw = (await collection.getData())?.raw;

    expect(raw.properties.length).to.equal(0);
  });

  itEth('Can be read', async({helper}) => {
    const caller = helper.eth.createAccount();
    const collection = await helper.nft.mintCollection(alice, {name: 'name', description: 'test', tokenPrefix: 'test', properties: [{key: 'testKey', value: 'testValue'}]});

    const address = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = helper.ethNativeContract.collection(address, 'nft', caller);

    const value = await contract.methods.collectionProperty('testKey').call();
    expect(value).to.equal(helper.getWeb3().utils.toHex('testValue'));
  });
});

describe('EVM collection property', () => {
  let alice: IKeyringPair;

  before(() => {
    usingEthPlaygrounds(async (_helper, privateKey) => {
      alice = privateKey('//Alice');
    });
  });

  async function testSetReadProperties(helper: EthUniqueHelper, mode: TCollectionMode) {
    const collection = await helper[mode].mintCollection(alice, {name: 'A', description: 'B', tokenPrefix: 'C'});

    const sender = await helper.eth.createAccountWithBalance(alice, 100n);
    await collection.addAdmin(alice, {Ethereum: sender});

    const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = helper.ethNativeContract.collection(collectionAddress, mode, sender);

    const keys = ['key0', 'key1'];

    const writeProperties = [
      helper.ethProperty.property(keys[0], 'value0'),
      helper.ethProperty.property(keys[1], 'value1'),
    ];

    await contract.methods.setCollectionProperties(writeProperties).send();
    const readProperties = await contract.methods.collectionProperties([keys[0], keys[1]]).call();
    expect(readProperties).to.be.like(writeProperties);
  }

  itEth('Set/read properties ft', async ({helper}) => {
    await testSetReadProperties(helper, 'ft');
  });
  itEth('Set/read properties rft', async ({helper}) => {
    await testSetReadProperties(helper, 'rft');
  });
  itEth('Set/read properties nft', async ({helper}) => {
    await testSetReadProperties(helper, 'nft');
  });

  async function testDeleteProperties(helper: EthUniqueHelper, mode: TCollectionMode) {
    const collection = await helper[mode].mintCollection(alice, {name: 'A', description: 'B', tokenPrefix: 'C'});

    const sender = await helper.eth.createAccountWithBalance(alice, 100n);
    await collection.addAdmin(alice, {Ethereum: sender});

    const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = helper.ethNativeContract.collection(collectionAddress, mode, sender);

    const keys = ['key0', 'key1', 'key2', 'key3'];

    {
      const writeProperties = [
        helper.ethProperty.property(keys[0], 'value0'),
        helper.ethProperty.property(keys[1], 'value1'),
        helper.ethProperty.property(keys[2], 'value2'),
        helper.ethProperty.property(keys[3], 'value3'),
      ];

      await contract.methods.setCollectionProperties(writeProperties).send();
      const readProperties = await contract.methods.collectionProperties([keys[0], keys[1], keys[2], keys[3]]).call();
      expect(readProperties).to.be.like(writeProperties);
    }

    {
      const expectProperties = [
        helper.ethProperty.property(keys[0], 'value0'),
        helper.ethProperty.property(keys[1], 'value1'),
      ];

      await contract.methods.deleteCollectionProperties([keys[2], keys[3]]).send();
      const readProperties = await contract.methods.collectionProperties([]).call();
      expect(readProperties).to.be.like(expectProperties);
    }
  }
  
  itEth('Delete properties ft', async ({helper}) => {
    await testDeleteProperties(helper, 'ft');
  });
  itEth('Delete properties rft', async ({helper}) => {
    await testDeleteProperties(helper, 'rft');
  });
  itEth('Delete properties nft', async ({helper}) => {
    await testDeleteProperties(helper, 'nft');
  });
    
});