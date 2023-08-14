
import {IKeyringPair} from '@polkadot/types/types';
import {usingPlaygrounds, itSub, expect, Pallets, requirePalletsOrSkip, describeGov} from '../util';
import {DevUniqueHelper, Event} from '../util/playgrounds/unique.dev';
import {ICounselors, initCouncil, democracyLaunchPeriod, democracyVotingPeriod, democracyEnactmentPeriod, councilMotionDuration, democracyFastTrackVotingPeriod, fellowshipRankLimit, clearCouncil, clearTechComm, initTechComm, clearFellowshipRankAgnostic, dummyProposal, dummyProposalCall, initFellowship, defaultEnactmentMoment, fellowshipPropositionOrigin} from './util';

describeGov('Governance: Council tests', () => {
  let donor: IKeyringPair;
  let counselors: ICounselors;
  let sudoer: IKeyringPair;

  const moreThanHalfCouncilThreshold = 3;

  before(async function() {
    await usingPlaygrounds(async (helper, privateKey) => {
      requirePalletsOrSkip(this, helper, [Pallets.Council]);

      donor = await privateKey({url: import.meta.url});
      sudoer = await privateKey('//Alice');
    });
  });

  beforeEach(async () => {
    counselors = await initCouncil(donor, sudoer);
  });

  afterEach(async () => {
    await clearCouncil(sudoer);
    await clearTechComm(sudoer);
  });

  async function proposalFromMoreThanHalfCouncil(proposal: any) {
    return await usingPlaygrounds(async (helper) => {
      expect((await helper.callRpc('api.query.councilMembership.members')).toJSON().length).to.be.equal(5);
      const proposeResult = await helper.council.collective.propose(
        counselors.filip,
        proposal,
        moreThanHalfCouncilThreshold,
      );

      const councilProposedEvent = Event.Council.Proposed.expect(proposeResult);
      const proposalIndex = councilProposedEvent.proposalIndex;
      const proposalHash = councilProposedEvent.proposalHash;


      await helper.council.collective.vote(counselors.alex, proposalHash, proposalIndex, true);
      await helper.council.collective.vote(counselors.charu, proposalHash, proposalIndex, true);
      await helper.council.collective.vote(counselors.filip, proposalHash, proposalIndex, true);

      return await helper.council.collective.close(counselors.filip, proposalHash, proposalIndex);
    });
  }

  async function proposalFromAllCouncil(proposal: any) {
    return await usingPlaygrounds(async (helper) => {
      expect((await helper.callRpc('api.query.councilMembership.members')).toJSON().length).to.be.equal(5);
      const proposeResult = await helper.council.collective.propose(
        counselors.filip,
        proposal,
        moreThanHalfCouncilThreshold,
      );

      const councilProposedEvent = Event.Council.Proposed.expect(proposeResult);
      const proposalIndex = councilProposedEvent.proposalIndex;
      const proposalHash = councilProposedEvent.proposalHash;


      await helper.council.collective.vote(counselors.alex, proposalHash, proposalIndex, true);
      await helper.council.collective.vote(counselors.charu, proposalHash, proposalIndex, true);
      await helper.council.collective.vote(counselors.ildar, proposalHash, proposalIndex, true);
      await helper.council.collective.vote(counselors.irina, proposalHash, proposalIndex, true);
      await helper.council.collective.vote(counselors.filip, proposalHash, proposalIndex, true);

      return await helper.council.collective.close(counselors.filip, proposalHash, proposalIndex);
    });
  }

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

  itSub('Council prime member vote is the default', async ({helper}) => {
    const [newTechCommMember] = await helper.arrange.createAccounts([0n], donor);
    const addMemberProposal = helper.technicalCommittee.membership.addMemberCall(newTechCommMember.address);
    const proposeResult = await helper.council.collective.propose(
      counselors.filip,
      addMemberProposal,
      moreThanHalfCouncilThreshold,
    );

    const councilProposedEvent = Event.Council.Proposed.expect(proposeResult);
    const proposalIndex = councilProposedEvent.proposalIndex;
    const proposalHash = councilProposedEvent.proposalHash;

    await helper.council.collective.vote(counselors.alex, proposalHash, proposalIndex, true);

    await helper.wait.newBlocks(councilMotionDuration);
    const closeResult = await helper.council.collective.close(counselors.filip, proposalHash, proposalIndex);
    const closeEvent = Event.Council.Closed.expect(closeResult);
    const members = (await helper.callRpc('api.query.councilMembership.members')).toJSON() as string[];
    expect(closeEvent.yes).to.be.equal(members.length);
  });

  itSub('Superuser can add a member', async ({helper}) => {
    const [newMember] = await helper.arrange.createAccounts([0n], donor);
    await expect(helper.getSudo().executeExtrinsic(sudoer, 'api.tx.councilMembership.addMember', [newMember.address])).to.be.fulfilled;

    const members = (await helper.callRpc('api.query.councilMembership.members')).toJSON();
    expect(members).to.contains(newMember.address);
  });

  itSub('Superuser can remove a member', async ({helper}) => {
    await expect(helper.getSudo().executeExtrinsic(sudoer, 'api.tx.councilMembership.removeMember', [counselors.alex.address])).to.be.fulfilled;

    const members = (await helper.callRpc('api.query.councilMembership.members')).toJSON();
    expect(members).to.not.contains(counselors.alex.address);
  });

  itSub('>50% Council can add TechComm member', async ({helper}) => {
    const [newTechCommMember] = await helper.arrange.createAccounts([0n], donor);
    const addMemberProposal = helper.technicalCommittee.membership.addMemberCall(newTechCommMember.address);

    await proposalFromMoreThanHalfCouncil(addMemberProposal);

    const techCommMembers = (await helper.callRpc('api.query.technicalCommitteeMembership.members')).toJSON();
    expect(techCommMembers).to.contains(newTechCommMember.address);
  });

  itSub('Council can remove TechComm member', async ({helper}) => {
    const techComm = await initTechComm(donor, sudoer);
    const removeMemberPrpoposal = helper.technicalCommittee.membership.removeMemberCall(techComm.andy.address);
    await proposalFromMoreThanHalfCouncil(removeMemberPrpoposal);

    const techCommMembers = (await helper.callRpc('api.query.technicalCommitteeMembership.members')).toJSON();
    expect(techCommMembers).to.not.contains(techComm.andy.address);
  });

  itSub.skip('Council member can add Fellowship member', async ({helper}) => {
    const [newFellowshipMember] = await helper.arrange.createAccounts([0n], donor);
    await expect(helper.council.collective.execute(
      counselors.alex,
      helper.fellowship.collective.addMemberCall(newFellowshipMember.address),
    )).to.be.fulfilled;
    const fellowshipMembers = (await helper.callRpc('api.query.fellowshipCollective.members')).toJSON();
    expect(fellowshipMembers).to.contains(newFellowshipMember.address);
  });

  itSub('>50% Council can promote Fellowship member', async ({helper}) => {
    const fellowship = await initFellowship(donor, sudoer);
    const memberWithZeroRank = fellowship[0][0];

    const proposal = helper.fellowship.collective.promoteCall(memberWithZeroRank.address);
    await proposalFromMoreThanHalfCouncil(proposal);
    const record = (await helper.callRpc('api.query.fellowshipCollective.members', [memberWithZeroRank.address])).toJSON();
    expect(record).to.be.deep.equal({rank: 1});

    await clearFellowshipRankAgnostic(sudoer, fellowship);
  });

  itSub('>50% Council can demote Fellowship member', async ({helper}) => {
    const fellowship = await initFellowship(donor, sudoer);
    const memberWithRankOne = fellowship[1][0];

    const proposal = helper.fellowship.collective.demoteCall(memberWithRankOne.address);
    await proposalFromMoreThanHalfCouncil(proposal);

    const record = (await helper.callRpc('api.query.fellowshipCollective.members', [memberWithRankOne.address])).toJSON();
    expect(record).to.be.deep.equal({rank: 0});

    await clearFellowshipRankAgnostic(sudoer, fellowship);
  });

  itSub('Council can blacklist Democracy proposals', async ({helper}) => {
    const preimageHash = await helper.preimage.notePreimageFromCall(sudoer, dummyProposalCall(helper), true);
    await expect(proposalFromAllCouncil(helper.democracy.blacklistCall(preimageHash, null))).to.be.fulfilled;
  });

  itSub('Sudo can blacklist Democracy proposals', async ({helper}) => {
    const preimageHash = await helper.preimage.notePreimageFromCall(sudoer, dummyProposalCall(helper), true);
    await expect(helper.getSudo().democracy.blacklist(sudoer, preimageHash)).to.be.fulfilled;
  });

  itSub('[Negative] Council cannot add Council member', async ({helper}) => {
    const [newCouncilMember] = await helper.arrange.createAccounts([0n], donor);
    const addMemberProposal = helper.council.membership.addMemberCall(newCouncilMember.address);

    await expect(proposalFromAllCouncil(addMemberProposal)).to.be.rejected;
  });

  itSub('[Negative] Council cannot remove Council member', async ({helper}) => {
    const removeMemberProposal = helper.council.membership.removeMemberCall(counselors.alex.address);

    await expect(proposalFromAllCouncil(removeMemberProposal)).to.be.rejected;
  });

  itSub('[Negative] Council cannot submit regular democracy proposal', async ({helper}) => {
    const councilProposal = await helper.democracy.proposeCall(dummyProposalCall(helper), 0n);

    await expect(proposalFromAllCouncil(councilProposal)).to.be.rejectedWith(/BadOrigin/);
  });

  itSub('[Negative] Council cannot externally propose SimpleMajority', async ({helper}) => {
    const councilProposal = await helper.democracy.externalProposeMajorityCall(dummyProposalCall(helper));

    await expect(proposalFromAllCouncil(councilProposal)).to.be.rejectedWith(/BadOrigin/);
  });

  itSub('[Negative] Council cannot externally propose SuperMajorityApprove', async ({helper}) => {
    const councilProposal = await helper.democracy.externalProposeCall(dummyProposalCall(helper));

    await expect(proposalFromAllCouncil(councilProposal)).to.be.rejectedWith(/BadOrigin/);
  });

  itSub('[Negative] Cannot add a duplicate Council member', async ({helper}) => {
    const [newMember] = await helper.arrange.createAccounts([0n], donor);
    await expect(helper.getSudo().executeExtrinsic(sudoer, 'api.tx.councilMembership.addMember', [newMember.address])).to.be.fulfilled;

    const members = (await helper.callRpc('api.query.councilMembership.members')).toJSON();
    expect(members).to.contains(newMember.address);
    await expect(helper.getSudo().executeExtrinsic(sudoer, 'api.tx.councilMembership.addMember', [newMember.address])).to.be.rejected;
  });

  itSub('[Negative] Cannot add a duplicate TechComm member', async ({helper}) => {
    const [newTechCommMember] = await helper.arrange.createAccounts([0n], donor);
    const addMemberProposal = helper.technicalCommittee.membership.addMemberCall(newTechCommMember.address);

    await proposalFromMoreThanHalfCouncil(addMemberProposal);

    const techCommMembers = (await helper.callRpc('api.query.technicalCommitteeMembership.members')).toJSON();
    expect(techCommMembers).to.contains(newTechCommMember.address);
    await expect(proposalFromMoreThanHalfCouncil(addMemberProposal)).to.be.rejected;
  });

  itSub.skip('[Negative] Cannot add a duplicate Fellowship member', async ({helper}) => {
    const [newFellowshipMember] = await helper.arrange.createAccounts([0n], donor);
    await expect(helper.fellowship.collective.addMember(counselors.alex, newFellowshipMember.address)).to.be.fulfilled;
    const fellowshipMembers = (await helper.callRpc('api.query.fellowshipCollective.members')).toJSON();
    expect(fellowshipMembers).to.contains(newFellowshipMember.address);
  });

  itSub('[Negative] Council member cannot add/remove a Council member', async ({helper}) => {
    const [newCouncilMember] = await helper.arrange.createAccounts([0n], donor);
    await expect(helper.council.collective.execute(
      counselors.alex,
      helper.council.membership.addMemberCall(newCouncilMember.address),
    )).to.be.rejectedWith('BadOrigin');
    await expect(helper.council.collective.execute(
      counselors.alex,
      helper.council.membership.removeMemberCall(counselors.charu.address),
    )).to.be.rejectedWith('BadOrigin');
  });

  itSub('[Negative] Council cannot set/clear Council prime member', async ({helper}) => {
    const proposalForSet = await helper.council.membership.setPrimeCall(counselors.charu.address);
    const proposalForClear = await helper.council.membership.clearPrimeCall();

    await expect(proposalFromAllCouncil(proposalForSet)).to.be.rejectedWith(/BadOrigin/);
    await expect(proposalFromAllCouncil(proposalForClear)).to.be.rejectedWith(/BadOrigin/);

  });

  itSub('[Negative] Council member cannot set/clear Council prime member', async ({helper}) => {
    await expect(helper.council.collective.execute(
      counselors.alex,
      helper.council.membership.setPrimeCall(counselors.charu.address),
    )).to.be.rejectedWith('BadOrigin');
    await expect(helper.council.collective.execute(
      counselors.alex,
      helper.council.membership.clearPrimeCall(),
    )).to.be.rejectedWith('BadOrigin');
  });

  itSub('[Negative] Council member cannot add/remove a TechComm member', async ({helper}) => {
    const [newTechCommMember] = await helper.arrange.createAccounts([0n], donor);
    await expect(helper.council.collective.execute(
      counselors.alex,
      helper.technicalCommittee.membership.addMemberCall(newTechCommMember.address),
    )).to.be.rejectedWith('BadOrigin');
    await expect(helper.council.collective.execute(
      counselors.alex,
      helper.technicalCommittee.membership.removeMemberCall(counselors.charu.address),
    )).to.be.rejectedWith('BadOrigin');
  });

  itSub('[Negative] Council member cannot promote/demote a Fellowship member', async ({helper}) => {
    const fellowship = await initFellowship(donor, sudoer);
    const memberWithRankOne = fellowship[1][0];

    await expect(helper.council.collective.execute(
      counselors.alex,
      helper.fellowship.collective.promoteCall(memberWithRankOne.address),
    )).to.be.rejectedWith('BadOrigin');
    await expect(helper.council.collective.execute(
      counselors.alex,
      helper.fellowship.collective.demoteCall(memberWithRankOne.address),
    )).to.be.rejectedWith('BadOrigin');
    await clearFellowshipRankAgnostic(sudoer, fellowship);
  });

  itSub('[Negative] Council cannot fast-track Democracy proposals', async ({helper}) => {
    const preimageHash = await helper.preimage.notePreimageFromCall(sudoer, dummyProposalCall(helper), true);
    await helper.getSudo().democracy.externalProposeDefaultWithPreimage(sudoer, preimageHash);

    await expect(proposalFromAllCouncil(helper.democracy.fastTrackCall(preimageHash, democracyFastTrackVotingPeriod, 0)))
      .to.be.rejectedWith(/BadOrigin/);
  });

  itSub('[Negative] Council member cannot fast-track Democracy proposals', async ({helper}) => {
    const preimageHash = await helper.preimage.notePreimageFromCall(sudoer, dummyProposalCall(helper), true);
    await helper.getSudo().democracy.externalProposeDefaultWithPreimage(sudoer, preimageHash);

    await expect(helper.council.collective.execute(
      counselors.alex,
      helper.democracy.fastTrackCall(preimageHash, democracyFastTrackVotingPeriod, 0),
    )).to.be.rejectedWith('BadOrigin');
  });

  itSub('[Negative] Council cannot cancel Democracy proposals', async ({helper}) => {
    const proposeResult = await helper.getSudo().democracy.propose(sudoer, dummyProposalCall(helper), 0n);
    const proposalIndex = Event.Democracy.Proposed.expect(proposeResult).proposalIndex;

    await expect(proposalFromAllCouncil(helper.democracy.cancelProposalCall(proposalIndex)))
      .to.be.rejectedWith(/BadOrigin/);
  });

  itSub('[Negative] Council member cannot cancel Democracy proposals', async ({helper}) => {

    const proposeResult = await helper.getSudo().democracy.propose(sudoer, dummyProposalCall(helper), 0n);
    const proposalIndex = Event.Democracy.Proposed.expect(proposeResult).proposalIndex;

    await expect(helper.council.collective.execute(
      counselors.alex,
      helper.democracy.cancelProposalCall(proposalIndex),
    )).to.be.rejectedWith('BadOrigin');
  });

  itSub('[Negative] Council cannot cancel ongoing Democracy referendums', async ({helper}) => {
    await helper.getSudo().democracy.externalProposeDefault(sudoer, dummyProposalCall(helper));
    const startedEvent = await helper.wait.expectEvent(democracyLaunchPeriod, Event.Democracy.Started);
    const referendumIndex = startedEvent.referendumIndex;

    await expect(proposalFromAllCouncil(helper.democracy.emergencyCancelCall(referendumIndex)))
      .to.be.rejectedWith(/BadOrigin/);
  });

  itSub('[Negative] Council member cannot cancel ongoing Democracy referendums', async ({helper}) => {
    await helper.getSudo().democracy.externalProposeDefault(sudoer, dummyProposalCall(helper));
    const startedEvent = await helper.wait.expectEvent(democracyLaunchPeriod, Event.Democracy.Started);
    const referendumIndex = startedEvent.referendumIndex;

    await expect(helper.council.collective.execute(
      counselors.alex,
      helper.democracy.emergencyCancelCall(referendumIndex),
    )).to.be.rejectedWith('BadOrigin');
  });

  itSub('[Negative] Council cannot cancel Fellowship referendums', async ({helper}) => {
    const fellowship = await initFellowship(donor, sudoer);
    const fellowshipProposer = fellowship[5][0];
    const proposal = dummyProposal(helper);

    const submitResult = await helper.fellowship.referenda.submit(
      fellowshipProposer,
      fellowshipPropositionOrigin,
      proposal,
      defaultEnactmentMoment,
    );

    const referendumIndex = Event.FellowshipReferenda.Submitted.expect(submitResult).referendumIndex;

    await expect(proposalFromAllCouncil(helper.fellowship.referenda.cancelCall(referendumIndex)))
      .to.be.rejectedWith(/BadOrigin/);
  });

  itSub('[Negative] Council member cannot cancel Fellowship referendums', async ({helper}) => {
    const fellowship = await initFellowship(donor, sudoer);
    const fellowshipProposer = fellowship[5][0];
    const proposal = dummyProposal(helper);

    const submitResult = await helper.fellowship.referenda.submit(
      fellowshipProposer,
      fellowshipPropositionOrigin,
      proposal,
      defaultEnactmentMoment,
    );
    const referendumIndex = Event.FellowshipReferenda.Submitted.expect(submitResult).referendumIndex;
    await expect(helper.council.collective.execute(
      counselors.alex,
      helper.fellowship.referenda.cancelCall(referendumIndex),
    )).to.be.rejectedWith('BadOrigin');
  });

  itSub('[Negative] Council referendum cannot be closed until the voting threshold is met', async ({helper}) => {
    const councilSize = (await helper.callRpc('api.query.councilMembership.members')).toJSON().length as any as number;
    expect(councilSize).is.greaterThan(1);
    const proposeResult = await helper.council.collective.propose(
      counselors.filip,
      dummyProposalCall(helper),
      councilSize,
    );

    const councilProposedEvent = Event.Council.Proposed.expect(proposeResult);
    const proposalIndex = councilProposedEvent.proposalIndex;
    const proposalHash = councilProposedEvent.proposalHash;


    await helper.council.collective.vote(counselors.alex, proposalHash, proposalIndex, true);


    await expect(helper.council.collective.close(counselors.filip, proposalHash, proposalIndex)).to.be.rejectedWith('TooEarly');

  });

  itSub('[Negative] Council member cannot propose an existing Council proposal', async ({helper}) => {
    const repeatedProposal = dummyProposalCall(helper);
    await expect(helper.council.collective.propose(counselors.filip, repeatedProposal, moreThanHalfCouncilThreshold))
      .to.be.fulfilled;
    await expect(helper.council.collective.propose(counselors.filip, repeatedProposal, moreThanHalfCouncilThreshold))
      .to.be.rejectedWith('DuplicateProposal');
    await expect(helper.council.collective.propose(counselors.alex, repeatedProposal, moreThanHalfCouncilThreshold))
      .to.be.rejectedWith('DuplicateProposal');
  });

  itSub('[Negative] Council non-member cannot propose', async ({helper}) => {
    const [illegalProposer] = await helper.arrange.createAccounts([10n], donor);
    await expect(helper.council.collective.propose(illegalProposer, dummyProposalCall(helper), moreThanHalfCouncilThreshold)).to.be.rejectedWith('NotMember');
  });

  itSub('[Negative] Council non-member cannot vote', async ({helper}) => {
    const [illegalVoter] = await helper.arrange.createAccounts([1n], donor);
    const proposeResult = await helper.council.collective.propose(
      counselors.filip,
      dummyProposalCall(helper),
      moreThanHalfCouncilThreshold,
    );

    const councilProposedEvent = Event.Council.Proposed.expect(proposeResult);
    const proposalIndex = councilProposedEvent.proposalIndex;
    const proposalHash = councilProposedEvent.proposalHash;

    await expect(helper.council.collective.vote(illegalVoter, proposalHash, proposalIndex, true)).to.be.rejectedWith('NotMember');
  });
});
