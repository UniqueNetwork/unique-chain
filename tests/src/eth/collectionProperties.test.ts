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
  itEth.only('Set/read properties', async ({helper, privateKey}) => {
    const alice = privateKey('//Alice');
    const collection = await helper.nft.mintCollection(alice, {name: 'A', description: 'B', tokenPrefix: 'C'});

    const sender = await helper.eth.createAccountWithBalance(alice, 100n);
    await collection.addAdmin(alice, {Ethereum: sender});

    const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = helper.ethNativeContract.collection(collectionAddress, 'nft', sender);

    const key1 = 'key1';
    const value1 = Buffer.from('value1');
    
    const key2 = 'key2';
    const value2 = Buffer.from('value2');

    const writeProperties = [
      [key1, '0x'+value1.toString('hex')],
      [key2, '0x'+value2.toString('hex')],
    ];

    await contract.methods.setCollectionProperties(writeProperties).send();
    const readProperties = await contract.methods.collectionProperties([key1, key2]).call();
    expect(readProperties).to.be.like(writeProperties);
  });
});