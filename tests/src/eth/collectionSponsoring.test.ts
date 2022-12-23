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

import {IKeyringPair} from '@polkadot/types/types';
import {Pallets, requirePalletsOrSkip, usingPlaygrounds} from '../util/index';
import {itEth, expect} from './util';

describe('evm nft collection sponsoring', () => {
  let donor: IKeyringPair;
  let alice: IKeyringPair;
  let nominal: bigint;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      donor = await privateKey({filename: __filename});
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

    await collection.addToAllowList(alice, {Ethereum: minter});

    const result = await contract.methods.mint(minter).send();

    const events = helper.eth.normalizeEvents(result.events);
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
  //   let result = await collectionHelpers.methods.createNFTCollection('Sponsor collection', '1', '1').send();
  //   const {collectionIdAddress, collectionId} = await getCollectionAddressFromResult(api, result);
  //   const sponsor = privateKeyWrapper('//Alice');
  //   const collectionEvm = evmCollection(web3, owner, collectionIdAddress);

  //   expect(await collectionEvm.methods.hasCollectionPendingSponsor().call({from: owner})).to.be.false;
  //   result = await collectionEvm.methods.setCollectionSponsorSubstrate(sponsor.addressRaw).send({from: owner});
  //   expect(await collectionEvm.methods.hasCollectionPendingSponsor().call({from: owner})).to.be.true;

  //   const confirmTx = await api.tx.unique.confirmSponsorship(collectionId);
  //   await submitTransactionAsync(sponsor, confirmTx);
  //   expect(await collectionEvm.methods.hasCollectionPendingSponsor().call({from: owner})).to.be.false;

  //   const sponsorTuple = await collectionEvm.methods.collectionSponsor().call({from: owner});
  //   expect(bigIntToSub(api, BigInt(sponsorTuple[1]))).to.be.eq(sponsor.address);
  // });

  [
    'setCollectionSponsorCross',
    'setCollectionSponsor', // Soft-deprecated
  ].map(testCase =>
    itEth(`[${testCase}] can remove collection sponsor`, async ({helper}) => {
      const owner = await helper.eth.createAccountWithBalance(donor);
      const collectionHelpers = await helper.ethNativeContract.collectionHelpers(owner);

      let result = await collectionHelpers.methods.createNFTCollection('Sponsor collection', '1', '1').send({value: Number(2n * nominal)});
      const collectionIdAddress = helper.ethAddress.normalizeAddress(result.events.CollectionCreated.returnValues.collectionId);
      const sponsor = await helper.eth.createAccountWithBalance(donor);
      const sponsorCross = helper.ethCrossAccount.fromAddress(sponsor);
      const collectionEvm = await helper.ethNativeContract.collection(collectionIdAddress, 'nft', owner, testCase === 'setCollectionSponsor');

      expect(await collectionEvm.methods.hasCollectionPendingSponsor().call({from: owner})).to.be.false;
      result = await collectionEvm.methods[testCase](testCase === 'setCollectionSponsor' ? sponsor : sponsorCross).send({from: owner});
      expect(await collectionEvm.methods.hasCollectionPendingSponsor().call({from: owner})).to.be.true;

      await collectionEvm.methods.confirmCollectionSponsorship().send({from: sponsor});
      let sponsorTuple = await collectionEvm.methods.collectionSponsor().call({from: owner});
      expect(helper.address.restoreCrossAccountFromBigInt(BigInt(sponsorTuple.sub))).to.be.eq(helper.address.ethToSubstrate(sponsor, true));
      expect(await collectionEvm.methods.hasCollectionPendingSponsor().call({from: owner})).to.be.false;

      await collectionEvm.methods.removeCollectionSponsor().send({from: owner});

      sponsorTuple = await collectionEvm.methods.collectionSponsor().call({from: owner});
      expect(sponsorTuple.eth).to.be.eq('0x0000000000000000000000000000000000000000');
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
      await collectionEvm.methods[testCase](testCase === 'setCollectionSponsor' ? sponsorEth : sponsorCrossEth).send({from: owner});
      let sponsorship = (await collectionSub.getData())!.raw.sponsorship;
      expect(sponsorship.Unconfirmed).to.be.eq(helper.address.ethToSubstrate(sponsorEth, true));
      // Account cannot confirm sponsorship if it is not set as a sponsor
      await expect(collectionEvm.methods.confirmCollectionSponsorship().call()).to.be.rejectedWith('ConfirmSponsorshipFail');

      // Sponsor can confirm sponsorship:
      await collectionEvm.methods.confirmCollectionSponsorship().send({from: sponsorEth});
      sponsorship = (await collectionSub.getData())!.raw.sponsorship;
      expect(sponsorship.Confirmed).to.be.eq(helper.address.ethToSubstrate(sponsorEth, true));

      // Create user with no balance:
      const user = helper.eth.createAccount();
      const userCross = helper.ethCrossAccount.fromAddress(user);
      const nextTokenId = await collectionEvm.methods.nextTokenId().call();
      expect(nextTokenId).to.be.equal('1');

      // Set collection permissions:
      const oldPermissions = (await collectionSub.getData())!.raw.permissions;
      expect(oldPermissions.mintMode).to.be.false;
      expect(oldPermissions.access).to.be.equal('Normal');

      await collectionEvm.methods.setCollectionAccess(1 /*'AllowList'*/).send({from: owner});
      await collectionEvm.methods.addToCollectionAllowListCross(userCross).send({from: owner});
      await collectionEvm.methods.setCollectionMintMode(true).send({from: owner});
  
      const newPermissions = (await collectionSub.getData())!.raw.permissions;
      expect(newPermissions.mintMode).to.be.true;
      expect(newPermissions.access).to.be.equal('AllowList');

      const ownerBalanceBefore = await helper.balance.getSubstrate(helper.address.ethToSubstrate(owner));
      const sponsorBalanceBefore = await helper.balance.getSubstrate(helper.address.ethToSubstrate(sponsorEth));

      // User can mint token without balance:
      {
        const result = await collectionEvm.methods.mintWithTokenURI(user, 'Test URI').send({from: user});
        const event = helper.eth.normalizeEvents(result.events)
          .find(event => event.event === 'Transfer');

        expect(event).to.be.deep.equal({
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

        expect(await collectionEvm.methods.tokenURI(nextTokenId).call()).to.be.equal('Test URI');
        expect(ownerBalanceBefore).to.be.eq(ownerBalanceAfter);
        expect(userBalanceAfter).to.be.eq(0n);
        expect(sponsorBalanceBefore > sponsorBalanceAfter).to.be.true;
      }
    }));

  // TODO: Temprorary off. Need refactor
  // itWeb3('Sponsoring collection from substrate address via access list', async ({api, web3, privateKeyWrapper}) => {
  //   const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
  //   const collectionHelpers = evmCollectionHelpers(web3, owner);
  //   const result = await collectionHelpers.methods.createERC721MetadataCompatibleNFTCollection('Sponsor collection', '1', '1', '').send();
  //   const {collectionIdAddress, collectionId} = await getCollectionAddressFromResult(api, result);
  //   const sponsor = privateKeyWrapper('//Alice');
  //   const collectionEvm = evmCollection(web3, owner, collectionIdAddress);

  //   await collectionEvm.methods.setCollectionSponsorSubstrate(sponsor.addressRaw).send({from: owner});

  //   const confirmTx = await api.tx.unique.confirmSponsorship(collectionId);
  //   await submitTransactionAsync(sponsor, confirmTx);

  //   const user = createEthAccount(web3);
  //   const nextTokenId = await collectionEvm.methods.nextTokenId().call();
  //   expect(nextTokenId).to.be.equal('1');

  //   await collectionEvm.methods.setCollectionAccess(1 /*'AllowList'*/).send({from: owner});
  //   await collectionEvm.methods.addToCollectionAllowList(user).send({from: owner});
  //   await collectionEvm.methods.setCollectionMintMode(true).send({from: owner});

  //   const ownerBalanceBefore = await ethBalanceViaSub(api, owner);
  //   const sponsorBalanceBefore = (await getBalance(api, [sponsor.address]))[0];

  //   {
  //     const nextTokenId = await collectionEvm.methods.nextTokenId().call();
  //     expect(nextTokenId).to.be.equal('1');
  //     const result = await collectionEvm.methods.mintWithTokenURI(
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

  //     expect(await collectionEvm.methods.tokenURI(nextTokenId).call()).to.be.equal('Test URI');
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
      await collectionEvm.methods[testCase](testCase === 'setCollectionSponsor' ? sponsor : sponsorCross).send();
      let collectionData = (await collectionSub.getData())!;
      expect(collectionData.raw.sponsorship.Unconfirmed).to.be.eq(helper.address.ethToSubstrate(sponsor, true));
      await expect(collectionEvm.methods.confirmCollectionSponsorship().call()).to.be.rejectedWith('ConfirmSponsorshipFail');

      await collectionEvm.methods.confirmCollectionSponsorship().send({from: sponsor});
      collectionData = (await collectionSub.getData())!;
      expect(collectionData.raw.sponsorship.Confirmed).to.be.eq(helper.address.ethToSubstrate(sponsor, true));

      const user = helper.eth.createAccount();
      const userCross = helper.ethCrossAccount.fromAddress(user);
      await collectionEvm.methods.addCollectionAdminCross(userCross).send();

      const ownerBalanceBefore = await helper.balance.getSubstrate(helper.address.ethToSubstrate(owner));
      const sponsorBalanceBefore = await helper.balance.getSubstrate(helper.address.ethToSubstrate(sponsor));

      const mintingResult = await collectionEvm.methods.mintWithTokenURI(user, 'Test URI').send({from: user});
      const tokenId = mintingResult.events.Transfer.returnValues.tokenId;

      const event = helper.eth.normalizeEvents(mintingResult.events)
        .find(event => event.event === 'Transfer');
      const address = helper.ethAddress.fromCollectionId(collectionId);

      expect(event).to.be.deep.equal({
        address,
        event: 'Transfer',
        args: {
          from: '0x0000000000000000000000000000000000000000',
          to: user,
          tokenId: '1',
        },
      });
      expect(await collectionEvm.methods.tokenURI(tokenId).call({from: user})).to.be.equal('Test URI');

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
    await collectionEvm.methods.setCollectionSponsorCross(sponsorCrossEth).send({from: owner});
    await collectionEvm.methods.confirmCollectionSponsorship().send({from: sponsorEth});

    // Can reassign sponsor:
    await collectionEvm.methods.setCollectionSponsorCross(sponsorCrossSub).send({from: owner});
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
      donor = await privateKey({filename: __filename});
      [alice] = await helper.arrange.createAccounts([100n], donor);
      nominal = helper.balance.getOneTokenNominal();
    });
  });
  
  itEth('sponsors mint transactions', async ({helper}) => {
    const collection = await helper.rft.mintCollection(alice, {tokenPrefix: 'spnr', permissions: {mintMode: true}});
    await collection.setSponsor(alice, alice.address);
    await collection.confirmSponsorship(alice);

    const minter = helper.eth.createAccount();
    expect(await helper.balance.getEthereum(minter)).to.equal(0n);

    const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = helper.ethNativeContract.collection(collectionAddress, 'rft', minter);

    await collection.addToAllowList(alice, {Ethereum: minter});

    const result = await contract.methods.mint(minter).send();

    const events = helper.eth.normalizeEvents(result.events);
    expect(events).to.deep.include({
      address: collectionAddress,
      event: 'Transfer',
      args: {
        from: '0x0000000000000000000000000000000000000000',
        to: minter,
        tokenId: '1',
      },
    });
  });

  // TODO: Temprorary off. Need refactor
  // itWeb3('Set substrate sponsor', async ({api, web3, privateKeyWrapper}) => {
  //   const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
  //   const collectionHelpers = evmCollectionHelpers(web3, owner);
  //   let result = await collectionHelpers.methods.createRFTCollection('Sponsor collection', '1', '1').send();
  //   const {collectionIdAddress, collectionId} = await getCollectionAddressFromResult(api, result);
  //   const sponsor = privateKeyWrapper('//Alice');
  //   const collectionEvm = evmCollection(web3, owner, collectionIdAddress);

  //   expect(await collectionEvm.methods.hasCollectionPendingSponsor().call({from: owner})).to.be.false;
  //   result = await collectionEvm.methods.setCollectionSponsorSubstrate(sponsor.addressRaw).send({from: owner});
  //   expect(await collectionEvm.methods.hasCollectionPendingSponsor().call({from: owner})).to.be.true;

  //   const confirmTx = await api.tx.unique.confirmSponsorship(collectionId);
  //   await submitTransactionAsync(sponsor, confirmTx);
  //   expect(await collectionEvm.methods.hasCollectionPendingSponsor().call({from: owner})).to.be.false;

  //   const sponsorTuple = await collectionEvm.methods.collectionSponsor().call({from: owner});
  //   expect(bigIntToSub(api, BigInt(sponsorTuple[1]))).to.be.eq(sponsor.address);
  // });

  [
    'setCollectionSponsorCross',
    'setCollectionSponsor', // Soft-deprecated
  ].map(testCase => 
    itEth(`[${testCase}] can remove collection sponsor`, async ({helper}) => {
      const owner = await helper.eth.createAccountWithBalance(donor);
      const collectionHelpers = helper.ethNativeContract.collectionHelpers(owner);
  
      let result = await collectionHelpers.methods.createRFTCollection('Sponsor collection', '1', '1').send({value: Number(2n * nominal)});
      const collectionIdAddress = helper.ethAddress.normalizeAddress(result.events.CollectionCreated.returnValues.collectionId);
      const sponsor = await helper.eth.createAccountWithBalance(donor);
      const sponsorCross = helper.ethCrossAccount.fromAddress(sponsor);
      const collectionEvm = helper.ethNativeContract.collection(collectionIdAddress, 'rft', owner, testCase === 'setCollectionSponsor');
  
      expect(await collectionEvm.methods.hasCollectionPendingSponsor().call({from: owner})).to.be.false;
      result = await collectionEvm.methods[testCase](testCase === 'setCollectionSponsor' ? sponsor : sponsorCross).send({from: owner});
      expect(await collectionEvm.methods.hasCollectionPendingSponsor().call({from: owner})).to.be.true;
  
      await collectionEvm.methods.confirmCollectionSponsorship().send({from: sponsor});
      expect(await collectionEvm.methods.hasCollectionPendingSponsor().call({from: owner})).to.be.false;
  
      await collectionEvm.methods.removeCollectionSponsor().send({from: owner});
  
      const sponsorTuple = await collectionEvm.methods.collectionSponsor().call({from: owner});
      expect(sponsorTuple.field_0).to.be.eq('0x0000000000000000000000000000000000000000');
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
      const collectionEvm = helper.ethNativeContract.collection(collectionAddress, 'rft', owner, testCase === 'setCollectionSponsor');
  
      // Set collection sponsor:
      await collectionEvm.methods[testCase](testCase === 'setCollectionSponsor' ? sponsorEth : sponsorCrossEth).send({from: owner});
      let sponsorship = (await collectionSub.getData())!.raw.sponsorship;
      expect(sponsorship.Unconfirmed).to.be.eq(helper.address.ethToSubstrate(sponsorEth, true));
      // Account cannot confirm sponsorship if it is not set as a sponsor
      await expect(collectionEvm.methods.confirmCollectionSponsorship().call()).to.be.rejectedWith('caller is not set as sponsor');
      
      // Sponsor can confirm sponsorship:
      await collectionEvm.methods.confirmCollectionSponsorship().send({from: sponsorEth});
      sponsorship = (await collectionSub.getData())!.raw.sponsorship;
      expect(sponsorship.Confirmed).to.be.eq(helper.address.ethToSubstrate(sponsorEth, true));
  
      // Create user with no balance:
      const user = helper.eth.createAccount();
      const userCross = helper.ethCrossAccount.fromAddress(user);
      const nextTokenId = await collectionEvm.methods.nextTokenId().call();
      expect(nextTokenId).to.be.equal('1');
  
      // Set collection permissions:
      const oldPermissions = (await collectionSub.getData())!.raw.permissions;
      expect(oldPermissions.mintMode).to.be.false;
      expect(oldPermissions.access).to.be.equal('Normal');

      await collectionEvm.methods.setCollectionAccess(1 /*'AllowList'*/).send({from: owner});
      await collectionEvm.methods.addToCollectionAllowListCross(userCross).send({from: owner});
      await collectionEvm.methods.setCollectionMintMode(true).send({from: owner});
  
      const newPermissions = (await collectionSub.getData())!.raw.permissions;
      expect(newPermissions.mintMode).to.be.true;
      expect(newPermissions.access).to.be.equal('AllowList');
  
      const ownerBalanceBefore = await helper.balance.getSubstrate(helper.address.ethToSubstrate(owner));
      const sponsorBalanceBefore = await helper.balance.getSubstrate(helper.address.ethToSubstrate(sponsorEth));

      // User can mint token without balance:
      {
        const result = await collectionEvm.methods.mintWithTokenURI(user, 'Test URI').send({from: user});
        const events = helper.eth.normalizeEvents(result.events);

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
  
        expect(await collectionEvm.methods.tokenURI(nextTokenId).call()).to.be.equal('Test URI');
        expect(ownerBalanceBefore).to.be.eq(ownerBalanceAfter);
        expect(userBalanceAfter).to.be.eq(0n);
        expect(sponsorBalanceBefore > sponsorBalanceAfter).to.be.true;
      }
    }));

  // TODO: Temprorary off. Need refactor
  // itWeb3('Sponsoring collection from substrate address via access list', async ({api, web3, privateKeyWrapper}) => {
  //   const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
  //   const collectionHelpers = evmCollectionHelpers(web3, owner);
  //   const result = await collectionHelpers.methods.createERC721MetadataCompatibleRFTCollection('Sponsor collection', '1', '1', '').send();
  //   const {collectionIdAddress, collectionId} = await getCollectionAddressFromResult(api, result);
  //   const sponsor = privateKeyWrapper('//Alice');
  //   const collectionEvm = evmCollection(web3, owner, collectionIdAddress);

  //   await collectionEvm.methods.setCollectionSponsorSubstrate(sponsor.addressRaw).send({from: owner});

  //   const confirmTx = await api.tx.unique.confirmSponsorship(collectionId);
  //   await submitTransactionAsync(sponsor, confirmTx);

  //   const user = createEthAccount(web3);
  //   const nextTokenId = await collectionEvm.methods.nextTokenId().call();
  //   expect(nextTokenId).to.be.equal('1');

  //   await collectionEvm.methods.setCollectionAccess(1 /*'AllowList'*/).send({from: owner});
  //   await collectionEvm.methods.addToCollectionAllowList(user).send({from: owner});
  //   await collectionEvm.methods.setCollectionMintMode(true).send({from: owner});

  //   const ownerBalanceBefore = await ethBalanceViaSub(api, owner);
  //   const sponsorBalanceBefore = (await getBalance(api, [sponsor.address]))[0];

  //   {
  //     const nextTokenId = await collectionEvm.methods.nextTokenId().call();
  //     expect(nextTokenId).to.be.equal('1');
  //     const result = await collectionEvm.methods.mintWithTokenURI(
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

  //     expect(await collectionEvm.methods.tokenURI(nextTokenId).call()).to.be.equal('Test URI');
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
  
      const {collectionAddress, collectionId} = await helper.eth.createERC721MetadataCompatibleRFTCollection(owner,'Sponsor collection', '1', '1', '');

      const collectionSub = helper.rft.getCollectionObject(collectionId);
      const collectionEvm = helper.ethNativeContract.collection(collectionAddress, 'rft', owner, testCase === 'setCollectionSponsor');
      // Set collection sponsor:
      await collectionEvm.methods[testCase](testCase === 'setCollectionSponsor' ? sponsor : sponsorCross).send();
      let collectionData = (await collectionSub.getData())!;
      expect(collectionData.raw.sponsorship.Unconfirmed).to.be.eq(helper.address.ethToSubstrate(sponsor, true));
      await expect(collectionEvm.methods.confirmCollectionSponsorship().call()).to.be.rejectedWith('caller is not set as sponsor');
  
      await collectionEvm.methods.confirmCollectionSponsorship().send({from: sponsor});
      collectionData = (await collectionSub.getData())!;
      expect(collectionData.raw.sponsorship.Confirmed).to.be.eq(helper.address.ethToSubstrate(sponsor, true));
  
      const user = helper.eth.createAccount();
      const userCross = helper.ethCrossAccount.fromAddress(user);
      await collectionEvm.methods.addCollectionAdminCross(userCross).send();
  
      const ownerBalanceBefore = await helper.balance.getSubstrate(helper.address.ethToSubstrate(owner));
      const sponsorBalanceBefore = await helper.balance.getSubstrate(helper.address.ethToSubstrate(sponsor));
    
      const mintingResult = await collectionEvm.methods.mintWithTokenURI(user, 'Test URI').send({from: user});
      const tokenId = mintingResult.events.Transfer.returnValues.tokenId;
  
      const events = helper.eth.normalizeEvents(mintingResult.events);
      const address = helper.ethAddress.fromCollectionId(collectionId);
  
      expect(events).to.deep.include({
        address,
        event: 'Transfer',
        args: {
          from: '0x0000000000000000000000000000000000000000',
          to: user,
          tokenId: '1',
        },
      });
      expect(await collectionEvm.methods.tokenURI(tokenId).call({from: user})).to.be.equal('Test URI');
  
      const ownerBalanceAfter = await helper.balance.getSubstrate(helper.address.ethToSubstrate(owner));
      expect(ownerBalanceAfter).to.be.eq(ownerBalanceBefore);
      const sponsorBalanceAfter = await helper.balance.getSubstrate(helper.address.ethToSubstrate(sponsor));
      expect(sponsorBalanceAfter < sponsorBalanceBefore).to.be.true;
    }));

  itEth('Check that transaction via EVM spend money from substrate sponsor address', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const sponsor = alice;
    const sponsorCross = helper.ethCrossAccount.fromKeyringPair(sponsor);

    const {collectionAddress, collectionId} = await helper.eth.createERC721MetadataCompatibleRFTCollection(owner,'Sponsor collection', '1', '1', '');

    const collectionSub = helper.rft.getCollectionObject(collectionId);
    const collectionEvm = helper.ethNativeContract.collection(collectionAddress, 'rft', owner, false);
    // Set collection sponsor:
    await collectionEvm.methods.setCollectionSponsorCross(sponsorCross).send();

    await collectionSub.confirmSponsorship(sponsor);

    const user = helper.eth.createAccount();
    const userCross = helper.ethCrossAccount.fromAddress(user);
    await collectionEvm.methods.addCollectionAdminCross(userCross).send();

    const ownerBalanceBefore = await helper.balance.getSubstrate(helper.address.ethToSubstrate(owner));
    const sponsorBalanceBefore = await helper.balance.getSubstrate(sponsor.address);
  
    const mintingResult = await collectionEvm.methods.mintWithTokenURI(user, 'Test URI').send({from: user});
    const tokenId = mintingResult.events.Transfer.returnValues.tokenId;

    const events = helper.eth.normalizeEvents(mintingResult.events);
    const address = helper.ethAddress.fromCollectionId(collectionId);

    expect(events).to.deep.include({
      address,
      event: 'Transfer',
      args: {
        from: '0x0000000000000000000000000000000000000000',
        to: user,
        tokenId: '1',
      },
    });
    expect(await collectionEvm.methods.tokenURI(tokenId).call({from: user})).to.be.equal('Test URI');

    const ownerBalanceAfter = await helper.balance.getSubstrate(helper.address.ethToSubstrate(owner));
    expect(ownerBalanceAfter).to.be.eq(ownerBalanceBefore);
    const sponsorBalanceAfter = await helper.balance.getSubstrate(sponsor.address);
    expect(sponsorBalanceAfter < sponsorBalanceBefore).to.be.true;
  });

  itEth('Can reassign collection sponsor', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const sponsorEth = await helper.eth.createAccountWithBalance(donor);
    const sponsorCrossEth = helper.ethCrossAccount.fromAddress(sponsorEth);
    const [sponsorSub] = await helper.arrange.createAccounts([100n], donor);
    const sponsorCrossSub = helper.ethCrossAccount.fromKeyringPair(sponsorSub);

    const {collectionAddress, collectionId} = await helper.eth.createERC721MetadataCompatibleRFTCollection(owner,'Sponsor collection', '1', '1', '');
    const collectionSub = helper.rft.getCollectionObject(collectionId);
    const collectionEvm = helper.ethNativeContract.collection(collectionAddress, 'rft', owner);

    // Set and confirm sponsor:
    await collectionEvm.methods.setCollectionSponsorCross(sponsorCrossEth).send({from: owner});
    await collectionEvm.methods.confirmCollectionSponsorship().send({from: sponsorEth});

    // Can reassign sponsor:
    await collectionEvm.methods.setCollectionSponsorCross(sponsorCrossSub).send({from: owner});
    const collectionSponsor = (await collectionSub.getData())?.raw.sponsorship;
    expect(collectionSponsor).to.deep.eq({Unconfirmed: sponsorSub.address});
  });
});

