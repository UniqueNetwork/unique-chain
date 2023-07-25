import {IKeyringPair} from '@polkadot/types/types';
import {usingPlaygrounds, itSub, expect, Pallets, requirePalletsOrSkip} from './util';
import {Event} from './util/playgrounds/unique.dev';
import {UniqueHelper} from './util/playgrounds/unique';
import {DAYS, MINUTES} from './util/playgrounds/types';

const democracyLaunchPeriod = 35;
const democracyVotingPeriod = 35;
const democracyEnactmentPeriod = 40;

describe('Governance: Council tests', () => {
  let superuser: IKeyringPair;
  let donor: IKeyringPair;

  let alex: IKeyringPair;
  let ildar: IKeyringPair;
  let charu: IKeyringPair;
  let filip: IKeyringPair;
  let irina: IKeyringPair;

  const unanimousCouncilThreshold = 5;

  before(async function() {
    await usingPlaygrounds(async (helper, privateKey) => {
      requirePalletsOrSkip(this, helper, [Pallets.Council]);
      superuser = await privateKey('//Alice');
      donor = await privateKey({url: import.meta.url});
      [alex, ildar, charu, filip, irina] = await helper.arrange.createAccounts([10_000n, 10_000n, 10_000n, 10_000n, 10_000n], donor);
      const sudo = helper.getSudo();
      {
        const members = (await helper.callRpc('api.query.councilMembership.members')).toJSON();
        expect(members).to.be.deep.equal([]);
      }
      const expectedMembers = [alex, ildar, charu, filip, irina];
      for(const member of expectedMembers) {
        await sudo.executeExtrinsic(superuser, 'api.tx.councilMembership.addMember', [member.address]);
      }
      await sudo.executeExtrinsic(superuser, 'api.tx.councilMembership.setPrime', [alex.address]);
      {
        const members = (await helper.callRpc('api.query.councilMembership.members')).toJSON();
        expect(members).to.containSubset(expectedMembers.map((x: IKeyringPair) => x.address));
        expect(members.length).to.be.equal(expectedMembers.length);
      }
    });
  });

  after(async () => {
    await usingPlaygrounds(async (helper) => {
      let members = (await helper.callRpc('api.query.councilMembership.members')).toJSON();
      if(members.length) {
        const sudo = helper.getSudo();
        for(const address of members) {
          await sudo.executeExtrinsic(superuser, 'api.tx.councilMembership.removeMember', [address]);
        }
        members = (await helper.callRpc('api.query.councilMembership.members')).toJSON();
      }
      expect(members).to.be.deep.equal([]);
    });
  });

  itSub('Unanimous Council can externally propose SuperMajorityAgainst', async ({helper}) => {
    const [forceSetBalanceReceiver] = await helper.arrange.createAccounts([0n], donor);
    const forceSetBalanceTestValue = 20n * 10n ** 25n;

    const democracyProposal = await helper.constructApiCall('api.tx.balances.forceSetBalance', [
      forceSetBalanceReceiver.address, forceSetBalanceTestValue,
    ]).method.toHex();

    const councilProposal = await helper.constructApiCall('api.tx.democracy.externalProposeDefault', [{
      Inline: democracyProposal,
    }]);

    const proposeResult = await helper.council.propose(
      filip,
      councilProposal,
      unanimousCouncilThreshold,
    );

    const councilProposedEvent = Event.Council.Proposed.expect(proposeResult);
    const proposalIndex = councilProposedEvent.proposalIndex;
    const proposalHash = councilProposedEvent.proposalHash;

    await helper.council.vote(alex, proposalHash, proposalIndex, true);
    await helper.council.vote(ildar, proposalHash, proposalIndex, true);
    await helper.council.vote(charu, proposalHash, proposalIndex, true);
    await helper.council.vote(filip, proposalHash, proposalIndex, true);
    await helper.council.vote(irina, proposalHash, proposalIndex, true);

    await helper.council.close(filip, proposalHash, proposalIndex);

    const democracyStartedEvent = await helper.wait.expectEvent(democracyLaunchPeriod, Event.Democracy.Started);
    const democracyReferendumIndex = democracyStartedEvent.referendumIndex;
    const democracyThreshold = democracyStartedEvent.threshold;

    expect(democracyThreshold).to.be.equal('SuperMajorityAgainst');

    await helper.democracy.vote(filip, democracyReferendumIndex, {
      Standard: {
        vote: {
          aye: true,
          conviction: 1,
        },
        balance: 10_000n,
      },
    });

    const passedReferendumEvent = await helper.wait.expectEvent(democracyVotingPeriod, Event.Democracy.Passed);
    expect(passedReferendumEvent.referendumIndex).to.be.equal(democracyReferendumIndex);

    await helper.wait.expectEvent(democracyEnactmentPeriod, Event.GovScheduler.Dispatched);
    const receiverBalance = await helper.balance.getSubstrate(forceSetBalanceReceiver.address);
    expect(receiverBalance).to.be.equal(forceSetBalanceTestValue);
  });

  itSub.skip('Council prime member vote is the default', async ({helper}) => {

  });

  itSub.skip('Superuser can add a member', async ({helper}) => {

  });

  itSub.skip('Superuser can remove a member', async ({helper}) => {

  });

  itSub.skip('Council can add TechComm member', async ({helper}) => {

  });

  itSub.skip('Council can remove TechComm member', async ({helper}) => {

  });

  itSub.skip('Council member can add Fellowship member', async ({helper}) => {

  });

  itSub.skip('Council can promote Fellowship member', async ({helper}) => {

  });

  itSub.skip('Council can demote Fellowship member', async ({helper}) => {

  });

  itSub.skip('[Negative] Council cannot add Council member', async ({helper}) => {

  });

  itSub.skip('[Negative] Council cannot remove Council member', async ({helper}) => {

  });

  itSub.skip('[Negative] Less than 100% of Council cannot externally propose SuperMajorityAgainst', async ({helper}) => {

  });

  itSub.skip('[Negative] Council cannot cannot submit regular democracy proposal', async ({helper}) => {

  });

  itSub.skip('[Negative] Council cannot externally propose SimpleMajority', async ({helper}) => {

  });

  itSub.skip('[Negative] Council cannot externally propose SuperMajorityApprove', async ({helper}) => {

  });

  itSub.skip('[Negative] Cannot add a duplicate Council member', async ({helper}) => {

  });

  itSub.skip('[Negative] Cannot add a duplicate TechComm member', async ({helper}) => {

  });

  itSub.skip('[Negative] Cannot add a duplicate Fellowship member', async ({helper}) => {

  });

  itSub.skip('[Negative] Council member cannot add/remove a Council member', async ({helper}) => {

  });

  itSub.skip('[Negative] Council cannot set Council prime member', async ({helper}) => {

  });

  itSub.skip('[Negative] Council member cannot set Council prime member', async ({helper}) => {

  });

  itSub.skip('[Negative] Council member cannot add/remove a TechComm member', async ({helper}) => {

  });

  itSub.skip('[Negative] Council member cannot add/remove a Fellowship member', async ({helper}) => {

  });

  itSub.skip('[Negative] Council member cannot promote/demote a Fellowship member', async ({helper}) => {

  });

  itSub.skip('[Negative] Council cannot fast-track Democracy proposals', async ({helper}) => {

  });

  itSub.skip('[Negative] Council member cannot fast-track Democracy proposals', async ({helper}) => {

  });

  itSub.skip('[Negative] Council cannot cancel approved Democracy proposals', async ({helper}) => {

  });

  itSub.skip('[Negative] Council cannot cancel ongoing Democracy referendums', async ({helper}) => {

  });

  itSub.skip('[Negative] Council cannot cancel queued Democracy proposals', async ({helper}) => {

  });

  itSub.skip('[Negative] Council cannot cancel Fellowship referendums', async ({helper}) => {

  });

  itSub.skip('[Negative] Council member cannot cancel approved Democracy proposals', async ({helper}) => {

  });

  itSub.skip('[Negative] Council member cannot cancel ongoing Democracy referendums', async ({helper}) => {

  });

  itSub.skip('[Negative] Council member cannot cancel queued Democracy proposals', async ({helper}) => {

  });

  itSub.skip('[Negative] Council member cannot cancel Fellowship referendums', async ({helper}) => {

  });

  itSub.skip('[Negative] Council referendum cannot be closed until the voting threshold is met', async ({helper}) => {

  });

  itSub.skip('[Negative] Council member cannot propose an existing Council proposal', async ({helper}) => {

  });

  itSub.skip('[Negative] Council non-member cannot propose', async ({helper}) => {

  });

  itSub.skip('[Negative] Council non-member cannot vote', async ({helper}) => {

  });
});

