// Auto-generated via `yarn polkadot-types-from-chain`, do not edit
/* eslint-disable */

// import type lookup before we augment - in some environments
// this is required to allow for ambient/previous definitions
import '@polkadot/api-base/types/errors';

import type { ApiTypes, AugmentedError } from '@polkadot/api-base/types';

export type __AugmentedError<ApiType extends ApiTypes> = AugmentedError<ApiType>;

declare module '@polkadot/api-base/types/errors' {
  interface AugmentedErrors<ApiType extends ApiTypes> {
    appPromotion: {
      /**
       * Error due to action requiring admin to be set.
       **/
      AdminNotSet: AugmentedError<ApiType>;
      /**
       * Errors caused by incorrect state of a staker in context of the pallet.
       **/
      InconsistencyState: AugmentedError<ApiType>;
      /**
       * Errors caused by insufficient staked balance.
       **/
      InsufficientStakedBalance: AugmentedError<ApiType>;
      /**
       * No permission to perform an action.
       **/
      NoPermission: AugmentedError<ApiType>;
      /**
       * Insufficient funds to perform an action.
       **/
      NotSufficientFunds: AugmentedError<ApiType>;
      /**
       * Occurs when a pending unstake cannot be added in this block. PENDING_LIMIT_PER_BLOCK` limits exceeded.
       **/
      PendingForBlockOverflow: AugmentedError<ApiType>;
      /**
       * The error is due to the fact that the collection/contract must already be sponsored in order to perform the action.
       **/
      SponsorNotSet: AugmentedError<ApiType>;
      /**
       * Generic error
       **/
      [key: string]: AugmentedError<ApiType>;
    };
    balances: {
      /**
       * Beneficiary account must pre-exist.
       **/
      DeadAccount: AugmentedError<ApiType>;
      /**
       * Value too low to create account due to existential deposit.
       **/
      ExistentialDeposit: AugmentedError<ApiType>;
      /**
       * A vesting schedule already exists for this account.
       **/
      ExistingVestingSchedule: AugmentedError<ApiType>;
      /**
       * Transfer/payment would kill account.
       **/
      Expendability: AugmentedError<ApiType>;
      /**
       * Balance too low to send value.
       **/
      InsufficientBalance: AugmentedError<ApiType>;
      /**
       * Account liquidity restrictions prevent withdrawal.
       **/
      LiquidityRestrictions: AugmentedError<ApiType>;
      /**
       * Number of freezes exceed `MaxFreezes`.
       **/
      TooManyFreezes: AugmentedError<ApiType>;
      /**
       * Number of holds exceed `MaxHolds`.
       **/
      TooManyHolds: AugmentedError<ApiType>;
      /**
       * Number of named reserves exceed `MaxReserves`.
       **/
      TooManyReserves: AugmentedError<ApiType>;
      /**
       * Vesting balance too high to send value.
       **/
      VestingBalance: AugmentedError<ApiType>;
      /**
       * Generic error
       **/
      [key: string]: AugmentedError<ApiType>;
    };
    collatorSelection: {
      /**
       * User is already a candidate
       **/
      AlreadyCandidate: AugmentedError<ApiType>;
      /**
       * User already holds license to collate
       **/
      AlreadyHoldingLicense: AugmentedError<ApiType>;
      /**
       * User is already an Invulnerable
       **/
      AlreadyInvulnerable: AugmentedError<ApiType>;
      /**
       * Account has no associated validator ID
       **/
      NoAssociatedValidatorId: AugmentedError<ApiType>;
      /**
       * User does not hold a license to collate
       **/
      NoLicense: AugmentedError<ApiType>;
      /**
       * User is not a candidate
       **/
      NotCandidate: AugmentedError<ApiType>;
      /**
       * User is not an Invulnerable
       **/
      NotInvulnerable: AugmentedError<ApiType>;
      /**
       * Permission issue
       **/
      Permission: AugmentedError<ApiType>;
      /**
       * Too few invulnerables
       **/
      TooFewInvulnerables: AugmentedError<ApiType>;
      /**
       * Too many candidates
       **/
      TooManyCandidates: AugmentedError<ApiType>;
      /**
       * Too many invulnerables
       **/
      TooManyInvulnerables: AugmentedError<ApiType>;
      /**
       * Unknown error
       **/
      Unknown: AugmentedError<ApiType>;
      /**
       * Validator ID is not yet registered
       **/
      ValidatorNotRegistered: AugmentedError<ApiType>;
      /**
       * Generic error
       **/
      [key: string]: AugmentedError<ApiType>;
    };
    common: {
      /**
       * Account token limit exceeded per collection
       **/
      AccountTokenLimitExceeded: AugmentedError<ApiType>;
      /**
       * Only spending from eth mirror could be approved
       **/
      AddressIsNotEthMirror: AugmentedError<ApiType>;
      /**
       * Can't transfer tokens to ethereum zero address
       **/
      AddressIsZero: AugmentedError<ApiType>;
      /**
       * Address is not in allow list.
       **/
      AddressNotInAllowlist: AugmentedError<ApiType>;
      /**
       * Requested value is more than the approved
       **/
      ApprovedValueTooLow: AugmentedError<ApiType>;
      /**
       * Tried to approve more than owned
       **/
      CantApproveMoreThanOwned: AugmentedError<ApiType>;
      /**
       * Destroying only empty collections is allowed
       **/
      CantDestroyNotEmptyCollection: AugmentedError<ApiType>;
      /**
       * Exceeded max admin count
       **/
      CollectionAdminCountExceeded: AugmentedError<ApiType>;
      /**
       * Collection description can not be longer than 255 char.
       **/
      CollectionDescriptionLimitExceeded: AugmentedError<ApiType>;
      /**
       * Tried to store more data than allowed in collection field
       **/
      CollectionFieldSizeExceeded: AugmentedError<ApiType>;
      /**
       * Tried to access an external collection with an internal API
       **/
      CollectionIsExternal: AugmentedError<ApiType>;
      /**
       * Tried to access an internal collection with an external API
       **/
      CollectionIsInternal: AugmentedError<ApiType>;
      /**
       * Collection limit bounds per collection exceeded
       **/
      CollectionLimitBoundsExceeded: AugmentedError<ApiType>;
      /**
       * Collection name can not be longer than 63 char.
       **/
      CollectionNameLimitExceeded: AugmentedError<ApiType>;
      /**
       * This collection does not exist.
       **/
      CollectionNotFound: AugmentedError<ApiType>;
      /**
       * Collection token limit exceeded
       **/
      CollectionTokenLimitExceeded: AugmentedError<ApiType>;
      /**
       * Token prefix can not be longer than 15 char.
       **/
      CollectionTokenPrefixLimitExceeded: AugmentedError<ApiType>;
      /**
       * This address is not set as sponsor, use setCollectionSponsor first.
       **/
      ConfirmSponsorshipFail: AugmentedError<ApiType>;
      /**
       * Empty property keys are forbidden
       **/
      EmptyPropertyKey: AugmentedError<ApiType>;
      /**
       * Fungible tokens hold no ID, and the default value of TokenId for a fungible collection is 0.
       **/
      FungibleItemsHaveNoId: AugmentedError<ApiType>;
      /**
       * Only ASCII letters, digits, and symbols `_`, `-`, and `.` are allowed
       **/
      InvalidCharacterInPropertyKey: AugmentedError<ApiType>;
      /**
       * Metadata flag frozen
       **/
      MetadataFlagFrozen: AugmentedError<ApiType>;
      /**
       * Sender parameter and item owner must be equal.
       **/
      MustBeTokenOwner: AugmentedError<ApiType>;
      /**
       * No permission to perform action
       **/
      NoPermission: AugmentedError<ApiType>;
      /**
       * Tried to store more property data than allowed
       **/
      NoSpaceForProperty: AugmentedError<ApiType>;
      /**
       * Insufficient funds to perform an action
       **/
      NotSufficientFounds: AugmentedError<ApiType>;
      /**
       * Tried to enable permissions which are only permitted to be disabled
       **/
      OwnerPermissionsCantBeReverted: AugmentedError<ApiType>;
      /**
       * Property key is too long
       **/
      PropertyKeyIsTooLong: AugmentedError<ApiType>;
      /**
       * Tried to store more property keys than allowed
       **/
      PropertyLimitReached: AugmentedError<ApiType>;
      /**
       * Collection is not in mint mode.
       **/
      PublicMintingNotAllowed: AugmentedError<ApiType>;
      /**
       * Only tokens from specific collections may nest tokens under this one
       **/
      SourceCollectionIsNotAllowedToNest: AugmentedError<ApiType>;
      /**
       * Item does not exist
       **/
      TokenNotFound: AugmentedError<ApiType>;
      /**
       * Item is balance not enough
       **/
      TokenValueTooLow: AugmentedError<ApiType>;
      /**
       * Total collections bound exceeded.
       **/
      TotalCollectionsLimitExceeded: AugmentedError<ApiType>;
      /**
       * Collection settings not allowing items transferring
       **/
      TransferNotAllowed: AugmentedError<ApiType>;
      /**
       * The operation is not supported
       **/
      UnsupportedOperation: AugmentedError<ApiType>;
      /**
       * User does not satisfy the nesting rule
       **/
      UserIsNotAllowedToNest: AugmentedError<ApiType>;
      /**
       * The user is not an administrator.
       **/
      UserIsNotCollectionAdmin: AugmentedError<ApiType>;
      /**
       * Generic error
       **/
      [key: string]: AugmentedError<ApiType>;
    };
    configuration: {
      InconsistentConfiguration: AugmentedError<ApiType>;
      /**
       * Generic error
       **/
      [key: string]: AugmentedError<ApiType>;
    };
    council: {
      /**
       * Members are already initialized!
       **/
      AlreadyInitialized: AugmentedError<ApiType>;
      /**
       * Duplicate proposals not allowed
       **/
      DuplicateProposal: AugmentedError<ApiType>;
      /**
       * Duplicate vote ignored
       **/
      DuplicateVote: AugmentedError<ApiType>;
      /**
       * Account is not a member
       **/
      NotMember: AugmentedError<ApiType>;
      /**
       * Prime account is not a member
       **/
      PrimeAccountNotMember: AugmentedError<ApiType>;
      /**
       * Proposal must exist
       **/
      ProposalMissing: AugmentedError<ApiType>;
      /**
       * The close call was made too early, before the end of the voting.
       **/
      TooEarly: AugmentedError<ApiType>;
      /**
       * There can only be a maximum of `MaxProposals` active proposals.
       **/
      TooManyProposals: AugmentedError<ApiType>;
      /**
       * Mismatched index
       **/
      WrongIndex: AugmentedError<ApiType>;
      /**
       * The given length bound for the proposal was too low.
       **/
      WrongProposalLength: AugmentedError<ApiType>;
      /**
       * The given weight bound for the proposal was too low.
       **/
      WrongProposalWeight: AugmentedError<ApiType>;
      /**
       * Generic error
       **/
      [key: string]: AugmentedError<ApiType>;
    };
    councilMembership: {
      /**
       * Already a member.
       **/
      AlreadyMember: AugmentedError<ApiType>;
      /**
       * Not a member.
       **/
      NotMember: AugmentedError<ApiType>;
      /**
       * Too many members.
       **/
      TooManyMembers: AugmentedError<ApiType>;
      /**
       * Generic error
       **/
      [key: string]: AugmentedError<ApiType>;
    };
    cumulusXcm: {
      /**
       * Generic error
       **/
      [key: string]: AugmentedError<ApiType>;
    };
    democracy: {
      /**
       * Cannot cancel the same proposal twice
       **/
      AlreadyCanceled: AugmentedError<ApiType>;
      /**
       * The account is already delegating.
       **/
      AlreadyDelegating: AugmentedError<ApiType>;
      /**
       * Identity may not veto a proposal twice
       **/
      AlreadyVetoed: AugmentedError<ApiType>;
      /**
       * Proposal already made
       **/
      DuplicateProposal: AugmentedError<ApiType>;
      /**
       * The instant referendum origin is currently disallowed.
       **/
      InstantNotAllowed: AugmentedError<ApiType>;
      /**
       * Too high a balance was provided that the account cannot afford.
       **/
      InsufficientFunds: AugmentedError<ApiType>;
      /**
       * Invalid hash
       **/
      InvalidHash: AugmentedError<ApiType>;
      /**
       * Maximum number of votes reached.
       **/
      MaxVotesReached: AugmentedError<ApiType>;
      /**
       * No proposals waiting
       **/
      NoneWaiting: AugmentedError<ApiType>;
      /**
       * Delegation to oneself makes no sense.
       **/
      Nonsense: AugmentedError<ApiType>;
      /**
       * The actor has no permission to conduct the action.
       **/
      NoPermission: AugmentedError<ApiType>;
      /**
       * No external proposal
       **/
      NoProposal: AugmentedError<ApiType>;
      /**
       * The account is not currently delegating.
       **/
      NotDelegating: AugmentedError<ApiType>;
      /**
       * Next external proposal not simple majority
       **/
      NotSimpleMajority: AugmentedError<ApiType>;
      /**
       * The given account did not vote on the referendum.
       **/
      NotVoter: AugmentedError<ApiType>;
      /**
       * The preimage does not exist.
       **/
      PreimageNotExist: AugmentedError<ApiType>;
      /**
       * Proposal still blacklisted
       **/
      ProposalBlacklisted: AugmentedError<ApiType>;
      /**
       * Proposal does not exist
       **/
      ProposalMissing: AugmentedError<ApiType>;
      /**
       * Vote given for invalid referendum
       **/
      ReferendumInvalid: AugmentedError<ApiType>;
      /**
       * Maximum number of items reached.
       **/
      TooMany: AugmentedError<ApiType>;
      /**
       * Value too low
       **/
      ValueLow: AugmentedError<ApiType>;
      /**
       * The account currently has votes attached to it and the operation cannot succeed until
       * these are removed, either through `unvote` or `reap_vote`.
       **/
      VotesExist: AugmentedError<ApiType>;
      /**
       * Voting period too low
       **/
      VotingPeriodLow: AugmentedError<ApiType>;
      /**
       * Invalid upper bound.
       **/
      WrongUpperBound: AugmentedError<ApiType>;
      /**
       * Generic error
       **/
      [key: string]: AugmentedError<ApiType>;
    };
    dmpQueue: {
      /**
       * The amount of weight given is possibly not enough for executing the message.
       **/
      OverLimit: AugmentedError<ApiType>;
      /**
       * The message index given is unknown.
       **/
      Unknown: AugmentedError<ApiType>;
      /**
       * Generic error
       **/
      [key: string]: AugmentedError<ApiType>;
    };
    ethereum: {
      /**
       * Signature is invalid.
       **/
      InvalidSignature: AugmentedError<ApiType>;
      /**
       * Pre-log is present, therefore transact is not allowed.
       **/
      PreLogExists: AugmentedError<ApiType>;
      /**
       * Generic error
       **/
      [key: string]: AugmentedError<ApiType>;
    };
    evm: {
      /**
       * Not enough balance to perform action
       **/
      BalanceLow: AugmentedError<ApiType>;
      /**
       * Calculating total fee overflowed
       **/
      FeeOverflow: AugmentedError<ApiType>;
      /**
       * Gas limit is too high.
       **/
      GasLimitTooHigh: AugmentedError<ApiType>;
      /**
       * Gas limit is too low.
       **/
      GasLimitTooLow: AugmentedError<ApiType>;
      /**
       * Gas price is too low.
       **/
      GasPriceTooLow: AugmentedError<ApiType>;
      /**
       * Nonce is invalid
       **/
      InvalidNonce: AugmentedError<ApiType>;
      /**
       * Calculating total payment overflowed
       **/
      PaymentOverflow: AugmentedError<ApiType>;
      /**
       * EVM reentrancy
       **/
      Reentrancy: AugmentedError<ApiType>;
      /**
       * EIP-3607,
       **/
      TransactionMustComeFromEOA: AugmentedError<ApiType>;
      /**
       * Undefined error.
       **/
      Undefined: AugmentedError<ApiType>;
      /**
       * Withdraw fee failed
       **/
      WithdrawFailed: AugmentedError<ApiType>;
      /**
       * Generic error
       **/
      [key: string]: AugmentedError<ApiType>;
    };
    evmCoderSubstrate: {
      OutOfFund: AugmentedError<ApiType>;
      OutOfGas: AugmentedError<ApiType>;
      /**
       * Generic error
       **/
      [key: string]: AugmentedError<ApiType>;
    };
    evmContractHelpers: {
      /**
       * No pending sponsor for contract.
       **/
      NoPendingSponsor: AugmentedError<ApiType>;
      /**
       * This method is only executable by contract owner
       **/
      NoPermission: AugmentedError<ApiType>;
      /**
       * Number of methods that sponsored limit is defined for exceeds maximum.
       **/
      TooManyMethodsHaveSponsoredLimit: AugmentedError<ApiType>;
      /**
       * Generic error
       **/
      [key: string]: AugmentedError<ApiType>;
    };
    evmMigration: {
      /**
       * Migration of this account is not yet started, or already finished.
       **/
      AccountIsNotMigrating: AugmentedError<ApiType>;
      /**
       * Can only migrate to empty address.
       **/
      AccountNotEmpty: AugmentedError<ApiType>;
      /**
       * Failed to decode event bytes
       **/
      BadEvent: AugmentedError<ApiType>;
      /**
       * Generic error
       **/
      [key: string]: AugmentedError<ApiType>;
    };
    fellowshipCollective: {
      /**
       * Account is already a member.
       **/
      AlreadyMember: AugmentedError<ApiType>;
      /**
       * Unexpected error in state.
       **/
      Corruption: AugmentedError<ApiType>;
      /**
       * The information provided is incorrect.
       **/
      InvalidWitness: AugmentedError<ApiType>;
      /**
       * There are no further records to be removed.
       **/
      NoneRemaining: AugmentedError<ApiType>;
      /**
       * The origin is not sufficiently privileged to do the operation.
       **/
      NoPermission: AugmentedError<ApiType>;
      /**
       * Account is not a member.
       **/
      NotMember: AugmentedError<ApiType>;
      /**
       * The given poll index is unknown or has closed.
       **/
      NotPolling: AugmentedError<ApiType>;
      /**
       * The given poll is still ongoing.
       **/
      Ongoing: AugmentedError<ApiType>;
      /**
       * The member's rank is too low to vote.
       **/
      RankTooLow: AugmentedError<ApiType>;
      /**
       * Generic error
       **/
      [key: string]: AugmentedError<ApiType>;
    };
    fellowshipReferenda: {
      /**
       * The referendum index provided is invalid in this context.
       **/
      BadReferendum: AugmentedError<ApiType>;
      /**
       * The referendum status is invalid for this operation.
       **/
      BadStatus: AugmentedError<ApiType>;
      /**
       * The track identifier given was invalid.
       **/
      BadTrack: AugmentedError<ApiType>;
      /**
       * There are already a full complement of referenda in progress for this track.
       **/
      Full: AugmentedError<ApiType>;
      /**
       * Referendum's decision deposit is already paid.
       **/
      HasDeposit: AugmentedError<ApiType>;
      /**
       * The deposit cannot be refunded since none was made.
       **/
      NoDeposit: AugmentedError<ApiType>;
      /**
       * The deposit refunder is not the depositor.
       **/
      NoPermission: AugmentedError<ApiType>;
      /**
       * There was nothing to do in the advancement.
       **/
      NothingToDo: AugmentedError<ApiType>;
      /**
       * Referendum is not ongoing.
       **/
      NotOngoing: AugmentedError<ApiType>;
      /**
       * No track exists for the proposal origin.
       **/
      NoTrack: AugmentedError<ApiType>;
      /**
       * The preimage does not exist.
       **/
      PreimageNotExist: AugmentedError<ApiType>;
      /**
       * The queue of the track is empty.
       **/
      QueueEmpty: AugmentedError<ApiType>;
      /**
       * Any deposit cannot be refunded until after the decision is over.
       **/
      Unfinished: AugmentedError<ApiType>;
      /**
       * Generic error
       **/
      [key: string]: AugmentedError<ApiType>;
    };
    foreignAssets: {
      /**
       * AssetId exists
       **/
      AssetIdExisted: AugmentedError<ApiType>;
      /**
       * AssetId not exists
       **/
      AssetIdNotExists: AugmentedError<ApiType>;
      /**
       * The given location could not be used (e.g. because it cannot be expressed in the
       * desired version of XCM).
       **/
      BadLocation: AugmentedError<ApiType>;
      /**
       * MultiLocation existed
       **/
      MultiLocationExisted: AugmentedError<ApiType>;
      /**
       * Generic error
       **/
      [key: string]: AugmentedError<ApiType>;
    };
    fungible: {
      /**
       * Fungible token does not support nesting.
       **/
      FungibleDisallowsNesting: AugmentedError<ApiType>;
      /**
       * Tried to set data for fungible item.
       **/
      FungibleItemsDontHaveData: AugmentedError<ApiType>;
      /**
       * Only a fungible collection could be possibly broken; any fungible token is valid.
       **/
      FungibleTokensAreAlwaysValid: AugmentedError<ApiType>;
      /**
       * Not Fungible item data used to mint in Fungible collection.
       **/
      NotFungibleDataUsedToMintFungibleCollectionToken: AugmentedError<ApiType>;
      /**
       * Setting allowance for all is not allowed.
       **/
      SettingAllowanceForAllNotAllowed: AugmentedError<ApiType>;
      /**
       * Setting item properties is not allowed.
       **/
      SettingPropertiesNotAllowed: AugmentedError<ApiType>;
      /**
       * Generic error
       **/
      [key: string]: AugmentedError<ApiType>;
    };
    identity: {
      /**
       * Account ID is already named.
       **/
      AlreadyClaimed: AugmentedError<ApiType>;
      /**
       * Empty index.
       **/
      EmptyIndex: AugmentedError<ApiType>;
      /**
       * Fee is changed.
       **/
      FeeChanged: AugmentedError<ApiType>;
      /**
       * The index is invalid.
       **/
      InvalidIndex: AugmentedError<ApiType>;
      /**
       * Invalid judgement.
       **/
      InvalidJudgement: AugmentedError<ApiType>;
      /**
       * The target is invalid.
       **/
      InvalidTarget: AugmentedError<ApiType>;
      /**
       * The provided judgement was for a different identity.
       **/
      JudgementForDifferentIdentity: AugmentedError<ApiType>;
      /**
       * Judgement given.
       **/
      JudgementGiven: AugmentedError<ApiType>;
      /**
       * Error that occurs when there is an issue paying for judgement.
       **/
      JudgementPaymentFailed: AugmentedError<ApiType>;
      /**
       * No identity found.
       **/
      NoIdentity: AugmentedError<ApiType>;
      /**
       * Account isn't found.
       **/
      NotFound: AugmentedError<ApiType>;
      /**
       * Account isn't named.
       **/
      NotNamed: AugmentedError<ApiType>;
      /**
       * Sub-account isn't owned by sender.
       **/
      NotOwned: AugmentedError<ApiType>;
      /**
       * Sender is not a sub-account.
       **/
      NotSub: AugmentedError<ApiType>;
      /**
       * Sticky judgement.
       **/
      StickyJudgement: AugmentedError<ApiType>;
      /**
       * Too many additional fields.
       **/
      TooManyFields: AugmentedError<ApiType>;
      /**
       * Maximum amount of registrars reached. Cannot add any more.
       **/
      TooManyRegistrars: AugmentedError<ApiType>;
      /**
       * Too many subs-accounts.
       **/
      TooManySubAccounts: AugmentedError<ApiType>;
      /**
       * Generic error
       **/
      [key: string]: AugmentedError<ApiType>;
    };
    maintenance: {
      /**
       * Generic error
       **/
      [key: string]: AugmentedError<ApiType>;
    };
    nonfungible: {
      /**
       * Unable to burn NFT with children
       **/
      CantBurnNftWithChildren: AugmentedError<ApiType>;
      /**
       * Used amount > 1 with NFT
       **/
      NonfungibleItemsHaveNoAmount: AugmentedError<ApiType>;
      /**
       * Not Nonfungible item data used to mint in Nonfungible collection.
       **/
      NotNonfungibleDataUsedToMintFungibleCollectionToken: AugmentedError<ApiType>;
      /**
       * Generic error
       **/
      [key: string]: AugmentedError<ApiType>;
    };
    parachainSystem: {
      /**
       * The inherent which supplies the host configuration did not run this block.
       **/
      HostConfigurationNotAvailable: AugmentedError<ApiType>;
      /**
       * No code upgrade has been authorized.
       **/
      NothingAuthorized: AugmentedError<ApiType>;
      /**
       * No validation function upgrade is currently scheduled.
       **/
      NotScheduled: AugmentedError<ApiType>;
      /**
       * Attempt to upgrade validation function while existing upgrade pending.
       **/
      OverlappingUpgrades: AugmentedError<ApiType>;
      /**
       * Polkadot currently prohibits this parachain from upgrading its validation function.
       **/
      ProhibitedByPolkadot: AugmentedError<ApiType>;
      /**
       * The supplied validation function has compiled into a blob larger than Polkadot is
       * willing to run.
       **/
      TooBig: AugmentedError<ApiType>;
      /**
       * The given code upgrade has not been authorized.
       **/
      Unauthorized: AugmentedError<ApiType>;
      /**
       * The inherent which supplies the validation data did not run this block.
       **/
      ValidationDataNotAvailable: AugmentedError<ApiType>;
      /**
       * Generic error
       **/
      [key: string]: AugmentedError<ApiType>;
    };
    polkadotXcm: {
      /**
       * The given account is not an identifiable sovereign account for any location.
       **/
      AccountNotSovereign: AugmentedError<ApiType>;
      /**
       * The location is invalid since it already has a subscription from us.
       **/
      AlreadySubscribed: AugmentedError<ApiType>;
      /**
       * The given location could not be used (e.g. because it cannot be expressed in the
       * desired version of XCM).
       **/
      BadLocation: AugmentedError<ApiType>;
      /**
       * The version of the `Versioned` value used is not able to be interpreted.
       **/
      BadVersion: AugmentedError<ApiType>;
      /**
       * Could not re-anchor the assets to declare the fees for the destination chain.
       **/
      CannotReanchor: AugmentedError<ApiType>;
      /**
       * The destination `MultiLocation` provided cannot be inverted.
       **/
      DestinationNotInvertible: AugmentedError<ApiType>;
      /**
       * The assets to be sent are empty.
       **/
      Empty: AugmentedError<ApiType>;
      /**
       * The operation required fees to be paid which the initiator could not meet.
       **/
      FeesNotMet: AugmentedError<ApiType>;
      /**
       * The message execution fails the filter.
       **/
      Filtered: AugmentedError<ApiType>;
      /**
       * The unlock operation cannot succeed because there are still consumers of the lock.
       **/
      InUse: AugmentedError<ApiType>;
      /**
       * Invalid asset for the operation.
       **/
      InvalidAsset: AugmentedError<ApiType>;
      /**
       * Origin is invalid for sending.
       **/
      InvalidOrigin: AugmentedError<ApiType>;
      /**
       * A remote lock with the corresponding data could not be found.
       **/
      LockNotFound: AugmentedError<ApiType>;
      /**
       * The owner does not own (all) of the asset that they wish to do the operation on.
       **/
      LowBalance: AugmentedError<ApiType>;
      /**
       * The referenced subscription could not be found.
       **/
      NoSubscription: AugmentedError<ApiType>;
      /**
       * There was some other issue (i.e. not to do with routing) in sending the message.
       * Perhaps a lack of space for buffering the message.
       **/
      SendFailure: AugmentedError<ApiType>;
      /**
       * Too many assets have been attempted for transfer.
       **/
      TooManyAssets: AugmentedError<ApiType>;
      /**
       * The asset owner has too many locks on the asset.
       **/
      TooManyLocks: AugmentedError<ApiType>;
      /**
       * The desired destination was unreachable, generally because there is a no way of routing
       * to it.
       **/
      Unreachable: AugmentedError<ApiType>;
      /**
       * The message's weight could not be determined.
       **/
      UnweighableMessage: AugmentedError<ApiType>;
      /**
       * Generic error
       **/
      [key: string]: AugmentedError<ApiType>;
    };
    preimage: {
      /**
       * Preimage has already been noted on-chain.
       **/
      AlreadyNoted: AugmentedError<ApiType>;
      /**
       * The user is not authorized to perform this action.
       **/
      NotAuthorized: AugmentedError<ApiType>;
      /**
       * The preimage cannot be removed since it has not yet been noted.
       **/
      NotNoted: AugmentedError<ApiType>;
      /**
       * The preimage request cannot be removed since no outstanding requests exist.
       **/
      NotRequested: AugmentedError<ApiType>;
      /**
       * A preimage may not be removed when there are outstanding requests.
       **/
      Requested: AugmentedError<ApiType>;
      /**
       * Preimage is too large to store on-chain.
       **/
      TooBig: AugmentedError<ApiType>;
      /**
       * Generic error
       **/
      [key: string]: AugmentedError<ApiType>;
    };
    refungible: {
      /**
       * Not Refungible item data used to mint in Refungible collection.
       **/
      NotRefungibleDataUsedToMintFungibleCollectionToken: AugmentedError<ApiType>;
      /**
       * Refungible token can't nest other tokens.
       **/
      RefungibleDisallowsNesting: AugmentedError<ApiType>;
      /**
       * Refungible token can't be repartitioned by user who isn't owns all pieces.
       **/
      RepartitionWhileNotOwningAllPieces: AugmentedError<ApiType>;
      /**
       * Setting item properties is not allowed.
       **/
      SettingPropertiesNotAllowed: AugmentedError<ApiType>;
      /**
       * Maximum refungibility exceeded.
       **/
      WrongRefungiblePieces: AugmentedError<ApiType>;
      /**
       * Generic error
       **/
      [key: string]: AugmentedError<ApiType>;
    };
    scheduler: {
      /**
       * Failed to schedule a call
       **/
      FailedToSchedule: AugmentedError<ApiType>;
      /**
       * Attempt to use a non-named function on a named task.
       **/
      Named: AugmentedError<ApiType>;
      /**
       * Cannot find the scheduled call.
       **/
      NotFound: AugmentedError<ApiType>;
      /**
       * Reschedule failed because it does not change scheduled time.
       **/
      RescheduleNoChange: AugmentedError<ApiType>;
      /**
       * Given target block number is in the past.
       **/
      TargetBlockNumberInPast: AugmentedError<ApiType>;
      /**
       * Generic error
       **/
      [key: string]: AugmentedError<ApiType>;
    };
    session: {
      /**
       * Registered duplicate key.
       **/
      DuplicatedKey: AugmentedError<ApiType>;
      /**
       * Invalid ownership proof.
       **/
      InvalidProof: AugmentedError<ApiType>;
      /**
       * Key setting account is not live, so it's impossible to associate keys.
       **/
      NoAccount: AugmentedError<ApiType>;
      /**
       * No associated validator ID for account.
       **/
      NoAssociatedValidatorId: AugmentedError<ApiType>;
      /**
       * No keys are associated with this account.
       **/
      NoKeys: AugmentedError<ApiType>;
      /**
       * Generic error
       **/
      [key: string]: AugmentedError<ApiType>;
    };
    stateTrieMigration: {
      /**
       * Bad child root provided.
       **/
      BadChildRoot: AugmentedError<ApiType>;
      /**
       * Bad witness data provided.
       **/
      BadWitness: AugmentedError<ApiType>;
      /**
       * A key was longer than the configured maximum.
       * 
       * This means that the migration halted at the current [`Progress`] and
       * can be resumed with a larger [`crate::Config::MaxKeyLen`] value.
       * Retrying with the same [`crate::Config::MaxKeyLen`] value will not work.
       * The value should only be increased to avoid a storage migration for the currently
       * stored [`crate::Progress::LastKey`].
       **/
      KeyTooLong: AugmentedError<ApiType>;
      /**
       * Max signed limits not respected.
       **/
      MaxSignedLimits: AugmentedError<ApiType>;
      /**
       * submitter does not have enough funds.
       **/
      NotEnoughFunds: AugmentedError<ApiType>;
      /**
       * Signed migration is not allowed because the maximum limit is not set yet.
       **/
      SignedMigrationNotAllowed: AugmentedError<ApiType>;
      /**
       * Generic error
       **/
      [key: string]: AugmentedError<ApiType>;
    };
    structure: {
      /**
       * While nesting, reached the breadth limit of nesting, exceeding the provided budget.
       **/
      BreadthLimit: AugmentedError<ApiType>;
      /**
       * Tried to nest token under collection contract address, instead of token address
       **/
      CantNestTokenUnderCollection: AugmentedError<ApiType>;
      /**
       * While nesting, reached the depth limit of nesting, exceeding the provided budget.
       **/
      DepthLimit: AugmentedError<ApiType>;
      /**
       * While nesting, encountered an already checked account, detecting a loop.
       **/
      OuroborosDetected: AugmentedError<ApiType>;
      /**
       * Couldn't find the token owner that is itself a token.
       **/
      TokenNotFound: AugmentedError<ApiType>;
      /**
       * Generic error
       **/
      [key: string]: AugmentedError<ApiType>;
    };
    sudo: {
      /**
       * Sender must be the Sudo account
       **/
      RequireSudo: AugmentedError<ApiType>;
      /**
       * Generic error
       **/
      [key: string]: AugmentedError<ApiType>;
    };
    system: {
      /**
       * The origin filter prevent the call to be dispatched.
       **/
      CallFiltered: AugmentedError<ApiType>;
      /**
       * Failed to extract the runtime version from the new runtime.
       * 
       * Either calling `Core_version` or decoding `RuntimeVersion` failed.
       **/
      FailedToExtractRuntimeVersion: AugmentedError<ApiType>;
      /**
       * The name of specification does not match between the current runtime
       * and the new runtime.
       **/
      InvalidSpecName: AugmentedError<ApiType>;
      /**
       * Suicide called when the account has non-default composite data.
       **/
      NonDefaultComposite: AugmentedError<ApiType>;
      /**
       * There is a non-zero reference count preventing the account from being purged.
       **/
      NonZeroRefCount: AugmentedError<ApiType>;
      /**
       * The specification version is not allowed to decrease between the current runtime
       * and the new runtime.
       **/
      SpecVersionNeedsToIncrease: AugmentedError<ApiType>;
      /**
       * Generic error
       **/
      [key: string]: AugmentedError<ApiType>;
    };
    technicalCommittee: {
      /**
       * Members are already initialized!
       **/
      AlreadyInitialized: AugmentedError<ApiType>;
      /**
       * Duplicate proposals not allowed
       **/
      DuplicateProposal: AugmentedError<ApiType>;
      /**
       * Duplicate vote ignored
       **/
      DuplicateVote: AugmentedError<ApiType>;
      /**
       * Account is not a member
       **/
      NotMember: AugmentedError<ApiType>;
      /**
       * Prime account is not a member
       **/
      PrimeAccountNotMember: AugmentedError<ApiType>;
      /**
       * Proposal must exist
       **/
      ProposalMissing: AugmentedError<ApiType>;
      /**
       * The close call was made too early, before the end of the voting.
       **/
      TooEarly: AugmentedError<ApiType>;
      /**
       * There can only be a maximum of `MaxProposals` active proposals.
       **/
      TooManyProposals: AugmentedError<ApiType>;
      /**
       * Mismatched index
       **/
      WrongIndex: AugmentedError<ApiType>;
      /**
       * The given length bound for the proposal was too low.
       **/
      WrongProposalLength: AugmentedError<ApiType>;
      /**
       * The given weight bound for the proposal was too low.
       **/
      WrongProposalWeight: AugmentedError<ApiType>;
      /**
       * Generic error
       **/
      [key: string]: AugmentedError<ApiType>;
    };
    technicalCommitteeMembership: {
      /**
       * Already a member.
       **/
      AlreadyMember: AugmentedError<ApiType>;
      /**
       * Not a member.
       **/
      NotMember: AugmentedError<ApiType>;
      /**
       * Too many members.
       **/
      TooManyMembers: AugmentedError<ApiType>;
      /**
       * Generic error
       **/
      [key: string]: AugmentedError<ApiType>;
    };
    testUtils: {
      TestPalletDisabled: AugmentedError<ApiType>;
      TriggerRollback: AugmentedError<ApiType>;
      /**
       * Generic error
       **/
      [key: string]: AugmentedError<ApiType>;
    };
    tokens: {
      /**
       * Cannot convert Amount into Balance type
       **/
      AmountIntoBalanceFailed: AugmentedError<ApiType>;
      /**
       * The balance is too low
       **/
      BalanceTooLow: AugmentedError<ApiType>;
      /**
       * Beneficiary account must pre-exist
       **/
      DeadAccount: AugmentedError<ApiType>;
      /**
       * Value too low to create account due to existential deposit
       **/
      ExistentialDeposit: AugmentedError<ApiType>;
      /**
       * Transfer/payment would kill account
       **/
      KeepAlive: AugmentedError<ApiType>;
      /**
       * Failed because liquidity restrictions due to locking
       **/
      LiquidityRestrictions: AugmentedError<ApiType>;
      /**
       * Failed because the maximum locks was exceeded
       **/
      MaxLocksExceeded: AugmentedError<ApiType>;
      TooManyReserves: AugmentedError<ApiType>;
      /**
       * Generic error
       **/
      [key: string]: AugmentedError<ApiType>;
    };
    treasury: {
      /**
       * The spend origin is valid but the amount it is allowed to spend is lower than the
       * amount to be spent.
       **/
      InsufficientPermission: AugmentedError<ApiType>;
      /**
       * Proposer's balance is too low.
       **/
      InsufficientProposersBalance: AugmentedError<ApiType>;
      /**
       * No proposal or bounty at that index.
       **/
      InvalidIndex: AugmentedError<ApiType>;
      /**
       * Proposal has not been approved.
       **/
      ProposalNotApproved: AugmentedError<ApiType>;
      /**
       * Too many approvals in the queue.
       **/
      TooManyApprovals: AugmentedError<ApiType>;
      /**
       * Generic error
       **/
      [key: string]: AugmentedError<ApiType>;
    };
    unique: {
      /**
       * Decimal_points parameter must be lower than [`up_data_structs::MAX_DECIMAL_POINTS`].
       **/
      CollectionDecimalPointLimitExceeded: AugmentedError<ApiType>;
      /**
       * Length of items properties must be greater than 0.
       **/
      EmptyArgument: AugmentedError<ApiType>;
      /**
       * Repertition is only supported by refungible collection.
       **/
      RepartitionCalledOnNonRefungibleCollection: AugmentedError<ApiType>;
      /**
       * Generic error
       **/
      [key: string]: AugmentedError<ApiType>;
    };
    utility: {
      /**
       * Too many calls batched.
       **/
      TooManyCalls: AugmentedError<ApiType>;
      /**
       * Generic error
       **/
      [key: string]: AugmentedError<ApiType>;
    };
    vesting: {
      /**
       * The vested transfer amount is too low
       **/
      AmountLow: AugmentedError<ApiType>;
      /**
       * Insufficient amount of balance to lock
       **/
      InsufficientBalanceToLock: AugmentedError<ApiType>;
      /**
       * Failed because the maximum vesting schedules was exceeded
       **/
      MaxVestingSchedulesExceeded: AugmentedError<ApiType>;
      /**
       * This account have too many vesting schedules
       **/
      TooManyVestingSchedules: AugmentedError<ApiType>;
      /**
       * Vesting period is zero
       **/
      ZeroVestingPeriod: AugmentedError<ApiType>;
      /**
       * Number of vests is zero
       **/
      ZeroVestingPeriodCount: AugmentedError<ApiType>;
      /**
       * Generic error
       **/
      [key: string]: AugmentedError<ApiType>;
    };
    xcmpQueue: {
      /**
       * Bad overweight index.
       **/
      BadOverweightIndex: AugmentedError<ApiType>;
      /**
       * Bad XCM data.
       **/
      BadXcm: AugmentedError<ApiType>;
      /**
       * Bad XCM origin.
       **/
      BadXcmOrigin: AugmentedError<ApiType>;
      /**
       * Failed to send XCM message.
       **/
      FailedToSend: AugmentedError<ApiType>;
      /**
       * Provided weight is possibly not enough to execute the message.
       **/
      WeightOverLimit: AugmentedError<ApiType>;
      /**
       * Generic error
       **/
      [key: string]: AugmentedError<ApiType>;
    };
    xTokens: {
      /**
       * Asset has no reserve location.
       **/
      AssetHasNoReserve: AugmentedError<ApiType>;
      /**
       * The specified index does not exist in a MultiAssets struct.
       **/
      AssetIndexNonExistent: AugmentedError<ApiType>;
      /**
       * The version of the `Versioned` value used is not able to be
       * interpreted.
       **/
      BadVersion: AugmentedError<ApiType>;
      /**
       * Could not re-anchor the assets to declare the fees for the
       * destination chain.
       **/
      CannotReanchor: AugmentedError<ApiType>;
      /**
       * The destination `MultiLocation` provided cannot be inverted.
       **/
      DestinationNotInvertible: AugmentedError<ApiType>;
      /**
       * We tried sending distinct asset and fee but they have different
       * reserve chains.
       **/
      DistinctReserveForAssetAndFee: AugmentedError<ApiType>;
      /**
       * Fee is not enough.
       **/
      FeeNotEnough: AugmentedError<ApiType>;
      /**
       * Could not get ancestry of asset reserve location.
       **/
      InvalidAncestry: AugmentedError<ApiType>;
      /**
       * The MultiAsset is invalid.
       **/
      InvalidAsset: AugmentedError<ApiType>;
      /**
       * Invalid transfer destination.
       **/
      InvalidDest: AugmentedError<ApiType>;
      /**
       * MinXcmFee not registered for certain reserve location
       **/
      MinXcmFeeNotDefined: AugmentedError<ApiType>;
      /**
       * Not cross-chain transfer.
       **/
      NotCrossChainTransfer: AugmentedError<ApiType>;
      /**
       * Currency is not cross-chain transferable.
       **/
      NotCrossChainTransferableCurrency: AugmentedError<ApiType>;
      /**
       * Not supported MultiLocation
       **/
      NotSupportedMultiLocation: AugmentedError<ApiType>;
      /**
       * The number of assets to be sent is over the maximum.
       **/
      TooManyAssetsBeingSent: AugmentedError<ApiType>;
      /**
       * The message's weight could not be determined.
       **/
      UnweighableMessage: AugmentedError<ApiType>;
      /**
       * XCM execution failed.
       **/
      XcmExecutionFailed: AugmentedError<ApiType>;
      /**
       * The transfering asset amount is zero.
       **/
      ZeroAmount: AugmentedError<ApiType>;
      /**
       * The fee is zero.
       **/
      ZeroFee: AugmentedError<ApiType>;
      /**
       * Generic error
       **/
      [key: string]: AugmentedError<ApiType>;
    };
  } // AugmentedErrors
} // declare module
