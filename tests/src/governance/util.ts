import {IKeyringPair} from '@polkadot/types/types';
import {usingPlaygrounds, itSub, expect, Pallets, requirePalletsOrSkip} from '../util';
import {DevUniqueHelper, Event} from '../util/playgrounds/unique.dev';
import {UniqueHelper} from '../util/playgrounds/unique';

export const democracyLaunchPeriod = 35;
export const democracyVotingPeriod = 35;
export const councilMotionDuration = 35;
export const democracyEnactmentPeriod = 40;
export const democracyFastTrackVotingPeriod = 5;

export const fellowshipRankLimit = 7;
export const fellowshipPropositionOrigin = 'FellowshipProposition';
export const defaultEnactmentMoment = {After: 0};

export interface ICounselors {
  alex: IKeyringPair;
  ildar: IKeyringPair;
  charu: IKeyringPair;
  filip: IKeyringPair;
  irina: IKeyringPair;
}
export interface ITechComms {
    greg: IKeyringPair;
    andy: IKeyringPair;
    constantine: IKeyringPair;
}

export async function initCouncil() {
  let counselors: IKeyringPair[] = [];

  await usingPlaygrounds(async (helper, privateKey) => {
    const superuser = await privateKey('//Alice');
    const donor = await privateKey('//Alice');

    const [alex, ildar, charu, filip, irina] = await helper.arrange.createAccounts([10_000n, 10_000n, 10_000n, 10_000n, 10_000n], donor);
    const sudo = helper.getSudo();
    {
      const members = (await helper.callRpc('api.query.councilMembership.members')).toJSON();
      expect(members).to.be.deep.equal([]);
    }
    const expectedMembers = [alex, ildar, charu, filip, irina];
    for(const member of expectedMembers) {
      await sudo.executeExtrinsic(superuser, 'api.tx.councilMembership.addMember', [member.address]);
    }
    await sudo.executeExtrinsic(superuser, 'api.tx.councilMembership.setPrime', [alex.address]);
    {
      const members = (await helper.callRpc('api.query.councilMembership.members')).toJSON();
      expect(members).to.containSubset(expectedMembers.map((x: IKeyringPair) => x.address));
      expect(members.length).to.be.equal(expectedMembers.length);
    }

    counselors = [alex, ildar, charu, filip, irina];
  });

  return {
    alex: counselors[0],
    ildar: counselors[1],
    charu: counselors[2],
    filip: counselors[3],
    irina: counselors[4],
  };
}

export async function clearCouncil() {
  await usingPlaygrounds(async (helper, privateKey) => {
    const superuser = await privateKey('//Alice');

    let members = (await helper.callRpc('api.query.councilMembership.members')).toJSON();
    if(members.length) {
      const sudo = helper.getSudo();
      for(const address of members) {
        await sudo.executeExtrinsic(superuser, 'api.tx.councilMembership.removeMember', [address]);
      }
      members = (await helper.callRpc('api.query.councilMembership.members')).toJSON();
    }
    expect(members).to.be.deep.equal([]);
  });
}



export async function initTechComm() {
  let techcomms: IKeyringPair[] = [];

  await usingPlaygrounds(async (helper, privateKey) => {
    const superuser = await privateKey('//Alice');
    const  donor = await privateKey('//Alice');
    const [greg, andy, constantine] = await helper.arrange.createAccounts([10_000n, 10_000n, 10_000n], donor);
    const sudo = helper.getSudo();
    {
      const members = (await helper.callRpc('api.query.technicalCommitteeMembership.members')).toJSON();
      expect(members).to.be.deep.equal([]);
    }
    await sudo.executeExtrinsic(superuser, 'api.tx.technicalCommitteeMembership.addMember', [greg.address]);
    await sudo.executeExtrinsic(superuser, 'api.tx.technicalCommitteeMembership.addMember', [andy.address]);
    await sudo.executeExtrinsic(superuser, 'api.tx.technicalCommitteeMembership.addMember', [constantine.address]);
    await sudo.executeExtrinsic(superuser, 'api.tx.technicalCommitteeMembership.setPrime', [greg.address]);
    {
      const members = (await helper.callRpc('api.query.technicalCommitteeMembership.members')).toJSON();
      expect(members).to.containSubset([greg.address, andy.address, constantine.address]);
      expect(members.length).to.be.equal(3);
    }

    techcomms = [greg, andy, constantine];
  });

  return {
    greg: techcomms[0],
    andy: techcomms[1],
    constantine: techcomms[2],
  };
}

export async function clearTechComm() {
  await usingPlaygrounds(async (helper, privateKey) => {
    const superuser = await privateKey('//Alice');

    let members = (await helper.callRpc('api.query.technicalCommitteeMembership.members')).toJSON();
    if(members.length) {
      const sudo = helper.getSudo();
      for(const address of members) {
        await sudo.executeExtrinsic(superuser, 'api.tx.technicalCommitteeMembership.removeMember', [address]);
      }
      members = (await helper.callRpc('api.query.technicalCommitteeMembership.members')).toJSON();
    }
    expect(members).to.be.deep.equal([]);
  });
}

export async function initFellowship() {
  const numMembersInRank = 3;
  const memberBalance = 5000n;
  const members: IKeyringPair[][] = [];

  await usingPlaygrounds(async (helper, privateKey) => {
    const sudoer = await privateKey('//Alice');
    const donor = await privateKey('//Alice');

    for(let i = 0; i < fellowshipRankLimit; i++) {
      const rankMembers = await helper.arrange.createAccounts(
        Array(numMembersInRank).fill(memberBalance),
        donor,
      );

      for(const member of rankMembers) {
        await helper.getSudo().fellowship.collective.addMember(sudoer, member.address);

        for(let rank = 0; rank < i; rank++) {
          await helper.getSudo().fellowship.collective.promote(sudoer, member.address);
        }
      }

      members.push(rankMembers);
    }
  });

  return members;
}

export async function clearFellowship(members: IKeyringPair[][]) {
  await usingPlaygrounds(async (helper, privateKey) => {
    const sudoer = await privateKey('//Alice');

    for(let rank = 0; rank < fellowshipRankLimit; rank++) {
      for(const member of members[rank]) {
        await helper.getSudo().fellowship.collective.removeMember(sudoer, member.address, rank);
      }
    }
  });
}

export async function clearFellowshipRankAgnostic(members: IKeyringPair[][]) {
  await usingPlaygrounds(async (helper, privateKey) => {
    const sudoer = await privateKey('//Alice');

    for(let rank = 0; rank < fellowshipRankLimit; rank++) {
      for(const member of members[rank]) {
        await helper.getSudo().fellowship.collective.removeMember(sudoer, member.address, fellowshipRankLimit);
      }
    }
  });
}


export function dummyProposalCall(helper: UniqueHelper) {
  return helper.constructApiCall('api.tx.system.remark', ['dummy proposal' + new Date()]);
}

export function dummyProposal(helper: UniqueHelper) {
  return {
    Inline: dummyProposalCall(helper).method.toHex(),
  };
}