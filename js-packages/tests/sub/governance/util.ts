import type {IKeyringPair} from '@polkadot/types/types';
import {xxhashAsHex} from '@polkadot/util-crypto';
import type {u32} from '@polkadot/types-codec';
import {usingPlaygrounds, expect} from '../../util/index.js';
import {UniqueHelper} from '@unique/playgrounds/unique.js';
import {DevUniqueHelper} from '@unique/playgrounds/unique.dev.js';

export const democracyLaunchPeriod = 35;
export const democracyVotingPeriod = 35;
export const councilMotionDuration = 35;
export const democracyEnactmentPeriod = 40;
export const democracyFastTrackVotingPeriod = 5;

export const fellowshipRankLimit = 7;
export const fellowshipPropositionOrigin = 'FellowshipProposition';
export const fellowshipPreparePeriod = 3;
export const fellowshipConfirmPeriod = 3;
export const fellowshipMinEnactPeriod = 1;

export const defaultEnactmentMoment = {After: 0};

export const democracyTrackId = 10;
export const democracyTrackMinRank = 3;
const twox128 = (data: any) => xxhashAsHex(data, 128);
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

export async function initCouncil(donor: IKeyringPair, superuser: IKeyringPair) {
  let counselors: IKeyringPair[] = [];

  await usingPlaygrounds(async (helper) => {
    const [alex, ildar, charu, filip, irina] = await helper.arrange.createAccounts([10_000n, 10_000n, 10_000n, 10_000n, 10_000n], donor);
    const sudo = helper.getSudo();
    {
      const members = (await helper.callRpc('api.query.councilMembership.members')).toJSON() as [];
      if(members.length != 0) {
        await clearCouncil(superuser);
      }
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

export async function clearCouncil(superuser: IKeyringPair) {
  await usingPlaygrounds(async (helper) => {
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


export async function initTechComm(donor: IKeyringPair, superuser: IKeyringPair) {
  let techcomms: IKeyringPair[] = [];

  await usingPlaygrounds(async (helper) => {
    const [greg, andy, constantine] = await helper.arrange.createAccounts([10_000n, 10_000n, 10_000n], donor);
    const sudo = helper.getSudo();
    {
      const members = (await helper.callRpc('api.query.technicalCommitteeMembership.members')).toJSON() as [];
      if(members.length != 0) {
        await clearTechComm(superuser);
      }
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

export async function clearTechComm(superuser: IKeyringPair) {
  await usingPlaygrounds(async (helper) => {
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

export async function initFellowship(donor: IKeyringPair, sudoer: IKeyringPair) {
  const numMembersInRank = 3;
  const memberBalance = 5000n;
  const members: IKeyringPair[][] = [];

  await usingPlaygrounds(async (helper) => {
    const currentFellows = await helper.getApi().query.fellowshipCollective.members.keys();

    if(currentFellows.length != 0) {
      await clearFellowship(sudoer);
    }
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

export async function clearFellowship(sudoer: IKeyringPair) {
  await usingPlaygrounds(async (helper) => {
    const fellowship = (await helper.getApi().query.fellowshipCollective.members.keys())
      .map((key) => key.args[0].toString());
    for(const  member of fellowship) {
      await helper.getSudo().fellowship.collective.removeMember(sudoer, member, fellowshipRankLimit);
    }
  });
}

export async function clearFellowshipReferenda(sudoer: IKeyringPair) {
  await usingPlaygrounds(async (helper) => {
    const proposalsCount = (await helper.getApi().query.fellowshipReferenda.referendumCount()) as u32;
    for(let i = 0; i < proposalsCount.toNumber(); i++) {
      await helper.getSudo().fellowship.referenda.cancel(sudoer, i);
    }
  });
}

export async function hardResetFellowshipReferenda(sudoer: IKeyringPair) {
  await usingPlaygrounds(async (helper) => {
    const api = helper.getApi();
    const prefix = twox128('FellowshipReferenda');
    await helper.signTransaction(sudoer, api.tx.sudo.sudo(api.tx.system.killPrefix(prefix, 100)));
  });
}

export async function hardResetDemocracy(sudoer: IKeyringPair) {
  await usingPlaygrounds(async (helper) => {
    const api = helper.getApi();
    const prefix = twox128('Democracy');
    await helper.signTransaction(sudoer, api.tx.sudo.sudo(api.tx.system.killPrefix(prefix, 100)));
  });
}

export async function hardResetGovScheduler(sudoer: IKeyringPair) {
  await usingPlaygrounds(async (helper) => {
    const api = helper.getApi();
    const prefix = twox128('GovScheduler');
    await helper.signTransaction(sudoer, api.tx.sudo.sudo(api.tx.system.killPrefix(prefix, 500)));
  });
}

export async function voteUnanimouslyInFellowship(helper: DevUniqueHelper, fellows: IKeyringPair[][], minRank: number, referendumIndex: number) {
  for(let rank = minRank; rank < fellowshipRankLimit; rank++) {
    for(const member of fellows[rank]) {
      await helper.fellowship.collective.vote(member, referendumIndex, true);
    }
  }
}

export function dummyProposalCall(helper: UniqueHelper) {
  return helper.constructApiCall('api.tx.system.remark', ['dummy proposal' + (new Date()).getTime()]);
}

export function dummyProposal(helper: UniqueHelper) {
  return {
    Inline: dummyProposalCall(helper).method.toHex(),
  };
}
