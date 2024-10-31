import {ApiPromise, WsProvider} from '@polkadot/api';

// [!ATTENTION!] Auto-renew will be available in the future:
// https://github.com/paritytech/polkadot-sdk/blob/12539e7a931e82a040e74c84e413baa712ecd638/substrate/frame/broker/src/lib.rs#L889-L917

const RELAY_BLOCK_SECONDS = 6;
const CORETIME_BLOCK_SECONDS = 12;
const TIMESLICE_PERIOD = 80; // In Relay Chain blocks (normal runtime, without the `fast-runtime` feature).

await (async () => {
  const args = process.argv.slice(2);
  if(args.length != 2) {
    console.log('USAGE: yarn leaseStatus <CORETIME_CHAIN_ENDPOINT> <TASK_ID>');
    process.exit(-1);
  }

  const wsEndpoint = args[0];
  const taskId = parseInt(args[1]);

  const api = await ApiPromise.create({provider: new WsProvider(wsEndpoint)});

  const currentCoreTimeBlock = await api.query.system.number()
    .then(n => n.toJSON() as number);

  const lastRelayChainBlock = await api.query.parachainSystem.lastRelayChainBlockNumber()
    .then(n => n.toJSON() as number);

  const leases = await api.query.broker.leases().then(l => l.toJSON() as any[]);
  const taskLease = leases.find(lease => lease.task === taskId);

  const saleInfo = await api.query.broker.saleInfo().then(i => i.toJSON() as any);

  console.log('='.repeat(120));
  console.log();

  if(taskLease !== undefined) {
    const endingTimeInfo = futureTimesliceTimeInfo(taskLease.until, lastRelayChainBlock);

    console.log(`Task #${taskLease.task} lease expires after ${endingTimeInfo.remaining} on ${endingTimeInfo.date}`);

    if(taskLease.until < saleInfo.regionEnd) {
      console.warn('The Lease **WILL END** in the current sale region!');
      console.warn(`**RENEW the bulk coretime** until CoreTime Parachain Block #${saleInfo.saleStart}!`);

      const renewUntilBlock = saleInfo.saleStart - currentCoreTimeBlock;
      const renewSecondsRemaining = CORETIME_BLOCK_SECONDS * renewUntilBlock;
      const renewTimeRemaining = secondsToTime(renewSecondsRemaining);
      console.warn(`Remaining time to renew the bulk coretime: ${renewTimeRemaining}`);
    } else {
      const regionEndTimeInfo = futureTimesliceTimeInfo(saleInfo.regionEnd, lastRelayChainBlock);

      console.log('The lease is valid during the current sale region');
      console.log(`\tThe lease               ends at timeslice ${taskLease.until} (remaining: ${endingTimeInfo.remaining}, date: ${endingTimeInfo.date})`);
      console.log('\t                                          >');
      console.log(`\tThe current sale region ends at timeslice ${saleInfo.regionEnd} (remaining: ${regionEndTimeInfo.remaining}, date: ${regionEndTimeInfo.date})`);
    }
  } else {
    console.log('No leases found');
  }

  console.log();
  console.log('='.repeat(120));

  await api.disconnect();
})();

function secondsToTime(seconds: number) {
  const second = 1;
  const minute = 60 * second;
  const hour = 60 * minute;
  const day = 24 * hour;

  const units = [
    {name: 'd', seconds: day},
    {name: 'h', seconds: hour},
    {name: 'm', seconds: minute},
    {name: 's', seconds: second},
  ];

  const time = [];

  for(const unit of units) {
    const value = Math.floor(seconds / unit.seconds);
    time.push(`${value}${unit.name}`);

    if(value > 0) {
      seconds %= unit.seconds;
    }
  }

  return time.join(':');
}

function relayBlockToSeconds(block: number) {
  return RELAY_BLOCK_SECONDS * block;
}

function timesliceToRelayBlock(timeslice: number) {
  return timeslice * TIMESLICE_PERIOD;
}

function futureTimesliceTimeInfo(timeslice: number, lastRelayChainBlock: number) {
  const untilRelayBlock = timesliceToRelayBlock(timeslice);
  const relayBlocksRemaining = untilRelayBlock - lastRelayChainBlock;

  const secondsRemaining = relayBlockToSeconds(relayBlocksRemaining);

  return {
    remaining: secondsToTime(secondsRemaining),
    date: futureDate(secondsRemaining).toISOString(),
  };
}

function futureDate(seconds: number) {
  const date = new Date();
  date.setSeconds(date.getSeconds() + seconds);
  return date;
}
