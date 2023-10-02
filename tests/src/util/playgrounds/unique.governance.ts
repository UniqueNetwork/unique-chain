import {blake2AsHex} from '@polkadot/util-crypto';
import {PalletDemocracyConviction} from '@polkadot/types/lookup';
import {IEventLike, Observable} from '@polkadot/types/types';
import {TSigner} from './types';
import {HelperGroup, UniqueHelper} from './unique';
import {IsEvent} from '@polkadot/types/metadata/decorate/types';
import {AugmentedEvents} from '@polkadot/api-base/types/events';
import {AugmentedQuery, AugmentedQueries, ApiTypes} from '@polkadot/api/types';


type DataType<T> = T extends IsEvent<infer _R, infer N> ? N : never;

type QueryResult<T> = T extends AugmentedQuery<ApiTypes, (arg: any[]) => Observable<infer R>, any> ? R : boolean;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type M = QueryResult<AugmentedQueries<'promise'>['council']['members']>;

export class CollectiveGroup extends HelperGroup<UniqueHelper> {
  /**
   * Pallet name to make an API call to. Examples: 'council', 'technicalCommittee'
   */
  private collective: 'council' | 'technicalCommittee';

  constructor(helper: UniqueHelper, collective: 'council' | 'technicalCommittee') {
    super(helper);
    this.collective = collective;
  }

  /**
   * Check the result of a proposal execution for the success of the underlying proposed extrinsic.
   * @param events events of the proposal execution
   * @returns proposal hash
   */
  private checkExecutedEvent(events: IEventLike[]): string {
    let executionEventsData: DataType<AugmentedEvents<'promise'>['council']['Executed']>[] = [];
    if(this.collective == 'council')
      executionEventsData = events.filter(this.helper.getApi().events.council.Executed.is).concat(events.filter(this.helper.getApi().events.council.MemberExecuted.is)).map(e => e.data);
    else
      executionEventsData = events.filter(this.helper.getApi().events.technicalCommittee.Executed.is).concat(events.filter(this.helper.getApi().events.technicalCommittee.MemberExecuted.is)).map(e => e.data);

    // const executionEvents = events.filter(x =>
    //   x.event.section === this.collective && (x.event.method === 'Executed' || x.event.method === 'MemberExecuted'));

    if(executionEventsData.length != 1) {
      if(events.filter(this.helper.getApi().events.council.Disapproved.is).length > 0)
      //if(events.filter(x => x.event.section === this.collective && x.event.method === 'Disapproved').length > 0)
        throw new Error(`Disapproved by ${this.collective}`);
      else
        throw new Error(`Expected one 'Executed' or 'MemberExecuted' event for ${this.collective}`);
    }

    const result = executionEventsData[0].result;

    if(result.isErr) {
      if(result.asErr.isModule) {
        const error = result.asErr.asModule;
        const metaError = this.helper.getApi()?.registry.findMetaError(error);
        throw new Error(`Proposal execution failed with ${metaError.section}.${metaError.name}`);
      } else {
        // eslint-disable-next-line no-restricted-syntax
        throw new Error('Proposal execution failed with ' + result.asErr.toHuman());
      }
    }

    return executionEventsData[0].proposalHash.toHex();
  }

  /**
   * Returns an array of members' addresses.
   */
  async getMembers() {
    // const _p: PromiseResult<() => boolean>;
    // const _t: AugmentedQueries<'promise'>['council']['members'];
    // const _e: QueryResult<AugmentedQueries<'promise'>['council']['members']>;
    if(this.collective == 'council')
      return await this.helper.callQuery('api.query.council.members', []);
    else if(this.collective == 'technicalCommittee')
      return await this.helper.callQuery('api.query.technicalCommittee.members', []);
  }

  /**
   * Returns the optional address of the prime member of the collective.
   */
  async getPrimeMember() {
    if(this.collective == 'council')
      return await this.helper.callQuery('api.query.council.prime', []);
    else if(this.collective == 'technicalCommittee')
      return await this.helper.callQuery('api.query.technicalCommittee.prime', []);
  }

