import {IKeyringPair} from '@polkadot/types/types';
import {usingPlaygrounds, itSub, expect, Pallets, requirePalletsOrSkip} from '../util';
import {DevUniqueHelper, Event} from '../util/playgrounds/unique.dev';
import {UniqueHelper} from '../util/playgrounds/unique';
import {ICounselors, initCouncil, democracyLaunchPeriod, democracyVotingPeriod, democracyEnactmentPeriod, councilMotionDuration, democracyFastTrackVotingPeriod, fellowshipRankLimit, clearCouncil, clearTechComm, ITechComms, clearFellowship, defaultEnactmentMoment, dummyProposal, dummyProposalCall, fellowshipPropositionOrigin, initFellowship, initTechComm} from './util';

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
