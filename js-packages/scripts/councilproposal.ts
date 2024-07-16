import {ApiPromise, WsProvider} from '@polkadot/api';
import {blake2AsHex} from '@polkadot/util-crypto';

async function main() {
  if(process.argv.length != 4) {
    console.log('Usage: yarn councilDemocracyProposal <CHAIN_URL> <ENCODED_PROPOSAL>');
    process.exit(1);
  }

  const networkUrl = process.argv[2];
  const democracyProposalContent = process.argv[3];

  const wsProvider = new WsProvider(networkUrl);
  const api = await ApiPromise.create({provider: wsProvider});

  const councilMembers = (await api.query.council.members()).toJSON() as any[];
  const councilProposalThreshold = Math.floor(councilMembers.length / 2) + 1;

  const democracyProposalHash = blake2AsHex(democracyProposalContent, 256);
  const democracyProposalPreimage = api.tx.preimage.notePreimage(democracyProposalContent).method.toHex();

  const democracyProposal = api.tx.democracy.externalProposeDefault({
    Legacy: democracyProposalHash,
  });

  const councilProposal = api.tx.council.propose(
    councilProposalThreshold,
    democracyProposal,
    democracyProposal.method.encodedLength,
  ).method.toHex();

  const proposeBatch = api.tx.utility.batchAll([
    democracyProposalPreimage,
    councilProposal,
  ]);

  const encodedCall = proposeBatch.method.toHex();

  console.log('-----------------');
  console.log('Council Proposal: ', `https://polkadot.js.org/apps/?rpc=${networkUrl}#/extrinsics/decode/${encodedCall}`);
  console.log('-----------------');

  await api.disconnect();
}

await main();