  /**
   * Returns an array of proposal hashes that are currently active for this collective.
   */
  async getProposals() {
    if(this.collective == 'council')
      return await this.helper.callQuery('api.query.council.proposals', []);
    else if(this.collective == 'technicalCommittee')
      return await this.helper.callQuery('api.query.technicalCommittee.proposals', []);
  }

  /**
   * Returns the call originally encoded under the specified hash.
   * @param hash h256-encoded proposal
   * @returns the optional call that the proposal hash stands for.
   */
  async getProposalCallOf(hash: string) {
    if(this.collective == 'council')
      return await this.helper.callQuery('api.query.council.proposalOf', [hash]);
    else if(this.collective == 'technicalCommittee')
      return await this.helper.callQuery('api.query.technicalCommittee.proposalOf', [hash]);
  }

  /**
   * Returns the total number of proposals so far.
   */
  async getTotalProposalsCount() {
    if(this.collective == 'council')
      return await this.helper.callQuery('api.query.council.proposalCount', []);
    else if(this.collective == 'technicalCommittee')
      return await this.helper.callQuery('api.query.technicalCommittee.proposalCount', []);
  }

  /**
   * Creates a new proposal up for voting. If the threshold is set to 1, the proposal will be executed immediately.
   * @param signer keyring of the proposer
   * @param proposal constructed call to be executed if the proposal is successful
   * @param voteThreshold minimal number of votes for the proposal to be verified and executed
   * @param lengthBound byte length of the encoded call
   * @returns promise of extrinsic execution and its result
   */
  async propose(signer: TSigner, proposal: any, voteThreshold: number, lengthBound = 10000) {
    return await this.helper.executeExtrinsic(signer, `api.tx.${this.collective}.propose`, [voteThreshold, proposal, lengthBound]);
  }

  /**
   * Casts a vote to either approve or reject a proposal.
   * @param signer keyring of the voter
   * @param proposalHash hash of the proposal to be voted for
   * @param proposalIndex absolute index of the proposal used for absolutely nothing but throwing pointless errors
   * @param approve aye or nay
   * @returns promise of extrinsic execution and its result
   */
  vote(signer: TSigner, proposalHash: string, proposalIndex: number, approve: boolean) {
    return this.helper.executeExtrinsic(signer, `api.tx.${this.collective}.vote`, [proposalHash, proposalIndex, approve]);
  }

  /**
   * Executes a call immediately as a member of the collective. Needed for the Member origin.
   * @param signer keyring of the executor member
   * @param proposal constructed call to be executed by the member
   * @param lengthBound byte length of the encoded call
   * @returns promise of extrinsic execution
   */
  async execute(signer: TSigner, proposal: any, lengthBound = 10000) {
    const result = await this.helper.executeExtrinsic(signer, `api.tx.${this.collective}.execute`, [proposal, lengthBound]);
    this.checkExecutedEvent(result.result.events);
    return result;
  }

  /**
   * Attempt to close and execute a proposal. Note that there must already be enough votes to meet the threshold set when proposing.
   * @param signer keyring of the executor. Can be absolutely anyone.
   * @param proposalHash hash of the proposal to close
   * @param proposalIndex index of the proposal generated on its creation
   * @param weightBound weight of the proposed call. Can be obtained by calling `paymentInfo()` on the call.
   * @param lengthBound byte length of the encoded call
   * @returns promise of extrinsic execution and its result
   */
  async close(
    signer: TSigner,
    proposalHash: string,
    proposalIndex: number,
    weightBound: [number, number] | any = [20_000_000_000, 1000_000],
    lengthBound = 10_000,
  ) {
    const result = await this.helper.executeExtrinsic(signer, `api.tx.${this.collective}.close`, [
      proposalHash,
      proposalIndex,
      weightBound,
      lengthBound,
    ]);
    this.checkExecutedEvent(result.result.events);
    return result;
  }

