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

import {IKeyringPair, Codec} from '@polkadot/types/types';
import {AccountId32} from '@polkadot/types/interfaces';
import {GenericAccountId} from '@polkadot/types/generic';
import {usingPlaygrounds, expect, itSub, Pallets, requirePalletsOrSkip} from '../util';
import {UniqueHelper} from '../util/playgrounds/unique';
import {Assertion} from 'chai';

async function getIdentityAccounts(helper: UniqueHelper) {
  const identities: AccountId32[] = [];
  for(const [key] of await helper.getApi().query.identity.identityOf.entries()) {
    identities.push(key.args[0]);
  }
  return identities;
}

async function getSubIdentityAccounts(helper: UniqueHelper, address: string) {
  return (await helper.getApi().query.identity.subsOf(address))[1];
}

async function getSuperIdentityName(helper: UniqueHelper, address: string | AccountId32) {
  return await helper.getApi().query.identity.superOf(address);
}

function instanceOfCodec(obj: any): obj is Codec {
  return typeof obj == 'object' && 'registry' in obj;
}

describe('Integration Test: Identities Manipulation', () => {
  let superuser: IKeyringPair;

  before(async function() {
    if(!process.env.RUN_COLLATOR_TESTS) this.skip();
    function equal(this: any, _super: any) {
      return function (this: any, obj2: any, args: any) {
        const obj = this._obj;
        // first we assert we are actually working with a model
        if(!instanceOfCodec(obj)) {
          _super.call(this, obj2, args);
          return;
        }

        this.assert(
          obj.eq(obj2),
          'expected #{act} to equal #{exp}',
          'expected #{act} to not equal #{exp}',
          // eslint-disable-next-line no-restricted-syntax
          obj2?.toHuman ? obj2.toHuman() : JSON.stringify(obj2),
          // eslint-disable-next-line no-restricted-syntax
          obj.toHuman(),
        );
      };
    }

    Assertion.overwriteMethod('eq', equal);
    Assertion.overwriteMethod('equal', equal);
    Assertion.overwriteMethod('equals', equal);

    await usingPlaygrounds(async (helper, privateKey) => {
      requirePalletsOrSkip(this, helper, [Pallets.Identity]);
      superuser = await privateKey('//Alice');
    });
  });

  itSub('Normal calls do not work', async ({helper}) => {
    // console.error = () => {};
    await expect(helper.executeExtrinsic(superuser, 'api.tx.identity.setIdentity', [{info: {display: {Raw: 'Meowser'}}}] as any))
      .to.be.rejectedWith(/Transaction call is not expected/);
  });

  describe('Identities', () => {
    itSub('Sets identities', async ({helper}) => {
      const oldIdentitiesCount = (await getIdentityAccounts(helper)).length;

      const crowdSize = 10;
      const crowd = await helper.arrange.createCrowd(crowdSize, 0n, superuser);
      const identities = crowd.map((acc, i) => [acc.address, {info: {display: {Raw: `accounter #${i}`}}}]);
      await helper.getSudo().executeExtrinsic(superuser, 'api.tx.identity.forceInsertIdentities', [identities] as any);

      expect((await getIdentityAccounts(helper)).length).to.be.equal(oldIdentitiesCount + crowdSize);
    });

    itSub('Setting identities does not delete existing but does overwrite', async ({helper}) => {
      const crowd = await helper.arrange.createCrowd(10, 0n, superuser);
      const identities = crowd.map((acc, i) => [acc.address, {info: {display: {Raw: `accounter #${i}`}}}]);

      // insert a single identity
      let singleIdentity = identities.pop()!;
      await helper.getSudo().executeExtrinsic(superuser, 'api.tx.identity.forceInsertIdentities', [[singleIdentity]] as any);

      const oldIdentitiesCount = (await getIdentityAccounts(helper)).length;

      // change an identity and push it with a few new others
      singleIdentity = [singleIdentity[0], {info: {display: {Raw: 'something special'}}}];
      identities.push(singleIdentity);
      await helper.getSudo().executeExtrinsic(superuser, 'api.tx.identity.forceInsertIdentities', [identities] as any);

      // oldIdentitiesCount + 9 because one identity is overwritten, not inserted on top
      expect((await getIdentityAccounts(helper)).length).to.be.equal(oldIdentitiesCount + 9);
      expect((await helper.callRpc('api.query.identity.identityOf', [singleIdentity[0]])).unwrap().info.display)
        .to.be.equal({Raw: 'something special'});
    });

    itSub('Removes identities', async ({helper}) => {
      const crowd = await helper.arrange.createCrowd(10, 0n, superuser);
      const identities = crowd.map((acc, i) => [acc.address, {info: {display: {Raw: `accounter #${i}`}}}]);
      await helper.getSudo().executeExtrinsic(superuser, 'api.tx.identity.forceInsertIdentities', [identities] as any);
      const oldIdentities = await getIdentityAccounts(helper);

      // delete a couple, check that they are no longer there
      const registry = helper.api!.registry;
      const scapegoats: AccountId32[] = [new GenericAccountId(registry, crowd.pop()!.address), new GenericAccountId(registry, crowd.pop()!.address)];
      await helper.getSudo().executeExtrinsic(superuser, 'api.tx.identity.forceRemoveIdentities', [scapegoats]);
      const newIdentities = await getIdentityAccounts(helper);
      expect(newIdentities.concat(scapegoats)).to.have.deep.members(oldIdentities);
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
      await helper.getSudo().executeExtrinsic(superuser, 'api.tx.identity.forceSetSubs', [subsInfo] as any);

      const registry = helper.api!.registry;
      for(let i = 0; i < supers.length; i++) {
        // check deposit
        expect((await helper.getApi().query.identity.subsOf(supers[i].address))[0].toNumber()).to.be.equal(1000001 + i);

        const subsAccounts = await getSubIdentityAccounts(helper, supers[i].address);
        // check sub-identities as account ids
        expect(subsAccounts).to.include.members(subs[i].map(x => new GenericAccountId(registry, x.address)));

        for(let j = 0; j < subsAccounts.length; j++) {
          // check sub-identities' names
          expect((await getSuperIdentityName(helper, subsAccounts[j])).unwrap()[1]).to.be.eq({Raw: `accounter #${j}`});
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
      await helper.getSudo().executeExtrinsic(superuser, 'api.tx.identity.forceSetSubs', [subsInfo1] as any);

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
      await helper.getSudo().executeExtrinsic(superuser, 'api.tx.identity.forceSetSubs', [subsInfo2] as any);

      // make sure everything else is the same
      const registry = helper.api!.registry;
      for(let i = 0; i < supers.length - 1; i++) {
        // check deposit
        expect((await helper.getApi().query.identity.subsOf(supers[i].address))[0].toNumber()).to.be.eq(1000001 + i);

        const subsAccounts = await getSubIdentityAccounts(helper, supers[i].address);
        // check sub-identities as account ids
        expect(subsAccounts).to.include.members(subs[i].map(x => new GenericAccountId(registry, x.address)));

        for(let j = 0; j < subsAccounts.length; j++) {
          // check sub-identities' names
          expect((await getSuperIdentityName(helper, subsAccounts[j])).unwrap()[1]).to.be.eq({Raw: `accounter #${j}`});
        }
      }

      // check deposit
      expect((await helper.getApi().query.identity.subsOf(supers[2].address))[0].toNumber()).to.be.equal(999999);

      const subsAccounts = await getSubIdentityAccounts(helper, supers[2].address);
      // check sub-identities as account ids
      expect(subsAccounts).to.include.members(subs[2].map(x => x.address));

      for(let j = 0; j < subsAccounts.length; j++) {
        // check sub-identities' names
        expect((await getSuperIdentityName(helper, subsAccounts[j])).unwrap()[1]).to.be.eq({Raw: `discounter #${j}`});
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
      await helper.getSudo().executeExtrinsic(superuser, 'api.tx.identity.forceSetSubs', [subsInfo1] as any);

      // empty sub-identities should delete the records
      const subsInfo2 = [[
        sup.address, [
          1000000n,
          [],
        ],
      ]];
      await helper.getSudo().executeExtrinsic(superuser, 'api.tx.identity.forceSetSubs', [subsInfo2] as any);

      // check deposit
      expect(await helper.getApi().query.identity.subsOf(sup.address)).to.be.eq([0, []]);

      for(let j = 0; j < crowd.length; j++) {
        // check sub-identities' names
        expect(await getSuperIdentityName(helper, crowd[j].address)).to.be.eq(null);
      }
    });

    itSub('Removing identities deletes associated sub-identities', async ({helper}) => {
      const crowd = await helper.arrange.createCrowd(3, 0n, superuser);
      const sup = crowd.pop()!;

      // insert identity
      const identities = [[sup.address, {info: {display: {Raw: 'mental'}}}]];
      await helper.getSudo().executeExtrinsic(superuser, 'api.tx.identity.forceInsertIdentities', [identities] as any);

      // and its sub-identities
      const subsInfo = [[
        sup.address, [
          1000000n,
          crowd.map((sub, j) => [
            sub.address, {Raw: `accounter #${j}`},
          ]),
        ],
      ]];
      await helper.getSudo().executeExtrinsic(superuser, 'api.tx.identity.forceSetSubs', [subsInfo] as any);

      // delete top identity
      await helper.getSudo().executeExtrinsic(superuser, 'api.tx.identity.forceRemoveIdentities', [[sup.address]]);

      // check that sub-identities are deleted
      expect(await helper.getApi().query.identity.subsOf(sup.address)).to.be.eq([0, []]);

      for(let j = 0; j < crowd.length; j++) {
        // check sub-identities' names
        expect(await getSuperIdentityName(helper, crowd[j].address)).to.be.eq(null);
      }
    });
  });

  after(async function() {
    if(!process.env.RUN_COLLATOR_TESTS) return;

    await usingPlaygrounds(async helper => {
      if(helper.fetchMissingPalletNames([Pallets.Identity]).length != 0) return;

      const identitiesToRemove: AccountId32[] = await getIdentityAccounts(helper);
      await helper.getSudo().executeExtrinsic(superuser, 'api.tx.identity.forceRemoveIdentities', [identitiesToRemove]);
    });
  });
});
