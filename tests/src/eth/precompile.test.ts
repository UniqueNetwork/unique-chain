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

import {expect, itEth, usingEthPlaygrounds} from './util';

describe('Precompiles', () => {
  let donor: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (_, privateKey) => {
      donor = await privateKey({url: import.meta.url});
    });
  });

  itEth('ecrecover is supported', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const ecrecoverCompiledСontract = await helper.ethContract.compile(
      'ECRECOVER',
      `
      // SPDX-License-Identifier: MIT
      pragma solidity ^0.8.17;

      contract ECRECOVER{
        address addressTest = 0x12Cb274aAD8251C875c0bf6872b67d9983E53fDd;
        bytes32 msgHash1 = 0xc51dac836bc7841a01c4b631fa620904fc8724d7f9f1d3c420f0e02adf229d50;
        bytes32 msgHash2 = 0xc51dac836bc7841a01c4b631fa620904fc8724d7f9f1d3c420f0e02adf229d51;
        uint8 v = 0x1b;
        bytes32 r = 0x44287513919034a471a7dc2b2ed121f95984ae23b20f9637ba8dff471b6719ef;
        bytes32 s = 0x7d7dc30309a3baffbfd9342b97d0e804092c0aeb5821319aa732bc09146eafb4;


        function verifyValid() public view returns(bool) {
           // Use ECRECOVER to verify address
           return ecrecover(msgHash1, v, r, s) == (addressTest);
        }

        function verifyInvalid() public view returns(bool) {
          // Use ECRECOVER to verify address
          return ecrecover(msgHash2, v, r, s) == (addressTest);
        }
      }
      `,
    );

    const ecrecoverСontract = await helper.ethContract.deployByAbi(owner, ecrecoverCompiledСontract.abi, ecrecoverCompiledСontract.object);
    expect(await ecrecoverСontract.methods.verifyValid().call({from: owner})).to.be.true;
    expect(await ecrecoverСontract.methods.verifyInvalid().call({from: owner})).to.be.false;
  });

  itEth('sr25519 is supported', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const sr25519CompiledСontract = await helper.ethContract.compile(
      'SR25519Contract',
      `
      // SPDX-License-Identifier: MIT
      pragma solidity ^0.8.17;

      /**
       * @title SR25519 signature interface.
       */
      interface SR25519 {
          /**
           * @dev Verify signed message using SR25519 crypto.
           * @return A boolean confirming whether the public key is signer for the message. 
           */
          function verify(
            bytes32 public_key,
            bytes calldata signature,
            bytes calldata message
          ) external view returns (bool);
      }

      contract SR25519Contract{
        SR25519 public constant sr25519 = SR25519(0x0000000000000000000000000000000000005002);

        bytes32 public_key = 0x96b2f9237ed0890fbeed891ebb81b91ac0d5d5b6e3afcdbc95df1b68d9f14036;
        bytes signature = hex"4a5d733d7c568f2e88abf0467fd497f87c1be3e940ed897efdf9da72eaad394ef9918cb574ee99c54485775b17a0deaf46ff7a1f10346cea39fff0e4ede97689";
        bytes message1 = hex"7372323535313920697320737570706f72746564";
        bytes message2 = hex"7372323535313920697320737570706f7274656401";


        function verifyValid() public view returns(bool) {
          return sr25519.verify(public_key, signature, message1);
        }

        function verifyInvalid() public view returns(bool) {
          return sr25519.verify(public_key, signature, message2);
        }
      }
      `,
    );

    const sr25519Сontract = await helper.ethContract.deployByAbi(owner, sr25519CompiledСontract.abi, sr25519CompiledСontract.object);
    expect(await sr25519Сontract.methods.verifyValid().call({from: owner})).to.be.true;
    expect(await sr25519Сontract.methods.verifyInvalid().call({from: owner})).to.be.false;
  });
});
