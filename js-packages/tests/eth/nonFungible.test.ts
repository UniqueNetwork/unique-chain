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

import {itEth, usingEthPlaygrounds, expect, waitParams, hexlifyString} from '@unique/test-utils/eth/util.js';
import {EthUniqueHelper} from '@unique/test-utils/eth/index.js';
import type {IKeyringPair} from '@polkadot/types/types';
import {Contract} from 'ethers';
import type {ITokenPropertyPermission} from '@unique-nft/playgrounds/types.js';
import {CREATE_COLLECTION_DATA_DEFAULTS, NormalizedEvent, TokenPermissionField} from '@unique/test-utils/eth/types.js';

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

    const mintTx = await contract.mint.send(receiver);
    const mintReceipt = await mintTx.wait(...waitParams);
    const mintEvents = helper.eth.normalizeEvents(mintReceipt!);

    const tokenId = mintEvents.Transfer.args.tokenId;
    expect(tokenId).to.be.equal('1');

    if(propertyKey && propertyValue) {
      // Set URL or suffix
      await (await contract.setProperties.send(tokenId, [{key: propertyKey, value: Buffer.from(propertyValue)}])).wait(...waitParams);
    }

    const event = mintEvents.Transfer;
    expect(event.address).to.be.equal(collectionAddress);
    expect(event.args.from).to.be.equal('0x0000000000000000000000000000000000000000');
    expect(event.args.to).to.be.equal(receiver.address);
    expect(event.args.tokenId).to.be.equal(tokenId);

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
      await collection.addAdmin(minter, {Ethereum: collectionAdmin.address});

      const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
      const contract = await helper.ethNativeContract.collection(collectionAddress, 'nft', collectionAdmin, true);
      let expectedTokenId = await contract.nextTokenId.staticCall();

      const mintTx = await contract.mintCross.send(testCase === 'ethereum' ? receiverCrossEth : receiverCrossSub, []);
      const mintReceipt = await mintTx.wait(...waitParams);
      const mintEvents = helper.eth.normalizeEvents(mintReceipt!);

      let tokenId = mintEvents.Transfer.args.tokenId;
      expect(BigInt(tokenId)).to.be.equal(expectedTokenId);

      let event = mintEvents.Transfer;
      expect(event.address).to.be.equal(collectionAddress);
      expect(event.args.from).to.be.equal('0x0000000000000000000000000000000000000000');
      expect(event.args.to).to.be.equal(testCase === 'ethereum' ? receiverCrossEth.eth : helper.address.substrateToEth(receiverSub.address));
      expect(await contract.properties.staticCall(tokenId, [])).to.be.like([]);

      expectedTokenId = await contract.nextTokenId.staticCall();
      const mintTx2 = await contract.mintCross.send(testCase === 'ethereum' ? receiverCrossEth : receiverCrossSub, properties);
      const mintReceipt2 = await mintTx2.wait(...waitParams);
      const mintEvents2 = helper.eth.normalizeEvents(mintReceipt2!);

      event = mintEvents2.Transfer;
      expect(event.address).to.be.equal(collectionAddress);
      expect(event.args.from).to.be.equal('0x0000000000000000000000000000000000000000');
      expect(event.args.to).to.be.equal(testCase === 'ethereum' ? receiverEth.address : helper.address.substrateToEth(receiverSub.address));
      expect(await contract.properties.staticCall(tokenId, [])).to.be.like([]);

      tokenId = mintEvents2.Transfer.args.tokenId;

      expect(BigInt(tokenId)).to.be.equal(expectedTokenId);

      expect(await contract.properties.staticCall(tokenId, [])).to.be.like(properties
        .map(p => helper.ethProperty.property(p.key, p.value.toString())));

      expect(await helper.nft.getTokenOwner(collection.collectionId, Number(tokenId)))
        .to.deep.eq(testCase === 'ethereum' ? {Ethereum: receiverEth.address.toLowerCase()} : {Substrate: receiverSub.address});
    });
  });

  itEth('Non-owner and non admin cannot mintCross', async ({helper}) => {
    const nonOwner = await helper.eth.createAccountWithBalance(donor);
    const nonOwnerCross = helper.ethCrossAccount.fromAddress(nonOwner);

    const collection = await helper.nft.mintCollection(minter);
    const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    const collectionEvm = await helper.ethNativeContract.collection(collectionAddress, 'nft', nonOwner);

    await expect(collectionEvm.mintCross.staticCall(nonOwnerCross, []))
      .to.be.rejectedWith('PublicMintingNotAllowed');
  });

  //TODO: CORE-302 add eth methods
  itEth.skip('Can perform mintBulk()', async ({helper}) => {
    const caller = await helper.eth.createAccountWithBalance(donor);
    const receiver = helper.eth.createAccount();

    const collection = await helper.nft.mintCollection(minter);
    await collection.addAdmin(minter, {Ethereum: caller.address});

    const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = await helper.ethNativeContract.collection(collectionAddress, 'nft', caller);
    {
      const bulkSize = 3;

      const nextTokenId = await contract.nextTokenId.staticCall();
      expect(nextTokenId).to.be.equal(1n);

      const mintTx = await contract.mintBulkWithTokenURI.send(
        receiver,
        Array.from({length: bulkSize}, (_, i) => [nextTokenId + BigInt(i), `Test URI ${i}`]),
      );
      const mintReceipt = await mintTx.wait(...waitParams);
      const mintEvents = helper.eth.rebuildEvents(mintReceipt!);

      const events = mintEvents
        .filter((event) => event.event === 'Transfer')
        .sort((a, b) => +a.args.tokenId - +b.args.tokenId);

      for(let i = 0; i < bulkSize; i++) {
        const event = events[i];
        expect(event.address).to.equal(collectionAddress);
        expect(event.args.from).to.equal('0x0000000000000000000000000000000000000000');
        expect(event.args.to).to.equal(receiver);
        expect(event.args.tokenId).to.equal(`${nextTokenId + BigInt(i)}`);

        expect(await contract.tokenURI.staticCall(nextTokenId + BigInt(i))).to.be.equal(`Test URI ${i}`);
      }
    }
  });

  itEth('Can perform mintBulkCross()', async ({helper}) => {
    const caller = await helper.eth.createAccountWithBalance(donor);
    const callerCross = helper.ethCrossAccount.fromAddress(caller);
    const receiver = helper.eth.createAccount();
    const receiverCross = helper.ethCrossAccount.fromAddress(receiver);

    const permissions = [
      {code: TokenPermissionField.Mutable, value: true},
      {code: TokenPermissionField.TokenOwner, value: true},
      {code: TokenPermissionField.CollectionAdmin, value: true},
    ];
    const {collectionAddress} = await helper.eth.createCollection(
      caller,
      {
        ...CREATE_COLLECTION_DATA_DEFAULTS,
        name: 'A',
        description: 'B',
        tokenPrefix: 'C',
        collectionMode: 'nft',
        adminList: [callerCross],
        tokenPropertyPermissions: [
          {key: 'key_0_0', permissions},
          {key: 'key_1_0', permissions},
          {key: 'key_1_1', permissions},
          {key: 'key_2_0', permissions},
          {key: 'key_2_1', permissions},
          {key: 'key_2_2', permissions},
        ],
      },
    ).send();

    const contract = await helper.ethNativeContract.collection(collectionAddress, 'nft', caller);
    {
      const nextTokenId = await contract.nextTokenId.staticCall();
      expect(nextTokenId).to.be.equal(1n);

      const mintTx = await contract.mintBulkCross.send([
        {
          owner: receiverCross,
          properties: [
            {key: 'key_0_0', value: Buffer.from('value_0_0')},
          ],
        },
        {
          owner: receiverCross,
          properties: [
            {key: 'key_1_0', value: Buffer.from('value_1_0')},
            {key: 'key_1_1', value: Buffer.from('value_1_1')},
          ],
        },
        {
          owner: receiverCross,
          properties: [
            {key: 'key_2_0', value: Buffer.from('value_2_0')},
            {key: 'key_2_1', value: Buffer.from('value_2_1')},
            {key: 'key_2_2', value: Buffer.from('value_2_2')},
          ],
        },
      ]);
      const mintReceipt = await mintTx.wait(...waitParams);
      const mintEvents = helper.eth.rebuildEvents(mintReceipt!);

      const events = mintEvents
        .filter((event) => event.event === 'Transfer')
        .sort((a, b) => +a.args.tokenId - +b.args.tokenId);

      const bulkSize = 3;
      for(let i = 0; i < bulkSize; i++) {
        const event = events[i];
        expect(event.address).to.equal(collectionAddress);
        expect(event.args.from).to.equal('0x0000000000000000000000000000000000000000');
        expect(event.args.to).to.equal(receiver.address);
        expect(event.args.tokenId).to.equal(`${nextTokenId + BigInt(i)}`);
      }

      const properties = [
        await contract.properties.staticCall(nextTokenId, []),
        await contract.properties.staticCall(nextTokenId + 1n, []),
        await contract.properties.staticCall(nextTokenId + 2n, []),
      ];

      expect(properties).to.be.deep.equal([
        [
          ['key_0_0', hexlifyString('value_0_0')],
        ],
        [
          ['key_1_0', hexlifyString('value_1_0')],
          ['key_1_1', hexlifyString('value_1_1')],
        ],
        [
          ['key_2_0', hexlifyString('value_2_0')],
          ['key_2_1', hexlifyString('value_2_1')],
          ['key_2_2', hexlifyString('value_2_2')],
        ],
      ]);
    }
  });

  itEth('Can perform burn()', async ({helper}) => {
    const caller = await helper.eth.createAccountWithBalance(donor);

    const collection = await helper.nft.mintCollection(minter, {});
    const {tokenId} = await collection.mintToken(minter, {Ethereum: caller.address});

    const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = await helper.ethNativeContract.collection(collectionAddress, 'nft', caller);

    {
      const burnTx = await contract.burn.send(tokenId);
      const burnReceipt = await burnTx.wait(...waitParams);
      const burnEvents = helper.eth.normalizeEvents(burnReceipt!);

      const event = burnEvents.Transfer;
      expect(event.address).to.be.equal(collectionAddress);
      expect(event.args.from).to.be.equal(caller.address);
      expect(event.args.to).to.be.equal('0x0000000000000000000000000000000000000000');
      expect(event.args.tokenId).to.be.equal(`${tokenId}`);
    }
  });

  itEth('Can perform approve()', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const spender = helper.eth.createAccount();

    const collection = await helper.nft.mintCollection(minter, {});
    const {tokenId} = await collection.mintToken(minter, {Ethereum: owner.address});

    const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = await helper.ethNativeContract.collection(collectionAddress, 'nft', owner);

    {
      const badTokenId = await contract.nextTokenId.staticCall() + 1n;
      await expect(contract.getApproved.staticCall(badTokenId))
        .to.be.rejectedWith('execution reverted: "TokenNotFound"');
    }
    {
      const approved = await contract.getApproved.staticCall(tokenId);
      expect(approved).to.be.equal('0x0000000000000000000000000000000000000000');
    }
    {
      const approveTx = await contract.approve.send(spender.address, tokenId);
      const approveReceipt = await approveTx.wait(...waitParams);
      const approveEvents = helper.eth.normalizeEvents(approveReceipt!);

      const event = approveEvents.Approval;
      expect(event.address).to.be.equal(collectionAddress);
      expect(event.args.owner).to.be.equal(owner.address);
      expect(event.args.approved).to.be.equal(spender.address);
      expect(event.args.tokenId).to.be.equal(`${tokenId}`);
    }
    {
      const approved = await contract.getApproved.staticCall(tokenId);
      expect(approved).to.be.equal(spender.address);
    }
  });

  itEth('Can perform setApprovalForAll()', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const operator = helper.eth.createAccount();

    const collection = await helper.nft.mintCollection(minter, {});

    const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = await helper.ethNativeContract.collection(collectionAddress, 'nft', owner);

    const approvedBefore = await contract.isApprovedForAll.staticCall(owner, operator);
    expect(approvedBefore).to.be.equal(false);

    {
      const approvalTx = await contract.setApprovalForAll.send(operator, true);
      const approvalReceipt = await approvalTx.wait(...waitParams);
      const approvalEvents = helper.eth.normalizeEvents(approvalReceipt!);

      expect(approvalEvents.ApprovalForAll).to.be.like({
        address: collectionAddress,
        event: 'ApprovalForAll',
        args: {
          owner: owner.address,
          operator: operator.address,
          approved: 'true',
        },
      });

      const approvedAfter = await contract.isApprovedForAll.staticCall(owner, operator);
      expect(approvedAfter).to.be.equal(true);
    }

    {
      const approvalTx = await contract.setApprovalForAll.send(operator, false);
      const approvalReceipt = await approvalTx.wait(...waitParams);
      const approvalEvents = helper.eth.normalizeEvents(approvalReceipt!);

      expect(approvalEvents.ApprovalForAll).to.be.like({
        address: collectionAddress,
        event: 'ApprovalForAll',
        args: {
          owner: owner.address,
          operator: operator.address,
          approved: 'false',
        },
      });

      const approvedAfter = await contract.isApprovedForAll.staticCall(owner, operator);
      expect(approvedAfter).to.be.equal(false);
    }
  });

  itEth('Can perform burn with ApprovalForAll', async ({helper}) => {
    const collection = await helper.nft.mintCollection(minter, {name: 'A', description: 'B', tokenPrefix: 'C'});

    const owner = await helper.eth.createAccountWithBalance(donor);
    const operator = await helper.eth.createAccountWithBalance(donor);

    const token = await collection.mintToken(minter, {Ethereum: owner.address});

    const address = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = await helper.ethNativeContract.collection(address, 'nft', owner);

    {
      await (await contract.setApprovalForAll.send(operator, true)).wait(...waitParams);

      const ownerCross = helper.ethCrossAccount.fromAddress(owner);
      const burnTx = await (<Contract>contract.connect(operator)).burnFromCross.send(ownerCross, token.tokenId);
      const burnReceipt = await burnTx.wait(...waitParams);
      const burnEvents = helper.eth.normalizeEvents(burnReceipt!);

      expect(burnEvents.Transfer).to.be.like({
        address,
        event: 'Transfer',
        args: {
          from: owner.address,
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

    const token = await collection.mintToken(minter, {Ethereum: owner.address});

    const address = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = await helper.ethNativeContract.collection(address, 'nft', owner);

    {
      await (await contract.setApprovalForAll.send(operator.address, true)).wait(...waitParams);

      const ownerCross = helper.ethCrossAccount.fromAddress(owner);
      const recieverCross = helper.ethCrossAccount.fromKeyringPair(receiver);

      const transferTx = await (<Contract>contract.connect(operator)).transferFromCross.send(ownerCross, recieverCross, token.tokenId);
      const transferReceipt = await transferTx.wait(...waitParams);
      const transferEvents = helper.eth.normalizeEvents(transferReceipt!);

      expect(transferEvents.Transfer).to.be.like({
        address: helper.ethAddress.fromCollectionId(collection.collectionId),
        event: 'Transfer',
        args: {
          from: owner.address,
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
    const token2 = await collection.mintToken(minter, {Ethereum: ownerEth.address});

    const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    const collectionEvm = await helper.ethNativeContract.collection(collectionAddress, 'nft', ownerEth);

    // Approve tokens from substrate and ethereum:
    await token1.approve(ownerSub, {Ethereum: burnerEth.address});
    await (await collectionEvm.approveCross.send(burnerCrossEth, token2.tokenId)).wait(...waitParams);

    // can burnFromCross:
    const burnTx1 = await (<Contract>collectionEvm.connect(burnerEth)).burnFromCross.send(ownerCrossSub, token1.tokenId);
    const burnReceipt1 = await burnTx1.wait(...waitParams);
    const burnEvents1 = helper.eth.normalizeEvents(burnReceipt1!);

    const burnTx2 = await (<Contract>collectionEvm.connect(burnerEth)).burnFromCross.send(ownerCrossEth, token2.tokenId);
    const burnReceipt2 = await burnTx2.wait(...waitParams);
    const burnEvents2 = helper.eth.normalizeEvents(burnReceipt2!);

    // Check events for burnFromCross (substrate and ethereum):
    [
      [burnEvents1, token1, helper.address.substrateToEth(ownerSub.address)],
      [burnEvents2, token2, ownerEth.address],
    ].map(burnData => {
      expect(burnData[0]).to.be.like({
        'Transfer': {
          address: collectionAddress,
          event: 'Transfer',
          args: {
            from: burnData[2],
            to: '0x0000000000000000000000000000000000000000',
            tokenId: (<any>burnData[1]).tokenId.toString(),
          },
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
    const receiverCrossSub = helper.ethCrossAccount.fromKeyringPair(receiverSub);
    const receiverEth = await helper.eth.createAccountWithBalance(donor);
    const receiverCrossEth = helper.ethCrossAccount.fromAddress(receiverEth);

    // arrange: create collection and tokens:
    const collection = await helper.nft.mintCollection(minter, {name: 'A', description: 'B', tokenPrefix: 'C'});
    const token1 = await collection.mintToken(minter, {Ethereum: owner.address});
    const token2 = await collection.mintToken(minter, {Ethereum: owner.address});

    const collectionEvm = await helper.ethNativeContract.collection(helper.ethAddress.fromCollectionId(collection.collectionId), 'nft', owner);

    // Can approveCross substrate and ethereum address:
    const approveTxSub = await collectionEvm.approveCross.send(receiverCrossSub, token1.tokenId);
    const approveReceiptSub = await approveTxSub.wait(...waitParams);
    const approveEventsSub = helper.eth.normalizeEvents(approveReceiptSub!);

    const approveTxEth = await collectionEvm.approveCross.send(receiverCrossEth, token2.tokenId);
    const approveReceiptEth = await approveTxEth.wait(...waitParams);
    const approveEventsEth = helper.eth.normalizeEvents(approveReceiptEth!);

    expect(approveEventsSub.Approval).to.be.like({
      address: helper.ethAddress.fromCollectionId(collection.collectionId),
      event: 'Approval',
      args: {
        owner: owner.address,
        approved: helper.address.substrateToEth(receiverSub.address),
        tokenId: token1.tokenId.toString(),
      },
    });

    expect(approveEventsEth.Approval).to.be.like({
      address: helper.ethAddress.fromCollectionId(collection.collectionId),
      event: 'Approval',
      args: {
        owner: owner.address,
        approved: receiverEth.address,
        tokenId: token2.tokenId.toString(),
      },
    });

    // Substrate address can transferFrom approved tokens:
    await helper.nft.transferTokenFrom(receiverSub, collection.collectionId, token1.tokenId, {Ethereum: owner.address}, {Substrate: receiverSub.address});
    expect(await helper.nft.getTokenOwner(collection.collectionId, token1.tokenId)).to.deep.eq({Substrate: receiverSub.address});

    // Ethereum address can transferFromCross approved tokens:
    await (await (<Contract>collectionEvm.connect(receiverEth)).transferFromCross.send(ownerCross, receiverCrossEth, token2.tokenId)).wait(...waitParams);
    expect(await helper.nft.getTokenOwner(collection.collectionId, token2.tokenId)).to.deep.eq({Ethereum: receiverEth.address.toLowerCase()});
  });

  itEth('Non-owner and non admin cannot approveCross', async ({helper}) => {
    const nonOwner = await helper.eth.createAccountWithBalance(donor);
    const nonOwnerCross = helper.ethCrossAccount.fromAddress(nonOwner);
    const owner = await helper.eth.createAccountWithBalance(donor);
    const collection = await helper.nft.mintCollection(minter, {name: 'A', description: 'B', tokenPrefix: 'C'});
    const token = await collection.mintToken(minter, {Ethereum: owner.address});

    const collectionEvm = await helper.ethNativeContract.collection(helper.ethAddress.fromCollectionId(collection.collectionId), 'nft', nonOwner);
    await expect(collectionEvm.approveCross.staticCall(nonOwnerCross, token.tokenId))
      .to.be.rejectedWith('CantApproveMoreThanOwned');
  });

  itEth('Can reaffirm approved address', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const ownerCrossEth = helper.ethCrossAccount.fromAddress(owner);
    const [receiver1, receiver2] = await helper.arrange.createAccounts([100n, 100n], donor);
    const receiver1Cross = helper.ethCrossAccount.fromKeyringPair(receiver1);
    const receiver2Cross = helper.ethCrossAccount.fromKeyringPair(receiver2);
    const collection = await helper.nft.mintCollection(minter, {name: 'A', description: 'B', tokenPrefix: 'C'});
    const token1 = await collection.mintToken(minter, {Ethereum: owner.address});
    const token2 = await collection.mintToken(minter, {Ethereum: owner.address});
    const collectionEvm = await helper.ethNativeContract.collection(helper.ethAddress.fromCollectionId(collection.collectionId), 'nft', owner);

    // Can approve and reaffirm approved address:
    await (await collectionEvm.approveCross.send(receiver1Cross, token1.tokenId)).wait(...waitParams);
    await (await collectionEvm.approveCross.send(receiver2Cross, token1.tokenId)).wait(...waitParams);

    // receiver1 cannot transferFrom:
    await expect(helper.nft.transferTokenFrom(receiver1, collection.collectionId, token1.tokenId, {Ethereum: owner.address}, {Substrate: receiver1.address})).to.be.rejected;
    // receiver2 can transferFrom:
    await helper.nft.transferTokenFrom(receiver2, collection.collectionId, token1.tokenId, {Ethereum: owner.address}, {Substrate: receiver2.address});

    // can set approved address to self address to remove approval:
    await (await collectionEvm.approveCross.send(receiver1Cross, token2.tokenId)).wait(...waitParams);
    await (await collectionEvm.approveCross.send(ownerCrossEth, token2.tokenId)).wait(...waitParams);

    // receiver1 cannot transfer token anymore:
    await expect(helper.nft.transferTokenFrom(receiver1, collection.collectionId, token2.tokenId, {Ethereum: owner.address}, {Substrate: receiver1.address})).to.be.rejected;
  });

  itEth('Can perform transferFrom()', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const spender = await helper.eth.createAccountWithBalance(donor);
    const receiver = helper.eth.createAccount();

    const collection = await helper.nft.mintCollection(minter, {});
    const {tokenId} = await collection.mintToken(minter, {Ethereum: owner.address});

    const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = await helper.ethNativeContract.collection(collectionAddress, 'nft', owner);

    await (await contract.approve.send(spender.address, tokenId)).wait(...waitParams);

    {
      const transferTx = await (<Contract>contract.connect(spender)).transferFrom.send(owner.address, receiver.address, tokenId);
      const transferReceipt = await transferTx.wait(...waitParams);
      const transferEvents = helper.eth.normalizeEvents(transferReceipt!);

      const event = transferEvents.Transfer;
      expect(event.address).to.be.equal(collectionAddress);
      expect(event.args.from).to.be.equal(owner.address);
      expect(event.args.to).to.be.equal(receiver.address);
      expect(event.args.tokenId).to.be.equal(`${tokenId}`);
    }

    {
      const balance = await contract.balanceOf.staticCall(receiver.address);
      expect(balance).to.equal(1n);
    }

    {
      const balance = await contract.balanceOf.staticCall(owner.address);
      expect(balance).to.equal(0n);
    }
  });

  itEth('Can perform transferFromCross()', async ({helper}) => {
    const collection = await helper.nft.mintCollection(minter, {name: 'A', description: 'B', tokenPrefix: 'C'});

    const [owner, receiver] = await helper.arrange.createAccounts([100n, 100n], donor);
    const spender = await helper.eth.createAccountWithBalance(donor);

    const token = await collection.mintToken(minter, {Substrate: owner.address});

    const address = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = await helper.ethNativeContract.collection(address, 'nft', spender);

    await token.approve(owner, {Ethereum: spender.address});

    {
      const ownerCross = helper.ethCrossAccount.fromKeyringPair(owner);
      const recieverCross = helper.ethCrossAccount.fromKeyringPair(receiver);

      const transferTx = await contract.transferFromCross.send(ownerCross, recieverCross, token.tokenId);
      const transferReceipt = await transferTx.wait(...waitParams);
      const transferEvents = helper.eth.normalizeEvents(transferReceipt!);

      expect(transferEvents.Transfer).to.be.like({
        address: helper.ethAddress.fromCollectionId(collection.collectionId),
        event: 'Transfer',
        args: {
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

    const {tokenId} = await collection.mintToken(minter, {Ethereum: owner.address});

    const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = await helper.ethNativeContract.collection(collectionAddress, 'nft', owner);

    {
      const transferTx = await contract.transfer.send(receiver, tokenId);
      const transferReceipt = await transferTx.wait(...waitParams);
      const transferEvents = helper.eth.normalizeEvents(transferReceipt!);

      const event = transferEvents.Transfer;
      expect(event.address).to.be.equal(collectionAddress);
      expect(event.args.from).to.be.equal(owner.address);
      expect(event.args.to).to.be.equal(receiver.address);
      expect(event.args.tokenId).to.be.equal(`${tokenId}`);
    }

    {
      const balance = await contract.balanceOf.staticCall(owner);
      expect(balance).to.equal(0n);
    }

    {
      const balance = await contract.balanceOf.staticCall(receiver);
      expect(balance).to.equal(1n);
    }
  });

  itEth('Can perform transferCross()', async ({helper}) => {
    const collection = await helper.nft.mintCollection(minter, {});
    const owner = await helper.eth.createAccountWithBalance(donor);
    const receiverEth = await helper.eth.createAccountWithBalance(donor);
    const receiverCrossEth = helper.ethCrossAccount.fromAddress(receiverEth);
    const receiverCrossSub = helper.ethCrossAccount.fromKeyringPair(minter);

    const {tokenId} = await collection.mintToken(minter, {Ethereum: owner.address});

    const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    const collectionEvm = await helper.ethNativeContract.collection(collectionAddress, 'nft', owner);

    {
      const transferTx = await collectionEvm.transferCross.send(receiverCrossEth, tokenId);
      const transferReceipt = await transferTx.wait(...waitParams);
      const transferEvents = helper.eth.normalizeEvents(transferReceipt!);

      const event = transferEvents.Transfer;
      expect(event.address).to.be.equal(collectionAddress);
      expect(event.args.from).to.be.equal(owner.address);
      expect(event.args.to).to.be.equal(receiverEth.address);
      expect(event.args.tokenId).to.be.equal(`${tokenId}`);

      const ownerBalance = await collectionEvm.balanceOf.staticCall(owner.address);
      expect(ownerBalance).to.equal(0n);

      const receiverBalance = await collectionEvm.balanceOf.staticCall(receiverEth.address);
      expect(receiverBalance).to.equal(1n);
      expect(await helper.nft.getTokenOwner(collection.collectionId, tokenId))
        .to.deep.eq({Ethereum: receiverEth.address.toLowerCase()});
    }

    {
      const transferTx = await (<Contract>collectionEvm.connect(receiverEth)).transferCross.send(receiverCrossSub, tokenId);
      const transferReceipt = await transferTx.wait(...waitParams);
      const transferEvents = helper.eth.normalizeEvents(transferReceipt!);

      const event = transferEvents.Transfer;
      expect(event.address).to.be.equal(collectionAddress);
      expect(event.args.from).to.be.equal(receiverEth.address);
      expect(event.args.to).to.be.equal(helper.address.substrateToEth(minter.address));
      expect(event.args.tokenId).to.be.equal(`${tokenId}`);

      const ownerBalance = await collectionEvm.balanceOf.staticCall(receiverEth.address);
      expect(ownerBalance).to.equal(0n);

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

    await collection.mintToken(minter, {Ethereum: sender.address});
    const nonSendersToken = await collection.mintToken(minter, {Ethereum: tokenOwner.address});

    // Cannot transferCross someone else's token:
    const receiver = testCase === 'transfer' ? helper.address.substrateToEth(receiverSub.address) : receiverCrossSub;
    await expect((<Contract>collectionEvm.connect(sender))[testCase].send(receiver, nonSendersToken.tokenId)).to.be.rejected;
    // Cannot transfer token if it does not exist:
    await expect((<Contract>collectionEvm.connect(sender))[testCase].send(receiver, 999999)).to.be.rejected;
  }));

  itEth('Check balanceOfCross()', async ({helper}) => {
    const collection = await helper.nft.mintCollection(minter, {});

    const owner = await helper.eth.createAccountWithBalance(donor, 100n);
    const ownerCross = helper.ethCrossAccount.fromAddr(owner);

    const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    const collectionEvm = await helper.ethNativeContract.collection(collectionAddress, 'nft', owner);

    expect(await collectionEvm.balanceOfCross.staticCall(ownerCross)).to.be.eq(0n);

    for(let i = 1n; i < 10n; i++) {
      await collection.mintToken(minter, {Ethereum: owner.address});
      expect(await collectionEvm.balanceOfCross.staticCall(ownerCross)).to.be.eq(i);
    }
  });

  itEth('Check ownerOfCross()', async ({helper}) => {
    const collection = await helper.nft.mintCollection(minter, {});

    let owner = await helper.eth.createAccountWithBalance(donor, 100n);
    let ownerCross = helper.ethCrossAccount.fromAddress(owner);

    const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    let collectionEvm = await helper.ethNativeContract.collection(collectionAddress, 'nft', owner);

    const {tokenId} = await collection.mintToken(minter, {Ethereum: owner.address});

    for(let i = 1n; i < 10n; i++) {
      const ownerOfCross = await collectionEvm.ownerOfCross.staticCall(tokenId);
      expect(ownerCross.eth).to.be.eq(ownerOfCross.eth);
      expect(ownerCross.sub).to.be.eq(ownerOfCross.sub.toString());

      const newOwner = await helper.eth.createAccountWithBalance(donor, 100n);
      const newOwnerCross = helper.ethCrossAccount.fromAddress(newOwner.address);

      await (await collectionEvm.transferCross.send(newOwnerCross, tokenId)).wait(...waitParams);
      collectionEvm = helper.eth.changeContractCaller(collectionEvm, newOwner);

      owner = newOwner;
      ownerCross = newOwnerCross;
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
    const {tokenId} = await collection.mintToken(alice, {Ethereum: owner.address});

    const contract = await helper.ethNativeContract.collectionById(collection.collectionId, 'nft', owner);

    const cost = await helper.eth.recordCallFee(owner.address, async () => await (await contract.approve.send(spender.address, tokenId)).wait(...waitParams));
    expect(cost < BigInt(0.2 * Number(helper.balance.getOneTokenNominal())));
  });

  itEth('transferFrom() call fee is less than 0.2UNQ', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const spender = await helper.eth.createAccountWithBalance(donor);

    const collection = await helper.nft.mintCollection(alice, {});
    const {tokenId} = await collection.mintToken(alice, {Ethereum: owner.address});

    const contract = await helper.ethNativeContract.collectionById(collection.collectionId, 'nft', owner);

    await (await contract.approve.send(spender.address, tokenId)).wait(...waitParams);

    const cost = await helper.eth.recordCallFee(
      spender.address,
      async () => await (await (<Contract>contract.connect(spender)).transferFrom.send(owner.address, spender.address, tokenId)).wait(...waitParams),
    );
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
    const contract = await helper.ethNativeContract.collection(address, 'nft', spender);

    await token.approve(owner, {Ethereum: spender.address});

    {
      const ownerCross = helper.ethCrossAccount.fromKeyringPair(owner);
      const recieverCross = helper.ethCrossAccount.fromKeyringPair(receiver);

      const transferTx = await contract.transferFromCross.send(ownerCross, recieverCross, token.tokenId);
      const transferReceipt = await transferTx.wait(...waitParams);
      const transferEvents = helper.eth.normalizeEvents(transferReceipt!);

      expect(transferEvents.Transfer).to.be.like({
        address: helper.ethAddress.fromCollectionId(collection.collectionId),
        event: 'Transfer',
        args: {
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
    const {tokenId} = await collection.mintToken(alice, {Ethereum: owner.address});

    const contract = await helper.ethNativeContract.collectionById(collection.collectionId, 'nft', owner);

    const cost = await helper.eth.recordCallFee(
      owner.address,
      async () => await (await contract.transfer.send(receiver.address, tokenId)).wait(...waitParams),
    );
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

  itEth.skip('Events emitted for mint()', async ({helper}) => {
    // TODO: Refactor this
    // const collection = await helper.nft.mintCollection(alice, {});
    // const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    // const contract = await helper.ethNativeContract.collection(collectionAddress, 'nft');

    // const events: any = [];
    // contract.events.allEvents((_: any, event: any) => {
    //   events.push(event);
    // });

    // const {tokenId} = await collection.mintToken(alice);
    // if(events.length == 0) await helper.wait.newBlocks(1);
    // const event = events[0];

    // expect(event.event).to.be.equal('Transfer');
    // expect(event.address).to.be.equal(collectionAddress);
    // expect(event.args.from).to.be.equal('0x0000000000000000000000000000000000000000');
    // expect(event.args.to).to.be.equal(helper.address.substrateToEth(alice.address));
    // expect(event.args.tokenId).to.be.equal(tokenId.toString());
  });

  itEth.skip('Events emitted for burn()', async ({helper}) => {
    // TODO: Refactor this
    // const collection = await helper.nft.mintCollection(alice, {});
    // const token = await collection.mintToken(alice);

    // const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    // const contract = await helper.ethNativeContract.collection(collectionAddress, 'nft');

    // const events: any = [];
    // contract.events.allEvents((_: any, event: any) => {
    //   events.push(event);
    // });

    // await token.burn(alice);
    // if(events.length == 0) await helper.wait.newBlocks(1);
    // const event = events[0];

    // expect(event.event).to.be.equal('Transfer');
    // expect(event.address).to.be.equal(collectionAddress);
    // expect(event.args.from).to.be.equal(helper.address.substrateToEth(alice.address));
    // expect(event.args.to).to.be.equal('0x0000000000000000000000000000000000000000');
    // expect(event.args.tokenId).to.be.equal(token.tokenId.toString());
  });

  itEth.skip('Events emitted for approve()', async ({helper}) => {
    // TODO: Refactor this
    // const receiver = helper.eth.createAccount();

    // const collection = await helper.nft.mintCollection(alice, {});
    // const token = await collection.mintToken(alice);

    // const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    // const contract = await helper.ethNativeContract.collection(collectionAddress, 'nft');

    // const events: any = [];
    // contract.events.allEvents((_: any, event: any) => {
    //   events.push(event);
    // });

    // await token.approve(alice, {Ethereum: receiver.address});
    // if(events.length == 0) await helper.wait.newBlocks(1);
    // const event = events[0];

    // expect(event.event).to.be.equal('Approval');
    // expect(event.address).to.be.equal(collectionAddress);
    // expect(event.args.owner).to.be.equal(helper.address.substrateToEth(alice.address));
    // expect(event.args.approved).to.be.equal(receiver);
    // expect(event.args.tokenId).to.be.equal(token.tokenId.toString());
  });

  itEth.skip('Events emitted for transferFrom()', async ({helper}) => {
    // TODO: Refactor this
    // const [bob] = await helper.arrange.createAccounts([10n], donor);
    // const receiver = helper.eth.createAccount();

    // const collection = await helper.nft.mintCollection(alice, {});
    // const token = await collection.mintToken(alice);
    // await token.approve(alice, {Substrate: bob.address});

    // const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    // const contract = await helper.ethNativeContract.collection(collectionAddress, 'nft');

    // const events: any = [];
    // contract.events.allEvents((_: any, event: any) => {
    //   events.push(event);
    // });

    // await token.transferFrom(bob, {Substrate: alice.address}, {Ethereum: receiver.address});

    // if(events.length == 0) await helper.wait.newBlocks(1);
    // const event = events[0];

    // expect(event.address).to.be.equal(collectionAddress);
    // expect(event.args.from).to.be.equal(helper.address.substrateToEth(alice.address));
    // expect(event.args.to).to.be.equal(receiver);
    // expect(event.args.tokenId).to.be.equal(`${token.tokenId}`);
  });

  itEth.skip('Events emitted for transfer()', async ({helper}) => {
    // TODO: Refactor this
    // const receiver = helper.eth.createAccount();

    // const collection = await helper.nft.mintCollection(alice, {});
    // const token = await collection.mintToken(alice);

    // const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    // const contract = await helper.ethNativeContract.collection(collectionAddress, 'nft');

    // const events: any = [];
    // contract.events.allEvents((_: any, event: any) => {
    //   events.push(event);
    // });

    // await token.transfer(alice, {Ethereum: receiver.address});

    // if(events.length == 0) await helper.wait.newBlocks(1);
    // const event = events[0];

    // expect(event.address).to.be.equal(collectionAddress);
    // expect(event.args.from).to.be.equal(helper.address.substrateToEth(alice.address));
    // expect(event.args.to).to.be.equal(receiver);
    // expect(event.args.tokenId).to.be.equal(`${token.tokenId}`);
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
    const caller = helper.eth.createAccount();
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
    const name = await contract.name.staticCall();
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
    const symbol = await contract.symbol.staticCall();
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

    const token = await collection.mintToken(minter, {Ethereum: owner.address});

    const address = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = await helper.ethNativeContract.collection(address, 'nft', spender);

    const ownerCross = helper.ethCrossAccount.fromAddress(owner);
    await expect(contract.burnFromCross.send(ownerCross, token.tokenId)).to.be.rejected;

    await (await contract.setApprovalForAll.send(spender, true)).wait(...waitParams);
    await (await contract.setApprovalForAll.send(spender, false)).wait(...waitParams);

    await expect(contract.burnFromCross.send(ownerCross, token.tokenId)).to.be.rejected;
  });

  itEth('[negative] Cant perform transfer without approval', async ({helper}) => {
    const collection = await helper.nft.mintCollection(minter, {name: 'A', description: 'B', tokenPrefix: 'C'});
    const receiver = alice;

    const owner = await helper.eth.createAccountWithBalance(donor);
    const spender = await helper.eth.createAccountWithBalance(donor);

    const token = await collection.mintToken(minter, {Ethereum: owner.address});

    const address = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = await helper.ethNativeContract.collection(address, 'nft', spender);

    const ownerCross = helper.ethCrossAccount.fromAddress(owner);
    const recieverCross = helper.ethCrossAccount.fromKeyringPair(receiver);

    await expect(contract.transferFromCross.send(ownerCross, recieverCross, token.tokenId)).to.be.rejected;

    await (await contract.setApprovalForAll.send(spender, true)).wait(...waitParams);
    await (await contract.setApprovalForAll.send(spender, false)).wait(...waitParams);

    await expect(contract.transferFromCross.send(ownerCross, recieverCross, token.tokenId)).to.be.rejected;
  });
});