describe('Governance: Technical Committee tests', () => {
  let superuser: IKeyringPair;
  let greg: IKeyringPair;
  let andy: IKeyringPair;
  let constantine: IKeyringPair;
  let donor: IKeyringPair;
  let preImageHash: string;

  before(async function() {
    await usingPlaygrounds(async (helper, privateKey) => {
      requirePalletsOrSkip(this, helper, [Pallets.TechnicalCommittee]);
      superuser = await privateKey('//Alice');
      donor = await privateKey({url: import.meta.url});
      [greg, andy, constantine] = await helper.arrange.createAccounts([10_000n, 10_000n, 10_000n], donor);
      const sudo = helper.getSudo();
      {
        const members = (await helper.callRpc('api.query.technicalCommitteeMembership.members')).toJSON();
        expect(members).to.be.deep.equal([]);
      }
      await sudo.executeExtrinsic(superuser, 'api.tx.technicalCommitteeMembership.addMember', [greg.address]);
      await sudo.executeExtrinsic(superuser, 'api.tx.technicalCommitteeMembership.addMember', [andy.address]);
      await sudo.executeExtrinsic(superuser, 'api.tx.technicalCommitteeMembership.addMember', [constantine.address]);
      await sudo.executeExtrinsic(superuser, 'api.tx.technicalCommitteeMembership.setPrime', [greg.address]);
      {
        const members = (await helper.callRpc('api.query.technicalCommitteeMembership.members')).toJSON();
        expect(members).to.containSubset([greg.address, andy.address, constantine.address]);
        expect(members.length).to.be.equal(3);
      }
      const proposalCall = await helper.constructApiCall('api.tx.balances.forceSetBalance', [donor.address, 20n * 10n ** 25n]);
      preImageHash = await helper.preimage.notePreimageFromCall(superuser, proposalCall, true);
    });
  });

  after(async () => {
    await usingPlaygrounds(async (helper) => {
      let members = (await helper.callRpc('api.query.technicalCommitteeMembership.members')).toJSON();
      if(members.length) {
        const sudo = helper.getSudo();
        for(const address of members) {
          await sudo.executeExtrinsic(superuser, 'api.tx.technicalCommitteeMembership.removeMember', [address]);
        }
        members = (await helper.callRpc('api.query.technicalCommitteeMembership.members')).toJSON();
      }
      expect(members).to.be.deep.equal([]);
      await helper.preimage.unnotePreimage(superuser, preImageHash);
    });
  });

  itSub.skip('TechComm can fast-track Democracy proposals', async ({helper}) => {
  });

  itSub.skip('TechComm can cancel approved Democracy proposals', async ({helper}) => {

  });

  itSub.skip('TechComm can cancel ongoing Democracy referendums', async ({helper}) => {

  });

  itSub.skip('TechComm can cancel queued Democracy proposals', async ({helper}) => {

  });

  itSub.skip('TechComm can blacklist Democracy proposals', async ({helper}) => {

  });

  itSub.skip('TechComm member can veto Democracy proposals', async ({helper}) => {

  });

  itSub.skip('TechComm can cancel Fellowship referendums', async ({helper}) => {

  });

  itSub.skip('TechComm member can add a Fellowship member', async ({helper}) => {

  });

  itSub.skip('[Negative] TechComm cannot submit regular democracy proposal', async () => {

  });

  itSub.skip('[Negative] TechComm cannot externally propose SuperMajorityAgainst', async ({helper}) => {

  });

  itSub.skip('[Negative] TechComm cannot externally propose SimpleMajority', async ({helper}) => {

  });

  itSub.skip('[Negative] TechComm cannot externally propose SuperMajorityApprove', async ({helper}) => {

  });

  itSub.skip('[Negative] TechComm member cannot submit regular democracy proposal', async () => {

  });

  itSub.skip('[Negative] TechComm member cannot externally propose SuperMajorityAgainst', async ({helper}) => {

  });

  itSub.skip('[Negative] TechComm member cannot externally propose SimpleMajority', async ({helper}) => {

  });

  itSub.skip('[Negative] TechComm member cannot externally propose SuperMajorityApprove', async ({helper}) => {

  });

  itSub.skip('[Negative] TechComm cannot promote/demote Fellowship member', async ({helper}) => {

  });

  itSub.skip('[Negative] TechComm member cannot promote/demote Fellowship member', async ({helper}) => {

  });

  itSub.skip('[Negative] TechComm cannot add/remove a Council member', async ({helper}) => {

  });

  itSub.skip('[Negative] TechComm member cannot add/remove a Council member', async ({helper}) => {

  });

  itSub.skip('[Negative] TechComm cannot set Council prime member', async ({helper}) => {

  });

  itSub.skip('[Negative] TechComm member cannot set Council prime member', async ({helper}) => {

  });

  itSub.skip('[Negative] TechComm cannot add/remove a TechComm member', async ({helper}) => {

  });

  itSub.skip('[Negative] TechComm member cannot add/remove a TechComm member', async ({helper}) => {

  });

  itSub.skip('[Negative] TechComm cannot remove a Fellowship member', async ({helper}) => {

  });

  itSub.skip('[Negative] TechComm member cannot remove a Fellowship member', async ({helper}) => {

  });

  itSub.skip('[Negative] TechComm member cannot fast-track Democracy proposals', async ({helper}) => {

  });

  itSub.skip('[Negative] TechComm member cannot cancel approved Democracy proposals', async ({helper}) => {

  });

  itSub.skip('[Negative] TechComm member cannot cancel ongoing Democracy referendums', async ({helper}) => {

  });

  itSub.skip('[Negative] TechComm member cannot cancel queued Democracy proposals', async ({helper}) => {

  });

  itSub.skip('[Negative] TechComm member cannot blacklist Democracy proposals', async ({helper}) => {

  });

  itSub.skip('[Negative] TechComm member cannot veto Democracy proposals until the cool-off period pass', async ({helper}) => {

  });

  itSub.skip('[Negative] TechComm member cannot cancel Fellowship referendums', async ({helper}) => {

  });

  itSub.skip('[Negative] TechComm referendum cannot be closed until the voting threshold is met', async ({helper}) => {

  });

  itSub.skip('[Negative] TechComm member cannot propose an existing TechComm proposal', async ({helper}) => {

  });

  itSub.skip('[Negative] TechComm non-member cannot propose', async ({helper}) => {

  });

  itSub.skip('[Negative] TechComm non-member cannot vote', async ({helper}) => {

  });
});

