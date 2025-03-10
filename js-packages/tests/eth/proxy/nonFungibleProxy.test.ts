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

import {readFile} from 'fs/promises';
import type {IKeyringPair} from '@polkadot/types/types';
import {itEth, usingEthPlaygrounds, expect, waitParams} from '@unique/test-utils/eth/util.js';
import {EthUniqueHelper} from '@unique/test-utils/eth/index.js';
import {makeNames} from '@unique/test-utils/util.js';

const {dirname} = makeNames(import.meta.url);


async function proxyWrap(helper: EthUniqueHelper, wrapped: any, donor: IKeyringPair) {
  // Proxy owner has no special privilegies, we don't need to reuse them
  const owner = await helper.eth.createAccountWithBalance(donor);

  const abiFileContent = await readFile(`${dirname}/UniqueNFTProxy.abi`);
  const abi = JSON.parse(abiFileContent.toString());

  const bytecodeFileContent = await readFile(`${dirname}/UniqueNFTProxy.bin`);
  const bytecode = bytecodeFileContent.toString();

  return await helper.ethContract.deployByAbi(owner, abi, bytecode, undefined, [await wrapped.getAddress()]);
}

describe('NFT (Via EVM proxy): Information getting', () => {
  let alice: IKeyringPair;
  let donor: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (helper, privateKey) => {
      donor = await privateKey({url: import.meta.url});
      [alice] = await helper.arrange.createAccounts([10n], donor);
    });
  });

  itEth('totalSupply', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'test', description: 'test', tokenPrefix: 'test'});
    const caller = await helper.eth.createAccountWithBalance(donor);
    await collection.mintToken(alice, {Substrate: alice.address});

    const address = helper.ethAddress.fromCollectionId(collection.collectionId);
    const evmCollection = await helper.ethNativeContract.collection(address, 'nft', caller);
    const contract = await proxyWrap(helper, evmCollection, donor);
    const totalSupply = await contract.totalSupply.staticCall();

    expect(totalSupply).to.equal(1n);
  });

  itEth('balanceOf', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'test', description: 'test', tokenPrefix: 'test'});

    const caller = await helper.eth.createAccountWithBalance(donor);
    await collection.mintMultipleTokens(alice, [
      {owner: {Ethereum: caller.address}},
      {owner: {Ethereum: caller.address}},
      {owner: {Ethereum: caller.address}},
    ]);

    const address = helper.ethAddress.fromCollectionId(collection.collectionId);
    const evmCollection = await helper.ethNativeContract.collection(address, 'nft', caller);
    const contract = await proxyWrap(helper, evmCollection, donor);
    const balance = await contract.balanceOf.staticCall(caller);

    expect(balance).to.equal(3n);
  });

  itEth('ownerOf', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'test', description: 'test', tokenPrefix: 'test'});

    const caller = await helper.eth.createAccountWithBalance(donor);
    const {tokenId} = await collection.mintToken(alice, {Ethereum: caller.address});

    const address = helper.ethAddress.fromCollectionId(collection.collectionId);
    const evmCollection = await helper.ethNativeContract.collection(address, 'nft', caller);
    const contract = await proxyWrap(helper, evmCollection, donor);
    const owner = await contract.ownerOf.staticCall(tokenId);

    expect(owner).to.equal(caller.address);
  });
});

