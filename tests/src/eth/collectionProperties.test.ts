import {itEth, usingEthPlaygrounds, expect, EthUniqueHelper} from './util/playgrounds';
import {IKeyringPair} from '@polkadot/types/types';
import {Pallets} from '../util/playgrounds';
import {IProperty, ITokenPropertyPermission} from "../util/playgrounds/types";

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

  const checkERC721Metadata = async (helper: EthUniqueHelper, mode: 'nft' | 'rft') => {
    const caller = await helper.eth.createAccountWithBalance(donor);
    const bruh = await helper.eth.createAccountWithBalance(donor);

    const BASE_URI = 'base/'
    const SUFFIX = 'suffix1'
    const URI = 'uri1'

    const collectionHelpers = helper.ethNativeContract.collectionHelpers(caller);
    const creatorMethod = mode === 'rft' ? 'createRFTCollection' : 'createNFTCollection'

    const {collectionId, collectionAddress} = await helper.eth[creatorMethod](caller, 'n', 'd', 'p')

    const contract = helper.ethNativeContract.collectionById(collectionId, mode, caller);
    await contract.methods.addCollectionAdmin(bruh).send(); // to check that admin will work too

    const collection1 = await helper.nft.getCollectionObject(collectionId);
    const data1 = await collection1.getData()
    expect(data1?.raw.flags.erc721metadata).to.be.false;
    expect(await contract.methods.supportsInterface('0x5b5e139f').call()).to.be.false;

    await collectionHelpers.methods.makeCollectionERC721MetadataCompatible(collectionAddress, BASE_URI)
      .send({from: bruh});

    expect(await contract.methods.supportsInterface('0x5b5e139f').call()).to.be.true;

    const collection2 = await helper.nft.getCollectionObject(collectionId);
    const data2 = await collection2.getData()
    expect(data2?.raw.flags.erc721metadata).to.be.true;

    const TPPs = data2?.raw.tokenPropertyPermissions
    expect(TPPs?.length).to.equal(2);

    expect(TPPs.find((tpp: ITokenPropertyPermission) => {
      return tpp.key === "URI" && tpp.permission.mutable && tpp.permission.collectionAdmin && !tpp.permission.tokenOwner
    })).to.be.not.null

    expect(TPPs.find((tpp: ITokenPropertyPermission) => {
      return tpp.key === "URISuffix" && tpp.permission.mutable && tpp.permission.collectionAdmin && !tpp.permission.tokenOwner
    })).to.be.not.null

    expect(data2?.raw.properties?.find((property: IProperty) => {
      return property.key === "baseURI" && property.value === BASE_URI
    })).to.be.not.null

    const token1Result = await contract.methods.mint(bruh).send();
    const tokenId1 = token1Result.events.Transfer.returnValues.tokenId;

    expect(await contract.methods.tokenURI(tokenId1).call()).to.equal(BASE_URI);

    await contract.methods.setProperty(tokenId1, "URISuffix", Buffer.from(SUFFIX)).send();
    expect(await contract.methods.tokenURI(tokenId1).call()).to.equal(BASE_URI + SUFFIX);

    await contract.methods.setProperty(tokenId1, "URI", Buffer.from(URI)).send();
    expect(await contract.methods.tokenURI(tokenId1).call()).to.equal(URI);

    await contract.methods.deleteProperty(tokenId1, "URI").send();
    expect(await contract.methods.tokenURI(tokenId1).call()).to.equal(BASE_URI + SUFFIX);

    const token2Result = await contract.methods.mintWithTokenURI(bruh, URI).send();
    const tokenId2 = token2Result.events.Transfer.returnValues.tokenId;

    expect(await contract.methods.tokenURI(tokenId2).call()).to.equal(URI);

    await contract.methods.deleteProperty(tokenId2, "URI").send();
    expect(await contract.methods.tokenURI(tokenId2).call()).to.equal(BASE_URI);

    await contract.methods.setProperty(tokenId2, "URISuffix", Buffer.from(SUFFIX)).send();
    expect(await contract.methods.tokenURI(tokenId2).call()).to.equal(BASE_URI + SUFFIX);
  }

  itEth('ERC721Metadata property can be set for NFT collection', async({helper}) => {
    await checkERC721Metadata(helper, 'nft');
  });

  itEth.ifWithPallets('ERC721Metadata property can be set for RFT collection', [Pallets.ReFungible], async({helper}) => {
    await checkERC721Metadata(helper, 'rft');
  });
});
