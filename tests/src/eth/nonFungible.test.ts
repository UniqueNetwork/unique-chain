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

import {itEth, usingEthPlaygrounds, expect, EthUniqueHelper} from './util/playgrounds';
import {IKeyringPair} from '@polkadot/types/types';
import {Contract} from 'web3-eth-contract';


describe('NFT: Information getting', () => {
  let donor: IKeyringPair;
  let alice: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (helper, privateKey) => {
      donor = privateKey('//Alice');
      [alice] = await helper.arrange.createAccounts([10n], donor);
    });
  });
  
  itEth('totalSupply', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {});
    await collection.mintToken(alice);

    const caller = await helper.eth.createAccountWithBalance(donor);

    const contract = helper.ethNativeContract.collectionById(collection.collectionId, 'nft', caller);
    const totalSupply = await contract.methods.totalSupply().call();

    expect(totalSupply).to.equal('1');
  });

  itEth('balanceOf', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {});
    const caller = await helper.eth.createAccountWithBalance(donor);

    await collection.mintToken(alice, {Ethereum: caller});
    await collection.mintToken(alice, {Ethereum: caller});
    await collection.mintToken(alice, {Ethereum: caller});

    const contract = helper.ethNativeContract.collectionById(collection.collectionId, 'nft', caller);
    const balance = await contract.methods.balanceOf(caller).call();

    expect(balance).to.equal('3');
  });

  itEth('ownerOf', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {});
    const caller = await helper.eth.createAccountWithBalance(donor);

    const token = await collection.mintToken(alice, {Ethereum: caller});

    const contract = helper.ethNativeContract.collectionById(collection.collectionId, 'nft', caller);

    const owner = await contract.methods.ownerOf(token.tokenId).call();

    expect(owner).to.equal(caller);
  });
});

describe('Check ERC721 token URI for NFT', () => {
  let donor: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (_helper, privateKey) => {
      donor = privateKey('//Alice');
    });
  });

  async function setup(helper: EthUniqueHelper, baseUri: string, propertyKey?: string, propertyValue?: string): Promise<{contract: Contract, nextTokenId: string}> {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const receiver = helper.eth.createAccount();

    const {collectionAddress} = await helper.eth.createERC721MetadataCompatibleNFTCollection(owner, 'Mint collection', 'a', 'b', baseUri);
    const contract = helper.ethNativeContract.collection(collectionAddress, 'nft', owner);
    
    const nextTokenId = await contract.methods.nextTokenId().call();
    expect(nextTokenId).to.be.equal('1');
    const result = await contract.methods.mint(
      receiver,
      nextTokenId,
    ).send();

    if (propertyKey && propertyValue) {
      // Set URL or suffix
      await contract.methods.setProperty(nextTokenId, propertyKey, Buffer.from(propertyValue)).send();
    }

    const event = result.events.Transfer;
    expect(event.address).to.be.equal(collectionAddress);
    expect(event.returnValues.from).to.be.equal('0x0000000000000000000000000000000000000000');
    expect(event.returnValues.to).to.be.equal(receiver);
    expect(event.returnValues.tokenId).to.be.equal(nextTokenId);

    return {contract, nextTokenId};
  }

  itEth('Empty tokenURI', async ({helper}) => {
    const {contract, nextTokenId} = await setup(helper, '');
    expect(await contract.methods.tokenURI(nextTokenId).call()).to.be.equal('');
  });

  itEth('TokenURI from url', async ({helper}) => {
    const {contract, nextTokenId} = await setup(helper, 'BaseURI_', 'URI', 'Token URI');
    expect(await contract.methods.tokenURI(nextTokenId).call()).to.be.equal('Token URI');
  });

  itEth('TokenURI from baseURI', async ({helper}) => {
    const {contract, nextTokenId} = await setup(helper, 'BaseURI_');
    expect(await contract.methods.tokenURI(nextTokenId).call()).to.be.equal('BaseURI_');
  });

  itEth('TokenURI from baseURI + suffix', async ({helper}) => {
    const suffix = '/some/suffix';
    const {contract, nextTokenId} = await setup(helper, 'BaseURI_', 'URISuffix', suffix);
    expect(await contract.methods.tokenURI(nextTokenId).call()).to.be.equal('BaseURI_' + suffix);
  });
});

