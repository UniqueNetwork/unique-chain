import type {IKeyringPair} from '@polkadot/types/types';
import {usingPlaygrounds, itSub, expect, Pallets, requirePalletsOrSkip, describeGov} from '../../util/index.js';
import {Event} from '@unique/playgrounds/unique.dev.js';
import {initCouncil, democracyLaunchPeriod, democracyVotingPeriod, democracyEnactmentPeriod, clearCouncil, clearTechComm, initTechComm, ITechComms} from './util.js';
import type {ICounselors} from './util.js';

describeGov('Governance: Elect Sudo', () => {
  let sudoer: IKeyringPair;
  let donor: IKeyringPair;
  let counselors: ICounselors;
  let techComm: ITechComms;

  const moreThanHalfCouncilThreshold = 3;

  before(async function() {
    await usingPlaygrounds(async (helper, privateKey) => {
      requirePalletsOrSkip(this, helper, [Pallets.Council]);

      sudoer = await privateKey('//Alice');
      donor = await privateKey({url: import.meta.url});
      counselors = await initCouncil(donor, sudoer);
      techComm = await initTechComm(donor, sudoer);
    });
  });

  after(async () => {
    await clearCouncil(sudoer);
    await clearTechComm(sudoer);
  });

  itSub('Democracy can elect a sudo account', async ({helper}) => {
    const [newAccount] = await helper.arrange.createAccounts([1000n], donor);
    const newSudoKey = newAccount.address;

    // Have to use `afterEach` here instead of `after` to ensure it will be executed before `describe.after`.
    afterEach(async () => {
      // For some reason, the outer helper API is not initialized inside `afterEach`.
      await usingPlaygrounds(async (helper) => {
        await helper.executeExtrinsic(
          newAccount,
          'api.tx.sudo.setKey',
          [sudoer.address],
          false,
        );
      });
    });

    const democracyProposal = helper.constructApiCall('api.tx.utility.dispatchAs', [
      {
        system: {
          Signed: sudoer.address,
        },
      },
      helper.constructApiCall('api.tx.sudo.setKey', [newSudoKey]),
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

    await helper.democracy.vote(newAccount, democracyReferendumIndex, {
      Standard: {
        vote: {
          aye: true,
          conviction: 1,
        },
        balance: 800n,
      },
    });

    const passedReferendumEvent = await helper.wait.expectEvent(democracyVotingPeriod, Event.Democracy.Passed);
    expect(passedReferendumEvent.referendumIndex).to.be.equal(democracyReferendumIndex);

    await helper.wait.expectEvent(democracyEnactmentPeriod, Event.Scheduler.Dispatched);
    const currentSudoKey = await helper.callRpc('api.query.sudo.key', [])
      .then(k => k.toString());
    expect(currentSudoKey).to.be.equal(newSudoKey);
  });
});
