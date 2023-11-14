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

import type {IKeyringPair} from '@polkadot/types/types';
import {itEth, usingEthPlaygrounds} from './util/index.js';
import {expect} from 'chai';

describe('Send value to contract', () => {
  let donor: IKeyringPair;

  before(async () => {
    await usingEthPlaygrounds(async (_helper, privateKey) => {
      donor = await privateKey({url: import.meta.url});
    });
  });

  itEth('Send to and from contract', async ({helper}) => {
    const contractOwner = await helper.eth.createAccountWithBalance(donor, 600n);
    const [buyer, receiver] = await helper.arrange.createAccounts([600n, 600n], donor);
    const receiverMirror = helper.address.substrateToEth(receiver.address);
    const contract = await helper.ethContract.deployByCode(
      contractOwner,
      'Test',
      `
      // SPDX-License-Identifier: UNLICENSED
      pragma solidity ^0.8.18;
      
      contract Test {
        function send() public payable {
          if (msg.value < 1000000000000000000)
            revert("Not enough gold");
        }
      
        function withdraw(address to) public {
          payable(to).transfer(1000000000000000000);
        }
      }
      `,
    );

    const balanceBefore = await helper.balance.getSubstrate(buyer.address);
    await helper.eth.sendEVM(buyer, contract.options.address, contract.methods.send().encodeABI(), '2000000000000000000');
    const balanceAfter = await helper.balance.getSubstrate(buyer.address);
    expect(balanceBefore - balanceAfter > 2000000000000000000n).to.be.true;
    expect(await helper.balance.getEthereum(contract.options.address)).to.be.equal(2000000000000000000n);

    await helper.eth.sendEVM(buyer, contract.options.address, contract.methods.withdraw(receiverMirror).encodeABI(), '0');
    expect(await helper.balance.getEthereum(receiverMirror)).to.be.equal(1000000000000000000n);
    expect(await helper.balance.getEthereum(contract.options.address)).to.be.equal(1000000000000000000n);
  });
});
