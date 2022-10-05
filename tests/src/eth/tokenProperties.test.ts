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

import {itEth, usingEthPlaygrounds, expect, cartesian} from './util/playgrounds';
import {IKeyringPair} from '@polkadot/types/types';

describe('EVM token properties', () => {
  let donor: IKeyringPair;
  let alice: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (helper, privateKey) => {
      donor = await privateKey({filename: __filename});
      [alice] = await helper.arrange.createAccounts([100n], donor);
    });
  });

  itEth('Can be reconfigured', async({helper}) => {
    const caller = await helper.eth.createAccountWithBalance(donor);
    for(const [mutable,collectionAdmin, tokenOwner] of cartesian([], [false, true], [false, true], [false, true])) {
      const collection = await helper.nft.mintCollection(alice);
      await collection.addAdmin(alice, {Ethereum: caller});
      
      const address = helper.ethAddress.fromCollectionId(collection.collectionId);
      const contract = helper.ethNativeContract.collection(address, 'nft', caller);
  
      await contract.methods.setTokenPropertyPermission('testKey', mutable, collectionAdmin, tokenOwner).send({from: caller});
  
      expect(await collection.getPropertyPermissions()).to.be.deep.equal([{
        key: 'testKey',
        permission: {mutable, collectionAdmin, tokenOwner},
      }]);
    }
  });

  itEth('Can be set', async({helper}) => {
    const caller = await helper.eth.createAccountWithBalance(donor);
    const collection = await helper.nft.mintCollection(alice);
    const token = await collection.mintToken(alice);

    await collection.setTokenPropertyPermissions(alice, [{
      key: 'testKey',
      permission: {
        collectionAdmin: true,
      },
    }]);

    await collection.addAdmin(alice, {Ethereum: caller});

    const address = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = helper.ethNativeContract.collection(address, 'nft', caller);

    await contract.methods.setProperty(token.tokenId, 'testKey', Buffer.from('testValue')).send({from: caller});

    const [{value}] = await token.getProperties(['testKey']);
    expect(value).to.equal('testValue');
  });

  itEth('Can be deleted', async({helper}) => {
    const caller = await helper.eth.createAccountWithBalance(donor);
    const collection = await helper.nft.mintCollection(alice);
    const token = await collection.mintToken(alice);

    await collection.setTokenPropertyPermissions(alice, [{
      key: 'testKey',
      permission: {
        mutable: true,
        collectionAdmin: true,
      },
    }]);
    await token.setProperties(alice, [{key: 'testKey', value: 'testValue'}]);

    await collection.addAdmin(alice, {Ethereum: caller});

    const address = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = helper.ethNativeContract.collection(address, 'nft', caller);

    await contract.methods.deleteProperty(token.tokenId, 'testKey').send({from: caller});

    const result = await token.getProperties(['testKey']);
    expect(result.length).to.equal(0);
  });

  itEth('Can be read', async({helper}) => {
    const caller = helper.eth.createAccount();
    const collection = await helper.nft.mintCollection(alice);
    const token = await collection.mintToken(alice);

    await collection.setTokenPropertyPermissions(alice, [{
      key: 'testKey',
      permission: {
        collectionAdmin: true,
      },
    }]);
    await token.setProperties(alice, [{key: 'testKey', value: 'testValue'}]);

    const address = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = helper.ethNativeContract.collection(address, 'nft', caller);

    const value = await contract.methods.property(token.tokenId, 'testKey').call();
    expect(value).to.equal(helper.getWeb3().utils.toHex('testValue'));
  });
});
