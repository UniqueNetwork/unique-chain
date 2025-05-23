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

import {waitParams, expect, itEth, usingEthPlaygrounds} from '@unique/test-utils/eth/util.js';
import type {IKeyringPair} from '@polkadot/types/types';

describe('Helpers sanity check', () => {
  let donor: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (_helper, privateKey) => {
      donor = await privateKey({url: import.meta.url});
    });
  });

  itEth('Contract owner is recorded', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const flipper = await helper.eth.deployFlipper(owner);

    expect(await helper.ethNativeContract.contractHelpers(owner)
      .contractOwner.staticCall(await flipper.getAddress())).to.be.equal(owner.address);
  });

  itEth('Flipper is working', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);

    const flipper = await helper.eth.deployFlipper(owner);

    expect(await flipper.getValue.staticCall()).to.be.false;
    await (await flipper.flip.send()).wait(...waitParams);
    expect(await flipper.getValue.staticCall()).to.be.true;
  });
});
