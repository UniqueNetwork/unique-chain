import {ApiPromise, WsProvider} from '@polkadot/api';
import {blake2AsHex} from '@polkadot/util-crypto';
import {readFileSync} from 'fs';

async function main() {
  if(process.argv.length != 4) {
    console.log('Usage: proposeUpgrade <CHAIN_URL> <WASM_FILE_PATH>');
    process.exit(1);
  }

  const networkUrl = process.argv[2];
  const wasmFile = process.argv[3];

  const wsProvider = new WsProvider(networkUrl);
  const api = await ApiPromise.create({provider: wsProvider});

  const wasmFileBytes = readFileSync(wasmFile);
  const wasmFileHash = blake2AsHex(wasmFileBytes, 256);

  const authorizeUpgrade = api.tx.system.authorizeUpgrade(wasmFileHash);

  const councilMembers = (await api.query.council.members()).toJSON() as any[];
  const councilProposalThreshold = Math.floor(councilMembers.length / 2) + 1;

  const democracyProposalContent = authorizeUpgrade.method.toHex();

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

  const proposeUpgradeBatch = api.tx.utility.batchAll([
    democracyProposalPreimage,
    councilProposal,
  ]);

  const encodedCall = proposeUpgradeBatch.method.toHex();

  console.log('-----------------');
  console.log('Upgrade Proposal: ', `https://polkadot.js.org/apps/?rpc=${networkUrl}#/extrinsics/decode/${encodedCall}`);
  console.log('-----------------');

  await api.disconnect();
}

await main();
