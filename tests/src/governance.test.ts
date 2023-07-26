import {IKeyringPair} from '@polkadot/types/types';
import {usingPlaygrounds, itSub, expect, Pallets, requirePalletsOrSkip} from './util';
import {DevUniqueHelper, Event} from './util/playgrounds/unique.dev';
import {UniqueHelper} from './util/playgrounds/unique';

const democracyLaunchPeriod = 35;
const democracyVotingPeriod = 35;
const democracyEnactmentPeriod = 40;
const democracyFastTrackVotingPeriod = 5;

const fellowshipRankLimit = 7;

interface ICounselors {
  alex: IKeyringPair;
  ildar: IKeyringPair;
  charu: IKeyringPair;
  filip: IKeyringPair;
  irina: IKeyringPair;
}

async function initCouncil() {
  let counselors: IKeyringPair[] = [];

  await usingPlaygrounds(async (helper, privateKey) => {
    const superuser = await privateKey('//Alice');
    const donor = await privateKey({url: import.meta.url});

    const [alex, ildar, charu, filip, irina] = await helper.arrange.createAccounts([10_000n, 10_000n, 10_000n, 10_000n, 10_000n], donor);
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

    counselors = [alex, ildar, charu, filip, irina];
  });

  return {
    alex: counselors[0],
    ildar: counselors[1],
    charu: counselors[2],
    filip: counselors[3],
    irina: counselors[4],
  };
}

