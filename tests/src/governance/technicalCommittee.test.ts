import {IKeyringPair} from '@polkadot/types/types';
import {usingPlaygrounds, itSub, expect, Pallets, requirePalletsOrSkip, describeGov} from '../util';
import {DevUniqueHelper, Event} from '../util/playgrounds/unique.dev';
import {UniqueHelper} from '../util/playgrounds/unique';
import {ICounselors, initCouncil, democracyLaunchPeriod, democracyVotingPeriod, democracyEnactmentPeriod, councilMotionDuration, democracyFastTrackVotingPeriod, fellowshipRankLimit, clearCouncil, clearTechComm, ITechComms, clearFellowship, defaultEnactmentMoment, dummyProposal, dummyProposalCall, fellowshipPropositionOrigin, initFellowship, initTechComm} from './util';

describeGov('Governance: Technical Committee tests', () => {
  let sudoer: IKeyringPair;
  let techcomms: ITechComms;
  let donor: IKeyringPair;
  let preImageHash: string;


  const moreThanHalfCommiteeThreshold = 2;
  const AllTechCommitteeThreshold = 3;

  before(async function() {
    await usingPlaygrounds(async (helper, privateKey) => {
      requirePalletsOrSkip(this, helper, [Pallets.TechnicalCommittee]);
      sudoer = await privateKey('//Alice');
      donor = await privateKey({url: import.meta.url});

      techcomms = await initTechComm();

      const proposalCall = await helper.constructApiCall('api.tx.balances.forceSetBalance', [donor.address, 20n * 10n ** 25n]);
      preImageHash = await helper.preimage.notePreimageFromCall(sudoer, proposalCall, true);
    });
  });

  after(async () => {
    await usingPlaygrounds(async (helper) => {
      await clearTechComm();

      await helper.preimage.unnotePreimage(sudoer, preImageHash);
    });
  });

  async function proposalFromCommittee(proposal: any) {
    return await usingPlaygrounds(async (helper) => {
      expect((await helper.callRpc('api.query.technicalCommitteeMembership.members')).toJSON().length).to.be.equal(3);
      const proposeResult = await helper.technicalCommittee.collective.propose(
        techcomms.andy,
        proposal,
        AllTechCommitteeThreshold,
      );

      const commiteeProposedEvent = Event.TechnicalCommittee.Proposed.expect(proposeResult);
      const proposalIndex = commiteeProposedEvent.proposalIndex;
      const proposalHash = commiteeProposedEvent.proposalHash;


      await helper.technicalCommittee.collective.vote(techcomms.andy, proposalHash, proposalIndex, true);
      await helper.technicalCommittee.collective.vote(techcomms.constantine, proposalHash, proposalIndex, true);
      await helper.technicalCommittee.collective.vote(techcomms.greg, proposalHash, proposalIndex, true);

      return await helper.technicalCommittee.collective.close(techcomms.andy, proposalHash, proposalIndex);
    });
  }

  itSub('TechComm can fast-track Democracy proposals', async ({helper}) => {
    const preimageHash = await helper.preimage.notePreimageFromCall(sudoer, dummyProposalCall(helper), true);
    await helper.getSudo().democracy.externalProposeDefaultWithPreimage(sudoer, preimageHash);

    await expect(proposalFromCommittee(helper.democracy.fastTrackCall(preimageHash, democracyFastTrackVotingPeriod, 0)))
      .to.be.fulfilled;
  });

  itSub('TechComm can cancel Democracy proposals', async ({helper}) => {
    const proposeResult = await helper.getSudo().democracy.propose(sudoer, dummyProposalCall(helper), 0n);
    const proposalIndex = Event.Democracy.Proposed.expect(proposeResult).proposalIndex;

    await expect(proposalFromCommittee(helper.democracy.cancelProposalCall(proposalIndex)))
      .to.be.fulfilled;
  });

  itSub('TechComm can cancel ongoing Democracy referendums', async ({helper}) => {
    await helper.getSudo().democracy.externalProposeDefault(sudoer, dummyProposalCall(helper));
    const startedEvent = await helper.wait.expectEvent(democracyLaunchPeriod, Event.Democracy.Started);
    const referendumIndex = startedEvent.referendumIndex;

    await expect(proposalFromCommittee(helper.democracy.emergencyCancelCall(referendumIndex)))
      .to.be.fulfilled;
  });


  itSub('TechComm member can veto Democracy proposals', async ({helper}) => {
    const preimageHash = await helper.preimage.notePreimageFromCall(sudoer, dummyProposalCall(helper), true);
    await helper.getSudo().democracy.externalProposeDefaultWithPreimage(sudoer, preimageHash);

    await expect(helper.technicalCommittee.collective.execute(
      techcomms.andy,
      helper.democracy.vetoExternalCall(preimageHash),
    )).to.be.fulfilled;
  });

  itSub('TechComm can cancel Fellowship referendums', async ({helper}) => {
    const fellowship = await initFellowship();
    const fellowshipProposer = fellowship[5][0];
    const proposal = dummyProposal(helper);

    const submitResult = await helper.fellowship.referenda.submit(
      fellowshipProposer,
      fellowshipPropositionOrigin,
      proposal,
      defaultEnactmentMoment,
    );
    const referendumIndex = Event.FellowshipReferenda.Submitted.expect(submitResult).referendumIndex;
    await expect(proposalFromCommittee(helper.fellowship.referenda.cancelCall(referendumIndex))).to.be.fulfilled;
  });

  itSub.skip('TechComm member can add a Fellowship member', async ({helper}) => {
    const [newFellowshipMember] = await helper.arrange.createAccounts([0n], donor);
    const fellowship = [[newFellowshipMember]];
    await expect(helper.technicalCommittee.collective.execute(
      techcomms.andy,
      helper.fellowship.collective.addMemberCall(newFellowshipMember.address),
    )).to.be.fulfilled;
    const fellowshipMembers = (await helper.callRpc('api.query.fellowshipCollective.members')).toJSON();
    expect(fellowshipMembers).to.contains(newFellowshipMember.address);
    await clearFellowship(fellowship);

  });

  itSub('[Negative] TechComm cannot submit regular democracy proposal', async ({helper}) => {
    const councilProposal = await helper.democracy.proposeCall(dummyProposalCall(helper), 0n);

    await expect(proposalFromCommittee(councilProposal)).to.be.rejectedWith('BadOrigin');
  });

  itSub('[Negative] TechComm cannot externally propose SuperMajorityAgainst', async ({helper}) => {
    const commiteeProposal = await helper.democracy.externalProposeDefaultCall(dummyProposalCall(helper));

    await expect(proposalFromCommittee(commiteeProposal)).to.be.rejectedWith('Proposal execution failed with BadOrigin');
  });

  itSub('[Negative] TechComm cannot externally propose SimpleMajority', async ({helper}) => {
    const commiteeProposal = await helper.democracy.externalProposeMajorityCall(dummyProposalCall(helper));

    await expect(proposalFromCommittee(commiteeProposal)).to.be.rejectedWith('Proposal execution failed with BadOrigin');
  });

  itSub('[Negative] TechComm cannot externally propose SuperMajorityApprove', async ({helper}) => {
    const commiteeProposal = await helper.democracy.externalProposeCall(dummyProposalCall(helper));

    await expect(proposalFromCommittee(commiteeProposal)).to.be.rejectedWith('Proposal execution failed with BadOrigin');
  });

  itSub('[Negative] TechComm member cannot submit regular democracy proposal', async ({helper}) => {
    const commiteeProposal = await helper.democracy.proposeCall(dummyProposalCall(helper), 0n);

    await expect(proposalFromCommittee(commiteeProposal)).to.be.rejectedWith('Proposal execution failed with BadOrigin');
  });

  itSub('[Negative] TechComm member cannot externally propose SuperMajorityAgainst', async ({helper}) => {
    const memberProposal = await helper.democracy.externalProposeDefaultCall(dummyProposalCall(helper));

    await expect(helper.technicalCommittee.collective.execute(
      techcomms.andy,
      memberProposal,
    )).to.be.rejectedWith('Proposal execution failed with BadOrigin');
  });

  itSub('[Negative] TechComm member cannot externally propose SimpleMajority', async ({helper}) => {
    const memberProposal = await helper.democracy.externalProposeMajorityCall(dummyProposalCall(helper));

    await expect(helper.technicalCommittee.collective.execute(
      techcomms.andy,
      memberProposal,
    )).to.be.rejectedWith('Proposal execution failed with BadOrigin');
  });

  itSub('[Negative] TechComm member cannot externally propose SuperMajorityApprove', async ({helper}) => {
    const memberProposal = await helper.democracy.externalProposeCall(dummyProposalCall(helper));

    await expect(helper.technicalCommittee.collective.execute(
      techcomms.andy,
      memberProposal,
    )).to.be.rejectedWith('Proposal execution failed with BadOrigin');
  });


  itSub.skip('[Negative] TechComm cannot promote/demote Fellowship member', async ({helper}) => {

  });

  itSub.skip('[Negative] TechComm member cannot promote/demote Fellowship member', async ({helper}) => {

  });

  itSub('[Negative] TechComm cannot add/remove a Council member', async ({helper}) => {
    const [newCouncilMember] = await helper.arrange.createAccounts([0n], donor);
    const addMemberProposal = helper.council.membership.addMemberCall(newCouncilMember.address);
    const removeMemberProposal = helper.council.membership.addMemberCall(newCouncilMember.address);

    await expect(proposalFromCommittee(addMemberProposal)).to.be.rejectedWith('BadOrigin');
    await expect(proposalFromCommittee(removeMemberProposal)).to.be.rejectedWith('BadOrigin');
  });

  itSub('[Negative] TechComm member cannot add/remove a Council member', async ({helper}) => {
    const [newCouncilMember] = await helper.arrange.createAccounts([0n], donor);
    const addMemberProposal = helper.council.membership.addMemberCall(newCouncilMember.address);
    const removeMemberProposal = helper.council.membership.addMemberCall(newCouncilMember.address);

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
    const counselors = await initCouncil();
    const proposalForSet = await helper.council.membership.setPrimeCall(counselors.charu.address);
    const proposalForClear = await helper.council.membership.clearPrimeCall();

    await expect(proposalFromCommittee(proposalForSet)).to.be.rejectedWith('Proposal execution failed with BadOrigin');
    await expect(proposalFromCommittee(proposalForClear)).to.be.rejectedWith('Proposal execution failed with BadOrigin');
    await clearCouncil();
  });

  itSub('[Negative] TechComm member cannot set/clear Council prime member', async ({helper}) => {
    const counselors = await initCouncil();
    const proposalForSet = await helper.council.membership.setPrimeCall(counselors.charu.address);
    const proposalForClear = await helper.council.membership.clearPrimeCall();

    await expect(helper.technicalCommittee.collective.execute(
      techcomms.andy,
      proposalForSet,
    )).to.be.rejectedWith('Proposal execution failed with BadOrigin');
    await expect(helper.technicalCommittee.collective.execute(
      techcomms.andy,
      proposalForClear,
    )).to.be.rejectedWith('Proposal execution failed with BadOrigin');
    await clearCouncil();
  });

  itSub('[Negative] TechComm cannot add/remove a TechComm member', async ({helper}) => {
    const [newCommMember] = await helper.arrange.createAccounts([0n], donor);
    const addMemberProposal = helper.council.membership.addMemberCall(newCommMember.address);
    const removeMemberProposal = helper.council.membership.addMemberCall(newCommMember.address);

    await expect(proposalFromCommittee(addMemberProposal)).to.be.rejectedWith('Proposal execution failed with BadOrigin');
    await expect(proposalFromCommittee(removeMemberProposal)).to.be.rejectedWith('Proposal execution failed with BadOrigin');
  });

  itSub('[Negative] TechComm member cannot add/remove a TechComm member', async ({helper}) => {
    const [newCommMember] = await helper.arrange.createAccounts([0n], donor);
    const addMemberProposal = helper.council.membership.addMemberCall(newCommMember.address);
    const removeMemberProposal = helper.council.membership.addMemberCall(newCommMember.address);

    await expect(helper.technicalCommittee.collective.execute(
      techcomms.andy,
      addMemberProposal,
    )).to.be.rejectedWith('Proposal execution failed with BadOrigin');
    await expect(helper.technicalCommittee.collective.execute(
      techcomms.andy,
      removeMemberProposal,
    )).to.be.rejectedWith('Proposal execution failed with BadOrigin');
  });

  itSub('[Negative] TechComm cannot remove a Fellowship member', async ({helper}) => {
    const fellowship = await initFellowship();

    await expect(proposalFromCommittee(helper.fellowship.collective.removeMemberCall(fellowship[5][0].address, 5))).to.be.rejectedWith('Proposal execution failed with BadOrigin');
    await clearFellowship(fellowship);
  });

  itSub('[Negative] TechComm member cannot remove a Fellowship member', async ({helper}) => {
    const fellowship = await initFellowship();

    await expect(helper.technicalCommittee.collective.execute(
      techcomms.andy,
      helper.fellowship.collective.removeMemberCall(fellowship[5][0].address, 5),
    )).to.be.rejectedWith('Proposal execution failed with BadOrigin');
    await clearFellowship(fellowship);
  });

  itSub('[Negative] TechComm member cannot fast-track Democracy proposals', async ({helper}) => {
    const preimageHash = await helper.preimage.notePreimageFromCall(sudoer, dummyProposalCall(helper), true);
    await helper.getSudo().democracy.externalProposeDefaultWithPreimage(sudoer, preimageHash);

    await expect(helper.technicalCommittee.collective.execute(
      techcomms.andy,
      helper.democracy.fastTrackCall(preimageHash, democracyFastTrackVotingPeriod, 0),
    )).to.be.rejectedWith('Proposal execution failed with BadOrigin');
  });

  itSub('[Negative] TechComm member cannot cancel Democracy proposals', async ({helper}) => {
    const proposeResult = await helper.getSudo().democracy.propose(sudoer, dummyProposalCall(helper), 0n);
    const proposalIndex = Event.Democracy.Proposed.expect(proposeResult).proposalIndex;

    await expect(helper.technicalCommittee.collective.execute(
      techcomms.andy,
      helper.democracy.cancelProposalCall(proposalIndex),
    ))
      .to.be.rejectedWith('BadOrigin');
  });

  itSub('[Negative] TechComm member cannot cancel ongoing Democracy referendums', async ({helper}) => {
    await helper.getSudo().democracy.externalProposeDefault(sudoer, dummyProposalCall(helper));
    const startedEvent = await helper.wait.expectEvent(democracyLaunchPeriod, Event.Democracy.Started);
    const referendumIndex = startedEvent.referendumIndex;

    await expect(helper.technicalCommittee.collective.execute(
      techcomms.andy,
      helper.democracy.emergencyCancelCall(referendumIndex),
    )).to.be.rejectedWith('Proposal execution failed with BadOrigin');
  });

  itSub('[Negative] TechComm member cannot blacklist Democracy proposals', async ({helper}) => {
    const preimageHash = await helper.preimage.notePreimageFromCall(sudoer, dummyProposalCall(helper), true);
    await helper.getSudo().democracy.externalProposeDefaultWithPreimage(sudoer, preimageHash);

    await expect(helper.technicalCommittee.collective.execute(
      techcomms.andy,
      helper.democracy.blacklistCall(preimageHash),
    )).to.be.rejectedWith('Proposal execution failed with BadOrigin');
  });

  itSub.skip('[Negative] TechComm member cannot veto external Democracy proposals until the cool-off period pass', async ({helper}) => {

  });

  itSub('[Negative] TechComm member cannot cancel Fellowship referendums', async ({helper}) => {
    const fellowship = await initFellowship();
    const fellowshipProposer = fellowship[5][0];
    const proposal = dummyProposal(helper);

    const submitResult = await helper.fellowship.referenda.submit(
      fellowshipProposer,
      fellowshipPropositionOrigin,
      proposal,
      defaultEnactmentMoment,
    );

    const referendumIndex = Event.FellowshipReferenda.Submitted.expect(submitResult).referendumIndex;

    await expect(helper.technicalCommittee.collective.execute(
      techcomms.andy,
      helper.fellowship.referenda.cancelCall(referendumIndex),
    )).to.be.rejectedWith('Proposal execution failed with BadOrigin');
  });

  itSub('[Negative] TechComm referendum cannot be closed until the voting threshold is met', async ({helper}) => {
    const committeeSize = (await helper.callRpc('api.query.technicalCommitteeMembership.members')).toJSON().length as any as number;
    expect(committeeSize).is.greaterThan(1);
    const proposeResult = await helper.technicalCommittee.collective.propose(
      techcomms.andy,
      dummyProposalCall(helper),
      committeeSize,
    );

    const committeeProposedEvent = Event.TechnicalCommittee.Proposed.expect(proposeResult);
    const proposalIndex = committeeProposedEvent.proposalIndex;
    const proposalHash = committeeProposedEvent.proposalHash;

    await helper.technicalCommittee.collective.vote(techcomms.constantine, proposalHash, proposalIndex, true);

    await expect(helper.technicalCommittee.collective.close(techcomms.andy, proposalHash, proposalIndex)).to.be.rejectedWith('TooEarly');
  });

  itSub('[Negative] TechComm member cannot propose an existing TechComm proposal', async ({helper}) => {
    const repeatedProposal = dummyProposalCall(helper);
    await expect(helper.technicalCommittee.collective.propose(techcomms.andy, repeatedProposal, AllTechCommitteeThreshold)).to.be.fulfilled;
    await expect(helper.technicalCommittee.collective.propose(techcomms.andy, repeatedProposal, AllTechCommitteeThreshold))
      .to.be.rejectedWith('DuplicateProposal');
    await expect(helper.technicalCommittee.collective.propose(techcomms.andy, repeatedProposal, AllTechCommitteeThreshold))
      .to.be.rejectedWith('DuplicateProposal');
  });

  itSub('[Negative] TechComm non-member cannot propose', async ({helper}) => {
    const [illegalProposer] = await helper.arrange.createAccounts([10n], donor);
    await expect(helper.technicalCommittee.collective.propose(illegalProposer, dummyProposalCall(helper), AllTechCommitteeThreshold))
      .to.be.rejectedWith('NotMember');
  });

  itSub('[Negative] TechComm non-member cannot vote', async ({helper}) => {
    const [illegalVoter] = await helper.arrange.createAccounts([1n], donor);
    const proposeResult = await helper.technicalCommittee.collective.propose(
      techcomms.andy,
      dummyProposalCall(helper),
      AllTechCommitteeThreshold,
    );

    const councilProposedEvent = Event.TechnicalCommittee.Proposed.expect(proposeResult);
    const proposalIndex = councilProposedEvent.proposalIndex;
    const proposalHash = councilProposedEvent.proposalHash;

    await expect(helper.technicalCommittee.collective.vote(illegalVoter, proposalHash, proposalIndex, true)).to.be.rejectedWith('NotMember');
  });
});
