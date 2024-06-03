import type {IKeyringPair} from '@polkadot/types/types';
import {usingPlaygrounds, itSub, expect, Pallets, requirePalletsOrSkip, describeGov} from '@unique/test-utils/util.js';
import {Event} from '@unique/test-utils';
import {democracyFastTrackVotingPeriod, IFinCounselors, clearTechComm, dummyProposalCall, initFinCouncil, clearFinCouncil} from './util.js';


describeGov('Governance: Technical Committee tests', () => {
  let donor: IKeyringPair;
  let finCounselors: IFinCounselors;
  let sudoer: IKeyringPair;

  const moreThanHalfCouncilThreshold = 2;

  before(async function() {
    await usingPlaygrounds(async (helper, privateKey) => {
      requirePalletsOrSkip(this, helper, [Pallets.FinancialCouncil]);
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

  async function proposalFromMoreThanHalfCouncil(proposal: any) {
    return await usingPlaygrounds(async (helper) => {
      expect((await helper.finCouncil.membership.getMembers()).length).to.be.equal(3);
      const proposeResult = await helper.finCouncil.collective.propose(
        finCounselors.ildar,
        proposal,
        moreThanHalfCouncilThreshold,
      );

      const councilProposedEvent = Event.Council.Proposed.expect(proposeResult);
      const proposalIndex = councilProposedEvent.proposalIndex;
      const proposalHash = councilProposedEvent.proposalHash;


      await helper.finCouncil.collective.vote(finCounselors.greg, proposalHash, proposalIndex, true);
      await helper.finCouncil.collective.vote(finCounselors.ildar, proposalHash, proposalIndex, true);

      return await helper.finCouncil.collective.close(finCounselors.ildar, proposalHash, proposalIndex);
    });
  }

  async function proposalFromAllCouncil(proposal: any) {
    return await usingPlaygrounds(async (helper) => {
      expect((await helper.finCouncil.membership.getMembers()).length).to.be.equal(3);
      const proposeResult = await helper.finCouncil.collective.propose(
        finCounselors.ildar,
        proposal,
        moreThanHalfCouncilThreshold,
      );

      const councilProposedEvent = Event.Council.Proposed.expect(proposeResult);
      const proposalIndex = councilProposedEvent.proposalIndex;
      const proposalHash = councilProposedEvent.proposalHash;

      await helper.finCouncil.collective.vote(finCounselors.greg, proposalHash, proposalIndex, true);
      await helper.finCouncil.collective.vote(finCounselors.ildar, proposalHash, proposalIndex, true);
      await helper.finCouncil.collective.vote(finCounselors.andrey, proposalHash, proposalIndex, true);

      return await helper.finCouncil.collective.close(finCounselors.andrey, proposalHash, proposalIndex);
    });
  }


  itSub.only('FinCouncil can\'t fast-track Democracy proposals', async ({helper}) => {
    const preimageHash = await helper.preimage.notePreimageFromCall(sudoer, dummyProposalCall(helper), true);
    await helper.wait.parachainBlockMultiplesOf(35n);

    await helper.getSudo().democracy.externalProposeDefaultWithPreimage(sudoer, preimageHash);

    const fastTrackProposal = await proposalFromAllCouncil(helper.democracy.fastTrackCall(preimageHash, democracyFastTrackVotingPeriod, 0));
    Event.Democracy.Started.expect(fastTrackProposal);
  });
});
