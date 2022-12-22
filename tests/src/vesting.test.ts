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
    const SCHEDULE_1_PERIOD = 4n; // 6 blocks one period
    const SCHEDULE_1_START = currentRelayBlock + 6n; // Block when 1 schedule starts
    const SCHEDULE_2_PERIOD = 8n; // 12 blocks one period
    const SCHEDULE_2_START = currentRelayBlock + 12n; // Block when 2 schedule starts
    const schedule1 = {start: SCHEDULE_1_START, period: SCHEDULE_1_PERIOD, periodCount: 2n, perPeriod: 50n * nominal};
    const schedule2 = {start: SCHEDULE_2_START, period: SCHEDULE_2_PERIOD, periodCount: 2n, perPeriod: 100n * nominal};

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

    // Wait first part available:
    await helper.wait.forRelayBlockNumber(SCHEDULE_1_START + SCHEDULE_1_PERIOD);
    await helper.balance.claim(recepient);

    // check recepient balance after claim (50 tokens claimed, 250 left):
    balanceRecepient = await helper.balance.getSubstrateFull(recepient.address);
    expect(balanceRecepient.free / nominal).to.eq(300n);
    expect(balanceRecepient.feeFrozen).to.eq(250n * nominal);
    expect(balanceRecepient.miscFrozen).to.eq(250n * nominal);
    expect(balanceRecepient.reserved).to.eq(0n);
    
    // Wait first schedule ends and first part od second schedule:
    await helper.wait.forRelayBlockNumber(SCHEDULE_2_START + SCHEDULE_2_PERIOD);
    await helper.balance.claim(recepient);

    // check recepient balance after second claim (150 tokens claimed, 100 left):
    balanceRecepient = await helper.balance.getSubstrateFull(recepient.address);
    expect(balanceRecepient.free / nominal).to.eq(300n);
    expect(balanceRecepient.feeFrozen).to.eq(100n * nominal);
    expect(balanceRecepient.miscFrozen).to.eq(100n * nominal);
    expect(balanceRecepient.reserved).to.eq(0n);
    
    // Schedules list contain 1 vesting:
    schedule = await helper.balance.getVestingSchedules(recepient.address);
    expect(schedule).to.has.length(1);
    expect(schedule[0]).to.deep.eq(schedule2);

    // Wait 2 schedule ends:
    await helper.wait.forRelayBlockNumber(SCHEDULE_2_START + SCHEDULE_2_PERIOD * 2n);
    await helper.balance.claim(recepient);

    // check recepient balance after second claim (100 tokens claimed, 0 left):
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

  itSub('cannot send more tokens than have', async ({helper}) => {
    const [sender, receiver] = await helper.arrange.createAccounts([1000n, 1n], donor);
    const schedule = {start: 0n, period: 1n, periodCount: 1n, perPeriod: 100n * nominal};
    const manyPeriodsSchedule = {start: 0n, period: 1n, periodCount: 100n, perPeriod: 10n * nominal};
    const oneBigSumSchedule = {start: 0n, period: 1n, periodCount: 1n, perPeriod: 5000n * nominal};

    // Sender cannot send vestedTransfer to self or other
    await expect(helper.balance.vestedTransfer(sender, sender.address, manyPeriodsSchedule)).to.be.rejectedWith(/InsufficientBalance/);
    await expect(helper.balance.vestedTransfer(sender, receiver.address, manyPeriodsSchedule)).to.be.rejectedWith(/InsufficientBalance/);
    await expect(helper.balance.vestedTransfer(sender, sender.address, oneBigSumSchedule)).to.be.rejectedWith(/InsufficientBalance/);
    await expect(helper.balance.vestedTransfer(sender, receiver.address, oneBigSumSchedule)).to.be.rejectedWith(/InsufficientBalance/);

    const balanceSender = await helper.balance.getSubstrateFull(sender.address);
    const balanceReceiver = await helper.balance.getSubstrateFull(receiver.address);

    // Sender's balance has not changed
    expect(balanceSender.free / nominal).to.eq(999n);
    expect(balanceSender.feeFrozen).to.eq(0n);
    expect(balanceSender.miscFrozen).to.eq(0n);
    expect(balanceSender.reserved).to.eq(0n);

    // Receiver's balance has not changed
    expect(balanceReceiver.free).to.be.eq(1n * nominal);
    expect(balanceReceiver.feeFrozen).to.be.eq(0n);
    expect(balanceReceiver.miscFrozen).to.be.eq(0n);
    expect(balanceReceiver.reserved).to.be.eq(0n);

    // Receiver cannot send vestedTransfer back because of freeze
    await expect(helper.balance.vestedTransfer(receiver, sender.address, schedule)).to.be.rejectedWith(/InsufficientBalance/);
  });

  itSub('cannot send vestedTransfer with incorrect parameters', async ({helper}) => {
    const [sender, receiver] = await helper.arrange.createAccounts([1000n, 1n], donor);
    const incorrectperiodSchedule = {start: 0n, period: 0n, periodCount: 10n, perPeriod: 10n * nominal};
    const incorrectPeriodCountSchedule = {start: 0n, period: 1n, periodCount: 0n, perPeriod: 10n * nominal};
    const incorrectPerPeriodSchedule = {start: 0n, period: 1n, periodCount: 1n, perPeriod: 0n * nominal};

    await expect(helper.balance.vestedTransfer(sender, sender.address, incorrectperiodSchedule)).to.be.rejectedWith(/vesting.ZeroVestingPeriod/);
    await expect(helper.balance.vestedTransfer(sender, receiver.address, incorrectPeriodCountSchedule)).to.be.rejectedWith(/vesting.ZeroVestingPeriod/);
    await expect(helper.balance.vestedTransfer(sender, receiver.address, incorrectPerPeriodSchedule)).to.be.rejectedWith(/vesting.AmountLow/);

    const balanceSender = await helper.balance.getSubstrateFull(sender.address);
    // Sender's balance has not changed
    expect(balanceSender.free / nominal).to.eq(999n);
    expect(balanceSender.feeFrozen).to.eq(0n);
    expect(balanceSender.miscFrozen).to.eq(0n);
    expect(balanceSender.reserved).to.eq(0n);
  });
});
