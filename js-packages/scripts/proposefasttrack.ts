import {ApiPromise, WsProvider} from '@polkadot/api';
import {blake2AsHex} from '@polkadot/util-crypto';

async function main() {
  const networkUrl = process.argv[2];

  const wsProvider = new WsProvider(networkUrl);
  const api = await ApiPromise.create({provider: wsProvider});

  const externalDemocracyProposal = (await api.query.democracy.nextExternal() as any).unwrap()[0];

  let proposalHash;
  if(externalDemocracyProposal.isInline) {
    proposalHash = blake2AsHex(externalDemocracyProposal.asInline, 256);
  } else if(externalDemocracyProposal.isLegacy) {
    proposalHash = externalDemocracyProposal.asLegacy.toJSON().hash;
  } else {
    proposalHash = externalDemocracyProposal.asLookup.toJSON().hash;
  }

  const voringPeriod = 7200;
  const delay = 10;

  const democracyFastTrack = api.tx.democracy.fastTrack(proposalHash, voringPeriod, delay);

  const techCommThreshold = ((await api.query.technicalCommittee.members()).toJSON() as any[]).length;
  const techCommProposal = api.tx.technicalCommittee.propose(
    techCommThreshold,
    democracyFastTrack.method.toHex(),
    democracyFastTrack.encodedLength,
  );

  const encodedCall = techCommProposal.method.toHex();

  console.log('-----------------');
  console.log('Fast Track Proposal: ', `https://polkadot.js.org/apps/?rpc=${networkUrl}#/extrinsics/decode/${encodedCall}`);
  console.log('-----------------');

  await api.disconnect();
}

await main();
