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

import privateKey from '../substrate/privateKey';
import {expect} from 'chai';
import {
  contractHelpers,
  createEthAccountWithBalance,
  transferBalanceToEth,
  deployFlipper,
  itWeb3,
  SponsoringMode,
  createEthAccount,
  collectionIdToAddress,
  GAS_ARGS,
  normalizeEvents,
  subToEth,
  executeEthTxOnSub,
  evmCollectionHelpers,
  getCollectionAddressFromResult,
  evmCollection,
  ethBalanceViaSub,
} from './util/helpers';
import {
  addCollectionAdminExpectSuccess,
  createCollectionExpectSuccess,
  getDetailedCollectionInfo,
  transferBalanceTo,
} from '../util/helpers';
import nonFungibleAbi from './nonFungibleAbi.json';
import getBalance from '../substrate/get-balance';
import {evmToAddress} from '@polkadot/util-crypto';

describe('Sponsoring EVM contracts', () => {
  itWeb3('Sponsoring can be set by the address that has deployed the contract', async ({api, web3}) => {
    const owner = await createEthAccountWithBalance(api, web3);
    const flipper = await deployFlipper(web3, owner);
    const helpers = contractHelpers(web3, owner);
    expect(await helpers.methods.sponsoringEnabled(flipper.options.address).call()).to.be.false;
    await helpers.methods.setSponsoringMode(flipper.options.address, SponsoringMode.Allowlisted).send({from: owner});
    expect(await helpers.methods.sponsoringEnabled(flipper.options.address).call()).to.be.true;
  });

  itWeb3('Sponsoring cannot be set by the address that did not deployed the contract', async ({api, web3}) => {
    const owner = await createEthAccountWithBalance(api, web3);
    const notOwner = await createEthAccountWithBalance(api, web3);
    const flipper = await deployFlipper(web3, owner);
    const helpers = contractHelpers(web3, owner);
    expect(await helpers.methods.sponsoringEnabled(flipper.options.address).call()).to.be.false;
    await expect(helpers.methods.setSponsoringMode(notOwner, SponsoringMode.Allowlisted).send({from: notOwner})).to.rejected;
    expect(await helpers.methods.sponsoringEnabled(flipper.options.address).call()).to.be.false;
  });

  itWeb3('In generous mode, non-allowlisted user transaction will be sponsored', async ({api, web3}) => {
    const alice = privateKey('//Alice');

    const owner = await createEthAccountWithBalance(api, web3);
    const caller = await createEthAccountWithBalance(api, web3);

    const flipper = await deployFlipper(web3, owner);

    const helpers = contractHelpers(web3, owner);

    expect(await helpers.methods.sponsoringEnabled(flipper.options.address).call()).to.be.false;
    await helpers.methods.setSponsoringMode(flipper.options.address, SponsoringMode.Generous).send({from: owner});
    await helpers.methods.setSponsoringRateLimit(flipper.options.address, 0).send({from: owner});
    expect(await helpers.methods.sponsoringEnabled(flipper.options.address).call()).to.be.true;

    await transferBalanceToEth(api, alice, flipper.options.address);

    const originalFlipperBalance = await web3.eth.getBalance(flipper.options.address);
    expect(originalFlipperBalance).to.be.not.equal('0');

    await flipper.methods.flip().send({from: caller});
    expect(await flipper.methods.getValue().call()).to.be.true;

    // Balance should be taken from flipper instead of caller
    const balanceAfter = await web3.eth.getBalance(flipper.options.address);
    expect(+balanceAfter).to.be.lessThan(+originalFlipperBalance);
  });

  itWeb3('Sponsoring is set, an address that has no UNQ can send a transaction and it works. Sponsor balance should decrease (allowlisted)', async ({api, web3}) => {
    const alice = privateKey('//Alice');

    const owner = await createEthAccountWithBalance(api, web3);
    const caller = createEthAccount(web3);

    const flipper = await deployFlipper(web3, owner);

    const helpers = contractHelpers(web3, owner);
    await helpers.methods.toggleAllowlist(flipper.options.address, true).send({from: owner});
    await helpers.methods.toggleAllowed(flipper.options.address, caller, true).send({from: owner});

    expect(await helpers.methods.sponsoringEnabled(flipper.options.address).call()).to.be.false;
    await helpers.methods.setSponsoringMode(flipper.options.address, SponsoringMode.Allowlisted).send({from: owner});
    await helpers.methods.setSponsoringRateLimit(flipper.options.address, 0).send({from: owner});
    expect(await helpers.methods.sponsoringEnabled(flipper.options.address).call()).to.be.true;

    await transferBalanceToEth(api, alice, flipper.options.address);

    const originalFlipperBalance = await web3.eth.getBalance(flipper.options.address);
    expect(originalFlipperBalance).to.be.not.equal('0');

    await flipper.methods.flip().send({from: caller});
    expect(await flipper.methods.getValue().call()).to.be.true;

    // Balance should be taken from flipper instead of caller
    const balanceAfter = await web3.eth.getBalance(flipper.options.address);
    expect(+balanceAfter).to.be.lessThan(+originalFlipperBalance);
  });

  itWeb3('Sponsoring is set, an address that has no UNQ can send a transaction and it works. Sponsor balance should not decrease (non-allowlisted)', async ({api, web3}) => {
    const alice = privateKey('//Alice');

    const owner = await createEthAccountWithBalance(api, web3);
    const caller = createEthAccount(web3);

    const flipper = await deployFlipper(web3, owner);

    const helpers = contractHelpers(web3, owner);

    expect(await helpers.methods.sponsoringEnabled(flipper.options.address).call()).to.be.false;
    await helpers.methods.setSponsoringMode(flipper.options.address, SponsoringMode.Allowlisted).send({from: owner});
    await helpers.methods.setSponsoringRateLimit(flipper.options.address, 0).send({from: owner});
    expect(await helpers.methods.sponsoringEnabled(flipper.options.address).call()).to.be.true;

    await transferBalanceToEth(api, alice, flipper.options.address);

    const originalFlipperBalance = await web3.eth.getBalance(flipper.options.address);
    expect(originalFlipperBalance).to.be.not.equal('0');

    await expect(flipper.methods.flip().send({from: caller})).to.be.rejectedWith(/InvalidTransaction::Payment/);
    expect(await flipper.methods.getValue().call()).to.be.false;

    // Balance should be taken from flipper instead of caller
    const balanceAfter = await web3.eth.getBalance(flipper.options.address);
    expect(+balanceAfter).to.be.equals(+originalFlipperBalance);
  });

  itWeb3('Sponsoring is set, an address that has UNQ can send a transaction and it works. User balance should not change', async ({api, web3}) => {
    const alice = privateKey('//Alice');

    const owner = await createEthAccountWithBalance(api, web3);
    const caller = await createEthAccountWithBalance(api, web3);
    const originalCallerBalance = await web3.eth.getBalance(caller);

    const flipper = await deployFlipper(web3, owner);

    const helpers = contractHelpers(web3, owner);
    await helpers.methods.toggleAllowlist(flipper.options.address, true).send({from: owner});
    await helpers.methods.toggleAllowed(flipper.options.address, caller, true).send({from: owner});

    expect(await helpers.methods.sponsoringEnabled(flipper.options.address).call()).to.be.false;
    await helpers.methods.setSponsoringMode(flipper.options.address, SponsoringMode.Allowlisted).send({from: owner});
    await helpers.methods.setSponsoringRateLimit(flipper.options.address, 0).send({from: owner});
    expect(await helpers.methods.sponsoringEnabled(flipper.options.address).call()).to.be.true;

    await transferBalanceToEth(api, alice, flipper.options.address);

    const originalFlipperBalance = await web3.eth.getBalance(flipper.options.address);
    expect(originalFlipperBalance).to.be.not.equal('0');

    await flipper.methods.flip().send({from: caller});
    expect(await flipper.methods.getValue().call()).to.be.true;

    expect(await web3.eth.getBalance(caller)).to.be.equals(originalCallerBalance);
  });

  itWeb3('Sponsoring is limited, with setContractRateLimit. The limitation is working if transactions are sent more often, the sender pays the commission.', async ({api, web3}) => {
    const alice = privateKey('//Alice');

    const owner = await createEthAccountWithBalance(api, web3);
    const caller = await createEthAccountWithBalance(api, web3);
    const originalCallerBalance = await web3.eth.getBalance(caller);

    const flipper = await deployFlipper(web3, owner);

    const helpers = contractHelpers(web3, owner);
    await helpers.methods.toggleAllowlist(flipper.options.address, true).send({from: owner});
    await helpers.methods.toggleAllowed(flipper.options.address, caller, true).send({from: owner});

    expect(await helpers.methods.sponsoringEnabled(flipper.options.address).call()).to.be.false;
    await helpers.methods.setSponsoringMode(flipper.options.address, SponsoringMode.Allowlisted).send({from: owner});
    await helpers.methods.setSponsoringRateLimit(flipper.options.address, 10).send({from: owner});
    expect(await helpers.methods.sponsoringEnabled(flipper.options.address).call()).to.be.true;

    await transferBalanceToEth(api, alice, flipper.options.address);

    const originalFlipperBalance = await web3.eth.getBalance(flipper.options.address);
    expect(originalFlipperBalance).to.be.not.equal('0');

    await flipper.methods.flip().send({from: caller});
    expect(await flipper.methods.getValue().call()).to.be.true;
    expect(await web3.eth.getBalance(caller)).to.be.equals(originalCallerBalance);

    const newFlipperBalance = await web3.eth.getBalance(flipper.options.address);
    expect(newFlipperBalance).to.be.not.equals(originalFlipperBalance);

    await flipper.methods.flip().send({from: caller});
    expect(await web3.eth.getBalance(flipper.options.address)).to.be.equal(newFlipperBalance);
    expect(await web3.eth.getBalance(caller)).to.be.not.equals(originalCallerBalance);
  });

  // TODO: Find a way to calculate default rate limit
  itWeb3('Default rate limit equals 7200', async ({api, web3}) => {
    const owner = await createEthAccountWithBalance(api, web3);
    const flipper = await deployFlipper(web3, owner);
    const helpers = contractHelpers(web3, owner);
    expect(await helpers.methods.getSponsoringRateLimit(flipper.options.address).call()).to.be.equals('7200');
  });

  itWeb3('Sponsoring collection from evm address via access list', async ({api, web3}) => {
    const owner = await createEthAccountWithBalance(api, web3);
    const collectionHelpers = evmCollectionHelpers(web3, owner);
    let result = await collectionHelpers.methods.createNonfungibleCollection('Sponsor collection', '1', '1').send();
    const {collectionIdAddress, collectionId} = await getCollectionAddressFromResult(api, result);
    const sponsor = await createEthAccountWithBalance(api, web3);
    const collectionEvm = evmCollection(web3, owner, collectionIdAddress);
    result = await collectionEvm.methods.setCollectionSponsor(sponsor).send({from: owner});
    let collectionSub = (await getDetailedCollectionInfo(api, collectionId))!;
    expect(collectionSub.sponsorship.isUnconfirmed).to.be.true;
    expect(collectionSub.sponsorship.asUnconfirmed.toHuman()).to.be.eq(evmToAddress(sponsor));
    await expect(collectionEvm.methods.confirmCollectionSponsorship().call()).to.be.rejectedWith('Caller is not set as sponsor');

    await collectionEvm.methods.confirmCollectionSponsorship().send({from: sponsor});
    collectionSub = (await getDetailedCollectionInfo(api, collectionId))!;
    expect(collectionSub.sponsorship.isConfirmed).to.be.true;
    expect(collectionSub.sponsorship.asConfirmed.toHuman()).to.be.eq(evmToAddress(sponsor));

    const user = createEthAccount(web3);
    let nextTokenId = await collectionEvm.methods.nextTokenId().call();
    expect(nextTokenId).to.be.equal('1');

    const oldPermissions = (await getDetailedCollectionInfo(api, collectionId))!.permissions.toHuman();
    expect(oldPermissions.mintMode).to.be.false;
    expect(oldPermissions.access).to.be.equal('Normal');

    //TODO: change value, when enum generated
    await collectionEvm.methods.setCollectionAccess(1 /*'AllowList'*/).send({from: owner});
    await collectionEvm.methods.addToCollectionAllowList(user).send({from: owner});
    await collectionEvm.methods.setCollectionMintMode(true).send({from: owner});

    const newPermissions = (await getDetailedCollectionInfo(api, collectionId))!.permissions.toHuman();
    expect(newPermissions.mintMode).to.be.true;
    expect(newPermissions.access).to.be.equal('AllowList');

    const ownerBalanceBefore = await ethBalanceViaSub(api, owner);
    const sponsorBalanceBefore = await ethBalanceViaSub(api, sponsor);

    nextTokenId = await collectionEvm.methods.nextTokenId().call({from: user});
    expect(nextTokenId).to.be.equal('1');
    result = await collectionEvm.methods.mintWithTokenURI(
      user,
      nextTokenId,
      'Test URI',
    ).send({from: user});
    const events = normalizeEvents(result.events);
    events[0].address = events[0].address.toLocaleLowerCase();

    expect(events).to.be.deep.equal([
      {
        address: collectionIdAddress.toLocaleLowerCase(),
        event: 'Transfer',
        args: {
          from: '0x0000000000000000000000000000000000000000',
          to: user,
          tokenId: nextTokenId,
        },
      },
    ]);

    expect(await collectionEvm.methods.tokenURI(nextTokenId).call()).to.be.equal('Test URI');

    const ownerBalanceAfter = await ethBalanceViaSub(api, owner);
    expect(ownerBalanceAfter).to.be.eq(ownerBalanceBefore);
    const sponsorBalanceAfter = await ethBalanceViaSub(api, sponsor);
    expect(sponsorBalanceAfter < sponsorBalanceBefore).to.be.true;
  });

  itWeb3('Check that transaction via EVM spend money from sponsor address', async ({api, web3}) => {
    const owner = await createEthAccountWithBalance(api, web3);
    const collectionHelpers = evmCollectionHelpers(web3, owner);
    let result = await collectionHelpers.methods.createNonfungibleCollection('Sponsor collection', '1', '1').send();
    const {collectionIdAddress, collectionId} = await getCollectionAddressFromResult(api, result);
    const sponsor = await createEthAccountWithBalance(api, web3);
    const collectionEvm = evmCollection(web3, owner, collectionIdAddress);
    result = await collectionEvm.methods.setCollectionSponsor(sponsor).send();
    let collectionSub = (await getDetailedCollectionInfo(api, collectionId))!;
    expect(collectionSub.sponsorship.isUnconfirmed).to.be.true;
    expect(collectionSub.sponsorship.asUnconfirmed.toHuman()).to.be.eq(evmToAddress(sponsor));
    await expect(collectionEvm.methods.confirmCollectionSponsorship().call()).to.be.rejectedWith('Caller is not set as sponsor');
    const sponsorCollection = evmCollection(web3, sponsor, collectionIdAddress);
    await sponsorCollection.methods.confirmCollectionSponsorship().send();
    collectionSub = (await getDetailedCollectionInfo(api, collectionId))!;
    expect(collectionSub.sponsorship.isConfirmed).to.be.true;
    expect(collectionSub.sponsorship.asConfirmed.toHuman()).to.be.eq(evmToAddress(sponsor));

    const user = createEthAccount(web3);
    await collectionEvm.methods.addCollectionAdmin(user).send();
    
    const ownerBalanceBefore = await ethBalanceViaSub(api, owner);
    const sponsorBalanceBefore = await ethBalanceViaSub(api, sponsor);
  
    const userCollectionEvm = evmCollection(web3, user, collectionIdAddress);
    const nextTokenId = await userCollectionEvm.methods.nextTokenId().call();
    expect(nextTokenId).to.be.equal('1');
    result = await userCollectionEvm.methods.mintWithTokenURI(
      user,
      nextTokenId,
      'Test URI',
    ).send();

    const events = normalizeEvents(result.events);
    const address = collectionIdToAddress(collectionId);

    expect(events).to.be.deep.equal([
      {
        address,
        event: 'Transfer',
        args: {
          from: '0x0000000000000000000000000000000000000000',
          to: user,
          tokenId: nextTokenId,
        },
      },
    ]);
    expect(await userCollectionEvm.methods.tokenURI(nextTokenId).call()).to.be.equal('Test URI');
  
    const ownerBalanceAfter = await ethBalanceViaSub(api, owner);
    expect(ownerBalanceAfter).to.be.eq(ownerBalanceBefore);
    const sponsorBalanceAfter = await ethBalanceViaSub(api, sponsor);
    expect(sponsorBalanceAfter < sponsorBalanceBefore).to.be.true;
  });
});