describe('NFT (Via EVM proxy): Plain calls', () => {
  let alice: IKeyringPair;
  let donor: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (helper, privateKey) => {
      donor = await privateKey({url: import.meta.url});
      [alice] = await helper.arrange.createAccounts([10n], donor);
    });
  });

  // Soft-deprecated
  itEth('PAM [eth] Can perform mint()', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const {collectionAddress} = await helper.eth.createERC721MetadataCompatibleNFTCollection(owner, 'A', 'A', 'A', '');
    const caller = await helper.eth.createAccountWithBalance(donor);
    const receiver = helper.eth.createAccount();

    const collectionEvmOwned = await helper.ethNativeContract.collection(collectionAddress, 'nft', owner, true);
    const collectionEvm = await helper.ethNativeContract.collection(collectionAddress, 'nft', caller, true);
    const contract = await proxyWrap(helper, collectionEvm, donor);
    await (await collectionEvmOwned.addCollectionAdmin.send(await contract.getAddress())).wait(...waitParams);

    {
      const callerContract = helper.eth.changeContractCaller(contract, caller);

      const nextTokenId = await contract.nextTokenId.staticCall();

      const mintTx = await callerContract.mintWithTokenURI.send(receiver.address, nextTokenId, 'Test URI');
      const mintReceipt = await mintTx.wait(...waitParams);
      const mintEvents = helper.eth.normalizeEvents(mintReceipt!);

      const tokenId = mintEvents.Transfer.args.tokenId;
      expect(tokenId).to.be.equal('1');

      const event = mintEvents.Transfer;
      event.address = event.address.toLocaleLowerCase();

      expect(event).to.be.deep.equal({
        address: collectionAddress.toLocaleLowerCase(),
        event: 'Transfer',
        args: {
          from: '0x0000000000000000000000000000000000000000',
          to: receiver.address,
          tokenId,
        },
      });

      expect(await contract.tokenURI.staticCall(tokenId)).to.be.equal('Test URI');
    }
  });

  itEth('[cross] Can perform mint()', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const {collectionAddress} = await helper.eth.createERC721MetadataCompatibleNFTCollection(owner, 'A', 'A', 'A', '');
    const caller = await helper.eth.createAccountWithBalance(donor);
    const receiver = helper.eth.createAccount();

    const collectionEvmOwned = await helper.ethNativeContract.collection(collectionAddress, 'nft', owner);
    const collectionEvm = await helper.ethNativeContract.collection(collectionAddress, 'nft', caller);
    const contract = await proxyWrap(helper, collectionEvm, donor);
    const contractAddressCross = helper.ethCrossAccount.fromAddress(await contract.getAddress());
    await (await collectionEvmOwned.addCollectionAdminCross.send(contractAddressCross)).wait(...waitParams);

    {
      const callerContract = helper.eth.changeContractCaller(contract, caller);

      const nextTokenId = await contract.nextTokenId.staticCall();

      const mintTx = await callerContract.mintWithTokenURI.send(receiver.address, nextTokenId, 'Test URI');
      const mintReceipt = await mintTx.wait(...waitParams);
      const mintEvents = helper.eth.normalizeEvents(mintReceipt!);

      const tokenId = mintEvents.Transfer.args.tokenId;
      expect(tokenId).to.be.equal('1');

      const event = mintEvents.Transfer;
      event.address = event.address.toLocaleLowerCase();

      expect(event).to.be.deep.equal({
        address: collectionAddress.toLocaleLowerCase(),
        event: 'Transfer',
        args: {
          from: '0x0000000000000000000000000000000000000000',
          to: receiver.address,
          tokenId,
        },
      });

      expect(await contract.tokenURI.staticCall(tokenId)).to.be.equal('Test URI');
    }
  });

  //TODO: CORE-302 add eth methods
  itEth.skip('Can perform mintBulk()', async ({helper}) => {
    const collection = await helper.nft.mintCollection(donor, {name: 'New', description: 'New collection', tokenPrefix: 'NEW'});

    const caller = await helper.eth.createAccountWithBalance(donor);
    const receiver = helper.eth.createAccount();

    const address = helper.ethAddress.fromCollectionId(collection.collectionId);
    const evmCollection = await helper.ethNativeContract.collection(address, 'nft', caller);
    const contract = await proxyWrap(helper, evmCollection, donor);
    await collection.addAdmin(donor, {Ethereum: await contract.getAddress()});

    {
      const callerContract = helper.eth.changeContractCaller(contract, caller);

      const nextTokenId = await contract.nextTokenId.staticCall();
      expect(nextTokenId).to.be.equal('1');

      const mintTx = await callerContract.mintBulkWithTokenURI.send(
        receiver.address,
        [
          [nextTokenId, 'Test URI 0'],
          [+nextTokenId + 1, 'Test URI 1'],
          [+nextTokenId + 2, 'Test URI 2'],
        ],
      );
      const mintReceipt = await mintTx.wait(...waitParams);
      const events = helper.eth.rebuildEvents(mintReceipt!);

      expect(events).to.be.deep.equal([
        {
          address,
          event: 'Transfer',
          args: {
            from: '0x0000000000000000000000000000000000000000',
            to: receiver.address,
            tokenId: nextTokenId,
          },
        },
        {
          address,
          event: 'Transfer',
          args: {
            from: '0x0000000000000000000000000000000000000000',
            to: receiver.address,
            tokenId: String(+nextTokenId + 1),
          },
        },
        {
          address,
          event: 'Transfer',
          args: {
            from: '0x0000000000000000000000000000000000000000',
            to: receiver.address,
            tokenId: String(+nextTokenId + 2),
          },
        },
      ]);

      expect(await contract.tokenURI.staticCall(nextTokenId)).to.be.equal('Test URI 0');
      expect(await contract.tokenURI.staticCall(+nextTokenId + 1)).to.be.equal('Test URI 1');
      expect(await contract.tokenURI.staticCall(+nextTokenId + 2)).to.be.equal('Test URI 2');
    }
  });

  itEth('Can perform burn()', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'test', description: 'test', tokenPrefix: 'test'});
    const caller = await helper.eth.createAccountWithBalance(donor);

    const address = helper.ethAddress.fromCollectionId(collection.collectionId);
    const evmCollection = await helper.ethNativeContract.collection(address, 'nft', caller);
    const contract = await proxyWrap(helper, evmCollection, donor);
    const {tokenId} = await collection.mintToken(alice, {Ethereum: await contract.getAddress()});
    await collection.addAdmin(alice, {Ethereum: await contract.getAddress()});

    {
      const callerContract = helper.eth.changeContractCaller(contract, caller);

      const burnTx = await callerContract.burn.send(tokenId);
      const burnReceipt = await burnTx.wait(...waitParams);
      const events = helper.eth.rebuildEvents(burnReceipt!);

      expect(events).to.be.deep.equal([
        {
          address,
          event: 'Transfer',
          args: {
            from: await contract.getAddress(),
            to: '0x0000000000000000000000000000000000000000',
            tokenId: tokenId.toString(),
          },
        },
      ]);
    }
  });

  itEth('Can perform approve()', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'test', description: 'test', tokenPrefix: 'test'});
    const caller = await helper.eth.createAccountWithBalance(donor);
    const spender = helper.eth.createAccount();

    const address = helper.ethAddress.fromCollectionId(collection.collectionId);
    const evmCollection = await helper.ethNativeContract.collection(address, 'nft', caller);
    const contract = await proxyWrap(helper, evmCollection, donor);
    const {tokenId} = await collection.mintToken(alice, {Ethereum: await contract.getAddress()});

    {
      const callerContract = helper.eth.changeContractCaller(contract, caller);

      const approveTx = await callerContract.approve(spender, tokenId);
      const approveReceipt = await approveTx.wait(...waitParams);
      const events = helper.eth.rebuildEvents(approveReceipt!);

      expect(events).to.be.deep.equal([
        {
          address,
          event: 'Approval',
          args: {
            owner: await contract.getAddress(),
            approved: spender.address,
            tokenId: tokenId.toString(),
          },
        },
      ]);
    }
  });

  itEth('Can perform transferFrom()', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'test', description: 'test', tokenPrefix: 'test'});
    const caller = await helper.eth.createAccountWithBalance(donor);
    const owner = await helper.eth.createAccountWithBalance(donor);

    const receiver = helper.eth.createAccount();

    const address = helper.ethAddress.fromCollectionId(collection.collectionId);
    const evmCollection = await helper.ethNativeContract.collection(address, 'nft', caller);
    const contract = await proxyWrap(helper, evmCollection, donor);
    const {tokenId} = await collection.mintToken(alice, {Ethereum: owner.address});

    await (await evmCollection.approve.send(await contract.getAddress(), tokenId)).wait(...waitParams);

    {
      const callerContract = helper.eth.changeContractCaller(contract, caller);

      const transferTx = await callerContract.transferFrom.send(owner.address, receiver.address, tokenId);
      const transferReceipt = await transferTx.wait(...waitParams);
      const events = helper.eth.rebuildEvents(transferReceipt!);

      expect(events).to.be.deep.equal([
        {
          address,
          event: 'Transfer',
          args: {
            from: owner.address,
            to: receiver.address,
            tokenId: tokenId.toString(),
          },
        },
      ]);
    }

    {
      const balance = await contract.balanceOf.staticCall(receiver);
      expect(+balance).to.equal(1);
    }

    {
      const balance = await contract.balanceOf.staticCall(await contract.getAddress());
      expect(+balance).to.equal(0);
    }
  });

  itEth('Can perform transfer()', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'test', description: 'test', tokenPrefix: 'test'});
    const caller = await helper.eth.createAccountWithBalance(donor);
    const receiver = helper.eth.createAccount();

    const address = helper.ethAddress.fromCollectionId(collection.collectionId);
    const evmCollection = await helper.ethNativeContract.collection(address, 'nft', caller);
    const contract = await proxyWrap(helper, evmCollection, donor);
    const {tokenId} = await collection.mintToken(alice, {Ethereum: await contract.getAddress()});

    {
      const callerContract = helper.eth.changeContractCaller(contract, caller);

      const transferTx = await callerContract.transfer.send(receiver.address, tokenId);
      const transferReceipt = await transferTx.wait(...waitParams);
      const events = helper.eth.rebuildEvents(transferReceipt!);

      expect(events).to.be.deep.equal([
        {
          address,
          event: 'Transfer',
          args: {
            from: await contract.getAddress(),
            to: receiver.address,
            tokenId: tokenId.toString(),
          },
        },
      ]);
    }

    {
      const balance = await contract.balanceOf.staticCall(await contract.getAddress());
      expect(balance).to.equal(0n);
    }

    {
      const balance = await contract.balanceOf.staticCall(receiver);
      expect(balance).to.equal(1n);
    }
  });
});
