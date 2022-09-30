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

import {expect, itEth, usingEthPlaygrounds} from './util/playgrounds';
import {IKeyringPair} from '@polkadot/types/types';

describe('Helpers sanity check', () => {
  let donor: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (_helper, privateKey) => {
      donor = privateKey('//Alice');
    });
  });
  
  itEth('Contract owner is recorded', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);

    const flipper = await helper.eth.deployFlipper(owner);

    expect(await helper.ethNativeContract.contractHelpers(owner).methods.contractOwner(flipper.options.address).call()).to.be.equal(owner);
  });

  itEth('Flipper is working', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);

    const flipper = await helper.eth.deployFlipper(owner);

    expect(await flipper.methods.getValue().call()).to.be.false;
    await flipper.methods.flip().send({from: owner});
    expect(await flipper.methods.getValue().call()).to.be.true;
  });
});
