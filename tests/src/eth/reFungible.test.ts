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

import {Pallets, requirePalletsOrSkip} from '../util/playgrounds';
import {expect, itEth, usingEthPlaygrounds} from './util/playgrounds';
import {IKeyringPair} from '@polkadot/types/types';

describe('Refungible: Information getting', () => {
  let donor: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (helper, privateKey) => {
      requirePalletsOrSkip(this, helper, [Pallets.ReFungible]);

      donor = privateKey('//Alice');
    });
  });

  itEth('totalSupply', async ({helper}) => {
    const caller = await helper.eth.createAccountWithBalance(donor);
    const {collectionAddress} = await helper.eth.createRFTCollection(caller, 'TotalSupply', '6', '6');
    const contract = helper.ethNativeContract.collection(collectionAddress, 'rft', caller);
    const nextTokenId = await contract.methods.nextTokenId().call();
    await contract.methods.mint(caller, nextTokenId).send();
    const totalSupply = await contract.methods.totalSupply().call();
    expect(totalSupply).to.equal('1');
  });

  itEth('balanceOf', async ({helper}) => {
    const caller = await helper.eth.createAccountWithBalance(donor);
    const {collectionAddress} = await helper.eth.createRFTCollection(caller, 'BalanceOf', '6', '6');
    const contract = helper.ethNativeContract.collection(collectionAddress, 'rft', caller);

    {
      const nextTokenId = await contract.methods.nextTokenId().call();
      await contract.methods.mint(caller, nextTokenId).send();
    }
    {
      const nextTokenId = await contract.methods.nextTokenId().call();
      await contract.methods.mint(caller, nextTokenId).send();
    }
    {
      const nextTokenId = await contract.methods.nextTokenId().call();
      await contract.methods.mint(caller, nextTokenId).send();
    }

    const balance = await contract.methods.balanceOf(caller).call();
    expect(balance).to.equal('3');
  });

  itEth('ownerOf', async ({helper}) => {
    const caller = await helper.eth.createAccountWithBalance(donor);
    const {collectionAddress} = await helper.eth.createRFTCollection(caller, 'OwnerOf', '6', '6');
    const contract = helper.ethNativeContract.collection(collectionAddress, 'rft', caller);

    const tokenId = await contract.methods.nextTokenId().call();
    await contract.methods.mint(caller, tokenId).send();

    const owner = await contract.methods.ownerOf(tokenId).call();
    expect(owner).to.equal(caller);
  });

  itEth('ownerOf after burn', async ({helper}) => {
    const caller = await helper.eth.createAccountWithBalance(donor);
    const receiver = helper.eth.createAccount();
    const {collectionId, collectionAddress} = await helper.eth.createRFTCollection(caller, 'OwnerOf-AfterBurn', '6', '6');
    const contract = helper.ethNativeContract.collection(collectionAddress, 'rft', caller);

    const tokenId = await contract.methods.nextTokenId().call();
    await contract.methods.mint(caller, tokenId).send();
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

    const tokenId = await contract.methods.nextTokenId().call();
    await contract.methods.mint(caller, tokenId).send();
    const tokenContract = helper.ethNativeContract.rftTokenById(collectionId, tokenId, caller);

    await tokenContract.methods.repartition(2).send();
    await tokenContract.methods.transfer(receiver, 1).send();

    const owner = await contract.methods.ownerOf(tokenId).call();
    expect(owner).to.equal('0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF');
  });
});

