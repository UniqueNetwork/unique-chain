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

import {Pallets, requirePalletsOrSkip} from '../util';
import {expect, itEth, usingEthPlaygrounds} from './util';
import {IKeyringPair} from '@polkadot/types/types';

describe('Refungible: Information getting', () => {
  let donor: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (helper, privateKey) => {
      requirePalletsOrSkip(this, helper, [Pallets.ReFungible]);

      donor = await privateKey({filename: __filename});
    });
  });

  itEth('totalSupply', async ({helper}) => {
    const caller = await helper.eth.createAccountWithBalance(donor);
    const {collectionAddress} = await helper.eth.createRFTCollection(caller, 'TotalSupply', '6', '6');
    const contract = helper.ethNativeContract.collection(collectionAddress, 'rft', caller);

    await contract.methods.mint(caller).send();

    const totalSupply = await contract.methods.totalSupply().call();
    expect(totalSupply).to.equal('1');
  });

  itEth('balanceOf', async ({helper}) => {
    const caller = await helper.eth.createAccountWithBalance(donor);
    const {collectionAddress} = await helper.eth.createRFTCollection(caller, 'BalanceOf', '6', '6');
    const contract = helper.ethNativeContract.collection(collectionAddress, 'rft', caller);

    await contract.methods.mint(caller).send();
    await contract.methods.mint(caller).send();
    await contract.methods.mint(caller).send();

    const balance = await contract.methods.balanceOf(caller).call();
    expect(balance).to.equal('3');
  });

  itEth('ownerOf', async ({helper}) => {
    const caller = await helper.eth.createAccountWithBalance(donor);
    const {collectionAddress} = await helper.eth.createRFTCollection(caller, 'OwnerOf', '6', '6');
    const contract = helper.ethNativeContract.collection(collectionAddress, 'rft', caller);

    const result = await contract.methods.mint(caller).send();
    const tokenId = result.events.Transfer.returnValues.tokenId;

    const owner = await contract.methods.ownerOf(tokenId).call();
    expect(owner).to.equal(caller);
  });

  itEth('ownerOf after burn', async ({helper}) => {
    const caller = await helper.eth.createAccountWithBalance(donor);
    const receiver = helper.eth.createAccount();
    const {collectionId, collectionAddress} = await helper.eth.createRFTCollection(caller, 'OwnerOf-AfterBurn', '6', '6');
    const contract = helper.ethNativeContract.collection(collectionAddress, 'rft', caller);

    const result = await contract.methods.mint(caller).send();
    const tokenId = result.events.Transfer.returnValues.tokenId;
    const tokenContract = helper.ethNativeContract.rftTokenById(collectionId, tokenId, caller);

    await tokenContract.methods.repartition(2).send();
    await tokenContract.methods.transfer(receiver, 1).send();

    await tokenContract.methods.burnFrom(caller, 1).send();

    const owner = await contract.methods.ownerOf(tokenId).call();
    expect(owner).to.equal(receiver);
  });

  itEth('ownerOf for partial ownership', async ({helper}) => {
    const caller = await helper.eth.createAccountWithBalance(donor);
    const receiver = helper.eth.createAccount();
    const {collectionId, collectionAddress} = await helper.eth.createRFTCollection(caller, 'Partial-OwnerOf', '6', '6');
    const contract = helper.ethNativeContract.collection(collectionAddress, 'rft', caller);

    const result = await contract.methods.mint(caller).send();
    const tokenId = result.events.Transfer.returnValues.tokenId;
    const tokenContract = helper.ethNativeContract.rftTokenById(collectionId, tokenId, caller);

    await tokenContract.methods.repartition(2).send();
    await tokenContract.methods.transfer(receiver, 1).send();

    const owner = await contract.methods.ownerOf(tokenId).call();
    expect(owner).to.equal('0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF');
  });
});

