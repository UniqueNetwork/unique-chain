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
import {waitParams, expect, itEth, usingEthPlaygrounds, hexlifyString} from '@unique/test-utils/eth/util.js';
import type {IKeyringPair} from '@polkadot/types/types';
import type {ITokenPropertyPermission} from '@unique-nft/playgrounds/types.js';
import {CREATE_COLLECTION_DATA_DEFAULTS, NormalizedEvent, TokenPermissionField} from '@unique/test-utils/eth/types.js';
import {Contract} from 'ethers';
import {HDNodeWallet} from 'ethers';

describe('Refungible: Plain calls', () => {
  let donor: IKeyringPair;
  let minter: IKeyringPair;
  let bob: HDNodeWallet;
  let charlie: HDNodeWallet;

  before(async function() {
    await usingEthPlaygrounds(async (helper, privateKey) => {
      requirePalletsOrSkip(this, helper, [Pallets.ReFungible]);

      donor = await privateKey({url: import.meta.url});
      [minter] = await helper.arrange.createAccounts([100n], donor);
      bob = await helper.eth.createAccountWithBalance(donor, 100n);
      charlie = await helper.eth.createAccountWithBalance(donor, 100n);
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
      const [receiverSub] = await helper.arrange.createAccounts([100n], donor);
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
      let result = await (await contract.mintCross.send(testCase === 'ethereum' ? receiverCrossEth : receiverCrossSub, [])).wait(...waitParams);
      let tokenId = helper.eth.normalizeEvents(result!).Transfer.args.tokenId;
      expect(BigInt(tokenId)).to.be.equal(expectedTokenId);

      let event = helper.eth.normalizeEvents(result!).Transfer;
      expect(event.address).to.be.equal(collectionAddress);
      expect(event.args.from).to.be.equal('0x0000000000000000000000000000000000000000');
      expect(event.args.to).to.be.equal(testCase === 'ethereum' ? receiverCrossEth.eth : helper.address.substrateToEth(receiverSub.address));
      expect(await contract.properties.staticCall(tokenId, [])).to.be.like([]);

      expectedTokenId = await contract.nextTokenId.staticCall();
      result = await (await contract.mintCross.send(testCase === 'ethereum' ? receiverCrossEth : receiverCrossSub, properties)).wait(...waitParams);
      event = helper.eth.normalizeEvents(result!).Transfer;
      expect(event.address).to.be.equal(collectionAddress);
      expect(event.args.from).to.be.equal('0x0000000000000000000000000000000000000000');
      expect(event.args.to).to.be.equal(testCase === 'ethereum' ? receiverCrossEth.eth : helper.address.substrateToEth(receiverSub.address));
      expect(await contract.properties.staticCall(tokenId, [])).to.be.like([]);

      tokenId = helper.eth.normalizeEvents(result!).Transfer.args.tokenId;

      expect(BigInt(tokenId)).to.be.equal(expectedTokenId);

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
      const receipt = await (await contract.mintBulkWithTokenURI.send(
        receiver,
        [
          [nextTokenId, 'Test URI 0'],
          [+nextTokenId + 1, 'Test URI 1'],
          [+nextTokenId + 2, 'Test URI 2'],
        ],
      )).wait(...waitParams);

      const events = helper.eth.rebuildEvents(receipt!);
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
    expect(nextTokenId).to.be.equal(1n);
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
    ])).wait(...waitParams);
    const events = helper.eth.rebuildEvents(result!)
      .filter((event: NormalizedEvent) => event.event === 'Transfer')
      .sort((a: any, b: any) => +a.args.tokenId - b.args.tokenId);
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
    expect(nextTokenId).to.be.equal(1n);
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
    }])).wait(...waitParams);
    const event = helper.eth.normalizeEvents(result!).Transfer;
    expect(event.address).to.equal(collectionAddress);
    expect(event.args.from).to.equal('0x0000000000000000000000000000000000000000');
    expect(event.args.to).to.equal('0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF');
    expect(event.args.tokenId).to.equal(`${nextTokenId}`);

    const properties = [
      await contract.properties.staticCall(nextTokenId, []),
    ];
    expect(properties).to.be.deep.equal([[
      ['key_2_0', hexlifyString('value_2_0')],
      ['key_2_1', hexlifyString('value_2_1')],
      ['key_2_2', hexlifyString('value_2_2')],
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
      const result = await (await contract.setApprovalForAll.send(operator, true)).wait(...waitParams);

      expect(helper.eth.normalizeEvents(result!).ApprovalForAll).to.be.like({
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
      const result = await (await contract.setApprovalForAll.send(operator, false)).wait(...waitParams);

      expect(helper.eth.normalizeEvents(result!).ApprovalForAll).to.be.like({
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
    const collection = await helper.rft.mintCollection(minter, {name: 'A', description: 'B', tokenPrefix: 'C'});

    const owner = await helper.eth.createAccountWithBalance(donor);
    const operator = await helper.eth.createAccountWithBalance(donor);

    const token = await collection.mintToken(minter, 100n, {Ethereum: owner.address});

    const address = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = await helper.ethNativeContract.collection(address, 'rft', owner);

    {
      await (await contract.setApprovalForAll.send(operator, true)).wait(...waitParams);
      const ownerCross = helper.ethCrossAccount.fromAddress(owner);
      const result = await (await (<Contract>contract.connect(operator)).burnFromCross.send(ownerCross, token.tokenId)).wait(...waitParams);
      const events = helper.eth.normalizeEvents(result!).Transfer;

      expect(events).to.be.like({
        address,
        event: 'Transfer',
        args: {
          from: owner.address,
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
    const contract = await helper.ethNativeContract.collection(address, 'rft', owner);

    const rftToken = await helper.ethNativeContract.rftTokenById(token.collectionId, token.tokenId, owner, true);

    {
      await (await rftToken.approve.send(operator, 15n)).wait(...waitParams);
      await (await contract.setApprovalForAll.send(operator, true)).wait(...waitParams);
      await (await (<Contract>rftToken.connect(operator)).burnFrom.send(owner, 10n)).wait(...waitParams);
    }
    {
      const allowance = await rftToken.allowance.staticCall(owner, operator);
      expect(allowance).to.be.equal(5n);
    }
    {
      const ownerCross = helper.ethCrossAccount.fromAddress(owner);
      const operatorCross = helper.ethCrossAccount.fromAddress(operator);
      const allowance = await rftToken.allowanceCross.staticCall(ownerCross, operatorCross);
      expect(allowance).to.equal(5n);
    }
  });

  itEth('Can perform transfer with ApprovalForAll', async ({helper}) => {
    // TODO: Refactor this

    // const collection = await helper.rft.mintCollection(minter, {name: 'A', description: 'B', tokenPrefix: 'C'});

    // const owner = await helper.eth.createAccountWithBalance(donor);
    // const operator = await helper.eth.createAccountWithBalance(donor);
    // const receiver = charlie;

    // const token = await collection.mintToken(minter, 100n, {Ethereum: owner.address});

    // const address = helper.ethAddress.fromCollectionId(collection.collectionId);
    // const contract = await helper.ethNativeContract.collection(address, 'rft', owner);

    // {
    //   await (await contract.setApprovalForAll.send(operator, true)).wait(...waitParams);
    //   const ownerCross = helper.ethCrossAccount.fromAddress(owner);
    //   const recieverCross = helper.ethCrossAccount.fromKeyringPair(receiver);
    //   const result = await (await (<Contract>contract.connect(operator)).transferFromCross.send(ownerCross, recieverCross, token.tokenId)).wait(...waitParams);
    //   const event = helper.eth.normalizeEvents(result!).Transfer;
    //   expect(event).to.be.like({
    //     address: helper.ethAddress.fromCollectionId(collection.collectionId),
    //     event: 'Transfer',
    //     args: {
    //       from: owner.address,
    //       to: helper.address.substrateToEth(receiver.address),
    //       tokenId: token.tokenId.toString(),
    //     },
    //   });
    // }

    // expect(await token.getTop10Owners()).to.be.like([{Substrate: receiver.address}]);
  });

  itEth('Can perform burn()', async ({helper}) => {
    const caller = await helper.eth.createAccountWithBalance(donor);
    const {collectionAddress} = await helper.eth.createRFTCollection(caller, 'Burny', '6', '6');
    const contract = await helper.ethNativeContract.collection(collectionAddress, 'rft', caller);

    const result = await (await contract.mint.send(caller)).wait(...waitParams);
    const tokenId = helper.eth.normalizeEvents(result!).Transfer.args.tokenId;
    {
      const result = await (await contract.burn.send(tokenId)).wait(...waitParams);
      const event = helper.eth.normalizeEvents(result!).Transfer;
      expect(event.address).to.equal(collectionAddress);
      expect(event.args.from).to.equal(caller.address);
      expect(event.args.to).to.equal('0x0000000000000000000000000000000000000000');
      expect(event.args.tokenId).to.equal(tokenId.toString());
    }
  });

  itEth.skip('Can perform transferFrom()', async ({helper}) => {
    // TODO: Refactor this
    // const caller = await helper.eth.createAccountWithBalance(donor);
    // const receiver = helper.eth.createAccount();
    // const {collectionId, collectionAddress} = await helper.eth.createRFTCollection(caller, 'TransferFromy', '6', '6');
    // const contract = await helper.ethNativeContract.collection(collectionAddress, 'rft', caller);

    // const result = await (await contract.mint.send(caller)).wait(...waitParams);
    // const tokenId = helper.eth.normalizeEvents(result!).Transfer.args.tokenId;

    // const tokenAddress = helper.ethAddress.fromTokenId(collectionId, tokenId);

    // const tokenContract = await helper.ethNativeContract.rftToken(tokenAddress, caller);
    // await (await tokenContract.repartition.send(15)).wait(...waitParams);

    // {
    //   const tokenEvents: any = [];
    //   tokenContract.events.allEvents((_: any, event: any) => {
    //     tokenEvents.push(event);
    //   });
    //   const result = await (await contract.transferFrom.send(caller, receiver, tokenId)).wait(...waitParams);
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
    await (await tokenContract.repartition.send(15)).wait(...waitParams);
    await (await tokenContract.approve.send(spender.address, 15)).wait(...waitParams);

    {
      const result = await (await contract.burnFrom.send(owner.address, token.tokenId)).wait(...waitParams);
      const event = helper.eth.normalizeEvents(result!).Transfer;
      expect(event).to.be.like({
        address: helper.ethAddress.fromCollectionId(collection.collectionId),
        event: 'Transfer',
        args: {
          from: owner.address,
          to: '0x0000000000000000000000000000000000000000',
          tokenId: token.tokenId.toString(),
        },
      });
    }

    expect(await collection.getTokenBalance(token.tokenId, {Ethereum: owner.address})).to.be.eq(0n);
  });

  itEth('Can perform burnFromCross()', async ({helper}) => {
    // TODO: Refactor this

    // const collection = await helper.rft.mintCollection(minter, {name: 'A', description: 'B', tokenPrefix: 'C'});

    // const owner = await helper.eth.createAccountWithBalance(donor);
    // const spender = await helper.eth.createAccountWithBalance(donor);

    // const token = await collection.mintToken(minter, 100n, {Substrate: owner.address});

    // const address = helper.ethAddress.fromCollectionId(collection.collectionId);
    // const contract = await helper.ethNativeContract.collection(address, 'rft', owner);

    // await token.repartition(owner, 15n);
    // await token.approve(owner, {Ethereum: spender.address}, 15n);

    // {
    //   const ownerCross = helper.ethCrossAccount.fromKeyringPair(owner);
    //   const result = await (await (<Contract>contract.connect(spender)).burnFromCross.send(ownerCross, token.tokenId)).wait(...waitParams);
    //   const event = helper.eth.normalizeEvents(result!).Transfer;
    //   expect(event).to.be.like({
    //     address: helper.ethAddress.fromCollectionId(collection.collectionId),
    //     event: 'Transfer',
    //     args: {
    //       from: helper.address.substrateToEth(owner.address),
    //       to: '0x0000000000000000000000000000000000000000',
    //       tokenId: token.tokenId.toString(),
    //     },
    //   });
    // }

    // expect(await collection.getTokenBalance(token.tokenId, {Substrate: owner.address})).to.be.eq(0n);
  });

  itEth('Can perform transferFromCross()', async ({helper}) => {
    const collection = await helper.rft.mintCollection(minter, {name: 'A', description: 'B', tokenPrefix: 'C'});

    const [owner, receiver] = await helper.arrange.createAccounts([100n, 100n], donor);
    const spender = await helper.eth.createAccountWithBalance(donor);

    const token = await collection.mintToken(minter, 100n, {Substrate: owner.address});

    const address = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = await helper.ethNativeContract.collection(address, 'rft', spender);

    await token.repartition(owner, 15n);
    await token.approve(owner, {Ethereum: spender.address}, 15n);

    {
      const ownerCross = helper.ethCrossAccount.fromKeyringPair(owner);
      const recieverCross = helper.ethCrossAccount.fromKeyringPair(receiver);
      const result = await (await contract.transferFromCross.send(ownerCross, recieverCross, token.tokenId)).wait(...waitParams);
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

    const result = await (await contract.mint.send(caller)).wait(...waitParams);
    const tokenId = helper.eth.normalizeEvents(result!).Transfer.args.tokenId;

    {
      const result = await (await contract.transfer.send(receiver, tokenId)).wait(...waitParams);

      const event = helper.eth.normalizeEvents(result!).Transfer;
      expect(event.address).to.equal(collectionAddress);
      expect(event.args.from).to.equal(caller.address);
      expect(event.args.to).to.equal(receiver.address);
      expect(event.args.tokenId).to.equal(tokenId.toString());
    }

    {
      const balance = await contract.balanceOf.staticCall(caller);
      expect(balance).to.equal(0n);
    }

    {
      const balance = await contract.balanceOf.staticCall(receiver);
      expect(balance).to.equal(1n);
    }
  });

  itEth.skip('Can perform transferCross()', async ({helper}) => {
    // TODO: Refactor this

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
    //   const result = await (await collectionEvm.transferCross.send(receiverCrossEth, token.tokenId, {from: sender})).wait(...waitParams);
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
    //   const substrateResult = await (await collectionEvm.transferCross.send(receiverCrossSub, token.tokenId, {from: receiverEth})).wait(...waitParams);
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
    const sender = await helper.eth.createAccountWithBalance(donor);
    const tokenOwner = await helper.eth.createAccountWithBalance(donor);
    const [receiverSub] = await helper.arrange.createAccounts([100n], donor);
    const receiverCrossSub = helper.ethCrossAccount.fromKeyringPair(minter);

    const collection = await helper.rft.mintCollection(minter, {});
    const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    const collectionEvm = await helper.ethNativeContract.collection(collectionAddress, 'rft', sender);

    await collection.mintToken(minter, 50n, {Ethereum: sender.address});
    const nonSendersToken = await collection.mintToken(minter, 50n, {Ethereum: tokenOwner.address});

    // Cannot transferCross someone else's token:
    const receiver = testCase === 'transfer' ? helper.address.substrateToEth(receiverSub.address) : receiverCrossSub;
    await expect(collectionEvm[testCase].staticCall(receiver, nonSendersToken.tokenId)).to.be.rejected;

    // Cannot transfer token if it does not exist:
    await expect(collectionEvm[testCase].staticCall(receiver, 999999)).to.be.rejected;
  }));

  itEth('transfer event on transfer from partial ownership to full ownership', async ({helper}) => {
    // TODO: Refactor this

    // const caller = await helper.eth.createAccountWithBalance(donor);
    // const receiver = helper.eth.createAccount();
    // const {collectionId, collectionAddress} = await helper.eth.createRFTCollection(caller, 'Transferry-Partial-to-Full', '6', '6');
    // const contract = await helper.ethNativeContract.collection(collectionAddress, 'rft', caller);

    // const result = await (await contract.mint.send(caller)).wait(...waitParams);
    // const tokenId = helper.eth.normalizeEvents(result!).Transfer.args.tokenId;

    // const tokenContract = await helper.ethNativeContract.rftTokenById(collectionId, tokenId, caller);

    // await (await tokenContract.repartition.send(2)).wait(...waitParams);
    // await (await tokenContract.transfer.send(receiver, 1)).wait(...waitParams);

    // const events: any = [];
    // contract.events.allEvents((_: any, event: any) => {
    //   events.push(event);
    // });

    // await (await tokenContract.transfer.send(receiver, 1)).wait(...waitParams);
    // if(events.length == 0) await helper.wait.newBlocks(1);
    // const event = events[0];

    // expect(event.address).to.equal(collectionAddress);
    // expect(event.args.from).to.equal('0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF');
    // expect(event.args.to).to.equal(receiver);
    // expect(event.args.tokenId).to.equal(tokenId.toString());
  });

  itEth('transfer event on transfer from full ownership to partial ownership', async ({helper}) => {
    // TODO: Refactor this

    // const caller = await helper.eth.createAccountWithBalance(donor);
    // const receiver = helper.eth.createAccount();
    // const {collectionId, collectionAddress} = await helper.eth.createRFTCollection(caller, 'Transferry-Full-to-Partial', '6', '6');
    // const contract = await helper.ethNativeContract.collection(collectionAddress, 'rft', caller);

    // const result = await (await contract.mint.send(caller)).wait(...waitParams);
    // const tokenId = helper.eth.normalizeEvents(result!).Transfer.args.tokenId;

    // const tokenContract = await helper.ethNativeContract.rftTokenById(collectionId, tokenId, caller);

    // await (await tokenContract.repartition.send(2)).wait(...waitParams);

    // const events: any = [];
    // contract.events.allEvents((_: any, event: any) => {
    //   events.push(event);
    // });

    // await (await tokenContract.transfer.send(receiver, 1)).wait(...waitParams);
    // if(events.length == 0) await helper.wait.newBlocks(1);
    // const event = events[0];

    // expect(event.address).to.equal(collectionAddress);
    // expect(event.args.from).to.equal(caller);
    // expect(event.args.to).to.equal('0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF');
    // expect(event.args.tokenId).to.equal(tokenId.toString());
  });

  itEth('Check balanceOfCross()', async ({helper}) => {
    const collection = await helper.rft.mintCollection(minter, {});
    const owner = await helper.eth.createAccountWithBalance(donor, 100n);
    const ownerCross = helper.ethCrossAccount.fromAddr(owner);
    const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    const collectionEvm = await helper.ethNativeContract.collection(collectionAddress, 'nft', owner);

    expect(await collectionEvm.balanceOfCross.staticCall(ownerCross)).to.be.eq(0n);

    for(let i = 1n; i < 10n; i++) {
      await collection.mintToken(minter, 100n, {Ethereum: ownerCross[0]});
      expect(await collectionEvm.balanceOfCross.staticCall(ownerCross)).to.be.eq(i);
    }
  });

  itEth('Check ownerOfCross()', async ({helper}) => {
    const collection = await helper.rft.mintCollection(minter, {});

    let owner = await helper.eth.createAccountWithBalance(donor, 100n);
    let ownerCross = await helper.ethCrossAccount.fromAddress(owner);

    const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    let collectionEvm = await helper.ethNativeContract.collection(collectionAddress, 'nft', owner);

    const {tokenId} = await collection.mintToken(minter, 100n, {Ethereum: owner.address});

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

    const tokenAddress = helper.ethAddress.fromTokenId(collection.collectionId, tokenId);
    const tokenContract = await helper.ethNativeContract.rftToken(tokenAddress, owner, true);
    const newOwner = await helper.ethCrossAccount.createAccountWithBalance(donor);
    await (await tokenContract.transferCross.send(newOwner, 50)).wait(...waitParams);
    const ownerOfCross = await collectionEvm.ownerOfCross.staticCall(tokenId);
    expect(ownerOfCross.eth.toUpperCase()).to.be.eq('0XFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF');
    expect(ownerOfCross.sub).to.be.eq(0n);
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

    const result = await (await contract.mint.send(caller)).wait(...waitParams);
    const tokenId = helper.eth.normalizeEvents(result!).Transfer.args.tokenId;

    const cost = await helper.eth.recordCallFee(
      caller.address,
      async () => await (await contract.transferFrom.send(caller.address, receiver.address, tokenId)).wait(...waitParams),
    );
    expect(cost < BigInt(0.2 * Number(helper.balance.getOneTokenNominal())));
    expect(cost > 0n);
  });

  itEth('transfer() call fee is less than 0.2UNQ', async ({helper}) => {
    const caller = await helper.eth.createAccountWithBalance(donor);
    const receiver = helper.eth.createAccount();
    const {collectionAddress} = await helper.eth.createRFTCollection(caller, 'Feeful-Transfer', '6', '6');
    const contract = await helper.ethNativeContract.collection(collectionAddress, 'rft', caller);

    const result = await (await contract.mint.send(caller)).wait(...waitParams);
    const tokenId = helper.eth.normalizeEvents(result!).Transfer.args.tokenId;

    const cost = await helper.eth.recordCallFee(
      caller.address,
      async () => await (await contract.transfer.send(receiver.address, tokenId)).wait(...waitParams),
    );
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
    const contract = await helper.ethNativeContract.collection(address, 'rft', owner);

    const ownerCross = helper.ethCrossAccount.fromAddress(owner);

    await expect((<Contract>contract.connect(spender)).burnFromCross.send(ownerCross, token.tokenId))
      .to.be.rejected;

    await (await contract.setApprovalForAll.send(spender.address, true)).wait(...waitParams);
    await (await contract.setApprovalForAll.send(spender.address, false)).wait(...waitParams);

    await expect((<Contract>contract.connect(spender)).burnFromCross.send(ownerCross, token.tokenId))
      .to.be.rejected;
  });

  itEth('[negative] Cant perform transfer without approval', async ({helper}) => {
    const collection = await helper.rft.mintCollection(minter, {name: 'A', description: 'B', tokenPrefix: 'C'});
    const owner = await helper.eth.createAccountWithBalance(donor);
    const receiver = alice;

    const spender = await helper.eth.createAccountWithBalance(donor);

    const token = await collection.mintToken(minter, 100n, {Ethereum: owner.address});

    const address = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = await helper.ethNativeContract.collection(address, 'rft', owner);

    const ownerCross = helper.ethCrossAccount.fromAddress(owner);
    const recieverCross = helper.ethCrossAccount.fromKeyringPair(receiver);

    await expect((<Contract>contract.connect(spender)).transferFromCross.send(ownerCross, recieverCross, token.tokenId)).to.be.rejected;

    await (await contract.setApprovalForAll.send(spender, true)).wait(...waitParams);
    await (await contract.setApprovalForAll.send(spender, false)).wait(...waitParams);

    await expect((<Contract>contract.connect(spender)).transferFromCross.send(ownerCross, recieverCross, token.tokenId)).to.be.rejected;
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
    expect(nextTokenId).to.be.equal(1n);
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

    await expect(contract.mintBulkCross.staticCall(createData)).to.be.rejectedWith('creation of multiple tokens supported only if they have single owner each');
  });
});
