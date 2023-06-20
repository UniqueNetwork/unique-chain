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

import {itEth, usingEthPlaygrounds, expect, EthUniqueHelper} from './util';
import {IKeyringPair} from '@polkadot/types/types';
import {Contract} from 'web3-eth-contract';
import {ITokenPropertyPermission} from '../util/playgrounds/types';

describe('Check ERC721 token URI for NFT', () => {
  let donor: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (_helper, privateKey) => {
      donor = await privateKey({url: import.meta.url});
    });
  });

  async function setup(helper: EthUniqueHelper, baseUri: string, propertyKey?: string, propertyValue?: string): Promise<{contract: Contract, nextTokenId: string}> {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const receiver = helper.eth.createAccount();

    const {collectionAddress} = await helper.eth.createERC721MetadataCompatibleNFTCollection(owner, 'Mint collection', 'a', 'b', baseUri);
    const contract = await helper.ethNativeContract.collection(collectionAddress, 'nft', owner);

    const result = await contract.methods.mint(receiver).send();
    const tokenId = result.events.Transfer.returnValues.tokenId;
    expect(tokenId).to.be.equal('1');

    if (propertyKey && propertyValue) {
      // Set URL or suffix
      await contract.methods.setProperties(tokenId, [{key: propertyKey, value: Buffer.from(propertyValue)}]).send();
    }

    const event = result.events.Transfer;
    expect(event.address).to.be.equal(collectionAddress);
    expect(event.returnValues.from).to.be.equal('0x0000000000000000000000000000000000000000');
    expect(event.returnValues.to).to.be.equal(receiver);
    expect(event.returnValues.tokenId).to.be.equal(tokenId);

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

describe('NFT: Plain calls', () => {
  let donor: IKeyringPair;
  let minter: IKeyringPair;
  let bob: IKeyringPair;
  let charlie: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (helper, privateKey) => {
      donor = await privateKey({url: import.meta.url});
      [minter, bob, charlie] = await helper.arrange.createAccounts([100n, 100n, 100n], donor);
    });
  });

  // TODO combine all minting tests in one place
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

      // const receiverCross = helper.ethCrossAccount.fromKeyringPair(bob);
      const properties = Array(5).fill(0).map((_, i) => ({key: `key_${i}`, value: Buffer.from(`value_${i}`)}));
      const permissions: ITokenPropertyPermission[] = properties
        .map(p => ({
          key: p.key, permission: {
            tokenOwner: false,
            collectionAdmin: true,
            mutable: false,
          },
        }));

      const collection = await helper.nft.mintCollection(minter, {
        tokenPrefix: 'ethp',
        tokenPropertyPermissions: permissions,
      });
      await collection.addAdmin(minter, {Ethereum: collectionAdmin});

      const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
      const contract = await helper.ethNativeContract.collection(collectionAddress, 'nft', collectionAdmin, true);
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
        .map(p => helper.ethProperty.property(p.key, p.value.toString())));

      expect(await helper.nft.getTokenOwner(collection.collectionId, tokenId))
        .to.deep.eq(testCase === 'ethereum' ? {Ethereum: receiverEth.toLowerCase()} : {Substrate: receiverSub.address});
    });
  });

  itEth('Non-owner and non admin cannot mintCross', async ({helper}) => {
    const nonOwner = await helper.eth.createAccountWithBalance(donor);
    const nonOwnerCross = helper.ethCrossAccount.fromAddress(nonOwner);

    const collection = await helper.nft.mintCollection(minter);
    const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    const collectionEvm = await helper.ethNativeContract.collection(collectionAddress, 'nft');

    await expect(collectionEvm.methods.mintCross(nonOwnerCross, []).call({from: nonOwner}))
      .to.be.rejectedWith('PublicMintingNotAllowed');
  });

  //TODO: CORE-302 add eth methods
  itEth.skip('Can perform mintBulk()', async ({helper}) => {
    const caller = await helper.eth.createAccountWithBalance(donor);
    const receiver = helper.eth.createAccount();

    const collection = await helper.nft.mintCollection(minter);
    await collection.addAdmin(minter, {Ethereum: caller});

    const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = await helper.ethNativeContract.collection(collectionAddress, 'nft', caller);
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

    const collection = await helper.nft.mintCollection(minter, {});
    const {tokenId} = await collection.mintToken(minter, {Ethereum: caller});

    const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = await helper.ethNativeContract.collection(collectionAddress, 'nft', caller);

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

    const collection = await helper.nft.mintCollection(minter, {});
    const {tokenId} = await collection.mintToken(minter, {Ethereum: owner});

    const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = await helper.ethNativeContract.collection(collectionAddress, 'nft', owner);

    {
      const badTokenId = await contract.methods.nextTokenId().call() + 1;
      await expect(contract.methods.getApproved(badTokenId).call()).to.be.rejectedWith('revert TokenNotFound');
    }
    {
      const approved = await contract.methods.getApproved(tokenId).call();
      expect(approved).to.be.equal('0x0000000000000000000000000000000000000000');
    }
    {
      const result = await contract.methods.approve(spender, tokenId).send({from: owner});

      const event = result.events.Approval;
      expect(event.address).to.be.equal(collectionAddress);
      expect(event.returnValues.owner).to.be.equal(owner);
      expect(event.returnValues.approved).to.be.equal(spender);
      expect(event.returnValues.tokenId).to.be.equal(`${tokenId}`);
    }
    {
      const approved = await contract.methods.getApproved(tokenId).call();
      expect(approved).to.be.equal(spender);
    }
  });

  itEth('Can perform setApprovalForAll()', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const operator = helper.eth.createAccount();

    const collection = await helper.nft.mintCollection(minter, {});

    const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = await helper.ethNativeContract.collection(collectionAddress, 'nft', owner);

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
    const collection = await helper.nft.mintCollection(minter, {name: 'A', description: 'B', tokenPrefix: 'C'});

    const owner = await helper.eth.createAccountWithBalance(donor);
    const operator = await helper.eth.createAccountWithBalance(donor);

    const token = await collection.mintToken(minter, {Ethereum: owner});

    const address = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = await helper.ethNativeContract.collection(address, 'nft');

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

    expect(await helper.nft.doesTokenExist(collection.collectionId, token.tokenId)).to.be.false;
  });

  itEth('Can perform transfer with ApprovalForAll', async ({helper}) => {
    const collection = await helper.nft.mintCollection(minter, {name: 'A', description: 'B', tokenPrefix: 'C'});

    const owner = await helper.eth.createAccountWithBalance(donor);
    const operator = await helper.eth.createAccountWithBalance(donor);
    const receiver = charlie;

    const token = await collection.mintToken(minter, {Ethereum: owner});

    const address = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = await helper.ethNativeContract.collection(address, 'nft');

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

    expect(await token.getOwner()).to.be.like({Substrate: receiver.address});
  });

  itEth('Can perform burnFromCross()', async ({helper}) => {
    const collection = await helper.nft.mintCollection(minter, {name: 'A', description: 'B', tokenPrefix: 'C'});
    const ownerSub = bob;
    const ownerCrossSub = helper.ethCrossAccount.fromKeyringPair(ownerSub);
    const ownerEth = await helper.eth.createAccountWithBalance(donor);
    const ownerCrossEth = helper.ethCrossAccount.fromAddress(ownerEth);

    const burnerEth = await helper.eth.createAccountWithBalance(donor);
    const burnerCrossEth = helper.ethCrossAccount.fromAddress(burnerEth);

    const token1 = await collection.mintToken(minter, {Substrate: ownerSub.address});
    const token2 = await collection.mintToken(minter, {Ethereum: ownerEth});

    const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    const collectionEvm = await helper.ethNativeContract.collection(collectionAddress, 'nft');

    // Approve tokens from substrate and ethereum:
    await token1.approve(ownerSub, {Ethereum: burnerEth});
    await collectionEvm.methods.approveCross(burnerCrossEth, token2.tokenId).send({from: ownerEth});

    // can burnFromCross:
    const result1 = await collectionEvm.methods.burnFromCross(ownerCrossSub, token1.tokenId).send({from: burnerEth});
    const result2 = await collectionEvm.methods.burnFromCross(ownerCrossEth, token2.tokenId).send({from: burnerEth});
    const events1 = result1.events.Transfer;
    const events2 = result2.events.Transfer;

    // Check events for burnFromCross (substrate and ethereum):
    [
      [events1, token1, helper.address.substrateToEth(ownerSub.address)],
      [events2, token2, ownerEth],
    ].map(burnData => {
      expect(burnData[0]).to.be.like({
        address: collectionAddress,
        event: 'Transfer',
        returnValues: {
          from: burnData[2],
          to: '0x0000000000000000000000000000000000000000',
          tokenId: burnData[1].tokenId.toString(),
        },
      });
    });

    expect(await token1.doesExist()).to.be.false;
    expect(await token2.doesExist()).to.be.false;
  });

  // TODO combine all approve tests in one place
  itEth('Can perform approveCross()', async ({helper}) => {
    // arrange: create accounts
    const owner = await helper.eth.createAccountWithBalance(donor);
    const ownerCross = helper.ethCrossAccount.fromAddress(owner);
    const receiverSub = charlie;
    const recieverCrossSub = helper.ethCrossAccount.fromKeyringPair(receiverSub);
    const receiverEth = await helper.eth.createAccountWithBalance(donor);
    const receiverCrossEth = helper.ethCrossAccount.fromAddress(receiverEth);

    // arrange: create collection and tokens:
    const collection = await helper.nft.mintCollection(minter, {name: 'A', description: 'B', tokenPrefix: 'C'});
    const token1 = await collection.mintToken(minter, {Ethereum: owner});
    const token2 = await collection.mintToken(minter, {Ethereum: owner});

    const collectionEvm = await helper.ethNativeContract.collection(helper.ethAddress.fromCollectionId(collection.collectionId), 'nft');

    // Can approveCross substrate and ethereum address:
    const resultSub = await collectionEvm.methods.approveCross(recieverCrossSub, token1.tokenId).send({from: owner});
    const resultEth = await collectionEvm.methods.approveCross(receiverCrossEth, token2.tokenId).send({from: owner});
    const eventSub = resultSub.events.Approval;
    const eventEth = resultEth.events.Approval;
    expect(eventSub).to.be.like({
      address: helper.ethAddress.fromCollectionId(collection.collectionId),
      event: 'Approval',
      returnValues: {
        owner,
        approved: helper.address.substrateToEth(receiverSub.address),
        tokenId: token1.tokenId.toString(),
      },
    });
    expect(eventEth).to.be.like({
      address: helper.ethAddress.fromCollectionId(collection.collectionId),
      event: 'Approval',
      returnValues: {
        owner,
        approved: receiverEth,
        tokenId: token2.tokenId.toString(),
      },
    });

    // Substrate address can transferFrom approved tokens:
    await helper.nft.transferTokenFrom(receiverSub, collection.collectionId, token1.tokenId, {Ethereum: owner}, {Substrate: receiverSub.address});
    expect(await helper.nft.getTokenOwner(collection.collectionId, token1.tokenId)).to.deep.eq({Substrate: receiverSub.address});
    // Ethereum address can transferFromCross approved tokens:
    await collectionEvm.methods.transferFromCross(ownerCross, receiverCrossEth, token2.tokenId).send({from: receiverEth});
    expect(await helper.nft.getTokenOwner(collection.collectionId, token2.tokenId)).to.deep.eq({Ethereum: receiverEth.toLowerCase()});
  });

  itEth('Non-owner and non admin cannot approveCross', async ({helper}) => {
    const nonOwner = await helper.eth.createAccountWithBalance(donor);
    const nonOwnerCross = helper.ethCrossAccount.fromAddress(nonOwner);
    const owner = await helper.eth.createAccountWithBalance(donor);
    const collection = await helper.nft.mintCollection(minter, {name: 'A', description: 'B', tokenPrefix: 'C'});
    const collectionEvm = await helper.ethNativeContract.collection(helper.ethAddress.fromCollectionId(collection.collectionId), 'nft');
    const token = await collection.mintToken(minter, {Ethereum: owner});

    await expect(collectionEvm.methods.approveCross(nonOwnerCross, token.tokenId).call({from: nonOwner})).to.be.rejectedWith('CantApproveMoreThanOwned');
  });

  itEth('Can reaffirm approved address', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const ownerCrossEth = helper.ethCrossAccount.fromAddress(owner);
    const [receiver1, receiver2] = await helper.arrange.createAccounts([100n, 100n], donor);
    const receiver1Cross = helper.ethCrossAccount.fromKeyringPair(receiver1);
    const receiver2Cross = helper.ethCrossAccount.fromKeyringPair(receiver2);
    const collection = await helper.nft.mintCollection(minter, {name: 'A', description: 'B', tokenPrefix: 'C'});
    const token1 = await collection.mintToken(minter, {Ethereum: owner});
    const token2 = await collection.mintToken(minter, {Ethereum: owner});
    const collectionEvm = await helper.ethNativeContract.collection(helper.ethAddress.fromCollectionId(collection.collectionId), 'nft');

    // Can approve and reaffirm approved address:
    await collectionEvm.methods.approveCross(receiver1Cross, token1.tokenId).send({from: owner});
    await collectionEvm.methods.approveCross(receiver2Cross, token1.tokenId).send({from: owner});

    // receiver1 cannot transferFrom:
    await expect(helper.nft.transferTokenFrom(receiver1, collection.collectionId, token1.tokenId, {Ethereum: owner}, {Substrate: receiver1.address})).to.be.rejected;
    // receiver2 can transferFrom:
    await helper.nft.transferTokenFrom(receiver2, collection.collectionId, token1.tokenId, {Ethereum: owner}, {Substrate: receiver2.address});

    // can set approved address to self address to remove approval:
    await collectionEvm.methods.approveCross(receiver1Cross, token2.tokenId).send({from: owner});
    await collectionEvm.methods.approveCross(ownerCrossEth, token2.tokenId).send({from: owner});

    // receiver1 cannot transfer token anymore:
    await expect(helper.nft.transferTokenFrom(receiver1, collection.collectionId, token2.tokenId, {Ethereum: owner}, {Substrate: receiver1.address})).to.be.rejected;
  });

  itEth('Can perform transferFrom()', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const spender = await helper.eth.createAccountWithBalance(donor);
    const receiver = helper.eth.createAccount();

    const collection = await helper.nft.mintCollection(minter, {});
    const {tokenId} = await collection.mintToken(minter, {Ethereum: owner});

    const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = await helper.ethNativeContract.collection(collectionAddress, 'nft', owner);

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

  itEth('Can perform transferFromCross()', async ({helper}) => {
    const collection = await helper.nft.mintCollection(minter, {name: 'A', description: 'B', tokenPrefix: 'C'});

    const [owner, receiver] = await helper.arrange.createAccounts([100n, 100n], donor);
    const spender = await helper.eth.createAccountWithBalance(donor);

    const token = await collection.mintToken(minter, {Substrate: owner.address});

    const address = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = await helper.ethNativeContract.collection(address, 'nft');

    await token.approve(owner, {Ethereum: spender});

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

    expect(await token.getOwner()).to.be.like({Substrate: receiver.address});
  });

  itEth('Can perform transfer()', async ({helper}) => {
    const collection = await helper.nft.mintCollection(minter, {});
    const owner = await helper.eth.createAccountWithBalance(donor);
    const receiver = helper.eth.createAccount();

    const {tokenId} = await collection.mintToken(minter, {Ethereum: owner});

    const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = await helper.ethNativeContract.collection(collectionAddress, 'nft', owner);

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

  itEth('Can perform transferCross()', async ({helper}) => {
    const collection = await helper.nft.mintCollection(minter, {});
    const owner = await helper.eth.createAccountWithBalance(donor);
    const receiverEth = await helper.eth.createAccountWithBalance(donor);
    const receiverCrossEth = helper.ethCrossAccount.fromAddress(receiverEth);
    const receiverCrossSub = helper.ethCrossAccount.fromKeyringPair(minter);

    const {tokenId} = await collection.mintToken(minter, {Ethereum: owner});

    const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    const collectionEvm = await helper.ethNativeContract.collection(collectionAddress, 'nft', owner);

    {
      // Can transferCross to ethereum address:
      const result = await collectionEvm.methods.transferCross(receiverCrossEth, tokenId).send({from: owner});
      // Check events:
      const event = result.events.Transfer;
      expect(event.address).to.be.equal(collectionAddress);
      expect(event.returnValues.from).to.be.equal(owner);
      expect(event.returnValues.to).to.be.equal(receiverEth);
      expect(event.returnValues.tokenId).to.be.equal(`${tokenId}`);

      // owner has balance = 0:
      const ownerBalance = await collectionEvm.methods.balanceOf(owner).call();
      expect(+ownerBalance).to.equal(0);
      // receiver owns token:
      const receiverBalance = await collectionEvm.methods.balanceOf(receiverEth).call();
      expect(+receiverBalance).to.equal(1);
      expect(await helper.nft.getTokenOwner(collection.collectionId, tokenId)).to.deep.eq({Ethereum: receiverEth.toLowerCase()});
    }

    {
      // Can transferCross to substrate address:
      const substrateResult = await collectionEvm.methods.transferCross(receiverCrossSub, tokenId).send({from: receiverEth});
      // Check events:
      const event = substrateResult.events.Transfer;
      expect(event.address).to.be.equal(collectionAddress);
      expect(event.returnValues.from).to.be.equal(receiverEth);
      expect(event.returnValues.to).to.be.equal(helper.address.substrateToEth(minter.address));
      expect(event.returnValues.tokenId).to.be.equal(`${tokenId}`);

      // owner has balance = 0:
      const ownerBalance = await collectionEvm.methods.balanceOf(receiverEth).call();
      expect(+ownerBalance).to.equal(0);
      // receiver owns token:
      const receiverBalance = await helper.nft.getTokensByAddress(collection.collectionId, {Substrate: minter.address});
      expect(receiverBalance).to.contain(tokenId);
    }
  });

  ['transfer', 'transferCross'].map(testCase => itEth(`Cannot ${testCase} non-owned token`, async ({helper}) => {
    const sender = await helper.eth.createAccountWithBalance(donor);
    const tokenOwner = await helper.eth.createAccountWithBalance(donor);
    const receiverSub = minter;
    const receiverCrossSub = helper.ethCrossAccount.fromKeyringPair(minter);

    const collection = await helper.nft.mintCollection(minter, {});
    const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    const collectionEvm = await helper.ethNativeContract.collection(collectionAddress, 'nft', sender);

    await collection.mintToken(minter, {Ethereum: sender});
    const nonSendersToken = await collection.mintToken(minter, {Ethereum: tokenOwner});

    // Cannot transferCross someone else's token:
    const receiver = testCase === 'transfer' ? helper.address.substrateToEth(receiverSub.address) : receiverCrossSub;
    await expect(collectionEvm.methods[testCase](receiver, nonSendersToken.tokenId).send({from: sender})).to.be.rejected;
    // Cannot transfer token if it does not exist:
    await expect(collectionEvm.methods[testCase](receiver, 999999).send({from: sender})).to.be.rejected;
  }));

  itEth('Check balanceOfCross()', async ({helper}) => {
    const collection = await helper.nft.mintCollection(minter, {});
    const owner = await helper.ethCrossAccount.createAccountWithBalance(donor);
    const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    const collectionEvm = await helper.ethNativeContract.collection(collectionAddress, 'nft', owner.eth);

    expect(await collectionEvm.methods.balanceOfCross(owner).call({from: owner.eth})).to.be.eq('0');

    for (let i = 1; i < 10; i++) {
      await collection.mintToken(minter, {Ethereum: owner.eth});
      expect(await collectionEvm.methods.balanceOfCross(owner).call({from: owner.eth})).to.be.eq(i.toString());
    }
  });

  itEth('Check ownerOfCross()', async ({helper}) => {
    const collection = await helper.nft.mintCollection(minter, {});
    let owner = await helper.ethCrossAccount.createAccountWithBalance(donor);
    const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    const collectionEvm = await helper.ethNativeContract.collection(collectionAddress, 'nft', owner.eth);
    const {tokenId} = await collection.mintToken(minter, {Ethereum: owner.eth});

    for (let i = 1n; i < 10n; i++) {
      const ownerCross = await collectionEvm.methods.ownerOfCross(tokenId).call({from: owner.eth});
      expect(ownerCross.eth).to.be.eq(owner.eth);
      expect(ownerCross.sub).to.be.eq(owner.sub);

      const newOwner = await helper.ethCrossAccount.createAccountWithBalance(donor);
      await collectionEvm.methods.transferCross(newOwner, tokenId).send({from: owner.eth});
      owner = newOwner;
    }
  });
});

describe('NFT: Fees', () => {
  let donor: IKeyringPair;
  let alice: IKeyringPair;
  let bob: IKeyringPair;
  let charlie: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (helper, privateKey) => {
      donor = await privateKey({url: import.meta.url});
      [alice, bob, charlie] = await helper.arrange.createAccounts([10n, 10n, 10n], donor);
    });
  });

  itEth('approve() call fee is less than 0.2UNQ', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const spender = helper.eth.createAccount();

    const collection = await helper.nft.mintCollection(alice, {});
    const {tokenId} = await collection.mintToken(alice, {Ethereum: owner});

    const contract = await helper.ethNativeContract.collectionById(collection.collectionId, 'nft', owner);

    const cost = await helper.eth.recordCallFee(owner, () => contract.methods.approve(spender, tokenId).send({from: owner}));
    expect(cost < BigInt(0.2 * Number(helper.balance.getOneTokenNominal())));
  });

  itEth('transferFrom() call fee is less than 0.2UNQ', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const spender = await helper.eth.createAccountWithBalance(donor);

    const collection = await helper.nft.mintCollection(alice, {});
    const {tokenId} = await collection.mintToken(alice, {Ethereum: owner});

    const contract = await helper.ethNativeContract.collectionById(collection.collectionId, 'nft', owner);

    await contract.methods.approve(spender, tokenId).send({from: owner});

    const cost = await helper.eth.recordCallFee(spender, () => contract.methods.transferFrom(owner, spender, tokenId).send({from: spender}));
    expect(cost < BigInt(0.2 * Number(helper.balance.getOneTokenNominal())));
  });

  itEth('Can perform transferFromCross()', async ({helper}) => {
    const collectionMinter = alice;
    const owner = bob;
    const receiver = charlie;
    const collection = await helper.nft.mintCollection(collectionMinter, {name: 'A', description: 'B', tokenPrefix: 'C'});

    const spender = await helper.eth.createAccountWithBalance(donor);

    const token = await collection.mintToken(collectionMinter, {Substrate: owner.address});

    const address = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = await helper.ethNativeContract.collection(address, 'nft');

    await token.approve(owner, {Ethereum: spender});

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

    expect(await token.getOwner()).to.be.like({Substrate: receiver.address});
  });

  itEth('transfer() call fee is less than 0.2UNQ', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const receiver = helper.eth.createAccount();

    const collection = await helper.nft.mintCollection(alice, {});
    const {tokenId} = await collection.mintToken(alice, {Ethereum: owner});

    const contract = await helper.ethNativeContract.collectionById(collection.collectionId, 'nft', owner);

    const cost = await helper.eth.recordCallFee(owner, () => contract.methods.transfer(receiver, tokenId).send({from: owner}));
    expect(cost < BigInt(0.2 * Number(helper.balance.getOneTokenNominal())));
  });
});