describe('NFT: Plain calls', () => {
  let donor: IKeyringPair;
  let alice: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (helper, privateKey) => {
      donor = privateKey('//Alice');
      [alice] = await helper.arrange.createAccounts([10n], donor);
    });
  });

  itEth('Can perform mint()', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const receiver = helper.eth.createAccount();

    const {collectionAddress} = await helper.eth.createERC721MetadataCompatibleNFTCollection(owner, 'Mint collection', '6', '6', '');
    const contract = helper.ethNativeContract.collection(collectionAddress, 'nft', owner);
    const nextTokenId = await contract.methods.nextTokenId().call();

    expect(nextTokenId).to.be.equal('1');
    const result = await contract.methods.mintWithTokenURI(
      receiver,
      nextTokenId,
      'Test URI',
    ).send();

    const event = result.events.Transfer;
    expect(event.address).to.be.equal(collectionAddress);
    expect(event.returnValues.from).to.be.equal('0x0000000000000000000000000000000000000000');
    expect(event.returnValues.to).to.be.equal(receiver);
    expect(event.returnValues.tokenId).to.be.equal(nextTokenId);

    expect(await contract.methods.tokenURI(nextTokenId).call()).to.be.equal('Test URI');

    // TODO: this wont work right now, need release 919000 first
    // await helper.methods.setOffchainSchema(collectionIdAddress, 'https://offchain-service.local/token-info/{id}').send();
    // const tokenUri = await contract.methods.tokenURI(nextTokenId).call();
    // expect(tokenUri).to.be.equal(`https://offchain-service.local/token-info/${nextTokenId}`);
  });

  //TODO: CORE-302 add eth methods
  itEth.skip('Can perform mintBulk()', async ({helper}) => {
    const caller = await helper.eth.createAccountWithBalance(donor);
    const receiver = helper.eth.createAccount();

    const collection = await helper.nft.mintCollection(alice);
    await collection.addAdmin(alice, {Ethereum: caller});

    const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = helper.ethNativeContract.collection(collectionAddress, 'nft', caller);
    {
      const bulkSize = 3;
      const nextTokenId = await contract.methods.nextTokenId().call();
      expect(nextTokenId).to.be.equal('1');
      const result = await contract.methods.mintBulkWithTokenURI(
        receiver,
        Array.from({length: bulkSize}, (_, i) => (
          [+nextTokenId + i, `Test URI ${i}`]
        )),
      ).send({from: caller});

      const events = result.events.Transfer.sort((a: any, b: any) => +a.returnValues.tokenId - b.returnValues.tokenId);
      for (let i = 0; i < bulkSize; i++) {
        const event = events[i];
        expect(event.address).to.equal(collectionAddress);
        expect(event.returnValues.from).to.equal('0x0000000000000000000000000000000000000000');
        expect(event.returnValues.to).to.equal(receiver);
        expect(event.returnValues.tokenId).to.equal(`${+nextTokenId + i}`);

        expect(await contract.methods.tokenURI(+nextTokenId + i).call()).to.be.equal(`Test URI ${i}`);
      }
    }
  });

  itEth('Can perform burn()', async ({helper}) => {
    const caller = await helper.eth.createAccountWithBalance(donor);

    const collection = await helper.nft.mintCollection(alice, {});
    const {tokenId} = await collection.mintToken(alice, {Ethereum: caller});

    const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = helper.ethNativeContract.collection(collectionAddress, 'nft', caller);

    {
      const result = await contract.methods.burn(tokenId).send({from: caller});
      
      const event = result.events.Transfer;
      expect(event.address).to.be.equal(collectionAddress);
      expect(event.returnValues.from).to.be.equal(caller);
      expect(event.returnValues.to).to.be.equal('0x0000000000000000000000000000000000000000');
      expect(event.returnValues.tokenId).to.be.equal(`${tokenId}`);
    }
  });

  itEth('Can perform approve()', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const spender = helper.eth.createAccount();

    const collection = await helper.nft.mintCollection(alice, {});
    const {tokenId} = await collection.mintToken(alice, {Ethereum: owner});

    const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = helper.ethNativeContract.collection(collectionAddress, 'nft', owner);

    {
      const result = await contract.methods.approve(spender, tokenId).send({from: owner});

      const event = result.events.Approval;
      expect(event.address).to.be.equal(collectionAddress);
      expect(event.returnValues.owner).to.be.equal(owner);
      expect(event.returnValues.approved).to.be.equal(spender);
      expect(event.returnValues.tokenId).to.be.equal(`${tokenId}`);
    }
  });

  itEth('Can perform transferFrom()', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const spender = await helper.eth.createAccountWithBalance(donor);
    const receiver = helper.eth.createAccount();

    const collection = await helper.nft.mintCollection(alice, {});
    const {tokenId} = await collection.mintToken(alice, {Ethereum: owner});

    const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = helper.ethNativeContract.collection(collectionAddress, 'nft', owner);

    await contract.methods.approve(spender, tokenId).send({from: owner});

    {
      const result = await contract.methods.transferFrom(owner, receiver, tokenId).send({from: spender});

      const event = result.events.Transfer;
      expect(event.address).to.be.equal(collectionAddress);
      expect(event.returnValues.from).to.be.equal(owner);
      expect(event.returnValues.to).to.be.equal(receiver);
      expect(event.returnValues.tokenId).to.be.equal(`${tokenId}`);
    }

    {
      const balance = await contract.methods.balanceOf(receiver).call();
      expect(+balance).to.equal(1);
    }

    {
      const balance = await contract.methods.balanceOf(owner).call();
      expect(+balance).to.equal(0);
    }
  });

  itEth('Can perform transfer()', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {});
    const owner = await helper.eth.createAccountWithBalance(donor);
    const receiver = helper.eth.createAccount();

    const {tokenId} = await collection.mintToken(alice, {Ethereum: owner});

    const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = helper.ethNativeContract.collection(collectionAddress, 'nft', owner);

    {
      const result = await contract.methods.transfer(receiver, tokenId).send({from: owner});

      const event = result.events.Transfer;
      expect(event.address).to.be.equal(collectionAddress);
      expect(event.returnValues.from).to.be.equal(owner);
      expect(event.returnValues.to).to.be.equal(receiver);
      expect(event.returnValues.tokenId).to.be.equal(`${tokenId}`);
    }

    {
      const balance = await contract.methods.balanceOf(owner).call();
      expect(+balance).to.equal(0);
    }

    {
      const balance = await contract.methods.balanceOf(receiver).call();
      expect(+balance).to.equal(1);
    }
  });
});