describe('Refungible: Plain calls', () => {
  let donor: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (helper, privateKey) => {
      requirePalletsOrSkip(this, helper, [Pallets.ReFungible]);

      donor = privateKey('//Alice');
    });
  });

  itEth('Can perform mint()', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const receiver = helper.eth.createAccount();
    const {collectionAddress} = await helper.eth.createERC721MetadataRFTCollection(owner, 'Minty', '6', '6', '');
    const contract = helper.ethNativeContract.collection(collectionAddress, 'rft', owner);
    
    const nextTokenId = await contract.methods.nextTokenId().call();
    expect(nextTokenId).to.be.equal('1');
    const result = await contract.methods.mintWithTokenURI(
      receiver,
      nextTokenId,
      'Test URI',
    ).send();

    const event = result.events.Transfer;
    expect(event.address).to.equal(collectionAddress);
    expect(event.returnValues.from).to.equal('0x0000000000000000000000000000000000000000');
    expect(event.returnValues.to).to.equal(receiver);
    expect(event.returnValues.tokenId).to.equal(nextTokenId);

    expect(await contract.methods.tokenURI(nextTokenId).call()).to.be.equal('Test URI');
  });

  itEth('Can perform mintBulk()', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const receiver = helper.eth.createAccount();
    const {collectionAddress} = await helper.eth.createERC721MetadataRFTCollection(owner, 'MintBulky', '6', '6', '');
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

    const tokenId = await contract.methods.nextTokenId().call();
    await contract.methods.mint(caller, tokenId).send();
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

    const tokenId = await contract.methods.nextTokenId().call();
    const tokenAddress = helper.ethAddress.fromTokenId(collectionId, tokenId);
    await contract.methods.mint(caller, tokenId).send();

    const tokenContract = helper.ethNativeContract.rftToken(tokenAddress, caller);
    await tokenContract.methods.repartition(15).send();

    {
      const tokenEvents: any = [];
      tokenContract.events.allEvents((_: any, event: any) => {
        tokenEvents.push(event);
      });
      const result = await contract.methods.transferFrom(caller, receiver, tokenId).send();

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

  itEth('Can perform transfer()', async ({helper}) => {
    const caller = await helper.eth.createAccountWithBalance(donor);
    const receiver = helper.eth.createAccount();
    const {collectionAddress} = await helper.eth.createRFTCollection(caller, 'Transferry', '6', '6');
    const contract = helper.ethNativeContract.collection(collectionAddress, 'rft', caller);

    const tokenId = await contract.methods.nextTokenId().call();
    await contract.methods.mint(caller, tokenId).send();

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

  itEth('transfer event on transfer from partial ownership to full ownership', async ({helper}) => {
    const caller = await helper.eth.createAccountWithBalance(donor);
    const receiver = helper.eth.createAccount();
    const {collectionId, collectionAddress} = await helper.eth.createRFTCollection(caller, 'Transferry-Partial-to-Full', '6', '6');
    const contract = helper.ethNativeContract.collection(collectionAddress, 'rft', caller);

    const tokenId = await contract.methods.nextTokenId().call();
    await contract.methods.mint(caller, tokenId).send();

    const tokenContract = helper.ethNativeContract.rftTokenById(collectionId, tokenId, caller);

    await tokenContract.methods.repartition(2).send();
    await tokenContract.methods.transfer(receiver, 1).send();

    const events: any = [];
    contract.events.allEvents((_: any, event: any) => {
      events.push(event);
    });
    await tokenContract.methods.transfer(receiver, 1).send();

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

    const tokenId = await contract.methods.nextTokenId().call();
    await contract.methods.mint(caller, tokenId).send();

    const tokenContract = helper.ethNativeContract.rftTokenById(collectionId, tokenId, caller);

    await tokenContract.methods.repartition(2).send();

    const events: any = [];
    contract.events.allEvents((_: any, event: any) => {
      events.push(event);
    });
    await tokenContract.methods.transfer(receiver, 1).send();

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

      donor = privateKey('//Alice');
    });
  });

  itEth('transferFrom() call fee is less than 0.2UNQ', async ({helper}) => {
    const caller = await helper.eth.createAccountWithBalance(donor);
    const receiver = helper.eth.createAccount();
    const {collectionAddress} = await helper.eth.createRFTCollection(caller, 'Feeful-Transfer-From', '6', '6');
    const contract = helper.ethNativeContract.collection(collectionAddress, 'rft', caller);

    const tokenId = await contract.methods.nextTokenId().call();
    await contract.methods.mint(caller, tokenId).send();

    const cost = await helper.eth.recordCallFee(caller, () => contract.methods.transferFrom(caller, receiver, tokenId).send());
    expect(cost < BigInt(0.2 * Number(helper.balance.getOneTokenNominal())));
    expect(cost > 0n);
  });

  itEth('transfer() call fee is less than 0.2UNQ', async ({helper}) => {
    const caller = await helper.eth.createAccountWithBalance(donor);
    const receiver = helper.eth.createAccount();
    const {collectionAddress} = await helper.eth.createRFTCollection(caller, 'Feeful-Transfer', '6', '6');
    const contract = helper.ethNativeContract.collection(collectionAddress, 'rft', caller);

    const tokenId = await contract.methods.nextTokenId().call();
    await contract.methods.mint(caller, tokenId).send();

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

      donor = privateKey('//Alice');
      [alice] = await helper.arrange.createAccounts([20n], donor);
    });
  });

  itEth('Returns collection name', async ({helper}) => {
    const caller = helper.eth.createAccount();
    const collection = await helper.rft.mintCollection(alice, {name: 'Leviathan', tokenPrefix: '11'});
    
    const contract = helper.ethNativeContract.collectionById(collection.collectionId, 'rft', caller);
    const name = await contract.methods.name().call();
    expect(name).to.equal('Leviathan');
  });

  itEth('Returns symbol name', async ({helper}) => {
    const caller = await helper.eth.createAccountWithBalance(donor);
    const {collectionId} = await helper.rft.mintCollection(alice, {name: 'Leviathan', tokenPrefix: '12'});
    const contract = helper.ethNativeContract.collectionById(collectionId, 'rft', caller);
    const symbol = await contract.methods.symbol().call();
    expect(symbol).to.equal('12');
  });
});
