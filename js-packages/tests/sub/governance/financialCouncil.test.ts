import type {IKeyringPair} from '@polkadot/types/types';
import {usingPlaygrounds, itSub, expect, describeGov} from '@unique/test-utils/util.js';
import {Event} from '@unique/test-utils';
import {democracyFastTrackVotingPeriod, IFinCounselors, clearTechComm, dummyProposalCall, initFinCouncil, clearFinCouncil, democracyLaunchPeriod, initFellowship, dummyProposal, fellowshipPropositionOrigin, defaultEnactmentMoment, initCouncil, clearCouncil, clearFellowship} from './util.js';


describeGov('Governance: Financial Council tests', () => {
  let donor: IKeyringPair;
  let finCounselors: IFinCounselors;
  let sudoer: IKeyringPair;

  const moreThanHalfCouncilThreshold = 2;

  before(async function() {
    await usingPlaygrounds(async (helper, privateKey) => {
      sudoer = await privateKey('//Alice');
      donor = await privateKey({url: import.meta.url});
    });
  });

  beforeEach(async () => {
    finCounselors = await initFinCouncil(donor, sudoer);
  });

  afterEach(async () => {
    await clearFinCouncil(sudoer);
    await clearTechComm(sudoer);
  });

  async function proposalFromAllFinCouncil(proposal: any) {
    return await usingPlaygrounds(async (helper) => {
      expect((await helper.finCouncil.membership.getMembers()).length).to.be.equal(3);
      const proposeResult = await helper.finCouncil.collective.propose(
        finCounselors.ildar,
        proposal,
        moreThanHalfCouncilThreshold,
      );

      const councilProposedEvent = Event.FinCouncil.Proposed.expect(proposeResult);
      const proposalIndex = councilProposedEvent.proposalIndex;
      const proposalHash = councilProposedEvent.proposalHash;

      await helper.finCouncil.collective.vote(finCounselors.greg, proposalHash, proposalIndex, true);
      await helper.finCouncil.collective.vote(finCounselors.ildar, proposalHash, proposalIndex, true);
      await helper.finCouncil.collective.vote(finCounselors.andy, proposalHash, proposalIndex, true);

      return await helper.finCouncil.collective.close(finCounselors.andy, proposalHash, proposalIndex);
    });
  }

  itSub('FinCouncil member can register foreign asset', async ({helper}) => {
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
          GeneralIndex: 1984,
        },
      ]},
    };
    const assetId = {Concrete: location};

    const registerForeignAssetCall = helper.constructApiCall(
      'api.tx.foreignAssets.forceRegisterForeignAsset',
      [{V3: assetId}, helper.util.str2vec('New Asset'), 'NEW', {Fungible: 10}],
    );

    await helper.finCouncil.collective.execute(finCounselors.andy, registerForeignAssetCall);

    const asset = await helper.foreignAssets.foreignCollectionId(location);
    expect(asset).not.null;
  });

  itSub('[Negative] FinCouncil can\'t fast-track Democracy proposals', async ({helper}) => {
    const preimageHash = await helper.preimage.notePreimageFromCall(sudoer, dummyProposalCall(helper), true);
    await helper.wait.parachainBlockMultiplesOf(35n);

    await helper.getSudo().democracy.externalProposeDefaultWithPreimage(sudoer, preimageHash);

    await expect(proposalFromAllFinCouncil(helper.democracy.fastTrackCall(preimageHash, democracyFastTrackVotingPeriod, 0)))
      .rejectedWith('BadOrigin');
  });

  itSub('[Negative] FinCouncil member cannot fast-track Democracy proposals', async ({helper}) => {
    const preimageHash = await helper.preimage.notePreimageFromCall(sudoer, dummyProposalCall(helper), true);
    await helper.getSudo().democracy.externalProposeDefaultWithPreimage(sudoer, preimageHash);

    await expect(helper.finCouncil.collective.execute(
      finCounselors.andy,
      helper.democracy.fastTrackCall(preimageHash, democracyFastTrackVotingPeriod, 0),
    )).to.be.rejectedWith('BadOrigin');
  });

  itSub('[Negative] FinCouncil can\'t cancel Democracy proposals', async ({helper}) => {
    const proposeResult = await helper.getSudo().democracy.propose(sudoer, dummyProposalCall(helper), 0n);
    const proposalIndex = Event.Democracy.Proposed.expect(proposeResult).proposalIndex;

    await expect(proposalFromAllFinCouncil(helper.democracy.cancelProposalCall(proposalIndex)))
      .rejectedWith('BadOrigin');
  });

  itSub('[Negative] FinCouncil member cannot cancel Democracy proposals', async ({helper}) => {
    const proposeResult = await helper.getSudo().democracy.propose(sudoer, dummyProposalCall(helper), 0n);
    const proposalIndex = Event.Democracy.Proposed.expect(proposeResult).proposalIndex;

    await expect(helper.finCouncil.collective.execute(
      finCounselors.andy,
      helper.democracy.cancelProposalCall(proposalIndex),
    ))
      .to.be.rejectedWith('BadOrigin');
  });

  itSub('[Negative] FinCouncil can\'t cancel ongoing Democracy referendums', async ({helper}) => {
    await helper.getSudo().democracy.externalProposeDefault(sudoer, dummyProposalCall(helper));
    const startedEvent = await helper.wait.expectEvent(democracyLaunchPeriod, Event.Democracy.Started);
    const referendumIndex = startedEvent.referendumIndex;

    await expect(proposalFromAllFinCouncil(helper.democracy.emergencyCancelCall(referendumIndex)))
      .rejectedWith('BadOrigin');
  });

  itSub('[Negative] FinCouncil member cannot cancel ongoing Democracy referendums', async ({helper}) => {
    await helper.getSudo().democracy.externalProposeDefault(sudoer, dummyProposalCall(helper));
    const startedEvent = await helper.wait.expectEvent(democracyLaunchPeriod, Event.Democracy.Started);
    const referendumIndex = startedEvent.referendumIndex;

    await expect(helper.finCouncil.collective.execute(
      finCounselors.andy,
      helper.democracy.emergencyCancelCall(referendumIndex),
    )).to.be.rejectedWith('BadOrigin');
  });

  itSub('[Negative] FinCouncil can\'t veto Democracy proposals', async ({helper}) => {
    const preimageHash = await helper.preimage.notePreimageFromCall(sudoer, dummyProposalCall(helper), true);
    await helper.getSudo().democracy.externalProposeDefaultWithPreimage(sudoer, preimageHash);

    await expect(proposalFromAllFinCouncil(helper.democracy.vetoExternalCall(preimageHash)))
      .rejectedWith('BadOrigin');
  });

  itSub('[Negative] FinCouncil member can\'t veto Democracy proposals', async ({helper}) => {
    const preimageHash = await helper.preimage.notePreimageFromCall(sudoer, dummyProposalCall(helper), true);
    await helper.getSudo().democracy.externalProposeDefaultWithPreimage(sudoer, preimageHash);

    await expect(helper.finCouncil.collective.execute(
      finCounselors.andy,
      helper.democracy.vetoExternalCall(preimageHash),
    )).rejectedWith('BadOrigin');
  });

  itSub('[Negative] FinCouncil cannot blacklist Democracy proposals', async ({helper}) => {
    const preimageHash = await helper.preimage.notePreimageFromCall(sudoer, dummyProposalCall(helper), true);
    await helper.getSudo().democracy.externalProposeDefaultWithPreimage(sudoer, preimageHash);

    await expect(proposalFromAllFinCouncil(helper.democracy.blacklistCall(preimageHash))).to.be.rejectedWith('BadOrigin');
  });

  itSub('[Negative] FinCouncil member cannot blacklist Democracy proposals', async ({helper}) => {
    const preimageHash = await helper.preimage.notePreimageFromCall(sudoer, dummyProposalCall(helper), true);
    await helper.getSudo().democracy.externalProposeDefaultWithPreimage(sudoer, preimageHash);

    await expect(helper.finCouncil.collective.execute(
      finCounselors.andy,
      helper.democracy.blacklistCall(preimageHash),
    )).to.be.rejectedWith('BadOrigin');
  });

  itSub('[Negative] FinCouncil can\'t cancel Fellowship referendums', async ({helper}) => {
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
    await expect(proposalFromAllFinCouncil(helper.fellowship.referenda.cancelCall(referendumIndex)))
      .rejectedWith('BadOrigin');
  });

  itSub('[Negative] FinCouncil member cannot cancel Fellowship referendums', async ({helper}) => {
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

    await expect(helper.finCouncil.collective.execute(
      finCounselors.andy,
      helper.fellowship.referenda.cancelCall(referendumIndex),
    )).to.be.rejectedWith('BadOrigin');
  });

  itSub('[Negative] FinCouncil cannot add a Fellowship member', async ({helper}) => {
    const newFellowshipMember = helper.arrange.createEmptyAccount();
    const addMemberProposal = helper.fellowship.collective.addMemberCall(newFellowshipMember.address);

    await expect(proposalFromAllFinCouncil(addMemberProposal)).to.be.rejectedWith('BadOrigin');
  });

  itSub('[Negative] FinCouncil member cannot add a Fellowship member', async ({helper}) => {
    const newFellowshipMember = helper.arrange.createEmptyAccount();
    await expect(helper.finCouncil.collective.execute(
      finCounselors.andy,
      helper.fellowship.collective.addMemberCall(newFellowshipMember.address),
    )).to.be.rejectedWith('BadOrigin');
  });

  itSub('[Negative] FinCouncil cannot submit regular democracy proposal', async ({helper}) => {
    const councilProposal = await helper.democracy.proposeCall(dummyProposalCall(helper), 0n);

    await expect(proposalFromAllFinCouncil(councilProposal)).to.be.rejectedWith('BadOrigin');
  });

  itSub('[Negative] FinCouncil cannot externally propose SuperMajorityAgainst', async ({helper}) => {
    const commiteeProposal = await helper.democracy.externalProposeDefaultCall(dummyProposalCall(helper));

    await expect(proposalFromAllFinCouncil(commiteeProposal)).to.be.rejectedWith('BadOrigin');
  });

  itSub('[Negative] FinCouncil member cannot submit regular democracy proposal', async ({helper}) => {
    const memberProposal = await helper.democracy.proposeCall(dummyProposalCall(helper), 0n);

    await expect(helper.finCouncil.collective.execute(
      finCounselors.andy,
      memberProposal,
    )).to.be.rejectedWith('BadOrigin');
  });

  itSub('[Negative] FinCouncil cannot externally propose SimpleMajority', async ({helper}) => {
    const commiteeProposal = await helper.democracy.externalProposeMajorityCall(dummyProposalCall(helper));

    await expect(proposalFromAllFinCouncil(commiteeProposal)).to.be.rejectedWith('BadOrigin');
  });

  itSub('[Negative] FinCouncil cannot externally propose SuperMajorityApprove', async ({helper}) => {
    const commiteeProposal = await helper.democracy.externalProposeCall(dummyProposalCall(helper));

    await expect(proposalFromAllFinCouncil(commiteeProposal)).to.be.rejectedWith('BadOrigin');
  });

  itSub('[Negative] FinCouncil member cannot externally propose SuperMajorityAgainst', async ({helper}) => {
    const memberProposal = await helper.democracy.externalProposeDefaultCall(dummyProposalCall(helper));

    await expect(helper.finCouncil.collective.execute(
      finCounselors.andy,
      memberProposal,
    )).to.be.rejectedWith('BadOrigin');
  });

  itSub('[Negative] FinCouncil member cannot externally propose SimpleMajority', async ({helper}) => {
    const memberProposal = await helper.democracy.externalProposeMajorityCall(dummyProposalCall(helper));

    await expect(helper.finCouncil.collective.execute(
      finCounselors.andy,
      memberProposal,
    )).to.be.rejectedWith('BadOrigin');
  });

  itSub('[Negative] FinCouncil member cannot externally propose SuperMajorityApprove', async ({helper}) => {
    const memberProposal = await helper.democracy.externalProposeCall(dummyProposalCall(helper));

    await expect(helper.finCouncil.collective.execute(
      finCounselors.andy,
      memberProposal,
    )).to.be.rejectedWith('BadOrigin');
  });

  itSub('[Negative] FinCouncil cannot add/remove a Council member', async ({helper}) => {
    const newCouncilMember = helper.arrange.createEmptyAccount();
    const addMemberProposal = helper.council.membership.addMemberCall(newCouncilMember.address);
    const removeMemberProposal = helper.council.membership.removeMemberCall(newCouncilMember.address);

    await expect(proposalFromAllFinCouncil(addMemberProposal)).to.be.rejectedWith('BadOrigin');
    await expect(proposalFromAllFinCouncil(removeMemberProposal)).to.be.rejectedWith('BadOrigin');
  });

  itSub('[Negative] FinCouncil member cannot add/remove a Council member', async ({helper}) => {
    const newCouncilMember = helper.arrange.createEmptyAccount();
    const addMemberProposal = helper.council.membership.addMemberCall(newCouncilMember.address);
    const removeMemberProposal = helper.council.membership.removeMemberCall(newCouncilMember.address);

    await expect(helper.finCouncil.collective.execute(
      finCounselors.andy,
      addMemberProposal,
    )).to.be.rejectedWith('BadOrigin');
    await expect(helper.finCouncil.collective.execute(
      finCounselors.andy,
      removeMemberProposal,
    )).to.be.rejectedWith('BadOrigin');
  });

  itSub('[Negative] FinCouncil cannot add/remove a FinCouncil member', async ({helper}) => {
    const newCouncilMember = helper.arrange.createEmptyAccount();
    const addMemberProposal = helper.finCouncil.membership.addMemberCall(newCouncilMember.address);
    const removeMemberProposal = helper.finCouncil.membership.removeMemberCall(finCounselors.ildar.address);

    await expect(proposalFromAllFinCouncil(addMemberProposal)).to.be.rejectedWith('BadOrigin');
    await expect(proposalFromAllFinCouncil(removeMemberProposal)).to.be.rejectedWith('BadOrigin');
  });

  itSub('[Negative] FinCouncil cannot add/remove a FinCouncil prime member', async ({helper}) => {
    const setPrimeCall = helper.finCouncil.membership.setPrimeCall(finCounselors.andy.address);
    const clearPrimeCall = helper.finCouncil.membership.clearPrimeCall();

    await expect(proposalFromAllFinCouncil(setPrimeCall)).to.be.rejectedWith('BadOrigin');
    await expect(proposalFromAllFinCouncil(clearPrimeCall)).to.be.rejectedWith('BadOrigin');
  });

  itSub('[Negative] FinCouncil member cannot add/remove a FinCouncil prime member', async ({helper}) => {
    await expect(helper.finCouncil.collective.execute(
      finCounselors.andy,
      helper.finCouncil.membership.setPrimeCall(finCounselors.andy.address),
    )).to.be.rejectedWith('BadOrigin');

    await expect(helper.finCouncil.collective.execute(
      finCounselors.andy,
      helper.finCouncil.membership.clearPrimeCall(),
    )).to.be.rejectedWith('BadOrigin');
  });

  itSub('[Negative] FinCouncil member cannot add/remove a FinCouncil member', async ({helper}) => {
    const newCouncilMember = helper.arrange.createEmptyAccount();
    const addMemberProposal = helper.finCouncil.membership.addMemberCall(newCouncilMember.address);
    const removeMemberProposal = helper.finCouncil.membership.removeMemberCall(finCounselors.ildar.address);

    await expect(helper.finCouncil.collective.execute(
      finCounselors.andy,
      addMemberProposal,
    )).to.be.rejectedWith('BadOrigin');
    await expect(helper.finCouncil.collective.execute(
      finCounselors.andy,
      removeMemberProposal,
    )).to.be.rejectedWith('BadOrigin');
  });

  itSub('[Negative] FinCouncil cannot set/clear Council prime member', async ({helper}) => {
    const counselors = await initCouncil(donor, sudoer);
    const proposalForSet = await helper.council.membership.setPrimeCall(counselors.charu.address);
    const proposalForClear = await helper.council.membership.clearPrimeCall();

    await expect(proposalFromAllFinCouncil(proposalForSet)).to.be.rejectedWith('BadOrigin');
    await expect(proposalFromAllFinCouncil(proposalForClear)).to.be.rejectedWith('BadOrigin');
    await clearCouncil(sudoer);
  });

  itSub('[Negative] FinCouncil member cannot set/clear Council prime member', async ({helper}) => {
    const counselors = await initCouncil(donor, sudoer);
    const proposalForSet = await helper.council.membership.setPrimeCall(counselors.charu.address);
    const proposalForClear = await helper.council.membership.clearPrimeCall();

    await expect(helper.finCouncil.collective.execute(
      finCounselors.andy,
      proposalForSet,
    )).to.be.rejectedWith('BadOrigin');
    await expect(helper.finCouncil.collective.execute(
      finCounselors.andy,
      proposalForClear,
    )).to.be.rejectedWith('BadOrigin');
    await clearCouncil(sudoer);
  });

  itSub('[Negative] FinCouncil cannot add/remove a TechComm member', async ({helper}) => {
    const newCommMember = helper.arrange.createEmptyAccount();
    const addMemberProposal = helper.technicalCommittee.membership.addMemberCall(newCommMember.address);
    const removeMemberProposal = helper.technicalCommittee.membership.removeMemberCall(newCommMember.address);

    await expect(proposalFromAllFinCouncil(addMemberProposal)).to.be.rejectedWith('BadOrigin');
    await expect(proposalFromAllFinCouncil(removeMemberProposal)).to.be.rejectedWith('BadOrigin');
  });

  itSub('[Negative] FinCouncil member cannot add/remove a TechComm member', async ({helper}) => {
    const newCommMember = helper.arrange.createEmptyAccount();
    const addMemberProposal = helper.technicalCommittee.membership.addMemberCall(newCommMember.address);
    const removeMemberProposal = helper.technicalCommittee.membership.removeMemberCall(newCommMember.address);

    await expect(helper.finCouncil.collective.execute(
      finCounselors.andy,
      addMemberProposal,
    )).to.be.rejectedWith('BadOrigin');
    await expect(helper.finCouncil.collective.execute(
      finCounselors.andy,
      removeMemberProposal,
    )).to.be.rejectedWith('BadOrigin');
  });

  itSub('[Negative] FinCouncil cannot remove a Fellowship member', async ({helper}) => {
    const fellowship = await initFellowship(donor, sudoer);

    await expect(proposalFromAllFinCouncil(helper.fellowship.collective.removeMemberCall(fellowship[5][0].address, 5))).to.be.rejectedWith('BadOrigin');
    await clearFellowship(sudoer);
  });

  itSub('[Negative] FinCouncil member cannot remove a Fellowship member', async ({helper}) => {
    const fellowship = await initFellowship(donor, sudoer);

    await expect(helper.finCouncil.collective.execute(
      finCounselors.andy,
      helper.fellowship.collective.removeMemberCall(fellowship[5][0].address, 5),
    )).to.be.rejectedWith('BadOrigin');
    await clearFellowship(sudoer);
  });


});
