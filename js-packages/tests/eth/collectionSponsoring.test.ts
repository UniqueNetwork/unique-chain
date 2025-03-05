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

import type {IKeyringPair} from '@polkadot/types/types';
import {Pallets, requirePalletsOrSkip, usingPlaygrounds} from '@unique/test-utils/util.js';
import {itEth, expect, confirmations} from '@unique/test-utils/eth/util.js';
import {CollectionLimitField, TokenPermissionField} from '@unique/test-utils/eth/types.js';

describe('evm nft collection sponsoring', () => {
  let donor: IKeyringPair;
  let alice: IKeyringPair;
  let nominal: bigint;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      donor = await privateKey({url: import.meta.url});
      [alice] = await helper.arrange.createAccounts([100n], donor);
      nominal = helper.balance.getOneTokenNominal();
    });
  });

  // TODO: move to substrate tests
  itEth('sponsors mint transactions', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {tokenPrefix: 'spnr', permissions: {mintMode: true}});
    await collection.setSponsor(alice, alice.address);
    await collection.confirmSponsorship(alice);

    const minter = helper.eth.createAccount();
    expect(await helper.balance.getEthereum(minter)).to.equal(0n);

    const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = await helper.ethNativeContract.collection(collectionAddress, 'nft', minter);

    await collection.addToAllowList(alice, {Ethereum: minter.address});

    const result = await (await contract.mint.send(minter)).wait(confirmations);

    const events = helper.eth.normalizeEvents(result!);
    expect(events).to.be.deep.equal([
      {
        address: collectionAddress,
        event: 'Transfer',
        args: {
          from: '0x0000000000000000000000000000000000000000',
          to: minter,
          tokenId: '1',
        },
      },
    ]);
  });

  // TODO: Temprorary off. Need refactor
  // itWeb3('Set substrate sponsor', async ({api, web3, privateKeyWrapper}) => {
  //   const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
  //   const collectionHelpers = evmCollectionHelpers(web3, owner);
  //   let result = await collectionHelpers.createNFTCollection('Sponsor collection', '1', '1').send();
  //   const {collectionIdAddress, collectionId} = await getCollectionAddressFromResult(api, result);
  //   const sponsor = privateKeyWrapper('//Alice');
  //   const collectionEvm = evmCollection(web3, owner, collectionIdAddress);

  //   expect(await collectionEvm.hasCollectionPendingSponsor.staticCall()).to.be.false;
  //   result = await collectionEvm.setCollectionSponsorSubstrate(sponsor.addressRaw).send();
  //   expect(await collectionEvm.hasCollectionPendingSponsor.staticCall()).to.be.true;

  //   const confirmTx = await api.tx.unique.confirmSponsorship(collectionId);
  //   await submitTransactionAsync(sponsor, confirmTx);
  //   expect(await collectionEvm.hasCollectionPendingSponsor.staticCall()).to.be.false;

  //   const sponsorTuple = await collectionEvm.collectionSponsor.staticCall();
  //   expect(bigIntToSub(api, BigInt(sponsorTuple[1]))).to.be.eq(sponsor.address);
  // });

  [
    'setCollectionSponsorCross',
    'setCollectionSponsor', // Soft-deprecated
  ].map(testCase =>
    itEth(`[${testCase}] can remove collection sponsor`, async ({helper}) => {
      const owner = await helper.eth.createAccountWithBalance(donor);
      const collectionHelpers = await helper.ethNativeContract.collectionHelpers(owner);

      let result = await (await collectionHelpers.createNFTCollection.send('Sponsor collection', '1', '1', {value: (2n * nominal)})).wait(confirmations);
      let events = helper.eth.normalizeEvents(result!);
      const collectionIdAddress = helper.ethAddress.normalizeAddress(events.CollectionCreated.args.collectionId);
      const sponsor = await helper.eth.createAccountWithBalance(donor);
      const sponsorCross = helper.ethCrossAccount.fromAddress(sponsor);
      const collectionEvm = await helper.ethNativeContract.collection(collectionIdAddress, 'nft', owner, testCase === 'setCollectionSponsor');

      expect(await collectionEvm.hasCollectionPendingSponsor.staticCall()).to.be.false;
      result = await (await collectionEvm[testCase].send(testCase === 'setCollectionSponsor' ? sponsor : sponsorCross)).wait(confirmations);
      expect(await collectionEvm.hasCollectionPendingSponsor.staticCall()).to.be.true;

      await (await collectionEvm.confirmCollectionSponsorship.send({from: sponsor})).wait(confirmations);
      let sponsorStruct = await collectionEvm.collectionSponsor.staticCall();
      expect(helper.address.restoreCrossAccountFromBigInt(BigInt(sponsorStruct.sub))).to.be.eq(helper.address.ethToSubstrate(sponsor.address, true));
      expect(await collectionEvm.hasCollectionPendingSponsor.staticCall()).to.be.false;

      await (await collectionEvm.removeCollectionSponsor.send()).wait(confirmations);

      sponsorStruct = await collectionEvm.collectionSponsor.staticCall();
      expect(sponsorStruct.eth).to.be.eq('0x0000000000000000000000000000000000000000');
    }));

  [
    'setCollectionSponsorCross',
    'setCollectionSponsor', // Soft-deprecated
  ].map(testCase =>
    itEth(`[${testCase}] Can sponsor from evm address via access list`, async ({helper}) => {
      const owner = await helper.eth.createAccountWithBalance(donor);
      const sponsorEth = await helper.eth.createAccountWithBalance(donor);
      const sponsorCrossEth = helper.ethCrossAccount.fromAddress(sponsorEth);

      const {collectionId, collectionAddress} = await helper.eth.createERC721MetadataCompatibleNFTCollection(owner, 'Sponsor collection', '1', '1', '');

      const collectionSub = helper.nft.getCollectionObject(collectionId);
      const collectionEvm = await helper.ethNativeContract.collection(collectionAddress, 'nft', owner, testCase === 'setCollectionSponsor');

      // Set collection sponsor:
      await (await collectionEvm[testCase].send(testCase === 'setCollectionSponsor' ? sponsorEth : sponsorCrossEth)).wait(confirmations);
      let sponsorship = (await collectionSub.getData())!.raw.sponsorship;
      expect(sponsorship.Unconfirmed).to.be.eq(helper.address.ethToSubstrate(sponsorEth.address, true));
      // Account cannot confirm sponsorship if it is not set as a sponsor
      await expect(collectionEvm.confirmCollectionSponsorship.staticCall()).to.be.rejectedWith('ConfirmSponsorshipFail');

      // Sponsor can confirm sponsorship:
      await (await collectionEvm.confirmCollectionSponsorship.send({from: sponsorEth})).wait(confirmations);
      sponsorship = (await collectionSub.getData())!.raw.sponsorship;
      expect(sponsorship.Confirmed).to.be.eq(helper.address.ethToSubstrate(sponsorEth.address, true));

      // Create user with no balance:
      const user = helper.ethCrossAccount.createAccount();
      const nextTokenId = await collectionEvm.nextTokenId.staticCall();
      expect(nextTokenId).to.be.equal('1');

      // Set collection permissions:
      const oldPermissions = (await collectionSub.getData())!.raw.permissions;
      expect(oldPermissions.mintMode).to.be.false;
      expect(oldPermissions.access).to.be.equal('Normal');

      await (await collectionEvm.setCollectionAccess.send(1 /*'AllowList'*/)).wait(confirmations);
      await (await collectionEvm.addToCollectionAllowListCross.send(user)).wait(confirmations);
      await (await collectionEvm.setCollectionMintMode.send(true)).wait(confirmations);
      await (await collectionEvm.setCollectionLimit.send({field: CollectionLimitField.SponsoredDataRateLimit, value: {status: true, value: 30}})).wait(confirmations);

      const newPermissions = (await collectionSub.getData())!.raw.permissions;
      expect(newPermissions.mintMode).to.be.true;
      expect(newPermissions.access).to.be.equal('AllowList');

      // Set token permissions
      await (
        await collectionEvm.setTokenPropertyPermissions.send([
          ['key', [[TokenPermissionField.TokenOwner, true]]],
        ])
      ).wait(confirmations);

      const ownerBalanceBefore = await helper.balance.getSubstrate(helper.address.ethToSubstrate(owner));
      const sponsorBalanceBefore = await helper.balance.getSubstrate(helper.address.ethToSubstrate(sponsorEth));
      const userBalanceBefore =  await helper.balance.getSubstrate(helper.address.ethToSubstrate(user.eth));

      // User can mint token without balance:
      {
        const tx = await collectionEvm.mintCross.send(user, [{key: 'key', value: Buffer.from('Value')}], {from: user.eth});
        const receipt = await tx.wait(confirmations);
        const event = helper.eth.normalizeEvents(receipt!).Transfer;

        expect(event).to.be.deep.equal({
          address: collectionAddress,
          event: 'Transfer',
          args: {
            from: '0x0000000000000000000000000000000000000000',
            to: user.eth,
            tokenId: '1',
          },
        });

        // await collectionEvm.setProperties(1, [{key: 'key', value: Buffer.from('Value1')}]).send({from: user.eth});

        const ownerBalanceAfter = await helper.balance.getSubstrate(helper.address.ethToSubstrate(owner));
        const sponsorBalanceAfter = await helper.balance.getSubstrate(helper.address.ethToSubstrate(sponsorEth));
        const userBalanceAfter =  await helper.balance.getSubstrate(helper.address.ethToSubstrate(user.eth));

        expect(await collectionEvm.properties.staticCall(nextTokenId, []))
          .to.be.like([
            [
              'key',
              '0x' + Buffer.from('Value').toString('hex'),
            ],
          ]);
        expect(ownerBalanceBefore).to.be.eq(ownerBalanceAfter);
        expect(userBalanceAfter).to.be.eq(userBalanceBefore);
        expect(sponsorBalanceBefore > sponsorBalanceAfter).to.be.true;
      }
    }));

  itEth('Can sponsor [set token properties] via access list', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const sponsorEth = await helper.eth.createAccountWithBalance(donor);
    const sponsorCrossEth = helper.ethCrossAccount.fromAddress(sponsorEth);

    const {collectionAddress} = await helper.eth.createERC721MetadataCompatibleNFTCollection(owner, 'Sponsor collection', '1', '1', '');
    const collectionEvm = await helper.ethNativeContract.collection(collectionAddress, 'nft', owner, false);

    // Set collection sponsor:
    await (await collectionEvm.setCollectionSponsorCross.send(sponsorCrossEth)).wait(confirmations);

    // Sponsor can confirm sponsorship:
    await (await collectionEvm.confirmCollectionSponsorship.send({from: sponsorEth})).wait(confirmations);

    // Create user with no balance:
    const user = helper.ethCrossAccount.createAccount();
    const nextTokenId = await collectionEvm.nextTokenId.staticCall();
    expect(nextTokenId).to.be.equal('1');

    // Set collection permissions:
    await (await collectionEvm.setCollectionAccess.send(1 /*'AllowList'*/)).wait(confirmations);
    await (await collectionEvm.addToCollectionAllowListCross.send(user)).wait(confirmations);
    await (await collectionEvm.setCollectionMintMode.send(true)).wait(confirmations);
    await (await collectionEvm.setCollectionLimit.send({field: CollectionLimitField.SponsoredDataRateLimit, value: {status: true, value: 30}})).wait(confirmations);

    // Set token permissions
    await (await collectionEvm.setTokenPropertyPermissions.send([
      ['key', [
        [TokenPermissionField.TokenOwner, true],
      ],
      ],
    ])).wait(confirmations);

    const ownerBalanceBefore = await helper.balance.getSubstrate(helper.address.ethToSubstrate(owner));
    const sponsorBalanceBefore = await helper.balance.getSubstrate(helper.address.ethToSubstrate(sponsorEth));
    const userBalanceBefore =  await helper.balance.getSubstrate(helper.address.ethToSubstrate(user.eth));

    // User can mint token without balance:
    {
      const tx = await collectionEvm.mintCross.send(user, [], {from: user.eth});
      const receipt = await tx.wait(confirmations);
      const event = helper.eth.normalizeEvents(receipt!).Transfer;

      expect(event).to.be.deep.equal({
        address: collectionAddress,
        event: 'Transfer',
        args: {
          from: '0x0000000000000000000000000000000000000000',
          to: user.eth,
          tokenId: '1',
        },
      });

      await (
        await collectionEvm.setProperties.send(
          1,
          [{key: 'key', value: Buffer.from('Value')}],
          {from: user.eth}
        )
      ).wait(confirmations);

      const ownerBalanceAfter = await helper.balance.getSubstrate(helper.address.ethToSubstrate(owner));
      const sponsorBalanceAfter = await helper.balance.getSubstrate(helper.address.ethToSubstrate(sponsorEth));
      const userBalanceAfter =  await helper.balance.getSubstrate(helper.address.ethToSubstrate(user.eth));

      expect(await collectionEvm.properties.staticCall(nextTokenId, []))
        .to.be.like([
          [
            'key',
            '0x' + Buffer.from('Value').toString('hex'),
          ],
        ]);
      expect(ownerBalanceBefore).to.be.eq(ownerBalanceAfter);
      expect(userBalanceAfter).to.be.eq(userBalanceBefore);
      expect(sponsorBalanceBefore > sponsorBalanceAfter).to.be.true;
    }
  });

  // TODO: Temprorary off. Need refactor
  // itWeb3('Sponsoring collection from substrate address via access list', async ({api, web3, privateKeyWrapper}) => {
  //   const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
  //   const collectionHelpers = evmCollectionHelpers(web3, owner);
  //   const result = await collectionHelpers.createERC721MetadataCompatibleNFTCollection('Sponsor collection', '1', '1', '').send();
  //   const {collectionIdAddress, collectionId} = await getCollectionAddressFromResult(api, result);
  //   const sponsor = privateKeyWrapper('//Alice');
  //   const collectionEvm = evmCollection(web3, owner, collectionIdAddress);

  //   await collectionEvm.setCollectionSponsorSubstrate(sponsor.addressRaw).send();

  //   const confirmTx = await api.tx.unique.confirmSponsorship(collectionId);
  //   await submitTransactionAsync(sponsor, confirmTx);

  //   const user = createEthAccount(web3);
  //   const nextTokenId = await collectionEvm.nextTokenId.staticCall();
  //   expect(nextTokenId).to.be.equal('1');

  //   await collectionEvm.setCollectionAccess(1 /*'AllowList'*/).send();
  //   await collectionEvm.addToCollectionAllowList(user).send();
  //   await collectionEvm.setCollectionMintMode(true).send();

  //   const ownerBalanceBefore = await ethBalanceViaSub(api, owner);
  //   const sponsorBalanceBefore = (await getBalance(api, [sponsor.address]))[0];

  //   {
  //     const nextTokenId = await collectionEvm.nextTokenId.staticCall();
  //     expect(nextTokenId).to.be.equal('1');
  //     const result = await collectionEvm.mintWithTokenURI(
  //       user,
  //       nextTokenId,
  //       'Test URI',
  //     ).send({from: user});
  //     const events = normalizeEvents(result.events);

  //     expect(events).to.be.deep.equal([
  //       {
  //         address: collectionIdAddress,
  //         event: 'Transfer',
  //         args: {
  //           from: '0x0000000000000000000000000000000000000000',
  //           to: user,
  //           tokenId: nextTokenId,
  //         },
  //       },
  //     ]);

  //     const ownerBalanceAfter = await ethBalanceViaSub(api, owner);
  //     const sponsorBalanceAfter = (await getBalance(api, [sponsor.address]))[0];

  //     expect(await collectionEvm.tokenURI.staticCall(nextTokenId)).to.be.equal('Test URI');
  //     expect(ownerBalanceBefore).to.be.eq(ownerBalanceAfter);
  //     expect(sponsorBalanceBefore > sponsorBalanceAfter).to.be.true;
  //   }
  // });

  [
    'setCollectionSponsorCross',
    'setCollectionSponsor', // Soft-deprecated
  ].map(testCase =>
    itEth(`[${testCase}] Check that transaction via EVM spend money from sponsor address`, async ({helper}) => {
      const owner = await helper.eth.createAccountWithBalance(donor);
      const sponsor = await helper.eth.createAccountWithBalance(donor);
      const sponsorCross = helper.ethCrossAccount.fromAddress(sponsor);

      const {collectionAddress, collectionId} = await helper.eth.createERC721MetadataCompatibleNFTCollection(owner,'Sponsor collection', '1', '1', '');

      const collectionSub = helper.nft.getCollectionObject(collectionId);
      const collectionEvm = await helper.ethNativeContract.collection(collectionAddress, 'nft', owner, testCase === 'setCollectionSponsor');
      
      // Set collection sponsor:
      await (await collectionEvm[testCase].send(testCase === 'setCollectionSponsor' ? sponsor : sponsorCross)).wait(confirmations);
      let collectionData = (await collectionSub.getData())!;
      expect(collectionData.raw.sponsorship.Unconfirmed).to.be.eq(helper.address.ethToSubstrate(sponsor.address, true));
      await expect(collectionEvm.confirmCollectionSponsorship.staticCall()).to.be.rejectedWith('ConfirmSponsorshipFail');

      await (await collectionEvm.confirmCollectionSponsorship.send({from: sponsor})).wait(confirmations);
      collectionData = (await collectionSub.getData())!;
      expect(collectionData.raw.sponsorship.Confirmed).to.be.eq(helper.address.ethToSubstrate(sponsor.address, true));

      const user = helper.eth.createAccount();
      const userCross = helper.ethCrossAccount.fromAddress(user);
      await (await collectionEvm.addCollectionAdminCross.send(userCross)).wait(confirmations);

      const ownerBalanceBefore = await helper.balance.getSubstrate(helper.address.ethToSubstrate(owner));
      const sponsorBalanceBefore = await helper.balance.getSubstrate(helper.address.ethToSubstrate(sponsor));

      const mintingTx = await collectionEvm.mintWithTokenURI.send(user, 'Test URI', {from: user});
      const mintingReceipt = await mintingTx.wait(confirmations);
      const mintingEvents = helper.eth.normalizeEvents(mintingReceipt!);
      
      const tokenId = +mintingEvents.Transfer.args.tokenId;
      const address = helper.ethAddress.fromCollectionId(collectionId);

      expect(mintingEvents.Transfer).to.be.deep.equal({
        address,
        event: 'Transfer',
        args: {
          from: '0x0000000000000000000000000000000000000000',
          to: user,
          tokenId: '1',
        },
      });
      
      expect(await collectionEvm.tokenURI.staticCall(tokenId, {from: user})).to.be.equal('Test URI');

      const ownerBalanceAfter = await helper.balance.getSubstrate(helper.address.ethToSubstrate(owner));
      expect(ownerBalanceAfter).to.be.eq(ownerBalanceBefore);
      
      const sponsorBalanceAfter = await helper.balance.getSubstrate(helper.address.ethToSubstrate(sponsor));
      expect(sponsorBalanceAfter < sponsorBalanceBefore).to.be.true;
    }));

  itEth('Can reassign collection sponsor', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const sponsorEth = await helper.eth.createAccountWithBalance(donor);
    const sponsorCrossEth = helper.ethCrossAccount.fromAddress(sponsorEth);
    const [sponsorSub] = await helper.arrange.createAccounts([100n], donor);
    const sponsorCrossSub = helper.ethCrossAccount.fromKeyringPair(sponsorSub);

    const {collectionAddress, collectionId} = await helper.eth.createERC721MetadataCompatibleNFTCollection(owner,'Sponsor collection', '1', '1', '');
    const collectionSub = helper.nft.getCollectionObject(collectionId);
    const collectionEvm = await helper.ethNativeContract.collection(collectionAddress, 'nft', owner);

    // Set and confirm sponsor:
    await (await collectionEvm.setCollectionSponsorCross.send(sponsorCrossEth)).wait(confirmations);
    await (await collectionEvm.confirmCollectionSponsorship.send({from: sponsorEth})).wait(confirmations);

    // Can reassign sponsor:
    await (await collectionEvm.setCollectionSponsorCross.send(sponsorCrossSub)).wait(confirmations);
    const collectionSponsor = (await collectionSub.getData())?.raw.sponsorship;
    expect(collectionSponsor).to.deep.eq({Unconfirmed: sponsorSub.address});
  });
});

