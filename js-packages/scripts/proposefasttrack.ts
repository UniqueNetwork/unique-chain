import {ApiPromise, WsProvider} from '@polkadot/api';
import {blake2AsHex} from '@polkadot/util-crypto';

async function main() {
  if(process.argv.length != 4) {
    console.log('Usage: yarn proposeFastTrack <CHAIN_URL> <PROPOSAL_HASH | existing-external-proposal>');
    process.exit(1);
  }

  const networkUrl = process.argv[2];
  const proposal = process.argv[3];

  const wsProvider = new WsProvider(networkUrl);
  const api = await ApiPromise.create({provider: wsProvider});

  let proposalHash;

  if(proposal == 'existing-external-proposal') {
    const externalDemocracyProposal = (await api.query.democracy.nextExternal() as any).unwrap()[0];
    if(externalDemocracyProposal.isInline) {
      proposalHash = blake2AsHex(externalDemocracyProposal.asInline, 256);
    } else if(externalDemocracyProposal.isLegacy) {
      proposalHash = externalDemocracyProposal.asLegacy.toJSON().hash;
    } else {
      proposalHash = externalDemocracyProposal.asLookup.toJSON().hash;
    }
  } else {
    proposalHash = proposal;
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