  /**
   * Shut down a proposal, regardless of its current state.
   * @param signer keyring of the disapprover. Must be root
   * @param proposalHash hash of the proposal to close
   * @returns promise of extrinsic execution and its result
   */
  disapproveProposal(signer: TSigner, proposalHash: string) {
    return this.helper.executeExtrinsic(signer, `api.tx.${this.collective}.disapproveProposal`, [proposalHash]);
  }
}

export class CollectiveMembershipGroup extends HelperGroup<UniqueHelper> {
  /**
   * Pallet name to make an API call to. Examples: 'councilMembership', 'technicalCommitteeMembership'
   */
  private membership: 'councilMembership' | 'technicalCommitteeMembership';

  constructor(helper: UniqueHelper, membership: 'councilMembership' | 'technicalCommitteeMembership') {
    super(helper);
    this.membership = membership;
  }

  /**
   * Returns an array of members' addresses according to the membership pallet's perception.
   * Note that it does not recognize the original pallet's members set with `setMembers()`.
   */
  async getMembers() {
    if(this.membership == 'councilMembership')
      return await this.helper.callQuery('api.query.councilMembership.members', []);
    else if(this.membership == 'technicalCommitteeMembership')
      return await this.helper.callQuery('api.query.technicalCommitteeMembership.members', []);
  }

  /**
   * Returns the optional address of the prime member of the collective.
   */
  async getPrimeMember() {
    if(this.membership == 'councilMembership')
      return await this.helper.callQuery('api.query.councilMembership.prime', []);
    else if(this.membership == 'technicalCommitteeMembership')
      return await this.helper.callQuery('api.query.technicalCommitteeMembership.prime', []);
  }

  /**
   * Add a member to the collective.
   * @param signer keyring of the setter. Must be root
   * @param member address of the member to add
   * @returns promise of extrinsic execution and its result
   */
  addMember(signer: TSigner, member: string) {
    return this.helper.executeExtrinsic(signer, `api.tx.${this.membership}.addMember`, [member]);
  }

  addMemberCall(member: string) {
    return this.helper.constructApiCall(`api.tx.${this.membership}.addMember`, [member]);
  }

  /**
   * Remove a member from the collective.
   * @param signer keyring of the setter. Must be root
   * @param member address of the member to remove
   * @returns promise of extrinsic execution and its result
   */
  removeMember(signer: TSigner, member: string) {
    return this.helper.executeExtrinsic(signer, `api.tx.${this.membership}.removeMember`, [member]);
  }

  removeMemberCall(member: string) {
    return this.helper.constructApiCall(`api.tx.${this.membership}.removeMember`, [member]);
  }

  /**
   * Set members of the collective to the given list of addresses.
   * @param signer keyring of the setter. Must be root (for the direct call, bypassing a public motion)
   * @param members addresses of the members to set
   * @returns promise of extrinsic execution and its result
   */
  resetMembers(signer: TSigner, members: string[]) {
    return this.helper.executeExtrinsic(signer, `api.tx.${this.membership}.resetMembers`, [members]);
  }

  /**
   * Set the collective's prime member to the given address.
   * @param signer keyring of the setter. Must be root (for the direct call, bypassing a public motion)
   * @param prime address of the prime member of the collective
   * @returns promise of extrinsic execution and its result
   */
  setPrime(signer: TSigner, prime: string) {
    return this.helper.executeExtrinsic(signer, `api.tx.${this.membership}.setPrime`, [prime]);
  }

  setPrimeCall(member: string) {
    return this.helper.constructApiCall(`api.tx.${this.membership}.setPrime`, [member]);
  }

  /**
   * Remove the collective's prime member.
   * @param signer keyring of the setter. Must be root (for the direct call, bypassing a public motion)
   * @returns promise of extrinsic execution and its result
   */
  clearPrime(signer: TSigner) {
    return this.helper.executeExtrinsic(signer, `api.tx.${this.membership}.clearPrime`, []);
  }

