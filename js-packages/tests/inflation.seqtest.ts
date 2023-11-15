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
import {expect, itSub, usingPlaygrounds} from './util/index.js';

const TREASURY = '5EYCAe5ijiYfyeZ2JJCGq56LmPyNRAKzpG4QkoQkkQNB5e6Z';

// todo:playgrounds requires sudo, look into on the later stage
describe('integration test: Inflation', () => {
  let superuser: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (_, privateKey) => {
      superuser = await privateKey('//Alice');
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

    const blockInterval = (helper.getApi().consts.inflation.inflationBlockInterval as any).toBigInt();
    const totalIssuanceStart = ((await helper.callRpc('api.query.inflation.startingYearTotalIssuance', [])) as any).toBigInt();
    const blockInflation = (await helper.callRpc('api.query.inflation.blockInflation', []) as any).toBigInt();

    const YEAR = 5259600n;  // 6-second block. Blocks in one year
    // const YEAR = 2629800n; // 12-second block. Blocks in one year

    const totalExpectedInflation = totalIssuanceStart / 10n;
    const totalActualInflation = blockInflation * YEAR / blockInterval;

    const tolerance = 0.00001; // Relative difference per year between theoretical and actual inflation
    const expectedInflation = totalExpectedInflation / totalActualInflation - 1n;

    expect(Math.abs(Number(expectedInflation))).to.be.lessThanOrEqual(tolerance);
  });

  itSub('Inflation happens after inflation block interval', async ({helper}) => {
    const api = helper.getApi();
    const blockInterval = await api.consts.inflation.inflationBlockInterval.toNumber();

    const relayBlock = (await api.query.parachainSystem.lastRelayChainBlockNumber()).toNumber();
    await helper.executeExtrinsic(superuser, 'api.tx.sudo.sudo', [helper.constructApiCall('api.tx.inflation.startInflation', [relayBlock])]);
    const blockInflation = (await helper.callRpc('api.query.inflation.blockInflation', []) as any).toBigInt();
    const startBlock = (relayBlock + blockInterval) - (relayBlock % blockInterval) + 1;

    await helper.wait.forRelayBlockNumber(startBlock);

    const treasuryBalanceBefore = await helper.balance.getSubstrate(TREASURY);

    await helper.wait.forRelayBlockNumber(startBlock + blockInterval);

    const treasuryBalanceAfter = await helper.balance.getSubstrate(TREASURY);
    expect(Number(treasuryBalanceAfter)).to.be.eqls(Number(treasuryBalanceBefore + blockInflation));
  });
});
