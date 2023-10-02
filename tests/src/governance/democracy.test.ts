import {IKeyringPair} from '@polkadot/types/types';
import {usingPlaygrounds, itSub, expect, Pallets, requirePalletsOrSkip, describeGov} from '../util';
import {clearFellowship, democracyLaunchPeriod, democracyTrackMinRank, dummyProposalCall, fellowshipConfirmPeriod, fellowshipMinEnactPeriod, fellowshipPreparePeriod, fellowshipPropositionOrigin, initFellowship, voteUnanimouslyInFellowship} from './util';

describeGov('Governance: Democracy tests', () => {
  let regularUser: IKeyringPair;
  let donor: IKeyringPair;
  let sudoer: IKeyringPair;

  before(async function() {
    await usingPlaygrounds(async (helper, privateKey) => {
      requirePalletsOrSkip(this, helper, [Pallets.Democracy]);

      donor = await privateKey({url: import.meta.url});
      sudoer = await privateKey('//Alice');

      [regularUser] = await helper.arrange.createAccounts([1000n], donor);
    });
  });

  itSub('Regular user can vote', async ({helper}) => {
    const fellows = await initFellowship(donor, sudoer);
    const rank1Proposer = fellows[1][0];

    const democracyProposalCall = dummyProposalCall(helper);
    const fellowshipProposal = {
      Inline: helper.democracy.proposeCall(democracyProposalCall, 0n).method.toHex(),
    };

    const submitResult = await helper.fellowship.referenda.submit(
      rank1Proposer,
      fellowshipPropositionOrigin,
      fellowshipProposal,
      {After: 0},
    );

    const submittedEvent = submitResult.result.events.find(helper.api!.events.fellowshipReferenda.Submitted.is);
    if(!submittedEvent)
      throw Error('Expected event council.Proposed');
    const fellowshipReferendumIndex = submittedEvent.data.index.toNumber();

    await voteUnanimouslyInFellowship(helper, fellows, democracyTrackMinRank, fellowshipReferendumIndex);
    await helper.fellowship.referenda.placeDecisionDeposit(donor, fellowshipReferendumIndex);

    await helper.wait.expectEvent(
      fellowshipPreparePeriod + fellowshipConfirmPeriod + fellowshipMinEnactPeriod,
      helper.api!.events.democracy.Proposed,
    );

    const startedEvent = await helper.wait.expectEvent(democracyLaunchPeriod, helper.api!.events.democracy.Started);
    const referendumIndex = startedEvent.refIndex.toNumber();

    const ayeBalance = 10_000n;

    await helper.democracy.vote(regularUser, referendumIndex, {
      Standard: {
        vote: {
          aye: true,
          conviction: 1,
        },
        balance: ayeBalance,
      },
    });

    const referendumInfo = await helper.democracy.referendumInfo(referendumIndex);
    const tally = 'Ongoing' in referendumInfo! ? referendumInfo.Ongoing.tally : null;

    expect(BigInt(tally!.ayes)).to.be.equal(ayeBalance);

    await clearFellowship(sudoer);
  });

  itSub('[Negative] Regular user cannot submit a regular proposal', async ({helper}) => {
    const submitResult = helper.democracy.propose(regularUser, dummyProposalCall(helper), 0n);
    await expect(submitResult).to.be.rejectedWith(/BadOrigin/);
  });

  itSub('[Negative] Regular user cannot externally propose SuperMajorityAgainst', async ({helper}) => {
    const submitResult = helper.democracy.externalProposeDefault(regularUser, dummyProposalCall(helper));
    await expect(submitResult).to.be.rejectedWith(/BadOrigin/);
  });

  itSub('[Negative] Regular user cannot externally propose SimpleMajority', async ({helper}) => {
    const submitResult = helper.democracy.externalProposeMajority(regularUser, dummyProposalCall(helper));
    await expect(submitResult).to.be.rejectedWith(/BadOrigin/);
  });

  itSub('[Negative] Regular user cannot externally propose SuperMajorityApprove', async ({helper}) => {
    const submitResult = helper.democracy.externalPropose(regularUser, dummyProposalCall(helper));
    await expect(submitResult).to.be.rejectedWith(/BadOrigin/);
  });
});