describe('NFT: Substrate calls', () => {
  let donor: IKeyringPair;
  let alice: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (helper, privateKey) => {
      donor = await privateKey({url: import.meta.url});
      [alice] = await helper.arrange.createAccounts([20n], donor);
    });
  });

  itEth('Events emitted for mint()', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {});
    const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = await helper.ethNativeContract.collection(collectionAddress, 'nft');

    const events: any = [];
    contract.events.allEvents((_: any, event: any) => {
      events.push(event);
    });

    const {tokenId} = await collection.mintToken(alice);
    if (events.length == 0) await helper.wait.newBlocks(1);
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
    const contract = await helper.ethNativeContract.collection(collectionAddress, 'nft');

    const events: any = [];
    contract.events.allEvents((_: any, event: any) => {
      events.push(event);
    });

    await token.burn(alice);
    if (events.length == 0) await helper.wait.newBlocks(1);
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
    const contract = await helper.ethNativeContract.collection(collectionAddress, 'nft');

    const events: any = [];
    contract.events.allEvents((_: any, event: any) => {
      events.push(event);
    });

    await token.approve(alice, {Ethereum: receiver});
    if (events.length == 0) await helper.wait.newBlocks(1);
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
    const contract = await helper.ethNativeContract.collection(collectionAddress, 'nft');

    const events: any = [];
    contract.events.allEvents((_: any, event: any) => {
      events.push(event);
    });

    await token.transferFrom(bob, {Substrate: alice.address}, {Ethereum: receiver});

    if (events.length == 0) await helper.wait.newBlocks(1);
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
    const contract = await helper.ethNativeContract.collection(collectionAddress, 'nft');

    const events: any = [];
    contract.events.allEvents((_: any, event: any) => {
      events.push(event);
    });

    await token.transfer(alice, {Ethereum: receiver});

    if (events.length == 0) await helper.wait.newBlocks(1);
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
      donor = await privateKey({url: import.meta.url});
      [alice] = await helper.arrange.createAccounts([20n], donor);
    });
  });

  itEth('Returns collection name', async ({helper}) => {
    // FIXME: should not have balance to use .call()
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

    const contract = await helper.ethNativeContract.collectionById(collection.collectionId, 'nft', caller);
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

    const contract = await helper.ethNativeContract.collectionById(collection.collectionId, 'nft', caller);
    const symbol = await contract.methods.symbol().call();
    expect(symbol).to.equal('CHANGE');
  });
});