  clearPrimeCall() {
    return this.helper.constructApiCall(`api.tx.${this.membership}.clearPrime`, []);
  }
}

export class RankedCollectiveGroup extends HelperGroup<UniqueHelper> {
  /**
   * Pallet name to make an API call to. Examples: 'FellowshipCollective'
   */
  private collective: string;

  constructor(helper: UniqueHelper, collective: string) {
    super(helper);
    this.collective = collective;
  }

  addMember(signer: TSigner, newMember: string) {
    return this.helper.executeExtrinsic(signer, `api.tx.${this.collective}.addMember`, [newMember]);
  }

  addMemberCall(newMember: string) {
    return this.helper.constructApiCall(`api.tx.${this.collective}.addMember`, [newMember]);
  }

  removeMember(signer: TSigner, member: string, minRank: number) {
    return this.helper.executeExtrinsic(signer, `api.tx.${this.collective}.removeMember`, [member, minRank]);
  }

  removeMemberCall(newMember: string, minRank: number) {
    return this.helper.constructApiCall(`api.tx.${this.collective}.removeMember`, [newMember, minRank]);
  }

  promote(signer: TSigner, member: string) {
    return this.helper.executeExtrinsic(signer, `api.tx.${this.collective}.promoteMember`, [member]);
  }

  promoteCall(member: string) {
    return this.helper.constructApiCall(`api.tx.${this.collective}.promoteMember`, [member]);
  }

  demote(signer: TSigner, member: string) {
    return this.helper.executeExtrinsic(signer, `api.tx.${this.collective}.demoteMember`, [member]);
  }

  demoteCall(newMember: string) {
    return this.helper.constructApiCall(`api.tx.${this.collective}.demoteMember`, [newMember]);
  }

  vote(signer: TSigner, pollIndex: number, aye: boolean) {
    return this.helper.executeExtrinsic(signer, `api.tx.${this.collective}.vote`, [pollIndex, aye]);
  }

  async getMembers() {
    return (await this.helper.getApi().query.fellowshipCollective.members.keys())
      .map((key) => key.args[0].toString());
  }

  async getMemberRank(member: string) {
    return (await this.helper.callQuery('api.query.fellowshipCollective.members', [member]))?.rank ?? null;
  }
}

export class ReferendaGroup extends HelperGroup<UniqueHelper> {
  /**
   * Pallet name to make an API call to. Examples: 'FellowshipReferenda'
   */
  private referenda: 'fellowshipReferenda';

  constructor(helper: UniqueHelper, referenda: 'fellowshipReferenda') {
    super(helper);
    this.referenda = referenda;
  }

  submit(
    signer: TSigner,
    proposalOrigin: string,
    proposal: any,
    enactmentMoment: any,
  ) {
    return this.helper.executeExtrinsic(signer, `api.tx.${this.referenda}.submit`, [
      {Origins: proposalOrigin},
      proposal,
      enactmentMoment,
    ]);
  }

  placeDecisionDeposit(signer: TSigner, referendumIndex: number) {
    return this.helper.executeExtrinsic(signer, `api.tx.${this.referenda}.placeDecisionDeposit`, [referendumIndex]);
  }

  cancel(signer: TSigner, referendumIndex: number) {
    return this.helper.executeExtrinsic(signer, `api.tx.${this.referenda}.cancel`, [referendumIndex]);
  }

  cancelCall(referendumIndex: number) {
    return this.helper.constructApiCall(`api.tx.${this.referenda}.cancel`, [referendumIndex]);
  }

  async referendumInfo(referendumIndex: number) {
    if(this.referenda == 'fellowshipReferenda')
      return await this.helper.callQuery('api.query.fellowshipReferenda.referendumInfoFor', [referendumIndex]);
  }

