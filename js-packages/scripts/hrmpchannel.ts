import {ApiPromise, WsProvider} from '@polkadot/api';
import {blake2AsHex} from '@polkadot/util-crypto';

const proposeOpenChannel = async (relayApi: ApiPromise, receiverParaId: number) => {
    const conf: any = await relayApi.query.configuration.activeConfig()
        .then(data => data.toJSON());
    const maxCapacity = conf.hrmpChannelMaxCapacity;
    const maxSize = conf.hrmpChannelMaxMessageSize;

    return relayApi.tx.hrmp.hrmpInitOpenChannel(
        receiverParaId,
        maxCapacity,
        maxSize,
    ).method.toHex();
};

const proposeAcceptChannel = (relayApi: ApiPromise, senderParaId: number) => {
    return relayApi.tx.hrmp.hrmpAcceptOpenChannel(senderParaId).method.toHex();
};

async function main() {
  const relayUrl = process.argv[2]
  const uniqueParachainUrl = process.argv[3];
  const otherParachainUrl = process.argv[4];
  const op = process.argv[5];

  const relayWsProvider = new WsProvider(relayUrl);
  const relayApi = await ApiPromise.create({provider: relayWsProvider});

  const uniqueWsProvider = new WsProvider(uniqueParachainUrl);
  const uniqueApi = await ApiPromise.create({provider: uniqueWsProvider});

  const otherWsProvider = new WsProvider(otherParachainUrl);
  const otherApi = await ApiPromise.create({provider: otherWsProvider});

  const uniqueParaId = await uniqueApi.query.parachainInfo.parachainId()
    .then(data => data.toJSON() as number);

  const otherParaId = await otherApi.query.parachainInfo.parachainId()
    .then(data => data.toJSON() as number);

  let encodedRelayCall: string;
  if(op == 'open') {
    encodedRelayCall = await proposeOpenChannel(relayApi, otherParaId);
  } else if(op == 'accept') {
    encodedRelayCall = proposeAcceptChannel(relayApi, otherParaId);
  } else {
    throw Error(`Unknown hrmp channel operation: ${op}`);
  }

  const relayDecimals = await relayApi.rpc.system.properties()
    .then(data => data.tokenDecimals.unwrap()[0].toNumber());

  const relayFee = 1 * (10 ** relayDecimals);

  const proposal = uniqueApi.tx.polkadotXcm.send(
    {
        V3: {
            parents: 1,
            interior: 'Here',
        }
    },
    {
        V3: [
            {
                WithdrawAsset: [
                    {
                        id: {
                            Concrete: {
                                parents: 0,
                                interior: 'Here',
                            },
                        },
                        fun: {
                            Fungible: relayFee,
                        },
                    },
                ],
            },
            {
                BuyExecution: {
                    fees: {
                        id: {
                            Concrete: {
                                parents: 0,
                                interior: 'Here',
                            },
                        },
                        fun: {
                            Fungible: relayFee,
                        },
                    },
                    weightLimit: 'Unlimited',
                },
            },
            {
                Transact: {
                    originKind: 'Native',
                    requireWeightAtMost: {
                        refTime: 1000000000,
                        proofSize: 65536,
                    },
                    call: {
                        encoded: encodedRelayCall,
                    },
                },
            },
            'RefundSurplus',
            {
                DepositAsset: {
                    assets: {
                        Wild: {
                            AllCounted: 1,
                        },
                    },
                    beneficiary: {
                        parents: 0,
                        interior: {
                            X1: {
                                Parachain: uniqueParaId,
                            },
                        },
                    },
                },
            },
        ],
    },
  ).method.toHex();

  const councilMembers = (await uniqueApi.query.council.members()).toJSON() as any[];
  const councilProposalThreshold = Math.floor(councilMembers.length / 2) + 1;

  const democracyProposalHash = blake2AsHex(proposal, 256);
  const democracyProposalPreimage = uniqueApi.tx.preimage.notePreimage(proposal).method.toHex();

  const democracyProposal = uniqueApi.tx.democracy.externalProposeDefault({
    Legacy: democracyProposalHash,
  });

  const councilProposal = uniqueApi.tx.council.propose(
    councilProposalThreshold,
    democracyProposal,
    democracyProposal.method.encodedLength,
  ).method.toHex();

  const proposeBatch = uniqueApi.tx.utility.batchAll([
    democracyProposalPreimage,
    councilProposal,
  ]);

  const encodedCall = proposeBatch.method.toHex();

  console.log('-----------------');
  console.log('Council Proposal: ', `https://polkadot.js.org/apps/?rpc=${uniqueParachainUrl}#/extrinsics/decode/${encodedCall}`);
  console.log('-----------------');

  await relayApi.disconnect();
  await uniqueApi.disconnect();
  await otherApi.disconnect();
}

await main();
