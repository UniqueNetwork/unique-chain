import {IKeyringPair} from '@polkadot/types/types';
import {usingPlaygrounds, itSub, expect, Pallets, requirePalletsOrSkip, describeGov} from '../util';
import {Event} from '../util/playgrounds/unique.dev';
import {ICounselors, democracyLaunchPeriod, democracyVotingPeriod, ITechComms, democracyEnactmentPeriod, clearCouncil, clearTechComm} from './util';

describeGov('Governance: Initialization', () => {
  let donor: IKeyringPair;
  let sudoer: IKeyringPair;
  let counselors: ICounselors;
  let techcomms: ITechComms;

  before(async function() {
    await usingPlaygrounds(async (helper, privateKey) => {
      requirePalletsOrSkip(this, helper, [Pallets.Democracy, Pallets.Council, Pallets.TechnicalCommittee]);

      const councilMembers = await helper.council.membership.getMembers();
      const techcommMembers = await helper.technicalCommittee.membership.getMembers();
      expect(councilMembers.length == 0, 'The Council must be empty before the Gov Init');
      expect(techcommMembers.length == 0, 'The Technical Commettee must be empty before the Gov Init');

      donor = await privateKey({url: import.meta.url});
      sudoer = await privateKey('//Alice');

      const [alex, ildar, charu, filip, irina] = await helper.arrange.createAccounts([10_000n, 10_000n, 10_000n, 10_000n, 10_000n], donor);
      counselors = {
        alex,
        ildar,
        charu,
        filip,
        irina,
      };

      const [greg, andy, constantine] = await helper.arrange.createAccounts([10_000n, 10_000n, 10_000n], donor);
      techcomms = {
        greg,
        andy,
        constantine,
      };
    });
  });

  itSub('Initialize Governance', async ({helper}) => {
    console.log('\t- Setup the Prime of the Council via sudo');
    await helper.getSudo().utility.batchAll(sudoer, [
      helper.council.membership.addMemberCall(counselors.alex.address),
      helper.council.membership.setPrimeCall(counselors.alex.address),
    ]);

    let councilMembers = await helper.council.membership.getMembers();
    const councilPrime = await helper.council.collective.getPrimeMember();
    expect(councilMembers).to.be.deep.equal([counselors.alex.address]);
    expect(councilPrime).to.be.equal(counselors.alex.address);

    console.log('\t- The Council Prime initializes the Technical Commettee');
    const councilProposalThreshold = 1;

    await helper.council.collective.propose(
      counselors.alex,
      helper.utility.batchAllCall([
        helper.technicalCommittee.membership.addMemberCall(techcomms.greg.address),
        helper.technicalCommittee.membership.addMemberCall(techcomms.andy.address),
        helper.technicalCommittee.membership.addMemberCall(techcomms.constantine.address),

        helper.technicalCommittee.membership.setPrimeCall(techcomms.greg.address),
      ]),
      councilProposalThreshold,
    );

    const techCommMembers = await helper.technicalCommittee.membership.getMembers();
    const techCommPrime = await helper.technicalCommittee.membership.getPrimeMember();
    const expectedTechComms = [techcomms.greg.address, techcomms.andy.address, techcomms.constantine.address];
    expect(techCommMembers.length).to.be.equal(expectedTechComms.length);
    expect(techCommMembers).to.containSubset(expectedTechComms);
    expect(techCommPrime).to.be.equal(techcomms.greg.address);

    console.log('\t- The Council Prime initiates a referendum to add counselors');
    const returnPreimageHash = true;
    const preimageHash = await helper.preimage.notePreimageFromCall(counselors.alex, helper.utility.batchAllCall([
      helper.council.membership.addMemberCall(counselors.ildar.address),
      helper.council.membership.addMemberCall(counselors.charu.address),
      helper.council.membership.addMemberCall(counselors.filip.address),
      helper.council.membership.addMemberCall(counselors.irina.address),
    ]), returnPreimageHash);

    await helper.council.collective.propose(
      counselors.alex,
      helper.democracy.externalProposeDefaultWithPreimageCall(preimageHash),
      councilProposalThreshold,
    );

    console.log('\t- The referendum is being decided');
    const startedEvent = await helper.wait.expectEvent(democracyLaunchPeriod, Event.Democracy.Started);

    await helper.democracy.vote(counselors.filip, startedEvent.referendumIndex, {
      Standard: {
        vote: {
          aye: true,
          conviction: 1,
        },
        balance: 10_000n,
      },
    });

    const passedReferendumEvent = await helper.wait.expectEvent(democracyVotingPeriod, Event.Democracy.Passed);
    expect(passedReferendumEvent.referendumIndex).to.be.equal(startedEvent.referendumIndex);

    await helper.wait.expectEvent(democracyEnactmentPeriod, Event.Scheduler.Dispatched);

    councilMembers = await helper.council.membership.getMembers();
    const expectedCounselors = [
      counselors.alex.address,
      counselors.ildar.address,
      counselors.charu.address,
      counselors.filip.address,
      counselors.irina.address,
    ];
    expect(councilMembers.length).to.be.equal(expectedCounselors.length);
    expect(councilMembers).to.containSubset(expectedCounselors);
  });

  after(async function() {
    await clearTechComm(sudoer);
    await clearCouncil(sudoer);
  });
});
