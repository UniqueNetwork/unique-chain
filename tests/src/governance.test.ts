import {IKeyringPair} from '@polkadot/types/types/interfaces';
import {usingPlaygrounds, itSub, expect, Pallets, requirePalletsOrSkip} from './util';


describe('Governance: Council tests', () => {
  let superuser: IKeyringPair;
  let alex: IKeyringPair;
  let ildar: IKeyringPair;
  let charu: IKeyringPair;
  let filip: IKeyringPair;
  let irina: IKeyringPair;
  let donor: IKeyringPair;
  let preImageHash: string;

  before(async function() {
    await usingPlaygrounds(async (helper, privateKey) => {
      requirePalletsOrSkip(this, helper, [Pallets.Council]);
      superuser = await privateKey('//Alice');
      donor = await privateKey({url: import.meta.url});
      [alex, ildar, charu, filip, irina] = await helper.arrange.createAccounts([10_000n, 10_000n, 10_000n, 10_000n, 10_000n], donor);
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
      const proposalCall = await helper.constructApiCall('api.tx.balances.forceSetBalance', [donor.address, 20n * 10n ** 25n]);
      preImageHash = await helper.preimage.notePreimageFromCall(superuser, proposalCall, true);
    });
  });

  after(async () => {
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
      await helper.preimage.unnotePreimage(superuser, preImageHash);
    });
  });

  itSub.skip('3/4 of Council can externally propose SuperMajorityAgainst', async ({helper}) => {

  });

  itSub.skip('1/2 of Council can externally propose SimpleMajority', async ({helper}) => {

  });

  itSub.skip('1/3 of Council can externally propose SuperMajorityApprove', async ({helper}) => {

  });

  itSub.skip('Council prime member vote is the default', async ({helper}) => {

  });

  itSub.skip('Superuser can add a member', async ({helper}) => {

  });

  itSub.skip('Superuser can remove a member', async ({helper}) => {

  });

  itSub.skip('Council can add Council member', async ({helper}) => {

  });

  itSub.skip('Council can remove Council member', async ({helper}) => {

  });

  itSub.skip('Council can add TechComm member', async ({helper}) => {

  });

  itSub.skip('Council can remove TechComm member', async ({helper}) => {

  });

  itSub.skip('Council member can add Fellowship member', async ({helper}) => {

  });

  itSub.skip('Council can promote Fellowship member', async ({helper}) => {

  });

  itSub.skip('Council can demote Fellowship member', async ({helper}) => {

  });

  itSub.skip('[Negative] Less than 3/4 of Council cannot externally propose SuperMajorityAgainst', async ({helper}) => {

  });

  itSub.skip('[Negative] Less than 1/2 of Council cannot externally propose SimpleMajority', async ({helper}) => {

  });

  itSub.skip('[Negative] Less than 1/3 of Council cannot externally propose SuperMajorityApprove', async ({helper}) => {

  });

  itSub.skip('[Negative] Council member cannot externally propose SuperMajorityAgainst', async ({helper}) => {

  });

  itSub.skip('[Negative] Council member cannot externally propose SimpleMajority', async ({helper}) => {

  });

  itSub.skip('[Negative] Council member cannot externally propose SuperMajorityApprove', async ({helper}) => {

  });

  itSub.skip('[Negative] Cannot add a duplicate Council member', async ({helper}) => {

  });

  itSub.skip('[Negative] Cannot add a duplicate TechComm member', async ({helper}) => {

  });

  itSub.skip('[Negative] Cannot add a duplicate Fellowship member', async ({helper}) => {

  });

  itSub.skip('[Negative] Council member cannot add/remove a Council member', async ({helper}) => {

  });

  itSub.skip('[Negative] Council cannot set Council prime member', async ({helper}) => {

  });

  itSub.skip('[Negative] Council member cannot set Council prime member', async ({helper}) => {

  });

  itSub.skip('[Negative] Council member cannot add/remove a TechComm member', async ({helper}) => {

  });

  itSub.skip('[Negative] Council member cannot add/remove a Fellowship member', async ({helper}) => {

  });

  itSub.skip('[Negative] Council member cannot promote/demote a Fellowship member', async ({helper}) => {

  });

  itSub.skip('[Negative] Council cannot fast-track Democracy proposals', async ({helper}) => {

  });

  itSub.skip('[Negative] Council member cannot fast-track Democracy proposals', async ({helper}) => {

  });

  itSub.skip('[Negative] Council cannot cancel approved Democracy proposals', async ({helper}) => {

  });

  itSub.skip('[Negative] Council cannot cancel ongoing Democracy referendums', async ({helper}) => {

  });

  itSub.skip('[Negative] Council cannot cancel queued Democracy proposals', async ({helper}) => {

  });

  itSub.skip('[Negative] Council cannot cancel Fellowship referendums', async ({helper}) => {

  });

  itSub.skip('[Negative] Council member cannot cancel approved Democracy proposals', async ({helper}) => {

  });

  itSub.skip('[Negative] Council member cannot cancel ongoing Democracy referendums', async ({helper}) => {

  });

  itSub.skip('[Negative] Council member cannot cancel queued Democracy proposals', async ({helper}) => {

  });

  itSub.skip('[Negative] Council member cannot cancel Fellowship referendums', async ({helper}) => {

  });

  itSub.skip('[Negative] Council referendum cannot be closed until the voting threshold is met', async ({helper}) => {

  });

  itSub.skip('[Negative] Council member cannot propose an existing Council proposal', async ({helper}) => {

  });

  itSub.skip('[Negative] Council non-member cannot propose', async ({helper}) => {

  });

  itSub.skip('[Negative] Council non-member cannot vote', async ({helper}) => {

  });
});

