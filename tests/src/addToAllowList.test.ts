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
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {usingPlaygrounds} from './util/playgrounds';

chai.use(chaiAsPromised);
const expect = chai.expect;

let donor: IKeyringPair;

before(async () => {
  await usingPlaygrounds(async (_, privateKeyWrapper) => {
    donor = privateKeyWrapper('//Alice');
  });
});

describe('Integration Test ext. addToAllowList()', () => {
  it('Execute the extrinsic with parameters: Collection ID and address to add to the allow list', async () => {
    await usingPlaygrounds(async (helper) => {
      const [alice, bob] = await helper.arrange.creteAccounts([10n, 0n], donor);
      const collection = await helper.act.createNFTCollection(alice).expectSuccess();

      await collection.addToAllowList(alice, {Substrate: bob.address});

      const allowList = await collection.getAllowList();
      expect(allowList).to.deep.contain({Substrate: bob.address});
    });
  });

  it('Allowlisted minting: list restrictions', async () => {
    await usingPlaygrounds(async (helper) => {
      const [alice, bob] = await helper.arrange.creteAccounts([10n, 10n], donor);
      const collection = await helper.act.createNFTCollection(alice).expectSuccess();

      await collection.setPermissions(alice, {access: 'AllowList', mintMode: true});
      
      const collectionAfter = await collection.getData();
      expect(collectionAfter?.raw.permissions).to.have.property('access').which.is.equal('AllowList');
      expect(collectionAfter?.raw.permissions).to.have.property('mintMode').which.is.equal(true);

      await collection.addToAllowList(alice, {Substrate: bob.address});
      const token = await collection.mintToken(bob, {Substrate: bob.address});
      expect(await token.getData()).not.null;
    });
  });
});

describe('Negative Integration Test ext. addToAllowList()', () => {
  it('Allow list an address in the collection that does not exist', async () => {
    await usingPlaygrounds(async (helper) => {
      const [alice, bob] = await helper.arrange.creteAccounts([10n, 10n], donor);
      const collectionId = 99999;

      await expect(helper.collection.addToAllowList(alice, collectionId, {Substrate: bob.address})).to.be.rejected;
    });
  });

  it('Allow list an address in the collection that was destroyed', async () => {
    await usingPlaygrounds(async (helper) => {
      const [alice, bob] = await helper.arrange.creteAccounts([10n, 10n], donor);
      const collection = await helper.act.createNFTCollection(alice).expectSuccess();
      
      expect(await collection.burn(alice)).to.be.true;
      await expect(collection.addToAllowList(alice, {Substrate: bob.address})).to.be.rejected;
    });
  });

  it('Allow list an address in the collection that does not have allow list access enabled', async () => {
    await usingPlaygrounds(async (helper) => {
      const [alice, bob] = await helper.arrange.creteAccounts([10n, 10n], donor);
      const collection = await helper.act.createNFTCollection(alice).expectSuccess();

      await collection.setPermissions(alice, {access: 'AllowList', mintMode: true});
      await expect(collection.mintToken(bob, {Substrate: bob.address})).to.be.rejected;
      expect(await collection.getLastTokenId()).to.be.equal(0);
    });
  });
});

describe('Integration Test ext. addToAllowList() with collection admin permissions:', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;
  let charlie: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper) => {
      [alice, bob, charlie] = await helper.arrange.creteAccounts([20n, 20n, 20n], donor);
    });
  });

  it('Negative. Add to the allow list by regular user', async () => {
    await usingPlaygrounds(async (helper) => {
      const collection = await helper.act.createNFTCollection(alice).expectSuccess();
      await expect(collection.addToAllowList(bob, {Substrate: charlie.address})).to.be.rejected;
    });
  });

  it('Execute the extrinsic with parameters: Collection ID and address to add to the allow list', async () => {
    await usingPlaygrounds(async (helper) =>  {
      const collection = await helper.act.createNFTCollection(alice).expectSuccess();
      await collection.addAdmin(alice, {Substrate: bob.address});
      await collection.addToAllowList(bob, {Substrate: charlie.address});
      expect(await collection.getAllowList()).to.deep.contains({Substrate: charlie.address});
    });
  });

  it('Allowlisted minting: list restrictions', async () => {
    await usingPlaygrounds(async (helper) => {
      const collection = await helper.act.createNFTCollection(alice).expectSuccess();
      await collection.addAdmin(alice, {Substrate: bob.address});
      await collection.addToAllowList(bob, {Substrate: charlie.address});
      expect(await collection.getAllowList()).to.deep.contains({Substrate: charlie.address});

      // allowed only for collection owner
      // TODO bob and charlie are not allowed
      await collection.setPermissions(alice, {access: 'AllowList', mintMode: true});
      await collection.mintToken(charlie, {Substrate: charlie.address});
      expect(await collection.getLastTokenId()).to.be.equal(1);
    });
  });
});