describe('Refungible: Plain calls', () => {
  let donor: IKeyringPair;
  let minter: IKeyringPair;
  let bob: IKeyringPair;
  let charlie: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (helper, privateKey) => {
      requirePalletsOrSkip(this, helper, [Pallets.ReFungible]);

      donor = await privateKey({filename: __filename});
      [minter, bob, charlie] = await helper.arrange.createAccounts([100n, 100n, 100n], donor);
    });
  });

  itEth('Can perform mint() & crossOwnerOf()', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const receiver = helper.eth.createAccount();
    const {collectionAddress} = await helper.eth.createERC721MetadataCompatibleRFTCollection(owner, 'Minty', '6', '6', '');
    const contract = helper.ethNativeContract.collection(collectionAddress, 'rft', owner);

    const result = await contract.methods.mintWithTokenURI(receiver, 'Test URI').send();

    const event = result.events.Transfer;
    expect(event.address).to.equal(collectionAddress);
    expect(event.returnValues.from).to.equal('0x0000000000000000000000000000000000000000');
    expect(event.returnValues.to).to.equal(receiver);
    const tokenId = event.returnValues.tokenId;
    expect(tokenId).to.be.equal('1');

    expect(await contract.methods.crossOwnerOf(tokenId).call()).to.be.like([receiver, '0']);
    expect(await contract.methods.tokenURI(tokenId).call()).to.be.equal('Test URI');
  });

  itEth.skip('Can perform mintBulk()', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const receiver = helper.eth.createAccount();
    const {collectionAddress} = await helper.eth.createERC721MetadataCompatibleRFTCollection(owner, 'MintBulky', '6', '6', '');
    const contract = helper.ethNativeContract.collection(collectionAddress, 'rft', owner);

    {
      const nextTokenId = await contract.methods.nextTokenId().call();
      expect(nextTokenId).to.be.equal('1');
      const result = await contract.methods.mintBulkWithTokenURI(
        receiver,
        [
          [nextTokenId, 'Test URI 0'],
          [+nextTokenId + 1, 'Test URI 1'],
          [+nextTokenId + 2, 'Test URI 2'],
        ],
      ).send();

      const events = result.events.Transfer;
      for (let i = 0; i < 2; i++) {
        const event = events[i];
        expect(event.address).to.equal(collectionAddress);
        expect(event.returnValues.from).to.equal('0x0000000000000000000000000000000000000000');
        expect(event.returnValues.to).to.equal(receiver);
        expect(event.returnValues.tokenId).to.equal(String(+nextTokenId + i));
      }

      expect(await contract.methods.tokenURI(nextTokenId).call()).to.be.equal('Test URI 0');
      expect(await contract.methods.tokenURI(+nextTokenId + 1).call()).to.be.equal('Test URI 1');
      expect(await contract.methods.tokenURI(+nextTokenId + 2).call()).to.be.equal('Test URI 2');
    }
  });

  itEth('Can perform burn()', async ({helper}) => {
    const caller = await helper.eth.createAccountWithBalance(donor);
    const {collectionAddress} = await helper.eth.createRFTCollection(caller, 'Burny', '6', '6');
    const contract = helper.ethNativeContract.collection(collectionAddress, 'rft', caller);

    const result = await contract.methods.mint(caller).send();
    const tokenId = result.events.Transfer.returnValues.tokenId;
    {
      const result = await contract.methods.burn(tokenId).send();
      const event = result.events.Transfer;
      expect(event.address).to.equal(collectionAddress);
      expect(event.returnValues.from).to.equal(caller);
      expect(event.returnValues.to).to.equal('0x0000000000000000000000000000000000000000');
      expect(event.returnValues.tokenId).to.equal(tokenId.toString());
    }
  });

  itEth('Can perform transferFrom()', async ({helper}) => {
    const caller = await helper.eth.createAccountWithBalance(donor);
    const receiver = helper.eth.createAccount();
    const {collectionId, collectionAddress} = await helper.eth.createRFTCollection(caller, 'TransferFromy', '6', '6');
    const contract = helper.ethNativeContract.collection(collectionAddress, 'rft', caller);

    const result = await contract.methods.mint(caller).send();
    const tokenId = result.events.Transfer.returnValues.tokenId;

    const tokenAddress = helper.ethAddress.fromTokenId(collectionId, tokenId);

    const tokenContract = helper.ethNativeContract.rftToken(tokenAddress, caller);
    await tokenContract.methods.repartition(15).send();

    {
      const tokenEvents: any = [];
      tokenContract.events.allEvents((_: any, event: any) => {
        tokenEvents.push(event);
      });
      const result = await contract.methods.transferFrom(caller, receiver, tokenId).send();
      if (tokenEvents.length == 0) await helper.wait.newBlocks(1);

      let event = result.events.Transfer;
      expect(event.address).to.equal(collectionAddress);
      expect(event.returnValues.from).to.equal(caller);
      expect(event.returnValues.to).to.equal(receiver);
      expect(event.returnValues.tokenId).to.equal(tokenId.toString());

      event = tokenEvents[0];
      expect(event.address).to.equal(tokenAddress);
      expect(event.returnValues.from).to.equal(caller);
      expect(event.returnValues.to).to.equal(receiver);
      expect(event.returnValues.value).to.equal('15');
    }

    {
      const balance = await contract.methods.balanceOf(receiver).call();
      expect(+balance).to.equal(1);
    }

    {
      const balance = await contract.methods.balanceOf(caller).call();
      expect(+balance).to.equal(0);
    }
  });

  // Soft-deprecated
  itEth('Can perform burnFrom()', async ({helper}) => {
    const collection = await helper.rft.mintCollection(minter, {name: 'A', description: 'B', tokenPrefix: 'C'});

    const owner = await helper.eth.createAccountWithBalance(donor, 100n);
    const spender = await helper.eth.createAccountWithBalance(donor, 100n);

    const token = await collection.mintToken(minter, 100n, {Ethereum: owner});

    const address = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = helper.ethNativeContract.collection(address, 'rft', spender, true);

    const tokenAddress = helper.ethAddress.fromTokenId(collection.collectionId, token.tokenId);
    const tokenContract = helper.ethNativeContract.rftToken(tokenAddress, owner);
    await tokenContract.methods.repartition(15).send();
    await tokenContract.methods.approve(spender, 15).send();

    {
      const result = await contract.methods.burnFrom(owner, token.tokenId).send();
      const event = result.events.Transfer;
      expect(event).to.be.like({
        address: helper.ethAddress.fromCollectionId(collection.collectionId),
        event: 'Transfer',
        returnValues: {
          from: owner,
          to: '0x0000000000000000000000000000000000000000',
          tokenId: token.tokenId.toString(),
        },
      });
    }

    expect(await collection.getTokenBalance(token.tokenId, {Ethereum: owner})).to.be.eq(0n);
  });

  itEth('Can perform burnFromCross()', async ({helper}) => {
    const collection = await helper.rft.mintCollection(minter, {name: 'A', description: 'B', tokenPrefix: 'C'});
    
    const owner = bob;
    const spender = await helper.eth.createAccountWithBalance(donor, 100n);

    const token = await collection.mintToken(minter, 100n, {Substrate: owner.address});

    const address = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = helper.ethNativeContract.collection(address, 'rft');

    await token.repartition(owner, 15n);
    await token.approve(owner, {Ethereum: spender}, 15n);

    {
      const ownerCross = helper.ethCrossAccount.fromKeyringPair(owner);
      const result = await contract.methods.burnFromCross(ownerCross, token.tokenId).send({from: spender});
      const event = result.events.Transfer;
      expect(event).to.be.like({
        address: helper.ethAddress.fromCollectionId(collection.collectionId),
        event: 'Transfer',
        returnValues: {
          from: helper.address.substrateToEth(owner.address),
          to: '0x0000000000000000000000000000000000000000',
          tokenId: token.tokenId.toString(),
        },
      });
    }

    expect(await collection.getTokenBalance(token.tokenId, {Substrate: owner.address})).to.be.eq(0n);
  });

  itEth('Can perform transferFromCross()', async ({helper}) => {
    const collection = await helper.rft.mintCollection(minter, {name: 'A', description: 'B', tokenPrefix: 'C'});

    const owner = bob;
    const spender = await helper.eth.createAccountWithBalance(donor, 100n);
    const receiver = charlie;

    const token = await collection.mintToken(minter, 100n, {Substrate: owner.address});

    const address = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = helper.ethNativeContract.collection(address, 'rft');

    await token.repartition(owner, 15n);
    await token.approve(owner, {Ethereum: spender}, 15n);

    {
      const ownerCross = helper.ethCrossAccount.fromKeyringPair(owner);
      const recieverCross = helper.ethCrossAccount.fromKeyringPair(receiver);
      const result = await contract.methods.transferFromCross(ownerCross, recieverCross, token.tokenId).send({from: spender});
      const event = result.events.Transfer;
      expect(event).to.be.like({
        address: helper.ethAddress.fromCollectionId(collection.collectionId),
        event: 'Transfer',
        returnValues: {
          from: helper.address.substrateToEth(owner.address),
          to: helper.address.substrateToEth(receiver.address),
          tokenId: token.tokenId.toString(),
        },
      });
    }

    expect(await token.getTop10Owners()).to.be.like([{Substrate: receiver.address}]);
  });

  itEth('Can perform transfer()', async ({helper}) => {
    const caller = await helper.eth.createAccountWithBalance(donor);
    const receiver = helper.eth.createAccount();
    const {collectionAddress} = await helper.eth.createRFTCollection(caller, 'Transferry', '6', '6');
    const contract = helper.ethNativeContract.collection(collectionAddress, 'rft', caller);

    const result = await contract.methods.mint(caller).send();
    const tokenId = result.events.Transfer.returnValues.tokenId;

    {
      const result = await contract.methods.transfer(receiver, tokenId).send();

      const event = result.events.Transfer;
      expect(event.address).to.equal(collectionAddress);
      expect(event.returnValues.from).to.equal(caller);
      expect(event.returnValues.to).to.equal(receiver);
      expect(event.returnValues.tokenId).to.equal(tokenId.toString());
    }

    {
      const balance = await contract.methods.balanceOf(caller).call();
      expect(+balance).to.equal(0);
    }

    {
      const balance = await contract.methods.balanceOf(receiver).call();
      expect(+balance).to.equal(1);
    }
  });
  
  itEth('Can perform transferCross()', async ({helper}) => {
    const caller = await helper.eth.createAccountWithBalance(donor);
    const receiver = await helper.eth.createAccountWithBalance(donor);
    const to = helper.ethCrossAccount.fromAddress(receiver);
    const toSubstrate = helper.ethCrossAccount.fromKeyringPair(minter);
    const collection = await helper.rft.mintCollection(minter, {});
    const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = helper.ethNativeContract.collection(collectionAddress, 'rft', caller);

    const {tokenId} = await collection.mintToken(minter, 1n, {Ethereum: caller});

    {
      const result = await contract.methods.transferCross(to, tokenId).send({from: caller});

      const event = result.events.Transfer;
      expect(event.address).to.equal(collectionAddress);
      expect(event.returnValues.from).to.equal(caller);
      expect(event.returnValues.to).to.equal(receiver);
      expect(event.returnValues.tokenId).to.equal(tokenId.toString());
    }

    {
      const balance = await contract.methods.balanceOf(caller).call();
      expect(+balance).to.equal(0);
    }

    {
      const balance = await contract.methods.balanceOf(receiver).call();
      expect(+balance).to.equal(1);
    }
    
    {
      const substrateResult = await contract.methods.transferCross(toSubstrate, tokenId).send({from: receiver});
      

      const event = substrateResult.events.Transfer;
      expect(event.address).to.be.equal(collectionAddress);
      expect(event.returnValues.from).to.be.equal(receiver);
      expect(event.returnValues.to).to.be.equal(helper.address.substrateToEth(minter.address));
      expect(event.returnValues.tokenId).to.be.equal(`${tokenId}`);
    }

    {
      const balance = await contract.methods.balanceOf(receiver).call();
      expect(+balance).to.equal(0);
    }

    {
      const balance = await helper.nft.getTokensByAddress(collection.collectionId, {Substrate: minter.address});
      expect(balance).to.be.contain(tokenId);
    }
  });

  itEth('transfer event on transfer from partial ownership to full ownership', async ({helper}) => {
    const caller = await helper.eth.createAccountWithBalance(donor);
    const receiver = helper.eth.createAccount();
    const {collectionId, collectionAddress} = await helper.eth.createRFTCollection(caller, 'Transferry-Partial-to-Full', '6', '6');
    const contract = helper.ethNativeContract.collection(collectionAddress, 'rft', caller);

    const result = await contract.methods.mint(caller).send();
    const tokenId = result.events.Transfer.returnValues.tokenId;

    const tokenContract = helper.ethNativeContract.rftTokenById(collectionId, tokenId, caller);

    await tokenContract.methods.repartition(2).send();
    await tokenContract.methods.transfer(receiver, 1).send();

    const events: any = [];
    contract.events.allEvents((_: any, event: any) => {
      events.push(event);
    });

    await tokenContract.methods.transfer(receiver, 1).send();
    if (events.length == 0) await helper.wait.newBlocks(1);
    const event = events[0];

    expect(event.address).to.equal(collectionAddress);
    expect(event.returnValues.from).to.equal('0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF');
    expect(event.returnValues.to).to.equal(receiver);
    expect(event.returnValues.tokenId).to.equal(tokenId.toString());
  });

  itEth('transfer event on transfer from full ownership to partial ownership', async ({helper}) => {
    const caller = await helper.eth.createAccountWithBalance(donor);
    const receiver = helper.eth.createAccount();
    const {collectionId, collectionAddress} = await helper.eth.createRFTCollection(caller, 'Transferry-Full-to-Partial', '6', '6');
    const contract = helper.ethNativeContract.collection(collectionAddress, 'rft', caller);

    const result = await contract.methods.mint(caller).send();
    const tokenId = result.events.Transfer.returnValues.tokenId;

    const tokenContract = helper.ethNativeContract.rftTokenById(collectionId, tokenId, caller);

    await tokenContract.methods.repartition(2).send();

    const events: any = [];
    contract.events.allEvents((_: any, event: any) => {
      events.push(event);
    });

    await tokenContract.methods.transfer(receiver, 1).send();
    if (events.length == 0) await helper.wait.newBlocks(1);
    const event = events[0];

    expect(event.address).to.equal(collectionAddress);
    expect(event.returnValues.from).to.equal(caller);
    expect(event.returnValues.to).to.equal('0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF');
    expect(event.returnValues.tokenId).to.equal(tokenId.toString());
  });
});

