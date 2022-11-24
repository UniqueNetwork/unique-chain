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
import {itSub, usingPlaygrounds, expect} from './util';

describe('Vesting', () => {
  let donor: IKeyringPair;
  let nominal: bigint;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      donor = await privateKey({filename: __filename});
      nominal = helper.balance.getOneTokenNominal();
    });
  });

  itSub.only('can perform vestedTransfer and claim tokens', async ({helper}) => {
    // arrange
    const [sender, recepient] = await helper.arrange.createAccounts([1000n, 1n], donor);
    const currentRelayBlock = await helper.chain.getRelayBlockNumber();
    const schedule1 = {startRelayBlock: currentRelayBlock + 4n, periodBlocks: 4n, periodCount: 2n, perPeriod: 50n * nominal};
    const schedule2 = {startRelayBlock: currentRelayBlock + 8n, periodBlocks: 8n, periodCount: 2n, perPeriod: 100n * nominal};

    // act
    await helper.balance.vestedTransfer(sender, recepient.address, schedule1);
    await helper.balance.vestedTransfer(sender, recepient.address, schedule2);
    let schedule = await helper.balance.getVestingSchedules(recepient.address);

    // check senders balance after vesting:
    let balanceSender = await helper.balance.getSubstrateFull(sender.address);
    expect(balanceSender.free / nominal).to.eq(699n);
    expect(balanceSender.feeFrozen).to.eq(0n);
    expect(balanceSender.miscFrozen).to.eq(0n);
    expect(balanceSender.reserved).to.eq(0n);

    // check recepient balance after vesting:
    let balanceRecepient = await helper.balance.getSubstrateFull(recepient.address);
    expect(balanceRecepient.free).to.eq(301n * nominal);
    expect(balanceRecepient.feeFrozen).to.eq(300n * nominal);
    expect(balanceRecepient.miscFrozen).to.eq(300n * nominal);
    expect(balanceRecepient.reserved).to.eq(0n);

    // Schedules list correct:
    expect(schedule).to.has.length(2);
    expect(schedule[0]).to.deep.eq(schedule1);
    expect(schedule[1]).to.deep.eq(schedule2);

    await helper.wait.forRelayBlockNumber(currentRelayBlock + 8n);
    await helper.balance.claim(recepient);

    // check recepient balance after claim (50 tokens claimed):
    balanceRecepient = await helper.balance.getSubstrateFull(recepient.address);
    expect(balanceRecepient.free / nominal).to.eq(300n);
    expect(balanceRecepient.feeFrozen).to.eq(250n * nominal);
    expect(balanceRecepient.miscFrozen).to.eq(250n * nominal);
    expect(balanceRecepient.reserved).to.eq(0n);
    
    await helper.wait.forRelayBlockNumber(currentRelayBlock + 16n);
    await helper.balance.claim(recepient);

    // check recepient balance after second claim (150 tokens claimed):
    balanceRecepient = await helper.balance.getSubstrateFull(recepient.address);
    expect(balanceRecepient.free / nominal).to.eq(300n);
    expect(balanceRecepient.feeFrozen).to.eq(100n * nominal);
    expect(balanceRecepient.miscFrozen).to.eq(100n * nominal);
    expect(balanceRecepient.reserved).to.eq(0n);
    
    // Schedules list contain 1 vesting:
    schedule = await helper.balance.getVestingSchedules(recepient.address);
    expect(schedule).to.has.length(1);
    expect(schedule[0]).to.deep.eq(schedule2);

    await helper.wait.forRelayBlockNumber(currentRelayBlock + 24n);
    await helper.balance.claim(recepient);

    // check recepient balance after second claim (100 tokens claimed):
    balanceRecepient = await helper.balance.getSubstrateFull(recepient.address);
    expect(balanceRecepient.free / nominal).to.eq(300n);
    expect(balanceRecepient.feeFrozen).to.eq(0n);
    expect(balanceRecepient.miscFrozen).to.eq(0n);
    expect(balanceRecepient.reserved).to.eq(0n);
    
    // check sender balance does not changed:
    balanceSender = await helper.balance.getSubstrateFull(sender.address);
    expect(balanceSender.free / nominal).to.eq(699n);
    expect(balanceSender.feeFrozen).to.eq(0n);
    expect(balanceSender.miscFrozen).to.eq(0n);
    expect(balanceSender.reserved).to.eq(0n);
  });
});
