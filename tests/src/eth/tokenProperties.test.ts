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

import {itEth, usingEthPlaygrounds, expect, EthUniqueHelper} from './util';
import {IKeyringPair} from '@polkadot/types/types';
import {ITokenPropertyPermission, TCollectionMode} from '../util/playgrounds/types';
import {Pallets} from '../util';
import {UniqueNFTCollection, UniqueRFTCollection} from '../util/playgrounds/unique';

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

  [
    {
      method: 'setProperties',
      methodParams: [[{key: 'testKey1', value: Buffer.from('testValue1')}, {key: 'testKey2', value: Buffer.from('testValue2')}]],
      expectedProps: [{key: 'testKey1', value: 'testValue1'}, {key: 'testKey2', value: 'testValue2'}],
    },
    {
      method: 'setProperty' /*Soft-deprecated*/, 
      methodParams: ['testKey1', Buffer.from('testValue1')],
      expectedProps: [{key: 'testKey1', value: 'testValue1'}],
    },
  ].map(testCase => 
    itEth(`[${testCase.method}] Can be set`, async({helper}) => {
      const caller = await helper.eth.createAccountWithBalance(donor);
      const collection = await helper.nft.mintCollection(alice, {
        tokenPropertyPermissions: [{
          key: 'testKey1',
          permission: {
            collectionAdmin: true,
          },
        }, {
          key: 'testKey2',
          permission: {
            collectionAdmin: true,
          },
        }],
      });

      await collection.addAdmin(alice, {Ethereum: caller});
      const token = await collection.mintToken(alice);
  
      const collectionEvm = helper.ethNativeContract.collectionById(collection.collectionId, 'nft', caller, testCase.method === 'setProperty');
  
      await collectionEvm.methods[testCase.method](token.tokenId, ...testCase.methodParams).send({from: caller});
  
      const properties = await token.getProperties();
      expect(properties).to.deep.equal(testCase.expectedProps);
    }));
  
  async function checkProps(helper: EthUniqueHelper, mode: TCollectionMode) {
    const caller = await helper.eth.createAccountWithBalance(donor);
    
    const properties = Array(5).fill(0).map((_, i) => { return {key: `key_${i}`, value: Buffer.from(`value_${i}`)}; });
    const permissions: ITokenPropertyPermission[] = properties.map(p => { return {key: p.key, permission: {tokenOwner: true,
      collectionAdmin: true,
      mutable: true}}; });
    
    const collection = await helper[mode].mintCollection(alice, {
      tokenPrefix: 'ethp',
      tokenPropertyPermissions: permissions,
    }) as UniqueNFTCollection | UniqueRFTCollection;
    
    const token = await collection.mintToken(alice);
    
    const valuesBefore = await token.getProperties(properties.map(p => p.key));
    expect(valuesBefore).to.be.deep.equal([]);
    
    
    await collection.addAdmin(alice, {Ethereum: caller});
    
    const address = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = helper.ethNativeContract.collection(address, mode, caller);
    
    expect(await contract.methods.properties(token.tokenId, []).call()).to.be.deep.equal([]);

    await contract.methods.setProperties(token.tokenId, properties).send({from: caller});

    const values = await token.getProperties(properties.map(p => p.key));
    expect(values).to.be.deep.equal(properties.map(p => { return {key: p.key, value: p.value.toString()}; }));
    
    expect(await contract.methods.properties(token.tokenId, []).call()).to.be.like(properties
      .map(p => { return helper.ethProperty.property(p.key, p.value.toString()); }));
    
    expect(await contract.methods.properties(token.tokenId, [properties[0].key]).call())
      .to.be.like([helper.ethProperty.property(properties[0].key, properties[0].value.toString())]);
  }
  
  itEth('Can be multiple set/read for NFT ', async({helper}) => {
    await checkProps(helper, 'nft');
  });
  
  itEth.ifWithPallets('Can be multiple set/read for RFT ', [Pallets.ReFungible], async({helper}) => {
    await checkProps(helper, 'rft');
  });
  
  itEth('Can be deleted', async({helper}) => {
    const caller = await helper.eth.createAccountWithBalance(donor);
    const collection = await helper.nft.mintCollection(alice, {
      tokenPropertyPermissions: [{
        key: 'testKey',
        permission: {
          mutable: true,
          collectionAdmin: true,
        },
      },
      {
        key: 'testKey_1',
        permission: {
          mutable: true,
          collectionAdmin: true,
        },
      }],
    });
    
    const token = await collection.mintToken(alice);
    await token.setProperties(alice, [{key: 'testKey', value: 'testValue'}, {key: 'testKey_1', value: 'testValue_1'}]);

    await collection.addAdmin(alice, {Ethereum: caller});

    const address = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = helper.ethNativeContract.collection(address, 'nft', caller);

    await contract.methods.deleteProperties(token.tokenId, ['testKey', 'testKey_1']).send({from: caller});

    const result = await token.getProperties(['testKey']);
    expect(result.length).to.equal(0);
  });

  itEth('Can be read', async({helper}) => {
    const caller = helper.eth.createAccount();
    const collection = await helper.nft.mintCollection(alice, {
      tokenPropertyPermissions: [{
        key: 'testKey',
        permission: {
          collectionAdmin: true,
        },
      }],
    });
  
    const token = await collection.mintToken(alice);
    await token.setProperties(alice, [{key: 'testKey', value: 'testValue'}]);

    const address = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = helper.ethNativeContract.collection(address, 'nft', caller);

    const value = await contract.methods.property(token.tokenId, 'testKey').call();
    expect(value).to.equal(helper.getWeb3().utils.toHex('testValue'));
  });
});


type ElementOf<A> = A extends readonly (infer T)[] ? T : never;
function* cartesian<T extends Array<Array<any>>, R extends Array<any>>(internalRest: [...R], ...args: [...T]): Generator<[...R, ...{[K in keyof T]: ElementOf<T[K]>}]> {
  if(args.length === 0) {
    yield internalRest as any;
    return;
  }
  for(const value of args[0]) {
    yield* cartesian([...internalRest, value], ...args.slice(1)) as any;
  }
}
