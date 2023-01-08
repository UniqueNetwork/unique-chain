// Copyright 2019-2022 Unique Network (Gibraltar) Ltd.
// SPDX-License-Identifier: Apache-2.0

import {encodeAddress} from '@polkadot/keyring';
import {usingPlaygrounds, Pallets} from './index';
import {ChainHelperBase} from './playgrounds/unique';

const relayUrl = process.argv[2] ?? 'ws://localhost:9844';
const paraUrl = process.argv[3] ?? 'ws://localhost:9944';
const key = process.argv.length > 4 ? process.argv.slice(4).join(' ') : '//Alice';

function extractIdentity(key: any, value: any): [string, any] {
  return [(key as any).toHuman()[0], (value as any).unwrap()];
}

async function getIdentities(helper: ChainHelperBase) {
  const identities: [string, any][] = [];
  for(const [key, value] of await helper.getApi().query.identity.identityOf.entries())
    identities.push(extractIdentity(key, value));
  return identities;
}

// This is a utility for pulling
const forceInsertIdentities = async (): Promise<void> => {
  const identitiesOnRelay: any[] = [];
  const identitiesToRemove: string[] = [];
  await usingPlaygrounds(async helper => {
    try {
      // iterate over every identity
      for(const [key, v] of await helper.getApi().query.identity.identityOf.entries()) {
        const value = v as any;
        if (value.isNone) {
          // in the nigh-impossible case that storage map would actually give None for a value, might as well delete it
          identitiesToRemove.push((key as any).toHuman()[0]);
          continue;
        }

        // if any of the judgements resulted in a good confirmed outcome, keep this identity
        if (value.unwrap().toHuman().judgements.filter((x: any) => x[1] == 'Reasonable' || x[1] == 'KnownGood').length == 0) continue;
        identitiesOnRelay.push(extractIdentity(key, value));
      }
    } catch (error) {
      console.error(error);
      throw Error('Error during fetching identities');
    }
  }, relayUrl);

  await usingPlaygrounds(async (helper, privateKey) => {
    if (helper.fetchMissingPalletNames([Pallets.Identity]).length != 0) console.error('pallet-identity is not included in parachain.');
    try {
      const superuser = await privateKey(key);
      const ss58Format = helper.chain.getChainProperties().ss58Format;
      const paraIdentities = await getIdentities(helper);
      const identitiesToAdd: any[] = [];

      // cross-reference every account for changes
      for (const [key, value] of identitiesOnRelay) {
        const encodedKey = encodeAddress(key, ss58Format);

        const identity = paraIdentities.find(i => i[0] === encodedKey);
        if (identity) {
          // only update if the identity info does not exist or is changed
          if (value.toString() === identity[1].toString()) {
            continue;
          }
        }
        identitiesToAdd.push([key, value]);
        // exercise caution - in case we have an identity and the realy doesn't, it might mean one of two things:
        // 1) it was deleted on the relay;
        // 2) it is our own identity, we don't want to delete it.
        // identitiesToRemove.push((key as any).toHuman()[0]);
      }

      // await helper.getSudo().executeExtrinsic(superuser, 'api.tx.identity.forceRemoveIdentities', [identitiesToRemove]);
      await helper.getSudo().executeExtrinsic(superuser, 'api.tx.identity.forceInsertIdentities', [identitiesToAdd]);
      console.log(`Tried to upload ${identitiesToAdd.length} identities `
        + `and found ${identitiesToRemove.length} identities for potential removal. `
        + `Now there are ${(await helper.getApi().query.identity.identityOf.keys()).length}.`);
    } catch (error) {
      console.error(error);
      throw Error('Error during setting identities');
    }
  }, paraUrl);
};

forceInsertIdentities().catch(() => process.exit(1));