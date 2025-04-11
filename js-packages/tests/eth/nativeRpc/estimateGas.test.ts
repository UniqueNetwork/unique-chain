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

import {expect, itEth, usingEthPlaygrounds} from '@unique/test-utils/eth/util.js';
import type {IKeyringPair} from '@polkadot/types/types';
import {Contract} from 'ethers';

describe('Ethereum native RPC calls', () => {
  let donor: IKeyringPair;
  const NATIVE_TOKEN_ADDRESS = '0x17c4e6453cc49aaaaeaca894e6d9683e00000000';

  before(async function() {
    await usingEthPlaygrounds(async (_, privateKey) => {
      donor = await privateKey({url: import.meta.url});
    });
  });

  itEth('estimate gas', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor, 100n);
    const recepient = helper.eth.createAccount();

    // Create a contract
    const demoAbi = ['function transfer(address to, uint256 amount)'];
    const demoContract = new Contract(NATIVE_TOKEN_ADDRESS, demoAbi, owner);

    const estimatedGas = await demoContract.transfer.estimateGas(
      recepient,
      90n * helper.balance.getOneTokenNominal(),
      {value: 0n, maxFeePerGas: 1_500_000_000_000n},
    );

    expect(Number(estimatedGas))
      .to.be.greaterThan(35000).and
      .to.be.lessThan(50000);
  });
});
