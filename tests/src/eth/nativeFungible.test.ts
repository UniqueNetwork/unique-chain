// Copyright 2019-2023 Unique Network (Gibraltar) Ltd.
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
import {itEth, usingEthPlaygrounds} from './util';

describe('NativeFungible: Plain calls', () => {
  let donor: IKeyringPair;
  let alice: IKeyringPair;
  let owner: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (helper, privateKey) => {
      donor = await privateKey({url: import.meta.url});
      [alice, owner] = await helper.arrange.createAccounts([30n, 20n], donor);
    });
  });

  itEth.only('Can perform approve()', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const spender = helper.eth.createAccount();
    const collection = await helper.ft.mintCollection(alice);
    await collection.mint(alice, 200n, {Ethereum: owner});

    const collectionAddress = helper.ethAddress.fromCollectionId(0);
    const contract = await helper.ethNativeContract.collection(collectionAddress, 'ft', owner);


    await contract.methods.approve(spender, 100).send({from: owner});
  });
});