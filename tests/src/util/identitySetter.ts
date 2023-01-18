// Copyright 2019-2022 Unique Network (Gibraltar) Ltd.
// SPDX-License-Identifier: Apache-2.0
//
// Usage: `yarn setIdentities [relay WS URL] [parachain WS URL] [sudo key]`
// Example: `yarn setIdentities wss://polkadot-rpc.dwellir.com ws://localhost:9944 escape pattern miracle train sudden cart adapt embark wedding alien lamp mesh`

import {encodeAddress} from '@polkadot/keyring';
import {usingPlaygrounds, Pallets} from './index';
import {ChainHelperBase} from './playgrounds/unique';

const relayUrl = process.argv[2] ?? 'ws://localhost:9844';
const paraUrl = process.argv[3] ?? 'ws://localhost:9944';
const key = process.argv.length > 4 ? process.argv.slice(4).join(' ') : '//Alice';

function extractAccountId(key: any): string {
  return (key as any).toHuman()[0];
}

function extractIdentity(key: any, value: any): [string, any] {
  return [extractAccountId(key), (value as any).unwrap()];
}

async function getIdentities(helper: ChainHelperBase, noneCasePredicate?: (key: any, value: any) => void) {
  const identities: [string, any][] = [];
  for(const [key, v] of await helper.getApi().query.identity.identityOf.entries()) {
    const value = v as any;
    if (value.isNone) {
      if (noneCasePredicate) noneCasePredicate(key, value);
      continue;
    }
    identities.push(extractIdentity(key, value));
  }
  return identities;
}

function constructSubInfo(identityAccount: string, subQuery: any, supers: any[], ss58?: number): [string, any] {
  const deposit = subQuery.toJSON()[0];
  const subIdentities = subQuery.toHuman()[1];
  subIdentities.map((sub: string) => supers.find((sup: any) => sup[0] === sub));
  // supers.find((x: any) => x[0] === subIdentities[0])![1].toHuman();
  return [
    encodeAddress(identityAccount, ss58), [
      deposit,
      subIdentities.map((sub: string) => [
        encodeAddress(sub, ss58),
        supers.find((sup: any) => sup[0] === sub)![1].toJSON()[1],
      ]),
    ],
  ];
}

async function getSubs(helper: ChainHelperBase) {
  return (await helper.getApi().query.identity.subsOf.entries()).map(([key, value]) => [extractAccountId(key), value as any]);
}

async function getSupers(helper: ChainHelperBase) {
  return (await helper.getApi().query.identity.superOf.entries()).map(([key, value]) => [extractAccountId(key), value as any]);
}

// The utility for pulling identity and sub-identity data
const forceInsertIdentities = async (): Promise<void> => {
  const identitiesOnRelay: any[] = [];
  const subsOnRelay: any[] = [];
  const identitiesToRemove: string[] = [];
  await usingPlaygrounds(async helper => {
    try {
      // iterate over every identity
      for(const [key, value] of await getIdentities(helper, (key, _value) => identitiesToRemove.push((key as any).toHuman()[0]))) {
        // if any of the judgements resulted in a good confirmed outcome, keep this identity
        if (value.toHuman().judgements.filter((x: any) => x[1] == 'Reasonable' || x[1] == 'KnownGood').length == 0) continue;
        identitiesOnRelay.push([key, value]);
      }

      const sublessIdentities = [...identitiesOnRelay];
      const supersOfSubs = await getSupers(helper);

      // iterate over every sub-identity
      for(const [key, value] of await getSubs(helper)) {
        // only get subs of the identities interesting to us
        const identityIndex = sublessIdentities.findIndex((x: any) => x[0] == key);
        if (identityIndex == -1) continue;
        sublessIdentities.splice(identityIndex, 1);
        subsOnRelay.push(constructSubInfo(key, value, supersOfSubs));
      }

      // mark the rest of sub-identities for deletion with empty arrays
      /*for(const [account, _identity] of sublessIdentities) {
        subsOnRelay.push([account, ['0', []]]);
      }*/
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
          if (JSON.stringify(value) === JSON.stringify(identity[1])) {
            continue;
          }
        }
        identitiesToAdd.push([key, value]);
        // exercise caution - in case we have an identity and the realy doesn't, it might mean one of two things:
        // 1) it was deleted on the relay;
        // 2) it is our own identity, we don't want to delete it.
        // identitiesToRemove.push((key as any).toHuman()[0]);
      }

      const paraSubs = await getSubs(helper);
      const supersOfSubs = await getSupers(helper);
      const subsToUpdate: any[] = [];

      if (identitiesToRemove.length != 0)
        await helper.getSudo().executeExtrinsic(superuser, 'api.tx.identity.forceRemoveIdentities', [identitiesToRemove]);
      if (identitiesToAdd.length != 0)
        await helper.getSudo().executeExtrinsic(superuser, 'api.tx.identity.forceInsertIdentities', [identitiesToAdd]);

      console.log(`Tried to upload ${identitiesToAdd.length} identities`
        + ` and found ${identitiesToRemove.length} identities for potential removal.`
        + ` Now there are ${(await helper.getApi().query.identity.identityOf.keys()).length}.`);

      for (const [key, value] of subsOnRelay) {
        const encodedKey = encodeAddress(key, ss58Format);
        const sub = paraSubs.find(i => i[0] === encodedKey);
        if (sub) {
          // only update if the sub-identity info does not exist or is changed
          if (JSON.stringify(value) === JSON.stringify(constructSubInfo(sub[0], sub[1], supersOfSubs)[1])) {
            continue;
          }
        }
        subsToUpdate.push([key, value]);
      }

      if (subsToUpdate.length != 0)
        await helper.getSudo().executeExtrinsic(superuser, 'api.tx.identity.forceSetSubs', [subsToUpdate]);

      console.log(`Also tried to update ${subsToUpdate.length} identities with their sub-identities.`
        + ` Now there are ${(await helper.getApi().query.identity.subsOf.keys()).length} identities with subs.`);
    } catch (error) {
      console.error(error);
      throw Error('Error during setting identities');
    }
  }, paraUrl);
};

forceInsertIdentities().catch(() => process.exit(1));