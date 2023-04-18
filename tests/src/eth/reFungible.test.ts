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
import {ITokenPropertyPermission} from '../util/playgrounds/types';

describe('Refungible: Plain calls', () => {
  let donor: IKeyringPair;
  let minter: IKeyringPair;
  let bob: IKeyringPair;
  let charlie: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (helper, privateKey) => {
      requirePalletsOrSkip(this, helper, [Pallets.ReFungible]);

      donor = await privateKey({url: import.meta.url});
      [minter, bob, charlie] = await helper.arrange.createAccounts([100n, 100n, 100n], donor);
    });
  });

  [
    'substrate' as const,
    'ethereum' as const,
  ].map(testCase => {
    itEth(`Can perform mintCross() for ${testCase} address`, async ({helper}) => {
      const collectionAdmin = await helper.eth.createAccountWithBalance(donor);

      const receiverEth = helper.eth.createAccount();
      const receiverCrossEth = helper.ethCrossAccount.fromAddress(receiverEth);
      const receiverSub = bob;
      const receiverCrossSub = helper.ethCrossAccount.fromKeyringPair(receiverSub);

      const properties = Array(5).fill(0).map((_, i) => { return {key: `key_${i}`, value: Buffer.from(`value_${i}`)}; });
      const permissions: ITokenPropertyPermission[] = properties.map(p => { return {key: p.key, permission: {
        tokenOwner: false,
        collectionAdmin: true,
        mutable: false}};
      });


      const collection = await helper.rft.mintCollection(minter, {
        tokenPrefix: 'ethp',
        tokenPropertyPermissions: permissions,
      });
      await collection.addAdmin(minter, {Ethereum: collectionAdmin});

      const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
      const contract = await helper.ethNativeContract.collection(collectionAddress, 'rft', collectionAdmin, true);
      let expectedTokenId = await contract.methods.nextTokenId().call();
      let result = await contract.methods.mintCross(testCase === 'ethereum' ? receiverCrossEth : receiverCrossSub, []).send();
      let tokenId = result.events.Transfer.returnValues.tokenId;
      expect(tokenId).to.be.equal(expectedTokenId);

      let event = result.events.Transfer;
      expect(event.address).to.be.equal(collectionAddress);
      expect(event.returnValues.from).to.be.equal('0x0000000000000000000000000000000000000000');
      expect(event.returnValues.to).to.be.equal(testCase === 'ethereum' ? receiverEth : helper.address.substrateToEth(bob.address));
      expect(await contract.methods.properties(tokenId, []).call()).to.be.like([]);

      expectedTokenId = await contract.methods.nextTokenId().call();
      result = await contract.methods.mintCross(testCase === 'ethereum' ? receiverCrossEth : receiverCrossSub, properties).send();
      event = result.events.Transfer;
      expect(event.address).to.be.equal(collectionAddress);
      expect(event.returnValues.from).to.be.equal('0x0000000000000000000000000000000000000000');
      expect(event.returnValues.to).to.be.equal(testCase === 'ethereum' ? receiverEth : helper.address.substrateToEth(bob.address));
      expect(await contract.methods.properties(tokenId, []).call()).to.be.like([]);

      tokenId = result.events.Transfer.returnValues.tokenId;

      expect(tokenId).to.be.equal(expectedTokenId);

      expect(await contract.methods.properties(tokenId, []).call()).to.be.like(properties
        .map(p => { return helper.ethProperty.property(p.key, p.value.toString()); }));

      expect(await helper.nft.getTokenOwner(collection.collectionId, tokenId))
        .to.deep.eq(testCase === 'ethereum' ? {Ethereum: receiverEth.toLowerCase()} : {Substrate: receiverSub.address});
    });
  });

  itEth.skip('Can perform mintBulk()', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const receiver = helper.eth.createAccount();
    const {collectionAddress} = await helper.eth.createERC721MetadataCompatibleRFTCollection(owner, 'MintBulky', '6', '6', '');
    const contract = await helper.ethNativeContract.collection(collectionAddress, 'rft', owner);

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

  itEth('Can perform setApprovalForAll()', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const operator = helper.eth.createAccount();

    const collection = await helper.rft.mintCollection(minter, {});

    const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = await helper.ethNativeContract.collection(collectionAddress, 'rft', owner);

    const approvedBefore = await contract.methods.isApprovedForAll(owner, operator).call();
    expect(approvedBefore).to.be.equal(false);

    {
      const result = await contract.methods.setApprovalForAll(operator, true).send({from: owner});

      expect(result.events.ApprovalForAll).to.be.like({
        address: collectionAddress,
        event: 'ApprovalForAll',
        returnValues: {
          owner,
          operator,
          approved: true,
        },
      });

      const approvedAfter = await contract.methods.isApprovedForAll(owner, operator).call();
      expect(approvedAfter).to.be.equal(true);
    }

    {
      const result = await contract.methods.setApprovalForAll(operator, false).send({from: owner});

      expect(result.events.ApprovalForAll).to.be.like({
        address: collectionAddress,
        event: 'ApprovalForAll',
        returnValues: {
          owner,
          operator,
          approved: false,
        },
      });

      const approvedAfter = await contract.methods.isApprovedForAll(owner, operator).call();
      expect(approvedAfter).to.be.equal(false);
    }
  });

  itEth('Can perform burn with ApprovalForAll', async ({helper}) => {
    const collection = await helper.rft.mintCollection(minter, {name: 'A', description: 'B', tokenPrefix: 'C'});

    const owner = await helper.eth.createAccountWithBalance(donor);
    const operator = await helper.eth.createAccountWithBalance(donor, 100n);

    const token = await collection.mintToken(minter, 100n, {Ethereum: owner});

    const address = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = await helper.ethNativeContract.collection(address, 'rft');

    {
      await contract.methods.setApprovalForAll(operator, true).send({from: owner});
      const ownerCross = helper.ethCrossAccount.fromAddress(owner);
      const result = await contract.methods.burnFromCross(ownerCross, token.tokenId).send({from: operator});
      const events = result.events.Transfer;

      expect(events).to.be.like({
        address,
        event: 'Transfer',
        returnValues: {
          from: owner,
          to: '0x0000000000000000000000000000000000000000',
          tokenId: token.tokenId.toString(),
        },
      });
    }
  });

  itEth('Can perform burn with approve and approvalForAll', async ({helper}) => {
    const collection = await helper.rft.mintCollection(minter, {name: 'A', description: 'B', tokenPrefix: 'C'});

    const owner = await helper.eth.createAccountWithBalance(donor);
    const operator = await helper.eth.createAccountWithBalance(donor, 100n);

    const token = await collection.mintToken(minter, 100n, {Ethereum: owner});

    const address = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = await helper.ethNativeContract.collection(address, 'rft');

    const rftToken = await helper.ethNativeContract.rftTokenById(token.collectionId, token.tokenId, owner, true);

    {
      await rftToken.methods.approve(operator, 15n).send({from: owner});
      await contract.methods.setApprovalForAll(operator, true).send({from: owner});
      await rftToken.methods.burnFrom(owner, 10n).send({from: operator});
    }
    {
      const allowance = await rftToken.methods.allowance(owner, operator).call();
      expect(+allowance).to.be.equal(5);
    }
    {
      const ownerCross = helper.ethCrossAccount.fromAddress(owner);
      const operatorCross = helper.ethCrossAccount.fromAddress(operator);
      const allowance = await rftToken.methods.allowanceCross(ownerCross, operatorCross).call();
      expect(+allowance).to.equal(5);
    }
  });

  itEth('Can perform transfer with ApprovalForAll', async ({helper}) => {
    const collection = await helper.rft.mintCollection(minter, {name: 'A', description: 'B', tokenPrefix: 'C'});

    const owner = await helper.eth.createAccountWithBalance(donor);
    const operator = await helper.eth.createAccountWithBalance(donor);
    const receiver = charlie;

    const token = await collection.mintToken(minter, 100n, {Ethereum: owner});

    const address = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = await helper.ethNativeContract.collection(address, 'rft');

    {
      await contract.methods.setApprovalForAll(operator, true).send({from: owner});
      const ownerCross = helper.ethCrossAccount.fromAddress(owner);
      const recieverCross = helper.ethCrossAccount.fromKeyringPair(receiver);
      const result = await contract.methods.transferFromCross(ownerCross, recieverCross, token.tokenId).send({from: operator});
      const event = result.events.Transfer;
      expect(event).to.be.like({
        address: helper.ethAddress.fromCollectionId(collection.collectionId),
        event: 'Transfer',
        returnValues: {
          from: owner,
          to: helper.address.substrateToEth(receiver.address),
          tokenId: token.tokenId.toString(),
        },
      });
    }

    expect(await token.getTop10Owners()).to.be.like([{Substrate: receiver.address}]);
  });

  itEth('Can perform burn()', async ({helper}) => {
    const caller = await helper.eth.createAccountWithBalance(donor);
    const {collectionAddress} = await helper.eth.createRFTCollection(caller, 'Burny', '6', '6');
    const contract = await helper.ethNativeContract.collection(collectionAddress, 'rft', caller);

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
    const contract = await helper.ethNativeContract.collection(collectionAddress, 'rft', caller);

    const result = await contract.methods.mint(caller).send();
    const tokenId = result.events.Transfer.returnValues.tokenId;

    const tokenAddress = helper.ethAddress.fromTokenId(collectionId, tokenId);

    const tokenContract = await helper.ethNativeContract.rftToken(tokenAddress, caller);
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
    const contract = await helper.ethNativeContract.collection(address, 'rft', spender, true);

    const tokenAddress = helper.ethAddress.fromTokenId(collection.collectionId, token.tokenId);
    const tokenContract = await helper.ethNativeContract.rftToken(tokenAddress, owner);
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
    const contract = await helper.ethNativeContract.collection(address, 'rft');

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
    const contract = await helper.ethNativeContract.collection(address, 'rft');

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
    const contract = await helper.ethNativeContract.collection(collectionAddress, 'rft', caller);

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
    const sender = await helper.eth.createAccountWithBalance(donor);
    const receiverEth = await helper.eth.createAccountWithBalance(donor);
    const receiverCrossEth = helper.ethCrossAccount.fromAddress(receiverEth);
    const receiverCrossSub = helper.ethCrossAccount.fromKeyringPair(minter);

    const collection = await helper.rft.mintCollection(minter, {});
    const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    const collectionEvm = await helper.ethNativeContract.collection(collectionAddress, 'rft', sender);

    const token = await collection.mintToken(minter, 50n, {Ethereum: sender});

    {
      // Can transferCross to ethereum address:
      const result = await collectionEvm.methods.transferCross(receiverCrossEth, token.tokenId).send({from: sender});
      // Check events:
      const event = result.events.Transfer;
      expect(event.address).to.equal(collectionAddress);
      expect(event.returnValues.from).to.equal(sender);
      expect(event.returnValues.to).to.equal(receiverEth);
      expect(event.returnValues.tokenId).to.equal(token.tokenId.toString());
      // Sender's balance decreased:
      const senderBalance = await collectionEvm.methods.balanceOf(sender).call();
      expect(+senderBalance).to.equal(0);
      expect(await token.getBalance({Ethereum: sender})).to.eq(0n);
      // Receiver's balance increased:
      const receiverBalance = await collectionEvm.methods.balanceOf(receiverEth).call();
      expect(+receiverBalance).to.equal(1);
      expect(await token.getBalance({Ethereum: receiverEth})).to.eq(50n);
    }

    {
      // Can transferCross to substrate address:
      const substrateResult = await collectionEvm.methods.transferCross(receiverCrossSub, token.tokenId).send({from: receiverEth});
      // Check events:
      const event = substrateResult.events.Transfer;
      expect(event.address).to.be.equal(collectionAddress);
      expect(event.returnValues.from).to.be.equal(receiverEth);
      expect(event.returnValues.to).to.be.equal(helper.address.substrateToEth(minter.address));
      expect(event.returnValues.tokenId).to.be.equal(`${token.tokenId}`);
      // Sender's balance decreased:
      const senderBalance = await collectionEvm.methods.balanceOf(receiverEth).call();
      expect(+senderBalance).to.equal(0);
      expect(await token.getBalance({Ethereum: receiverEth})).to.eq(0n);
      // Receiver's balance increased:
      const receiverBalance = await helper.nft.getTokensByAddress(collection.collectionId, {Substrate: minter.address});
      expect(receiverBalance).to.contain(token.tokenId);
      expect(await token.getBalance({Substrate: minter.address})).to.eq(50n);
    }
  });

  ['transfer', 'transferCross'].map(testCase => itEth(`Cannot ${testCase} non-owned token`, async ({helper}) => {
    const sender = await helper.eth.createAccountWithBalance(donor);
    const tokenOwner = await helper.eth.createAccountWithBalance(donor);
    const receiverSub = minter;
    const receiverCrossSub = helper.ethCrossAccount.fromKeyringPair(minter);

    const collection = await helper.rft.mintCollection(minter, {});
    const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    const collectionEvm = await helper.ethNativeContract.collection(collectionAddress, 'rft', sender);

    await collection.mintToken(minter, 50n, {Ethereum: sender});
    const nonSendersToken = await collection.mintToken(minter, 50n, {Ethereum: tokenOwner});

    // Cannot transferCross someone else's token:
    const receiver = testCase === 'transfer' ? helper.address.substrateToEth(receiverSub.address) : receiverCrossSub;
    await expect(collectionEvm.methods[testCase](receiver, nonSendersToken.tokenId).send({from: sender})).to.be.rejected;
    // Cannot transfer token if it does not exist:
    await expect(collectionEvm.methods[testCase](receiver, 999999).send({from: sender})).to.be.rejected;
  }));

  itEth('transfer event on transfer from partial ownership to full ownership', async ({helper}) => {
    const caller = await helper.eth.createAccountWithBalance(donor);
    const receiver = helper.eth.createAccount();
    const {collectionId, collectionAddress} = await helper.eth.createRFTCollection(caller, 'Transferry-Partial-to-Full', '6', '6');
    const contract = await helper.ethNativeContract.collection(collectionAddress, 'rft', caller);

    const result = await contract.methods.mint(caller).send();
    const tokenId = result.events.Transfer.returnValues.tokenId;

    const tokenContract = await helper.ethNativeContract.rftTokenById(collectionId, tokenId, caller);

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
    const contract = await helper.ethNativeContract.collection(collectionAddress, 'rft', caller);

    const result = await contract.methods.mint(caller).send();
    const tokenId = result.events.Transfer.returnValues.tokenId;

    const tokenContract = await helper.ethNativeContract.rftTokenById(collectionId, tokenId, caller);

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

  itEth('Check balanceOfCross()', async ({helper}) => {
    const collection = await helper.rft.mintCollection(minter, {});
    const owner = await helper.ethCrossAccount.createAccountWithBalance(donor);
    const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    const collectionEvm = await helper.ethNativeContract.collection(collectionAddress, 'nft', owner.eth);

    expect(await collectionEvm.methods.balanceOfCross(owner).call({from: owner.eth})).to.be.eq('0');

    for (let i = 1n; i < 10n; i++) {
      await collection.mintToken(minter, 100n, {Ethereum: owner.eth});
      expect(await collectionEvm.methods.balanceOfCross(owner).call({from: owner.eth})).to.be.eq(i.toString());
    }
  });

  itEth('Check ownerOfCross()', async ({helper}) => {
    const collection = await helper.rft.mintCollection(minter, {});
    let owner = await helper.ethCrossAccount.createAccountWithBalance(donor);
    const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    const collectionEvm = await helper.ethNativeContract.collection(collectionAddress, 'nft', owner.eth);
    const {tokenId} = await collection.mintToken(minter, 100n,{Ethereum: owner.eth});

    for (let i = 1n; i < 100n; i++) {
      const ownerCross = await collectionEvm.methods.ownerOfCross(tokenId).call({from: owner.eth});
      expect(ownerCross.eth).to.be.eq(owner.eth);
      expect(ownerCross.sub).to.be.eq(owner.sub);

      const newOwner = await helper.ethCrossAccount.createAccountWithBalance(donor);
      await collectionEvm.methods.transferCross(newOwner, tokenId).send({from: owner.eth});
      owner = newOwner;
    }

    const tokenAddress = helper.ethAddress.fromTokenId(collection.collectionId, tokenId);
    const tokenContract = await helper.ethNativeContract.rftToken(tokenAddress, owner.eth, true);
    const newOwner = await helper.ethCrossAccount.createAccountWithBalance(donor);
    await tokenContract.methods.transferCross(newOwner, 50).send({from: owner.eth});
    const ownerCross = await collectionEvm.methods.ownerOfCross(tokenId).call({from: owner.eth});
    expect(ownerCross.eth.toUpperCase()).to.be.eq('0XFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF');
    expect(ownerCross.sub).to.be.eq('0');
  });
});