  async enactmentEventId(referendumIndex: number) {
    const api = await this.helper.getApi();

    const bytes = api.createType('([u8;8], Text, u32)', ['assembly', 'enactment', referendumIndex]).toU8a();
    return blake2AsHex(bytes, 256);
  }
}

export interface IFellowshipGroup {
  collective: RankedCollectiveGroup;
  referenda: ReferendaGroup;
}

export interface ICollectiveGroup {
  collective: CollectiveGroup;
  membership: CollectiveMembershipGroup;
}

export class DemocracyGroup extends HelperGroup<UniqueHelper> {
  // todo displace proposal into types?
  propose(signer: TSigner, call: any, deposit: bigint) {
    return this.helper.executeExtrinsic(signer, 'api.tx.democracy.propose', [{Inline: call.method.toHex()}, deposit]);
  }

  proposeWithPreimage(signer: TSigner, preimage: string, deposit: bigint) {
    return this.helper.executeExtrinsic(signer, 'api.tx.democracy.propose', [{Legacy: preimage}, deposit]);
  }

  proposeCall(call: any, deposit: bigint) {
    return this.helper.constructApiCall('api.tx.democracy.propose', [{Inline: call.method.toHex()}, deposit]);
  }

  second(signer: TSigner, proposalIndex: number) {
    return this.helper.executeExtrinsic(signer, 'api.tx.democracy.second', [proposalIndex]);
  }

  externalPropose(signer: TSigner, proposalCall: any) {
    return this.helper.executeExtrinsic(signer, 'api.tx.democracy.externalPropose', [{Inline: proposalCall.method.toHex()}]);
  }

  externalProposeMajority(signer: TSigner, proposalCall: any) {
    return this.helper.executeExtrinsic(signer, 'api.tx.democracy.externalProposeMajority', [{Inline: proposalCall.method.toHex()}]);
  }

  externalProposeDefault(signer: TSigner, proposalCall: any) {
    return this.helper.executeExtrinsic(signer, 'api.tx.democracy.externalProposeDefault', [{Inline: proposalCall.method.toHex()}]);
  }

  externalProposeDefaultWithPreimage(signer: TSigner, preimage: string) {
    return this.helper.executeExtrinsic(signer, 'api.tx.democracy.externalProposeDefault', [{Legacy: preimage}]);
  }

  externalProposeCall(proposalCall: any) {
    return this.helper.constructApiCall('api.tx.democracy.externalPropose', [{Inline: proposalCall.method.toHex()}]);
  }

  externalProposeMajorityCall(proposalCall: any) {
    return this.helper.constructApiCall('api.tx.democracy.externalProposeMajority', [{Inline: proposalCall.method.toHex()}]);
  }

  externalProposeDefaultCall(proposalCall: any) {
    return this.helper.constructApiCall('api.tx.democracy.externalProposeDefault', [{Inline: proposalCall.method.toHex()}]);
  }

  externalProposeDefaultWithPreimageCall(preimage: string) {
    return this.helper.constructApiCall('api.tx.democracy.externalProposeDefault', [{Legacy: preimage}]);
  }

  // ... and blacklist external proposal hash.
  vetoExternal(signer: TSigner, proposalHash: string) {
    return this.helper.executeExtrinsic(signer, 'api.tx.democracy.vetoExternal', [proposalHash]);
  }

  vetoExternalCall(proposalHash: string) {
    return this.helper.constructApiCall('api.tx.democracy.vetoExternal', [proposalHash]);
  }

  blacklist(signer: TSigner, proposalHash: string, referendumIndex: number | null = null) {
    return this.helper.executeExtrinsic(signer, 'api.tx.democracy.blacklist', [proposalHash, referendumIndex]);
  }

  blacklistCall(proposalHash: string, referendumIndex: number | null = null) {
    return this.helper.constructApiCall('api.tx.democracy.blacklist', [proposalHash, referendumIndex]);
  }

