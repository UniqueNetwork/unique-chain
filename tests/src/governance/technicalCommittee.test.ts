import {IKeyringPair} from '@polkadot/types/types';
import {usingPlaygrounds, itSub, expect, Pallets, requirePalletsOrSkip, describeGov} from '../util';
import {Event} from '../util/playgrounds/unique.dev';
import {initCouncil, democracyLaunchPeriod, democracyFastTrackVotingPeriod, clearCouncil, clearTechComm, ITechComms, clearFellowship, defaultEnactmentMoment, dummyProposal, dummyProposalCall, fellowshipPropositionOrigin, initFellowship, initTechComm, hardResetFellowshipReferenda, hardResetDemocracy, hardResetGovScheduler} from './util';

describeGov('Governance: Technical Committee tests', () => {
  let sudoer: IKeyringPair;
  let techcomms: ITechComms;
  let donor: IKeyringPair;
  let preImageHash: string;


  const allTechCommitteeThreshold = 3;

  before(async function() {
    await usingPlaygrounds(async (helper, privateKey) => {
      requirePalletsOrSkip(this, helper, [Pallets.TechnicalCommittee]);
      sudoer = await privateKey('//Alice');
      donor = await privateKey({url: import.meta.url});

      techcomms = await initTechComm(donor, sudoer);

      const proposalCall = await helper.constructApiCall('api.tx.balances.forceSetBalance', [donor.address, 20n * 10n ** 25n]);
      preImageHash = await helper.preimage.notePreimageFromCall(sudoer, proposalCall);
    });
  });

  after(async () => {
    await usingPlaygrounds(async (helper) => {
      await clearTechComm(sudoer);

      await helper.preimage.unnotePreimage(sudoer, preImageHash);
      await hardResetFellowshipReferenda(sudoer);
      await hardResetDemocracy(sudoer);
      await hardResetGovScheduler(sudoer);
    });
  });

  function proposalFromAllCommittee(proposal: any) {
    return usingPlaygrounds(async (helper) => {
      expect((await helper.callQuery('api.query.technicalCommitteeMembership.members')).length).to.be.equal(allTechCommitteeThreshold);
      const proposeResult = await helper.technicalCommittee.collective.propose(
        techcomms.andy,
        proposal,
        allTechCommitteeThreshold,
      );

      const commiteeProposedEvent = Event.expect(proposeResult, helper.getApi().events.technicalCommittee.Proposed);
      const proposalIndex = commiteeProposedEvent.data.proposalIndex.toNumber();
      const proposalHash = commiteeProposedEvent.data.proposalHash.toHex();


      await helper.technicalCommittee.collective.vote(techcomms.andy, proposalHash, proposalIndex, true);
      await helper.technicalCommittee.collective.vote(techcomms.constantine, proposalHash, proposalIndex, true);
      await helper.technicalCommittee.collective.vote(techcomms.greg, proposalHash, proposalIndex, true);

      const closeResult = await helper.technicalCommittee.collective.close(techcomms.andy, proposalHash, proposalIndex);
      Event.expect(closeResult, helper.getApi().events.technicalCommittee.Closed);
      Event.expect(closeResult, helper.getApi().events.technicalCommittee.Approved);
      const result = Event.expect(closeResult, helper.getApi().events.technicalCommittee.Executed).data.result;
      expect(result.isOk).to.be.true;

      return closeResult;
    });
  }

  itSub('TechComm can fast-track Democracy proposals', async ({helper}) => {
    const preimageHash = await helper.preimage.notePreimageFromCall(sudoer, dummyProposalCall(helper));
    await helper.wait.parachainBlockMultiplesOf(35n);

    await helper.getSudo().democracy.externalProposeDefaultWithPreimage(sudoer, preimageHash);

    const fastTrackProposal = await proposalFromAllCommittee(helper.democracy.fastTrackCall(preimageHash, democracyFastTrackVotingPeriod, 0));
    Event.expect(fastTrackProposal, helper.getApi().events.democracy.Started);
  });

  itSub('TechComm can cancel Democracy proposals', async ({helper}) => {
    const proposeResult = await helper.getSudo().democracy.propose(sudoer, dummyProposalCall(helper), 0n);
    const proposalIndex = Event.expect(proposeResult, helper.getApi().events.democracy.Proposed).data.proposalIndex.toNumber();

    const cancelProposal = await proposalFromAllCommittee(helper.democracy.cancelProposalCall(proposalIndex));
    Event.expect(cancelProposal, helper.getApi().events.democracy.ProposalCanceled);
  });

  itSub('TechComm can cancel ongoing Democracy referendums', async ({helper}) => {
    await helper.getSudo().democracy.externalProposeDefault(sudoer, dummyProposalCall(helper));
    const startedEvent = await helper.wait.expectEvent(democracyLaunchPeriod,helper.getApi().events.democracy.Started);
    const referendumIndex = startedEvent.refIndex.toNumber();

    const emergencyCancelProposal = await proposalFromAllCommittee(helper.democracy.emergencyCancelCall(referendumIndex));
    Event.expect(emergencyCancelProposal, helper.getApi().events.democracy.Cancelled);
  });

  itSub('TechComm member can veto Democracy proposals', async ({helper}) => {
    const preimageHash = await helper.preimage.notePreimageFromCall(sudoer, dummyProposalCall(helper));
    await helper.getSudo().democracy.externalProposeDefaultWithPreimage(sudoer, preimageHash);

    const vetoExternalCall = await helper.technicalCommittee.collective.execute(
      techcomms.andy,
      helper.democracy.vetoExternalCall(preimageHash),
    );
    Event.expect(vetoExternalCall, helper.getApi().events.democracy.Vetoed);
  });

  itSub('TechComm can cancel Fellowship referendums', async ({helper}) => {
    const fellowship = await initFellowship(donor, sudoer);
    const fellowshipProposer = fellowship[5][0];
    const proposal = dummyProposal(helper);

    const submitResult = await helper.fellowship.referenda.submit(
      fellowshipProposer,
      fellowshipPropositionOrigin,
      proposal,
      defaultEnactmentMoment,
    );
    const referendumIndex = Event.expect(submitResult, helper.getApi().events.fellowshipReferenda.Submitted).data.index.toNumber();
    const cancelProposal = await proposalFromAllCommittee(helper.fellowship.referenda.cancelCall(referendumIndex));
    Event.expect(cancelProposal, helper.getApi().events.fellowshipReferenda.Cancelled);
  });

  itSub.skip('TechComm member can add a Fellowship member', async ({helper}) => {
    const newFellowshipMember = helper.arrange.createEmptyAccount();
    await expect(helper.technicalCommittee.collective.execute(
      techcomms.andy,
      helper.fellowship.collective.addMemberCall(newFellowshipMember.address),
    )).to.be.fulfilled;
    const fellowshipMembers = await helper.callQuery('api.query.fellowshipCollective.members');
    expect(fellowshipMembers).to.contains(newFellowshipMember.address);
    await clearFellowship(sudoer);
  });

  itSub('[Negative] TechComm cannot submit regular democracy proposal', async ({helper}) => {
    const councilProposal = await helper.democracy.proposeCall(dummyProposalCall(helper), 0n);

    await expect(proposalFromAllCommittee(councilProposal)).to.be.rejectedWith('BadOrigin');
  });

  itSub('[Negative] TechComm cannot externally propose SuperMajorityAgainst', async ({helper}) => {
    const commiteeProposal = await helper.democracy.externalProposeDefaultCall(dummyProposalCall(helper));

    await expect(proposalFromAllCommittee(commiteeProposal)).to.be.rejectedWith('BadOrigin');
  });

  itSub('[Negative] TechComm cannot externally propose SimpleMajority', async ({helper}) => {
    const commiteeProposal = await helper.democracy.externalProposeMajorityCall(dummyProposalCall(helper));

    await expect(proposalFromAllCommittee(commiteeProposal)).to.be.rejectedWith('BadOrigin');
  });

  itSub('[Negative] TechComm cannot externally propose SuperMajorityApprove', async ({helper}) => {
    const commiteeProposal = await helper.democracy.externalProposeCall(dummyProposalCall(helper));

    await expect(proposalFromAllCommittee(commiteeProposal)).to.be.rejectedWith('BadOrigin');
  });

  itSub('[Negative] TechComm member cannot submit regular democracy proposal', async ({helper}) => {
    const memberProposal = await helper.democracy.proposeCall(dummyProposalCall(helper), 0n);

    await expect(helper.technicalCommittee.collective.execute(
      techcomms.andy,
      memberProposal,
    )).to.be.rejectedWith('BadOrigin');
  });

  itSub('[Negative] TechComm member cannot externally propose SuperMajorityAgainst', async ({helper}) => {
    const memberProposal = await helper.democracy.externalProposeDefaultCall(dummyProposalCall(helper));

    await expect(helper.technicalCommittee.collective.execute(
      techcomms.andy,
      memberProposal,
    )).to.be.rejectedWith('BadOrigin');
  });

  itSub('[Negative] TechComm member cannot externally propose SimpleMajority', async ({helper}) => {
    const memberProposal = await helper.democracy.externalProposeMajorityCall(dummyProposalCall(helper));

    await expect(helper.technicalCommittee.collective.execute(
      techcomms.andy,
      memberProposal,
    )).to.be.rejectedWith('BadOrigin');
  });

  itSub('[Negative] TechComm member cannot externally propose SuperMajorityApprove', async ({helper}) => {
    const memberProposal = await helper.democracy.externalProposeCall(dummyProposalCall(helper));

    await expect(helper.technicalCommittee.collective.execute(
      techcomms.andy,
      memberProposal,
    )).to.be.rejectedWith('BadOrigin');
  });


  itSub.skip('[Negative] TechComm cannot promote/demote Fellowship member', async () => {

  });

  itSub.skip('[Negative] TechComm member cannot promote/demote Fellowship member', async () => {

  });

  itSub('[Negative] TechComm cannot add/remove a Council member', async ({helper}) => {
    const newCouncilMember = helper.arrange.createEmptyAccount();
    const addMemberProposal = helper.council.membership.addMemberCall(newCouncilMember.address);
    const removeMemberProposal = helper.council.membership.removeMemberCall(newCouncilMember.address);

    await expect(proposalFromAllCommittee(addMemberProposal)).to.be.rejectedWith('BadOrigin');
    await expect(proposalFromAllCommittee(removeMemberProposal)).to.be.rejectedWith('BadOrigin');
  });

  itSub('[Negative] TechComm member cannot add/remove a Council member', async ({helper}) => {
    const newCouncilMember = helper.arrange.createEmptyAccount();
    const addMemberProposal = helper.council.membership.addMemberCall(newCouncilMember.address);
    const removeMemberProposal = helper.council.membership.removeMemberCall(newCouncilMember.address);

    await expect(helper.technicalCommittee.collective.execute(
      techcomms.andy,
      addMemberProposal,
    )).to.be.rejectedWith('BadOrigin');
    await expect(helper.technicalCommittee.collective.execute(
      techcomms.andy,
      removeMemberProposal,
    )).to.be.rejectedWith('BadOrigin');
  });

  itSub('[Negative] TechComm cannot set/clear Council prime member', async ({helper}) => {
    const counselors = await initCouncil(donor, sudoer);
    const proposalForSet = await helper.council.membership.setPrimeCall(counselors.charu.address);
    const proposalForClear = await helper.council.membership.clearPrimeCall();

    await expect(proposalFromAllCommittee(proposalForSet)).to.be.rejectedWith('BadOrigin');
    await expect(proposalFromAllCommittee(proposalForClear)).to.be.rejectedWith('BadOrigin');
    await clearCouncil(sudoer);
  });

  itSub('[Negative] TechComm member cannot set/clear Council prime member', async ({helper}) => {
    const counselors = await initCouncil(donor, sudoer);
    const proposalForSet = await helper.council.membership.setPrimeCall(counselors.charu.address);
    const proposalForClear = await helper.council.membership.clearPrimeCall();

    await expect(helper.technicalCommittee.collective.execute(
      techcomms.andy,
      proposalForSet,
    )).to.be.rejectedWith('BadOrigin');
    await expect(helper.technicalCommittee.collective.execute(
      techcomms.andy,
      proposalForClear,
    )).to.be.rejectedWith('BadOrigin');
    await clearCouncil(sudoer);
  });

  itSub('[Negative] TechComm cannot add/remove a TechComm member', async ({helper}) => {
    const newCommMember = helper.arrange.createEmptyAccount();
    const addMemberProposal = helper.council.membership.addMemberCall(newCommMember.address);
    const removeMemberProposal = helper.council.membership.removeMemberCall(newCommMember.address);

    await expect(proposalFromAllCommittee(addMemberProposal)).to.be.rejectedWith('BadOrigin');
    await expect(proposalFromAllCommittee(removeMemberProposal)).to.be.rejectedWith('BadOrigin');
  });

  itSub('[Negative] TechComm member cannot add/remove a TechComm member', async ({helper}) => {
    const newCommMember = helper.arrange.createEmptyAccount();
    const addMemberProposal = helper.council.membership.addMemberCall(newCommMember.address);
    const removeMemberProposal = helper.council.membership.removeMemberCall(newCommMember.address);

    await expect(helper.technicalCommittee.collective.execute(
      techcomms.andy,
      addMemberProposal,
    )).to.be.rejectedWith('BadOrigin');
    await expect(helper.technicalCommittee.collective.execute(
      techcomms.andy,
      removeMemberProposal,
    )).to.be.rejectedWith('BadOrigin');
  });

  itSub('[Negative] TechComm cannot remove a Fellowship member', async ({helper}) => {
    const fellowship = await initFellowship(donor, sudoer);

    await expect(proposalFromAllCommittee(helper.fellowship.collective.removeMemberCall(fellowship[5][0].address, 5))).to.be.rejectedWith('BadOrigin');
    await clearFellowship(sudoer);
  });

  itSub('[Negative] TechComm member cannot remove a Fellowship member', async ({helper}) => {
    const fellowship = await initFellowship(donor, sudoer);

    await expect(helper.technicalCommittee.collective.execute(
      techcomms.andy,
      helper.fellowship.collective.removeMemberCall(fellowship[5][0].address, 5),
    )).to.be.rejectedWith('BadOrigin');
    await clearFellowship(sudoer);
  });

  itSub('[Negative] TechComm member cannot fast-track Democracy proposals', async ({helper}) => {
    const preimageHash = await helper.preimage.notePreimageFromCall(sudoer, dummyProposalCall(helper));
    await helper.getSudo().democracy.externalProposeDefaultWithPreimage(sudoer, preimageHash);

    await expect(helper.technicalCommittee.collective.execute(
      techcomms.andy,
      helper.democracy.fastTrackCall(preimageHash, democracyFastTrackVotingPeriod, 0),
    )).to.be.rejectedWith('BadOrigin');
  });

  itSub('[Negative] TechComm member cannot cancel Democracy proposals', async ({helper}) => {
    const proposeResult = await helper.getSudo().democracy.propose(sudoer, dummyProposalCall(helper), 0n);
    const proposalIndex = Event.expect(proposeResult, helper.getApi().events.democracy.Proposed).data.proposalIndex.toNumber();

    await expect(helper.technicalCommittee.collective.execute(
      techcomms.andy,
      helper.democracy.cancelProposalCall(proposalIndex),
    ))
      .to.be.rejectedWith('BadOrigin');
  });

  itSub('[Negative] TechComm member cannot cancel ongoing Democracy referendums', async ({helper}) => {
    await helper.getSudo().democracy.externalProposeDefault(sudoer, dummyProposalCall(helper));
    const startedEvent = await helper.wait.expectEvent(democracyLaunchPeriod, helper.getApi().events.democracy.Started);
    const referendumIndex = startedEvent.refIndex.toNumber();

    await expect(helper.technicalCommittee.collective.execute(
      techcomms.andy,
      helper.democracy.emergencyCancelCall(referendumIndex),
    )).to.be.rejectedWith('BadOrigin');
  });

  itSub('[Negative] TechComm cannot blacklist Democracy proposals', async ({helper}) => {
    const preimageHash = await helper.preimage.notePreimageFromCall(sudoer, dummyProposalCall(helper));
    await helper.getSudo().democracy.externalProposeDefaultWithPreimage(sudoer, preimageHash);

    await expect(proposalFromAllCommittee(helper.democracy.blacklistCall(preimageHash))).to.be.rejectedWith('BadOrigin');
  });

  itSub('[Negative] TechComm member cannot blacklist Democracy proposals', async ({helper}) => {
    const preimageHash = await helper.preimage.notePreimageFromCall(sudoer, dummyProposalCall(helper));
    await helper.getSudo().democracy.externalProposeDefaultWithPreimage(sudoer, preimageHash);

    await expect(helper.technicalCommittee.collective.execute(
      techcomms.andy,
      helper.democracy.blacklistCall(preimageHash),
    )).to.be.rejectedWith('BadOrigin');
  });

  itSub.skip('[Negative] TechComm member cannot veto external Democracy proposals until the cool-off period pass', async () => {

  });

  itSub('[Negative] TechComm member cannot cancel Fellowship referendums', async ({helper}) => {
    const fellowship = await initFellowship(donor, sudoer);
    const fellowshipProposer = fellowship[5][0];
    const proposal = dummyProposal(helper);

    const submitResult = await helper.fellowship.referenda.submit(
      fellowshipProposer,
      fellowshipPropositionOrigin,
      proposal,
      defaultEnactmentMoment,
    );

    const referendumIndex = Event.expect(submitResult, helper.getApi().events.fellowshipReferenda.Submitted).data.index.toNumber();

    await expect(helper.technicalCommittee.collective.execute(
      techcomms.andy,
      helper.fellowship.referenda.cancelCall(referendumIndex),
    )).to.be.rejectedWith('BadOrigin');
  });

  itSub('[Negative] TechComm referendum cannot be closed until the voting threshold is met', async ({helper}) => {
    const committeeSize = (await helper.callQuery('api.query.technicalCommitteeMembership.members')).length as any as number;
    expect(committeeSize).is.greaterThan(1);
    const proposeResult = await helper.technicalCommittee.collective.propose(
      techcomms.andy,
      dummyProposalCall(helper),
      committeeSize,
    );

    const committeeProposedEvent = Event.expect(proposeResult, helper.getApi().events.technicalCommittee.Proposed).data;
    const proposalIndex = committeeProposedEvent.proposalIndex.toNumber();
    const proposalHash = committeeProposedEvent.proposalHash.toHex();

    await helper.technicalCommittee.collective.vote(techcomms.constantine, proposalHash, proposalIndex, true);

    await expect(helper.technicalCommittee.collective.close(techcomms.andy, proposalHash, proposalIndex)).to.be.rejectedWith('TooEarly');
  });
});