describe('RFT: Fees', () => {
  let donor: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (helper, privateKey) => {
      requirePalletsOrSkip(this, helper, [Pallets.ReFungible]);

      donor = await privateKey({url: import.meta.url});
    });
  });

  itEth('transferFrom() call fee is less than 0.2UNQ', async ({helper}) => {
    const caller = await helper.eth.createAccountWithBalance(donor);
    const receiver = helper.eth.createAccount();
    const {collectionAddress} = await helper.eth.createRFTCollection(caller, 'Feeful-Transfer-From', '6', '6');
    const contract = await helper.ethNativeContract.collection(collectionAddress, 'rft', caller);

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
    const contract = await helper.ethNativeContract.collection(collectionAddress, 'rft', caller);

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

      donor = await privateKey({url: import.meta.url});
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

    const contract = await helper.ethNativeContract.collectionById(collection.collectionId, 'rft', caller);
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

    const contract = await helper.ethNativeContract.collectionById(collectionId, 'rft', caller);
    const symbol = await contract.methods.symbol().call();
    expect(symbol).to.equal('12');
  });
});

describe('Negative tests', () => {
  let donor: IKeyringPair;
  let minter: IKeyringPair;
  let alice: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (helper, privateKey) => {
      requirePalletsOrSkip(this, helper, [Pallets.ReFungible]);

      donor = await privateKey({url: import.meta.url});
      [minter, alice] = await helper.arrange.createAccounts([100n, 100n], donor);
    });
  });

  itEth('[negative] Cant perform burn without approval', async ({helper}) => {
    const collection = await helper.rft.mintCollection(minter, {name: 'A', description: 'B', tokenPrefix: 'C'});

    const owner = await helper.eth.createAccountWithBalance(donor, 100n);
    const spender = await helper.eth.createAccountWithBalance(donor, 100n);

    const token = await collection.mintToken(minter, 100n, {Ethereum: owner});

    const address = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = await helper.ethNativeContract.collection(address, 'rft');

    const ownerCross = helper.ethCrossAccount.fromAddress(owner);

    await expect(contract.methods.burnFromCross(ownerCross, token.tokenId).send({from: spender})).to.be.rejected;

    await contract.methods.setApprovalForAll(spender, true).send({from: owner});
    await contract.methods.setApprovalForAll(spender, false).send({from: owner});

    await expect(contract.methods.burnFromCross(ownerCross, token.tokenId).send({from: spender})).to.be.rejected;
  });

  itEth('[negative] Cant perform transfer without approval', async ({helper}) => {
    const collection = await helper.rft.mintCollection(minter, {name: 'A', description: 'B', tokenPrefix: 'C'});
    const owner = await helper.eth.createAccountWithBalance(donor, 100n);
    const receiver = alice;

    const spender = await helper.eth.createAccountWithBalance(donor, 100n);

    const token = await collection.mintToken(minter, 100n, {Ethereum: owner});

    const address = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = await helper.ethNativeContract.collection(address, 'rft');

    const ownerCross = helper.ethCrossAccount.fromAddress(owner);
    const recieverCross = helper.ethCrossAccount.fromKeyringPair(receiver);

    await expect(contract.methods.transferFromCross(ownerCross, recieverCross, token.tokenId).send({from: spender})).to.be.rejected;

    await contract.methods.setApprovalForAll(spender, true).send({from: owner});
    await contract.methods.setApprovalForAll(spender, false).send({from: owner});

    await expect(contract.methods.transferFromCross(ownerCross, recieverCross, token.tokenId).send({from: spender})).to.be.rejected;
  });
});
