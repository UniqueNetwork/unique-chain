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

import {Pallets, requirePalletsOrSkip} from '@unique/test-utils/util.js';
import {waitParams, expect, itEth, usingEthPlaygrounds} from '@unique/test-utils/eth/util.js';
import {EthUniqueHelper} from '@unique/test-utils/eth/index.js';
import type {IKeyringPair} from '@polkadot/types/types';
import {Contract} from 'ethers';

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

    const mintTx = await contract.mint.send(receiver);
    const mintReceipt = await mintTx.wait(...waitParams);
    const mintEvents = helper.eth.normalizeEvents(mintReceipt!);

    const event = mintEvents.Transfer;
    const tokenId = event.args.tokenId;
    expect(tokenId).to.be.equal('1');
    expect(event.address).to.be.equal(collectionAddress);
    expect(event.args.from).to.be.equal('0x0000000000000000000000000000000000000000');
    expect(event.args.to).to.be.equal(receiver);

    if(propertyKey && propertyValue) {
      // Set URL or suffix
      await (
        await contract.setProperties.send(
          tokenId,
          [{key: propertyKey, value: Buffer.from(propertyValue)}],
        )
      ).wait(...waitParams);
    }

    return {contract, nextTokenId: tokenId};
  }

  itEth('Empty tokenURI', async ({helper}) => {
    const {contract, nextTokenId} = await setup(helper, '');
    expect(await contract.tokenURI.staticCall(nextTokenId)).to.be.equal('');
  });

  itEth('TokenURI from url', async ({helper}) => {
    const {contract, nextTokenId} = await setup(helper, 'BaseURI_', 'URI', 'Token URI');
    expect(await contract.tokenURI.staticCall(nextTokenId)).to.be.equal('Token URI');
  });

  itEth('TokenURI from baseURI', async ({helper}) => {
    const {contract, nextTokenId} = await setup(helper, 'BaseURI_');
    expect(await contract.tokenURI.staticCall(nextTokenId)).to.be.equal('BaseURI_');
  });

  itEth('TokenURI from baseURI + suffix', async ({helper}) => {
    const suffix = '/some/suffix';
    const {contract, nextTokenId} = await setup(helper, 'BaseURI_', 'URISuffix', suffix);
    expect(await contract.tokenURI.staticCall(nextTokenId)).to.be.equal('BaseURI_' + suffix);
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
    const {tokenId} = await collection.mintToken(alice, 200n, {Ethereum: owner.address});

    const tokenAddress = helper.ethAddress.fromTokenId(collection.collectionId, tokenId);
    const contract = await helper.ethNativeContract.rftToken(tokenAddress, owner);

    {
      const approveTx = await contract.approve.send(spender, 100);
      const approveReceipt = await approveTx.wait(...waitParams);
      const events = helper.eth.normalizeEvents(approveReceipt!);

      const event = events.Approval;
      expect(event.address).to.be.equal(tokenAddress);
      expect(event.args.owner).to.be.equal(owner);
      expect(event.args.spender).to.be.equal(spender);
      expect(event.args.value).to.be.equal('100');
    }

    {
      const allowance = await contract.allowance.staticCall(owner, spender);
      expect(+allowance).to.equal(100);
    }
  });

  itEth('Can perform approveCross()', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const spender = helper.eth.createAccount();
    const spenderSub = (await helper.arrange.createAccounts([1n], donor))[0];
    const spenderCrossEth = helper.ethCrossAccount.fromAddress(spender.address);
    const spenderCrossSub = helper.ethCrossAccount.fromKeyringPair(spenderSub);


    const collection = await helper.rft.mintCollection(alice);
    const {tokenId} = await collection.mintToken(alice, 200n, {Ethereum: owner.address});

    const tokenAddress = helper.ethAddress.fromTokenId(collection.collectionId, tokenId);
    const contract = await helper.ethNativeContract.rftToken(tokenAddress, owner);

    {
      const approveTx = await contract.approveCross.send(spenderCrossEth, 100);
      const approveReceipt = await approveTx.wait(...waitParams);
      const events = helper.eth.normalizeEvents(approveReceipt!);

      const event = events.Approval;
      expect(event.address).to.be.equal(tokenAddress);
      expect(event.args.owner).to.be.equal(owner);
      expect(event.args.spender).to.be.equal(spender);
      expect(event.args.value).to.be.equal('100');
    }

    {
      const allowance = await contract.allowance.staticCall(owner, spender);
      expect(+allowance).to.equal(100);
    }


    {
      const approveTx = await contract.approveCross.send(spenderCrossSub, 100);
      const approveReceipt = await approveTx.wait(...waitParams);
      const events = helper.eth.normalizeEvents(approveReceipt!);

      const event = events.Approval;
      expect(event.address).to.be.equal(tokenAddress);
      expect(event.args.owner).to.be.equal(owner);
      expect(event.args.spender).to.be.equal(helper.address.substrateToEth(spenderSub.address));
      expect(event.args.value).to.be.equal('100');
    }

    {
      const allowance = await collection.getTokenApprovedPieces(tokenId, {Ethereum: owner.address}, {Substrate: spenderSub.address});
      expect(allowance).to.equal(100n);
    }

    {
      //TO-DO expect with future allowanceCross(owner, spenderCrossEth).call()
    }
  });

  itEth('Non-owner and non admin cannot approveCross', async ({helper}) => {
    const nonOwner = await helper.eth.createAccountWithBalance(donor);
    const nonOwnerCross = helper.ethCrossAccount.fromAddress(nonOwner.address);
    const owner = await helper.eth.createAccountWithBalance(donor);
    const collection = await helper.rft.mintCollection(alice, {name: 'A', description: 'B', tokenPrefix: 'C'});
    const token = await collection.mintToken(alice, 100n, {Ethereum: owner.address});

    const tokenAddress = helper.ethAddress.fromTokenId(collection.collectionId, token.tokenId);
    const tokenEvm = await helper.ethNativeContract.rftToken(tokenAddress, owner);

    await expect((<Contract>tokenEvm.connect(nonOwner)).approveCross.staticCall(nonOwnerCross, 20))
      .to.be.rejectedWith('CantApproveMoreThanOwned');
  });

  [
    'transferFrom',
    'transferFromCross',
  ].map(testCase =>
    itEth(`Can perform ${testCase}`, async ({helper}) => {
      const isCross = testCase === 'transferFromCross';
      const owner = await helper.eth.createAccountWithBalance(donor);
      const ownerCross = helper.ethCrossAccount.fromAddress(owner.address);
      const spender = await helper.eth.createAccountWithBalance(donor);
      const receiverEth = helper.eth.createAccount();
      const receiverCrossEth = helper.ethCrossAccount.fromAddress(receiverEth.address);
      const [receiverSub] = await helper.arrange.createAccounts([1n], donor);
      const receiverCrossSub = helper.ethCrossAccount.fromKeyringPair(receiverSub);

      const collection = await helper.rft.mintCollection(alice);
      const {tokenId} = await collection.mintToken(alice, 200n, {Ethereum: owner.address});

      const tokenAddress = helper.ethAddress.fromTokenId(collection.collectionId, tokenId);
      const contract = await helper.ethNativeContract.rftToken(tokenAddress, owner);

      await (await contract.approve.send(spender, 100)).wait(...waitParams);

      const spenderContract = helper.eth.changeContractCaller(contract, spender);

      // 1. Can transfer from
      // 1.1 Plain ethereum or cross address:
      {
        const testCaseTx = await spenderContract[testCase].send(
          isCross ? ownerCross : owner,
          isCross ? receiverCrossEth : receiverEth,
          49,
        );
        const testCaseReceipt = await testCaseTx.wait(...waitParams);
        const testCaseEvents = helper.eth.normalizeEvents(testCaseReceipt!);

        // Check events:
        const transferEvent = testCaseEvents.Transfer;
        expect(transferEvent.address).to.be.equal(tokenAddress);
        expect(transferEvent.args.from).to.be.equal(owner.address);
        expect(transferEvent.args.to).to.be.equal(receiverEth.address);
        expect(transferEvent.args.value).to.be.equal('49');

        const approvalEvent = testCaseEvents.Approval;
        expect(approvalEvent.address).to.be.equal(tokenAddress);
        expect(approvalEvent.args.owner).to.be.equal(owner.address);
        expect(approvalEvent.args.spender).to.be.equal(spender.address);
        expect(approvalEvent.args.value).to.be.equal('51');

        // Check balances:
        const receiverBalance = await contract.balanceOf.staticCall(receiverEth);
        const ownerBalance = await contract.balanceOf.staticCall(owner);

        expect(+receiverBalance).to.equal(49);
        expect(+ownerBalance).to.equal(151);
      }

      // 1.2 Cross substrate address:
      if(testCase === 'transferFromCross') {
        const transferTx = await spenderContract.transferFromCross(ownerCross, receiverCrossSub, 51);
        const transferReceipt = await transferTx.wait(...waitParams);
        const transferEvents = helper.eth.normalizeEvents(transferReceipt!);

        // Check events:
        const transferEvent = transferEvents.Transfer;
        expect(transferEvent.address).to.be.equal(tokenAddress);
        expect(transferEvent.args.from).to.be.equal(owner.address);
        expect(transferEvent.args.to).to.be.equal(helper.address.substrateToEth(receiverSub.address));
        expect(transferEvent.args.value).to.be.equal('51');

        const approvalEvent = transferEvents.Approval;
        expect(approvalEvent.address).to.be.equal(tokenAddress);
        expect(approvalEvent.args.owner).to.be.equal(owner);
        expect(approvalEvent.args.spender).to.be.equal(spender);
        expect(approvalEvent.args.value).to.be.equal('0');

        // Check balances:
        const receiverBalance = await collection.getTokenBalance(tokenId, {Substrate: receiverSub.address});
        const ownerBalance = await contract.balanceOf.staticCall(owner);
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
      const receiverCrossEth = helper.ethCrossAccount.fromAddress(receiverEth.address);
      const [receiverSub] = await helper.arrange.createAccounts([1n], donor);
      const receiverCrossSub = helper.ethCrossAccount.fromKeyringPair(receiverSub);
      const collection = await helper.rft.mintCollection(alice);
      const {tokenId} = await collection.mintToken(alice, 200n, {Ethereum: owner.address});

      const tokenAddress = helper.ethAddress.fromTokenId(collection.collectionId, tokenId);
      const contract = await helper.ethNativeContract.rftToken(tokenAddress, owner);

      // 1. Can transfer to plain ethereum or cross-ethereum account:
      {
        const testCaseTx = await await contract[testCase].send(isCross ? receiverCrossEth : receiverEth, 50);
        const testCaseReceipt = await testCaseTx.wait(...waitParams);
        const testCaseEvents = helper.eth.normalizeEvents(testCaseReceipt!);

        // Check events
        const transferEvent = testCaseEvents.Transfer;
        expect(transferEvent.address).to.be.equal(tokenAddress);
        expect(transferEvent.args.from).to.be.equal(owner);
        expect(transferEvent.args.to).to.be.equal(receiverEth);
        expect(transferEvent.args.value).to.be.equal('50');

        // Check balances:
        const ownerBalance = await contract.balanceOf.staticCall(owner);
        const receiverBalance = await contract.balanceOf.staticCall(receiverEth);
        expect(+ownerBalance).to.equal(150);
        expect(+receiverBalance).to.equal(50);
      }

      // 2. Can transfer to cross-substrate account:
      if(isCross) {
        const transferTx = await contract.transferCross(receiverCrossSub, 50);
        const transferReceipt = await transferTx.wait(...waitParams);
        const transferEvents = helper.eth.normalizeEvents(transferReceipt!);

        // Check events:
        const event = transferEvents.Transfer;
        expect(event.address).to.be.equal(tokenAddress);
        expect(event.args.from).to.be.equal(owner);
        expect(event.args.to).to.be.equal(helper.address.substrateToEth(receiverSub.address));
        expect(event.args.value).to.be.equal('50');

        // Check balances:
        const ownerBalance = await contract.balanceOf.staticCall(owner);
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
      const ownerCross = helper.ethCrossAccount.fromAddress(owner.address);
      const receiverEth = await helper.eth.createAccountWithBalance(donor);
      const receiverCrossEth = helper.ethCrossAccount.fromAddress(receiverEth.address);
      const collection = await helper.rft.mintCollection(alice);
      const rftOwner = await collection.mintToken(alice, 10n, {Ethereum: owner.address});
      const rftReceiver = await collection.mintToken(alice, 10n, {Ethereum: receiverEth.address});
      const tokenIdNonExist = 9999999;

      const tokenAddress1 = helper.ethAddress.fromTokenId(collection.collectionId, rftOwner.tokenId);
      const tokenAddress2 = helper.ethAddress.fromTokenId(collection.collectionId, rftReceiver.tokenId);
      const tokenAddressNonExist = helper.ethAddress.fromTokenId(collection.collectionId, tokenIdNonExist);
      const tokenEvmOwner = await helper.ethNativeContract.rftToken(tokenAddress1, owner);
      const tokenEvmReceiver = await helper.ethNativeContract.rftToken(tokenAddress2, owner);
      const tokenEvmNonExist = await helper.ethNativeContract.rftToken(tokenAddressNonExist, owner);

      // 1. Can transfer zero amount (EIP-20):
      await tokenEvmOwner[testCase].send(isCross ? receiverCrossEth : receiverEth, 0);
      // 2. Cannot transfer non-owned token:
      await expect(tokenEvmReceiver[testCase].send(isCross ? ownerCross : owner, 0)).to.be.rejected;
      await expect(tokenEvmReceiver[testCase].send(isCross ? ownerCross : owner, 5)).to.be.rejected;
      // 3. Cannot transfer non-existing token:
      await expect(tokenEvmNonExist[testCase].send(isCross ? ownerCross : owner, 0)).to.be.rejected;
      await expect(tokenEvmNonExist[testCase].send(isCross ? ownerCross : owner, 5)).to.be.rejected;

      // 4. Storage is not corrupted:
      expect(await rftOwner.getTop10Owners()).to.deep.eq([{Ethereum: owner.address.toLowerCase()}]);
      expect(await rftReceiver.getTop10Owners()).to.deep.eq([{Ethereum: receiverEth.address.toLowerCase()}]);
      expect(await helper.rft.getTokenTop10Owners(collection.collectionId, tokenIdNonExist)).to.deep.eq([]);

      // 4.1 Tokens can be transferred:
      await (await tokenEvmOwner[testCase].send(isCross ? receiverCrossEth : receiverEth, 10)).wait(...waitParams);
      await (await (<Contract>tokenEvmReceiver.connect(receiverEth))[testCase].send(isCross ? ownerCross : owner, 10)).wait(...waitParams);
      expect(await rftOwner.getTop10Owners()).to.deep.eq([{Ethereum: receiverEth.address.toLowerCase()}]);
      expect(await rftReceiver.getTop10Owners()).to.deep.eq([{Ethereum: owner.address.toLowerCase()}]);
    }));

  itEth('Can perform repartition()', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const receiver = await helper.eth.createAccountWithBalance(donor);
    const collection = await helper.rft.mintCollection(alice);
    const {tokenId} = await collection.mintToken(alice, 100n, {Ethereum: owner.address});

    const tokenAddress = helper.ethAddress.fromTokenId(collection.collectionId, tokenId);
    const contract = await helper.ethNativeContract.rftToken(tokenAddress, owner);

    await (await contract.repartition.send(200)).wait(...waitParams);
    expect(+await contract.balanceOf.staticCall(owner)).to.be.equal(200);
    await (await contract.transfer.send(receiver, 110)).wait(...waitParams);
    expect(+await contract.balanceOf.staticCall(owner)).to.be.equal(90);
    expect(+await contract.balanceOf.staticCall(receiver)).to.be.equal(110);

    await expect(contract.repartition.send(80)).to.eventually.be.rejected;

    await (await contract.transfer.send(receiver, 90)).wait(...waitParams);
    expect(+await contract.balanceOf.staticCall(owner)).to.be.equal(0);
    expect(+await contract.balanceOf.staticCall(receiver)).to.be.equal(200);

    await (await (<Contract>contract.connect(receiver)).repartition.send(150)).wait(...waitParams);
    await expect((<Contract>contract.connect(receiver)).transfer.send(owner, 160)).to.eventually.be.rejected;
    expect(+await contract.balanceOf.staticCall(receiver)).to.be.equal(150);
  });

  itEth('Can repartition with increased amount', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const collection = await helper.rft.mintCollection(alice);
    const {tokenId} = await collection.mintToken(alice, 100n, {Ethereum: owner.address});

    const tokenAddress = helper.ethAddress.fromTokenId(collection.collectionId, tokenId);
    const contract = await helper.ethNativeContract.rftToken(tokenAddress, owner);

    const repartitionTx = await contract.repartition.send(200);
    const repartitionReceipt = await repartitionTx.wait(...waitParams);
    const repartitionEvents = helper.eth.normalizeEvents(repartitionReceipt!);

    const event = repartitionEvents.Transfer;
    expect(event.address).to.be.equal(tokenAddress);
    expect(event.args.from).to.be.equal('0x0000000000000000000000000000000000000000');
    expect(event.args.to).to.be.equal(owner);
    expect(event.args.value).to.be.equal('100');
  });

  itEth('Can repartition with decreased amount', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const collection = await helper.rft.mintCollection(alice);
    const {tokenId} = await collection.mintToken(alice, 100n, {Ethereum: owner.address});

    const tokenAddress = helper.ethAddress.fromTokenId(collection.collectionId, tokenId);
    const contract = await helper.ethNativeContract.rftToken(tokenAddress, owner);

    const repartitionTx = await contract.repartition.send(50);
    const repartitionReceipt = await repartitionTx.wait(...waitParams);
    const repartitionEvents = helper.eth.normalizeEvents(repartitionReceipt!);
    const event = repartitionEvents.Transfer;
    expect(event.address).to.be.equal(tokenAddress);
    expect(event.args.from).to.be.equal(owner);
    expect(event.args.to).to.be.equal('0x0000000000000000000000000000000000000000');
    expect(event.args.value).to.be.equal('50');
  });

  itEth('Receiving Transfer event on burning into full ownership', async ({helper}) => {
    // TODO: Refactor this

    // const caller = await helper.eth.createAccountWithBalance(donor);
    // const receiver = await helper.eth.createAccountWithBalance(donor);
    // const {collectionId, collectionAddress} = await helper.eth.createRFTCollection(caller, 'Devastation', '6', '6');
    // const contract = await helper.ethNativeContract.collection(collectionAddress, 'rft', caller);

    // const mintTx = await contract.mint.send(caller);
    // const mintReceipt = await mintTx.wait(...waitParams);
    // const mintEvents = helper.eth.normalizeEvents(mintReceipt!);

    // const tokenId = +mintEvents.Transfer.args.tokenId;
    // const tokenAddress = helper.ethAddress.fromTokenId(collectionId, tokenId);
    // const tokenContract = await helper.ethNativeContract.rftToken(tokenAddress, caller, true);

    // await (await tokenContract.repartition.send(2)).wait(...waitParams);
    // await (await tokenContract.transfer.send(receiver, 1)).wait(...waitParams);

    // const events: any = [];
    // contract.events.allEvents((_: any, event: any) => {
    //   events.push(event);
    // });
    // await tokenContract.burnFrom(caller, 1).send();

    // if(events.length == 0) await helper.wait.newBlocks(1);
    // const event = events[0];
    // expect(event.address).to.be.equal(collectionAddress);
    // expect(event.args.from).to.be.equal('0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF');
    // expect(event.args.to).to.be.equal(receiver);
    // expect(event.args.tokenId).to.be.equal(tokenId);
  });

  itEth('Can perform burnFromCross()', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const ownerSub = (await helper.arrange.createAccounts([10n], donor))[0];
    const ownerCross = helper.ethCrossAccount.fromAddress(owner.address);
    const spender = await helper.eth.createAccountWithBalance(donor);

    const spenderCrossEth = helper.ethCrossAccount.fromAddress(spender.address);
    const ownerSubCross = helper.ethCrossAccount.fromKeyringPair(ownerSub);

    const collection = await helper.rft.mintCollection(alice);
    const {tokenId} = await collection.mintToken(alice, 200n, {Ethereum: owner.address});


    const tokenAddress = helper.ethAddress.fromTokenId(collection.collectionId, tokenId);
    const contract = await helper.ethNativeContract.rftToken(tokenAddress, owner);
    const spenderContract = helper.eth.changeContractCaller(contract, spender);

    {
      await (await contract.approveCross.send(spenderCrossEth, 100)).wait(...waitParams);

      await expect(spenderContract.burnFromCross.send(ownerCross, 50)).to.be.fulfilled;
      await expect(spenderContract.burnFromCross.send(ownerCross, 100)).to.be.rejected;
      expect(await contract.balanceOf.staticCall(owner)).to.be.equal('150');
    }
    {
      const {tokenId} = await collection.mintToken(alice, 200n, {Substrate: ownerSub.address});
      await collection.approveToken(ownerSub, tokenId, {Ethereum: spender.address}, 100n);
      const tokenAddress = helper.ethAddress.fromTokenId(collection.collectionId, tokenId);
      const contract = await helper.ethNativeContract.rftToken(tokenAddress, owner);

      await expect(spenderContract.burnFromCross(ownerSubCross, 50)).to.be.fulfilled;
      await expect(spenderContract.burnFromCross(ownerSubCross, 100)).to.be.rejected;
      expect(await collection.getTokenBalance(tokenId, {Substrate: ownerSub.address})).to.be.equal(150n);
    }
  });

  itEth('Check balanceOfCross()', async ({helper}) => {
    const collection = await helper.rft.mintCollection(alice, {});
    const owner = await helper.eth.createAccountWithBalance(donor, 100n);
    const other = await helper.eth.createAccountWithBalance(donor, 100n);
    const {tokenId} = await collection.mintToken(alice, 200n, {Ethereum: owner.address});
    const tokenAddress = helper.ethAddress.fromTokenId(collection.collectionId, tokenId);
    const tokenContract = await helper.ethNativeContract.rftToken(tokenAddress, owner);

    expect(await tokenContract.balanceOfCross.staticCall(owner)).to.be.eq(200n);
    expect(await tokenContract.balanceOfCross.staticCall(other)).to.be.eq(0n);

    await (await tokenContract.repartition.send(100n)).wait(...waitParams);
    expect(await tokenContract.balanceOfCross.staticCall(owner)).to.be.eq(100n);
    expect(await tokenContract.balanceOfCross.staticCall(other)).to.be.eq(0n);

    await (await tokenContract.transferCross.send(other, 50n)).wait(...waitParams);
    expect(await tokenContract.balanceOfCross.staticCall(owner)).to.be.eq(50n);
    expect(await tokenContract.balanceOfCross.staticCall(other)).to.be.eq(50n);

    await (await tokenContract.transferCross.send(other, 50n)).wait(...waitParams);
    expect(await tokenContract.balanceOfCross.staticCall(owner)).to.be.eq(0n);
    expect(await tokenContract.balanceOfCross.staticCall(other)).to.be.eq(100n);

    const otherTokenContract = helper.eth.changeContractCaller(tokenContract, other);
    await (await otherTokenContract.repartition.send(1000n)).wait(...waitParams);
    await (await otherTokenContract.transferCross.send(owner, 500n)).wait(...waitParams);

    expect(await tokenContract.balanceOfCross.staticCall(owner)).to.be.eq(500n);
    expect(await tokenContract.balanceOfCross.staticCall(other)).to.be.eq(500n);
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
    const {tokenId} = await collection.mintToken(alice, 100n, {Ethereum: owner.address});

    const tokenAddress = helper.ethAddress.fromTokenId(collection.collectionId, tokenId);
    const contract = await helper.ethNativeContract.rftToken(tokenAddress, owner);

    const cost = await helper.eth.recordCallFee(
      owner.address,
      async () => await (await contract.approve.send(spender, 100)).wait(...waitParams),
    );
    expect(cost < BigInt(0.2 * Number(helper.balance.getOneTokenNominal())));
  });

  itEth('transferFrom() call fee is less than 0.2UNQ', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const spender = await helper.eth.createAccountWithBalance(donor);
    const collection = await helper.rft.mintCollection(alice);
    const {tokenId} = await collection.mintToken(alice, 200n, {Ethereum: owner.address});

    const tokenAddress = helper.ethAddress.fromTokenId(collection.collectionId, tokenId);
    const contract = await helper.ethNativeContract.rftToken(tokenAddress, owner);

    await (await contract.approve.send(spender, 100)).wait(...waitParams);

    const spenderContract = helper.eth.changeContractCaller(contract, spender);
    const cost = await helper.eth.recordCallFee(
      spender.address,
      async () => await (await spenderContract.transferFrom(owner, spender, 100)).wait(...waitParams),
    );
    expect(cost < BigInt(0.2 * Number(helper.balance.getOneTokenNominal())));
  });

  itEth('transfer() call fee is less than 0.2UNQ', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const receiver = helper.eth.createAccount();
    const collection = await helper.rft.mintCollection(alice);
    const {tokenId} = await collection.mintToken(alice, 200n, {Ethereum: owner.address});

    const tokenAddress = helper.ethAddress.fromTokenId(collection.collectionId, tokenId);
    const contract = await helper.ethNativeContract.rftToken(tokenAddress, owner);

    const cost = await helper.eth.recordCallFee(
      owner.address,
      async () => await (await contract.transfer.send(receiver, 100)).wait(...waitParams),
    );
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
    // TODO: Refactor this

    // const receiver = helper.eth.createAccount();
    // const collection = await helper.rft.mintCollection(alice);
    // const token = await collection.mintToken(alice, 200n);

    // const tokenAddress = helper.ethAddress.fromTokenId(collection.collectionId, token.tokenId);
    // const contract = await helper.ethNativeContract.rftToken(tokenAddress);

    // const events: any = [];
    // contract.events.allEvents((_: any, event: any) => {
    //   events.push(event);
    // });

    // expect(await token.approve(alice, {Ethereum: receiver}, 100n)).to.be.true;
    // if(events.length == 0) await helper.wait.newBlocks(1);
    // const event = events[0];

    // expect(event.event).to.be.equal('Approval');
    // expect(event.address).to.be.equal(tokenAddress);
    // expect(event.args.owner).to.be.equal(helper.address.substrateToEth(alice.address));
    // expect(event.args.spender).to.be.equal(receiver);
    // expect(event.args.value).to.be.equal('100');
  });

  itEth('Events emitted for transferFrom()', async ({helper}) => {
    // TODO: Refactor this

    // const [bob] = await helper.arrange.createAccounts([10n], donor);
    // const receiver = helper.eth.createAccount();
    // const collection = await helper.rft.mintCollection(alice);
    // const token = await collection.mintToken(alice, 200n);
    // await token.approve(alice, {Substrate: bob.address}, 100n);

    // const tokenAddress = helper.ethAddress.fromTokenId(collection.collectionId, token.tokenId);
    // const contract = await helper.ethNativeContract.rftToken(tokenAddress);

    // const events: any = [];
    // contract.events.allEvents((_: any, event: any) => {
    //   events.push(event);
    // });

    // expect(await token.transferFrom(bob, {Substrate: alice.address}, {Ethereum: receiver},  51n)).to.be.true;
    // if(events.length == 0) await helper.wait.newBlocks(1);

    // let event = events[0];
    // expect(event.event).to.be.equal('Transfer');
    // expect(event.address).to.be.equal(tokenAddress);
    // expect(event.args.from).to.be.equal(helper.address.substrateToEth(alice.address));
    // expect(event.args.to).to.be.equal(receiver);
    // expect(event.args.value).to.be.equal('51');

    // event = events[1];
    // expect(event.event).to.be.equal('Approval');
    // expect(event.address).to.be.equal(tokenAddress);
    // expect(event.args.owner).to.be.equal(helper.address.substrateToEth(alice.address));
    // expect(event.args.spender).to.be.equal(helper.address.substrateToEth(bob.address));
    // expect(event.args.value).to.be.equal('49');
  });

  itEth('Events emitted for transfer()', async ({helper}) => {
    // TODO: Refactor this
    
    // const receiver = helper.eth.createAccount();
    // const collection = await helper.rft.mintCollection(alice);
    // const token = await collection.mintToken(alice, 200n);

    // const tokenAddress = helper.ethAddress.fromTokenId(collection.collectionId, token.tokenId);
    // const contract = await helper.ethNativeContract.rftToken(tokenAddress);

    // const events: any = [];
    // contract.events.allEvents((_: any, event: any) => {
    //   events.push(event);
    // });

    // expect(await token.transfer(alice, {Ethereum: receiver},  51n)).to.be.true;
    // if(events.length == 0) await helper.wait.newBlocks(1);
    // const event = events[0];

    // expect(event.event).to.be.equal('Transfer');
    // expect(event.address).to.be.equal(tokenAddress);
    // expect(event.args.from).to.be.equal(helper.address.substrateToEth(alice.address));
    // expect(event.args.to).to.be.equal(receiver);
    // expect(event.args.value).to.be.equal('51');
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

    const mintTx = await collectionContract.mint.send(owner);
    const mintReceipt = await mintTx.wait(...waitParams);
    const mintEvents = helper.eth.normalizeEvents(mintReceipt!);

    const tokenId = +mintEvents.Transfer.args.tokenId;

    const tokenAddress = helper.ethAddress.fromTokenId(collectionId, tokenId);
    const tokenContract = await helper.ethNativeContract.rftToken(tokenAddress, owner);

    expect(await tokenContract.parentToken.staticCall()).to.be.equal(collectionAddress);
    expect(await tokenContract.parentTokenId.staticCall()).to.be.equal(tokenId);
  });
});