describe('Governance: Technical Committee tests', () => {
  let superuser: IKeyringPair;
  let greg: IKeyringPair;
  let andy: IKeyringPair;
  let constantine: IKeyringPair;
  let donor: IKeyringPair;
  let preImageHash: string;

  before(async function() {
    await usingPlaygrounds(async (helper, privateKey) => {
      requirePalletsOrSkip(this, helper, [Pallets.TechnicalCommittee]);
      superuser = await privateKey('//Alice');
      donor = await privateKey({url: import.meta.url});
      [greg, andy, constantine] = await helper.arrange.createAccounts([10_000n, 10_000n, 10_000n], donor);
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
      const proposalCall = await helper.constructApiCall('api.tx.balances.forceSetBalance', [donor.address, 20n * 10n ** 25n]);
      preImageHash = await helper.preimage.notePreimageFromCall(superuser, proposalCall, true);
    });
  });

  after(async () => {
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
      await helper.preimage.unnotePreimage(superuser, preImageHash);
    });
  });

  itSub.skip('TechComm can fast-track Democracy proposals', async ({helper}) => {
  });

  itSub.skip('TechComm can cancel approved Democracy proposals', async ({helper}) => {

  });

  itSub.skip('TechComm can cancel ongoing Democracy referendums', async ({helper}) => {

  });

  itSub.skip('TechComm can cancel queued Democracy proposals', async ({helper}) => {

  });

  itSub.skip('TechComm can blacklist Democracy proposals', async ({helper}) => {

  });

  itSub.skip('TechComm member can veto Democracy proposals', async ({helper}) => {

  });

  itSub.skip('TechComm can cancel Fellowship referendums', async ({helper}) => {

  });

  itSub.skip('TechComm member can add a Fellowship member', async ({helper}) => {

  });

  itSub.skip('[Negative] TechComm cannot externally propose SuperMajorityAgainst', async ({helper}) => {

  });

  itSub.skip('[Negative] TechComm cannot externally propose SimpleMajority', async ({helper}) => {

  });

  itSub.skip('[Negative] TechComm cannot externally propose SuperMajorityApprove', async ({helper}) => {

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

  itSub.skip('[Negative] TechComm cannot set Council prime member', async ({helper}) => {

  });

  itSub.skip('[Negative] TechComm member cannot set Council prime member', async ({helper}) => {

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

  itSub.skip('[Negative] TechComm member cannot cancel approved Democracy proposals', async ({helper}) => {

  });

  itSub.skip('[Negative] TechComm member cannot cancel ongoing Democracy referendums', async ({helper}) => {

  });

  itSub.skip('[Negative] TechComm member cannot cancel queued Democracy proposals', async ({helper}) => {

  });

  itSub.skip('[Negative] TechComm member cannot blacklist Democracy proposals', async ({helper}) => {

  });

  itSub.skip('[Negative] TechComm member cannot veto Democracy proposals until the cool-off period pass', async ({helper}) => {

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

describe('Governance: Fellowship tests', () => {
  before(async function() {
    await usingPlaygrounds(async (helper) => {
      requirePalletsOrSkip(this, helper, [Pallets.Fellowship]);
    });
  });

  itSub.skip('FellowshipDemocracyProposal can submit regular Democracy proposals', async (helper) => {

  });

  itSub.skip('Fellowship (rank-1  or greater) member can submit Fellowship proposals on the Democracy track', async (helper) => {

  });

  itSub.skip('Fellowship (rank-3 or greater) members can vote on the Democracy track', async (helper) => {

  });

  itSub.skip('Fellowship rank vote strength is correct', async (helper) => {

  });

  itSub.skip('[Negative] FellowshipDemocracyProposal cannot externally propose SuperMajorityAgainst', async (helper) => {

  });

  itSub.skip('[Negative] FellowshipDemocracyProposal cannot externally propose SimpleMajority', async (helper) => {

  });

  itSub.skip('[Negative] FellowshipDemocracyProposal cannot externally propose SuperMajorityApprove', async (helper) => {

  });

  itSub.skip('[Negative] Fellowship (rank-0) member cannot submit Fellowship proposals on the Democracy track', async (helper) => {

  });

  itSub.skip('[Negative] Fellowship (rank-1 or greater) member cannot submit if no deposit can be provided', async (helper) => {

  });

  itSub.skip('[Negative] Fellowship (rank-2 or less) members cannot vote on the Democracy track', async (helper) => {

  });

  itSub.skip('[Negative] FellowshipDemocracyProposal cannot add/remove a Council member', async (helper) => {

  });

  itSub.skip('[Negative] FellowshipDemocracyProposal cannot set Council prime member', async (helper) => {

  });

  itSub.skip('[Negative] FellowshipDemocracyProposal member cannot set Council prime member', async (helper) => {

  });

  itSub.skip('[Negative] FellowshipDemocracyProposal cannot add/remove a TechComm member', async (helper) => {

  });

  itSub.skip('[Negative] FellowshipDemocracyProposal cannot add/remove a Fellowship member', async (helper) => {

  });

  itSub.skip('[Negative] FellowshipDemocracyProposal cannot promote/demote a Fellowship member', async (helper) => {

  });

  itSub.skip('[Negative] FellowshipDemocracyProposal cannot fast-track Democracy proposals', async (helper) => {

  });

  itSub.skip('[Negative] FellowshipDemocracyProposal cannot cancel approved Democracy proposals', async (helper) => {

  });

  itSub.skip('[Negative] FellowshipDemocracyProposal cannot cancel ongoing Democracy referendums', async (helper) => {

  });

  itSub.skip('[Negative] FellowshipDemocracyProposal cannot cancel queued Democracy proposals', async (helper) => {

  });

  itSub.skip('[Negative] FellowshipDemocracyProposal cannot blacklist Democracy proposals', async (helper) => {

  });

  itSub.skip('[Negative] FellowshipDemocracyProposal cannot veto Democracy proposals', async (helper) => {

  });
});

describe('Governance: Democracy tests', () => {
  before(async function() {
    await usingPlaygrounds(async (helper) => {
      requirePalletsOrSkip(this, helper, [Pallets.Democracy]);
    });
  });

  itSub.skip('Regular user can vote', async () => {

  });

  itSub.skip('[Negative] Regular user cannot submit regular proposal', async () => {

  });

  itSub.skip('[Negative] Regular user cannot externally propose SuperMajorityAgainst', async (helper) => {

  });

  itSub.skip('[Negative] Regular user cannot externally propose SimpleMajority', async (helper) => {

  });

  itSub.skip('[Negative] Regular user cannot externally propose SuperMajorityApprove', async (helper) => {

  });
});
