// Copyright 2019-2022 Unique Network (Gibraltar) Ltd.
// This file is part of Unique Network.

// Unique Network is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// Unique Network is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with Unique Network. If not, see <http://www.gnu.org/licenses/>.

import {IKeyringPair} from '@polkadot/types/types';
import {usingPlaygrounds, expect, itSub, Pallets, requirePalletsOrSkip} from './util';
import {UniqueHelper} from './util/playgrounds/unique';

async function getIdentities(helper: UniqueHelper) {
  const identities: [string, any][] = [];
  for(const [key, value] of await helper.getApi().query.identity.identityOf.entries())
    identities.push([(key as any).toHuman(), (value as any).unwrap()]);
  return identities;
}

async function getIdentityAccounts(helper: UniqueHelper) {
  return (await getIdentities(helper)).flatMap(([key, _value]) => key);
}

describe('Integration Test: Identities Manipulation', () => {
  let superuser: IKeyringPair;

  before(async function() {
    await usingPlaygrounds(async (helper, privateKey) => {
      requirePalletsOrSkip(this, helper, [Pallets.Identity]);
      superuser = await privateKey('//Alice');
    });
  });

  itSub('Normal calls do not work', async ({helper}) => {
    // console.error = () => {};
    await expect(helper.executeExtrinsic(superuser, 'api.tx.identity.setIdentity', [{info: {display: {Raw: 'Meowser'}}}]))
      .to.be.rejectedWith(/Transaction call is not expected/);
  });

  itSub('Sets identities', async ({helper}) => {
    const oldIdentitiesCount = (await getIdentityAccounts(helper)).length;

    const crowdSize = 10;
    const crowd = await helper.arrange.createCrowd(crowdSize, 0n, superuser);
    const identities = crowd.map((acc, i) => [acc.address, {info: {display: {Raw: `accounter #${i}`}}}]);
    await helper.getSudo().executeExtrinsic(superuser, 'api.tx.identity.forceInsertIdentities', [identities]);

    expect((await getIdentityAccounts(helper)).length).to.be.equal(oldIdentitiesCount + crowdSize);
  });

  itSub('Setting identities does not delete existing but does overwrite', async ({helper}) => {
    const crowd = await helper.arrange.createCrowd(10, 0n, superuser);
    const identities = crowd.map((acc, i) => [acc.address, {info: {display: {Raw: `accounter #${i}`}}}]);

    // insert a single identity
    let singleIdentity = identities.pop()!;
    await helper.getSudo().executeExtrinsic(superuser, 'api.tx.identity.forceInsertIdentities', [[singleIdentity]]);

    const oldIdentitiesCount = (await getIdentityAccounts(helper)).length;

    // change an identity and push it with a few new others
    singleIdentity = [singleIdentity[0], {info: {display: {Raw: 'something special'}}}];
    identities.push(singleIdentity);
    await helper.getSudo().executeExtrinsic(superuser, 'api.tx.identity.forceInsertIdentities', [identities]);

    // oldIdentitiesCount + 9 because one identity is overwritten, not inserted on top
    expect((await getIdentityAccounts(helper)).length).to.be.equal(oldIdentitiesCount + 9);
    expect((await helper.callRpc('api.query.identity.identityOf', [singleIdentity[0]])).toHuman().info.display)
      .to.be.deep.equal({Raw: 'something special'});
  });

  itSub('Removes identities', async ({helper}) => {
    const crowd = await helper.arrange.createCrowd(10, 0n, superuser);
    const identities = crowd.map((acc, i) => [acc.address, {info: {display: {Raw: `accounter #${i}`}}}]);
    await helper.getSudo().executeExtrinsic(superuser, 'api.tx.identity.forceInsertIdentities', [identities]);
    const oldIdentities = await getIdentityAccounts(helper);

    // delete a couple, check that they are no longer there
    const scapegoats = [crowd.pop()!.address, crowd.pop()!.address];
    await helper.getSudo().executeExtrinsic(superuser, 'api.tx.identity.forceRemoveIdentities', [scapegoats]);
    const newIdentities = await getIdentityAccounts(helper);
    expect(newIdentities.concat(scapegoats)).to.be.have.members(oldIdentities);
  });

  after(async function() {
    await usingPlaygrounds(async helper => {
      if (helper.fetchMissingPalletNames([Pallets.Identity]).length != 0) return;

      const identitiesToRemove: string[] = await getIdentityAccounts(helper);
      await helper.getSudo().executeExtrinsic(superuser, 'api.tx.identity.forceRemoveIdentities', [identitiesToRemove]);
    });
  });
});