describe('evm RFT token sponsoring', () => {
  let donor: IKeyringPair;

  before(async function() {
    await usingPlaygrounds(async (helper, privateKey) => {
      requirePalletsOrSkip(this, helper, [Pallets.ReFungible]);
      donor = await privateKey({filename: __filename});
    });
  });

  itEth('[cross] Check that transfer via EVM spend money from sponsor address', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);

    const {collectionAddress, collectionId} = await helper.eth.createERC721MetadataCompatibleRFTCollection(owner,'Sponsor collection', '1', '1', '');
    const sponsor = await helper.eth.createAccountWithBalance(donor);
    const sponsorCross = helper.ethCrossAccount.fromAddress(sponsor);
    const receiver = await helper.eth.createAccountWithBalance(donor);
    const collectionEvm = helper.ethNativeContract.collection(collectionAddress, 'rft', owner);

    await collectionEvm.methods.setCollectionSponsorCross(sponsorCross).send();
    await collectionEvm.methods.confirmCollectionSponsorship().send({from: sponsor});

    const user = await helper.eth.createAccountWithBalance(donor);
    const userCross = helper.ethCrossAccount.fromAddress(user);
    await collectionEvm.methods.addCollectionAdminCross(userCross).send();

    const result = await collectionEvm.methods.mintWithTokenURI(user, 'Test URI').send({from: user});
    const tokenId = result.events.Transfer.returnValues.tokenId;

    const tokenContract = helper.ethNativeContract.rftTokenById(collectionId, tokenId, user);    
    await tokenContract.methods.repartition(2).send();
    
    const ownerBalanceBefore = await helper.balance.getSubstrate(helper.address.ethToSubstrate(owner));
    const sponsorBalanceBefore = await helper.balance.getSubstrate(helper.address.ethToSubstrate(sponsor));
    const userBalanceBefore = await helper.balance.getSubstrate(helper.address.ethToSubstrate(user));

    await tokenContract.methods.transfer(receiver, 1).send();

    const ownerBalanceAfter = await helper.balance.getSubstrate(helper.address.ethToSubstrate(owner));
    expect(ownerBalanceAfter).to.be.eq(ownerBalanceBefore);
    const sponsorBalanceAfter = await helper.balance.getSubstrate(helper.address.ethToSubstrate(sponsor));
    expect(sponsorBalanceAfter < sponsorBalanceBefore).to.be.true;
    const userBalanceAfter = await helper.balance.getSubstrate(helper.address.ethToSubstrate(user));
    expect(userBalanceAfter).to.be.eq(userBalanceBefore);
  });

  itEth('[cross] Check that approve via EVM spend money from sponsor address', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);

    const {collectionAddress, collectionId} = await helper.eth.createERC721MetadataCompatibleRFTCollection(owner,'Sponsor collection', '1', '1', '');
    const sponsor = await helper.eth.createAccountWithBalance(donor);
    const sponsorCross = helper.ethCrossAccount.fromAddress(sponsor);
    const receiver = await helper.eth.createAccountWithBalance(donor);
    const collectionEvm = helper.ethNativeContract.collection(collectionAddress, 'rft', owner);

    await collectionEvm.methods.setCollectionSponsorCross(sponsorCross).send();
    await collectionEvm.methods.confirmCollectionSponsorship().send({from: sponsor});

    const user = await helper.eth.createAccountWithBalance(donor);
    const userCross = helper.ethCrossAccount.fromAddress(user);
    await collectionEvm.methods.addCollectionAdminCross(userCross).send();

    const result = await collectionEvm.methods.mintWithTokenURI(user, 'Test URI').send({from: user});
    const tokenId = result.events.Transfer.returnValues.tokenId;

    const tokenContract = helper.ethNativeContract.rftTokenById(collectionId, tokenId, user);    
    await tokenContract.methods.repartition(2).send();
    
    const ownerBalanceBefore = await helper.balance.getSubstrate(helper.address.ethToSubstrate(owner));
    const sponsorBalanceBefore = await helper.balance.getSubstrate(helper.address.ethToSubstrate(sponsor));
    const userBalanceBefore = await helper.balance.getSubstrate(helper.address.ethToSubstrate(user));

    await tokenContract.methods.approve(receiver, 1).send();

    const ownerBalanceAfter = await helper.balance.getSubstrate(helper.address.ethToSubstrate(owner));
    expect(ownerBalanceAfter).to.be.eq(ownerBalanceBefore);
    const sponsorBalanceAfter = await helper.balance.getSubstrate(helper.address.ethToSubstrate(sponsor));
    expect(sponsorBalanceAfter < sponsorBalanceBefore).to.be.true;
    const userBalanceAfter = await helper.balance.getSubstrate(helper.address.ethToSubstrate(user));
    expect(userBalanceAfter).to.be.eq(userBalanceBefore);
  });
  

  itEth('[cross] Check that transferFrom via EVM spend money from sponsor address', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);

    const {collectionAddress, collectionId} = await helper.eth.createERC721MetadataCompatibleRFTCollection(owner,'Sponsor collection', '1', '1', '');
    const sponsor = await helper.eth.createAccountWithBalance(donor);
    const sponsorCross = helper.ethCrossAccount.fromAddress(sponsor);
    const receiver = await helper.eth.createAccountWithBalance(donor);
    const collectionEvm = helper.ethNativeContract.collection(collectionAddress, 'rft', owner);

    await collectionEvm.methods.setCollectionSponsorCross(sponsorCross).send();
    await collectionEvm.methods.confirmCollectionSponsorship().send({from: sponsor});

    const user = await helper.eth.createAccountWithBalance(donor);
    const userCross = helper.ethCrossAccount.fromAddress(user);
    await collectionEvm.methods.addCollectionAdminCross(userCross).send();

    const result = await collectionEvm.methods.mintWithTokenURI(user, 'Test URI').send({from: user});
    const tokenId = result.events.Transfer.returnValues.tokenId;

    const tokenContract = helper.ethNativeContract.rftTokenById(collectionId, tokenId, user);    
    await tokenContract.methods.repartition(2).send();
    await tokenContract.methods.approve(receiver, 1).send();
    
    const ownerBalanceBefore = await helper.balance.getSubstrate(helper.address.ethToSubstrate(owner));
    const sponsorBalanceBefore = await helper.balance.getSubstrate(helper.address.ethToSubstrate(sponsor));
    const userBalanceBefore = await helper.balance.getSubstrate(helper.address.ethToSubstrate(user));
    const receiverBalanceBefore = await helper.balance.getSubstrate(helper.address.ethToSubstrate(receiver));

    const receiverTokenContract = helper.ethNativeContract.rftTokenById(collectionId, tokenId, receiver);   
    await receiverTokenContract.methods.transferFrom(user, receiver, 1).send();

    const receiverBalanceAfter = await helper.balance.getSubstrate(helper.address.ethToSubstrate(receiver));
    expect(receiverBalanceAfter).to.be.eq(receiverBalanceBefore);
    const ownerBalanceAfter = await helper.balance.getSubstrate(helper.address.ethToSubstrate(owner));
    expect(ownerBalanceAfter).to.be.eq(ownerBalanceBefore);
    const sponsorBalanceAfter = await helper.balance.getSubstrate(helper.address.ethToSubstrate(sponsor));
    expect(sponsorBalanceAfter < sponsorBalanceBefore).to.be.true;
    const userBalanceAfter = await helper.balance.getSubstrate(helper.address.ethToSubstrate(user));
    expect(userBalanceAfter).to.be.eq(userBalanceBefore);
  });
});
