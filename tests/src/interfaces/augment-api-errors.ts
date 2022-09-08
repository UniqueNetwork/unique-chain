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
       * Errors caused by incorrect actions with a locked balance.
       **/
      IncorrectLockedBalanceOperation: AugmentedError<ApiType>;
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
       * Beneficiary account must pre-exist
       **/
      DeadAccount: AugmentedError<ApiType>;
      /**
       * Value too low to create account due to existential deposit
       **/
      ExistentialDeposit: AugmentedError<ApiType>;
      /**
       * A vesting schedule already exists for this account
       **/
      ExistingVestingSchedule: AugmentedError<ApiType>;
      /**
       * Balance too low to send value
       **/
      InsufficientBalance: AugmentedError<ApiType>;
      /**
       * Transfer/payment would kill account
       **/
      KeepAlive: AugmentedError<ApiType>;
      /**
       * Account liquidity restrictions prevent withdrawal
       **/
      LiquidityRestrictions: AugmentedError<ApiType>;
      /**
       * Number of named reserves exceed MaxReserves
       **/
      TooManyReserves: AugmentedError<ApiType>;
      /**
       * Vesting balance too high to send value
       **/
      VestingBalance: AugmentedError<ApiType>;
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
       * Empty property keys are forbidden
       **/
      EmptyPropertyKey: AugmentedError<ApiType>;
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
       * Fungible tokens hold no ID, and the default value of TokenId for Fungible collection is 0.
       **/
      FungibleItemsHaveNoId: AugmentedError<ApiType>;
      /**
       * Not Fungible item data used to mint in Fungible collection.
       **/
      NotFungibleDataUsedToMintFungibleCollectionToken: AugmentedError<ApiType>;
      /**
       * Setting item properties is not allowed.
       **/
      SettingPropertiesNotAllowed: AugmentedError<ApiType>;
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
       * The inherent which supplies the host configuration did not run this block
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
       * Attempt to upgrade validation function while existing upgrade pending
       **/
      OverlappingUpgrades: AugmentedError<ApiType>;
      /**
       * Polkadot currently prohibits this parachain from upgrading its validation function
       **/
      ProhibitedByPolkadot: AugmentedError<ApiType>;
      /**
       * The supplied validation function has compiled into a blob larger than Polkadot is
       * willing to run
       **/
      TooBig: AugmentedError<ApiType>;
      /**
       * The given code upgrade has not been authorized.
       **/
      Unauthorized: AugmentedError<ApiType>;
      /**
       * The inherent which supplies the validation data did not run this block
       **/
      ValidationDataNotAvailable: AugmentedError<ApiType>;
      /**
       * Generic error
       **/
      [key: string]: AugmentedError<ApiType>;
    };
    polkadotXcm: {
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
       * The message execution fails the filter.
       **/
      Filtered: AugmentedError<ApiType>;
      /**
       * Origin is invalid for sending.
       **/
      InvalidOrigin: AugmentedError<ApiType>;
      /**
       * The referenced subscription could not be found.
       **/
      NoSubscription: AugmentedError<ApiType>;
      /**
       * There was some other issue (i.e. not to do with routing) in sending the message. Perhaps
       * a lack of space for buffering the message.
       **/
      SendFailure: AugmentedError<ApiType>;
      /**
       * Too many assets have been attempted for transfer.
       **/
      TooManyAssets: AugmentedError<ApiType>;
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
    rmrkCore: {
      /**
       * Not the target owner of the sent NFT.
       **/
      CannotAcceptNonOwnedNft: AugmentedError<ApiType>;
      /**
       * Not the target owner of the sent NFT.
       **/
      CannotRejectNonOwnedNft: AugmentedError<ApiType>;
      /**
       * NFT was not sent and is not pending.
       **/
      CannotRejectNonPendingNft: AugmentedError<ApiType>;
      /**
       * If an NFT is sent to a descendant, that would form a nesting loop, an ouroboros.
       * Sending to self is redundant.
       **/
      CannotSendToDescendentOrSelf: AugmentedError<ApiType>;
      /**
       * Too many tokens created in the collection, no new ones are allowed.
       **/
      CollectionFullOrLocked: AugmentedError<ApiType>;
      /**
       * Only destroying collections without tokens is allowed.
       **/
      CollectionNotEmpty: AugmentedError<ApiType>;
      /**
       * Collection does not exist, has a wrong type, or does not map to a Unique ID.
       **/
      CollectionUnknown: AugmentedError<ApiType>;
      /**
       * Property of the type of RMRK collection could not be read successfully.
       **/
      CorruptedCollectionType: AugmentedError<ApiType>;
      /**
       * Could not find an ID for a collection. It is likely there were too many collections created on the chain, causing an overflow.
       **/
      NoAvailableCollectionId: AugmentedError<ApiType>;
      /**
       * Token does not exist, or there is no suitable ID for it, likely too many tokens were created in a collection, causing an overflow.
       **/
      NoAvailableNftId: AugmentedError<ApiType>;
      /**
       * Could not find an ID for the resource. It is likely there were too many resources created on an NFT, causing an overflow.
       **/
      NoAvailableResourceId: AugmentedError<ApiType>;
      /**
       * Token is marked as non-transferable, and thus cannot be transferred.
       **/
      NonTransferable: AugmentedError<ApiType>;
      /**
       * No permission to perform action.
       **/
      NoPermission: AugmentedError<ApiType>;
      /**
       * No such resource found.
       **/
      ResourceDoesntExist: AugmentedError<ApiType>;
      /**
       * Resource is not pending for the operation.
       **/
      ResourceNotPending: AugmentedError<ApiType>;
      /**
       * Could not find a property by the supplied key.
       **/
      RmrkPropertyIsNotFound: AugmentedError<ApiType>;
      /**
       * Too many symbols supplied as the property key. The maximum is [256](up_data_structs::MAX_PROPERTY_KEY_LENGTH).
       **/
      RmrkPropertyKeyIsTooLong: AugmentedError<ApiType>;
      /**
       * Too many bytes supplied as the property value. The maximum is [32768](up_data_structs::MAX_PROPERTY_VALUE_LENGTH).
       **/
      RmrkPropertyValueIsTooLong: AugmentedError<ApiType>;
      /**
       * Something went wrong when decoding encoded data from the storage.
       * Perhaps, there was a wrong key supplied for the type, or the data was improperly stored.
       **/
      UnableToDecodeRmrkData: AugmentedError<ApiType>;
      /**
       * Generic error
       **/
      [key: string]: AugmentedError<ApiType>;
    };
    rmrkEquip: {
      /**
       * Base collection linked to this ID does not exist.
       **/
      BaseDoesntExist: AugmentedError<ApiType>;
      /**
       * No Theme named "default" is associated with the Base.
       **/
      NeedsDefaultThemeFirst: AugmentedError<ApiType>;
      /**
       * Could not find an ID for a Base collection. It is likely there were too many collections created on the chain, causing an overflow.
       **/
      NoAvailableBaseId: AugmentedError<ApiType>;
      /**
       * Could not find a suitable ID for a Part, likely too many Part tokens were created in the Base, causing an overflow
       **/
      NoAvailablePartId: AugmentedError<ApiType>;
      /**
       * Cannot assign equippables to a fixed Part.
       **/
      NoEquippableOnFixedPart: AugmentedError<ApiType>;
      /**
       * Part linked to this ID does not exist.
       **/
      PartDoesntExist: AugmentedError<ApiType>;
      /**
       * No permission to perform action.
       **/
      PermissionError: AugmentedError<ApiType>;
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
    structure: {
      /**
       * While nesting, reached the breadth limit of nesting, exceeding the provided budget.
       **/
      BreadthLimit: AugmentedError<ApiType>;
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
       * This address is not set as sponsor, use setCollectionSponsor first.
       **/
      ConfirmUnsetSponsorFail: AugmentedError<ApiType>;
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
  } // AugmentedErrors
} // declare module
