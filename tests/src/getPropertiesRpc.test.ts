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
import {itSub, Pallets, requirePalletsOrSkip, usingPlaygrounds, expect} from './util/playgrounds';
import {UniqueHelper, UniqueBaseCollection, UniqueNFTCollection, UniqueNFToken} from './util/playgrounds/unique';

const collectionProps = [
  {key: 'col-0', value: 'col-0-value'},
  {key: 'col-1', value: 'col-1-value'},
];

const tokenProps = [
  {key: 'tok-0', value: 'tok-0-value'},
  {key: 'tok-1', value: 'tok-1-value'},
];

const tokPropPermission = {
  mutable: false,
  tokenOwner: true,
  collectionAdmin: false,
};

const tokenPropPermissions = [
  {
    key: 'tok-0',
    permission: tokPropPermission,
  },
  {
    key: 'tok-1',
    permission: tokPropPermission,
  },
];

describe('query properties RPC', () => {
  let alice: IKeyringPair;

  const mintCollection = async (helper: UniqueHelper) => {
    return await helper.nft.mintCollection(alice, {
      tokenPrefix: 'prps',
      properties: collectionProps,
      tokenPropertyPermissions: tokenPropPermissions,
    });
  };

  const mintToken = async (collection: UniqueNFTCollection) => {
    return await collection.mintToken(alice, {Substrate: alice.address}, tokenProps);
  };


  before(async () => {
    await usingPlaygrounds(async (_, privateKey) => {
      alice = privateKey('//Alice');
    });
  });

  itSub('query empty collection key set', async ({helper}) => {
    const collection = await mintCollection(helper);
    const props = await collection.getProperties([]);
    expect(props).to.be.empty;
  });

  itSub('query empty token key set', async ({helper}) => {
    const collection = await mintCollection(helper);
    const token = await mintToken(collection);
    const props = await token.getProperties([]);
    expect(props).to.be.empty;
  });

  itSub('query empty token key permissions set', async ({helper}) => {
    const collection = await mintCollection(helper);
    const propPermissions = await collection.getPropertyPermissions([]);
    expect(propPermissions).to.be.empty;
  });

  itSub('query all collection props by null arg', async ({helper}) => {
    const collection = await mintCollection(helper);
    const props = await collection.getProperties(null);
    expect(props).to.be.deep.equal(collectionProps);
  });

  itSub('query all token props by null arg', async ({helper}) => {
    const collection = await mintCollection(helper);
    const token = await mintToken(collection);
    const props = await token.getProperties(null);
    expect(props).to.be.deep.equal(tokenProps);
  });

  itSub('query empty token key permissions by null arg', async ({helper}) => {
    const collection = await mintCollection(helper);
    const propPermissions = await collection.getPropertyPermissions(null);
    expect(propPermissions).to.be.deep.equal(tokenPropPermissions);
  });

  itSub('query all collection props by undefined arg', async ({helper}) => {
    const collection = await mintCollection(helper);
    const props = await collection.getProperties();
    expect(props).to.be.deep.equal(collectionProps);
  });

  itSub('query all token props by undefined arg', async ({helper}) => {
    const collection = await mintCollection(helper);
    const token = await mintToken(collection);
    const props = await token.getProperties();
    expect(props).to.be.deep.equal(tokenProps);
  });

  itSub('query empty token key permissions by undefined arg', async ({helper}) => {
    const collection = await mintCollection(helper);
    const propPermissions = await collection.getPropertyPermissions();
    expect(propPermissions).to.be.deep.equal(tokenPropPermissions);
  });
});
