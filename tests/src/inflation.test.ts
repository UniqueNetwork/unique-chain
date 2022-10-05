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
import {expect, itSub, usingPlaygrounds} from './util/playgrounds';

// todo:playgrounds requires sudo, look into on the later stage
describe('integration test: Inflation', () => {
  let superuser: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (_, privateKey) => {
      superuser = privateKey('//Alice');
    });
  });
  
  itSub('First year inflation is 10%', async ({helper}) => {
    // Make sure non-sudo can't start inflation
    const [bob] = await helper.arrange.createAccounts([10n], superuser);

    await expect(helper.executeExtrinsic(bob, 'api.tx.inflation.startInflation', [1])).to.be.rejectedWith(/BadOrigin/);

    // Make sure superuser can't start inflation without explicit sudo
    await expect(helper.executeExtrinsic(superuser, 'api.tx.inflation.startInflation', [1])).to.be.rejectedWith(/BadOrigin/);

    // Start inflation on relay block 1 (Alice is sudo)
    const tx = helper.constructApiCall('api.tx.inflation.startInflation', [1]);
    await expect(helper.executeExtrinsic(superuser, 'api.tx.sudo.sudo', [tx])).to.not.be.rejected;

    const blockInterval = (helper.api!.consts.inflation.inflationBlockInterval as any).toBigInt();
    const totalIssuanceStart = ((await helper.api!.query.inflation.startingYearTotalIssuance()) as any).toBigInt();
    const blockInflation = (await helper.api!.query.inflation.blockInflation() as any).toBigInt();

    const YEAR = 5259600n;  // 6-second block. Blocks in one year
    // const YEAR = 2629800n; // 12-second block. Blocks in one year

    const totalExpectedInflation = totalIssuanceStart / 10n;
    const totalActualInflation = blockInflation * YEAR / blockInterval;

    const tolerance = 0.00001; // Relative difference per year between theoretical and actual inflation
    const expectedInflation = totalExpectedInflation / totalActualInflation - 1n;

    expect(Math.abs(Number(expectedInflation))).to.be.lessThanOrEqual(tolerance);
  });
});
