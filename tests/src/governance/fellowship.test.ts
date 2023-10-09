import {IKeyringPair} from '@polkadot/types/types';
import {usingPlaygrounds, itSub, expect, Pallets, requirePalletsOrSkip, describeGov} from '../util';
import {DevUniqueHelper} from '../util/playgrounds/unique.dev';
import {ICounselors, initCouncil, democracyLaunchPeriod, democracyVotingPeriod, democracyFastTrackVotingPeriod, fellowshipRankLimit, clearCouncil, clearTechComm, ITechComms, clearFellowship, defaultEnactmentMoment, dummyProposal, dummyProposalCall, fellowshipPropositionOrigin, initFellowship, initTechComm, voteUnanimouslyInFellowship, democracyTrackMinRank, fellowshipPreparePeriod, fellowshipConfirmPeriod, fellowshipMinEnactPeriod, democracyTrackId, hardResetFellowshipReferenda, hardResetDemocracy, hardResetGovScheduler} from './util';

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

    const submittedEvent = submitResult.result.events.find(helper.getApi().events.fellowshipReferenda.Submitted.is);
    if(!submittedEvent)
      throw Error('Expected event fellowshipReferenda.Submitted');
    const referendumIndex = submittedEvent.data.index.toNumber();

    await voteUnanimouslyInFellowship(helper, members, democracyTrackMinRank, referendumIndex);
    await helper.fellowship.referenda.placeDecisionDeposit(donor, referendumIndex);

    const enactmentId = await helper.fellowship.referenda.enactmentEventId(referendumIndex);
    const dispatchedEvent = await helper.wait.expectEvent(
      fellowshipPreparePeriod + fellowshipConfirmPeriod + defaultEnactmentMoment.After,
      helper.getApi().events.scheduler.Dispatched,
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
    await clearFellowship(sudoer);
    await clearTechComm(sudoer);
    await clearCouncil(sudoer);
    await hardResetFellowshipReferenda(sudoer);
    await hardResetDemocracy(sudoer);
    await hardResetGovScheduler(sudoer);
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

    const submittedEvent = submitResult.result.events.find(helper.getApi().events.fellowshipReferenda.Submitted.is);
    if(!submittedEvent)
      throw Error('Expected event fellowshipReferenda.Submitted');
    const fellowshipReferendumIndex = submittedEvent.data.index.toNumber();

    await voteUnanimouslyInFellowship(helper, members, democracyTrackMinRank, fellowshipReferendumIndex);
    await helper.fellowship.referenda.placeDecisionDeposit(donor, fellowshipReferendumIndex);

    const democracyProposed = await helper.wait.expectEvent(
      fellowshipPreparePeriod + fellowshipConfirmPeriod + fellowshipMinEnactPeriod,
      helper.getApi().events.democracy.Proposed,
    );

    const democracyEnqueuedProposal = await helper.democracy.expectPublicProposal(democracyProposed.proposalIndex.toNumber());
    expect('Inline' in democracyEnqueuedProposal ? democracyEnqueuedProposal.Inline : null, 'Fellowship proposal expected to be in the Democracy')
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
        const submittedEvent = submitResult.result.events.find(helper.getApi().events.fellowshipReferenda.Submitted.is);
        if(!submittedEvent)
          throw Error('Expected event fellowshipReferenda.Submitted');
        const referendumIndex = submittedEvent.data.index.toNumber();

        const referendumInfo = await helper.fellowship.referenda.referendumInfo(referendumIndex);
        expect('Ongoing' in referendumInfo! ? referendumInfo.Ongoing.track : null, `${memberIdx}-th member of rank #${rank}: proposal #${referendumIndex} is on invalid track`)
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

    const submittedEvent = submitResult.result.events.find(helper.getApi().events.fellowshipReferenda.Submitted.is);
    if(!submittedEvent)
      throw Error('Expected event fellowshipReferenda.Submitted');
    const referendumIndex = submittedEvent.data.index.toNumber();

    let expectedAyes = 0;
    for(let rank = democracyTrackMinRank; rank < fellowshipRankLimit; rank++) {
      const rankMembers = members[rank];

      for(let memberIdx = 0; memberIdx < rankMembers.length; memberIdx++) {
        const member = rankMembers[memberIdx];
        await helper.fellowship.collective.vote(member, referendumIndex, true);
        expectedAyes += 1;

        const referendumInfo = await helper.fellowship.referenda.referendumInfo(referendumIndex);
        expect('Ongoing' in referendumInfo! ? referendumInfo.Ongoing.tally.bareAyes : null, `Vote from ${memberIdx}-th member of rank #${rank} isn't accounted`)
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

    const submittedEvent = submitResult.result.events.find(helper.getApi().events.fellowshipReferenda.Submitted.is);
    if(!submittedEvent)
      throw Error('Expected event fellowshipReferenda.Submitted');
    const referendumIndex = submittedEvent.data.index.toNumber();

    for(let rank = democracyTrackMinRank; rank < fellowshipRankLimit; rank++) {
      const rankMembers = members[rank];

      for(let memberIdx = 0; memberIdx < rankMembers.length; memberIdx++) {
        const member = rankMembers[memberIdx];

        const referendumInfoBefore = await helper.fellowship.referenda.referendumInfo(referendumIndex);
        const ayesBefore = 'Ongoing' in referendumInfoBefore! ? referendumInfoBefore.Ongoing.tally.ayes : null;

        await helper.fellowship.collective.vote(member, referendumIndex, true);

        const referendumInfoAfter = await helper.fellowship.referenda.referendumInfo(referendumIndex);
        const ayesAfter = 'Ongoing' in referendumInfoAfter! ? referendumInfoAfter.Ongoing.tally.ayes : null;

        const expectedVoteWeight = excessRankWeightTable[rank - democracyTrackMinRank];
        const voteWeight = ayesAfter! - ayesBefore!;

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

    const submittedEvent = submitResult.result.events.find(helper.getApi().events.fellowshipReferenda.Submitted.is);
    if(!submittedEvent)
      throw Error('Expected event fellowshipReferenda.Submitted');
    const referendumIndex = submittedEvent.data.index.toNumber();

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
    const preimageHash = await helper.preimage.notePreimageFromCall(sudoer, dummyProposalCall(helper));

    await helper.getSudo().democracy.externalProposeDefaultWithPreimage(sudoer, preimageHash);

    await testBadFellowshipProposal(helper, helper.democracy.fastTrackCall(preimageHash, democracyFastTrackVotingPeriod, 0));
  });

  itSub('[Negative] FellowshipProposition cannot cancel Democracy proposals', async ({helper}) => {
    const proposeResult = await helper.getSudo().democracy.propose(sudoer, dummyProposalCall(helper), 0n);

    const proposedEvent = proposeResult.result.events.find(helper.getApi().events.democracy.Proposed.is);
    if(!proposedEvent)
      throw Error('Expected event democracy.Proposed');
    const proposalIndex = proposedEvent.data.proposalIndex.toNumber();

    await testBadFellowshipProposal(helper, helper.democracy.cancelProposalCall(proposalIndex));
  });

  itSub('[Negative] FellowshipProposition cannot cancel ongoing Democracy referendums', async ({helper}) => {
    await helper.getSudo().democracy.externalProposeDefault(sudoer, dummyProposalCall(helper));
    const startedEvent = await helper.wait.expectEvent(democracyLaunchPeriod, helper.getApi().events.democracy.Started);
    const referendumIndex = startedEvent.refIndex.toNumber();

    await testBadFellowshipProposal(helper, helper.democracy.emergencyCancelCall(referendumIndex));
  });

  itSub('[Negative] FellowshipProposition cannot blacklist Democracy proposals', async ({helper}) => {
    const preimageHash = await helper.preimage.notePreimageFromCall(sudoer, dummyProposalCall(helper));

    await helper.getSudo().democracy.externalProposeDefaultWithPreimage(sudoer, preimageHash);

    await testBadFellowshipProposal(helper, helper.democracy.blacklistCall(preimageHash, null));
  });

  itSub('[Negative] FellowshipProposition cannot veto external proposals', async ({helper}) => {
    const preimageHash = await helper.preimage.notePreimageFromCall(sudoer, dummyProposalCall(helper));

    await helper.getSudo().democracy.externalProposeDefaultWithPreimage(sudoer, preimageHash);

    await testBadFellowshipProposal(helper, helper.democracy.vetoExternalCall(preimageHash));
  });
});