describe('NFT: Fees', () => {
  let donor: IKeyringPair;
  let alice: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (helper, privateKey) => {
      donor = privateKey('//Alice');
      [alice] = await helper.arrange.createAccounts([10n], donor);
    });
  });
  
  itEth('approve() call fee is less than 0.2UNQ', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const spender = helper.eth.createAccount();

    const collection = await helper.nft.mintCollection(alice, {});
    const {tokenId} = await collection.mintToken(alice, {Ethereum: owner});

    const contract = helper.ethNativeContract.collectionById(collection.collectionId, 'nft', owner);

    const cost = await helper.eth.recordCallFee(owner, () => contract.methods.approve(spender, tokenId).send({from: owner}));
    expect(cost < BigInt(0.2 * Number(helper.balance.getOneTokenNominal())));
  });

  itEth('transferFrom() call fee is less than 0.2UNQ', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const spender = await helper.eth.createAccountWithBalance(donor);

    const collection = await helper.nft.mintCollection(alice, {});
    const {tokenId} = await collection.mintToken(alice, {Ethereum: owner});

    const contract = helper.ethNativeContract.collectionById(collection.collectionId, 'nft', owner);

    await contract.methods.approve(spender, tokenId).send({from: owner});

    const cost = await helper.eth.recordCallFee(spender, () => contract.methods.transferFrom(owner, spender, tokenId).send({from: spender}));
    expect(cost < BigInt(0.2 * Number(helper.balance.getOneTokenNominal())));
  });

  itEth('transfer() call fee is less than 0.2UNQ', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const receiver = helper.eth.createAccount();

    const collection = await helper.nft.mintCollection(alice, {});
    const {tokenId} = await collection.mintToken(alice, {Ethereum: owner});

    const contract = helper.ethNativeContract.collectionById(collection.collectionId, 'nft', owner);

    const cost = await helper.eth.recordCallFee(owner, () => contract.methods.transfer(receiver, tokenId).send({from: owner}));
    expect(cost < BigInt(0.2 * Number(helper.balance.getOneTokenNominal())));
  });
});

