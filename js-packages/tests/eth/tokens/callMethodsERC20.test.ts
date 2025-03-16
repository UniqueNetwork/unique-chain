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

import {Pallets, requirePalletsOrSkip} from '@unique/test-utils/util.js';
import {waitParams, expect, itEth, usingEthPlaygrounds} from '@unique/test-utils/eth/util.js';
import type {IKeyringPair} from '@polkadot/types/types';
import {CreateCollectionData} from '@unique/test-utils/eth/types.js';

[
  {mode: 'ft' as const, requiredPallets: []},
  {mode: 'rft' as const, requiredPallets: [Pallets.ReFungible]},
].map(testCase => {
  describe(`${testCase.mode.toUpperCase()}: ERC-20 call methods`, () => {
    let donor: IKeyringPair;

    before(async function() {
      await usingEthPlaygrounds(async (helper, privateKey) => {
        requirePalletsOrSkip(this, helper, testCase.requiredPallets);
        donor = await privateKey({url: import.meta.url});
      });
    });

    itEth('totalSupply', async ({helper}) => {
      const caller = await helper.eth.createAccountWithBalance(donor);
      const mintingParams = testCase.mode === 'ft' ? [caller.address, 200n] : [caller.address];

      const {collection, collectionId} = await helper.eth.createCollection(caller, new CreateCollectionData('TotalSupply', '6', '6', testCase.mode)).send();
      if(testCase.mode === 'rft') await (await collection.mint.send(caller.address)).wait(...waitParams);

      // Use collection contract for FT or token contract for RFT:
      const contract = testCase.mode === 'ft'
        ? collection
        : await helper.ethNativeContract.rftTokenById(collectionId, 1, caller);

      // Mint tokens:
      testCase.mode === 'ft'
        ? await (await contract.mint.send(...mintingParams)).wait(...waitParams)
        : await (await contract.repartition.send(200)).wait(...waitParams);

      const totalSupply = await contract.totalSupply.staticCall();
      expect(totalSupply).to.equal(200n);
    });

    itEth('balanceOf', async ({helper}) => {
      const caller = await helper.eth.createAccountWithBalance(donor);
      const mintingParams = testCase.mode === 'ft' ? [caller.address, 200n] : [caller.address];

      const {collection, collectionId} = await helper.eth.createCollection(caller, new CreateCollectionData('BalanceOf', 'Descroption', 'Prefix', testCase.mode)).send();
      if(testCase.mode === 'rft') await (await collection.mint.send(caller.address)).wait(...waitParams);

      // Use collection contract for FT or token contract for RFT:
      const contract = testCase.mode === 'ft'
        ? collection
        : await helper.ethNativeContract.rftTokenById(collectionId, 1, caller);

      // Mint tokens:
      testCase.mode === 'ft'
        ? await (await contract.mint.send(...mintingParams)).wait(...waitParams)
        : await (await contract.repartition.send(200)).wait(...waitParams);

      const balance = await contract.balanceOf.staticCall(caller.address);
      expect(balance).to.equal(200n);
    });

    itEth('decimals', async ({helper}) => {
      const caller = await helper.eth.createAccountWithBalance(donor);
      const {collection, collectionId} = await helper.eth.createCollection(caller, new CreateCollectionData('BalanceOf', 'Descroption', 'Prefix', testCase.mode)).send();
      if(testCase.mode === 'rft') await (await collection.mint.send(caller.address)).wait(...waitParams);

      // Use collection contract for FT or token contract for RFT:
      const contract = testCase.mode === 'ft'
        ? collection
        : await helper.ethNativeContract.rftTokenById(collectionId, 1, caller);

      const decimals = await contract.decimals.staticCall();
      expect(decimals).to.equal(testCase.mode === 'rft' ? 0n : 18n);
    });
  });
});