describe('Governance: Fellowship tests', () => {
  const numMembersInRank = 3;
  const memberBalance = 5000n;
  const rankLimit = 7;
  const members: IKeyringPair[][] = [];

  let rank1Proposer: IKeyringPair;

  let sudoer: any;
  let donor: any;

  const submissionDeposit = 1000n;
  const decisionDeposit = 10n;

  const democracyTrackId = 10;
  const democracyTrackMinRank = 3;
  const fellowshipPropositionOrigin = 'FellowshipProposition';

  const fellowshipPreparePeriod = 3;
  const fellowshipConfirmPeriod = 3;
  const fellowshipMinEnactPeriod = 1;

  const defaultEnactmentMoment = {After: 50};

  let dummyProposalCount = 0;
  function dummyProposal(helper: UniqueHelper) {
    dummyProposalCount++;
    return {
      Inline: helper.constructApiCall('api.tx.system.remark', ['dummy proposal' + dummyProposalCount]).method.toHex(),
    };
  }

  async function voteUnanimouslyInFellowship(helper: UniqueHelper, minRank: number, referendumIndex: number) {
    for(let rank = minRank; rank < rankLimit; rank++) {
      for(const member of members[rank]) {
        await helper.fellowship.collective.vote(member, referendumIndex, true);
      }
    }
  }

  before(async function() {
    await usingPlaygrounds(async (helper, privateKey) => {
      requirePalletsOrSkip(this, helper, [Pallets.Democracy, Pallets.Fellowship]);

      sudoer = await privateKey('//Alice');

      donor = await privateKey({url: import.meta.url});

      for(let i = 0; i < rankLimit; i++) {
        const rankMembers = await helper.arrange.createAccounts(
          Array(numMembersInRank).fill(memberBalance),
          donor,
        );

        for(const member of rankMembers) {
          await helper.getSudo().fellowship.collective.addMember(sudoer, member.address);

          for(let rank = 0; rank < i; rank++) {
            await helper.getSudo().fellowship.collective.promote(sudoer, member.address);
          }
        }

        members.push(rankMembers);
      }

      rank1Proposer = members[1][0];
    });
  });

  after(async () => {
    await usingPlaygrounds(async (helper) => {
      for(let rank = 0; rank < rankLimit; rank++) {
        for(const member of members[rank]) {
          await helper.getSudo().fellowship.collective.removeMember(sudoer, member.address, rank);
        }
      }
    });
  });

  itSub('FellowshipProposition can submit regular Democracy proposals', async ({helper}) => {
    const democracyProposal = dummyProposal(helper);
    const fellowshipProposal = {
      Inline: helper.constructApiCall('api.tx.democracy.propose', [democracyProposal, 0]).method.toHex(),
    };

    const submitResult = await helper.fellowship.referenda.submit(
      rank1Proposer,
      fellowshipPropositionOrigin,
      fellowshipProposal,
      {After: 0},
    );

    const fellowshipReferendumIndex = Event.FellowshipReferenda.Submitted.expect(submitResult).referendumIndex;
    await voteUnanimouslyInFellowship(helper, democracyTrackMinRank, fellowshipReferendumIndex);
    await helper.fellowship.referenda.placeDecisionDeposit(donor, fellowshipReferendumIndex);

    const democracyProposed = await helper.wait.expectEvent(
      fellowshipPreparePeriod + fellowshipConfirmPeriod + fellowshipMinEnactPeriod,
      Event.Democracy.Proposed,
    );

    const democracyEnqueuedProposal = await helper.democracy.expectPublicProposal(democracyProposed.proposalIndex);
    expect(democracyEnqueuedProposal.inline, 'Fellowship proposal expected to be in the Democracy').to.be.equal(democracyProposal.Inline);

    await helper.wait.newBlocks(democracyVotingPeriod);
  });

  itSub('Fellowship (rank-1 or greater) member can submit Fellowship proposals on the Democracy track', async ({helper}) => {
    for(let rank = 1; rank < rankLimit; rank++) {
      const rankMembers = members[rank];

      for(let memberIdx = 0; memberIdx < rankMembers.length; memberIdx++) {
        const member = rankMembers[memberIdx];
        const newDummyProposal = dummyProposal(helper);

        const submitResult = await helper.fellowship.referenda.submit(
          member,
          fellowshipPropositionOrigin,
          newDummyProposal,
          defaultEnactmentMoment,
        );

        const referendumIndex = Event.FellowshipReferenda.Submitted.expect(submitResult).referendumIndex;
        const referendumInfo = await helper.fellowship.referenda.referendumInfo(referendumIndex);
        expect(referendumInfo.ongoing.track, `${memberIdx}-th member of rank #${rank}: proposal #${referendumIndex} is on invalid track`)
          .to.be.equal(democracyTrackId);
      }
    }
  });

  itSub('Fellowship (rank-3 or greater) members can vote on the Democracy track', async ({helper}) => {
    const proposal = dummyProposal(helper);

    const submitResult = await helper.fellowship.referenda.submit(
      rank1Proposer,
      fellowshipPropositionOrigin,
      proposal,
      defaultEnactmentMoment,
    );

    const referendumIndex = Event.FellowshipReferenda.Submitted.expect(submitResult).referendumIndex;

    let expectedAyes = 0;
    for(let rank = 3; rank < rankLimit; rank++) {
      const rankMembers = members[rank];

      for(let memberIdx = 0; memberIdx < rankMembers.length; memberIdx++) {
        const member = rankMembers[memberIdx];
        await helper.fellowship.collective.vote(member, referendumIndex, true);
        expectedAyes += 1;

        const referendumInfo = await helper.fellowship.referenda.referendumInfo(referendumIndex);
        expect(referendumInfo.ongoing.tally.bareAyes, `Vote from ${memberIdx}-th member of rank #${rank} isn't accounted`)
          .to.be.equal(expectedAyes);
      }
    }
  });

  itSub.skip('Fellowship rank vote strength is correct', async ({helper}) => {

  });

  itSub.skip('[Negative] FellowshipProposition cannot externally propose SuperMajorityAgainst', async ({helper}) => {

  });

  itSub.skip('[Negative] FellowshipProposition cannot externally propose SuperMajorityAgainst', async ({helper}) => {

  });

  itSub.skip('[Negative] FellowshipProposition cannot externally propose SimpleMajority', async ({helper}) => {

  });

  itSub.skip('[Negative] FellowshipProposition cannot externally propose SuperMajorityApprove', async ({helper}) => {

  });

  itSub.skip('[Negative] Fellowship (rank-0) member cannot submit Fellowship proposals on the Democracy track', async ({helper}) => {

  });

  itSub.skip('[Negative] Fellowship (rank-1 or greater) member cannot submit if no deposit can be provided', async ({helper}) => {

  });

  itSub.skip('[Negative] Fellowship (rank-2 or less) members cannot vote on the Democracy track', async ({helper}) => {

  });

  itSub.skip('[Negative] FellowshipProposition cannot add/remove a Council member', async ({helper}) => {

  });

  itSub.skip('[Negative] FellowshipProposition cannot set Council prime member', async ({helper}) => {

  });

  itSub.skip('[Negative] FellowshipProposition member cannot set Council prime member', async ({helper}) => {

  });

  itSub.skip('[Negative] FellowshipProposition cannot add/remove a TechComm member', async ({helper}) => {

  });

  itSub.skip('[Negative] FellowshipProposition cannot add/remove a Fellowship member', async ({helper}) => {

  });

  itSub.skip('[Negative] FellowshipProposition cannot promote/demote a Fellowship member', async ({helper}) => {

  });

  itSub.skip('[Negative] FellowshipProposition cannot fast-track Democracy proposals', async ({helper}) => {

  });

  itSub.skip('[Negative] FellowshipProposition cannot cancel approved Democracy proposals', async ({helper}) => {

  });

  itSub.skip('[Negative] FellowshipProposition cannot cancel ongoing Democracy referendums', async ({helper}) => {

  });

  itSub.skip('[Negative] FellowshipProposition cannot cancel queued Democracy proposals', async ({helper}) => {

  });

  itSub.skip('[Negative] FellowshipProposition cannot blacklist Democracy proposals', async ({helper}) => {

  });

  itSub.skip('[Negative] FellowshipProposition cannot veto Democracy proposals', async ({helper}) => {

  });
});

describe('Governance: Democracy tests', () => {
  let regularUser: IKeyringPair;

  before(async function() {
    await usingPlaygrounds(async (helper, privateKey) => {
      requirePalletsOrSkip(this, helper, [Pallets.Democracy]);

      const donor = await privateKey('//Alice');

      [regularUser] = await helper.arrange.createAccounts([1000n], donor);
    });
  });

  itSub.skip('Regular user can vote', async () => {

  });

  itSub.skip('[Negative] Regular user cannot submit regular proposal', async () => {

  });

  itSub.skip('[Negative] Regular user cannot externally propose SuperMajorityAgainst', async ({helper}) => {

  });

  itSub.skip('[Negative] Regular user cannot externally propose SimpleMajority', async ({helper}) => {

  });

  itSub.skip('[Negative] Regular user cannot externally propose SuperMajorityApprove', async ({helper}) => {

  });
});