async function clearCouncil() {
  await usingPlaygrounds(async (helper, privateKey) => {
    const superuser = await privateKey('//Alice');

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
}

describe('Governance: Council tests', () => {
  let donor: IKeyringPair;
  let counselors: ICounselors;

  const moreThanHalfCouncilThreshold = 3;

  before(async function() {
    await usingPlaygrounds(async (helper, privateKey) => {
      requirePalletsOrSkip(this, helper, [Pallets.Council]);

      donor = await privateKey({url: import.meta.url});
    });

    counselors = await initCouncil();
  });

  after(async () => {
    await clearCouncil();
  });

  itSub('>50% of Council can externally propose SuperMajorityAgainst', async ({helper}) => {
    const [forceSetBalanceReceiver] = await helper.arrange.createAccounts([0n], donor);
    const forceSetBalanceTestValue = 20n * 10n ** 25n;

    const democracyProposal = await helper.constructApiCall('api.tx.balances.forceSetBalance', [
      forceSetBalanceReceiver.address, forceSetBalanceTestValue,
    ]);

    const councilProposal = await helper.democracy.externalProposeDefaultCall(democracyProposal);

    const proposeResult = await helper.council.collective.propose(
      counselors.filip,
      councilProposal,
      moreThanHalfCouncilThreshold,
    );

    const councilProposedEvent = Event.Council.Proposed.expect(proposeResult);
    const proposalIndex = councilProposedEvent.proposalIndex;
    const proposalHash = councilProposedEvent.proposalHash;

    await helper.council.collective.vote(counselors.alex, proposalHash, proposalIndex, true);
    await helper.council.collective.vote(counselors.charu, proposalHash, proposalIndex, true);
    await helper.council.collective.vote(counselors.filip, proposalHash, proposalIndex, true);

    await helper.council.collective.close(counselors.filip, proposalHash, proposalIndex);

    const democracyStartedEvent = await helper.wait.expectEvent(democracyLaunchPeriod, Event.Democracy.Started);
    const democracyReferendumIndex = democracyStartedEvent.referendumIndex;
    const democracyThreshold = democracyStartedEvent.threshold;

    expect(democracyThreshold).to.be.equal('SuperMajorityAgainst');

    await helper.democracy.vote(counselors.filip, democracyReferendumIndex, {
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

  itSub.skip('[Negative] Council cannot submit regular democracy proposal', async ({helper}) => {

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

  itSub.skip('[Negative] Council cannot set/clear Council prime member', async ({helper}) => {

  });

  itSub.skip('[Negative] Council member cannot set/clear Council prime member', async ({helper}) => {

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

  itSub.skip('[Negative] Council cannot cancel Democracy proposals', async ({helper}) => {

  });

  itSub.skip('[Negative] Council cannot cancel ongoing Democracy referendums', async ({helper}) => {

  });

  itSub.skip('[Negative] Council cannot cancel Fellowship referendums', async ({helper}) => {

  });

  itSub.skip('[Negative] Council member cannot cancel Democracy proposals', async ({helper}) => {

  });

  itSub.skip('[Negative] Council member cannot cancel ongoing Democracy referendums', async ({helper}) => {

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

interface ITechComms {
  greg: IKeyringPair;
  andy: IKeyringPair;
  constantine: IKeyringPair;
}

async function initTechComm() {
  let techcomms: IKeyringPair[] = [];

  await usingPlaygrounds(async (helper, privateKey) => {
    const superuser = await privateKey('//Alice');
    const  donor = await privateKey({url: import.meta.url});
    const [greg, andy, constantine] = await helper.arrange.createAccounts([10_000n, 10_000n, 10_000n], donor);
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

    techcomms = [greg, andy, constantine];
  });

  return {
    greg: techcomms[0],
    andy: techcomms[1],
    constantine: techcomms[2],
  };
}

async function clearTechComm() {
  await usingPlaygrounds(async (helper, privateKey) => {
    const superuser = await privateKey('//Alice');

    let members = (await helper.callRpc('api.query.technicalCommitteeMembership.members')).toJSON();
    if(members.length) {
      const sudo = helper.getSudo();
      for(const address of members) {
        await sudo.executeExtrinsic(superuser, 'api.tx.technicalCommitteeMembership.removeMember', [address]);
      }
      members = (await helper.callRpc('api.query.technicalCommitteeMembership.members')).toJSON();
    }
    expect(members).to.be.deep.equal([]);
  });
}

describe('Governance: Technical Committee tests', () => {
  let superuser: IKeyringPair;
  let techcomms: ITechComms;
  let donor: IKeyringPair;
  let preImageHash: string;

  before(async function() {
    await usingPlaygrounds(async (helper, privateKey) => {
      requirePalletsOrSkip(this, helper, [Pallets.TechnicalCommittee]);
      superuser = await privateKey('//Alice');
      donor = await privateKey({url: import.meta.url});

      techcomms = await initTechComm();

      const proposalCall = await helper.constructApiCall('api.tx.balances.forceSetBalance', [donor.address, 20n * 10n ** 25n]);
      preImageHash = await helper.preimage.notePreimageFromCall(superuser, proposalCall, true);
    });
  });

  after(async () => {
    await usingPlaygrounds(async (helper) => {
      await clearTechComm();

      await helper.preimage.unnotePreimage(superuser, preImageHash);
    });
  });

  itSub.skip('TechComm can fast-track Democracy proposals', async ({helper}) => {
  });

  itSub.skip('TechComm can cancel Democracy proposals', async ({helper}) => {

  });

  itSub.skip('TechComm can cancel ongoing Democracy referendums', async ({helper}) => {

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

  itSub.skip('[Negative] TechComm cannot set/clear Council prime member', async ({helper}) => {

  });

  itSub.skip('[Negative] TechComm member cannot set/clear Council prime member', async ({helper}) => {

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

  itSub.skip('[Negative] TechComm member cannot cancel Democracy proposals', async ({helper}) => {

  });

  itSub.skip('[Negative] TechComm member cannot cancel ongoing Democracy referendums', async ({helper}) => {

  });

  itSub.skip('[Negative] TechComm member cannot blacklist Democracy proposals', async ({helper}) => {

  });

  itSub.skip('[Negative] TechComm member cannot veto external Democracy proposals until the cool-off period pass', async ({helper}) => {

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

async function initFellowship() {
  const numMembersInRank = 3;
  const memberBalance = 5000n;
  const members: IKeyringPair[][] = [];

  await usingPlaygrounds(async (helper, privateKey) => {
    const sudoer = await privateKey('//Alice');
    const donor = await privateKey({url: import.meta.url});

    for(let i = 0; i < fellowshipRankLimit; i++) {
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
  });

  return members;
}

async function clearFellowship(members: IKeyringPair[][]) {
  await usingPlaygrounds(async (helper, privateKey) => {
    const sudoer = await privateKey('//Alice');

    for(let rank = 0; rank < fellowshipRankLimit; rank++) {
      for(const member of members[rank]) {
        await helper.getSudo().fellowship.collective.removeMember(sudoer, member.address, rank);
      }
    }
  });
}

describe('Governance: Fellowship tests', () => {
  const numMembersInRank = 3;
  const memberBalance = 5000n;
  let members: IKeyringPair[][];

  let rank1Proposer: IKeyringPair;

  let sudoer: any;
  let donor: any;
  let counselors: ICounselors;
  let techcomms: ITechComms;

  const submissionDeposit = 1000n;
  const decisionDeposit = 10n;

  const democracyTrackId = 10;
  const democracyTrackMinRank = 3;
  const fellowshipPropositionOrigin = 'FellowshipProposition';

  const fellowshipPreparePeriod = 3;
  const fellowshipConfirmPeriod = 3;
  const fellowshipMinEnactPeriod = 1;

  const defaultEnactmentMoment = {After: 0};

  let dummyProposalCount = 0;
  function dummyProposalCall(helper: UniqueHelper) {
    dummyProposalCount++;
    return helper.constructApiCall('api.tx.system.remark', ['dummy proposal' + dummyProposalCount]);
  }

  function dummyProposal(helper: UniqueHelper) {
    return {
      Inline: dummyProposalCall(helper).method.toHex(),
    };
  }

  async function voteUnanimouslyInFellowship(helper: UniqueHelper, minRank: number, referendumIndex: number) {
    for(let rank = minRank; rank < fellowshipRankLimit; rank++) {
      for(const member of members[rank]) {
        await helper.fellowship.collective.vote(member, referendumIndex, true);
      }
    }
  }

  async function testBadFellowshipProposal(
    helper: DevUniqueHelper,
    proposalCall: any,
  ) {
    const badProposal = {
      Inline: proposalCall.method.toHex(),
    };

    const submitResult = await helper.fellowship.referenda.submit(
      rank1Proposer,
      fellowshipPropositionOrigin,
      badProposal,
      defaultEnactmentMoment,
    );

    const referendumIndex = Event.FellowshipReferenda.Submitted.expect(submitResult).referendumIndex;
    await voteUnanimouslyInFellowship(helper, democracyTrackMinRank, referendumIndex);
    await helper.fellowship.referenda.placeDecisionDeposit(donor, referendumIndex);

    const enactmentId = await helper.fellowship.referenda.enactmentEventId(referendumIndex);
    const dispatchedEvent = await helper.wait.expectEvent(
      fellowshipPreparePeriod + fellowshipConfirmPeriod + defaultEnactmentMoment.After,
      Event.GovScheduler.Dispatched,
      (event: any) => event.id == enactmentId,
    );

    expect(dispatchedEvent.result.isErr, 'Bad Fellowship must fail')
      .to.be.true;

    expect(dispatchedEvent.result.asErr.isBadOrigin, 'Bad Fellowship must fail with BadOrigin')
      .to.be.true;
  }

  before(async function() {
    await usingPlaygrounds(async (helper, privateKey) => {
      requirePalletsOrSkip(this, helper, [Pallets.Democracy, Pallets.Fellowship, Pallets.TechnicalCommittee, Pallets.Council]);

      sudoer = await privateKey('//Alice');
      donor = await privateKey({url: import.meta.url});
    });

    counselors = await initCouncil();
    techcomms = await initTechComm();
    members = await initFellowship();

    rank1Proposer = members[1][0];
  });

  after(async () => {
    await clearFellowship(members);
    await clearTechComm();
    await clearCouncil();
  });

  itSub('FellowshipProposition can submit regular Democracy proposals', async ({helper}) => {
    const democracyProposalCall = dummyProposalCall(helper);
    const fellowshipProposal = {
      Inline: helper.democracy.proposeCall(democracyProposalCall, 0n).method.toHex(),
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
    expect(democracyEnqueuedProposal.inline, 'Fellowship proposal expected to be in the Democracy')
      .to.be.equal(democracyProposalCall.method.toHex());

    await helper.wait.newBlocks(democracyVotingPeriod);
  });

  itSub('Fellowship (rank-1 or greater) member can submit Fellowship proposals on the Democracy track', async ({helper}) => {
    for(let rank = 1; rank < fellowshipRankLimit; rank++) {
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

  itSub(`Fellowship (rank-${democracyTrackMinRank} or greater) members can vote on the Democracy track`, async ({helper}) => {
    const proposal = dummyProposal(helper);

    const submitResult = await helper.fellowship.referenda.submit(
      rank1Proposer,
      fellowshipPropositionOrigin,
      proposal,
      defaultEnactmentMoment,
    );

    const referendumIndex = Event.FellowshipReferenda.Submitted.expect(submitResult).referendumIndex;

    let expectedAyes = 0;
    for(let rank = democracyTrackMinRank; rank < fellowshipRankLimit; rank++) {
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

  itSub('Fellowship rank vote strength is correct', async ({helper}) => {
    const excessRankWeightTable = [
      1,
      3,
      6,
      10,
      15,
      21,
    ];

    const proposal = dummyProposal(helper);

    const submitResult = await helper.fellowship.referenda.submit(
      rank1Proposer,
      fellowshipPropositionOrigin,
      proposal,
      defaultEnactmentMoment,
    );

    const referendumIndex = Event.FellowshipReferenda.Submitted.expect(submitResult).referendumIndex;

    for(let rank = democracyTrackMinRank; rank < fellowshipRankLimit; rank++) {
      const rankMembers = members[rank];

      for(let memberIdx = 0; memberIdx < rankMembers.length; memberIdx++) {
        const member = rankMembers[memberIdx];

        const referendumInfoBefore = await helper.fellowship.referenda.referendumInfo(referendumIndex);
        const ayesBefore = referendumInfoBefore.ongoing.tally.ayes;

        await helper.fellowship.collective.vote(member, referendumIndex, true);

        const referendumInfoAfter = await helper.fellowship.referenda.referendumInfo(referendumIndex);
        const ayesAfter = referendumInfoAfter.ongoing.tally.ayes;

        const expectedVoteWeight = excessRankWeightTable[rank - democracyTrackMinRank];
        const voteWeight = ayesAfter - ayesBefore;

        expect(voteWeight, `Vote weight of ${memberIdx}-th member of rank #${rank} is invalid`)
          .to.be.equal(expectedVoteWeight);
      }
    }
  });

  itSub('[Negative] FellowshipProposition cannot externally propose SuperMajorityAgainst', async ({helper}) => {
    await testBadFellowshipProposal(helper, helper.democracy.externalProposeDefaultCall(dummyProposalCall(helper)));
  });

  itSub('[Negative] FellowshipProposition cannot externally propose SimpleMajority', async ({helper}) => {
    await testBadFellowshipProposal(helper, helper.democracy.externalProposeMajorityCall(dummyProposalCall(helper)));
  });

  itSub('[Negative] FellowshipProposition cannot externally propose SuperMajorityApprove', async ({helper}) => {
    await testBadFellowshipProposal(helper, helper.democracy.externalProposeCall(dummyProposalCall(helper)));
  });

  itSub('[Negative] Fellowship (rank-0) member cannot submit Fellowship proposals on the Democracy track', async ({helper}) => {
    const rank0Proposer = members[0][0];

    const proposal = dummyProposal(helper);

    const submitResult = helper.fellowship.referenda.submit(
      rank0Proposer,
      fellowshipPropositionOrigin,
      proposal,
      defaultEnactmentMoment,
    );

    await expect(submitResult).to.be.rejectedWith(/BadOrigin/);
  });

  itSub('[Negative] Fellowship (rank-1 or greater) member cannot submit if no deposit can be provided', async ({helper}) => {
    const poorMember = rank1Proposer;

    const balanceBefore = await helper.balance.getSubstrate(poorMember.address);
    await helper.getSudo().balance.setBalanceSubstrate(sudoer, poorMember.address, submissionDeposit - 1n);

    const proposal = dummyProposal(helper);

    const submitResult = helper.fellowship.referenda.submit(
      poorMember,
      fellowshipPropositionOrigin,
      proposal,
      defaultEnactmentMoment,
    );

    await expect(submitResult).to.be.rejectedWith(/account balance too low/);

    await helper.getSudo().balance.setBalanceSubstrate(sudoer, poorMember.address, balanceBefore);
  });

  itSub(`[Negative] Fellowship (rank-${democracyTrackMinRank - 1} or less) members cannot vote on the Democracy track`, async ({helper}) => {
    const proposal = dummyProposal(helper);

    const submitResult = await helper.fellowship.referenda.submit(
      rank1Proposer,
      fellowshipPropositionOrigin,
      proposal,
      defaultEnactmentMoment,
    );

    const referendumIndex = Event.FellowshipReferenda.Submitted.expect(submitResult).referendumIndex;

    for(let rank = 0; rank < democracyTrackMinRank; rank++) {
      for(const member of members[rank]) {
        const voteResult = helper.fellowship.collective.vote(member, referendumIndex, true);
        await expect(voteResult).to.be.rejectedWith(/RankTooLow/);
      }
    }
  });

  itSub('[Negative] FellowshipProposition cannot add/remove a Council member', async ({helper}) => {
    const [councilNonMember] = await helper.arrange.createAccounts([10n], donor);

    await testBadFellowshipProposal(helper, helper.council.membership.addMemberCall(councilNonMember.address));
    await testBadFellowshipProposal(helper, helper.council.membership.removeMemberCall(counselors.ildar.address));
  });

  itSub('[Negative] FellowshipProposition cannot set/clear Council prime member', async ({helper}) => {
    await testBadFellowshipProposal(helper, helper.council.membership.setPrimeCall(counselors.ildar.address));
    await testBadFellowshipProposal(helper, helper.council.membership.clearPrimeCall());
  });

  itSub('[Negative] FellowshipProposition cannot add/remove a TechComm member', async ({helper}) => {
    const [techCommNonMember] = await helper.arrange.createAccounts([10n], donor);

    await testBadFellowshipProposal(helper, helper.technicalCommittee.membership.addMemberCall(techCommNonMember.address));
    await testBadFellowshipProposal(helper, helper.technicalCommittee.membership.removeMemberCall(techcomms.constantine.address));
  });

  itSub('[Negative] FellowshipProposition cannot add/remove a Fellowship member', async ({helper}) => {
    const [fellowshipNonMember] = await helper.arrange.createAccounts([10n], donor);

    await testBadFellowshipProposal(helper, helper.fellowship.collective.addMemberCall(fellowshipNonMember.address));
    await testBadFellowshipProposal(helper, helper.fellowship.collective.removeMemberCall(rank1Proposer.address, 1));
  });

  itSub('[Negative] FellowshipProposition cannot promote/demote a Fellowship member', async ({helper}) => {
    await testBadFellowshipProposal(helper, helper.fellowship.collective.promoteCall(rank1Proposer.address));
    await testBadFellowshipProposal(helper, helper.fellowship.collective.demoteCall(rank1Proposer.address));
  });

  itSub('[Negative] FellowshipProposition cannot fast-track Democracy proposals', async ({helper}) => {
    const preimageHash = await helper.preimage.notePreimageFromCall(sudoer, dummyProposalCall(helper), true);

    await helper.getSudo().democracy.externalProposeDefaultWithPreimage(sudoer, preimageHash);

    await testBadFellowshipProposal(helper, helper.democracy.fastTrackCall(preimageHash, democracyFastTrackVotingPeriod, 0));
  });

  itSub('[Negative] FellowshipProposition cannot cancel Democracy proposals', async ({helper}) => {
    const proposeResult = await helper.getSudo().democracy.propose(sudoer, dummyProposalCall(helper), 0n);
    const proposalIndex = Event.Democracy.Proposed.expect(proposeResult).proposalIndex;

    await testBadFellowshipProposal(helper, helper.democracy.cancelProposalCall(proposalIndex));
  });

  itSub('[Negative] FellowshipProposition cannot cancel ongoing Democracy referendums', async ({helper}) => {
    await helper.getSudo().democracy.externalProposeDefault(sudoer, dummyProposalCall(helper));
    const startedEvent = await helper.wait.expectEvent(democracyLaunchPeriod, Event.Democracy.Started);
    const referendumIndex = startedEvent.referendumIndex;

    await testBadFellowshipProposal(helper, helper.democracy.emergencyCancelCall(referendumIndex));
  });

  itSub('[Negative] FellowshipProposition cannot blacklist Democracy proposals', async ({helper}) => {
    const preimageHash = await helper.preimage.notePreimageFromCall(sudoer, dummyProposalCall(helper), true);

    await helper.getSudo().democracy.externalProposeDefaultWithPreimage(sudoer, preimageHash);

    await testBadFellowshipProposal(helper, helper.democracy.blacklistCall(preimageHash, null));
  });

  itSub('[Negative] FellowshipProposition cannot veto external proposals', async ({helper}) => {
    const preimageHash = await helper.preimage.notePreimageFromCall(sudoer, dummyProposalCall(helper), true);

    await helper.getSudo().democracy.externalProposeDefaultWithPreimage(sudoer, preimageHash);

    await testBadFellowshipProposal(helper, helper.democracy.vetoExternalCall(preimageHash));
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
