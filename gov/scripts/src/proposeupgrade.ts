import { ApiPromise, WsProvider } from '@polkadot/api';
import { blake2AsHex } from '@polkadot/util-crypto';
import { readFileSync } from 'fs';

async function main() {
    const networkUrl = process.argv[2];
    const wasmFile = process.argv[3];
    
    const wsProvider = new WsProvider(networkUrl);
    const api = await ApiPromise.create({ provider: wsProvider });
    
    const wasmFileBytes = readFileSync(wasmFile);
    const wasmFileHash = blake2AsHex(wasmFileBytes, 256);

    const authorizeUpgrade = api.tx.parachainSystem.authorizeUpgrade(wasmFileHash, true);

    const councilMembers = (await api.query.council.members()).toJSON() as any[];
    const councilProposalThreshold = Math.floor(councilMembers.length / 2) + 1;

    const democracyProposal = api.tx.democracy.externalProposeDefault({
        Inline: authorizeUpgrade.method.toHex(),
    });

    const councilProposal = api.tx.council.propose(
        councilProposalThreshold,
        democracyProposal,
        democracyProposal.method.encodedLength,
    );

    const encodedCall = councilProposal.method.toHex();

    console.log('-----------------');
    console.log('Upgrade Proposal: ', `https://polkadot.js.org/apps/?rpc=${networkUrl}#/extrinsics/decode/${encodedCall}`);
    console.log('-----------------');

    await api.disconnect();
}

await main();
