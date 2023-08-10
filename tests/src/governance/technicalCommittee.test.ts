import {IKeyringPair} from '@polkadot/types/types';
import {usingPlaygrounds, itSub, expect, Pallets, requirePalletsOrSkip} from '../util';
import {DevUniqueHelper, Event} from '../util/playgrounds/unique.dev';
import {UniqueHelper} from '../util/playgrounds/unique';
import {ICounselors, initCouncil, democracyLaunchPeriod, democracyVotingPeriod, democracyEnactmentPeriod, councilMotionDuration, democracyFastTrackVotingPeriod, fellowshipRankLimit, clearCouncil, clearTechComm, ITechComms, clearFellowship, defaultEnactmentMoment, dummyProposal, dummyProposalCall, fellowshipPropositionOrigin, initFellowship, initTechComm} from './util';




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