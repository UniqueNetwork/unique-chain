import {DevUniqueHelper} from '../../util/playgrounds/unique.dev';

export type Staker = {
  mnemonic: string;
  address: string;
  stakes: string[];
  unstakes: string[];
  errors: string[];
}

export type StakedBalance = {
  address: string;
  mnemonic: string;
  stakes: StakedBlock[];
  balance: Balance;
}

type SerializedStakedBalance = {
  address: string;
  mnemonic: string;
  stakes: {
      block: string;
      amount: string;
  }[];
  balance: {
    free: string;
    feeFrozen: string;
    miscFrozen: string;
    reserved: string;
  }
}

type StakedBlock = {
  block: bigint;
  amount: bigint;
}

type Balance = {
  free: bigint;
  feeFrozen: bigint;
  miscFrozen: bigint;
  reserved: bigint;
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

export function serializeStaker(staker: StakedBalance): SerializedStakedBalance {
  return {
    address: staker.address,
    mnemonic: staker.mnemonic,
    stakes: staker.stakes.map(s => {
      return {
        block: s.block.toString(),
        amount: s.amount.toString(),
      };
    }),
    balance: {
      free: staker.balance.free.toString(),
      feeFrozen: staker.balance.feeFrozen.toString(),
      miscFrozen: staker.balance.miscFrozen.toString(),
      reserved: staker.balance.reserved.toString(),
    },
  };
}

export function deserializeStaker(staker: SerializedStakedBalance): StakedBalance {
  return {
    address: staker.address,
    mnemonic: staker.mnemonic,
    stakes: staker.stakes.map(s => {
      return {
        block: BigInt(s.block),
        amount: BigInt(s.amount),
      };
    }),
    balance: {
      free: BigInt(staker.balance.free),
      feeFrozen: BigInt(staker.balance.feeFrozen),
      miscFrozen: BigInt(staker.balance.miscFrozen),
      reserved: BigInt(staker.balance.reserved),
    },
  };
}