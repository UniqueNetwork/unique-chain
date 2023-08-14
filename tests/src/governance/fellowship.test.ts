import {IKeyringPair} from '@polkadot/types/types';
import {usingPlaygrounds, itSub, expect, Pallets, requirePalletsOrSkip, describeGov} from '../util';
import {DevUniqueHelper, Event} from '../util/playgrounds/unique.dev';
import {UniqueHelper} from '../util/playgrounds/unique';
import {ICounselors, initCouncil, democracyLaunchPeriod, democracyVotingPeriod, democracyFastTrackVotingPeriod, fellowshipRankLimit, clearCouncil, clearTechComm, ITechComms, clearFellowship, defaultEnactmentMoment, dummyProposal, dummyProposalCall, fellowshipPropositionOrigin, initFellowship, initTechComm, voteUnanimouslyInFellowship, democracyTrackMinRank, fellowshipPreparePeriod, fellowshipConfirmPeriod, fellowshipMinEnactPeriod, democracyTrackId} from './util';

describeGov('Governance: Fellowship tests', () => {
  let members: IKeyringPair[][];

  let rank1Proposer: IKeyringPair;

  let sudoer: any;
  let donor: any;
  let counselors: ICounselors;
  let techcomms: ITechComms;

  const submissionDeposit = 1000n;

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
    await voteUnanimouslyInFellowship(helper, members, democracyTrackMinRank, referendumIndex);
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

    counselors = await initCouncil(donor, sudoer);
    techcomms = await initTechComm(donor, sudoer);
    members = await initFellowship(donor, sudoer);

    rank1Proposer = members[1][0];
  });

  after(async () => {
    await clearFellowship(sudoer, members);
    await clearTechComm(sudoer);
    await clearCouncil(sudoer);
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
      defaultEnactmentMoment,
    );

    const fellowshipReferendumIndex = Event.FellowshipReferenda.Submitted.expect(submitResult).referendumIndex;
    await voteUnanimouslyInFellowship(helper, members, democracyTrackMinRank, fellowshipReferendumIndex);
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
