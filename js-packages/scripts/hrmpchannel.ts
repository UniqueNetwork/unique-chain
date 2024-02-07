import {ApiPromise, WsProvider} from '@polkadot/api';
import {blake2AsHex, encodeAddress} from '@polkadot/util-crypto';

export const paraChildSovereignAccount = (relayApi: ApiPromise, paraid: number) => {
  // We are getting a *child* parachain sovereign account,
  // so we need a child prefix: encoded(b"para") == 0x70617261
  const childPrefix = '70617261';

  const encodedParaId = relayApi
    .createType('u32', paraid)
    .toHex(true)
    .substring(2 /* skip 0x */);

  const addrBytesLen = 32;
  const byteLenInHex = 2;
  return '0x' + (childPrefix + encodedParaId).padEnd(addrBytesLen * byteLenInHex, '0');
};

const proposeOpenChannel = async (relayApi: ApiPromise, relayFee: bigint, senderParaId: number, receiverParaId: number) => {
  const conf: any = await relayApi.query.configuration.activeConfig()
    .then(data => data.toJSON());
  const maxCapacity = conf.hrmpChannelMaxCapacity;
  const maxSize = conf.hrmpChannelMaxMessageSize;

  const senderDeposit = BigInt(conf.hrmpSenderDeposit);

  const requiredBalance = relayFee + senderDeposit;
  const sovereignAccount = paraChildSovereignAccount(relayApi, senderParaId);
  const balance = await relayApi.query.system.account(sovereignAccount)
    .then(accountInfo => (accountInfo.toJSON() as any).data.free as bigint);

  if(balance < requiredBalance) {
    throw Error(`Not enough balance on the sender's sovereign account: balance(${balance}) < requiredBalance(${requiredBalance})`);
  }

  return relayApi.tx.hrmp.hrmpInitOpenChannel(
    receiverParaId,
    maxCapacity,
    maxSize,
  ).method.toHex();
};

const proposeAcceptChannel = async (relayApi: ApiPromise, relayFee: bigint, senderParaId: number, recipientParaId: number) => {
  const conf: any = await relayApi.query.configuration.activeConfig()
    .then(data => data.toJSON());
  const recipientDeposit = BigInt(conf.hrmpRecipientDeposit);

  const requiredBalance = relayFee + recipientDeposit;

  const sovereignAccount = paraChildSovereignAccount(relayApi, recipientParaId);
  const balance = await relayApi.query.system.account(sovereignAccount)
    .then(accountInfo => (accountInfo.toJSON() as any).data.free as bigint);

  if(balance < requiredBalance) {
    throw Error(`Not enough balance on the recipient's sovereign account: balance(${balance}) < requiredBalance(${requiredBalance})`);
  }

  return relayApi.tx.hrmp.hrmpAcceptOpenChannel(senderParaId).method.toHex();
};

async function main() {
  if(process.argv.length != 6) {
    console.log('Usage: yarn hrmpChannel <RELAY_URL> <OUR_CHAIN_URL> <OTHER_CHAIN_URL> <open | accept>');
    process.exit(1);
  }

  const relayUrl = process.argv[2];
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

  const relayDecimals = await relayApi.rpc.system.properties()
    .then(data => data.tokenDecimals.unwrap()[0].toNumber());

  const relayFee = 2n * BigInt(10 ** relayDecimals);

  let encodedRelayCall: string;
  if(op == 'open') {
    encodedRelayCall = await proposeOpenChannel(relayApi, relayFee, uniqueParaId, otherParaId);
  } else if(op == 'accept') {
    encodedRelayCall = await proposeAcceptChannel(relayApi, relayFee, otherParaId, uniqueParaId);
  } else {
    throw Error(`Unknown hrmp channel operation: ${op}`);
  }

  const proposal = uniqueApi.tx.polkadotXcm.send(
    {
      V3: {
        parents: 1,
        interior: 'Here',
      },
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
