// Copyright 2019-2023 Unique Network (Gibraltar) Ltd.
// SPDX-License-Identifier: Apache-2.0
//
// Pulls identities and sub-identities from a chain and then makes a preimage to later force upload them into another.
// Only changed or previously non-existent data are inserted.
//
// Usage: `yarn setIdentities [relay WS URL] [parachain WS URL] [user key]
// Example: `yarn setIdentities wss://polkadot-rpc.dwellir.com ws://localhost:9944 escape pattern miracle train sudden cart adapt embark wedding alien lamp mesh`

import {encodeAddress} from '@polkadot/keyring';
import {IKeyringPair} from '@polkadot/types/types';
import {usingPlaygrounds, Pallets} from './index';
import {ChainHelperBase} from './playgrounds/unique';

const relayUrl = process.argv[2] ?? 'ws://localhost:9844';
const paraUrl = process.argv[3] ?? 'ws://localhost:9944';
const key = process.argv.length > 4 ? process.argv.slice(4).join(' ') : '//Alice';

export function extractAccountId(key: any): string {
  return (key as any).toHuman()[0];
}

export function extractIdentityInfo(value: any): object {
  const heart = (value as any).unwrap();
  const identity = heart.toJSON();
  identity.judgements = heart.judgements.toHuman();
  return identity;
}

export function extractIdentity(key: any, value: any): [string, any] {
  return [extractAccountId(key), extractIdentityInfo(value)];
}

