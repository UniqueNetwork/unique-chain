import {EthUniqueHelper} from '../../eth/util';
import {ITokenPropertyPermission, TCollectionMode} from '../../util/playgrounds/types';
import {UniqueNFTCollection, UniqueRFTCollection} from '../../util/playgrounds/unique';
import {IKeyringPair} from '@polkadot/types/types';
import {ContractImports} from '../../eth/util/playgrounds/types';

export const PROPERTIES = Array(40)
  .fill(0)
  .map((_, i) => {
    return {
      key: `key_${i}`,
      value: Uint8Array.from(Buffer.from(`value_${i}`)),
    };
  });

export const SUBS_PROPERTIES = Array(40)
  .fill(0)
  .map((_, i) => {
    return {
      key: `key_${i}`,
      value: `value_${i}`,
    };
  });

export const PERMISSIONS: ITokenPropertyPermission[] = PROPERTIES.map((p) => {
  return {
    key: p.key,
    permission: {
      tokenOwner: true,
      collectionAdmin: true,
      mutable: true,
    },
  };
});

export function convertToTokens(value: bigint, nominal = 1000_000_000_000_000_000n): number {
  return Number((value * 1000n) / nominal) / 1000;
}

export async function createCollectionForBenchmarks(
  mode : TCollectionMode,
  helper: EthUniqueHelper,
  privateKey: (seed: string) => Promise<IKeyringPair>,
  ethSigner: string,
  proxyContract: string | null,
  permissions: ITokenPropertyPermission[],
) {
  const donor = await privateKey('//Alice');

  const collection = await helper[mode].mintCollection(donor, {
    name: 'test mintToSubstrate',
    description: 'EVMHelpers',
    tokenPrefix: mode,
    ...(mode != 'ft' ? {
      tokenPropertyPermissions: [
        {
          key: 'url',
          permission: {
            tokenOwner: true,
            collectionAdmin: true,
            mutable: true,
          },
        },
        {
          key: 'URI',
          permission: {
            tokenOwner: true,
            collectionAdmin: true,
            mutable: true,
          },
        },
      ],
    } : {}),
    limits: {sponsorTransferTimeout: 0, sponsorApproveTimeout: 0},
    permissions: {mintMode: true},
  });

  await collection.addToAllowList(donor, {
    Ethereum: helper.address.substrateToEth(donor.address),
  });
  await collection.addToAllowList(donor, {Substrate: donor.address});
  await collection.addAdmin(donor, {Ethereum: ethSigner});
  await collection.addAdmin(donor, {
    Ethereum: helper.address.substrateToEth(donor.address),
  });

  if (proxyContract) {
    await collection.addToAllowList(donor, {Ethereum: proxyContract});
    await collection.addAdmin(donor, {Ethereum: proxyContract});
  }
  if (collection instanceof UniqueNFTCollection || collection instanceof UniqueRFTCollection)
    await collection.setTokenPropertyPermissions(donor, permissions);

  return collection;
}