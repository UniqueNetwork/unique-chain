// Copyright 2019-2023 Unique Network (Gibraltar) Ltd.
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
import {UniqueHelper} from '../util/playgrounds/unique';
import {usingPlaygrounds, expect, itSub, Pallets, requirePalletsOrSkip} from './../util';

type CollectiveName = 'council' | 'technicalCommittee' | 'fellowship';

/** Get a collective pallet's helper group according to its name */
function getCollective(helper: UniqueHelper, name: CollectiveName) {
  switch (name) {
    case 'council':
      return helper.council;
    case 'fellowship':
      return helper.fellowship;
    case 'technicalCommittee':
      return helper.technicalCommittee;
  }
}
getCollective.sudo = (helper: UniqueHelper, name: CollectiveName) => getCollective(helper.getSudo(), name);

/** Get a membership pallet's helper group according to its name */
function getMembership(helper: UniqueHelper, name: CollectiveName) {
  switch (name) {
    case 'council':
      return helper.councilMembership;
    case 'fellowship':
      return helper.fellowshipMembership;
    case 'technicalCommittee':
      return helper.technicalCommitteeMembership;
  }
}
getMembership.sudo = (helper: UniqueHelper, name: CollectiveName) => getMembership(helper.getSudo(), name);

/** Propose a motion and vote for it immediately with all members,
 * optionally using the approval rate, a proportion of members voting 'aye' to voting 'nay' */
async function proposeAndCollectivelyVote(
  helper: UniqueHelper,
  collectiveName: CollectiveName,
  members: IKeyringPair[],
  proposal: any,
  approvalRate = 1.,
): Promise<{hash: string, index: number}> {
  const collective = getCollective(helper, collectiveName);
  const proposalResult = await collective.propose(members[0], proposal, Math.ceil(members.length * approvalRate));
  // if such index is returned, then it must have been executed immediately, no approvals are necessary
  if(proposalResult.index === -1) return proposalResult;

  // have all members vote for the proposal
  await collectivelyVote(helper, collectiveName, members, proposalResult, approvalRate);
  await collective.closeProposal(members[0], proposalResult.hash, proposalResult.index);

  return proposalResult;
}

/** Have an array of collective members vote for a proposal,
 * optionally using the approval rate, a proportion of members voting 'aye' to voting 'nay' */
function collectivelyVote(
  helper: UniqueHelper,
  collectiveName: CollectiveName,
  members: IKeyringPair[],
  proposal: {hash: string, index: number},
  approvalRate = 1.0,
) {
  const collective = getCollective(helper, collectiveName);
  return Promise.all(members.map((m: IKeyringPair, i) =>
    collective.vote(m, proposal.hash, proposal.index, i / members.length <= approvalRate)));
}