describe('NFT: Substrate calls', () => {
  let donor: IKeyringPair;
  let alice: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (helper, privateKey) => {
      donor = privateKey('//Alice');
      [alice] = await helper.arrange.createAccounts([20n], donor);
    });
  });

  itEth('Events emitted for mint()', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {});
    const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = helper.ethNativeContract.collection(collectionAddress, 'nft');

    const events: any = [];
    contract.events.allEvents((_: any, event: any) => {
      events.push(event);
    });
    const {tokenId} = await collection.mintToken(alice);

    const event = events[0];
    expect(event.event).to.be.equal('Transfer');
    expect(event.address).to.be.equal(collectionAddress);
    expect(event.returnValues.from).to.be.equal('0x0000000000000000000000000000000000000000');
    expect(event.returnValues.to).to.be.equal(helper.address.substrateToEth(alice.address));
    expect(event.returnValues.tokenId).to.be.equal(tokenId.toString());
  });

  itEth('Events emitted for burn()', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {});
    const token = await collection.mintToken(alice);

    const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = helper.ethNativeContract.collection(collectionAddress, 'nft');
    
    const events: any = [];
    contract.events.allEvents((_: any, event: any) => {
      events.push(event);
    });

    await token.burn(alice);

    const event = events[0];
    expect(event.event).to.be.equal('Transfer');
    expect(event.address).to.be.equal(collectionAddress);
    expect(event.returnValues.from).to.be.equal(helper.address.substrateToEth(alice.address));
    expect(event.returnValues.to).to.be.equal('0x0000000000000000000000000000000000000000');
    expect(event.returnValues.tokenId).to.be.equal(token.tokenId.toString());
  });

  itEth('Events emitted for approve()', async ({helper}) => {
    const receiver = helper.eth.createAccount();

    const collection = await helper.nft.mintCollection(alice, {});
    const token = await collection.mintToken(alice);

    const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = helper.ethNativeContract.collection(collectionAddress, 'nft');
    
    const events: any = [];
    contract.events.allEvents((_: any, event: any) => {
      events.push(event);
    });

    await token.approve(alice, {Ethereum: receiver});

    const event = events[0];
    expect(event.event).to.be.equal('Approval');
    expect(event.address).to.be.equal(collectionAddress);
    expect(event.returnValues.owner).to.be.equal(helper.address.substrateToEth(alice.address));
    expect(event.returnValues.approved).to.be.equal(receiver);
    expect(event.returnValues.tokenId).to.be.equal(token.tokenId.toString());
  });

  itEth('Events emitted for transferFrom()', async ({helper}) => {
    const [bob] = await helper.arrange.createAccounts([10n], donor);
    const receiver = helper.eth.createAccount();

    const collection = await helper.nft.mintCollection(alice, {});
    const token = await collection.mintToken(alice);
    await token.approve(alice, {Substrate: bob.address});

    const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = helper.ethNativeContract.collection(collectionAddress, 'nft');
    
    const events: any = [];
    contract.events.allEvents((_: any, event: any) => {
      events.push(event);
    });

    await token.transferFrom(bob, {Substrate: alice.address}, {Ethereum: receiver});
    
    const event = events[0];
    expect(event.address).to.be.equal(collectionAddress);
    expect(event.returnValues.from).to.be.equal(helper.address.substrateToEth(alice.address));
    expect(event.returnValues.to).to.be.equal(receiver);
    expect(event.returnValues.tokenId).to.be.equal(`${token.tokenId}`);
  });

  itEth('Events emitted for transfer()', async ({helper}) => {
    const receiver = helper.eth.createAccount();

    const collection = await helper.nft.mintCollection(alice, {});
    const token = await collection.mintToken(alice);

    const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = helper.ethNativeContract.collection(collectionAddress, 'nft');
    
    const events: any = [];
    contract.events.allEvents((_: any, event: any) => {
      events.push(event);
    });

    await token.transfer(alice, {Ethereum: receiver});
    
    const event = events[0];
    expect(event.address).to.be.equal(collectionAddress);
    expect(event.returnValues.from).to.be.equal(helper.address.substrateToEth(alice.address));
    expect(event.returnValues.to).to.be.equal(receiver);
    expect(event.returnValues.tokenId).to.be.equal(`${token.tokenId}`);
  });
});

describe('Common metadata', () => {
  let donor: IKeyringPair;
  let alice: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (helper, privateKey) => {
      donor = privateKey('//Alice');
      [alice] = await helper.arrange.createAccounts([20n], donor);
    });
  });

  itEth('Returns collection name', async ({helper}) => {
    const caller = await helper.eth.createAccountWithBalance(donor);
    const tokenPropertyPermissions = [{
      key: 'URI',
      permission: {
        mutable: true,
        collectionAdmin: true,
        tokenOwner: false,
      },
    }];
    const collection = await helper.nft.mintCollection(
      alice,
      {
        name: 'oh River',
        tokenPrefix: 'CHANGE',
        properties: [{key: 'ERC721Metadata', value: '1'}],
        tokenPropertyPermissions,
      },
    );

    const contract = helper.ethNativeContract.collectionById(collection.collectionId, 'nft', caller);
    const name = await contract.methods.name().call();
    expect(name).to.equal('oh River');
  });

  itEth('Returns symbol name', async ({helper}) => {
    const caller = await helper.eth.createAccountWithBalance(donor);
    const tokenPropertyPermissions = [{
      key: 'URI',
      permission: {
        mutable: true,
        collectionAdmin: true,
        tokenOwner: false,
      },
    }];
    const collection = await helper.nft.mintCollection(
      alice,
      {
        name: 'oh River',
        tokenPrefix: 'CHANGE',
        properties: [{key: 'ERC721Metadata', value: '1'}],
        tokenPropertyPermissions,
      },
    );

    const contract = helper.ethNativeContract.collectionById(collection.collectionId, 'nft', caller);
    const symbol = await contract.methods.symbol().call();
    expect(symbol).to.equal('CHANGE');
  });
});