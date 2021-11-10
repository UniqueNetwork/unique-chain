//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

import {IKeyringPair} from '@polkadot/types/types';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import privateKey from './substrate/privateKey';
import usingApi from './substrate/substrate-api';
import {approveExpectSuccess, createCollectionExpectSuccess, createFungibleItemExpectSuccess, getAllowance, getBalance, transferExpectFailure, transferExpectSuccess, transferFromExpectFail, transferFromExpectSuccess, U128_MAX} from './util/helpers';

chai.use(chaiAsPromised);
const expect = chai.expect;

describe('Integration Test fungible overflows', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;
  let charlie: IKeyringPair;

  before(async () => {
    await usingApi(async () => {
      alice = privateKey('//Alice');
      bob = privateKey('//Bob');
      charlie = privateKey('//Charlie');
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