describe('evm RFT collection sponsoring', () => {
  let donor: IKeyringPair;
  let alice: IKeyringPair;
  let nominal: bigint;

  before(async function() {
    await usingPlaygrounds(async (helper, privateKey) => {
      requirePalletsOrSkip(this, helper, [Pallets.ReFungible]);
      donor = await privateKey({url: import.meta.url});
      [alice] = await helper.arrange.createAccounts([100n], donor);
      nominal = helper.balance.getOneTokenNominal();
    });
  });

  [
    'mintCross',
    'mintWithTokenURI',
  ].map(testCase =>
    itEth(`[${testCase}] sponsors mint transactions`, async ({helper}) => {
      const collection = await helper.rft.mintCollection(alice, {tokenPrefix: 'spnr', permissions: {mintMode: true}, tokenPropertyPermissions: [
        {key: 'URI', permission: {tokenOwner: true, mutable: true, collectionAdmin: true}},
      ]});

      const owner = await helper.eth.createAccountWithBalance(donor);
      await collection.setSponsor(alice, alice.address);
      await collection.confirmSponsorship(alice);

      const minter = helper.eth.createAccount();
      const minterCross = helper.ethCrossAccount.fromAddress(minter);
      expect(await helper.balance.getEthereum(minter)).to.equal(0n);

      const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
      const contract = await helper.ethNativeContract.collection(collectionAddress, 'rft', minter, true);

      await collection.addToAllowList(alice, {Ethereum: minter.address});
      await collection.addAdmin(alice, {Ethereum: owner.address});
      const collectionHelpers = await helper.ethNativeContract.collectionHelpers(owner);
      await (await collectionHelpers.makeCollectionERC721MetadataCompatible.send(collectionAddress, 'base/')).wait(confirmations);

      let mintingReceipt;
      let events;
      let tokenId;
      switch (testCase) {
        case 'mintCross':
          mintingReceipt = await (await contract.mintCross.send(minterCross, [])).wait(confirmations);
          events = helper.eth.normalizeEvents(mintingReceipt!);
          break;
        case 'mintWithTokenURI':
          mintingReceipt = await (await contract.mintWithTokenURI.send(minter, 'Test URI')).wait(confirmations);
          events = helper.eth.normalizeEvents(mintingReceipt!);
          tokenId = events.Transfer.args.tokenId;
          expect(await contract.tokenURI.staticCall(tokenId)).to.be.equal('Test URI');
          break;
      }

      expect(events).to.deep.include({
        address: collectionAddress,
        event: 'Transfer',
        args: {
          from: '0x0000000000000000000000000000000000000000',
          to: minter,
          tokenId: '1',
        },
      });
    }));

  [
    'setCollectionSponsorCross',
    'setCollectionSponsor', // Soft-deprecated
  ].map(testCase =>
    itEth(`[${testCase}] can remove collection sponsor`, async ({helper}) => {
      const owner = await helper.eth.createAccountWithBalance(donor);
      const collectionHelpers = await helper.ethNativeContract.collectionHelpers(owner);

      const result = await (await collectionHelpers.createRFTCollection.send('Sponsor collection', '1', '1', {value: (2n * nominal)})).wait(confirmations);
      const events = helper.eth.normalizeEvents(result!);
      const collectionIdAddress = helper.ethAddress.normalizeAddress(events.CollectionCreated.args.collectionId);
      const sponsor = await helper.eth.createAccountWithBalance(donor);
      const sponsorCross = helper.ethCrossAccount.fromAddress(sponsor);
      const collectionEvm = await helper.ethNativeContract.collection(collectionIdAddress, 'rft', owner, testCase === 'setCollectionSponsor');

      expect(await collectionEvm.hasCollectionPendingSponsor.staticCall()).to.be.false;
      await (await collectionEvm[testCase].send(testCase === 'setCollectionSponsor' ? sponsor : sponsorCross)).wait(confirmations);
      expect(await collectionEvm.hasCollectionPendingSponsor.staticCall()).to.be.true;

      await (await collectionEvm.confirmCollectionSponsorship.send({from: sponsor})).wait(confirmations);
      expect(await collectionEvm.hasCollectionPendingSponsor.staticCall()).to.be.false;

      await (await collectionEvm.removeCollectionSponsor.send()).wait(confirmations);

      const sponsorStruct = await collectionEvm.collectionSponsor.staticCall();
      expect(sponsorStruct.eth).to.be.eq('0x0000000000000000000000000000000000000000');
    }));

  [
    'setCollectionSponsorCross',
    'setCollectionSponsor', // Soft-deprecated
  ].map(testCase =>
    itEth(`[${testCase}] Can sponsor from evm address via access list`, async ({helper}) => {
      const owner = await helper.eth.createAccountWithBalance(donor);
      const sponsorEth = await helper.eth.createAccountWithBalance(donor);
      const sponsorCrossEth = helper.ethCrossAccount.fromAddress(sponsorEth);

      const {collectionId, collectionAddress} = await helper.eth.createERC721MetadataCompatibleRFTCollection(owner, 'Sponsor collection', '1', '1', '');

      const collectionSub = helper.rft.getCollectionObject(collectionId);
      const collectionEvm = await helper.ethNativeContract.collection(collectionAddress, 'rft', owner, testCase === 'setCollectionSponsor');

      // Set collection sponsor:
      await (await collectionEvm[testCase].send(testCase === 'setCollectionSponsor' ? sponsorEth : sponsorCrossEth)).wait(confirmations);
      let sponsorship = (await collectionSub.getData())!.raw.sponsorship;
      expect(sponsorship.Unconfirmed).to.be.eq(helper.address.ethToSubstrate(sponsorEth, true));
      // Account cannot confirm sponsorship if it is not set as a sponsor
      await expect(collectionEvm.confirmCollectionSponsorship.staticCall()).to.be.rejectedWith('ConfirmSponsorshipFail');

      // Sponsor can confirm sponsorship:
      await (await collectionEvm.confirmCollectionSponsorship.send({from: sponsorEth})).wait(confirmations);
      sponsorship = (await collectionSub.getData())!.raw.sponsorship;
      expect(sponsorship.Confirmed).to.be.eq(helper.address.ethToSubstrate(sponsorEth, true));

      // Create user with no balance:
      const user = helper.eth.createAccount();
      const userCross = helper.ethCrossAccount.fromAddress(user);
      const nextTokenId = await collectionEvm.nextTokenId.staticCall();
      expect(nextTokenId).to.be.equal('1');

      // Set collection permissions:
      const oldPermissions = (await collectionSub.getData())!.raw.permissions;
      expect(oldPermissions.mintMode).to.be.false;
      expect(oldPermissions.access).to.be.equal('Normal');

      await (await collectionEvm.setCollectionAccess.send(1 /*'AllowList'*/)).wait(confirmations);
      await (await collectionEvm.addToCollectionAllowListCross.send(userCross)).wait(confirmations);
      await (await collectionEvm.setCollectionMintMode.send(true)).wait(confirmations);

      const newPermissions = (await collectionSub.getData())!.raw.permissions;
      expect(newPermissions.mintMode).to.be.true;
      expect(newPermissions.access).to.be.equal('AllowList');

      // Set token permissions
      await (
        await collectionEvm.setTokenPropertyPermissions.send([
          ['URI', [
            [TokenPermissionField.TokenOwner, true],
            [TokenPermissionField.CollectionAdmin, true],
          ]],
        ])
      ).wait(confirmations);

      const ownerBalanceBefore = await helper.balance.getSubstrate(helper.address.ethToSubstrate(owner));
      const sponsorBalanceBefore = await helper.balance.getSubstrate(helper.address.ethToSubstrate(sponsorEth));
      const userBalanceBefore =  await helper.balance.getSubstrate(helper.address.ethToSubstrate(user));

      // User can mint token without balance:
      {
        const result = await (await collectionEvm.mintWithTokenURI.send(user, 'Test URI', {from: user})).wait(confirmations);
        const events = helper.eth.normalizeEvents(result!);

        expect(events).to.deep.include({
          address: collectionAddress,
          event: 'Transfer',
          args: {
            from: '0x0000000000000000000000000000000000000000',
            to: user,
            tokenId: '1',
          },
        });

        const ownerBalanceAfter = await helper.balance.getSubstrate(helper.address.ethToSubstrate(owner));
        const sponsorBalanceAfter = await helper.balance.getSubstrate(helper.address.ethToSubstrate(sponsorEth));
        const userBalanceAfter =  await helper.balance.getSubstrate(helper.address.ethToSubstrate(user));

        expect(await collectionEvm.tokenURI.staticCall(nextTokenId)).to.be.equal('Test URI');
        expect(ownerBalanceBefore).to.be.eq(ownerBalanceAfter);
        expect(userBalanceAfter).to.be.eq(userBalanceBefore);
        expect(sponsorBalanceBefore > sponsorBalanceAfter).to.be.true;
      }
    }));

  [
    'setCollectionSponsorCross',
    'setCollectionSponsor', // Soft-deprecated
  ].map(testCase =>
    itEth(`[${testCase}] Check that collection admin EVM transaction spend money from sponsor eth address`, async ({helper}) => {
      const owner = await helper.eth.createAccountWithBalance(donor);
      const sponsor = await helper.eth.createAccountWithBalance(donor);
      const sponsorCross = helper.ethCrossAccount.fromAddress(sponsor);

      const {collectionAddress, collectionId} = await helper.eth.createERC721MetadataCompatibleRFTCollection(owner,'Sponsor collection', '1', '1', '');

      const collectionSub = helper.rft.getCollectionObject(collectionId);
      const collectionEvm = await helper.ethNativeContract.collection(collectionAddress, 'rft', owner, testCase === 'setCollectionSponsor');
      // Set collection sponsor:
      expect(await collectionEvm.hasCollectionPendingSponsor.staticCall()).to.be.false;
      await (await collectionEvm[testCase].send(testCase === 'setCollectionSponsor' ? sponsor : sponsorCross)).wait(confirmations);
      expect(await collectionEvm.hasCollectionPendingSponsor.staticCall()).to.be.true;
      let collectionData = (await collectionSub.getData())!;
      expect(collectionData.raw.sponsorship.Unconfirmed).to.be.eq(helper.address.ethToSubstrate(sponsor, true));
      await expect(collectionEvm.confirmCollectionSponsorship.staticCall()).to.be.rejectedWith('ConfirmSponsorshipFail');
      expect(await collectionEvm.hasCollectionPendingSponsor.staticCall()).to.be.true;

      await (await collectionEvm.confirmCollectionSponsorship.send({from: sponsor})).wait(confirmations);
      collectionData = (await collectionSub.getData())!;
      expect(collectionData.raw.sponsorship.Confirmed).to.be.eq(helper.address.ethToSubstrate(sponsor, true));
      expect(await collectionEvm.hasCollectionPendingSponsor.staticCall()).to.be.false;
      const sponsorStruct = await collectionEvm.collectionSponsor.staticCall();
      const sponsorSubAddress = helper.address.normalizeSubstrateToChainFormat(helper.address.ethToSubstrate(sponsor));
      const actualSubAddress = helper.address.normalizeSubstrateToChainFormat(helper.address.restoreCrossAccountFromBigInt(BigInt(sponsorStruct.sub)));
      expect(actualSubAddress).to.be.equal(sponsorSubAddress);

      const user = helper.eth.createAccount();
      const userCross = helper.ethCrossAccount.fromAddress(user);
      await (await collectionEvm.addCollectionAdminCross.send(userCross)).wait(confirmations);

      const ownerBalanceBefore = await helper.balance.getSubstrate(helper.address.ethToSubstrate(owner));
      const sponsorBalanceBefore = await helper.balance.getSubstrate(helper.address.ethToSubstrate(sponsor));

      const mintingReceipt = await (await collectionEvm.mintWithTokenURI.send(user, 'Test URI', {from: user})).wait(confirmations);
      const mintingEvents = helper.eth.normalizeEvents(mintingReceipt!);
      const tokenId = mintingEvents.Transfer.args.tokenId;

      expect(mintingEvents).to.deep.include({
        address: helper.ethAddress.fromCollectionId(collectionId),
        event: 'Transfer',
        args: {
          from: '0x0000000000000000000000000000000000000000',
          to: user,
          tokenId: '1',
        },
      });

      expect(await collectionEvm.tokenURI.staticCall(tokenId, {from: user})).to.be.equal('Test URI');

      const ownerBalanceAfter = await helper.balance.getSubstrate(helper.address.ethToSubstrate(owner));
      expect(ownerBalanceAfter).to.be.eq(ownerBalanceBefore);
      
      const sponsorBalanceAfter = await helper.balance.getSubstrate(helper.address.ethToSubstrate(sponsor));
      expect(sponsorBalanceAfter < sponsorBalanceBefore).to.be.true;
    }));

  itEth('Check that collection admin EVM transaction spend money from sponsor sub address', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const sponsor = alice;
    const sponsorCross = helper.ethCrossAccount.fromKeyringPair(sponsor);

    const {collectionAddress, collectionId} = await helper.eth.createERC721MetadataCompatibleRFTCollection(owner,'Sponsor collection', '1', '1', '');

    const collectionSub = helper.rft.getCollectionObject(collectionId);
    const collectionEvm = helper.ethNativeContract.collection(collectionAddress, 'rft', owner, false);
    
    // Set collection sponsor:
    expect(await collectionEvm.hasCollectionPendingSponsor.staticCall()).to.be.false;
    await (await collectionEvm.setCollectionSponsorCross.send(sponsorCross)).wait(confirmations);
    expect(await collectionEvm.hasCollectionPendingSponsor.staticCall()).to.be.true;
    
    let collectionData = (await collectionSub.getData())!;
    expect(collectionData.raw.sponsorship.Unconfirmed).to.be.eq(sponsor.address);
    await expect(collectionEvm.confirmCollectionSponsorship.staticCall()).to.be.rejectedWith('ConfirmSponsorshipFail');

    await collectionSub.confirmSponsorship(sponsor);
    collectionData = (await collectionSub.getData())!;
    expect(collectionData.raw.sponsorship.Confirmed).to.be.eq(sponsor.address);
    expect(await collectionEvm.hasCollectionPendingSponsor.staticCall()).to.be.false;
    const sponsorStruct = await collectionEvm.collectionSponsor.staticCall();
    expect(BigInt(sponsorStruct.sub)).to.be.equal(BigInt('0x' + Buffer.from(sponsor.addressRaw).toString('hex')));

    const user = helper.eth.createAccount();
    const userCross = helper.ethCrossAccount.fromAddress(user);
    await (await collectionEvm.addCollectionAdminCross.send(userCross)).wait(confirmations);

    const ownerBalanceBefore = await helper.balance.getSubstrate(helper.address.ethToSubstrate(owner));
    const sponsorBalanceBefore = await helper.balance.getSubstrate(sponsor.address);

    const mintingReceipt = await (await collectionEvm.mintWithTokenURI.send(user, 'Test URI', {from: user})).wait(confirmations);
    const mintingEvents = helper.eth.normalizeEvents(mintingReceipt!);
    
    const tokenId = mintingEvents.Transfer.args.tokenId;

    expect(mintingEvents).to.deep.include({
      address: collectionAddress,
      event: 'Transfer',
      args: {
        from: '0x0000000000000000000000000000000000000000',
        to: user,
        tokenId: '1',
      },
    });

    expect(await collectionEvm.tokenURI.staticCall(tokenId)).to.be.equal('Test URI');

    const ownerBalanceAfter = await helper.balance.getSubstrate(helper.address.ethToSubstrate(owner));
    expect(ownerBalanceAfter).to.be.eq(ownerBalanceBefore);
    
    const sponsorBalanceAfter = await helper.balance.getSubstrate(sponsor.address);
    expect(sponsorBalanceAfter < sponsorBalanceBefore).to.be.true;
  });

  itEth('Sponsoring collection from substrate address via access list', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const user = helper.eth.createAccount();
    const userCross =  helper.ethCrossAccount.fromAddress(user);
    const sponsor = alice;
    const sponsorCross = helper.ethCrossAccount.fromKeyringPair(sponsor);

    const {collectionAddress, collectionId} = await helper.eth.createERC721MetadataCompatibleRFTCollection(owner,'Sponsor collection', '1', '1', '');
    const collectionEvm = await helper.ethNativeContract.collection(collectionAddress, 'rft', owner, false);

    await (await collectionEvm.setCollectionSponsorCross.send(sponsorCross)).wait(confirmations);

    const collectionSub = helper.rft.getCollectionObject(collectionId);
    await collectionSub.confirmSponsorship(sponsor);

    const nextTokenId = await collectionEvm.nextTokenId.staticCall();
    expect(nextTokenId).to.be.equal('1');

    await (await collectionEvm.setCollectionAccess.send(1 /*'AllowList'*/)).wait(confirmations);

    await (await collectionEvm.addToCollectionAllowListCross.send(userCross)).wait(confirmations);
    await (await collectionEvm.setCollectionMintMode.send(true)).wait(confirmations);

    // Set token permissions
    await (
      await collectionEvm.setTokenPropertyPermissions.send([
        ['URI', [
          [TokenPermissionField.TokenOwner, true],
          [TokenPermissionField.CollectionAdmin, true],
        ]],
      ])
    ).wait(confirmations);

    const ownerBalanceBefore = await helper.balance.getSubstrate(helper.address.ethToSubstrate(owner));
    const sponsorBalanceBefore = await helper.balance.getSubstrate(sponsor.address);
    const userBalanceBefore =  await helper.balance.getSubstrate(helper.address.ethToSubstrate(user));

    {
      const nextTokenId = await collectionEvm.nextTokenId.staticCall();
      expect(nextTokenId).to.be.equal('1');
      
      const mintingReceipt = await (await collectionEvm.mintWithTokenURI.send(
        user,
        'Test URI',
        {from: user}
      )).wait(confirmations);

      const events = helper.eth.normalizeEvents(mintingReceipt!);

      expect(events).to.deep.include({
        address: collectionAddress,
        event: 'Transfer',
        args: {
          from: '0x0000000000000000000000000000000000000000',
          to: user,
          tokenId: nextTokenId,
        },
      });

      const ownerBalanceAfter = await helper.balance.getSubstrate(helper.address.ethToSubstrate(owner));
      const sponsorBalanceAfter = await helper.balance.getSubstrate(sponsor.address);
      const userBalanceAfter =  await helper.balance.getSubstrate(helper.address.ethToSubstrate(user));

      expect(await collectionEvm.tokenURI.staticCall(nextTokenId)).to.be.equal('Test URI');
      expect(ownerBalanceBefore).to.be.eq(ownerBalanceAfter);
      expect(userBalanceAfter).to.be.eq(userBalanceBefore);
      expect(sponsorBalanceBefore > sponsorBalanceAfter).to.be.true;
    }
  });

  itEth('Can reassign collection sponsor', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const sponsorEth = await helper.eth.createAccountWithBalance(donor);
    const sponsorCrossEth = helper.ethCrossAccount.fromAddress(sponsorEth);
    const [sponsorSub] = await helper.arrange.createAccounts([100n], donor);
    const sponsorCrossSub = helper.ethCrossAccount.fromKeyringPair(sponsorSub);

    const {collectionAddress, collectionId} = await helper.eth.createERC721MetadataCompatibleRFTCollection(owner,'Sponsor collection', '1', '1', '');
    const collectionSub = helper.rft.getCollectionObject(collectionId);
    const collectionEvm = await helper.ethNativeContract.collection(collectionAddress, 'rft', owner);

    // Set and confirm sponsor:
    await (await collectionEvm.setCollectionSponsorCross.send(sponsorCrossEth)).wait(confirmations);
    await (await collectionEvm.confirmCollectionSponsorship.send({from: sponsorEth})).wait(confirmations);

    // Can reassign sponsor:
    await (await collectionEvm.setCollectionSponsorCross.send(sponsorCrossSub)).wait(confirmations);
    const collectionSponsor = (await collectionSub.getData())?.raw.sponsorship;
    expect(collectionSponsor).to.deep.eq({Unconfirmed: sponsorSub.address});
  });

  [
    'transfer',
    'transferCross',
    'transferFrom',
    'transferFromCross',
  ].map(testCase =>
    itEth(`[${testCase}] Check that transfer via EVM spend money from sponsor address`, async ({helper}) => {
      const owner = await helper.eth.createAccountWithBalance(donor);

      const {collectionAddress} = await helper.eth.createERC721MetadataCompatibleRFTCollection(owner,'Sponsor collection', '1', '1', '');
      const sponsor = await helper.eth.createAccountWithBalance(donor);
      const sponsorCross = helper.ethCrossAccount.fromAddress(sponsor);
      const receiver = await helper.eth.createAccountWithBalance(donor);
      const collectionEvm = await helper.ethNativeContract.collection(collectionAddress, 'rft', owner);

      await (await collectionEvm.setCollectionSponsorCross.send(sponsorCross)).wait(confirmations);
      await (await collectionEvm.confirmCollectionSponsorship.send({from: sponsor})).wait(confirmations);

      const user = await helper.eth.createAccountWithBalance(donor);
      const userCross = helper.ethCrossAccount.fromAddress(user);
      await (await collectionEvm.addCollectionAdminCross.send(userCross)).wait(confirmations);

      const result = await (await collectionEvm.mintWithTokenURI.send(user, 'Test URI', {from: user})).wait(confirmations);
      const events = helper.eth.normalizeEvents(result!);
      const tokenId = events.Transfer.args.tokenId;

      const ownerBalanceBefore = await helper.balance.getSubstrate(helper.address.ethToSubstrate(owner));
      const sponsorBalanceBefore = await helper.balance.getSubstrate(helper.address.ethToSubstrate(sponsor));
      const userBalanceBefore = await helper.balance.getSubstrate(helper.address.ethToSubstrate(user));

      switch (testCase) {
        case 'transfer':
          await (await collectionEvm.transfer.send(receiver, tokenId, {from: user})).wait(confirmations);
          break;
        case 'transferCross':
          await (await collectionEvm.transferCross.send(helper.ethCrossAccount.fromAddress(receiver), tokenId, {from: user})).wait(confirmations);
          break;
        case 'transferFrom':
          await (await collectionEvm.transferFrom.send(user, receiver, tokenId, {from: user})).wait(confirmations);
          break;
        case 'transferFromCross':
          await (await collectionEvm.transferFromCross.send(helper.ethCrossAccount.fromAddress(user), helper.ethCrossAccount.fromAddress(receiver), tokenId, {from: user})).wait(confirmations);
          break;
      }

      const ownerBalanceAfter = await helper.balance.getSubstrate(helper.address.ethToSubstrate(owner));
      expect(ownerBalanceAfter).to.be.eq(ownerBalanceBefore);
      const sponsorBalanceAfter = await helper.balance.getSubstrate(helper.address.ethToSubstrate(sponsor));
      expect(sponsorBalanceAfter < sponsorBalanceBefore).to.be.true;
      const userBalanceAfter = await helper.balance.getSubstrate(helper.address.ethToSubstrate(user));
      expect(userBalanceAfter).to.be.eq(userBalanceBefore);
    }));
});

