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
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import usingApi from '../substrate/substrate-api';
import {approveExpectSuccess, createCollectionExpectSuccess, createFungibleItemExpectSuccess, getAllowance, getBalance, transferExpectFailure, transferExpectSuccess, transferFromExpectFail, transferFromExpectSuccess, U128_MAX} from '../util/helpers';

chai.use(chaiAsPromised);
const expect = chai.expect;

// todo:playgrounds skipped ~ postponed
describe.skip('Integration Test fungible overflows', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;
  let charlie: IKeyringPair;

  before(async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      alice = privateKeyWrapper('//Alice');
      bob = privateKeyWrapper('//Bob');
      charlie = privateKeyWrapper('//Charlie');
    });
  });

  it('fails when overflows on transfer', async () => {
    await usingApi(async api => {
      const fungibleCollectionId = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});

      await createFungibleItemExpectSuccess(alice, fungibleCollectionId, {Value: U128_MAX});
      await transferExpectSuccess(fungibleCollectionId, 0, alice, bob, U128_MAX, 'Fungible');

      await createFungibleItemExpectSuccess(alice, fungibleCollectionId, {Value: 1n});
      await transferExpectFailure(fungibleCollectionId, 0, alice, bob, 1);

      expect(await getBalance(api, fungibleCollectionId, alice.address, 0)).to.equal(1n);
      expect(await getBalance(api, fungibleCollectionId, bob.address, 0)).to.equal(U128_MAX);
    });
  });

  it('fails when overflows on transferFrom', async () => {
    await usingApi(async api => {
      const fungibleCollectionId = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});
      await createFungibleItemExpectSuccess(alice, fungibleCollectionId, {Value: U128_MAX});
      await approveExpectSuccess(fungibleCollectionId, 0, alice, bob.address, U128_MAX);
      await transferFromExpectSuccess(fungibleCollectionId, 0, bob, alice, charlie, U128_MAX, 'Fungible');

      expect(await getBalance(api, fungibleCollectionId, charlie.address, 0)).to.equal(U128_MAX);
      expect(await getAllowance(api, fungibleCollectionId, alice.address, bob.address, 0)).to.equal(0n);

      await createFungibleItemExpectSuccess(alice, fungibleCollectionId, {Value: U128_MAX});
      await approveExpectSuccess(fungibleCollectionId, 0, alice, bob.address, 1n);
      await transferFromExpectFail(fungibleCollectionId, 0, bob, alice, charlie, 1);

      expect(await getBalance(api, fungibleCollectionId, charlie.address, 0)).to.equal(U128_MAX);
      expect(await getAllowance(api, fungibleCollectionId, alice.address, bob.address, 0)).to.equal(1n);
    });
  });
});
