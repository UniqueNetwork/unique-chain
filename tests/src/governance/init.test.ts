import {IKeyringPair} from '@polkadot/types/types';
import {usingPlaygrounds, itSub, expect, Pallets, requirePalletsOrSkip, describeGov} from '../util';
import {ICounselors, democracyLaunchPeriod, democracyVotingPeriod, ITechComms, democracyEnactmentPeriod, clearCouncil, clearTechComm, clearFellowship} from './util';

describeGov('Governance: Initialization', () => {
  let donor: IKeyringPair;
  let sudoer: IKeyringPair;
  let counselors: ICounselors;
  let techcomms: ITechComms;
  let coreDevs: any;

  const expectedAlexFellowRank = 7;
  const expectedFellowRank = 6;

  before(async function() {
    await usingPlaygrounds(async (helper, privateKey) => {
      requirePalletsOrSkip(this, helper, [Pallets.Democracy, Pallets.Council, Pallets.TechnicalCommittee]);

      const councilMembers = await helper.council.membership.getMembers();
      const techcommMembers = await helper.technicalCommittee.membership.getMembers();
      expect(councilMembers?.length == 0, 'The Council must be empty before the Gov Init');
      expect(techcommMembers?.length == 0, 'The Technical Commettee must be empty before the Gov Init');

      donor = await privateKey({url: import.meta.url});
      sudoer = await privateKey('//Alice');

      const counselorsNum = 5;
      const techCommsNum = 3;
      const coreDevsNum = 2;
      const [
        alex,
        ildar,
        charu,
        filip,
        irina,

        greg,
        andy,
        constantine,

        yaroslav,
        daniel,
      ] = await helper.arrange.createAccounts(new Array(counselorsNum + techCommsNum + coreDevsNum).fill(10_000n), donor);

      counselors = {
        alex,
        ildar,
        charu,
        filip,
        irina,
      };

      techcomms = {
        greg,
        andy,
        constantine,
      };

      coreDevs = {
        yaroslav: yaroslav,
        daniel: daniel,
      };
    });
  });

  itSub('Initialize Governance', async ({helper}) => {
    const promoteFellow = (fellow: string, promotionsNum: number) => new Array(promotionsNum).fill(helper.fellowship.collective.promoteCall(fellow));

    const expectFellowRank = async (fellow: string, expectedRank: number) => {
      expect(await helper.fellowship.collective.getMemberRank(fellow)).to.be.equal(expectedRank);
    };

    console.log('\t- Setup the Prime of the Council via sudo');
    await helper.getSudo().utility.batchAll(sudoer, [
      helper.council.membership.addMemberCall(counselors.alex.address),
      helper.council.membership.setPrimeCall(counselors.alex.address),

      helper.fellowship.collective.addMemberCall(counselors.alex.address),
      ...promoteFellow(counselors.alex.address, expectedAlexFellowRank),
    ]);

    let councilMembers = await helper.council.membership.getMembers();
    const councilPrime = await helper.council.collective.getPrimeMember();
    const alexFellowRank = await helper.fellowship.collective.getMemberRank(counselors.alex.address);
    expect(councilMembers).to.be.deep.equal([counselors.alex.address]);
    expect(councilPrime).to.be.equal(counselors.alex.address);
    expect(alexFellowRank).to.be.equal(expectedAlexFellowRank);

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
    expect(techCommMembers?.length).to.be.equal(expectedTechComms.length);
    expect(techCommMembers).to.containSubset(expectedTechComms);
    expect(techCommPrime).to.be.equal(techcomms.greg.address);

    console.log('\t- The Council Prime initiates a referendum to add counselors');
    const preimageHash = await helper.preimage.notePreimageFromCall(counselors.alex, helper.utility.batchAllCall([
      helper.council.membership.addMemberCall(counselors.ildar.address),
      helper.council.membership.addMemberCall(counselors.charu.address),
      helper.council.membership.addMemberCall(counselors.filip.address),
      helper.council.membership.addMemberCall(counselors.irina.address),

      helper.fellowship.collective.addMemberCall(counselors.charu.address),
      helper.fellowship.collective.addMemberCall(counselors.ildar.address),
      helper.fellowship.collective.addMemberCall(counselors.irina.address),
      helper.fellowship.collective.addMemberCall(counselors.filip.address),
      helper.fellowship.collective.addMemberCall(techcomms.greg.address),
      helper.fellowship.collective.addMemberCall(techcomms.andy.address),
      helper.fellowship.collective.addMemberCall(techcomms.constantine.address),
      helper.fellowship.collective.addMemberCall(coreDevs.yaroslav.address),
      helper.fellowship.collective.addMemberCall(coreDevs.daniel.address),

      ...promoteFellow(counselors.charu.address, expectedFellowRank),
      ...promoteFellow(counselors.ildar.address, expectedFellowRank),
      ...promoteFellow(counselors.irina.address, expectedFellowRank),
      ...promoteFellow(counselors.filip.address, expectedFellowRank),
      ...promoteFellow(techcomms.greg.address, expectedFellowRank),
      ...promoteFellow(techcomms.andy.address, expectedFellowRank),
      ...promoteFellow(techcomms.constantine.address, expectedFellowRank),
      ...promoteFellow(coreDevs.yaroslav.address, expectedFellowRank),
      ...promoteFellow(coreDevs.daniel.address, expectedFellowRank),
    ]));

    await helper.council.collective.propose(
      counselors.alex,
      helper.democracy.externalProposeDefaultWithPreimageCall(preimageHash),
      councilProposalThreshold,
    );

    console.log('\t- The referendum is being decided');
    const startedEvent = await helper.wait.expectEvent(democracyLaunchPeriod, helper.api!.events.democracy.Started);

    await helper.democracy.vote(counselors.filip, startedEvent.refIndex.toNumber(), {
      Standard: {
        vote: {
          aye: true,
          conviction: 1,
        },
        balance: 10_000n,
      },
    });

    const passedReferendumEvent = await helper.wait.expectEvent(democracyVotingPeriod, helper.api!.events.democracy.Passed);
    expect(passedReferendumEvent.refIndex.toNumber()).to.be.equal(startedEvent.refIndex.toNumber());

    await helper.wait.expectEvent(democracyEnactmentPeriod, helper.api!.events.scheduler.Dispatched);

    councilMembers = await helper.council.membership.getMembers();
    const expectedCounselors = [
      counselors.alex.address,
      counselors.ildar.address,
      counselors.charu.address,
      counselors.filip.address,
      counselors.irina.address,
    ];
    expect(councilMembers?.length).to.be.equal(expectedCounselors.length);
    expect(councilMembers).to.containSubset(expectedCounselors);

    await expectFellowRank(counselors.ildar.address, expectedFellowRank);
    await expectFellowRank(counselors.charu.address, expectedFellowRank);
    await expectFellowRank(counselors.filip.address, expectedFellowRank);
    await expectFellowRank(counselors.irina.address, expectedFellowRank);
    await expectFellowRank(techcomms.greg.address, expectedFellowRank);
    await expectFellowRank(techcomms.andy.address, expectedFellowRank);
    await expectFellowRank(techcomms.constantine.address, expectedFellowRank);
    await expectFellowRank(coreDevs.yaroslav.address, expectedFellowRank);
    await expectFellowRank(coreDevs.daniel.address, expectedFellowRank);
  });

  after(async function() {
    await clearFellowship(sudoer);
    await clearTechComm(sudoer);
    await clearCouncil(sudoer);
  });
});
