import {itEth, usingEthPlaygrounds, expect} from './util/playgrounds';
import {IKeyringPair} from '@polkadot/types/types';
import {Pallets} from '../util/playgrounds';

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
    const collection = await helper.nft.mintCollection(alice, {name: 'name', description: 'test', tokenPrefix: 'test', properties: []});
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

describe('Supports ERC721Metadata', () => {
  let donor: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (_helper, privateKey) => {
      donor = privateKey('//Alice');
    });
  });

  itEth('ERC721Metadata property can be set for NFT collection', async({helper}) => {
    const caller = await helper.eth.createAccountWithBalance(donor);
    const tokenPropertyPermissions = [{
      key: 'URI',
      permission: {
        mutable: true,
        collectionAdmin: true,
        tokenOwner: false,
      },
    }];
    const collection = await helper.nft.mintCollection(donor, {name: 'col', description: 'descr', tokenPrefix: 'COL', tokenPropertyPermissions});

    await collection.addAdmin(donor, {Ethereum: caller});
    const contract = helper.ethNativeContract.collectionById(collection.collectionId, 'nft', caller);

    await contract.methods.setCollectionProperty('ERC721Metadata', Buffer.from('1')).send({from: caller});

    expect(await contract.methods.supportsInterface('0x5b5e139f').call()).to.be.true;

    await contract.methods.setCollectionProperty('ERC721Metadata', Buffer.from('0')).send({from: caller});

    expect(await contract.methods.supportsInterface('0x5b5e139f').call()).to.be.false;
  });

  itEth.ifWithPallets('ERC721Metadata property can be set for RFT collection', [Pallets.ReFungible], async({helper}) => {
    const caller = await helper.eth.createAccountWithBalance(donor);
    const tokenPropertyPermissions = [{
      key: 'URI',
      permission: {
        mutable: true,
        collectionAdmin: true,
        tokenOwner: false,
      },
    }];
    const collection = await helper.rft.mintCollection(donor, {name: 'col', description: 'descr', tokenPrefix: 'COL', tokenPropertyPermissions});

    await collection.addAdmin(donor, {Ethereum: caller});

    const contract = helper.ethNativeContract.collectionById(collection.collectionId, 'nft', caller);

    await contract.methods.setCollectionProperty('ERC721Metadata', Buffer.from('1')).send({from: caller});

    expect(await contract.methods.supportsInterface('0x5b5e139f').call()).to.be.true;

    await contract.methods.setCollectionProperty('ERC721Metadata', Buffer.from('0')).send({from: caller});

    expect(await contract.methods.supportsInterface('0x5b5e139f').call()).to.be.false;
  });
});
