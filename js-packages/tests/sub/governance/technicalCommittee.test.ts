import type {IKeyringPair} from '@polkadot/types/types';
import {usingPlaygrounds, itSub, expect, Pallets, requirePalletsOrSkip, describeGov} from '@unique/test-utils/util.js';
import {Event} from '@unique/test-utils';
import {initCouncil, democracyLaunchPeriod, democracyFastTrackVotingPeriod, clearCouncil, clearTechComm, clearFellowship, defaultEnactmentMoment, dummyProposal, dummyProposalCall, fellowshipPropositionOrigin, initFellowship, initTechComm, hardResetFellowshipReferenda, hardResetDemocracy, hardResetGovScheduler} from './util.js';
import type {ITechComms} from './util.js';

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
      preImageHash = await helper.preimage.notePreimageFromCall(sudoer, proposalCall, true);
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
      expect((await helper.callRpc('api.query.technicalCommitteeMembership.members')).toJSON().length).to.be.equal(allTechCommitteeThreshold);
      const proposeResult = await helper.technicalCommittee.collective.propose(
        techcomms.andy,
        proposal,
        allTechCommitteeThreshold,
      );

      const commiteeProposedEvent = Event.TechnicalCommittee.Proposed.expect(proposeResult);
      const proposalIndex = commiteeProposedEvent.proposalIndex;
      const proposalHash = commiteeProposedEvent.proposalHash;


      await helper.technicalCommittee.collective.vote(techcomms.andy, proposalHash, proposalIndex, true);
      await helper.technicalCommittee.collective.vote(techcomms.constantine, proposalHash, proposalIndex, true);
      await helper.technicalCommittee.collective.vote(techcomms.greg, proposalHash, proposalIndex, true);

      const closeResult = await helper.technicalCommittee.collective.close(techcomms.andy, proposalHash, proposalIndex);
      Event.TechnicalCommittee.Closed.expect(closeResult);
      Event.TechnicalCommittee.Approved.expect(closeResult);
      const {result} = Event.TechnicalCommittee.Executed.expect(closeResult);
      expect(result).to.eq('Ok');

      return closeResult;
    });
  }

  itSub('TechComm can fast-track Democracy proposals', async ({helper}) => {
    const preimageHash = await helper.preimage.notePreimageFromCall(sudoer, dummyProposalCall(helper), true);
    await helper.wait.parachainBlockMultiplesOf(35n);

    await helper.getSudo().democracy.externalProposeDefaultWithPreimage(sudoer, preimageHash);

    const fastTrackProposal = await proposalFromAllCommittee(helper.democracy.fastTrackCall(preimageHash, democracyFastTrackVotingPeriod, 0));
    Event.Democracy.Started.expect(fastTrackProposal);
  });

  itSub('TechComm can cancel Democracy proposals', async ({helper}) => {
    const proposeResult = await helper.getSudo().democracy.propose(sudoer, dummyProposalCall(helper), 0n);
    const proposalIndex = Event.Democracy.Proposed.expect(proposeResult).proposalIndex;

    const cancelProposal = await proposalFromAllCommittee(helper.democracy.cancelProposalCall(proposalIndex));
    Event.Democracy.ProposalCanceled.expect(cancelProposal);
  });

  itSub('TechComm can cancel ongoing Democracy referendums', async ({helper}) => {
    await helper.getSudo().democracy.externalProposeDefault(sudoer, dummyProposalCall(helper));
    const startedEvent = await helper.wait.expectEvent(democracyLaunchPeriod, Event.Democracy.Started);
    const referendumIndex = startedEvent.referendumIndex;

    const emergencyCancelProposal = await proposalFromAllCommittee(helper.democracy.emergencyCancelCall(referendumIndex));
    Event.Democracy.Cancelled.expect(emergencyCancelProposal);
  });

  itSub('TechComm member can veto Democracy proposals', async ({helper}) => {
    const preimageHash = await helper.preimage.notePreimageFromCall(sudoer, dummyProposalCall(helper), true);
    await helper.getSudo().democracy.externalProposeDefaultWithPreimage(sudoer, preimageHash);

    const vetoExternalCall = await helper.technicalCommittee.collective.execute(
      techcomms.andy,
      helper.democracy.vetoExternalCall(preimageHash),
    );
    Event.Democracy.Vetoed.expect(vetoExternalCall);
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
    const referendumIndex = Event.FellowshipReferenda.Submitted.expect(submitResult).referendumIndex;
    const cancelProposal = await proposalFromAllCommittee(helper.fellowship.referenda.cancelCall(referendumIndex));
    Event.FellowshipReferenda.Cancelled.expect(cancelProposal);
  });

  itSub('TechComm member can add a Fellowship member', async ({helper}) => {
    const newFellowshipMember = helper.arrange.createEmptyAccount();
    await expect(helper.technicalCommittee.collective.execute(
      techcomms.andy,
      helper.fellowship.collective.addMemberCall(newFellowshipMember.address),
    )).to.be.fulfilled;
    expect(await helper.fellowship.collective.getMembers()).to.be.deep.contain(newFellowshipMember.address);
    await clearFellowship(sudoer);
  });

  itSub('[Negative] TechComm can\'t add FinCouncil member', async ({helper}) => {
    const newFinCouncilMember = helper.arrange.createEmptyAccount();
    const addMemberProposal = helper.finCouncil.membership.addMemberCall(newFinCouncilMember.address);
    await expect(proposalFromAllCommittee(addMemberProposal)).rejectedWith('BadOrigin');

    const finCouncilMembers = await helper.finCouncil.membership.getMembers();
    expect(finCouncilMembers).to.not.contains(newFinCouncilMember.address);
  });


  itSub('[Negative] TechComm member can\'t add FinCouncil member', async ({helper}) => {
    const newFinCouncilMember = helper.arrange.createEmptyAccount();
    await expect(helper.technicalCommittee.collective.execute(
      techcomms.greg,
      helper.finCouncil.membership.addMemberCall(newFinCouncilMember.address),
    )).rejectedWith('BadOrigin');
  });

  itSub.skip('[Negative] TechComm member cannot register foreign asset', async ({helper}) => {
    const location = {
      parents: 1,
      interior: {X3: [
        {
          Parachain: 1000,
        },
        {
          PalletInstance: 50,
        },
        {
          GeneralIndex: 1985,
        },
      ]},
    };
    const assetId = {Concrete: location};

    const foreignAssetProposal = helper.constructApiCall(
      'api.tx.foreignAssets.forceRegisterForeignAsset',
      [{V3: assetId}, helper.util.str2vec('New Asset2'), 'NEW', {Fungible: 10}],
    );

    await expect(helper.technicalCommittee.collective.execute(techcomms.andy, foreignAssetProposal))
      .to.be.rejectedWith('BadOrigin');
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


  itSub('[Negative] TechComm cannot promote/demote Fellowship member', async ({helper}) => {
    const fellowship = await initFellowship(donor, sudoer);
    const memberWithRankOne = fellowship[1][0];

    const promoteProposal = helper.fellowship.collective.promoteCall(memberWithRankOne.address);
    await expect(proposalFromAllCommittee(promoteProposal)).rejectedWith('BadOrigin');

    const demoteProposal = helper.fellowship.collective.demoteCall(memberWithRankOne.address);
    await expect(proposalFromAllCommittee(demoteProposal)).rejectedWith('BadOrigin');

    await clearFellowship(sudoer);
  });

  itSub('[Negative] TechComm member cannot promote/demote Fellowship member', async ({helper}) => {
    const fellowship = await initFellowship(donor, sudoer);
    const memberWithRankOne = fellowship[1][0];

    const promoteProposal = helper.fellowship.collective.promoteCall(memberWithRankOne.address);
    await expect(helper.technicalCommittee.collective.execute(
      techcomms.andy,
      promoteProposal,
    )).to.be.rejectedWith('BadOrigin');

    const demoteProposal = helper.fellowship.collective.demoteCall(memberWithRankOne.address);
    await expect(helper.technicalCommittee.collective.execute(
      techcomms.andy,
      demoteProposal,
    )).to.be.rejectedWith('BadOrigin');

    await clearFellowship(sudoer);
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
    const preimageHash = await helper.preimage.notePreimageFromCall(sudoer, dummyProposalCall(helper), true);
    await helper.getSudo().democracy.externalProposeDefaultWithPreimage(sudoer, preimageHash);

    await expect(helper.technicalCommittee.collective.execute(
      techcomms.andy,
      helper.democracy.fastTrackCall(preimageHash, democracyFastTrackVotingPeriod, 0),
    )).to.be.rejectedWith('BadOrigin');
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
    )).to.be.rejectedWith('BadOrigin');
  });

  itSub('[Negative] TechComm cannot blacklist Democracy proposals', async ({helper}) => {
    const preimageHash = await helper.preimage.notePreimageFromCall(sudoer, dummyProposalCall(helper), true);
    await helper.getSudo().democracy.externalProposeDefaultWithPreimage(sudoer, preimageHash);

    await expect(proposalFromAllCommittee(helper.democracy.blacklistCall(preimageHash))).to.be.rejectedWith('BadOrigin');
  });

  itSub('[Negative] TechComm member cannot blacklist Democracy proposals', async ({helper}) => {
    const preimageHash = await helper.preimage.notePreimageFromCall(sudoer, dummyProposalCall(helper), true);
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

    const referendumIndex = Event.FellowshipReferenda.Submitted.expect(submitResult).referendumIndex;

    await expect(helper.technicalCommittee.collective.execute(
      techcomms.andy,
      helper.fellowship.referenda.cancelCall(referendumIndex),
    )).to.be.rejectedWith('BadOrigin');
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
});