describe('RFT: Fees', () => {
  let donor: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (helper, privateKey) => {
      requirePalletsOrSkip(this, helper, [Pallets.ReFungible]);

      donor = await privateKey({filename: __filename});
    });
  });

  itEth('transferFrom() call fee is less than 0.2UNQ', async ({helper}) => {
    const caller = await helper.eth.createAccountWithBalance(donor);
    const receiver = helper.eth.createAccount();
    const {collectionAddress} = await helper.eth.createRFTCollection(caller, 'Feeful-Transfer-From', '6', '6');
    const contract = helper.ethNativeContract.collection(collectionAddress, 'rft', caller);

    const result = await contract.methods.mint(caller).send();
    const tokenId = result.events.Transfer.returnValues.tokenId;

    const cost = await helper.eth.recordCallFee(caller, () => contract.methods.transferFrom(caller, receiver, tokenId).send());
    expect(cost < BigInt(0.2 * Number(helper.balance.getOneTokenNominal())));
    expect(cost > 0n);
  });

  itEth('transfer() call fee is less than 0.2UNQ', async ({helper}) => {
    const caller = await helper.eth.createAccountWithBalance(donor);
    const receiver = helper.eth.createAccount();
    const {collectionAddress} = await helper.eth.createRFTCollection(caller, 'Feeful-Transfer', '6', '6');
    const contract = helper.ethNativeContract.collection(collectionAddress, 'rft', caller);

    const result = await contract.methods.mint(caller).send();
    const tokenId = result.events.Transfer.returnValues.tokenId;

    const cost = await helper.eth.recordCallFee(caller, () => contract.methods.transfer(receiver, tokenId).send());
    expect(cost < BigInt(0.2 * Number(helper.balance.getOneTokenNominal())));
    expect(cost > 0n);
  });
});

