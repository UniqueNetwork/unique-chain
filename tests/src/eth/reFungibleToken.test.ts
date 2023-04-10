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
import {EthUniqueHelper, expect, itEth, usingEthPlaygrounds} from './util';
import {IKeyringPair} from '@polkadot/types/types';
import {Contract} from 'web3-eth-contract';

// FIXME: Need erc721 for ReFubgible.
describe('Check ERC721 token URI for ReFungible', () => {
  let donor: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (helper, privateKey) => {
      requirePalletsOrSkip(this, helper, [Pallets.ReFungible]);

      donor = await privateKey({url: import.meta.url});
    });
  });

  async function setup(helper: EthUniqueHelper, baseUri: string, propertyKey?: string, propertyValue?: string): Promise<{contract: Contract, nextTokenId: string}> {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const receiver = helper.eth.createAccount();

    const {collectionAddress} = await helper.eth.createERC721MetadataCompatibleRFTCollection(owner, 'Mint collection', 'a', 'b', baseUri);
    const contract = await helper.ethNativeContract.collection(collectionAddress, 'rft', owner);

    const result = await contract.methods.mint(receiver).send();

    const event = result.events.Transfer;
    const tokenId = event.returnValues.tokenId;
    expect(tokenId).to.be.equal('1');
    expect(event.address).to.be.equal(collectionAddress);
    expect(event.returnValues.from).to.be.equal('0x0000000000000000000000000000000000000000');
    expect(event.returnValues.to).to.be.equal(receiver);

    if (propertyKey && propertyValue) {
      // Set URL or suffix

      await contract.methods.setProperties(tokenId, [{key: propertyKey, value: Buffer.from(propertyValue)}]).send();
    }

    return {contract, nextTokenId: tokenId};
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

describe('Refungible: Plain calls', () => {
  let donor: IKeyringPair;
  let alice: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (helper, privateKey) => {
      requirePalletsOrSkip(this, helper, [Pallets.ReFungible]);

      donor = await privateKey({url: import.meta.url});
      [alice] = await helper.arrange.createAccounts([50n], donor);
    });
  });

  itEth('Can perform approve()', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const spender = helper.eth.createAccount();
    const collection = await helper.rft.mintCollection(alice);
    const {tokenId} = await collection.mintToken(alice, 200n, {Ethereum: owner});

    const tokenAddress = helper.ethAddress.fromTokenId(collection.collectionId, tokenId);
    const contract = await helper.ethNativeContract.rftToken(tokenAddress, owner);

    {
      const result = await contract.methods.approve(spender, 100).send({from: owner});
      const event = result.events.Approval;
      expect(event.address).to.be.equal(tokenAddress);
      expect(event.returnValues.owner).to.be.equal(owner);
      expect(event.returnValues.spender).to.be.equal(spender);
      expect(event.returnValues.value).to.be.equal('100');
    }

    {
      const allowance = await contract.methods.allowance(owner, spender).call();
      expect(+allowance).to.equal(100);
    }
  });

  itEth('Can perform approveCross()', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const spender = helper.eth.createAccount();
    const spenderSub = (await helper.arrange.createAccounts([1n], donor))[0];
    const spenderCrossEth = helper.ethCrossAccount.fromAddress(spender);
    const spenderCrossSub = helper.ethCrossAccount.fromKeyringPair(spenderSub);


    const collection = await helper.rft.mintCollection(alice);
    const {tokenId} = await collection.mintToken(alice, 200n, {Ethereum: owner});

    const tokenAddress = helper.ethAddress.fromTokenId(collection.collectionId, tokenId);
    const contract = await helper.ethNativeContract.rftToken(tokenAddress, owner);

    {
      const result = await contract.methods.approveCross(spenderCrossEth, 100).send({from: owner});
      const event = result.events.Approval;
      expect(event.address).to.be.equal(tokenAddress);
      expect(event.returnValues.owner).to.be.equal(owner);
      expect(event.returnValues.spender).to.be.equal(spender);
      expect(event.returnValues.value).to.be.equal('100');
    }

    {
      const allowance = await contract.methods.allowance(owner, spender).call();
      expect(+allowance).to.equal(100);
    }


    {
      const result = await contract.methods.approveCross(spenderCrossSub, 100).send({from: owner});
      const event = result.events.Approval;
      expect(event.address).to.be.equal(tokenAddress);
      expect(event.returnValues.owner).to.be.equal(owner);
      expect(event.returnValues.spender).to.be.equal(helper.address.substrateToEth(spenderSub.address));
      expect(event.returnValues.value).to.be.equal('100');
    }

    {
      const allowance = await collection.getTokenApprovedPieces(tokenId, {Ethereum: owner}, {Substrate: spenderSub.address});
      expect(allowance).to.equal(100n);
    }

    {
      //TO-DO expect with future allowanceCross(owner, spenderCrossEth).call()
    }
  });

  itEth('Non-owner and non admin cannot approveCross', async ({helper}) => {
    const nonOwner = await helper.eth.createAccountWithBalance(donor);
    const nonOwnerCross = helper.ethCrossAccount.fromAddress(nonOwner);
    const owner = await helper.eth.createAccountWithBalance(donor);
    const collection = await helper.rft.mintCollection(alice, {name: 'A', description: 'B', tokenPrefix: 'C'});
    const token = await collection.mintToken(alice, 100n, {Ethereum: owner});

    const tokenAddress = helper.ethAddress.fromTokenId(collection.collectionId, token.tokenId);
    const tokenEvm = await helper.ethNativeContract.rftToken(tokenAddress, owner);

    await expect(tokenEvm.methods.approveCross(nonOwnerCross, 20).call({from: nonOwner})).to.be.rejectedWith('CantApproveMoreThanOwned');
  });

  [
    'transferFrom',
    'transferFromCross',
  ].map(testCase =>
    itEth(`Can perform ${testCase}`, async ({helper}) => {
      const isCross = testCase === 'transferFromCross';
      const owner = await helper.eth.createAccountWithBalance(donor);
      const ownerCross = helper.ethCrossAccount.fromAddress(owner);
      const spender = await helper.eth.createAccountWithBalance(donor);
      const receiverEth = helper.eth.createAccount();
      const receiverCrossEth = helper.ethCrossAccount.fromAddress(receiverEth);
      const [receiverSub] = await helper.arrange.createAccounts([1n], donor);
      const receiverCrossSub = helper.ethCrossAccount.fromKeyringPair(receiverSub);

      const collection = await helper.rft.mintCollection(alice);
      const {tokenId} = await collection.mintToken(alice, 200n, {Ethereum: owner});

      const tokenAddress = helper.ethAddress.fromTokenId(collection.collectionId, tokenId);
      const contract = await helper.ethNativeContract.rftToken(tokenAddress, owner);

      await contract.methods.approve(spender, 100).send({from: owner});

      // 1. Can transfer from
      // 1.1 Plain ethereum or cross address:
      {
        const result = await contract.methods[testCase](
          isCross ? ownerCross : owner,
          isCross ? receiverCrossEth : receiverEth,
          49,
        ).send({from: spender});

        // Check events:
        const transferEvent = result.events.Transfer;
        expect(transferEvent.address).to.be.equal(tokenAddress);
        expect(transferEvent.returnValues.from).to.be.equal(owner);
        expect(transferEvent.returnValues.to).to.be.equal(receiverEth);
        expect(transferEvent.returnValues.value).to.be.equal('49');

        const approvalEvent = result.events.Approval;
        expect(approvalEvent.address).to.be.equal(tokenAddress);
        expect(approvalEvent.returnValues.owner).to.be.equal(owner);
        expect(approvalEvent.returnValues.spender).to.be.equal(spender);
        expect(approvalEvent.returnValues.value).to.be.equal('51');

        // Check balances:
        const receiverBalance = await contract.methods.balanceOf(receiverEth).call();
        const ownerBalance = await contract.methods.balanceOf(owner).call();

        expect(+receiverBalance).to.equal(49);
        expect(+ownerBalance).to.equal(151);
      }

      // 1.2 Cross substrate address:
      if (testCase === 'transferFromCross') {
        const result = await contract.methods.transferFromCross(ownerCross, receiverCrossSub, 51).send({from: spender});
        // Check events:
        const transferEvent = result.events.Transfer;
        expect(transferEvent.address).to.be.equal(tokenAddress);
        expect(transferEvent.returnValues.from).to.be.equal(owner);
        expect(transferEvent.returnValues.to).to.be.equal(helper.address.substrateToEth(receiverSub.address));
        expect(transferEvent.returnValues.value).to.be.equal('51');

        const approvalEvent = result.events.Approval;
        expect(approvalEvent.address).to.be.equal(tokenAddress);
        expect(approvalEvent.returnValues.owner).to.be.equal(owner);
        expect(approvalEvent.returnValues.spender).to.be.equal(spender);
        expect(approvalEvent.returnValues.value).to.be.equal('0');

        // Check balances:
        const receiverBalance = await collection.getTokenBalance(tokenId, {Substrate: receiverSub.address});
        const ownerBalance = await contract.methods.balanceOf(owner).call();
        expect(receiverBalance).to.equal(51n);
        expect(+ownerBalance).to.equal(100);
      }
    }));

  [
    'transfer',
    'transferCross',
  ].map(testCase =>
    itEth(`Can perform ${testCase}()`, async ({helper}) => {
      const isCross = testCase === 'transferCross';
      const owner = await helper.eth.createAccountWithBalance(donor);
      const receiverEth = helper.eth.createAccount();
      const receiverCrossEth = helper.ethCrossAccount.fromAddress(receiverEth);
      const [receiverSub] = await helper.arrange.createAccounts([1n], donor);
      const receiverCrossSub = helper.ethCrossAccount.fromKeyringPair(receiverSub);
      const collection = await helper.rft.mintCollection(alice);
      const {tokenId} = await collection.mintToken(alice, 200n, {Ethereum: owner});

      const tokenAddress = helper.ethAddress.fromTokenId(collection.collectionId, tokenId);
      const contract = await helper.ethNativeContract.rftToken(tokenAddress, owner);

      // 1. Can transfer to plain ethereum or cross-ethereum account:
      {
        const result = await contract.methods[testCase](isCross ? receiverCrossEth : receiverEth, 50).send({from: owner});
        // Check events
        const transferEvent = result.events.Transfer;
        expect(transferEvent.address).to.be.equal(tokenAddress);
        expect(transferEvent.returnValues.from).to.be.equal(owner);
        expect(transferEvent.returnValues.to).to.be.equal(receiverEth);
        expect(transferEvent.returnValues.value).to.be.equal('50');
        // Check balances:
        const ownerBalance = await contract.methods.balanceOf(owner).call();
        const receiverBalance = await contract.methods.balanceOf(receiverEth).call();
        expect(+ownerBalance).to.equal(150);
        expect(+receiverBalance).to.equal(50);
      }

      // 2. Can transfer to cross-substrate account:
      if(isCross) {
        const result = await contract.methods.transferCross(receiverCrossSub, 50).send({from: owner});
        // Check events:
        const event = result.events.Transfer;
        expect(event.address).to.be.equal(tokenAddress);
        expect(event.returnValues.from).to.be.equal(owner);
        expect(event.returnValues.to).to.be.equal(helper.address.substrateToEth(receiverSub.address));
        expect(event.returnValues.value).to.be.equal('50');
        // Check balances:
        const ownerBalance = await contract.methods.balanceOf(owner).call();
        const receiverBalance = await collection.getTokenBalance(tokenId, {Substrate: receiverSub.address});
        expect(+ownerBalance).to.equal(100);
        expect(receiverBalance).to.equal(50n);
      }
    }));

  [
    'transfer',
    'transferCross',
  ].map(testCase =>
    itEth(`Cannot ${testCase}() non-owned token`, async ({helper}) => {
      const isCross = testCase === 'transferCross';
      const owner = await helper.eth.createAccountWithBalance(donor);
      const ownerCross = helper.ethCrossAccount.fromAddress(owner);
      const receiverEth = await helper.eth.createAccountWithBalance(donor);
      const receiverCrossEth = helper.ethCrossAccount.fromAddress(receiverEth);
      const collection = await helper.rft.mintCollection(alice);
      const rftOwner = await collection.mintToken(alice, 10n, {Ethereum: owner});
      const rftReceiver = await collection.mintToken(alice, 10n, {Ethereum: receiverEth});
      const tokenIdNonExist = 9999999;

      const tokenAddress1 = helper.ethAddress.fromTokenId(collection.collectionId, rftOwner.tokenId);
      const tokenAddress2 = helper.ethAddress.fromTokenId(collection.collectionId, rftReceiver.tokenId);
      const tokenAddressNonExist = helper.ethAddress.fromTokenId(collection.collectionId, tokenIdNonExist);
      const tokenEvmOwner = await helper.ethNativeContract.rftToken(tokenAddress1, owner);
      const tokenEvmReceiver = await helper.ethNativeContract.rftToken(tokenAddress2, owner);
      const tokenEvmNonExist = await helper.ethNativeContract.rftToken(tokenAddressNonExist, owner);

      // 1. Can transfer zero amount (EIP-20):
      await tokenEvmOwner.methods[testCase](isCross ? receiverCrossEth : receiverEth, 0).send({from: owner});
      // 2. Cannot transfer non-owned token:
      await expect(tokenEvmReceiver.methods[testCase](isCross ? ownerCross : owner, 0).send({from: owner})).to.be.rejected;
      await expect(tokenEvmReceiver.methods[testCase](isCross ? ownerCross : owner, 5).send({from: owner})).to.be.rejected;
      // 3. Cannot transfer non-existing token:
      await expect(tokenEvmNonExist.methods[testCase](isCross ? ownerCross : owner, 0).send({from: owner})).to.be.rejected;
      await expect(tokenEvmNonExist.methods[testCase](isCross ? ownerCross : owner, 5).send({from: owner})).to.be.rejected;

      // 4. Storage is not corrupted:
      expect(await rftOwner.getTop10Owners()).to.deep.eq([{Ethereum: owner.toLowerCase()}]);
      expect(await rftReceiver.getTop10Owners()).to.deep.eq([{Ethereum: receiverEth.toLowerCase()}]);
      expect(await helper.rft.getTokenTop10Owners(collection.collectionId, tokenIdNonExist)).to.deep.eq([]);

      // 4.1 Tokens can be transferred:
      await tokenEvmOwner.methods[testCase](isCross ? receiverCrossEth : receiverEth, 10).send({from: owner});
      await tokenEvmReceiver.methods[testCase](isCross ? ownerCross : owner, 10).send({from: receiverEth});
      expect(await rftOwner.getTop10Owners()).to.deep.eq([{Ethereum: receiverEth.toLowerCase()}]);
      expect(await rftReceiver.getTop10Owners()).to.deep.eq([{Ethereum: owner.toLowerCase()}]);
    }));

  itEth('Can perform repartition()', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const receiver = await helper.eth.createAccountWithBalance(donor);
    const collection = await helper.rft.mintCollection(alice);
    const {tokenId} = await collection.mintToken(alice, 100n, {Ethereum: owner});

    const tokenAddress = helper.ethAddress.fromTokenId(collection.collectionId, tokenId);
    const contract = await helper.ethNativeContract.rftToken(tokenAddress, owner);

    await contract.methods.repartition(200).send({from: owner});
    expect(+await contract.methods.balanceOf(owner).call()).to.be.equal(200);
    await contract.methods.transfer(receiver, 110).send({from: owner});
    expect(+await contract.methods.balanceOf(owner).call()).to.be.equal(90);
    expect(+await contract.methods.balanceOf(receiver).call()).to.be.equal(110);

    await expect(contract.methods.repartition(80).send({from: owner})).to.eventually.be.rejected; // Transaction is reverted

    await contract.methods.transfer(receiver, 90).send({from: owner});
    expect(+await contract.methods.balanceOf(owner).call()).to.be.equal(0);
    expect(+await contract.methods.balanceOf(receiver).call()).to.be.equal(200);

    await contract.methods.repartition(150).send({from: receiver});
    await expect(contract.methods.transfer(owner, 160).send({from: receiver})).to.eventually.be.rejected; // Transaction is reverted
    expect(+await contract.methods.balanceOf(receiver).call()).to.be.equal(150);
  });

  itEth('Can repartition with increased amount', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const collection = await helper.rft.mintCollection(alice);
    const {tokenId} = await collection.mintToken(alice, 100n, {Ethereum: owner});

    const tokenAddress = helper.ethAddress.fromTokenId(collection.collectionId, tokenId);
    const contract = await helper.ethNativeContract.rftToken(tokenAddress, owner);

    const result = await contract.methods.repartition(200).send();

    const event = result.events.Transfer;
    expect(event.address).to.be.equal(tokenAddress);
    expect(event.returnValues.from).to.be.equal('0x0000000000000000000000000000000000000000');
    expect(event.returnValues.to).to.be.equal(owner);
    expect(event.returnValues.value).to.be.equal('100');
  });

  itEth('Can repartition with decreased amount', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const collection = await helper.rft.mintCollection(alice);
    const {tokenId} = await collection.mintToken(alice, 100n, {Ethereum: owner});

    const tokenAddress = helper.ethAddress.fromTokenId(collection.collectionId, tokenId);
    const contract = await helper.ethNativeContract.rftToken(tokenAddress, owner);

    const result = await contract.methods.repartition(50).send();
    const event = result.events.Transfer;
    expect(event.address).to.be.equal(tokenAddress);
    expect(event.returnValues.from).to.be.equal(owner);
    expect(event.returnValues.to).to.be.equal('0x0000000000000000000000000000000000000000');
    expect(event.returnValues.value).to.be.equal('50');
  });

  itEth('Receiving Transfer event on burning into full ownership', async ({helper}) => {
    const caller = await helper.eth.createAccountWithBalance(donor);
    const receiver = await helper.eth.createAccountWithBalance(donor);
    const {collectionId, collectionAddress} = await helper.eth.createRFTCollection(caller, 'Devastation', '6', '6');
    const contract = await helper.ethNativeContract.collection(collectionAddress, 'rft', caller);

    const result = await contract.methods.mint(caller).send();
    const tokenId = result.events.Transfer.returnValues.tokenId;
    const tokenAddress = helper.ethAddress.fromTokenId(collectionId, tokenId);
    const tokenContract = await helper.ethNativeContract.rftToken(tokenAddress, caller, true);

    await tokenContract.methods.repartition(2).send();
    await tokenContract.methods.transfer(receiver, 1).send();

    const events: any = [];
    contract.events.allEvents((_: any, event: any) => {
      events.push(event);
    });
    await tokenContract.methods.burnFrom(caller, 1).send();

    if (events.length == 0) await helper.wait.newBlocks(1);
    const event = events[0];
    expect(event.address).to.be.equal(collectionAddress);
    expect(event.returnValues.from).to.be.equal('0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF');
    expect(event.returnValues.to).to.be.equal(receiver);
    expect(event.returnValues.tokenId).to.be.equal(tokenId);
  });

  itEth('Can perform burnFromCross()', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const ownerSub = (await helper.arrange.createAccounts([10n], donor))[0];
    const ownerCross = helper.ethCrossAccount.fromAddress(owner);
    const spender = await helper.eth.createAccountWithBalance(donor);

    const spenderCrossEth = helper.ethCrossAccount.fromAddress(spender);
    const ownerSubCross = helper.ethCrossAccount.fromKeyringPair(ownerSub);

    const collection = await helper.rft.mintCollection(alice);
    const {tokenId} = await collection.mintToken(alice, 200n, {Ethereum: owner});


    const tokenAddress = helper.ethAddress.fromTokenId(collection.collectionId, tokenId);
    const contract = await helper.ethNativeContract.rftToken(tokenAddress, owner);

    {
      await contract.methods.approveCross(spenderCrossEth, 100).send({from: owner});

      await expect(contract.methods.burnFromCross(ownerCross, 50).send({from: spender})).to.be.fulfilled;
      await expect(contract.methods.burnFromCross(ownerCross, 100).send({from: spender})).to.be.rejected;
      expect(await contract.methods.balanceOf(owner).call({from: owner})).to.be.equal('150');
    }
    {
      const {tokenId} = await collection.mintToken(alice, 200n, {Substrate: ownerSub.address});
      await collection.approveToken(ownerSub, tokenId, {Ethereum: spender}, 100n);
      const tokenAddress = helper.ethAddress.fromTokenId(collection.collectionId, tokenId);
      const contract = await helper.ethNativeContract.rftToken(tokenAddress, owner);

      await expect(contract.methods.burnFromCross(ownerSubCross, 50).send({from: spender})).to.be.fulfilled;
      await expect(contract.methods.burnFromCross(ownerSubCross, 100).send({from: spender})).to.be.rejected;
      expect(await collection.getTokenBalance(tokenId, {Substrate: ownerSub.address})).to.be.equal(150n);
    }
  });
});