describe('evm RFT token sponsoring', () => {
  let donor: IKeyringPair;

  before(async function() {
    await usingPlaygrounds(async (helper, privateKey) => {
      requirePalletsOrSkip(this, helper, [Pallets.ReFungible]);
      donor = await privateKey({url: import.meta.url});
    });
  });

  [
    'transfer',
    'transferCross',
    'transferFrom',
    'transferFromCross',
  ].map(testCase =>
    itEth(`[${testCase}] Check that token piece transfer via EVM spend money from sponsor address`, async ({helper}) => {
      const owner = await helper.eth.createAccountWithBalance(donor);

      const {collectionAddress, collectionId} = await helper.eth.createERC721MetadataCompatibleRFTCollection(owner,'Sponsor collection', '1', '1', '');
      const sponsor = await helper.eth.createAccountWithBalance(donor);
      const sponsorCross = helper.ethCrossAccount.fromAddress(sponsor);
      const receiver = await helper.eth.createAccountWithBalance(donor);
      const collectionEvm = await helper.ethNativeContract.collection(collectionAddress, 'rft', owner);

      await (await collectionEvm.setCollectionSponsorCross.send(sponsorCross)).wait(confirmations);
      await (await collectionEvm.confirmCollectionSponsorship.send({from: sponsor})).wait(confirmations);

      const user = await helper.eth.createAccountWithBalance(donor);
      const userCross = helper.ethCrossAccount.fromAddress(user);
      await (await collectionEvm.addCollectionAdminCross.send(userCross)).wait(confirmations);

      const result = await (await collectionEvm.mintWithTokenURI.send(user, 'Test URI', {from: user})).wait(confirmations);
      const events = helper.eth.normalizeEvents(result!);
      const tokenId = +(events.Transfer.args.tokenId);

      const tokenContract = await helper.ethNativeContract.rftTokenById(collectionId, tokenId, user);
      await (await tokenContract.repartition.send(2)).wait(confirmations);

      const ownerBalanceBefore = await helper.balance.getSubstrate(helper.address.ethToSubstrate(owner));
      const sponsorBalanceBefore = await helper.balance.getSubstrate(helper.address.ethToSubstrate(sponsor));
      const userBalanceBefore = await helper.balance.getSubstrate(helper.address.ethToSubstrate(user));

      switch (testCase) {
        case 'transfer':
          await (await tokenContract.transfer.send(receiver, 1)).wait(confirmations);
          break;
        case 'transferCross':
          await (await tokenContract.transferCross.send(helper.ethCrossAccount.fromAddress(receiver), 1)).wait(confirmations);
          break;
        case 'transferFrom':
          await (await tokenContract.transferFrom.send(user, receiver, 1)).wait(confirmations);
          break;
        case 'transferFromCross':
          await (await tokenContract.transferFromCross.send(helper.ethCrossAccount.fromAddress(user), helper.ethCrossAccount.fromAddress(receiver), 1)).wait(confirmations);
          break;
      }

      const ownerBalanceAfter = await helper.balance.getSubstrate(helper.address.ethToSubstrate(owner));
      expect(ownerBalanceAfter).to.be.eq(ownerBalanceBefore);
      const sponsorBalanceAfter = await helper.balance.getSubstrate(helper.address.ethToSubstrate(sponsor));
      expect(sponsorBalanceAfter < sponsorBalanceBefore).to.be.true;
      const userBalanceAfter = await helper.balance.getSubstrate(helper.address.ethToSubstrate(user));
      expect(userBalanceAfter).to.be.eq(userBalanceBefore);
    }));

  [
    'approve',
    'approveCross',
  ].map(testCase =>
    itEth(`[${testCase}] Check that approve via EVM spend money from sponsor address`, async ({helper}) => {
      const owner = await helper.eth.createAccountWithBalance(donor);

      const {collectionAddress, collectionId} = await helper.eth.createERC721MetadataCompatibleRFTCollection(owner,'Sponsor collection', '1', '1', '');
      const sponsor = await helper.eth.createAccountWithBalance(donor);
      const sponsorCross = helper.ethCrossAccount.fromAddress(sponsor);
      const receiver = await helper.eth.createAccountWithBalance(donor);
      const collectionEvm = await helper.ethNativeContract.collection(collectionAddress, 'rft', owner);

      await (await collectionEvm.setCollectionSponsorCross.send(sponsorCross)).wait(confirmations);
      await (await collectionEvm.confirmCollectionSponsorship.send({from: sponsor})).wait(confirmations);

      const user = await helper.eth.createAccountWithBalance(donor);
      const userCross = helper.ethCrossAccount.fromAddress(user);
      await (await collectionEvm.addCollectionAdminCross.send(userCross)).wait(confirmations);

      const result = await (await collectionEvm.mintWithTokenURI.send(user, 'Test URI', {from: user})).wait(confirmations);
      const events = helper.eth.normalizeEvents(result!);
      const tokenId = +(events.Transfer.args.tokenId);

      const tokenContract = await helper.ethNativeContract.rftTokenById(collectionId, tokenId, user);
      await (await tokenContract.repartition.send(2)).wait(confirmations);

      const ownerBalanceBefore = await helper.balance.getSubstrate(helper.address.ethToSubstrate(owner));
      const sponsorBalanceBefore = await helper.balance.getSubstrate(helper.address.ethToSubstrate(sponsor));
      const userBalanceBefore = await helper.balance.getSubstrate(helper.address.ethToSubstrate(user));

      switch (testCase) {
        case 'approve':
          await (await tokenContract.approve.send(receiver, 1)).wait(confirmations);
          break;
        case 'approveCross':
          await (await tokenContract.approveCross.send(helper.ethCrossAccount.fromAddress(receiver), 1)).wait(confirmations);
          break;
      }

      const ownerBalanceAfter = await helper.balance.getSubstrate(helper.address.ethToSubstrate(owner));
      expect(ownerBalanceAfter).to.be.eq(ownerBalanceBefore);
      const sponsorBalanceAfter = await helper.balance.getSubstrate(helper.address.ethToSubstrate(sponsor));
      expect(sponsorBalanceAfter < sponsorBalanceBefore).to.be.true;
      const userBalanceAfter = await helper.balance.getSubstrate(helper.address.ethToSubstrate(user));
      expect(userBalanceAfter).to.be.eq(userBalanceBefore);
    }));
});

