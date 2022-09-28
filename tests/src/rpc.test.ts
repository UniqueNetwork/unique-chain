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
import {usingPlaygrounds, itSub, expect} from './util/playgrounds';
import {CrossAccountId} from './util/playgrounds/unique';

describe('integration test: RPC methods', () => {
  let donor: IKeyringPair;
  let alice: IKeyringPair;
  let bob: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      donor = privateKey('//Alice');
      [alice, bob] = await helper.arrange.createAccounts([20n, 10n], donor);
    });
  });

  itSub('returns None for fungible collection', async ({helper}) => {
    const collection = await helper.ft.mintCollection(alice, {name: 'RPC-1', tokenPrefix: 'RPC'});
    const owner = (await helper.callRpc('api.rpc.unique.tokenOwner', [collection.collectionId, 0])).toJSON() as any;
    expect(owner).to.be.null;
  });
  
  itSub('RPC method tokenOwners for fungible collection and token', async ({helper}) => {
    // Set-up a few token owners of all stripes
    const ethAcc = {Ethereum: '0x67fb3503a61b284dc83fa96dceec4192db47dc7c'};
    const facelessCrowd = (await helper.arrange.createAccounts([0n, 0n, 0n, 0n, 0n, 0n, 0n], donor))
      .map(i => {return {Substrate: i.address};});
    
    const collection = await helper.ft.mintCollection(alice, {name: 'RPC-2', tokenPrefix: 'RPC'});
    // mint some maximum (u128) amounts of tokens possible
    await collection.mint(alice, (1n << 128n) - 1n);
    
    await collection.transfer(alice, {Substrate: bob.address}, 1000n);
    await collection.transfer(alice, ethAcc, 900n);
          
    for (let i = 0; i < facelessCrowd.length; i++) {
      await collection.transfer(alice, facelessCrowd[i], 1n);
    }
    // Set-up over

    const owners = await helper.callRpc('api.rpc.unique.tokenOwners', [collection.collectionId, 0]);
    const ids = (owners.toJSON() as any[]).map(CrossAccountId.fromLowerCaseKeys);

    expect(ids).to.deep.include.members([{Substrate: alice.address}, ethAcc, {Substrate: bob.address}, ...facelessCrowd]);
    expect(owners.length == 10).to.be.true;
    
    // Make sure only 10 results are returned with this RPC
    const [eleven] = await helper.arrange.createAccounts([0n], donor);
    expect(await collection.transfer(alice, {Substrate: eleven.address}, 10n)).to.be.true;
    expect((await helper.callRpc('api.rpc.unique.tokenOwners', [collection.collectionId, 0])).length).to.be.equal(10);
  });
});