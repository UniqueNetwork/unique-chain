//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {default as usingApi} from './substrate/substrate-api';

chai.use(chaiAsPromised);
const expect = chai.expect;

describe.only('integration test: Inflation', () => {
  it('First year inflation is 10%', async () => {
    await usingApi(async (api) => {

      const blockInterval = (api.consts.inflation.inflationBlockInterval).toBigInt();
      const totalIssuanceStart = (await api.query.inflation.startingYearTotalIssuance()).toBigInt();
      const blockInflation = (await api.query.inflation.blockInflation()).toBigInt();

      // const YEAR = 5259600n;  // 6-second block. Blocks in one year
      const YEAR = 2629800n; // 12-second block. Blocks in one year

      const totalExpectedInflation = totalIssuanceStart / 10n;
      const totalActualInflation = blockInflation * YEAR / blockInterval;

      const tolerance = 0.00001; // Relative difference per year between theoretical and actual inflation
      let expectedInflation = totalExpectedInflation / totalActualInflation - 1n;

      expect(Math.abs(Number(expectedInflation))).to.be.lessThanOrEqual(tolerance);
    });
  });

});