describe('Integration test: Governance', () => {
  let donor: IKeyringPair;
  let superuser: IKeyringPair;
  let crowd: IKeyringPair[] = [];
  const backups: {[key: string]: {members: string[], prime: '', proposals: string[]}} = {
    'council': {members: [], prime: '', proposals: []},
    'technicalCommittee': {members: [], prime: '', proposals: []},
    'fellowship': {members: [], prime: '', proposals: []},
  };

  before(async function() {
    await usingPlaygrounds(async (helper, privateKey) => {
      requirePalletsOrSkip(this, helper, [Pallets.Democracy]);

      donor = await privateKey({url: import.meta.url});
      superuser = await privateKey('//Alice');
      crowd = await helper.arrange.createCrowd(25, 50n, donor);

      for(const key of Object.keys(backups)) {
        backups[key].members = await getCollective(helper, key as any).getMembers();
        backups[key].prime = await getCollective(helper, key as any).getPrimeMember();
        backups[key].proposals = await getCollective(helper, key as any).getProposals();
      }
    });
  });

  /** Function signature expecting an array of keyrings to be returned */
  interface GetAddresses {
    (): IKeyringPair[];
  }

  /** Function signature taking another closure to get members of the collective on asynchronous demand */
  interface CollectiveCallback {
    (members: GetAddresses): void;
  }

  /** Optional arguments for a describe expanditure */
  interface CollectiveDescribeOptions {
    extraPosTests?: CollectiveCallback[],
    extraNegTests?: CollectiveCallback[],
    skip?: boolean,
  }

  /** Expands into a test suite with positive and negative sub-suites.
   * Base tests include sudo operations on the collective. */
  function describeCollectiveMembership(
    name: CollectiveName,
    options: CollectiveDescribeOptions = {},
  ) {
    /** Shortcut to get the collective pallet's helper group according to the name in the scope */
    const collective = (helper: UniqueHelper) => getCollective(helper, name);
    collective.sudo = (helper: UniqueHelper) => collective(helper.getSudo());

    /** Shortcut to get the membership pallet's helper group according to the name in the scope */
    const membership = (helper: UniqueHelper) => getMembership(helper, name);
    membership.sudo = (helper: UniqueHelper) => membership(helper.getSudo());

    (options.skip ? describe.skip : describe)(name.charAt(0).toUpperCase() + name.slice(1), () => {
      let alice: IKeyringPair;
      let bob: IKeyringPair;
      let possibleMembers: IKeyringPair[] = [];
      let members: IKeyringPair[] = [];

      /** Update members array with actual members (that are present in this scope) */
      async function updateMembers(helper: UniqueHelper) {
        members = (await collective(helper).getMembers())
          .map((m: string) => possibleMembers.find((m2: IKeyringPair) => m2.address === m));
        //.filter((m: IKeyringPair) => m !== undefined);

        expect(members).to.not.include(undefined);
      }

      /** Callback to get actual members on demand in an async environment */
      const getMembers = () => members;

      before(async function() {
        await usingPlaygrounds(async (helper) => {
          [alice, bob] = await helper.arrange.createAccounts([1000n, 1000n], superuser);
          possibleMembers = [alice, bob].concat(crowd);
          await membership.sudo(helper).resetMembers(superuser, [alice.address, bob.address]);
          await updateMembers(helper);
        });
      });

      describe('Positive', () => {
        afterEach(async function() {
          await usingPlaygrounds(async (helper) => {
            await updateMembers(helper);
          });
        });

        itSub('Superuser can add a member', async ({helper}) => {
          const newMember = crowd.pop()!;
          const collectiveSize = (await collective(helper).getMembers()).length;
          await membership.sudo(helper).addMember(superuser, newMember.address);
          expect(await collective(helper).getMembers()).to.include(newMember.address).and.be.length(collectiveSize + 1);
        });

        itSub('Superuser can remove a member', async ({helper}) => {
          const members = await collective(helper).getMembers();
          expect(members.length).to.be.greaterThan(1, `Test invariant failed: ${name} does not have enough members!`);
          const member = members.filter((x: string) => x !== alice.address)[0];

          await membership.sudo(helper).removeMember(superuser, member);
          expect(await collective(helper).getMembers()).to.be.lengthOf(members.length - 1).and.not.include(member);
        });

        itSub.skip('Council can add member', async (helper) => {

        });

        itSub.skip('Council can remove member', async (helper) => {

        });

        itSub.skip('Council or TechCom member can add fellowship member', async (helper) => {

        });

        itSub.skip('Council can promote fellowship member', async (helper) => {

        });

        itSub.skip('Council can demote fellowship member', async (helper) => {

        });

        options.extraPosTests?.forEach(test => test(getMembers));
      });

      describe('Negative', () => {
        afterEach(async function() {
          await usingPlaygrounds(async (helper) => {
            await updateMembers(helper);
          });
        });

        itSub('Cannot add a duplicate member', async ({helper}) => {
          const members = await collective(helper).getMembers();
          expect(members.length).to.be.greaterThan(0, `Test invariant failed: ${name} is empty!`);
          await expect(membership.sudo(helper).addMember(superuser, members[0])).to.be.rejectedWith(/AlreadyMember/);
        });

        itSub('Cannot add a member without the collective decision', async ({helper}) => {
          const zeroAccount = helper.arrange.createEmptyAccount();
          await expect(membership(helper).addMember(alice, zeroAccount.address)).to.be.rejectedWith(/BadOrigin/);
        });

        itSub.skip('Cannot add a member from another collective', async (helper) => {

        });

        itSub.skip('TechCom member cannot promote/demote fellowship member', async (helper) => {

        });

        itSub.skip('TechCom cannot promote/demote fellowship member', async (helper) => {

        });

        itSub.skip('Council member cannot promote/demote fellowship member', async (helper) => {

        });

        options.extraNegTests?.forEach(test => test(getMembers));
      });
    });
  }

  describeCollectiveMembership.skip = (
    name: CollectiveName,
    options: CollectiveDescribeOptions = {skip: true},
  ) => {
    options.skip = true;
    return describeCollectiveMembership(name, options);
  };

  describe('Membership', () => {
    describeCollectiveMembership('council', {
      extraPosTests: [
        (members: GetAddresses) => itSub('Council member can propose to and add another', async ({helper}) => {
          const newMember = crowd.pop()!;
          const call = helper.constructApiCall('api.tx.councilMembership.addMember', [newMember.address]);

          const proposal = await proposeAndCollectivelyVote(helper, 'council', members(), call);

          // make sure proposal was executed, not simply put up for voting due to vote threshold being 1 vote
          expect(await helper.council.getProposalCallOf(proposal.hash)).to.be.null;
          expect(await helper.council.getMembers()).to.be.lengthOf(members().length + 1).and.include(newMember.address);
        }),
      ],
      extraNegTests: [
        (members: GetAddresses) => itSub('Council members cannot add another if less than 100% voted for it', async ({helper}) => {
          const newMember = crowd.pop()!;
          const call = helper.constructApiCall('api.tx.councilMembership.addMember', [newMember.address]);

          await expect(proposeAndCollectivelyVote(helper, 'council', members().slice(1), call))
            .to.be.rejectedWith(/BadOrigin/);
        }),
      ],
    });

    describeCollectiveMembership('technicalCommittee', {
      extraPosTests: [
        (members: GetAddresses) => itSub('Councilor can propose to and add a techcommie', async ({helper}) => {
          const council = crowd.splice(0, 3);
          await helper.getSudo().councilMembership.resetMembers(superuser, council.map(m => m.address));

          const newMember = crowd.pop()!;
          const call = helper.constructApiCall('api.tx.technicalCommitteeMembership.addMember', [newMember.address]);
          const proposal = await proposeAndCollectivelyVote(helper, 'council', council, call, 0.5);

          expect(await helper.council.getProposalCallOf(proposal.hash)).to.be.null;
          expect(await helper.technicalCommittee.getMembers()).to.be.lengthOf(members().length + 1).and.include(newMember.address);
        }),
      ],
      extraNegTests: [
        (members: GetAddresses) => itSub('Technical committee members cannot add another by themselves', async ({helper}) => {
          const newMember = helper.arrange.createEmptyAccount();
          const call = helper.constructApiCall('api.tx.technicalCommitteeMembership.addMember', [newMember.address]);

          await expect(proposeAndCollectivelyVote(helper, 'technicalCommittee', members(), call))
            .to.be.rejectedWith(/BadOrigin/);
        }),
      ],
    });

    describeCollectiveMembership('fellowship', {
      extraPosTests: [
        (members: GetAddresses) => itSub('Technical committee member can propose to and add a fellow', async ({helper}) => {
          const techcom = crowd.splice(0, 2);
          await helper.getSudo().technicalCommitteeMembership.resetMembers(superuser, techcom.map(m => m.address));

          const newMember = crowd.pop()!;
          const call = helper.constructApiCall('api.tx.fellowshipMembership.addMember', [newMember.address]);
          await helper.technicalCommittee.execute(techcom[0], call);

          expect(await helper.fellowship.getMembers()).to.be.lengthOf(members().length + 1).and.include(newMember.address);
        }),
      ],
      extraNegTests: [(members: GetAddresses) => {
        itSub('Fellows cannot add another by themselves', async ({helper}) => {
          const newMember = helper.arrange.createEmptyAccount();
          const call = helper.constructApiCall('api.tx.fellowshipMembership.addMember', [newMember.address]);

          await expect(proposeAndCollectivelyVote(helper, 'fellowship', members(), call))
            .to.be.rejectedWith(/BadOrigin/);
        });
      }],
    });
  });

  describe('Proposals (council)', () => {
    let council: IKeyringPair[];
    let prime: IKeyringPair;

    /** Set the prime member */
    const setPrime = async (helper: UniqueHelper, account: IKeyringPair) => {
      await helper.getSudo().councilMembership.setPrime(superuser, account.address);
      prime = account;
    };

    /** Find and get a councilor that is not the prime member */
    const nonPrime = (): IKeyringPair => council.find(m => m !== prime)!;

    /** Create a non-sensical call for a proposal that will have no effect anyway.
     * Expected approval rate by the council = 50%.
     */
    const meaninglessCall = (helper: UniqueHelper) => {
      const someone = crowd.pop()!;
      // testing techcom membership since we need only 50% member approval-vote threshold to execute it
      const call = helper.constructApiCall('api.tx.technicalCommitteeMembership.swapMember', [someone.address, someone.address]);
      return call; // {call, account: someone};
    };

    before(async function() {
      await usingPlaygrounds(async (helper) => {
        council = await helper.arrange.createCrowd(6, 1000n, donor);
        await helper.getSudo().councilMembership.resetMembers(superuser, council.map(m => m.address));

        await setPrime(helper, council[0]);
      });
    });

    describe('Positive', () => {
      itSub('Prime council member\'s vote replaces missing votes', async ({helper}) => {
        if(await helper.council.getPrimeMember() != prime.address) await setPrime(helper, council[0]);
        expect(await helper.council.getPrimeMember()).to.be.equal(prime.address);

        // todo
        const result = await proposeAndCollectivelyVote(helper, 'council', council.slice(0, council.length / 2), meaninglessCall(helper), 0.5);

        expect(await helper.council.getProposalCallOf(result.hash)).to.be.null;
      });
    });

    describe('Negative', () => {
      itSub('Cannot close a proposal before meeting the vote threshold', async ({helper}) => {
        const proposal = await helper.council.propose(council[0], meaninglessCall(helper), 3);
        await helper.council.vote(council[0], proposal.hash, proposal.index, false);
        await helper.council.vote(council[1], proposal.hash, proposal.index, false);
        await helper.council.vote(council[2], proposal.hash, proposal.index, false);
        await expect(helper.council.closeProposal(council[1], proposal.hash, proposal.index))
          .to.be.rejectedWith(/TooEarly/);

        // todo
        await collectivelyVote(helper, 'council', council.slice(3), proposal);
        await expect(helper.council.closeProposal(nonPrime(), proposal.hash, proposal.index))
          .to.be.rejectedWith(/disapproved by council/);
      });

      itSub('Cannot duplicate an existing proposal', async ({helper}) => {
        const call = meaninglessCall(helper);
        await helper.council.propose(council[0], call, 2);
        await expect(helper.council.propose(council[1], call, 2))
          .to.be.rejectedWith(/council\.DuplicateProposal/);
      });

      itSub('Non-member cannot make a proposal', async ({helper}) => {
        const someone = crowd.pop()!;

        await expect(helper.council.propose(someone, meaninglessCall(helper), 2))
          .to.be.rejectedWith(/council\.NotMember/);
      });

      itSub('Non-member cannot vote for a proposal', async ({helper}) => {
        const someone = crowd.pop()!;
        const proposal = await helper.council.propose(council[0], meaninglessCall(helper), 2);
        await expect(helper.council.vote(someone, proposal.hash, proposal.index, false))
          .to.be.rejectedWith(/council\.NotMember/);
      });
    });
  });



  describe('Democracy', () => {

    describe('Negative', () => {
      // todo before => note preimage to propose
      itSub('Regular user cannot propose', async ({helper}) => {
        const someone = crowd.pop()!;
        const call = helper.constructApiCall('api.tx.councilMembership.addMember', [someone.address]);
        // using donor since preimage creation costs too much
        const preimageHash = await helper.preimage.notePreimageFromCall(donor, call, true);
        await expect(helper.democracy.propose(someone, preimageHash, 10n)).to.be.rejectedWith(/BadOrigin/);
      });

      itSub('Regular user cannot propose', async ({helper}) => {
        const someone = crowd.pop()!;
        await helper.democracy.delegate(someone, donor.address, 6, 10n);
      });

      itSub('Regular user cannot propose', async ({helper}) => {

      });
    });
  });

  after(async function() {
    await usingPlaygrounds(async (helper) => {
      if(helper.fetchMissingPalletNames([Pallets.Democracy]).length != 0) return;

      let nonce = 0;

      for(const key of Object.keys(backups)) {
        nonce = await helper.chain.getNonce(superuser.address);

        const proposals = (await getCollective(helper, key as any).getProposals())
          .filter((p: string) => !backups[key].proposals.includes(p));
        await Promise.all(proposals.map((hash: string) => helper.getSudo().executeExtrinsic(superuser, `api.tx.${key}.disapproveProposal`, [hash], true, {nonce: nonce++})));

        await getMembership(helper.getSudo(), key as any).resetMembers(superuser, backups[key].members);

        if(backups[key].prime) await getMembership(helper.getSudo(), key as any).setPrime(superuser, backups[key].prime);
        else await getMembership(helper.getSudo(), key as any).clearPrime(superuser);
      }
    });
  });
});
// todo fellowship can propose normally
// councilor can propose externally
// techie can fast track
// guy can black list, doesn't succeed afterward
// guy can veto, can propose again
/*
  democracy:

  councilor can't fast track
  all council can't fast track
  techie can't fast track
  all techcom can fast track
  */