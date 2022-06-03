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

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {default as usingApi, submitTransactionAsync, submitTransactionExpectFailAsync} from './substrate/substrate-api';

chai.use(chaiAsPromised);
const expect = chai.expect;

describe('integration test: Inflation', () => {
  it('First year inflation is 10%', async () => {
    await usingApi(async (api, privateKeyWrapper) => {

      // Make sure non-sudo can't start inflation
      const tx = api.tx.inflation.startInflation(1);
      const bob = privateKeyWrapper('//Bob');
      await expect(submitTransactionExpectFailAsync(bob, tx)).to.be.rejected;

      // Start inflation on relay block 1 (Alice is sudo)
      const alice = privateKeyWrapper('//Alice');
      const sudoTx = api.tx.sudo.sudo(tx as any);
      await submitTransactionAsync(alice, sudoTx);

      const blockInterval = (api.consts.inflation.inflationBlockInterval).toBigInt();
      const totalIssuanceStart = (await api.query.inflation.startingYearTotalIssuance()).toBigInt();
      const blockInflation = (await api.query.inflation.blockInflation()).toBigInt();

      const YEAR = 5259600n;  // 6-second block. Blocks in one year
      // const YEAR = 2629800n; // 12-second block. Blocks in one year

      const totalExpectedInflation = totalIssuanceStart / 10n;
      const totalActualInflation = blockInflation * YEAR / blockInterval;

      const tolerance = 0.00001; // Relative difference per year between theoretical and actual inflation
      const expectedInflation = totalExpectedInflation / totalActualInflation - 1n;

      expect(Math.abs(Number(expectedInflation))).to.be.lessThanOrEqual(tolerance);
    });
  });

});