describe('Refungible: Fees', () => {
  let donor: IKeyringPair;
  let alice: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (helper, privateKey) => {
      requirePalletsOrSkip(this, helper, [Pallets.ReFungible]);

      donor = await privateKey({url: import.meta.url});
      [alice] = await helper.arrange.createAccounts([50n], donor);
    });
  });

  itEth('approve() call fee is less than 0.2UNQ', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const spender = helper.eth.createAccount();
    const collection = await helper.rft.mintCollection(alice);
    const {tokenId} = await collection.mintToken(alice, 100n, {Ethereum: owner});

    const tokenAddress = helper.ethAddress.fromTokenId(collection.collectionId, tokenId);
    const contract = await helper.ethNativeContract.rftToken(tokenAddress, owner);

    const cost = await helper.eth.recordCallFee(owner, () => contract.methods.approve(spender, 100).send({from: owner}));
    expect(cost < BigInt(0.2 * Number(helper.balance.getOneTokenNominal())));
  });

  itEth('transferFrom() call fee is less than 0.2UNQ', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const spender = await helper.eth.createAccountWithBalance(donor);
    const collection = await helper.rft.mintCollection(alice);
    const {tokenId} = await collection.mintToken(alice, 200n, {Ethereum: owner});

    const tokenAddress = helper.ethAddress.fromTokenId(collection.collectionId, tokenId);
    const contract = await helper.ethNativeContract.rftToken(tokenAddress, owner);

    await contract.methods.approve(spender, 100).send({from: owner});

    const cost = await helper.eth.recordCallFee(spender, () => contract.methods.transferFrom(owner, spender, 100).send({from: spender}));
    expect(cost < BigInt(0.2 * Number(helper.balance.getOneTokenNominal())));
  });

  itEth('transfer() call fee is less than 0.2UNQ', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const receiver = helper.eth.createAccount();
    const collection = await helper.rft.mintCollection(alice);
    const {tokenId} = await collection.mintToken(alice, 200n, {Ethereum: owner});

    const tokenAddress = helper.ethAddress.fromTokenId(collection.collectionId, tokenId);
    const contract = await helper.ethNativeContract.rftToken(tokenAddress, owner);

    const cost = await helper.eth.recordCallFee(owner, () => contract.methods.transfer(receiver, 100).send({from: owner}));
    expect(cost < BigInt(0.2 * Number(helper.balance.getOneTokenNominal())));
  });
});