describe('Negative tests', () => {
  let donor: IKeyringPair;
  let minter: IKeyringPair;
  let alice: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (helper, privateKey) => {
      donor = await privateKey({url: import.meta.url});
      [minter, alice] = await helper.arrange.createAccounts([100n, 100n], donor);
    });
  });

  itEth('[negative] Cant perform burn without approval', async ({helper}) => {
    const collection = await helper.nft.mintCollection(minter, {name: 'A', description: 'B', tokenPrefix: 'C'});

    const owner = await helper.eth.createAccountWithBalance(donor);
    const spender = await helper.eth.createAccountWithBalance(donor);

    const token = await collection.mintToken(minter, {Ethereum: owner});

    const address = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = await helper.ethNativeContract.collection(address, 'nft');

    const ownerCross = helper.ethCrossAccount.fromAddress(owner);
    await expect(contract.methods.burnFromCross(ownerCross, token.tokenId).send({from: spender})).to.be.rejected;

    await contract.methods.setApprovalForAll(spender, true).send({from: owner});
    await contract.methods.setApprovalForAll(spender, false).send({from: owner});

    await expect(contract.methods.burnFromCross(ownerCross, token.tokenId).send({from: spender})).to.be.rejected;
  });

  itEth('[negative] Cant perform transfer without approval', async ({helper}) => {
    const collection = await helper.nft.mintCollection(minter, {name: 'A', description: 'B', tokenPrefix: 'C'});
    const receiver = alice;

    const owner = await helper.eth.createAccountWithBalance(donor);
    const spender = await helper.eth.createAccountWithBalance(donor);

    const token = await collection.mintToken(minter, {Ethereum: owner});

    const address = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = await helper.ethNativeContract.collection(address, 'nft');

    const ownerCross = helper.ethCrossAccount.fromAddress(owner);
    const recieverCross = helper.ethCrossAccount.fromKeyringPair(receiver);

    await expect(contract.methods.transferFromCross(ownerCross, recieverCross, token.tokenId).send({from: spender})).to.be.rejected;

    await contract.methods.setApprovalForAll(spender, true).send({from: owner});
    await contract.methods.setApprovalForAll(spender, false).send({from: owner});

    await expect(contract.methods.transferFromCross(ownerCross, recieverCross, token.tokenId).send({from: spender})).to.be.rejected;
  });
});