export async function getIdentities(helper: ChainHelperBase, noneCasePredicate?: (key: any, value: any) => void) {
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

// whether the existing chain data is more important than the coming
function isCurrentChainDataPriority(helper: ChainHelperBase, currentChainId: number | undefined, relayChainId: number) {
  if (!currentChainId) return false;
  // information has come from local chain, and is automatically superior
  if (currentChainId == helper.chain.getChainProperties().ss58Format) return true;
  // the lower the id, the more important it is (Polkadot has ss58 prefix = 0, Kusama has ss58 prefix = 2)
  return currentChainId < relayChainId;
}

// construct an object with all data necessary for insertion from storage query results
export function constructSubInfo(identityAccount: string, subQuery: any, supers: any[], ss58?: number): [string, any] {
  const deposit = subQuery.toJSON()[0];
  const subIdentities = subQuery.toHuman()[1];
  subIdentities.map((sub: string) => supers.find((sup: any) => sup[0] === sub));

  return [
    encodeAddress(identityAccount, ss58), [
      deposit,
      subIdentities.map((sub: string): [string, object] | null => {
        const sup = supers.find((sup: any) => sup[0] === sub);
        if (!sup) {
          console.error(`Error: Could not find info on super for \nsub-identity account\t${sub} of \nsuper account \t\t${identityAccount}, skipping.`);
          return null;
        }
        return [encodeAddress(sub, ss58), sup[1].toJSON()[1]];
      }).filter((x: any) => x),
    ],
  ];
}

export async function getSubs(helper: ChainHelperBase) {
  return (await helper.getApi().query.identity.subsOf.entries()).map(([key, value]) => [extractAccountId(key), value as any]);
}

export async function getSupers(helper: ChainHelperBase) {
  return (await helper.getApi().query.identity.superOf.entries()).map(([key, value]) => [extractAccountId(key), value as any]);
}

async function uploadPreimage(helper: ChainHelperBase, preimageMaker: IKeyringPair, preimage: string) {
  try {
    await helper.executeExtrinsic(preimageMaker, 'api.tx.preimage.notePreimage', [preimage]);
  } catch(e: any) {
    if (e.message.includes('AlreadyNoted')) {
      console.warn('Warning: The same preimage already exists on the chain. Nothing was uploaded.');
    } else {
      console.error(e);
    }
  }
}

// The utility for pulling identity and sub-identity data
const forceInsertIdentities = async (): Promise<void> => {
  let relaySS58Prefix = 0;
  const identitiesOnRelay: any[] = [];
  const subsOnRelay: any[] = [];
  const identitiesToRemove: string[] = [];
  await usingPlaygrounds(async helper => {
    try {
      relaySS58Prefix = helper.chain.getChainProperties().ss58Format;
      // iterate over every identity
      for(const [key, value] of await getIdentities(helper, (key, _value) => identitiesToRemove.push((key as any).toHuman()[0]))) {
        // if any of the judgements resulted in a good confirmed outcome, keep this identity
        let knownGood = false, reasonable = false;
        for (const [_id, judgement] of value.judgements) {
          if (judgement == 'KnownGood') knownGood = true;
          if (judgement == 'Reasonable') reasonable = true;
        }
        if (!(reasonable || knownGood)) continue;
        // replace the registrator id with the relay chain's ss58 format
        value.judgements = [[helper.chain.getChainProperties().ss58Format, knownGood ? 'KnownGood' : 'Reasonable']];
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
    if (helper.fetchMissingPalletNames([Pallets.Preimage]).length != 0) console.error('pallet-preimage is not included in parachain.');

    try {
      const preimageMaker = await privateKey(key);
      const ss58Format = helper.chain.getChainProperties().ss58Format;
      const paraIdentities = await getIdentities(helper);
      const identitiesToAdd: any[] = [];
      const paraAccountsRegistrators: {[name: string]: number} = {};

      // cross-reference every account for changes
      for (const [key, value] of identitiesOnRelay) {
        const encodedKey = encodeAddress(key, ss58Format);

        // only update if the identity info does not exist or is changed
        const identity = paraIdentities.find(i => i[0] === encodedKey);
        if (identity) {
          const registratorId = identity[1].judgements[0][0];
          paraAccountsRegistrators[encodedKey] = registratorId;
          if (isCurrentChainDataPriority(helper, registratorId, value.judgements[0][0])
            || JSON.stringify(value.info) === JSON.stringify(identity[1].info)) {
            continue;
          }
        }

        identitiesToAdd.push([key, value]);
        // exercise caution - in case we have an identity and the realy doesn't, it might mean one of two things:
        // 1) it was deleted on the relay;
        // 2) it is our own identity, we don't want to delete it.
        // identitiesToRemove.push((key as any).toHuman()[0]);
      }

      if (identitiesToRemove.length != 0)
        await uploadPreimage(
          helper,
          preimageMaker,
          helper.constructApiCall('api.tx.identity.forceRemoveIdentities', [identitiesToRemove]).method.toHex(),
        );
      if (identitiesToAdd.length != 0)
        await uploadPreimage(
          helper,
          preimageMaker,
          helper.constructApiCall('api.tx.identity.forceInsertIdentities', [identitiesToAdd]).method.toHex(),
        );

      console.log(`Tried to push ${identitiesToAdd.length} identities`
        + ` and found ${identitiesToRemove.length} identities for potential removal.`
        + ` Currently there are ${(await helper.getApi().query.identity.identityOf.keys()).length} identities on the chain.`);

      // fill sub-identities
      const paraSubs = await getSubs(helper);
      const supersOfSubs = await getSupers(helper);
      const subsToUpdate: any[] = [];

      for (const [key, value] of subsOnRelay) {
        const encodedKey = encodeAddress(key, ss58Format);
        const sub = paraSubs.find(i => i[0] === encodedKey);
        if (sub) {
          // only update if the sub-identity info does not exist or is changed
          if (isCurrentChainDataPriority(helper, paraAccountsRegistrators[encodedKey], relaySS58Prefix)
            || JSON.stringify(value) === JSON.stringify(constructSubInfo(sub[0], sub[1], supersOfSubs)[1])) {
            continue;
          }
        } else if (value[1].length == 0)
          continue;

        subsToUpdate.push([key, value]);
      }

      if (subsToUpdate.length != 0)
        await uploadPreimage(
          helper,
          preimageMaker,
          helper.constructApiCall('api.tx.identity.forceSetSubs', [subsToUpdate]).method.toHex(),
        );

      console.log(`Also tried to push ${subsToUpdate.length} identities with their sub-identities.`
        + ` Currently there are ${(await helper.getApi().query.identity.subsOf.keys()).length} identities with subs.`);
    } catch (error) {
      console.error(error);
      throw Error('Error during setting identities');
    }
  }, paraUrl);
};

if (process.argv[1] === module.filename)
  forceInsertIdentities().catch(() => process.exit(1));