describe('Refungible: Substrate calls', () => {
  let donor: IKeyringPair;
  let alice: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (helper, privateKey) => {
      requirePalletsOrSkip(this, helper, [Pallets.ReFungible]);

      donor = await privateKey({url: import.meta.url});
      [alice] = await helper.arrange.createAccounts([50n], donor);
    });
  });

  itEth('Events emitted for approve()', async ({helper}) => {
    const receiver = helper.eth.createAccount();
    const collection = await helper.rft.mintCollection(alice);
    const token = await collection.mintToken(alice, 200n);

    const tokenAddress = helper.ethAddress.fromTokenId(collection.collectionId, token.tokenId);
    const contract = await helper.ethNativeContract.rftToken(tokenAddress);

    const events: any = [];
    contract.events.allEvents((_: any, event: any) => {
      events.push(event);
    });

    expect(await token.approve(alice, {Ethereum: receiver}, 100n)).to.be.true;
    if (events.length == 0) await helper.wait.newBlocks(1);
    const event = events[0];

    expect(event.event).to.be.equal('Approval');
    expect(event.address).to.be.equal(tokenAddress);
    expect(event.returnValues.owner).to.be.equal(helper.address.substrateToEth(alice.address));
    expect(event.returnValues.spender).to.be.equal(receiver);
    expect(event.returnValues.value).to.be.equal('100');
  });

  itEth('Events emitted for transferFrom()', async ({helper}) => {
    const [bob] = await helper.arrange.createAccounts([10n], donor);
    const receiver = helper.eth.createAccount();
    const collection = await helper.rft.mintCollection(alice);
    const token = await collection.mintToken(alice, 200n);
    await token.approve(alice, {Substrate: bob.address}, 100n);

    const tokenAddress = helper.ethAddress.fromTokenId(collection.collectionId, token.tokenId);
    const contract = await helper.ethNativeContract.rftToken(tokenAddress);

    const events: any = [];
    contract.events.allEvents((_: any, event: any) => {
      events.push(event);
    });

    expect(await token.transferFrom(bob, {Substrate: alice.address}, {Ethereum: receiver},  51n)).to.be.true;
    if (events.length == 0) await helper.wait.newBlocks(1);

    let event = events[0];
    expect(event.event).to.be.equal('Transfer');
    expect(event.address).to.be.equal(tokenAddress);
    expect(event.returnValues.from).to.be.equal(helper.address.substrateToEth(alice.address));
    expect(event.returnValues.to).to.be.equal(receiver);
    expect(event.returnValues.value).to.be.equal('51');

    event = events[1];
    expect(event.event).to.be.equal('Approval');
    expect(event.address).to.be.equal(tokenAddress);
    expect(event.returnValues.owner).to.be.equal(helper.address.substrateToEth(alice.address));
    expect(event.returnValues.spender).to.be.equal(helper.address.substrateToEth(bob.address));
    expect(event.returnValues.value).to.be.equal('49');
  });

  itEth('Events emitted for transfer()', async ({helper}) => {
    const receiver = helper.eth.createAccount();
    const collection = await helper.rft.mintCollection(alice);
    const token = await collection.mintToken(alice, 200n);

    const tokenAddress = helper.ethAddress.fromTokenId(collection.collectionId, token.tokenId);
    const contract = await helper.ethNativeContract.rftToken(tokenAddress);

    const events: any = [];
    contract.events.allEvents((_: any, event: any) => {
      events.push(event);
    });

    expect(await token.transfer(alice, {Ethereum: receiver},  51n)).to.be.true;
    if (events.length == 0) await helper.wait.newBlocks(1);
    const event = events[0];

    expect(event.event).to.be.equal('Transfer');
    expect(event.address).to.be.equal(tokenAddress);
    expect(event.returnValues.from).to.be.equal(helper.address.substrateToEth(alice.address));
    expect(event.returnValues.to).to.be.equal(receiver);
    expect(event.returnValues.value).to.be.equal('51');
  });
});

describe('ERC 1633 implementation', () => {
  let donor: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (helper, privateKey) => {
      requirePalletsOrSkip(this, helper, [Pallets.ReFungible]);

      donor = await privateKey({url: import.meta.url});
    });
  });

  itEth('Default parent token address and id', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);

    const {collectionId, collectionAddress} = await helper.eth.createRFTCollection(owner, 'Sands', '', 'GRAIN');
    const collectionContract = await helper.ethNativeContract.collection(collectionAddress, 'rft', owner);

    const result = await collectionContract.methods.mint(owner).send();
    const tokenId = result.events.Transfer.returnValues.tokenId;

    const tokenAddress = helper.ethAddress.fromTokenId(collectionId, tokenId);
    const tokenContract = await helper.ethNativeContract.rftToken(tokenAddress, owner);

    expect(await tokenContract.methods.parentToken().call()).to.be.equal(collectionAddress);
    expect(await tokenContract.methods.parentTokenId().call()).to.be.equal(tokenId);
  });
});
