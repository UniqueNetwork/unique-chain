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
import {confirmations, expect, itEth, usingEthPlaygrounds} from '@unique/test-utils/eth/util.js';
import type {IKeyringPair} from '@polkadot/types/types';
import type {ITokenPropertyPermission} from '@unique-nft/playgrounds/types.js';
import {CREATE_COLLECTION_DATA_DEFAULTS, NormalizedEvent, TokenPermissionField} from '@unique/test-utils/eth/types.js';
import {hexlify} from 'ethers';

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

      const properties = Array(5).fill(0).map((_, i) => ({key: `key_${i}`, value: Buffer.from(`value_${i}`)}));
      const permissions: ITokenPropertyPermission[] = properties.map(p => ({key: p.key, permission: {
        tokenOwner: false,
        collectionAdmin: true,
        mutable: false}}));


      const collection = await helper.rft.mintCollection(minter, {
        tokenPrefix: 'ethp',
        tokenPropertyPermissions: permissions,
      });
      await collection.addAdmin(minter, {Ethereum: collectionAdmin.address});

      const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
      const contract = await helper.ethNativeContract.collection(collectionAddress, 'rft', collectionAdmin, true);
      let expectedTokenId = await contract.nextTokenId.staticCall();
      let result = await (await contract.mintCross.send(testCase === 'ethereum' ? receiverCrossEth : receiverCrossSub, [])).wait(confirmations);
      let tokenId = helper.eth.normalizeEvents(result!).Transfer.args.tokenId;
      expect(tokenId).to.be.equal(expectedTokenId);

      let event = helper.eth.normalizeEvents(result!).Transfer;
      expect(event.address).to.be.equal(collectionAddress);
      expect(event.args.from).to.be.equal('0x0000000000000000000000000000000000000000');
      expect(event.args.to).to.be.equal(testCase === 'ethereum' ? receiverEth : helper.address.substrateToEth(bob.address));
      expect(await contract.properties.staticCall(tokenId, [])).to.be.like([]);

      expectedTokenId = await contract.nextTokenId.staticCall();
      result = await (await contract.mintCross.send(testCase === 'ethereum' ? receiverCrossEth : receiverCrossSub, properties)).wait(confirmations);
      event = helper.eth.normalizeEvents(result!).Transfer;
      expect(event.address).to.be.equal(collectionAddress);
      expect(event.args.from).to.be.equal('0x0000000000000000000000000000000000000000');
      expect(event.args.to).to.be.equal(testCase === 'ethereum' ? receiverEth : helper.address.substrateToEth(bob.address));
      expect(await contract.properties.staticCall(tokenId, [])).to.be.like([]);

      tokenId = helper.eth.normalizeEvents(result!).Transfer.args.tokenId;

      expect(tokenId).to.be.equal(expectedTokenId);

      expect(await contract.properties.staticCall(tokenId, [])).to.be.like(properties
        .map(p => helper.ethProperty.property(p.key, p.value.toString())));

      expect(await helper.nft.getTokenOwner(collection.collectionId, +tokenId))
        .to.deep.eq(testCase === 'ethereum' ? {Ethereum: receiverEth.address.toLowerCase()} : {Substrate: receiverSub.address});
    });
  });

  itEth.skip('Can perform mintBulk()', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const receiver = helper.eth.createAccount();
    const {collectionAddress} = await helper.eth.createERC721MetadataCompatibleRFTCollection(owner, 'MintBulky', '6', '6', '');
    const contract = await helper.ethNativeContract.collection(collectionAddress, 'rft', owner);

    {
      const nextTokenId = await contract.nextTokenId.staticCall();
      expect(nextTokenId).to.be.equal('1');
      const result = await (
        await contract.mintBulkWithTokenURI.send(
          receiver,
          [
            [nextTokenId, 'Test URI 0'],
            [+nextTokenId + 1, 'Test URI 1'],
            [+nextTokenId + 2, 'Test URI 2'],
          ],
        )
      ).wait(confirmations);

      const events = helper.eth.rebuildEvents(result!);
      for(let i = 0; i < 2; i++) {
        const event = events[i];
        if(event.event !== 'Transfer') continue;
        expect(event.address).to.equal(collectionAddress);
        expect(event.args.from).to.equal('0x0000000000000000000000000000000000000000');
        expect(event.args.to).to.equal(receiver);
        expect(event.args.tokenId).to.equal(String(+nextTokenId + i));
      }

      expect(await contract.tokenURI.staticCall(nextTokenId)).to.be.equal('Test URI 0');
      expect(await contract.tokenURI.staticCall(+nextTokenId + 1)).to.be.equal('Test URI 1');
      expect(await contract.tokenURI.staticCall(+nextTokenId + 2)).to.be.equal('Test URI 2');
    }
  });

  itEth('Can perform mintBulkCross() with multiple tokens', async ({helper}) => {
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
        collectionMode: 'rft',
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

    const contract = await helper.ethNativeContract.collection(collectionAddress, 'rft', caller);
    const nextTokenId = await contract.nextTokenId.staticCall();
    expect(nextTokenId).to.be.equal('1');
    const result = await (await contract.mintBulkCross.send([
      {
        owners: [{
          owner: receiverCross,
          pieces: 1,
        }],
        properties: [
          {key: 'key_0_0', value: Buffer.from('value_0_0')},
        ],
      },
      {
        owners: [{
          owner: receiverCross,
          pieces: 2,
        }],
        properties: [
          {key: 'key_1_0', value: Buffer.from('value_1_0')},
          {key: 'key_1_1', value: Buffer.from('value_1_1')},
        ],
      },
      {
        owners: [{
          owner: receiverCross,
          pieces: 1,
        }],
        properties: [
          {key: 'key_2_0', value: Buffer.from('value_2_0')},
          {key: 'key_2_1', value: Buffer.from('value_2_1')},
          {key: 'key_2_2', value: Buffer.from('value_2_2')},
        ],
      },
    ], {from: caller})).wait(confirmations);
    const events = helper.eth.rebuildEvents(result!)
      .filter((event: NormalizedEvent) => event.event === 'Transfer')
      .sort((a: any, b: any) => +a.args.tokenId - b.args.tokenId);
    const bulkSize = 3;
    for(let i = 0; i < bulkSize; i++) {
      const event = events[i];
      expect(event.address).to.equal(collectionAddress);
      expect(event.args.from).to.equal('0x0000000000000000000000000000000000000000');
      expect(event.args.to).to.equal(receiver);
      expect(event.args.tokenId).to.equal(`${+nextTokenId + i}`);
    }

    const properties = [
      await contract.properties.staticCall(+nextTokenId, []),
      await contract.properties.staticCall(+nextTokenId + 1, []),
      await contract.properties.staticCall(+nextTokenId + 2, []),
    ];
    expect(properties).to.be.deep.equal([
      [
        ['key_0_0', hexlify('value_0_0')],
      ],
      [
        ['key_1_0', hexlify('value_1_0')],
        ['key_1_1', hexlify('value_1_1')],
      ],
      [
        ['key_2_0', hexlify('value_2_0')],
        ['key_2_1', hexlify('value_2_1')],
        ['key_2_2', hexlify('value_2_2')],
      ],
    ]);
  });

  itEth('Can perform mintBulkCross() with multiple owners', async ({helper}) => {
    const caller = await helper.eth.createAccountWithBalance(donor);
    const callerCross = helper.ethCrossAccount.fromAddress(caller);
    const receiver = helper.eth.createAccount();
    const receiverCross = helper.ethCrossAccount.fromAddress(receiver);
    const receiver2 = helper.eth.createAccount();
    const receiver2Cross = helper.ethCrossAccount.fromAddress(receiver2);

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
        collectionMode: 'rft',
        adminList: [callerCross],
        tokenPropertyPermissions: [
          {key: 'key_2_0', permissions},
          {key: 'key_2_1', permissions},
          {key: 'key_2_2', permissions},
        ],
      },
    ).send();

    const contract = await helper.ethNativeContract.collection(collectionAddress, 'rft', caller);
    const nextTokenId = await contract.nextTokenId.staticCall();
    expect(nextTokenId).to.be.equal('1');
    const result = await (await contract.mintBulkCross.send([{
      owners: [
        {
          owner: receiverCross,
          pieces: 1,
        },
        {
          owner: receiver2Cross,
          pieces: 2,
        },
      ],
      properties: [
        {key: 'key_2_0', value: Buffer.from('value_2_0')},
        {key: 'key_2_1', value: Buffer.from('value_2_1')},
        {key: 'key_2_2', value: Buffer.from('value_2_2')},
      ],
    }], {from: caller})).wait(confirmations);
    const event = helper.eth.normalizeEvents(result!).Transfer;
    expect(event.address).to.equal(collectionAddress);
    expect(event.args.from).to.equal('0x0000000000000000000000000000000000000000');
    expect(event.args.to).to.equal('0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF');
    expect(event.args.tokenId).to.equal(`${+nextTokenId}`);

    const properties = [
      await contract.properties.staticCall(+nextTokenId, []),
    ];
    expect(properties).to.be.deep.equal([[
      ['key_2_0', hexlify('value_2_0')],
      ['key_2_1', hexlify('value_2_1')],
      ['key_2_2', hexlify('value_2_2')],
    ]]);
  });

  itEth('Can perform setApprovalForAll()', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const operator = helper.eth.createAccount();

    const collection = await helper.rft.mintCollection(minter, {});

    const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = await helper.ethNativeContract.collection(collectionAddress, 'rft', owner);

    const approvedBefore = await contract.isApprovedForAll.staticCall(owner, operator);
    expect(approvedBefore).to.be.equal(false);

    {
      const result = await (await contract.setApprovalForAll.send(operator, true)).wait(confirmations);

      expect(helper.eth.normalizeEvents(result!).ApprovalForAll).to.be.like({
        address: collectionAddress,
        event: 'ApprovalForAll',
        args: {
          owner,
          operator,
          approved: true,
        },
      });

      const approvedAfter = await contract.isApprovedForAll.staticCall(owner, operator);
      expect(approvedAfter).to.be.equal(true);
    }

    {
      const result = await (await contract.setApprovalForAll.send(operator, false)).wait(confirmations);

      expect(helper.eth.normalizeEvents(result!).ApprovalForAll).to.be.like({
        address: collectionAddress,
        event: 'ApprovalForAll',
        args: {
          owner,
          operator,
          approved: false,
        },
      });

      const approvedAfter = await contract.isApprovedForAll.staticCall(owner, operator);
      expect(approvedAfter).to.be.equal(false);
    }
  });

  itEth('Can perform burn with ApprovalForAll', async ({helper}) => {
    const collection = await helper.rft.mintCollection(minter, {name: 'A', description: 'B', tokenPrefix: 'C'});

    const owner = await helper.eth.createAccountWithBalance(donor);
    const operator = await helper.eth.createAccountWithBalance(donor);

    const token = await collection.mintToken(minter, 100n, {Ethereum: owner.address});

    const address = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = await helper.ethNativeContract.collection(address, 'rft');

    {
      await (await contract.setApprovalForAll.send(operator, true)).wait(confirmations);
      const ownerCross = helper.ethCrossAccount.fromAddress(owner);
      const result = await (await contract.burnFromCross.send(ownerCross, token.tokenId, {from: operator})).wait(confirmations);
      const events = helper.eth.normalizeEvents(result!).Transfer;

      expect(events).to.be.like({
        address,
        event: 'Transfer',
        args: {
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
    const operator = await helper.eth.createAccountWithBalance(donor);

    const token = await collection.mintToken(minter, 100n, {Ethereum: owner.address});

    const address = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = await helper.ethNativeContract.collection(address, 'rft');

    const rftToken = await helper.ethNativeContract.rftTokenById(token.collectionId, token.tokenId, owner, true);

    {
      await (await rftToken.approve.send(operator, 15n)).wait(confirmations);
      await (await contract.setApprovalForAll.send(operator, true)).wait(confirmations);
      await (await rftToken.burnFrom.send(owner, 10n, {from: operator})).wait(confirmations);
    }
    {
      const allowance = await rftToken.allowance.staticCall(owner, operator);
      expect(+allowance).to.be.equal(5);
    }
    {
      const ownerCross = helper.ethCrossAccount.fromAddress(owner);
      const operatorCross = helper.ethCrossAccount.fromAddress(operator);
      const allowance = await rftToken.allowanceCross.staticCall(ownerCross, operatorCross);
      expect(+allowance).to.equal(5);
    }
  });

  itEth('Can perform transfer with ApprovalForAll', async ({helper}) => {
    const collection = await helper.rft.mintCollection(minter, {name: 'A', description: 'B', tokenPrefix: 'C'});

    const owner = await helper.eth.createAccountWithBalance(donor);
    const operator = await helper.eth.createAccountWithBalance(donor);
    const receiver = charlie;

    const token = await collection.mintToken(minter, 100n, {Ethereum: owner.address});

    const address = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = await helper.ethNativeContract.collection(address, 'rft');

    {
      await (await contract.setApprovalForAll.send(operator, true)).wait(confirmations);
      const ownerCross = helper.ethCrossAccount.fromAddress(owner);
      const recieverCross = helper.ethCrossAccount.fromKeyringPair(receiver);
      const result = await (await contract.transferFromCross.send(ownerCross, recieverCross, token.tokenId, {from: operator})).wait(confirmations);
      const event = helper.eth.normalizeEvents(result!).Transfer;
      expect(event).to.be.like({
        address: helper.ethAddress.fromCollectionId(collection.collectionId),
        event: 'Transfer',
        args: {
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

    const result = await (await contract.mint.send(caller)).wait(confirmations);
    const tokenId = helper.eth.normalizeEvents(result!).Transfer.args.tokenId;
    {
      const result = await (await contract.burn.send(tokenId)).wait(confirmations);
      const event = helper.eth.normalizeEvents(result!).Transfer;
      expect(event.address).to.equal(collectionAddress);
      expect(event.args.from).to.equal(caller);
      expect(event.args.to).to.equal('0x0000000000000000000000000000000000000000');
      expect(event.args.tokenId).to.equal(tokenId.toString());
    }
  });

  itEth('Can perform transferFrom()', async ({helper}) => {
    throw new Error('unimplemented');
    // const caller = await helper.eth.createAccountWithBalance(donor);
    // const receiver = helper.eth.createAccount();
    // const {collectionId, collectionAddress} = await helper.eth.createRFTCollection(caller, 'TransferFromy', '6', '6');
    // const contract = await helper.ethNativeContract.collection(collectionAddress, 'rft', caller);

    // const result = await (await contract.mint.send(caller)).wait(confirmations);
    // const tokenId = helper.eth.normalizeEvents(result!).Transfer.args.tokenId;

    // const tokenAddress = helper.ethAddress.fromTokenId(collectionId, tokenId);

    // const tokenContract = await helper.ethNativeContract.rftToken(tokenAddress, caller);
    // await (await tokenContract.repartition.send(15)).wait(confirmations);

    // {
    //   const tokenEvents: any = [];
    //   tokenContract.events.allEvents((_: any, event: any) => {
    //     tokenEvents.push(event);
    //   });
    //   const result = await (await contract.transferFrom.send(caller, receiver, tokenId)).wait(confirmations);
    //   if(tokenEvents.length == 0) await helper.wait.newBlocks(1);

    //   let event = helper.eth.normalizeEvents(result!).Transfer;
    //   expect(event.address).to.equal(collectionAddress);
    //   expect(event.args.from).to.equal(caller);
    //   expect(event.args.to).to.equal(receiver);
    //   expect(event.args.tokenId).to.equal(tokenId.toString());

    //   event = tokenEvents[0];
    //   expect(event.address).to.equal(tokenAddress);
    //   expect(event.args.from).to.equal(caller);
    //   expect(event.args.to).to.equal(receiver);
    //   expect(event.args.value).to.equal('15');
    // }

    // {
    //   const balance = await contract.balanceOf.staticCall(receiver);
    //   expect(+balance).to.equal(1);
    // }

    // {
    //   const balance = await contract.balanceOf.staticCall(caller);
    //   expect(+balance).to.equal(0);
    // }
  });

  // Soft-deprecated
  itEth('Can perform burnFrom()', async ({helper}) => {
    const collection = await helper.rft.mintCollection(minter, {name: 'A', description: 'B', tokenPrefix: 'C'});

    const owner = await helper.eth.createAccountWithBalance(donor);
    const spender = await helper.eth.createAccountWithBalance(donor);

    const token = await collection.mintToken(minter, 100n, {Ethereum: owner.address});

    const address = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = await helper.ethNativeContract.collection(address, 'rft', spender, true);

    const tokenAddress = helper.ethAddress.fromTokenId(collection.collectionId, token.tokenId);
    const tokenContract = await helper.ethNativeContract.rftToken(tokenAddress, owner);
    await (await tokenContract.repartition.send(15)).wait(confirmations);
    await (await tokenContract.approve.send(spender, 15)).wait(confirmations);

    {
      const result = await (await contract.burnFrom.send(owner, token.tokenId)).wait(confirmations);
      const event = helper.eth.normalizeEvents(result!).Transfer;
      expect(event).to.be.like({
        address: helper.ethAddress.fromCollectionId(collection.collectionId),
        event: 'Transfer',
        args: {
          from: owner,
          to: '0x0000000000000000000000000000000000000000',
          tokenId: token.tokenId.toString(),
        },
      });
    }

    expect(await collection.getTokenBalance(token.tokenId, {Ethereum: owner.address})).to.be.eq(0n);
  });

  itEth('Can perform burnFromCross()', async ({helper}) => {
    const collection = await helper.rft.mintCollection(minter, {name: 'A', description: 'B', tokenPrefix: 'C'});

    const owner = bob;
    const spender = await helper.eth.createAccountWithBalance(donor);

    const token = await collection.mintToken(minter, 100n, {Substrate: owner.address});

    const address = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = await helper.ethNativeContract.collection(address, 'rft');

    await token.repartition(owner, 15n);
    await token.approve(owner, {Ethereum: spender.address}, 15n);

    {
      const ownerCross = helper.ethCrossAccount.fromKeyringPair(owner);
      const result = await (await contract.burnFromCross.send(ownerCross, token.tokenId, {from: spender})).wait(confirmations);
      const event = helper.eth.normalizeEvents(result!).Transfer;
      expect(event).to.be.like({
        address: helper.ethAddress.fromCollectionId(collection.collectionId),
        event: 'Transfer',
        args: {
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
    const spender = await helper.eth.createAccountWithBalance(donor);
    const receiver = charlie;

    const token = await collection.mintToken(minter, 100n, {Substrate: owner.address});

    const address = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = await helper.ethNativeContract.collection(address, 'rft');

    await token.repartition(owner, 15n);
    await token.approve(owner, {Ethereum: spender.address}, 15n);

    {
      const ownerCross = helper.ethCrossAccount.fromKeyringPair(owner);
      const recieverCross = helper.ethCrossAccount.fromKeyringPair(receiver);
      const result = await (await contract.transferFromCross.send(ownerCross, recieverCross, token.tokenId, {from: spender})).wait(confirmations);
      const event = helper.eth.normalizeEvents(result!).Transfer;
      expect(event).to.be.like({
        address: helper.ethAddress.fromCollectionId(collection.collectionId),
        event: 'Transfer',
        args: {
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

    const result = await (await contract.mint.send(caller)).wait(confirmations);
    const tokenId = helper.eth.normalizeEvents(result!).Transfer.args.tokenId;

    {
      const result = await (await contract.transfer.send(receiver, tokenId)).wait(confirmations);

      const event = helper.eth.normalizeEvents(result!).Transfer;
      expect(event.address).to.equal(collectionAddress);
      expect(event.args.from).to.equal(caller);
      expect(event.args.to).to.equal(receiver);
      expect(event.args.tokenId).to.equal(tokenId.toString());
    }

    {
      const balance = await contract.balanceOf.staticCall(caller);
      expect(+balance).to.equal(0);
    }

    {
      const balance = await contract.balanceOf.staticCall(receiver);
      expect(+balance).to.equal(1);
    }
  });

  itEth('Can perform transferCross()', async ({helper}) => {
    throw new Error('unimplemented');

    // const sender = await helper.eth.createAccountWithBalance(donor);
    // const receiverEth = await helper.eth.createAccountWithBalance(donor);
    // const receiverCrossEth = helper.ethCrossAccount.fromAddress(receiverEth);
    // const receiverCrossSub = helper.ethCrossAccount.fromKeyringPair(minter);

    // const collection = await helper.rft.mintCollection(minter, {});
    // const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    // const collectionEvm = await helper.ethNativeContract.collection(collectionAddress, 'rft', sender);

    // const token = await collection.mintToken(minter, 50n, {Ethereum: sender.address});

    // {
    //   // Can transferCross to ethereum address:
    //   const result = await (await collectionEvm.transferCross.send(receiverCrossEth, token.tokenId, {from: sender})).wait(confirmations);
    //   // Check events:
    //   const event = helper.eth.normalizeEvents(result!).Transfer;
    //   expect(event.address).to.equal(collectionAddress);
    //   expect(event.args.from).to.equal(sender);
    //   expect(event.args.to).to.equal(receiverEth);
    //   expect(event.args.tokenId).to.equal(token.tokenId.toString());
    //   // Sender's balance decreased:
    //   const senderBalance = await collectionEvm.balanceOf.staticCall(sender);
    //   expect(+senderBalance).to.equal(0);
    //   expect(await token.getBalance({Ethereum: sender.address})).to.eq(0n);
    //   // Receiver's balance increased:
    //   const receiverBalance = await collectionEvm.balanceOf.staticCall(receiverEth);
    //   expect(+receiverBalance).to.equal(1);
    //   expect(await token.getBalance({Ethereum: receiverEth.address})).to.eq(50n);
    // }

    // {
    //   // Can transferCross to substrate address:
    //   const substrateResult = await (await collectionEvm.transferCross.send(receiverCrossSub, token.tokenId, {from: receiverEth})).wait(confirmations);
    //   // Check events:
    //   const event = substratehelper.eth.normalizeEvents(result!).Transfer;
    //   expect(event.address).to.be.equal(collectionAddress);
    //   expect(event.args.from).to.be.equal(receiverEth);
    //   expect(event.args.to).to.be.equal(helper.address.substrateToEth(minter.address));
    //   expect(event.args.tokenId).to.be.equal(`${token.tokenId}`);
    //   // Sender's balance decreased:
    //   const senderBalance = await collectionEvm.balanceOf.staticCall(receiverEth);
    //   expect(+senderBalance).to.equal(0);
    //   expect(await token.getBalance({Ethereum: receiverEth.address})).to.eq(0n);
    //   // Receiver's balance increased:
    //   const receiverBalance = await helper.nft.getTokensByAddress(collection.collectionId, {Substrate: minter.address});
    //   expect(receiverBalance).to.contain(token.tokenId);
    //   expect(await token.getBalance({Substrate: minter.address})).to.eq(50n);
    // }
  });

  ['transfer', 'transferCross'].map(testCase => itEth(`Cannot ${testCase} non-owned token`, async ({helper}) => {
    throw new Error('unimplemented');
    // const sender = await helper.eth.createAccountWithBalance(donor);
    // const tokenOwner = await helper.eth.createAccountWithBalance(donor);
    // const receiverSub = minter;
    // const receiverCrossSub = helper.ethCrossAccount.fromKeyringPair(minter);

    // const collection = await helper.rft.mintCollection(minter, {});
    // const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    // const collectionEvm = await helper.ethNativeContract.collection(collectionAddress, 'rft', sender);

    // await collection.mintToken(minter, 50n, {Ethereum: sender.address});
    // const nonSendersToken = await collection.mintToken(minter, 50n, {Ethereum: tokenOwner.address});

    // // Cannot transferCross someone else's token:
    // const receiver = testCase === 'transfer' ? helper.address.substrateToEth(receiverSub.address) : receiverCrossSub;
    // await expect(collectionEvm[testCase](receiver, nonSendersToken.tokenId).send({from: sender})).to.be.rejected;
    // // Cannot transfer token if it does not exist:
    // await expect(collectionEvm[testCase](receiver, 999999).send({from: sender})).to.be.rejected;
  }));

  itEth('transfer event on transfer from partial ownership to full ownership', async ({helper}) => {
    throw new Error('unimplemented');
    // const caller = await helper.eth.createAccountWithBalance(donor);
    // const receiver = helper.eth.createAccount();
    // const {collectionId, collectionAddress} = await helper.eth.createRFTCollection(caller, 'Transferry-Partial-to-Full', '6', '6');
    // const contract = await helper.ethNativeContract.collection(collectionAddress, 'rft', caller);

    // const result = await (await contract.mint.send(caller)).wait(confirmations);
    // const tokenId = helper.eth.normalizeEvents(result!).Transfer.args.tokenId;

    // const tokenContract = await helper.ethNativeContract.rftTokenById(collectionId, tokenId, caller);

    // await (await tokenContract.repartition.send(2)).wait(confirmations);
    // await (await tokenContract.transfer.send(receiver, 1)).wait(confirmations);

    // const events: any = [];
    // contract.events.allEvents((_: any, event: any) => {
    //   events.push(event);
    // });

    // await (await tokenContract.transfer.send(receiver, 1)).wait(confirmations);
    // if(events.length == 0) await helper.wait.newBlocks(1);
    // const event = events[0];

    // expect(event.address).to.equal(collectionAddress);
    // expect(event.args.from).to.equal('0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF');
    // expect(event.args.to).to.equal(receiver);
    // expect(event.args.tokenId).to.equal(tokenId.toString());
  });

  itEth('transfer event on transfer from full ownership to partial ownership', async ({helper}) => {  
    throw new Error('unimplemented');
    // const caller = await helper.eth.createAccountWithBalance(donor);
    // const receiver = helper.eth.createAccount();
    // const {collectionId, collectionAddress} = await helper.eth.createRFTCollection(caller, 'Transferry-Full-to-Partial', '6', '6');
    // const contract = await helper.ethNativeContract.collection(collectionAddress, 'rft', caller);

    // const result = await (await contract.mint.send(caller)).wait(confirmations);
    // const tokenId = helper.eth.normalizeEvents(result!).Transfer.args.tokenId;

    // const tokenContract = await helper.ethNativeContract.rftTokenById(collectionId, tokenId, caller);

    // await (await tokenContract.repartition.send(2)).wait(confirmations);

    // const events: any = [];
    // contract.events.allEvents((_: any, event: any) => {
    //   events.push(event);
    // });

    // await (await tokenContract.transfer.send(receiver, 1)).wait(confirmations);
    // if(events.length == 0) await helper.wait.newBlocks(1);
    // const event = events[0];

    // expect(event.address).to.equal(collectionAddress);
    // expect(event.args.from).to.equal(caller);
    // expect(event.args.to).to.equal('0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF');
    // expect(event.args.tokenId).to.equal(tokenId.toString());
  });

  itEth('Check balanceOfCross()', async ({helper}) => {
    throw new Error('unimplemented');
    // const collection = await helper.rft.mintCollection(minter, {});
    // const owner = await helper.ethCrossAccount.createAccountWithBalance(donor);
    // const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    // const collectionEvm = await helper.ethNativeContract.collection(collectionAddress, 'nft', owner.eth);

    // expect(await collectionEvm.balanceOfCross.staticCall(owner, {from: owner.eth})).to.be.eq('0');

    // for(let i = 1n; i < 10n; i++) {
    //   await collection.mintToken(minter, 100n, {Ethereum: owner.address.eth});
    //   expect(await collectionEvm.balanceOfCross.staticCall(owner, {from: owner.eth})).to.be.eq(i.toString());
    // }
  });

  itEth('Check ownerOfCross()', async ({helper}) => {
    throw new Error('unimplemented');
    // const collection = await helper.rft.mintCollection(minter, {});
    // let owner = await helper.ethCrossAccount.createAccountWithBalance(donor);
    // const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    // const collectionEvm = await helper.ethNativeContract.collection(collectionAddress, 'nft', owner.eth);
    // const {tokenId} = await collection.mintToken(minter, 100n,{Ethereum: owner.address.eth});

    // for(let i = 1n; i < 10n; i++) {
    //   const ownerCross = await collectionEvm.ownerOfCross.staticCall(tokenId, {from: owner.eth});
    //   expect(ownerCross.eth).to.be.eq(owner.eth);
    //   expect(ownerCross.sub).to.be.eq(owner.sub);

    //   const newOwner = await helper.ethCrossAccount.createAccountWithBalance(donor);
    //   await (await collectionEvm.transferCross.send(newOwner, tokenId, {from: owner.eth})).wait(confirmations);
    //   owner = newOwner;
    // }

    // const tokenAddress = helper.ethAddress.fromTokenId(collection.collectionId, tokenId);
    // const tokenContract = await helper.ethNativeContract.rftToken(tokenAddress, owner.eth, true);
    // const newOwner = await helper.ethCrossAccount.createAccountWithBalance(donor);
    // await (await tokenContract.transferCross.send(newOwner, 50, {from: owner.eth})).wait(confirmations);
    // const ownerCross = await collectionEvm.ownerOfCross.staticCall(tokenId, {from: owner.eth});
    // expect(ownerCross.eth.toUpperCase()).to.be.eq('0XFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF');
    // expect(ownerCross.sub).to.be.eq('0');
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
    throw new Error('unimplemented');

    // const caller = await helper.eth.createAccountWithBalance(donor);
    // const receiver = helper.eth.createAccount();
    // const {collectionAddress} = await helper.eth.createRFTCollection(caller, 'Feeful-Transfer-From', '6', '6');
    // const contract = await helper.ethNativeContract.collection(collectionAddress, 'rft', caller);

    // const result = await (await contract.mint.send(caller)).wait(confirmations);
    // const tokenId = helper.eth.normalizeEvents(result!).Transfer.args.tokenId;

    // const cost = await helper.eth.recordCallFee(caller, () => contract.methods.transferFrom(caller, receiver, tokenId).send());
    // expect(cost < BigInt(0.2 * Number(helper.balance.getOneTokenNominal())));
    // expect(cost > 0n);
  });

  itEth('transfer() call fee is less than 0.2UNQ', async ({helper}) => {
    throw new Error('unimplemented');

    // const caller = await helper.eth.createAccountWithBalance(donor);
    // const receiver = helper.eth.createAccount();
    // const {collectionAddress} = await helper.eth.createRFTCollection(caller, 'Feeful-Transfer', '6', '6');
    // const contract = await helper.ethNativeContract.collection(collectionAddress, 'rft', caller);

    // const result = await (await contract.mint.send(caller)).wait(confirmations);
    // const tokenId = helper.eth.normalizeEvents(result!).Transfer.args.tokenId;

    // const cost = await helper.eth.recordCallFee(caller, () => contract.methods.transfer(receiver, tokenId).send());
    // expect(cost < BigInt(0.2 * Number(helper.balance.getOneTokenNominal())));
    // expect(cost > 0n);
  });
});

describe('Common metadata', () => {
  let donor: IKeyringPair;
  let alice: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (helper, privateKey) => {
      requirePalletsOrSkip(this, helper, [Pallets.ReFungible]);

      donor = await privateKey({url: import.meta.url});
      [alice] = await helper.arrange.createAccounts([1000n], donor);
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
    const name = await contract.name.staticCall();
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
    const symbol = await contract.symbol.staticCall();
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

    const owner = await helper.eth.createAccountWithBalance(donor);
    const spender = await helper.eth.createAccountWithBalance(donor);

    const token = await collection.mintToken(minter, 100n, {Ethereum: owner.address});

    const address = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = await helper.ethNativeContract.collection(address, 'rft');

    const ownerCross = helper.ethCrossAccount.fromAddress(owner);

    await expect((await contract.burnFromCross.send(ownerCross, token.tokenId, {from: spender})).wait(confirmations)).to.be.rejected;

    await (await contract.setApprovalForAll.send(spender, true)).wait(confirmations);
    await (await contract.setApprovalForAll.send(spender, false)).wait(confirmations);

    await expect((await contract.burnFromCross.send(ownerCross, token.tokenId, {from: spender})).wait(confirmations)).to.be.rejected;
  });

  itEth('[negative] Cant perform transfer without approval', async ({helper}) => {
    const collection = await helper.rft.mintCollection(minter, {name: 'A', description: 'B', tokenPrefix: 'C'});
    const owner = await helper.eth.createAccountWithBalance(donor);
    const receiver = alice;

    const spender = await helper.eth.createAccountWithBalance(donor);

    const token = await collection.mintToken(minter, 100n, {Ethereum: owner.address});

    const address = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = await helper.ethNativeContract.collection(address, 'rft');

    const ownerCross = helper.ethCrossAccount.fromAddress(owner);
    const recieverCross = helper.ethCrossAccount.fromKeyringPair(receiver);

    await expect((await contract.transferFromCross.send(ownerCross, recieverCross, token.tokenId, {from: spender})).wait(confirmations)).to.be.rejected;

    await (await contract.setApprovalForAll.send(spender, true)).wait(confirmations);
    await (await contract.setApprovalForAll.send(spender, false)).wait(confirmations);

    await expect((await contract.transferFromCross.send(ownerCross, recieverCross, token.tokenId, {from: spender})).wait(confirmations)).to.be.rejected;
  });

  itEth('[negative] Can perform mintBulkCross() with multiple owners and multiple tokens', async ({helper}) => {
    const caller = await helper.eth.createAccountWithBalance(donor);
    const callerCross = helper.ethCrossAccount.fromAddress(caller);
    const receiver = helper.eth.createAccount();
    const receiverCross = helper.ethCrossAccount.fromAddress(receiver);
    const receiver2 = helper.eth.createAccount();
    const receiver2Cross = helper.ethCrossAccount.fromAddress(receiver2);

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
        collectionMode: 'rft',
        adminList: [callerCross],
        tokenPropertyPermissions: [
          {key: 'key_0_0', permissions},
          {key: 'key_2_0', permissions},
          {key: 'key_2_1', permissions},
          {key: 'key_2_2', permissions},
        ],
      },
    ).send();

    const contract = await helper.ethNativeContract.collection(collectionAddress, 'rft', caller);
    const nextTokenId = await contract.nextTokenId.staticCall();
    expect(nextTokenId).to.be.equal('1');
    const createData = [
      {
        owners: [{
          owner: receiverCross,
          pieces: 1,
        }],
        properties: [
          {key: 'key_0_0', value: Buffer.from('value_0_0')},
        ],
      },
      {
        owners: [
          {
            owner: receiverCross,
            pieces: 1,
          },
          {
            owner: receiver2Cross,
            pieces: 2,
          },
        ],
        properties: [
          {key: 'key_2_0', value: Buffer.from('value_2_0')},
          {key: 'key_2_1', value: Buffer.from('value_2_1')},
          {key: 'key_2_2', value: Buffer.from('value_2_2')},
        ],
      },
    ];

    await expect(contract.mintBulkCross.staticCall(createData, {from: caller})).to.be.rejectedWith('creation of multiple tokens supported only if they have single owner each');
  });
});
