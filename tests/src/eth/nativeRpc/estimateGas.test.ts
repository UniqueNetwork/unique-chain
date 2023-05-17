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

import {expect, itEth, usingEthPlaygrounds} from '../util';
import {IKeyringPair} from '@polkadot/types/types';


describe('Ethereum native RPC calls', () => {
  let donor: IKeyringPair;
  const NATIVE_TOKEN_ADDRESS = '0x17c4e6453cc49aaaaeaca894e6d9683e00000000';

  before(async function() {
    await usingEthPlaygrounds(async (helper, privateKey) => {
      donor = await privateKey({url: import.meta.url});
    });
  });

  itEth.only('estimate gas', async ({helper}) => {
    const BALANCE = 100n;
    const BALANCE_TO_TRANSFER = 90n;

    const owner = await helper.eth.createAccountWithBalance(donor, BALANCE);
    const recepient = helper.eth.createAccount();

    const web3 = helper.getWeb3();
    // data: transfer(recepient, 90);
    const data = web3.eth.abi.encodeFunctionCall({
      name: 'transfer',
      type: 'function',
      inputs: [{
        type: 'address',
        name: 'to',
      },{
        type: 'uint256',
        name: 'amount',
      }],
    }, [recepient, (BALANCE_TO_TRANSFER * (10n ** 18n)).toString()]);

    const estimateGas = await web3.eth.estimateGas({
      to: NATIVE_TOKEN_ADDRESS,
      value: '0x0',
      data,
      from: owner,
      maxFeePerGas: '0x14c9338c61d',
    });

    expect(estimateGas).to.be.greaterThan(40000).and.to.be.lessThan(60000);
  });
});
