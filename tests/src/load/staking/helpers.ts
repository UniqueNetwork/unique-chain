import {DevUniqueHelper} from '../../util/playgrounds/unique.dev';

export type Staker = {
  mnemonic: string,
  address: string,
  stakes: string[]
  unstakes: string[],
  errors: string[],
}

type BlockInfo = {
  parachain: number,
  relay: number,
}

export async function getBlocksByHash(blockHash: string, helper: DevUniqueHelper): Promise<BlockInfo> {
  const parachainBlockNumber = await helper.chain.getBlock(blockHash);
  if (!parachainBlockNumber) throw Error(`cannot get parachain block number by hash ${blockHash}`);
  const relayChainBlockNumber = await (await helper.getApi().at(blockHash)).query.parachainSystem.lastRelayChainBlockNumber();
  if (!parachainBlockNumber) throw Error(`cannot get relay block number by hash ${blockHash}`);
  return {
    parachain: parachainBlockNumber.header.number,
    relay: Number(relayChainBlockNumber.toHuman()),
  };
}