  // proposal. CancelProposalOrigin (root or all techcom)
  cancelProposal(signer: TSigner, proposalIndex: number) {
    return this.helper.executeExtrinsic(signer, 'api.tx.democracy.cancelProposal', [proposalIndex]);
  }

  cancelProposalCall(proposalIndex: number) {
    return this.helper.constructApiCall('api.tx.democracy.cancelProposal', [proposalIndex]);
  }

  clearPublicProposals(signer: TSigner) {
    return this.helper.executeExtrinsic(signer, 'api.tx.democracy.clearPublicProposals', []);
  }

  fastTrack(signer: TSigner, proposalHash: string, votingPeriod: number, delayPeriod: number) {
    return this.helper.executeExtrinsic(signer, 'api.tx.democracy.fastTrack', [proposalHash, votingPeriod, delayPeriod]);
  }

  fastTrackCall(proposalHash: string, votingPeriod: number, delayPeriod: number) {
    return this.helper.constructApiCall('api.tx.democracy.fastTrack', [proposalHash, votingPeriod, delayPeriod]);
  }

  // referendum. CancellationOrigin (TechCom member)
  emergencyCancel(signer: TSigner, referendumIndex: number) {
    return this.helper.executeExtrinsic(signer, 'api.tx.democracy.emergencyCancel', [referendumIndex]);
  }

  emergencyCancelCall(referendumIndex: number) {
    return this.helper.constructApiCall('api.tx.democracy.emergencyCancel', [referendumIndex]);
  }

  vote(signer: TSigner, referendumIndex: number, vote: any) {
    return this.helper.executeExtrinsic(signer, 'api.tx.democracy.vote', [referendumIndex, vote]);
  }

  removeVote(signer: TSigner, referendumIndex: number, targetAccount?: string) {
    if(targetAccount) {
      return this.helper.executeExtrinsic(signer, 'api.tx.democracy.removeOtherVote', [targetAccount, referendumIndex]);
    } else {
      return this.helper.executeExtrinsic(signer, 'api.tx.democracy.removeVote', [referendumIndex]);
    }
  }

  unlock(signer: TSigner, targetAccount: string) {
    return this.helper.executeExtrinsic(signer, 'api.tx.democracy.unlock', [targetAccount]);
  }

  delegate(signer: TSigner, toAccount: string, conviction: PalletDemocracyConviction, balance: bigint) {
    return this.helper.executeExtrinsic(signer, 'api.tx.democracy.delegate', [toAccount, conviction, balance]);
  }

  undelegate(signer: TSigner) {
    return this.helper.executeExtrinsic(signer, 'api.tx.democracy.undelegate', []);
  }

  async referendumInfo(referendumIndex: number) {
    return (await this.helper.callQuery('api.query.democracy.referendumInfoOf', [referendumIndex]));
  }

  async publicProposals() {
    return (await this.helper.callQuery('api.query.democracy.publicProps', []));
  }

  async findPublicProposal(proposalIndex: number) {
    const proposalInfo = (await this.publicProposals()).find((proposalInfo: any[]) => proposalInfo[0] == proposalIndex);

    return proposalInfo ? proposalInfo[1] : null;
  }

  async expectPublicProposal(proposalIndex: number) {
    const proposal = await this.findPublicProposal(proposalIndex);

    if(proposal) {
      return proposal;
    } else {
      throw Error(`Proposal #${proposalIndex} is expected to exist`);
    }
  }

  async getExternalProposal() {
    return (await this.helper.callQuery('api.query.democracy.nextExternal', []));
  }

  async expectExternalProposal() {
    const proposal = await this.getExternalProposal();

    if(proposal) {
      return proposal;
    } else {
      throw Error('An external proposal is expected to exist');
    }
  }

  /* setMetadata? */

  /* todo?
  referendumVote(signer: TSigner, referendumIndex: number, accountVote: DemocracyStandardAccountVote) {
    return this.helper.executeExtrinsic(signer, 'api.tx.democracy.vote', [referendumIndex, {Standard: accountVote}], true);
  }*/
}
