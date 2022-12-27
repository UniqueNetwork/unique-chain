// Copyright 2019-2022 Unique Network (Gibraltar) Ltd.
// SPDX-License-Identifier: Apache-2.0

import {usingPlaygrounds, Pallets} from './index';

const relayUrl0 = process.argv[2] ?? 'localhost:9844';
const relayUrl = `ws${relayUrl0.includes('localhost') ? '' : 's'}://${relayUrl0}`;

const paraUrl0 = process.argv[3] ?? 'localhost:9944';
const paraUrl = `ws${paraUrl0.includes('localhost') ? '' : 's'}://${paraUrl0}`;

const key = process.argv.length > 4 ? process.argv.slice(4).join(' ') : '//Alice';

// This is a utility for pulling
const setIdentities = async (): Promise<void> => {
  const identities: any[] = [];
  await usingPlaygrounds(async helper => {
    try {
      for(const [key, v] of await helper.getApi().query.identity.identityOf.entries()) {
        const value = v as any;
        if (!value.isSome) continue;
        if (value.unwrap().toHuman().judgements.filter((x: any) => x[1] == 'Reasonable' || x[1] == 'KnownGood').length == 0) continue;
        identities.push([key, value]);
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
      // todo:collator
      await helper.getSudo().executeExtrinsic(superuser, 'api.tx.dataManagement.setIdentities', [identities]);
      console.log(`Tried to upload ${identities.length} identities. `
        + `Now there are ${(await helper.getApi().query.identity.identityOf.keys()).length}.`);
    } catch (error) {
      console.error(error);
      throw Error('Error during setting identities');
    }
  }, paraUrl);
};

setIdentities().catch(() => process.exit(1));