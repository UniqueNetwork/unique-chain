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

// https://unique-network.readthedocs.io/en/latest/jsapi.html#setchainlimits
import {IKeyringPair} from '@polkadot/types/types';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {itSub, usingPlaygrounds} from './util/playgrounds';

chai.use(chaiAsPromised);
const expect = chai.expect;

const accountTokenOwnershipLimit = 0;
const sponsoredDataSize = 0;
const sponsorTransferTimeout = 1;
const tokenLimit = 10;

describe('setCollectionLimits positive', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      const donor = privateKey('//Alice');
      [alice, bob] = await helper.arrange.createAccounts([20n, 10n], donor);
    });
  });

  itSub('execute setCollectionLimits with predefined params', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'SetCollectionLimits-1', tokenPrefix: 'SCL'});

    await collection.setLimits(
      alice,
      {
        accountTokenOwnershipLimit,
        sponsoredDataSize,
        tokenLimit,
        sponsorTransferTimeout,
        ownerCanTransfer: true,
        ownerCanDestroy: true,
      },
    );

    // get collection limits defined previously
    const collectionInfo = await collection.getEffectiveLimits();

    expect(collectionInfo.accountTokenOwnershipLimit).to.be.equal(accountTokenOwnershipLimit);
    expect(collectionInfo.sponsoredDataSize).to.be.equal(sponsoredDataSize);
    expect(collectionInfo.tokenLimit).to.be.equal(tokenLimit);
    expect(collectionInfo.sponsorTransferTimeout).to.be.equal(sponsorTransferTimeout);
    expect(collectionInfo.ownerCanTransfer).to.be.true;
    expect(collectionInfo.ownerCanDestroy).to.be.true;
  });

  itSub('Set the same token limit twice', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'SetCollectionLimits-2', tokenPrefix: 'SCL'});

    const collectionLimits = {
      accountTokenOwnershipLimit,
      sponsoredDataSize,
      tokenLimit,
      sponsorTransferTimeout,
      ownerCanTransfer: true,
      ownerCanDestroy: true,
    };

    await collection.setLimits(alice, collectionLimits);

    const collectionInfo1 = await collection.getEffectiveLimits();
      
    expect(collectionInfo1.tokenLimit).to.be.equal(tokenLimit);

    await collection.setLimits(alice, collectionLimits);
    const collectionInfo2 = await collection.getEffectiveLimits();
    expect(collectionInfo2.tokenLimit).to.be.equal(tokenLimit);
  });

  itSub('execute setCollectionLimits from admin collection', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'SetCollectionLimits-3', tokenPrefix: 'SCL'});
    await collection.addAdmin(alice, {Substrate: bob.address});

    const collectionLimits = {
      accountTokenOwnershipLimit,
      sponsoredDataSize,
      // sponsoredMintSize,
      tokenLimit,
    };

    await expect(collection.setLimits(alice, collectionLimits)).to.not.be.rejected;
  });
});

describe('setCollectionLimits negative', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      const donor = privateKey('//Alice');
      [alice, bob] = await helper.arrange.createAccounts([20n, 10n], donor);
    });
  });
  
  itSub('execute setCollectionLimits for not exists collection', async ({helper}) => {
    const nonExistentCollectionId = (1 << 32) - 1;
    await expect(helper.collection.setLimits(
      alice,
      nonExistentCollectionId,
      {
        accountTokenOwnershipLimit,
        sponsoredDataSize,
        // sponsoredMintSize,
        tokenLimit,
      },
    )).to.be.rejectedWith(/common\.CollectionNotFound/);
  });

  itSub('execute setCollectionLimits from user who is not owner of this collection', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'SetCollectionLimits-Neg-1', tokenPrefix: 'SCL'});

    await expect(collection.setLimits(bob, {
      accountTokenOwnershipLimit,
      sponsoredDataSize,
      // sponsoredMintSize,
      tokenLimit,
    })).to.be.rejectedWith(/common\.NoPermission/);
  });

  itSub('fails when trying to enable OwnerCanTransfer after it was disabled', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'SetCollectionLimits-Neg-2', tokenPrefix: 'SCL'});

    await collection.setLimits(alice, {
      accountTokenOwnershipLimit,
      sponsoredDataSize,
      tokenLimit,
      sponsorTransferTimeout,
      ownerCanTransfer: false,
      ownerCanDestroy: true,
    });

    await expect(collection.setLimits(alice, {
      accountTokenOwnershipLimit,
      sponsoredDataSize,
      tokenLimit,
      sponsorTransferTimeout,
      ownerCanTransfer: true,
      ownerCanDestroy: true,
    })).to.be.rejectedWith(/common\.OwnerPermissionsCantBeReverted/);
  });

  itSub('fails when trying to enable OwnerCanDestroy after it was disabled', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'SetCollectionLimits-Neg-3', tokenPrefix: 'SCL'});

    await collection.setLimits(alice, {
      accountTokenOwnershipLimit,
      sponsoredDataSize,
      tokenLimit,
      sponsorTransferTimeout,
      ownerCanTransfer: true,
      ownerCanDestroy: false,
    });

    await expect(collection.setLimits(alice, {
      accountTokenOwnershipLimit,
      sponsoredDataSize,
      tokenLimit,
      sponsorTransferTimeout,
      ownerCanTransfer: true,
      ownerCanDestroy: true,
    })).to.be.rejectedWith(/common\.OwnerPermissionsCantBeReverted/);
  });

  itSub('Setting the higher token limit fails', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'SetCollectionLimits-Neg-4', tokenPrefix: 'SCL'});
      
    const collectionLimits = {
      accountTokenOwnershipLimit: accountTokenOwnershipLimit,
      sponsoredMintSize: sponsoredDataSize,
      tokenLimit: tokenLimit,
      sponsorTransferTimeout,
      ownerCanTransfer: true,
      ownerCanDestroy: true,
    };

    // The first time
    await collection.setLimits(alice, collectionLimits);

    // The second time - higher token limit
    collectionLimits.tokenLimit += 1;
    await expect(collection.setLimits(alice, collectionLimits)).to.be.rejectedWith(/common\.CollectionTokenLimitExceeded/);
  });
});
