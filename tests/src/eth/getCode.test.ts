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

import {expect, itEth, usingEthPlaygrounds} from './util';
import {IKeyringPair} from '@polkadot/types/types';
import {COLLECTION_HELPER, CONTRACT_HELPER} from '../util';

describe('RPC eth_getCode', () => {
  let donor: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (helper, privateKey) => {
      donor = await privateKey({url: import.meta.url});
    });
  });

  [
    {address: COLLECTION_HELPER},
    {address: CONTRACT_HELPER},
  ].map(testCase => {
    itEth(`returns value for native contract: ${testCase.address}`, async ({helper}) => {
      const contractCodeSub = (await helper.callRpc('api.rpc.eth.getCode', [testCase.address])).toJSON();
      const contractCodeEth = (await helper.getWeb3().eth.getCode(testCase.address));

      expect(contractCodeSub).to.has.length.greaterThan(4);
      expect(contractCodeEth).to.has.length.greaterThan(4);
    });
  });

  itEth('returns value for custom contract', async ({helper}) => {
    const signer = await helper.eth.createAccountWithBalance(donor);
    const flipper = await helper.eth.deployFlipper(signer);

    const contractCodeSub = (await helper.callRpc('api.rpc.eth.getCode', [flipper.options.address])).toJSON();
    const contractCodeEth = (await helper.getWeb3().eth.getCode(flipper.options.address));

    expect(contractCodeSub).to.has.length.greaterThan(4);
    expect(contractCodeEth).to.has.length.greaterThan(4);
  });
});
