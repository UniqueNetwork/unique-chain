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

async function getSubIdentityAccounts(helper: UniqueHelper, address: string) {
  return ((await helper.getApi().query.identity.subsOf(address)).toHuman() as any)[1];
}

async function getSubIdentityName(helper: UniqueHelper, address: string) {
  return ((await helper.getApi().query.identity.superOf(address)).toHuman() as any);
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

  describe('Identities', () => {
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
  });

  describe('Sub-identities', () => {
    itSub('Sets subs', async ({helper}) => {
      const crowdSize = 18;
      const crowd = await helper.arrange.createCrowd(crowdSize, 0n, superuser);
      const supers = [crowd.pop()!, crowd.pop()!, crowd.pop()!];

      const subsPerSup = crowd.length / supers.length;
      let subCount = 0;
      const subs = [
        crowd.slice(subCount, subCount += subsPerSup + 1),
        crowd.slice(subCount, subCount += subsPerSup),
        crowd.slice(subCount, subCount += subsPerSup - 1),
      ];

      const subsInfo = supers.map((acc, i) => [
        acc.address, [
          1000000n + BigInt(i + 1),
          subs[i].map((sub, j) => [
            sub.address, {Raw: `accounter #${j}`},
          ]),
        ],
      ]);
      await helper.getSudo().executeExtrinsic(superuser, 'api.tx.identity.forceSetSubs', [subsInfo]);

      for (let i = 0; i < supers.length; i++) {
        // check deposit
        expect(((await helper.getApi().query.identity.subsOf(supers[i].address)).toJSON() as any)[0]).to.be.equal(1000001 + i);

        const subsAccounts = await getSubIdentityAccounts(helper, supers[i].address);
        // check sub-identities as account ids
        expect(subsAccounts).to.include.members(subs[i].map(x => x.address));

        for (let j = 0; j < subsAccounts.length; j++) {
          // check sub-identities' names
          expect((await getSubIdentityName(helper, subsAccounts[j]))[1]).to.be.deep.equal({Raw: `accounter #${j}`});
        }
      }
    });

    itSub('Setting sub-identities does not delete other existing but does overwrite own', async ({helper}) => {
      const crowdSize = 18;
      const crowd = await helper.arrange.createCrowd(crowdSize, 0n, superuser);
      const supers = [crowd.pop()!, crowd.pop()!, crowd.pop()!];

      const subsPerSup = crowd.length / supers.length;
      let subCount = 0;
      const subs = [
        crowd.slice(subCount, subCount += subsPerSup + 1),
        crowd.slice(subCount, subCount += subsPerSup),
        crowd.slice(subCount, subCount += subsPerSup - 1),
      ];

      const subsInfo1 = supers.map((acc, i) => [
        acc.address, [
          1000000n + BigInt(i + 1),
          subs[i].map((sub, j) => [
            sub.address, {Raw: `accounter #${j}`},
          ]),
        ],
      ]);
      await helper.getSudo().executeExtrinsic(superuser, 'api.tx.identity.forceSetSubs', [subsInfo1]);

      // change some sub-identities...
      subs[2].pop(); subs[2].pop(); subs[2].push(...await helper.arrange.createAccounts([0n], superuser));

      // ...and set them
      const subsInfo2 = [[
        supers[2].address, [
          999999n,
          subs[2].map((sub, j) => [
            sub.address, {Raw: `discounter #${j}`},
          ]),
        ],
      ]];
      await helper.getSudo().executeExtrinsic(superuser, 'api.tx.identity.forceSetSubs', [subsInfo2]);

      // make sure everything else is the same
      for (let i = 0; i < supers.length - 1; i++) {
        // check deposit
        expect(((await helper.getApi().query.identity.subsOf(supers[i].address)).toJSON() as any)[0]).to.be.equal(1000001 + i);

        const subsAccounts = await getSubIdentityAccounts(helper, supers[i].address);
        // check sub-identities as account ids
        expect(subsAccounts).to.include.members(subs[i].map(x => x.address));

        for (let j = 0; j < subsAccounts; j++) {
          // check sub-identities' names
          expect((await getSubIdentityName(helper, subsAccounts[j]))[1]).to.be.deep.equal({Raw: `accounter #${j}`});
        }
      }

      // check deposit
      expect(((await helper.getApi().query.identity.subsOf(supers[2].address)).toJSON() as any)[0]).to.be.equal(999999);

      const subsAccounts = await getSubIdentityAccounts(helper, supers[2].address);
      // check sub-identities as account ids
      expect(subsAccounts).to.include.members(subs[2].map(x => x.address));

      for (let j = 0; j < subsAccounts.length; j++) {
        // check sub-identities' names
        expect((await getSubIdentityName(helper, subsAccounts[j]))[1]).to.be.deep.equal({Raw: `discounter #${j}`});
      }
    });

    itSub('Removes sub-identities', async ({helper}) => {
      const crowdSize = 3;
      const crowd = await helper.arrange.createCrowd(crowdSize, 0n, superuser);
      const sup = crowd.pop()!;

      const subsInfo1 = [[
        sup.address, [
          1000000n,
          crowd.map((sub, j) => [
            sub.address, {Raw: `accounter #${j}`},
          ]),
        ],
      ]];
      await helper.getSudo().executeExtrinsic(superuser, 'api.tx.identity.forceSetSubs', [subsInfo1]);

      // empty sub-identities should delete the records
      const subsInfo2 = [[
        sup.address, [
          1000000n,
          [],
        ],
      ]];
      await helper.getSudo().executeExtrinsic(superuser, 'api.tx.identity.forceSetSubs', [subsInfo2]);

      // check deposit
      expect((await helper.getApi().query.identity.subsOf(sup.address)).toHuman()).to.be.deep.equal(['0', []]);

      for (let j = 0; j < crowd.length; j++) {
        // check sub-identities' names
        expect((await getSubIdentityName(helper, crowd[j].address))).to.be.null;
      }
    });

    itSub('Removing identities deletes associated sub-identities', async ({helper}) => {
      const crowd = await helper.arrange.createCrowd(3, 0n, superuser);
      const sup = crowd.pop()!;

      // insert identity
      const identities = [[sup.address, {info: {display: {Raw: 'mental'}}}]];
      await helper.getSudo().executeExtrinsic(superuser, 'api.tx.identity.forceInsertIdentities', [identities]);

      // and its sub-identities
      const subsInfo = [[
        sup.address, [
          1000000n,
          crowd.map((sub, j) => [
            sub.address, {Raw: `accounter #${j}`},
          ]),
        ],
      ]];
      await helper.getSudo().executeExtrinsic(superuser, 'api.tx.identity.forceSetSubs', [subsInfo]);

      // delete top identity
      await helper.getSudo().executeExtrinsic(superuser, 'api.tx.identity.forceRemoveIdentities', [[sup.address]]);

      // check that sub-identities are deleted
      expect((await helper.getApi().query.identity.subsOf(sup.address)).toHuman()).to.be.deep.equal(['0', []]);

      for (let j = 0; j < crowd.length; j++) {
        // check sub-identities' names
        expect((await getSubIdentityName(helper, crowd[j].address))).to.be.null;
      }
    });
  });

  after(async function() {
    await usingPlaygrounds(async helper => {
      if (helper.fetchMissingPalletNames([Pallets.Identity]).length != 0) return;

      const identitiesToRemove: string[] = await getIdentityAccounts(helper);
      await helper.getSudo().executeExtrinsic(superuser, 'api.tx.identity.forceRemoveIdentities', [identitiesToRemove]);
    });
  });
});