describe('Common metadata', () => {
  let donor: IKeyringPair;
  let alice: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (helper, privateKey) => {
      requirePalletsOrSkip(this, helper, [Pallets.ReFungible]);

      donor = await privateKey({filename: __filename});
      [alice] = await helper.arrange.createAccounts([20n], donor);
    });
  });

  itEth('Returns collection name', async ({helper}) => {
    const caller = helper.eth.createAccount();
    const tokenPropertyPermissions = [{
      key: 'URI',
      permission: {
        mutable: true,
        collectionAdmin: true,
        tokenOwner: false,
      },
    }];
    const collection = await helper.rft.mintCollection(
      alice,
      {
        name: 'Leviathan',
        tokenPrefix: '11',
        properties: [{key: 'ERC721Metadata', value: '1'}],
        tokenPropertyPermissions,
      },
    );

    const contract = helper.ethNativeContract.collectionById(collection.collectionId, 'rft', caller);
    const name = await contract.methods.name().call();
    expect(name).to.equal('Leviathan');
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
    const {collectionId} = await helper.rft.mintCollection(
      alice,
      {
        name: 'Leviathan',
        tokenPrefix: '12',
        properties: [{key: 'ERC721Metadata', value: '1'}],
        tokenPropertyPermissions,
      },
    );

    const contract = helper.ethNativeContract.collectionById(collectionId, 'rft', caller);
    const symbol = await contract.methods.symbol().call();
    expect(symbol).to.equal('12');
  });
});
