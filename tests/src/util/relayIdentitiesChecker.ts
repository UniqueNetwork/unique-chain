// Copyright 2019-2022 Unique Network (Gibraltar) Ltd.
// SPDX-License-Identifier: Apache-2.0
//
// Checks and reports the differences between identities and sub-identities on two chains.
//
// Usage: `yarn checkRelayIdentities [relay-1 WS URL] [relay-2 WS URL]`
// Example: `yarn checkRelayIdentities wss://polkadot-rpc.dwellir.com wss://kusama-rpc.dwellir.com`

import {encodeAddress} from '@polkadot/keyring';
import {usingPlaygrounds} from './index';
import {getIdentities, getSubs, getSupers, constructSubInfo} from './identitySetter';

const relay1Url = process.argv[2] ?? 'ws://localhost:9844';
const relay2Url = process.argv[3] ?? 'ws://localhost:9844';

async function pullIdentities(relayUrl: string): Promise<[any[], any[]]> {
  const identities: any[] = [];
  const subs: any[] = [];

  await usingPlaygrounds(async helper => {
    try {
      // iterate over every identity
      for(const [key, value] of await getIdentities(helper)) {
        // if any of the judgements resulted in a good confirmed outcome, keep this identity
        if(value.toHuman().judgements.filter((x: any) => x[1] == 'Reasonable' || x[1] == 'KnownGood').length == 0) continue;
        identities.push([key, value]);
      }

      const supersOfSubs = await getSupers(helper);

      // iterate over every sub-identity
      for(const [key, value] of await getSubs(helper)) {
        // only get subs of the identities interesting to us
        if(identities.find((x: any) => x[0] == key) == -1) continue;
        subs.push(constructSubInfo(key, value, supersOfSubs));
      }
    } catch (error) {
      console.error(error);
      throw Error(`Error during fetching identities on ${relayUrl}`);
    }
  }, relayUrl);

  return [identities, subs];
}

// The utility for pulling identity and sub-identity data
const checkRelayIdentities = async (): Promise<void> => {
  const [identitiesOnRelay1, subIdentitiesOnRelay1] = await pullIdentities(relay1Url);
  const [identitiesOnRelay2, subIdentitiesOnRelay2] = await pullIdentities(relay2Url);

  console.log('identities counts:\t', identitiesOnRelay1.length, identitiesOnRelay2.length);
  console.log('sub-identities counts:\t', subIdentitiesOnRelay1.length, subIdentitiesOnRelay2.length);
  console.log();

  try {
    const matchingAddresses: string[] = [];
    const inequalIdentities: {[name: string]: [any, any]} = {};

    for(const [key1, value1] of identitiesOnRelay1) {
      const address = encodeAddress(key1);
      const identity2 = identitiesOnRelay2.find(([key2, _value2]) => address === encodeAddress(key2));
      if(!identity2) continue;
      matchingAddresses.push(address);

      //const [[key2, value2]] = identitiesOnRelay2.splice(index2, 1);
      const [_key2, value2] = identity2;
      if(JSON.stringify(value1.info) === JSON.stringify(value2.info)) continue;
      inequalIdentities[address] = [value1, value2];
    }

    /*for (const [v1, v2] of Object.values(inequalIdentities)) {
      console.log(v1.toHuman().info);
      console.log();
      console.log(v2.toHuman().info);
      await new Promise(resolve => setTimeout(resolve, 4000));
    }*/

    console.log(`Accounts with identities on both relays:\t${matchingAddresses.length}`);
    console.log(`Sub-identities with conflicting information:\t${Object.entries(inequalIdentities).length}`);
    console.log();

    const inequalSubIdentities = [];
    let matchesFound = 0;
    for(const address of matchingAddresses) {
      const sub1 = subIdentitiesOnRelay1.find(([key1, _value1]) => address === encodeAddress(key1));
      if(!sub1) continue;
      const sub2 = subIdentitiesOnRelay2.find(([key2, _value2]) => address === encodeAddress(key2));
      if(!sub2) continue;

      const [value1, value2] = [sub1[1], sub2[1]];
      matchesFound++;

      if(JSON.stringify(value1[1]) === JSON.stringify(value2[1])) {
        continue;
      }
      inequalSubIdentities.push([value1, value2]);
    }

    /*for (const [v1, v2] of inequalSubIdentities) {
      console.log(v1[1]);
      console.log();
      console.log(v2[1]);
      await new Promise(resolve => setTimeout(resolve, 300));
    }*/
    console.log(`Accounts with sub-identities on both relays:\t${matchesFound}`);
    console.log(`Of them, those with conflicting sub-identities:\t${inequalSubIdentities.length}`);
  } catch (error) {
    console.error(error);
    throw Error('Error during comparison');
  }
};

if(process.argv[1] === module.filename)
  checkRelayIdentities().catch(() => process.exit(1));
