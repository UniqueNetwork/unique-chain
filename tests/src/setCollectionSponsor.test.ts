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

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {IKeyringPair} from '@polkadot/types/types';
import {itSub, usingPlaygrounds, Pallets} from './util/playgrounds';

chai.use(chaiAsPromised);
const expect = chai.expect;

describe('integration test: ext. setCollectionSponsor():', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;
  let charlie: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      const donor = privateKey('//Alice');
      [alice, bob, charlie] = await helper.arrange.createAccounts([20n, 10n, 10n], donor);
    });
  });

  itSub('Set NFT collection sponsor', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'SetCollectionSponsor-1-NFT', tokenPrefix: 'SCS'});
    await expect(collection.setSponsor(alice, bob.address)).to.be.not.rejected;

    expect((await collection.getData())?.raw.sponsorship).to.deep.equal({
      Unconfirmed: bob.address,
    });
  });
  
  itSub('Set Fungible collection sponsor', async ({helper}) => {
    const collection = await helper.ft.mintCollection(alice, {name: 'SetCollectionSponsor-1-FT', tokenPrefix: 'SCS'});
    await expect(collection.setSponsor(alice, bob.address)).to.be.not.rejected;

    expect((await collection.getData())?.raw.sponsorship).to.deep.equal({
      Unconfirmed: bob.address,
    });
  });

  itSub.ifWithPallets('Set ReFungible collection sponsor', [Pallets.ReFungible], async ({helper}) => {
    const collection = await helper.rft.mintCollection(alice, {name: 'SetCollectionSponsor-1-RFT', tokenPrefix: 'SCS'});
    await expect(collection.setSponsor(alice, bob.address)).to.be.not.rejected;

    expect((await collection.getData())?.raw.sponsorship).to.deep.equal({
      Unconfirmed: bob.address,
    });
  });

  itSub('Set the same sponsor repeatedly', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'SetCollectionSponsor-2', tokenPrefix: 'SCS'});
    await expect(collection.setSponsor(alice, bob.address)).to.be.not.rejected;
    await expect(collection.setSponsor(alice, bob.address)).to.be.not.rejected;

    expect((await collection.getData())?.raw.sponsorship).to.deep.equal({
      Unconfirmed: bob.address,
    });
  });

  itSub('Replace collection sponsor', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'SetCollectionSponsor-3', tokenPrefix: 'SCS'});
    await expect(collection.setSponsor(alice, bob.address)).to.be.not.rejected;
    await expect(collection.setSponsor(alice, charlie.address)).to.be.not.rejected;

    expect((await collection.getData())?.raw.sponsorship).to.deep.equal({
      Unconfirmed: charlie.address,
    });
  });
  
  itSub('Collection admin add sponsor', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'SetCollectionSponsor-4', tokenPrefix: 'SCS'});
    await collection.addAdmin(alice, {Substrate: bob.address});
    await expect(collection.setSponsor(bob, charlie.address)).to.be.not.rejected;

    expect((await collection.getData())?.raw.sponsorship).to.deep.equal({
      Unconfirmed: charlie.address,
    });
  });
});

describe('(!negative test!) integration test: ext. setCollectionSponsor():', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      const donor = privateKey('//Alice');
      [alice, bob] = await helper.arrange.createAccounts([10n, 5n], donor);
    });
  });

  itSub('(!negative test!) Add sponsor with a non-owner', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'SetCollectionSponsor-Neg-1', tokenPrefix: 'SCS'});
    await expect(collection.setSponsor(bob, bob.address))
      .to.be.rejectedWith(/common\.NoPermission/);
  });

  itSub('(!negative test!) Add sponsor to a collection that never existed', async ({helper}) => {
    const collectionId = (1 << 32) - 1;
    await expect(helper.collection.setSponsor(alice, collectionId, bob.address))
      .to.be.rejectedWith(/common\.CollectionNotFound/);
  });

  itSub('(!negative test!) Add sponsor to a collection that was destroyed', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'SetCollectionSponsor-Neg-2', tokenPrefix: 'SCS'});
    await collection.burn(alice);
    await expect(collection.setSponsor(alice, bob.address))
      .to.be.rejectedWith(/common\.CollectionNotFound/);
  });
});
