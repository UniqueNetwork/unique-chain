// Auto-generated via `yarn polkadot-types-from-defs`, do not edit
/* eslint-disable */

/* eslint-disable sort-keys */

export default {
  /**
   * Lookup3: frame_system::AccountInfo<Index, pallet_balances::AccountData<Balance>>
   **/
  FrameSystemAccountInfo: {
    nonce: 'u32',
    consumers: 'u32',
    providers: 'u32',
    sufficients: 'u32',
    data: 'PalletBalancesAccountData'
  },
  /**
   * Lookup5: pallet_balances::AccountData<Balance>
   **/
  PalletBalancesAccountData: {
    free: 'u128',
    reserved: 'u128',
    miscFrozen: 'u128',
    feeFrozen: 'u128'
  },
  /**
   * Lookup7: frame_support::dispatch::PerDispatchClass<sp_weights::weight_v2::Weight>
   **/
  FrameSupportDispatchPerDispatchClassWeight: {
    normal: 'Weight',
    operational: 'Weight',
    mandatory: 'Weight'
  },
  /**
   * Lookup12: sp_runtime::generic::digest::Digest
   **/
  SpRuntimeDigest: {
    logs: 'Vec<SpRuntimeDigestDigestItem>'
  },
  /**
   * Lookup14: sp_runtime::generic::digest::DigestItem
   **/
  SpRuntimeDigestDigestItem: {
    _enum: {
      Other: 'Bytes',
      __Unused1: 'Null',
      __Unused2: 'Null',
      __Unused3: 'Null',
      Consensus: '([u8;4],Bytes)',
      Seal: '([u8;4],Bytes)',
      PreRuntime: '([u8;4],Bytes)',
      __Unused7: 'Null',
      RuntimeEnvironmentUpdated: 'Null'
    }
  },
  /**
   * Lookup17: frame_system::EventRecord<opal_runtime::RuntimeEvent, primitive_types::H256>
   **/
  FrameSystemEventRecord: {
    phase: 'FrameSystemPhase',
    event: 'Event',
    topics: 'Vec<H256>'
  },
  /**
   * Lookup19: frame_system::pallet::Event<T>
   **/
  FrameSystemEvent: {
    _enum: {
      ExtrinsicSuccess: {
        dispatchInfo: 'FrameSupportDispatchDispatchInfo',
      },
      ExtrinsicFailed: {
        dispatchError: 'SpRuntimeDispatchError',
        dispatchInfo: 'FrameSupportDispatchDispatchInfo',
      },
      CodeUpdated: 'Null',
      NewAccount: {
        account: 'AccountId32',
      },
      KilledAccount: {
        account: 'AccountId32',
      },
      Remarked: {
        _alias: {
          hash_: 'hash',
        },
        sender: 'AccountId32',
        hash_: 'H256'
      }
    }
  },
  /**
   * Lookup20: frame_support::dispatch::DispatchInfo
   **/
  FrameSupportDispatchDispatchInfo: {
    weight: 'Weight',
    class: 'FrameSupportDispatchDispatchClass',
    paysFee: 'FrameSupportDispatchPays'
  },
  /**
   * Lookup21: frame_support::dispatch::DispatchClass
   **/
  FrameSupportDispatchDispatchClass: {
    _enum: ['Normal', 'Operational', 'Mandatory']
  },
  /**
   * Lookup22: frame_support::dispatch::Pays
   **/
  FrameSupportDispatchPays: {
    _enum: ['Yes', 'No']
  },
  /**
   * Lookup23: sp_runtime::DispatchError
   **/
  SpRuntimeDispatchError: {
    _enum: {
      Other: 'Null',
      CannotLookup: 'Null',
      BadOrigin: 'Null',
      Module: 'SpRuntimeModuleError',
      ConsumerRemaining: 'Null',
      NoProviders: 'Null',
      TooManyConsumers: 'Null',
      Token: 'SpRuntimeTokenError',
      Arithmetic: 'SpRuntimeArithmeticError',
      Transactional: 'SpRuntimeTransactionalError'
    }
  },
  /**
   * Lookup24: sp_runtime::ModuleError
   **/
  SpRuntimeModuleError: {
    index: 'u8',
    error: '[u8;4]'
  },
  /**
   * Lookup25: sp_runtime::TokenError
   **/
  SpRuntimeTokenError: {
    _enum: ['NoFunds', 'WouldDie', 'BelowMinimum', 'CannotCreate', 'UnknownAsset', 'Frozen', 'Unsupported']
  },
  /**
   * Lookup26: sp_runtime::ArithmeticError
   **/
  SpRuntimeArithmeticError: {
    _enum: ['Underflow', 'Overflow', 'DivisionByZero']
  },
  /**
   * Lookup27: sp_runtime::TransactionalError
   **/
  SpRuntimeTransactionalError: {
    _enum: ['LimitReached', 'NoLayer']
  },
  /**
   * Lookup28: cumulus_pallet_parachain_system::pallet::Event<T>
   **/
  CumulusPalletParachainSystemEvent: {
    _enum: {
      ValidationFunctionStored: 'Null',
      ValidationFunctionApplied: {
        relayChainBlockNum: 'u32',
      },
      ValidationFunctionDiscarded: 'Null',
      UpgradeAuthorized: {
        codeHash: 'H256',
      },
      DownwardMessagesReceived: {
        count: 'u32',
      },
      DownwardMessagesProcessed: {
        weightUsed: 'Weight',
        dmqHead: 'H256'
      }
    }
  },
  /**
   * Lookup29: pallet_balances::pallet::Event<T, I>
   **/
  PalletBalancesEvent: {
    _enum: {
      Endowed: {
        account: 'AccountId32',
        freeBalance: 'u128',
      },
      DustLost: {
        account: 'AccountId32',
        amount: 'u128',
      },
      Transfer: {
        from: 'AccountId32',
        to: 'AccountId32',
        amount: 'u128',
      },
      BalanceSet: {
        who: 'AccountId32',
        free: 'u128',
        reserved: 'u128',
      },
      Reserved: {
        who: 'AccountId32',
        amount: 'u128',
      },
      Unreserved: {
        who: 'AccountId32',
        amount: 'u128',
      },
      ReserveRepatriated: {
        from: 'AccountId32',
        to: 'AccountId32',
        amount: 'u128',
        destinationStatus: 'FrameSupportTokensMiscBalanceStatus',
      },
      Deposit: {
        who: 'AccountId32',
        amount: 'u128',
      },
      Withdraw: {
        who: 'AccountId32',
        amount: 'u128',
      },
      Slashed: {
        who: 'AccountId32',
        amount: 'u128'
      }
    }
  },
  /**
   * Lookup30: frame_support::traits::tokens::misc::BalanceStatus
   **/
  FrameSupportTokensMiscBalanceStatus: {
    _enum: ['Free', 'Reserved']
  },
  /**
   * Lookup31: pallet_transaction_payment::pallet::Event<T>
   **/
  PalletTransactionPaymentEvent: {
    _enum: {
      TransactionFeePaid: {
        who: 'AccountId32',
        actualFee: 'u128',
        tip: 'u128'
      }
    }
  },
  /**
   * Lookup32: pallet_treasury::pallet::Event<T, I>
   **/
  PalletTreasuryEvent: {
    _enum: {
      Proposed: {
        proposalIndex: 'u32',
      },
      Spending: {
        budgetRemaining: 'u128',
      },
      Awarded: {
        proposalIndex: 'u32',
        award: 'u128',
        account: 'AccountId32',
      },
      Rejected: {
        proposalIndex: 'u32',
        slashed: 'u128',
      },
      Burnt: {
        burntFunds: 'u128',
      },
      Rollover: {
        rolloverBalance: 'u128',
      },
      Deposit: {
        value: 'u128',
      },
      SpendApproved: {
        proposalIndex: 'u32',
        amount: 'u128',
        beneficiary: 'AccountId32'
      }
    }
  },
  /**
   * Lookup33: pallet_sudo::pallet::Event<T>
   **/
  PalletSudoEvent: {
    _enum: {
      Sudid: {
        sudoResult: 'Result<Null, SpRuntimeDispatchError>',
      },
      KeyChanged: {
        oldSudoer: 'Option<AccountId32>',
      },
      SudoAsDone: {
        sudoResult: 'Result<Null, SpRuntimeDispatchError>'
      }
    }
  },
  /**
   * Lookup37: orml_vesting::module::Event<T>
   **/
  OrmlVestingModuleEvent: {
    _enum: {
      VestingScheduleAdded: {
        from: 'AccountId32',
        to: 'AccountId32',
        vestingSchedule: 'OrmlVestingVestingSchedule',
      },
      Claimed: {
        who: 'AccountId32',
        amount: 'u128',
      },
      VestingSchedulesUpdated: {
        who: 'AccountId32'
      }
    }
  },
  /**
   * Lookup38: orml_vesting::VestingSchedule<BlockNumber, Balance>
   **/
  OrmlVestingVestingSchedule: {
    start: 'u32',
    period: 'u32',
    periodCount: 'u32',
    perPeriod: 'Compact<u128>'
  },
  /**
   * Lookup40: orml_xtokens::module::Event<T>
   **/
  OrmlXtokensModuleEvent: {
    _enum: {
      TransferredMultiAssets: {
        sender: 'AccountId32',
        assets: 'XcmV1MultiassetMultiAssets',
        fee: 'XcmV1MultiAsset',
        dest: 'XcmV1MultiLocation'
      }
    }
  },
  /**
   * Lookup41: xcm::v1::multiasset::MultiAssets
   **/
  XcmV1MultiassetMultiAssets: 'Vec<XcmV1MultiAsset>',
  /**
   * Lookup43: xcm::v1::multiasset::MultiAsset
   **/
  XcmV1MultiAsset: {
    id: 'XcmV1MultiassetAssetId',
    fun: 'XcmV1MultiassetFungibility'
  },
  /**
   * Lookup44: xcm::v1::multiasset::AssetId
   **/
  XcmV1MultiassetAssetId: {
    _enum: {
      Concrete: 'XcmV1MultiLocation',
      Abstract: 'Bytes'
    }
  },
  /**
   * Lookup45: xcm::v1::multilocation::MultiLocation
   **/
  XcmV1MultiLocation: {
    parents: 'u8',
    interior: 'XcmV1MultilocationJunctions'
  },
  /**
   * Lookup46: xcm::v1::multilocation::Junctions
   **/
  XcmV1MultilocationJunctions: {
    _enum: {
      Here: 'Null',
      X1: 'XcmV1Junction',
      X2: '(XcmV1Junction,XcmV1Junction)',
      X3: '(XcmV1Junction,XcmV1Junction,XcmV1Junction)',
      X4: '(XcmV1Junction,XcmV1Junction,XcmV1Junction,XcmV1Junction)',
      X5: '(XcmV1Junction,XcmV1Junction,XcmV1Junction,XcmV1Junction,XcmV1Junction)',
      X6: '(XcmV1Junction,XcmV1Junction,XcmV1Junction,XcmV1Junction,XcmV1Junction,XcmV1Junction)',
      X7: '(XcmV1Junction,XcmV1Junction,XcmV1Junction,XcmV1Junction,XcmV1Junction,XcmV1Junction,XcmV1Junction)',
      X8: '(XcmV1Junction,XcmV1Junction,XcmV1Junction,XcmV1Junction,XcmV1Junction,XcmV1Junction,XcmV1Junction,XcmV1Junction)'
    }
  },
  /**
   * Lookup47: xcm::v1::junction::Junction
   **/
  XcmV1Junction: {
    _enum: {
      Parachain: 'Compact<u32>',
      AccountId32: {
        network: 'XcmV0JunctionNetworkId',
        id: '[u8;32]',
      },
      AccountIndex64: {
        network: 'XcmV0JunctionNetworkId',
        index: 'Compact<u64>',
      },
      AccountKey20: {
        network: 'XcmV0JunctionNetworkId',
        key: '[u8;20]',
      },
      PalletInstance: 'u8',
      GeneralIndex: 'Compact<u128>',
      GeneralKey: 'Bytes',
      OnlyChild: 'Null',
      Plurality: {
        id: 'XcmV0JunctionBodyId',
        part: 'XcmV0JunctionBodyPart'
      }
    }
  },
  /**
   * Lookup49: xcm::v0::junction::NetworkId
   **/
  XcmV0JunctionNetworkId: {
    _enum: {
      Any: 'Null',
      Named: 'Bytes',
      Polkadot: 'Null',
      Kusama: 'Null'
    }
  },
  /**
   * Lookup53: xcm::v0::junction::BodyId
   **/
  XcmV0JunctionBodyId: {
    _enum: {
      Unit: 'Null',
      Named: 'Bytes',
      Index: 'Compact<u32>',
      Executive: 'Null',
      Technical: 'Null',
      Legislative: 'Null',
      Judicial: 'Null'
    }
  },
  /**
   * Lookup54: xcm::v0::junction::BodyPart
   **/
  XcmV0JunctionBodyPart: {
    _enum: {
      Voice: 'Null',
      Members: {
        count: 'Compact<u32>',
      },
      Fraction: {
        nom: 'Compact<u32>',
        denom: 'Compact<u32>',
      },
      AtLeastProportion: {
        nom: 'Compact<u32>',
        denom: 'Compact<u32>',
      },
      MoreThanProportion: {
        nom: 'Compact<u32>',
        denom: 'Compact<u32>'
      }
    }
  },
  /**
   * Lookup55: xcm::v1::multiasset::Fungibility
   **/
  XcmV1MultiassetFungibility: {
    _enum: {
      Fungible: 'Compact<u128>',
      NonFungible: 'XcmV1MultiassetAssetInstance'
    }
  },
  /**
   * Lookup56: xcm::v1::multiasset::AssetInstance
   **/
  XcmV1MultiassetAssetInstance: {
    _enum: {
      Undefined: 'Null',
      Index: 'Compact<u128>',
      Array4: '[u8;4]',
      Array8: '[u8;8]',
      Array16: '[u8;16]',
      Array32: '[u8;32]',
      Blob: 'Bytes'
    }
  },
  /**
   * Lookup59: orml_tokens::module::Event<T>
   **/
  OrmlTokensModuleEvent: {
    _enum: {
      Endowed: {
        currencyId: 'PalletForeignAssetsAssetIds',
        who: 'AccountId32',
        amount: 'u128',
      },
      DustLost: {
        currencyId: 'PalletForeignAssetsAssetIds',
        who: 'AccountId32',
        amount: 'u128',
      },
      Transfer: {
        currencyId: 'PalletForeignAssetsAssetIds',
        from: 'AccountId32',
        to: 'AccountId32',
        amount: 'u128',
      },
      Reserved: {
        currencyId: 'PalletForeignAssetsAssetIds',
        who: 'AccountId32',
        amount: 'u128',
      },
      Unreserved: {
        currencyId: 'PalletForeignAssetsAssetIds',
        who: 'AccountId32',
        amount: 'u128',
      },
      ReserveRepatriated: {
        currencyId: 'PalletForeignAssetsAssetIds',
        from: 'AccountId32',
        to: 'AccountId32',
        amount: 'u128',
        status: 'FrameSupportTokensMiscBalanceStatus',
      },
      BalanceSet: {
        currencyId: 'PalletForeignAssetsAssetIds',
        who: 'AccountId32',
        free: 'u128',
        reserved: 'u128',
      },
      TotalIssuanceSet: {
        currencyId: 'PalletForeignAssetsAssetIds',
        amount: 'u128',
      },
      Withdrawn: {
        currencyId: 'PalletForeignAssetsAssetIds',
        who: 'AccountId32',
        amount: 'u128',
      },
      Slashed: {
        currencyId: 'PalletForeignAssetsAssetIds',
        who: 'AccountId32',
        freeAmount: 'u128',
        reservedAmount: 'u128',
      },
      Deposited: {
        currencyId: 'PalletForeignAssetsAssetIds',
        who: 'AccountId32',
        amount: 'u128',
      },
      LockSet: {
        lockId: '[u8;8]',
        currencyId: 'PalletForeignAssetsAssetIds',
        who: 'AccountId32',
        amount: 'u128',
      },
      LockRemoved: {
        lockId: '[u8;8]',
        currencyId: 'PalletForeignAssetsAssetIds',
        who: 'AccountId32'
      }
    }
  },
  /**
   * Lookup60: pallet_foreign_assets::AssetIds
   **/
  PalletForeignAssetsAssetIds: {
    _enum: {
      ForeignAssetId: 'u32',
      NativeAssetId: 'PalletForeignAssetsNativeCurrency'
    }
  },
  /**
   * Lookup61: pallet_foreign_assets::NativeCurrency
   **/
  PalletForeignAssetsNativeCurrency: {
    _enum: ['Here', 'Parent']
  },
  /**
   * Lookup62: cumulus_pallet_xcmp_queue::pallet::Event<T>
   **/
  CumulusPalletXcmpQueueEvent: {
    _enum: {
      Success: {
        messageHash: 'Option<H256>',
        weight: 'Weight',
      },
      Fail: {
        messageHash: 'Option<H256>',
        error: 'XcmV2TraitsError',
        weight: 'Weight',
      },
      BadVersion: {
        messageHash: 'Option<H256>',
      },
      BadFormat: {
        messageHash: 'Option<H256>',
      },
      UpwardMessageSent: {
        messageHash: 'Option<H256>',
      },
      XcmpMessageSent: {
        messageHash: 'Option<H256>',
      },
      OverweightEnqueued: {
        sender: 'u32',
        sentAt: 'u32',
        index: 'u64',
        required: 'Weight',
      },
      OverweightServiced: {
        index: 'u64',
        used: 'Weight'
      }
    }
  },
  /**
   * Lookup64: xcm::v2::traits::Error
   **/
  XcmV2TraitsError: {
    _enum: {
      Overflow: 'Null',
      Unimplemented: 'Null',
      UntrustedReserveLocation: 'Null',
      UntrustedTeleportLocation: 'Null',
      MultiLocationFull: 'Null',
      MultiLocationNotInvertible: 'Null',
      BadOrigin: 'Null',
      InvalidLocation: 'Null',
      AssetNotFound: 'Null',
      FailedToTransactAsset: 'Null',
      NotWithdrawable: 'Null',
      LocationCannotHold: 'Null',
      ExceedsMaxMessageSize: 'Null',
      DestinationUnsupported: 'Null',
      Transport: 'Null',
      Unroutable: 'Null',
      UnknownClaim: 'Null',
      FailedToDecode: 'Null',
      MaxWeightInvalid: 'Null',
      NotHoldingFees: 'Null',
      TooExpensive: 'Null',
      Trap: 'u64',
      UnhandledXcmVersion: 'Null',
      WeightLimitReached: 'u64',
      Barrier: 'Null',
      WeightNotComputable: 'Null'
    }
  },
  /**
   * Lookup66: pallet_xcm::pallet::Event<T>
   **/
  PalletXcmEvent: {
    _enum: {
      Attempted: 'XcmV2TraitsOutcome',
      Sent: '(XcmV1MultiLocation,XcmV1MultiLocation,XcmV2Xcm)',
      UnexpectedResponse: '(XcmV1MultiLocation,u64)',
      ResponseReady: '(u64,XcmV2Response)',
      Notified: '(u64,u8,u8)',
      NotifyOverweight: '(u64,u8,u8,Weight,Weight)',
      NotifyDispatchError: '(u64,u8,u8)',
      NotifyDecodeFailed: '(u64,u8,u8)',
      InvalidResponder: '(XcmV1MultiLocation,u64,Option<XcmV1MultiLocation>)',
      InvalidResponderVersion: '(XcmV1MultiLocation,u64)',
      ResponseTaken: 'u64',
      AssetsTrapped: '(H256,XcmV1MultiLocation,XcmVersionedMultiAssets)',
      VersionChangeNotified: '(XcmV1MultiLocation,u32)',
      SupportedVersionChanged: '(XcmV1MultiLocation,u32)',
      NotifyTargetSendFail: '(XcmV1MultiLocation,u64,XcmV2TraitsError)',
      NotifyTargetMigrationFail: '(XcmVersionedMultiLocation,u64)'
    }
  },
  /**
   * Lookup67: xcm::v2::traits::Outcome
   **/
  XcmV2TraitsOutcome: {
    _enum: {
      Complete: 'u64',
      Incomplete: '(u64,XcmV2TraitsError)',
      Error: 'XcmV2TraitsError'
    }
  },
  /**
   * Lookup68: xcm::v2::Xcm<RuntimeCall>
   **/
  XcmV2Xcm: 'Vec<XcmV2Instruction>',
  /**
   * Lookup70: xcm::v2::Instruction<RuntimeCall>
   **/
  XcmV2Instruction: {
    _enum: {
      WithdrawAsset: 'XcmV1MultiassetMultiAssets',
      ReserveAssetDeposited: 'XcmV1MultiassetMultiAssets',
      ReceiveTeleportedAsset: 'XcmV1MultiassetMultiAssets',
      QueryResponse: {
        queryId: 'Compact<u64>',
        response: 'XcmV2Response',
        maxWeight: 'Compact<u64>',
      },
      TransferAsset: {
        assets: 'XcmV1MultiassetMultiAssets',
        beneficiary: 'XcmV1MultiLocation',
      },
      TransferReserveAsset: {
        assets: 'XcmV1MultiassetMultiAssets',
        dest: 'XcmV1MultiLocation',
        xcm: 'XcmV2Xcm',
      },
      Transact: {
        originType: 'XcmV0OriginKind',
        requireWeightAtMost: 'Compact<u64>',
        call: 'XcmDoubleEncoded',
      },
      HrmpNewChannelOpenRequest: {
        sender: 'Compact<u32>',
        maxMessageSize: 'Compact<u32>',
        maxCapacity: 'Compact<u32>',
      },
      HrmpChannelAccepted: {
        recipient: 'Compact<u32>',
      },
      HrmpChannelClosing: {
        initiator: 'Compact<u32>',
        sender: 'Compact<u32>',
        recipient: 'Compact<u32>',
      },
      ClearOrigin: 'Null',
      DescendOrigin: 'XcmV1MultilocationJunctions',
      ReportError: {
        queryId: 'Compact<u64>',
        dest: 'XcmV1MultiLocation',
        maxResponseWeight: 'Compact<u64>',
      },
      DepositAsset: {
        assets: 'XcmV1MultiassetMultiAssetFilter',
        maxAssets: 'Compact<u32>',
        beneficiary: 'XcmV1MultiLocation',
      },
      DepositReserveAsset: {
        assets: 'XcmV1MultiassetMultiAssetFilter',
        maxAssets: 'Compact<u32>',
        dest: 'XcmV1MultiLocation',
        xcm: 'XcmV2Xcm',
      },
      ExchangeAsset: {
        give: 'XcmV1MultiassetMultiAssetFilter',
        receive: 'XcmV1MultiassetMultiAssets',
      },
      InitiateReserveWithdraw: {
        assets: 'XcmV1MultiassetMultiAssetFilter',
        reserve: 'XcmV1MultiLocation',
        xcm: 'XcmV2Xcm',
      },
      InitiateTeleport: {
        assets: 'XcmV1MultiassetMultiAssetFilter',
        dest: 'XcmV1MultiLocation',
        xcm: 'XcmV2Xcm',
      },
      QueryHolding: {
        queryId: 'Compact<u64>',
        dest: 'XcmV1MultiLocation',
        assets: 'XcmV1MultiassetMultiAssetFilter',
        maxResponseWeight: 'Compact<u64>',
      },
      BuyExecution: {
        fees: 'XcmV1MultiAsset',
        weightLimit: 'XcmV2WeightLimit',
      },
      RefundSurplus: 'Null',
      SetErrorHandler: 'XcmV2Xcm',
      SetAppendix: 'XcmV2Xcm',
      ClearError: 'Null',
      ClaimAsset: {
        assets: 'XcmV1MultiassetMultiAssets',
        ticket: 'XcmV1MultiLocation',
      },
      Trap: 'Compact<u64>',
      SubscribeVersion: {
        queryId: 'Compact<u64>',
        maxResponseWeight: 'Compact<u64>',
      },
      UnsubscribeVersion: 'Null'
    }
  },
  /**
   * Lookup71: xcm::v2::Response
   **/
  XcmV2Response: {
    _enum: {
      Null: 'Null',
      Assets: 'XcmV1MultiassetMultiAssets',
      ExecutionResult: 'Option<(u32,XcmV2TraitsError)>',
      Version: 'u32'
    }
  },
  /**
   * Lookup74: xcm::v0::OriginKind
   **/
  XcmV0OriginKind: {
    _enum: ['Native', 'SovereignAccount', 'Superuser', 'Xcm']
  },
  /**
   * Lookup75: xcm::double_encoded::DoubleEncoded<T>
   **/
  XcmDoubleEncoded: {
    encoded: 'Bytes'
  },
  /**
   * Lookup76: xcm::v1::multiasset::MultiAssetFilter
   **/
  XcmV1MultiassetMultiAssetFilter: {
    _enum: {
      Definite: 'XcmV1MultiassetMultiAssets',
      Wild: 'XcmV1MultiassetWildMultiAsset'
    }
  },
  /**
   * Lookup77: xcm::v1::multiasset::WildMultiAsset
   **/
  XcmV1MultiassetWildMultiAsset: {
    _enum: {
      All: 'Null',
      AllOf: {
        id: 'XcmV1MultiassetAssetId',
        fun: 'XcmV1MultiassetWildFungibility'
      }
    }
  },
  /**
   * Lookup78: xcm::v1::multiasset::WildFungibility
   **/
  XcmV1MultiassetWildFungibility: {
    _enum: ['Fungible', 'NonFungible']
  },
  /**
   * Lookup79: xcm::v2::WeightLimit
   **/
  XcmV2WeightLimit: {
    _enum: {
      Unlimited: 'Null',
      Limited: 'Compact<u64>'
    }
  },
  /**
   * Lookup81: xcm::VersionedMultiAssets
   **/
  XcmVersionedMultiAssets: {
    _enum: {
      V0: 'Vec<XcmV0MultiAsset>',
      V1: 'XcmV1MultiassetMultiAssets'
    }
  },
  /**
   * Lookup83: xcm::v0::multi_asset::MultiAsset
   **/
  XcmV0MultiAsset: {
    _enum: {
      None: 'Null',
      All: 'Null',
      AllFungible: 'Null',
      AllNonFungible: 'Null',
      AllAbstractFungible: {
        id: 'Bytes',
      },
      AllAbstractNonFungible: {
        class: 'Bytes',
      },
      AllConcreteFungible: {
        id: 'XcmV0MultiLocation',
      },
      AllConcreteNonFungible: {
        class: 'XcmV0MultiLocation',
      },
      AbstractFungible: {
        id: 'Bytes',
        amount: 'Compact<u128>',
      },
      AbstractNonFungible: {
        class: 'Bytes',
        instance: 'XcmV1MultiassetAssetInstance',
      },
      ConcreteFungible: {
        id: 'XcmV0MultiLocation',
        amount: 'Compact<u128>',
      },
      ConcreteNonFungible: {
        class: 'XcmV0MultiLocation',
        instance: 'XcmV1MultiassetAssetInstance'
      }
    }
  },
  /**
   * Lookup84: xcm::v0::multi_location::MultiLocation
   **/
  XcmV0MultiLocation: {
    _enum: {
      Null: 'Null',
      X1: 'XcmV0Junction',
      X2: '(XcmV0Junction,XcmV0Junction)',
      X3: '(XcmV0Junction,XcmV0Junction,XcmV0Junction)',
      X4: '(XcmV0Junction,XcmV0Junction,XcmV0Junction,XcmV0Junction)',
      X5: '(XcmV0Junction,XcmV0Junction,XcmV0Junction,XcmV0Junction,XcmV0Junction)',
      X6: '(XcmV0Junction,XcmV0Junction,XcmV0Junction,XcmV0Junction,XcmV0Junction,XcmV0Junction)',
      X7: '(XcmV0Junction,XcmV0Junction,XcmV0Junction,XcmV0Junction,XcmV0Junction,XcmV0Junction,XcmV0Junction)',
      X8: '(XcmV0Junction,XcmV0Junction,XcmV0Junction,XcmV0Junction,XcmV0Junction,XcmV0Junction,XcmV0Junction,XcmV0Junction)'
    }
  },
  /**
   * Lookup85: xcm::v0::junction::Junction
   **/
  XcmV0Junction: {
    _enum: {
      Parent: 'Null',
      Parachain: 'Compact<u32>',
      AccountId32: {
        network: 'XcmV0JunctionNetworkId',
        id: '[u8;32]',
      },
      AccountIndex64: {
        network: 'XcmV0JunctionNetworkId',
        index: 'Compact<u64>',
      },
      AccountKey20: {
        network: 'XcmV0JunctionNetworkId',
        key: '[u8;20]',
      },
      PalletInstance: 'u8',
      GeneralIndex: 'Compact<u128>',
      GeneralKey: 'Bytes',
      OnlyChild: 'Null',
      Plurality: {
        id: 'XcmV0JunctionBodyId',
        part: 'XcmV0JunctionBodyPart'
      }
    }
  },
  /**
   * Lookup86: xcm::VersionedMultiLocation
   **/
  XcmVersionedMultiLocation: {
    _enum: {
      V0: 'XcmV0MultiLocation',
      V1: 'XcmV1MultiLocation'
    }
  },
  /**
   * Lookup87: cumulus_pallet_xcm::pallet::Event<T>
   **/
  CumulusPalletXcmEvent: {
    _enum: {
      InvalidFormat: '[u8;8]',
      UnsupportedVersion: '[u8;8]',
      ExecutedDownward: '([u8;8],XcmV2TraitsOutcome)'
    }
  },
  /**
   * Lookup88: cumulus_pallet_dmp_queue::pallet::Event<T>
   **/
  CumulusPalletDmpQueueEvent: {
    _enum: {
      InvalidFormat: {
        messageId: '[u8;32]',
      },
      UnsupportedVersion: {
        messageId: '[u8;32]',
      },
      ExecutedDownward: {
        messageId: '[u8;32]',
        outcome: 'XcmV2TraitsOutcome',
      },
      WeightExhausted: {
        messageId: '[u8;32]',
        remainingWeight: 'Weight',
        requiredWeight: 'Weight',
      },
      OverweightEnqueued: {
        messageId: '[u8;32]',
        overweightIndex: 'u64',
        requiredWeight: 'Weight',
      },
      OverweightServiced: {
        overweightIndex: 'u64',
        weightUsed: 'Weight'
      }
    }
  },
  /**
   * Lookup89: pallet_unique::RawEvent<sp_core::crypto::AccountId32, pallet_evm::account::BasicCrossAccountIdRepr<sp_core::crypto::AccountId32>>
   **/
  PalletUniqueRawEvent: {
    _enum: {
      CollectionSponsorRemoved: 'u32',
      CollectionAdminAdded: '(u32,PalletEvmAccountBasicCrossAccountIdRepr)',
      CollectionOwnedChanged: '(u32,AccountId32)',
      CollectionSponsorSet: '(u32,AccountId32)',
      SponsorshipConfirmed: '(u32,AccountId32)',
      CollectionAdminRemoved: '(u32,PalletEvmAccountBasicCrossAccountIdRepr)',
      AllowListAddressRemoved: '(u32,PalletEvmAccountBasicCrossAccountIdRepr)',
      AllowListAddressAdded: '(u32,PalletEvmAccountBasicCrossAccountIdRepr)',
      CollectionLimitSet: 'u32',
      CollectionPermissionSet: 'u32'
    }
  },
  /**
   * Lookup90: pallet_evm::account::BasicCrossAccountIdRepr<sp_core::crypto::AccountId32>
   **/
  PalletEvmAccountBasicCrossAccountIdRepr: {
    _enum: {
      Substrate: 'AccountId32',
      Ethereum: 'H160'
    }
  },
  /**
   * Lookup93: pallet_common::pallet::Event<T>
   **/
  PalletCommonEvent: {
    _enum: {
      CollectionCreated: '(u32,u8,AccountId32)',
      CollectionDestroyed: 'u32',
      ItemCreated: '(u32,u32,PalletEvmAccountBasicCrossAccountIdRepr,u128)',
      ItemDestroyed: '(u32,u32,PalletEvmAccountBasicCrossAccountIdRepr,u128)',
      Transfer: '(u32,u32,PalletEvmAccountBasicCrossAccountIdRepr,PalletEvmAccountBasicCrossAccountIdRepr,u128)',
      Approved: '(u32,u32,PalletEvmAccountBasicCrossAccountIdRepr,PalletEvmAccountBasicCrossAccountIdRepr,u128)',
      CollectionPropertySet: '(u32,Bytes)',
      CollectionPropertyDeleted: '(u32,Bytes)',
      TokenPropertySet: '(u32,u32,Bytes)',
      TokenPropertyDeleted: '(u32,u32,Bytes)',
      PropertyPermissionSet: '(u32,Bytes)'
    }
  },
  /**
   * Lookup96: pallet_structure::pallet::Event<T>
   **/
  PalletStructureEvent: {
    _enum: {
      Executed: 'Result<Null, SpRuntimeDispatchError>'
    }
  },
  /**
   * Lookup97: pallet_app_promotion::pallet::Event<T>
   **/
  PalletAppPromotionEvent: {
    _enum: {
      StakingRecalculation: '(AccountId32,u128,u128)',
      Stake: '(AccountId32,u128)',
      Unstake: '(AccountId32,u128)',
      SetAdmin: 'AccountId32'
    }
  },
  /**
   * Lookup98: pallet_foreign_assets::module::Event<T>
   **/
  PalletForeignAssetsModuleEvent: {
    _enum: {
      ForeignAssetRegistered: {
        assetId: 'u32',
        assetAddress: 'XcmV1MultiLocation',
        metadata: 'PalletForeignAssetsModuleAssetMetadata',
      },
      ForeignAssetUpdated: {
        assetId: 'u32',
        assetAddress: 'XcmV1MultiLocation',
        metadata: 'PalletForeignAssetsModuleAssetMetadata',
      },
      AssetRegistered: {
        assetId: 'PalletForeignAssetsAssetIds',
        metadata: 'PalletForeignAssetsModuleAssetMetadata',
      },
      AssetUpdated: {
        assetId: 'PalletForeignAssetsAssetIds',
        metadata: 'PalletForeignAssetsModuleAssetMetadata'
      }
    }
  },
  /**
   * Lookup99: pallet_foreign_assets::module::AssetMetadata<Balance>
   **/
  PalletForeignAssetsModuleAssetMetadata: {
    name: 'Bytes',
    symbol: 'Bytes',
    decimals: 'u8',
    minimalBalance: 'u128'
  },
  /**
   * Lookup100: pallet_evm::pallet::Event<T>
   **/
  PalletEvmEvent: {
    _enum: {
      Log: 'EthereumLog',
      Created: 'H160',
      CreatedFailed: 'H160',
      Executed: 'H160',
      ExecutedFailed: 'H160',
      BalanceDeposit: '(AccountId32,H160,U256)',
      BalanceWithdraw: '(AccountId32,H160,U256)'
    }
  },
  /**
   * Lookup101: ethereum::log::Log
   **/
  EthereumLog: {
    address: 'H160',
    topics: 'Vec<H256>',
    data: 'Bytes'
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup116: pallet_ethereum::pallet::Event
=======
<<<<<<< HEAD
   * Lookup114: pallet_ethereum::pallet::Event
=======
   * Lookup109: pallet_ethereum::pallet::Event
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
   * Lookup103: pallet_ethereum::pallet::Event
>>>>>>> ec6ecdbe... chore: regenerate types
   **/
  PalletEthereumEvent: {
    _enum: {
      Executed: '(H160,H160,H256,EvmCoreErrorExitReason)'
    }
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup117: evm_core::error::ExitReason
=======
<<<<<<< HEAD
   * Lookup115: evm_core::error::ExitReason
=======
   * Lookup110: evm_core::error::ExitReason
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
   * Lookup104: evm_core::error::ExitReason
>>>>>>> ec6ecdbe... chore: regenerate types
   **/
  EvmCoreErrorExitReason: {
    _enum: {
      Succeed: 'EvmCoreErrorExitSucceed',
      Error: 'EvmCoreErrorExitError',
      Revert: 'EvmCoreErrorExitRevert',
      Fatal: 'EvmCoreErrorExitFatal'
    }
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup118: evm_core::error::ExitSucceed
=======
<<<<<<< HEAD
   * Lookup116: evm_core::error::ExitSucceed
=======
   * Lookup111: evm_core::error::ExitSucceed
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
   * Lookup105: evm_core::error::ExitSucceed
>>>>>>> ec6ecdbe... chore: regenerate types
   **/
  EvmCoreErrorExitSucceed: {
    _enum: ['Stopped', 'Returned', 'Suicided']
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup119: evm_core::error::ExitError
=======
<<<<<<< HEAD
   * Lookup117: evm_core::error::ExitError
=======
   * Lookup112: evm_core::error::ExitError
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
   * Lookup106: evm_core::error::ExitError
>>>>>>> ec6ecdbe... chore: regenerate types
   **/
  EvmCoreErrorExitError: {
    _enum: {
      StackUnderflow: 'Null',
      StackOverflow: 'Null',
      InvalidJump: 'Null',
      InvalidRange: 'Null',
      DesignatedInvalid: 'Null',
      CallTooDeep: 'Null',
      CreateCollision: 'Null',
      CreateContractLimit: 'Null',
      OutOfOffset: 'Null',
      OutOfGas: 'Null',
      OutOfFund: 'Null',
      PCUnderflow: 'Null',
      CreateEmpty: 'Null',
      Other: 'Text',
      InvalidCode: 'Null'
    }
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup122: evm_core::error::ExitRevert
=======
<<<<<<< HEAD
   * Lookup120: evm_core::error::ExitRevert
=======
   * Lookup115: evm_core::error::ExitRevert
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
   * Lookup109: evm_core::error::ExitRevert
>>>>>>> ec6ecdbe... chore: regenerate types
   **/
  EvmCoreErrorExitRevert: {
    _enum: ['Reverted']
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup123: evm_core::error::ExitFatal
=======
<<<<<<< HEAD
   * Lookup121: evm_core::error::ExitFatal
=======
   * Lookup116: evm_core::error::ExitFatal
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
   * Lookup110: evm_core::error::ExitFatal
>>>>>>> ec6ecdbe... chore: regenerate types
   **/
  EvmCoreErrorExitFatal: {
    _enum: {
      NotSupported: 'Null',
      UnhandledInterrupt: 'Null',
      CallErrorAsFatal: 'EvmCoreErrorExitError',
      Other: 'Text'
    }
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup124: pallet_evm_contract_helpers::pallet::Event<T>
=======
<<<<<<< HEAD
   * Lookup122: pallet_evm_contract_helpers::pallet::Event<T>
=======
   * Lookup117: pallet_evm_contract_helpers::pallet::Event<T>
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
   * Lookup111: pallet_evm_contract_helpers::pallet::Event<T>
>>>>>>> ec6ecdbe... chore: regenerate types
   **/
  PalletEvmContractHelpersEvent: {
    _enum: {
      ContractSponsorSet: '(H160,AccountId32)',
      ContractSponsorshipConfirmed: '(H160,AccountId32)',
      ContractSponsorRemoved: 'H160'
    }
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup125: pallet_maintenance::pallet::Event<T>
=======
<<<<<<< HEAD
   * Lookup123: pallet_maintenance::pallet::Event<T>
=======
   * Lookup118: pallet_evm_migration::pallet::Event<T>
=======
   * Lookup112: pallet_evm_migration::pallet::Event<T>
>>>>>>> ec6ecdbe... chore: regenerate types
   **/
  PalletEvmMigrationEvent: {
    _enum: ['TestEvent']
  },
  /**
<<<<<<< HEAD
   * Lookup119: pallet_maintenance::pallet::Event<T>
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
   * Lookup113: pallet_maintenance::pallet::Event<T>
>>>>>>> ec6ecdbe... chore: regenerate types
   **/
  PalletMaintenanceEvent: {
    _enum: ['MaintenanceEnabled', 'MaintenanceDisabled']
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup126: pallet_test_utils::pallet::Event<T>
=======
<<<<<<< HEAD
   * Lookup124: pallet_test_utils::pallet::Event<T>
=======
   * Lookup120: pallet_test_utils::pallet::Event<T>
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
   **/
  PalletTestUtilsEvent: {
    _enum: ['ValueIsSet', 'ShouldRollback']
  },
  /**
<<<<<<< HEAD
   * Lookup127: frame_system::Phase
=======
<<<<<<< HEAD
   * Lookup125: frame_system::Phase
=======
   * Lookup121: frame_system::Phase
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
   * Lookup114: frame_system::Phase
>>>>>>> ec6ecdbe... chore: regenerate types
   **/
  FrameSystemPhase: {
    _enum: {
      ApplyExtrinsic: 'u32',
      Finalization: 'Null',
      Initialization: 'Null'
    }
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup129: frame_system::LastRuntimeUpgradeInfo
=======
<<<<<<< HEAD
   * Lookup127: frame_system::LastRuntimeUpgradeInfo
=======
   * Lookup124: frame_system::LastRuntimeUpgradeInfo
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
   * Lookup117: frame_system::LastRuntimeUpgradeInfo
>>>>>>> ec6ecdbe... chore: regenerate types
   **/
  FrameSystemLastRuntimeUpgradeInfo: {
    specVersion: 'Compact<u32>',
    specName: 'Text'
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup130: frame_system::pallet::Call<T>
=======
<<<<<<< HEAD
   * Lookup128: frame_system::pallet::Call<T>
=======
   * Lookup125: frame_system::pallet::Call<T>
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
   * Lookup119: frame_system::pallet::Call<T>
>>>>>>> ec6ecdbe... chore: regenerate types
   **/
  FrameSystemCall: {
    _enum: {
      fill_block: {
        ratio: 'Perbill',
      },
      remark: {
        remark: 'Bytes',
      },
      set_heap_pages: {
        pages: 'u64',
      },
      set_code: {
        code: 'Bytes',
      },
      set_code_without_checks: {
        code: 'Bytes',
      },
      set_storage: {
        items: 'Vec<(Bytes,Bytes)>',
      },
      kill_storage: {
        _alias: {
          keys_: 'keys',
        },
        keys_: 'Vec<Bytes>',
      },
      kill_prefix: {
        prefix: 'Bytes',
        subkeys: 'u32',
      },
      remark_with_event: {
        remark: 'Bytes'
      }
    }
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup135: frame_system::limits::BlockWeights
=======
<<<<<<< HEAD
   * Lookup133: frame_system::limits::BlockWeights
=======
   * Lookup130: frame_system::limits::BlockWeights
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
   * Lookup124: frame_system::limits::BlockWeights
>>>>>>> ec6ecdbe... chore: regenerate types
   **/
  FrameSystemLimitsBlockWeights: {
    baseBlock: 'Weight',
    maxBlock: 'Weight',
    perClass: 'FrameSupportDispatchPerDispatchClassWeightsPerClass'
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup136: frame_support::dispatch::PerDispatchClass<frame_system::limits::WeightsPerClass>
=======
<<<<<<< HEAD
   * Lookup134: frame_support::dispatch::PerDispatchClass<frame_system::limits::WeightsPerClass>
=======
   * Lookup131: frame_support::dispatch::PerDispatchClass<frame_system::limits::WeightsPerClass>
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
   * Lookup125: frame_support::dispatch::PerDispatchClass<frame_system::limits::WeightsPerClass>
>>>>>>> ec6ecdbe... chore: regenerate types
   **/
  FrameSupportDispatchPerDispatchClassWeightsPerClass: {
    normal: 'FrameSystemLimitsWeightsPerClass',
    operational: 'FrameSystemLimitsWeightsPerClass',
    mandatory: 'FrameSystemLimitsWeightsPerClass'
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup137: frame_system::limits::WeightsPerClass
=======
<<<<<<< HEAD
   * Lookup135: frame_system::limits::WeightsPerClass
=======
   * Lookup132: frame_system::limits::WeightsPerClass
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
   * Lookup126: frame_system::limits::WeightsPerClass
>>>>>>> ec6ecdbe... chore: regenerate types
   **/
  FrameSystemLimitsWeightsPerClass: {
    baseExtrinsic: 'Weight',
    maxExtrinsic: 'Option<Weight>',
    maxTotal: 'Option<Weight>',
    reserved: 'Option<Weight>'
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup139: frame_system::limits::BlockLength
=======
<<<<<<< HEAD
   * Lookup137: frame_system::limits::BlockLength
=======
   * Lookup134: frame_system::limits::BlockLength
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
   * Lookup128: frame_system::limits::BlockLength
>>>>>>> ec6ecdbe... chore: regenerate types
   **/
  FrameSystemLimitsBlockLength: {
    max: 'FrameSupportDispatchPerDispatchClassU32'
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup140: frame_support::dispatch::PerDispatchClass<T>
=======
<<<<<<< HEAD
   * Lookup138: frame_support::dispatch::PerDispatchClass<T>
=======
   * Lookup135: frame_support::dispatch::PerDispatchClass<T>
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
   * Lookup129: frame_support::dispatch::PerDispatchClass<T>
>>>>>>> ec6ecdbe... chore: regenerate types
   **/
  FrameSupportDispatchPerDispatchClassU32: {
    normal: 'u32',
    operational: 'u32',
    mandatory: 'u32'
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup141: sp_weights::RuntimeDbWeight
=======
<<<<<<< HEAD
   * Lookup139: sp_weights::RuntimeDbWeight
=======
   * Lookup136: sp_weights::RuntimeDbWeight
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
   * Lookup130: sp_weights::RuntimeDbWeight
>>>>>>> ec6ecdbe... chore: regenerate types
   **/
  SpWeightsRuntimeDbWeight: {
    read: 'u64',
    write: 'u64'
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup142: sp_version::RuntimeVersion
=======
<<<<<<< HEAD
   * Lookup140: sp_version::RuntimeVersion
=======
   * Lookup137: sp_version::RuntimeVersion
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
   * Lookup131: sp_version::RuntimeVersion
>>>>>>> ec6ecdbe... chore: regenerate types
   **/
  SpVersionRuntimeVersion: {
    specName: 'Text',
    implName: 'Text',
    authoringVersion: 'u32',
    specVersion: 'u32',
    implVersion: 'u32',
    apis: 'Vec<([u8;8],u32)>',
    transactionVersion: 'u32',
    stateVersion: 'u8'
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup147: frame_system::pallet::Error<T>
=======
<<<<<<< HEAD
   * Lookup145: frame_system::pallet::Error<T>
=======
   * Lookup142: frame_system::pallet::Error<T>
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
   * Lookup136: frame_system::pallet::Error<T>
>>>>>>> ec6ecdbe... chore: regenerate types
   **/
  FrameSystemError: {
    _enum: ['InvalidSpecName', 'SpecVersionNeedsToIncrease', 'FailedToExtractRuntimeVersion', 'NonDefaultComposite', 'NonZeroRefCount', 'CallFiltered']
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup148: polkadot_primitives::v2::PersistedValidationData<primitive_types::H256, N>
=======
<<<<<<< HEAD
   * Lookup146: polkadot_primitives::v2::PersistedValidationData<primitive_types::H256, N>
=======
   * Lookup143: polkadot_primitives::v2::PersistedValidationData<primitive_types::H256, N>
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
   * Lookup137: polkadot_primitives::v2::PersistedValidationData<primitive_types::H256, N>
>>>>>>> ec6ecdbe... chore: regenerate types
   **/
  PolkadotPrimitivesV2PersistedValidationData: {
    parentHead: 'Bytes',
    relayParentNumber: 'u32',
    relayParentStorageRoot: 'H256',
    maxPovSize: 'u32'
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup151: polkadot_primitives::v2::UpgradeRestriction
=======
<<<<<<< HEAD
   * Lookup149: polkadot_primitives::v2::UpgradeRestriction
=======
   * Lookup146: polkadot_primitives::v2::UpgradeRestriction
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
   * Lookup140: polkadot_primitives::v2::UpgradeRestriction
>>>>>>> ec6ecdbe... chore: regenerate types
   **/
  PolkadotPrimitivesV2UpgradeRestriction: {
    _enum: ['Present']
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup152: sp_trie::storage_proof::StorageProof
=======
<<<<<<< HEAD
   * Lookup150: sp_trie::storage_proof::StorageProof
=======
   * Lookup147: sp_trie::storage_proof::StorageProof
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
   * Lookup141: sp_trie::storage_proof::StorageProof
>>>>>>> ec6ecdbe... chore: regenerate types
   **/
  SpTrieStorageProof: {
    trieNodes: 'BTreeSet<Bytes>'
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup154: cumulus_pallet_parachain_system::relay_state_snapshot::MessagingStateSnapshot
=======
<<<<<<< HEAD
   * Lookup152: cumulus_pallet_parachain_system::relay_state_snapshot::MessagingStateSnapshot
=======
   * Lookup149: cumulus_pallet_parachain_system::relay_state_snapshot::MessagingStateSnapshot
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
   * Lookup143: cumulus_pallet_parachain_system::relay_state_snapshot::MessagingStateSnapshot
>>>>>>> ec6ecdbe... chore: regenerate types
   **/
  CumulusPalletParachainSystemRelayStateSnapshotMessagingStateSnapshot: {
    dmqMqcHead: 'H256',
    relayDispatchQueueSize: '(u32,u32)',
    ingressChannels: 'Vec<(u32,PolkadotPrimitivesV2AbridgedHrmpChannel)>',
    egressChannels: 'Vec<(u32,PolkadotPrimitivesV2AbridgedHrmpChannel)>'
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup157: polkadot_primitives::v2::AbridgedHrmpChannel
=======
<<<<<<< HEAD
   * Lookup155: polkadot_primitives::v2::AbridgedHrmpChannel
=======
   * Lookup152: polkadot_primitives::v2::AbridgedHrmpChannel
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
   * Lookup146: polkadot_primitives::v2::AbridgedHrmpChannel
>>>>>>> ec6ecdbe... chore: regenerate types
   **/
  PolkadotPrimitivesV2AbridgedHrmpChannel: {
    maxCapacity: 'u32',
    maxTotalSize: 'u32',
    maxMessageSize: 'u32',
    msgCount: 'u32',
    totalSize: 'u32',
    mqcHead: 'Option<H256>'
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup158: polkadot_primitives::v2::AbridgedHostConfiguration
=======
<<<<<<< HEAD
   * Lookup156: polkadot_primitives::v2::AbridgedHostConfiguration
=======
   * Lookup153: polkadot_primitives::v2::AbridgedHostConfiguration
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
   * Lookup147: polkadot_primitives::v2::AbridgedHostConfiguration
>>>>>>> ec6ecdbe... chore: regenerate types
   **/
  PolkadotPrimitivesV2AbridgedHostConfiguration: {
    maxCodeSize: 'u32',
    maxHeadDataSize: 'u32',
    maxUpwardQueueCount: 'u32',
    maxUpwardQueueSize: 'u32',
    maxUpwardMessageSize: 'u32',
    maxUpwardMessageNumPerCandidate: 'u32',
    hrmpMaxMessageNumPerCandidate: 'u32',
    validationUpgradeCooldown: 'u32',
    validationUpgradeDelay: 'u32'
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup164: polkadot_core_primitives::OutboundHrmpMessage<polkadot_parachain::primitives::Id>
=======
<<<<<<< HEAD
   * Lookup162: polkadot_core_primitives::OutboundHrmpMessage<polkadot_parachain::primitives::Id>
=======
   * Lookup159: polkadot_core_primitives::OutboundHrmpMessage<polkadot_parachain::primitives::Id>
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
   * Lookup153: polkadot_core_primitives::OutboundHrmpMessage<polkadot_parachain::primitives::Id>
>>>>>>> ec6ecdbe... chore: regenerate types
   **/
  PolkadotCorePrimitivesOutboundHrmpMessage: {
    recipient: 'u32',
    data: 'Bytes'
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup165: cumulus_pallet_parachain_system::pallet::Call<T>
=======
<<<<<<< HEAD
   * Lookup163: cumulus_pallet_parachain_system::pallet::Call<T>
=======
   * Lookup160: cumulus_pallet_parachain_system::pallet::Call<T>
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
   * Lookup154: cumulus_pallet_parachain_system::pallet::Call<T>
>>>>>>> ec6ecdbe... chore: regenerate types
   **/
  CumulusPalletParachainSystemCall: {
    _enum: {
      set_validation_data: {
        data: 'CumulusPrimitivesParachainInherentParachainInherentData',
      },
      sudo_send_upward_message: {
        message: 'Bytes',
      },
      authorize_upgrade: {
        codeHash: 'H256',
      },
      enact_authorized_upgrade: {
        code: 'Bytes'
      }
    }
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup166: cumulus_primitives_parachain_inherent::ParachainInherentData
=======
<<<<<<< HEAD
   * Lookup164: cumulus_primitives_parachain_inherent::ParachainInherentData
=======
   * Lookup161: cumulus_primitives_parachain_inherent::ParachainInherentData
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
   * Lookup155: cumulus_primitives_parachain_inherent::ParachainInherentData
>>>>>>> ec6ecdbe... chore: regenerate types
   **/
  CumulusPrimitivesParachainInherentParachainInherentData: {
    validationData: 'PolkadotPrimitivesV2PersistedValidationData',
    relayChainState: 'SpTrieStorageProof',
    downwardMessages: 'Vec<PolkadotCorePrimitivesInboundDownwardMessage>',
    horizontalMessages: 'BTreeMap<u32, Vec<PolkadotCorePrimitivesInboundHrmpMessage>>'
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup168: polkadot_core_primitives::InboundDownwardMessage<BlockNumber>
=======
<<<<<<< HEAD
   * Lookup166: polkadot_core_primitives::InboundDownwardMessage<BlockNumber>
=======
   * Lookup163: polkadot_core_primitives::InboundDownwardMessage<BlockNumber>
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
   * Lookup157: polkadot_core_primitives::InboundDownwardMessage<BlockNumber>
>>>>>>> ec6ecdbe... chore: regenerate types
   **/
  PolkadotCorePrimitivesInboundDownwardMessage: {
    sentAt: 'u32',
    msg: 'Bytes'
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup171: polkadot_core_primitives::InboundHrmpMessage<BlockNumber>
=======
<<<<<<< HEAD
   * Lookup169: polkadot_core_primitives::InboundHrmpMessage<BlockNumber>
=======
   * Lookup166: polkadot_core_primitives::InboundHrmpMessage<BlockNumber>
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
   * Lookup160: polkadot_core_primitives::InboundHrmpMessage<BlockNumber>
>>>>>>> ec6ecdbe... chore: regenerate types
   **/
  PolkadotCorePrimitivesInboundHrmpMessage: {
    sentAt: 'u32',
    data: 'Bytes'
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup174: cumulus_pallet_parachain_system::pallet::Error<T>
=======
<<<<<<< HEAD
   * Lookup172: cumulus_pallet_parachain_system::pallet::Error<T>
=======
   * Lookup169: cumulus_pallet_parachain_system::pallet::Error<T>
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
   * Lookup163: cumulus_pallet_parachain_system::pallet::Error<T>
>>>>>>> ec6ecdbe... chore: regenerate types
   **/
  CumulusPalletParachainSystemError: {
    _enum: ['OverlappingUpgrades', 'ProhibitedByPolkadot', 'TooBig', 'ValidationDataNotAvailable', 'HostConfigurationNotAvailable', 'NotScheduled', 'NothingAuthorized', 'Unauthorized']
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup176: pallet_balances::BalanceLock<Balance>
=======
<<<<<<< HEAD
   * Lookup174: pallet_balances::BalanceLock<Balance>
=======
   * Lookup171: pallet_balances::BalanceLock<Balance>
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
   * Lookup165: pallet_balances::BalanceLock<Balance>
>>>>>>> ec6ecdbe... chore: regenerate types
   **/
  PalletBalancesBalanceLock: {
    id: '[u8;8]',
    amount: 'u128',
    reasons: 'PalletBalancesReasons'
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup177: pallet_balances::Reasons
=======
<<<<<<< HEAD
   * Lookup175: pallet_balances::Reasons
=======
   * Lookup172: pallet_balances::Reasons
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
   * Lookup166: pallet_balances::Reasons
>>>>>>> ec6ecdbe... chore: regenerate types
   **/
  PalletBalancesReasons: {
    _enum: ['Fee', 'Misc', 'All']
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup180: pallet_balances::ReserveData<ReserveIdentifier, Balance>
=======
<<<<<<< HEAD
   * Lookup178: pallet_balances::ReserveData<ReserveIdentifier, Balance>
=======
   * Lookup175: pallet_balances::ReserveData<ReserveIdentifier, Balance>
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
   * Lookup169: pallet_balances::ReserveData<ReserveIdentifier, Balance>
>>>>>>> ec6ecdbe... chore: regenerate types
   **/
  PalletBalancesReserveData: {
    id: '[u8;16]',
    amount: 'u128'
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup182: pallet_balances::Releases
=======
<<<<<<< HEAD
   * Lookup180: pallet_balances::Releases
=======
   * Lookup177: pallet_balances::Releases
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
   * Lookup171: pallet_balances::Releases
>>>>>>> ec6ecdbe... chore: regenerate types
   **/
  PalletBalancesReleases: {
    _enum: ['V1_0_0', 'V2_0_0']
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup183: pallet_balances::pallet::Call<T, I>
=======
<<<<<<< HEAD
   * Lookup181: pallet_balances::pallet::Call<T, I>
=======
   * Lookup178: pallet_balances::pallet::Call<T, I>
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
   * Lookup172: pallet_balances::pallet::Call<T, I>
>>>>>>> ec6ecdbe... chore: regenerate types
   **/
  PalletBalancesCall: {
    _enum: {
      transfer: {
        dest: 'MultiAddress',
        value: 'Compact<u128>',
      },
      set_balance: {
        who: 'MultiAddress',
        newFree: 'Compact<u128>',
        newReserved: 'Compact<u128>',
      },
      force_transfer: {
        source: 'MultiAddress',
        dest: 'MultiAddress',
        value: 'Compact<u128>',
      },
      transfer_keep_alive: {
        dest: 'MultiAddress',
        value: 'Compact<u128>',
      },
      transfer_all: {
        dest: 'MultiAddress',
        keepAlive: 'bool',
      },
      force_unreserve: {
        who: 'MultiAddress',
        amount: 'u128'
      }
    }
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup186: pallet_balances::pallet::Error<T, I>
=======
<<<<<<< HEAD
   * Lookup184: pallet_balances::pallet::Error<T, I>
=======
   * Lookup181: pallet_balances::pallet::Error<T, I>
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
   * Lookup175: pallet_balances::pallet::Error<T, I>
>>>>>>> ec6ecdbe... chore: regenerate types
   **/
  PalletBalancesError: {
    _enum: ['VestingBalance', 'LiquidityRestrictions', 'InsufficientBalance', 'ExistentialDeposit', 'KeepAlive', 'ExistingVestingSchedule', 'DeadAccount', 'TooManyReserves']
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup188: pallet_timestamp::pallet::Call<T>
=======
<<<<<<< HEAD
   * Lookup186: pallet_timestamp::pallet::Call<T>
=======
   * Lookup183: pallet_timestamp::pallet::Call<T>
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
   * Lookup177: pallet_timestamp::pallet::Call<T>
>>>>>>> ec6ecdbe... chore: regenerate types
   **/
  PalletTimestampCall: {
    _enum: {
      set: {
        now: 'Compact<u64>'
      }
    }
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup190: pallet_transaction_payment::Releases
=======
<<<<<<< HEAD
   * Lookup188: pallet_transaction_payment::Releases
=======
   * Lookup185: pallet_transaction_payment::Releases
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
   * Lookup179: pallet_transaction_payment::Releases
>>>>>>> ec6ecdbe... chore: regenerate types
   **/
  PalletTransactionPaymentReleases: {
    _enum: ['V1Ancient', 'V2']
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup191: pallet_treasury::Proposal<sp_core::crypto::AccountId32, Balance>
=======
<<<<<<< HEAD
   * Lookup189: pallet_treasury::Proposal<sp_core::crypto::AccountId32, Balance>
=======
   * Lookup186: pallet_treasury::Proposal<sp_core::crypto::AccountId32, Balance>
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
   * Lookup180: pallet_treasury::Proposal<sp_core::crypto::AccountId32, Balance>
>>>>>>> ec6ecdbe... chore: regenerate types
   **/
  PalletTreasuryProposal: {
    proposer: 'AccountId32',
    value: 'u128',
    beneficiary: 'AccountId32',
    bond: 'u128'
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup194: pallet_treasury::pallet::Call<T, I>
=======
<<<<<<< HEAD
   * Lookup192: pallet_treasury::pallet::Call<T, I>
=======
   * Lookup189: pallet_treasury::pallet::Call<T, I>
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
   * Lookup183: pallet_treasury::pallet::Call<T, I>
>>>>>>> ec6ecdbe... chore: regenerate types
   **/
  PalletTreasuryCall: {
    _enum: {
      propose_spend: {
        value: 'Compact<u128>',
        beneficiary: 'MultiAddress',
      },
      reject_proposal: {
        proposalId: 'Compact<u32>',
      },
      approve_proposal: {
        proposalId: 'Compact<u32>',
      },
      spend: {
        amount: 'Compact<u128>',
        beneficiary: 'MultiAddress',
      },
      remove_approval: {
        proposalId: 'Compact<u32>'
      }
    }
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup197: frame_support::PalletId
   **/
  FrameSupportPalletId: '[u8;8]',
  /**
   * Lookup198: pallet_treasury::pallet::Error<T, I>
=======
<<<<<<< HEAD
   * Lookup195: frame_support::PalletId
   **/
  FrameSupportPalletId: '[u8;8]',
  /**
   * Lookup196: pallet_treasury::pallet::Error<T, I>
=======
   * Lookup192: frame_support::PalletId
   **/
  FrameSupportPalletId: '[u8;8]',
  /**
   * Lookup193: pallet_treasury::pallet::Error<T, I>
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
   * Lookup186: frame_support::PalletId
   **/
  FrameSupportPalletId: '[u8;8]',
  /**
   * Lookup187: pallet_treasury::pallet::Error<T, I>
>>>>>>> ec6ecdbe... chore: regenerate types
   **/
  PalletTreasuryError: {
    _enum: ['InsufficientProposersBalance', 'InvalidIndex', 'TooManyApprovals', 'InsufficientPermission', 'ProposalNotApproved']
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup199: pallet_sudo::pallet::Call<T>
=======
<<<<<<< HEAD
   * Lookup197: pallet_sudo::pallet::Call<T>
=======
   * Lookup194: pallet_sudo::pallet::Call<T>
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
   * Lookup188: pallet_sudo::pallet::Call<T>
>>>>>>> ec6ecdbe... chore: regenerate types
   **/
  PalletSudoCall: {
    _enum: {
      sudo: {
        call: 'Call',
      },
      sudo_unchecked_weight: {
        call: 'Call',
        weight: 'Weight',
      },
      set_key: {
        _alias: {
          new_: 'new',
        },
        new_: 'MultiAddress',
      },
      sudo_as: {
        who: 'MultiAddress',
        call: 'Call'
      }
    }
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup201: orml_vesting::module::Call<T>
=======
<<<<<<< HEAD
   * Lookup199: orml_vesting::module::Call<T>
=======
   * Lookup196: orml_vesting::module::Call<T>
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
   * Lookup190: orml_vesting::module::Call<T>
>>>>>>> ec6ecdbe... chore: regenerate types
   **/
  OrmlVestingModuleCall: {
    _enum: {
      claim: 'Null',
      vested_transfer: {
        dest: 'MultiAddress',
        schedule: 'OrmlVestingVestingSchedule',
      },
      update_vesting_schedules: {
        who: 'MultiAddress',
        vestingSchedules: 'Vec<OrmlVestingVestingSchedule>',
      },
      claim_for: {
        dest: 'MultiAddress'
      }
    }
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup203: orml_xtokens::module::Call<T>
=======
<<<<<<< HEAD
   * Lookup201: orml_xtokens::module::Call<T>
=======
   * Lookup198: orml_xtokens::module::Call<T>
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
   * Lookup192: orml_xtokens::module::Call<T>
>>>>>>> ec6ecdbe... chore: regenerate types
   **/
  OrmlXtokensModuleCall: {
    _enum: {
      transfer: {
        currencyId: 'PalletForeignAssetsAssetIds',
        amount: 'u128',
        dest: 'XcmVersionedMultiLocation',
        destWeight: 'u64',
      },
      transfer_multiasset: {
        asset: 'XcmVersionedMultiAsset',
        dest: 'XcmVersionedMultiLocation',
        destWeight: 'u64',
      },
      transfer_with_fee: {
        currencyId: 'PalletForeignAssetsAssetIds',
        amount: 'u128',
        fee: 'u128',
        dest: 'XcmVersionedMultiLocation',
        destWeight: 'u64',
      },
      transfer_multiasset_with_fee: {
        asset: 'XcmVersionedMultiAsset',
        fee: 'XcmVersionedMultiAsset',
        dest: 'XcmVersionedMultiLocation',
        destWeight: 'u64',
      },
      transfer_multicurrencies: {
        currencies: 'Vec<(PalletForeignAssetsAssetIds,u128)>',
        feeItem: 'u32',
        dest: 'XcmVersionedMultiLocation',
        destWeight: 'u64',
      },
      transfer_multiassets: {
        assets: 'XcmVersionedMultiAssets',
        feeItem: 'u32',
        dest: 'XcmVersionedMultiLocation',
        destWeight: 'u64'
      }
    }
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup204: xcm::VersionedMultiAsset
=======
<<<<<<< HEAD
   * Lookup202: xcm::VersionedMultiAsset
=======
   * Lookup199: xcm::VersionedMultiAsset
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
   * Lookup193: xcm::VersionedMultiAsset
>>>>>>> ec6ecdbe... chore: regenerate types
   **/
  XcmVersionedMultiAsset: {
    _enum: {
      V0: 'XcmV0MultiAsset',
      V1: 'XcmV1MultiAsset'
    }
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup207: orml_tokens::module::Call<T>
=======
<<<<<<< HEAD
   * Lookup205: orml_tokens::module::Call<T>
=======
   * Lookup202: orml_tokens::module::Call<T>
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
   * Lookup196: orml_tokens::module::Call<T>
>>>>>>> ec6ecdbe... chore: regenerate types
   **/
  OrmlTokensModuleCall: {
    _enum: {
      transfer: {
        dest: 'MultiAddress',
        currencyId: 'PalletForeignAssetsAssetIds',
        amount: 'Compact<u128>',
      },
      transfer_all: {
        dest: 'MultiAddress',
        currencyId: 'PalletForeignAssetsAssetIds',
        keepAlive: 'bool',
      },
      transfer_keep_alive: {
        dest: 'MultiAddress',
        currencyId: 'PalletForeignAssetsAssetIds',
        amount: 'Compact<u128>',
      },
      force_transfer: {
        source: 'MultiAddress',
        dest: 'MultiAddress',
        currencyId: 'PalletForeignAssetsAssetIds',
        amount: 'Compact<u128>',
      },
      set_balance: {
        who: 'MultiAddress',
        currencyId: 'PalletForeignAssetsAssetIds',
        newFree: 'Compact<u128>',
        newReserved: 'Compact<u128>'
      }
    }
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup208: cumulus_pallet_xcmp_queue::pallet::Call<T>
=======
<<<<<<< HEAD
   * Lookup206: cumulus_pallet_xcmp_queue::pallet::Call<T>
=======
   * Lookup203: cumulus_pallet_xcmp_queue::pallet::Call<T>
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
   * Lookup197: cumulus_pallet_xcmp_queue::pallet::Call<T>
>>>>>>> ec6ecdbe... chore: regenerate types
   **/
  CumulusPalletXcmpQueueCall: {
    _enum: {
      service_overweight: {
        index: 'u64',
        weightLimit: 'Weight',
      },
      suspend_xcm_execution: 'Null',
      resume_xcm_execution: 'Null',
      update_suspend_threshold: {
        _alias: {
          new_: 'new',
        },
        new_: 'u32',
      },
      update_drop_threshold: {
        _alias: {
          new_: 'new',
        },
        new_: 'u32',
      },
      update_resume_threshold: {
        _alias: {
          new_: 'new',
        },
        new_: 'u32',
      },
      update_threshold_weight: {
        _alias: {
          new_: 'new',
        },
        new_: 'Weight',
      },
      update_weight_restrict_decay: {
        _alias: {
          new_: 'new',
        },
        new_: 'Weight',
      },
      update_xcmp_max_individual_weight: {
        _alias: {
          new_: 'new',
        },
        new_: 'Weight'
      }
    }
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup209: pallet_xcm::pallet::Call<T>
=======
<<<<<<< HEAD
   * Lookup207: pallet_xcm::pallet::Call<T>
=======
   * Lookup204: pallet_xcm::pallet::Call<T>
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
   * Lookup198: pallet_xcm::pallet::Call<T>
>>>>>>> ec6ecdbe... chore: regenerate types
   **/
  PalletXcmCall: {
    _enum: {
      send: {
        dest: 'XcmVersionedMultiLocation',
        message: 'XcmVersionedXcm',
      },
      teleport_assets: {
        dest: 'XcmVersionedMultiLocation',
        beneficiary: 'XcmVersionedMultiLocation',
        assets: 'XcmVersionedMultiAssets',
        feeAssetItem: 'u32',
      },
      reserve_transfer_assets: {
        dest: 'XcmVersionedMultiLocation',
        beneficiary: 'XcmVersionedMultiLocation',
        assets: 'XcmVersionedMultiAssets',
        feeAssetItem: 'u32',
      },
      execute: {
        message: 'XcmVersionedXcm',
        maxWeight: 'Weight',
      },
      force_xcm_version: {
        location: 'XcmV1MultiLocation',
        xcmVersion: 'u32',
      },
      force_default_xcm_version: {
        maybeXcmVersion: 'Option<u32>',
      },
      force_subscribe_version_notify: {
        location: 'XcmVersionedMultiLocation',
      },
      force_unsubscribe_version_notify: {
        location: 'XcmVersionedMultiLocation',
      },
      limited_reserve_transfer_assets: {
        dest: 'XcmVersionedMultiLocation',
        beneficiary: 'XcmVersionedMultiLocation',
        assets: 'XcmVersionedMultiAssets',
        feeAssetItem: 'u32',
        weightLimit: 'XcmV2WeightLimit',
      },
      limited_teleport_assets: {
        dest: 'XcmVersionedMultiLocation',
        beneficiary: 'XcmVersionedMultiLocation',
        assets: 'XcmVersionedMultiAssets',
        feeAssetItem: 'u32',
        weightLimit: 'XcmV2WeightLimit'
      }
    }
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup210: xcm::VersionedXcm<RuntimeCall>
=======
<<<<<<< HEAD
   * Lookup208: xcm::VersionedXcm<RuntimeCall>
=======
   * Lookup205: xcm::VersionedXcm<RuntimeCall>
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
   * Lookup199: xcm::VersionedXcm<RuntimeCall>
>>>>>>> ec6ecdbe... chore: regenerate types
   **/
  XcmVersionedXcm: {
    _enum: {
      V0: 'XcmV0Xcm',
      V1: 'XcmV1Xcm',
      V2: 'XcmV2Xcm'
    }
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup211: xcm::v0::Xcm<RuntimeCall>
=======
<<<<<<< HEAD
   * Lookup209: xcm::v0::Xcm<RuntimeCall>
=======
   * Lookup206: xcm::v0::Xcm<RuntimeCall>
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
   * Lookup200: xcm::v0::Xcm<RuntimeCall>
>>>>>>> ec6ecdbe... chore: regenerate types
   **/
  XcmV0Xcm: {
    _enum: {
      WithdrawAsset: {
        assets: 'Vec<XcmV0MultiAsset>',
        effects: 'Vec<XcmV0Order>',
      },
      ReserveAssetDeposit: {
        assets: 'Vec<XcmV0MultiAsset>',
        effects: 'Vec<XcmV0Order>',
      },
      TeleportAsset: {
        assets: 'Vec<XcmV0MultiAsset>',
        effects: 'Vec<XcmV0Order>',
      },
      QueryResponse: {
        queryId: 'Compact<u64>',
        response: 'XcmV0Response',
      },
      TransferAsset: {
        assets: 'Vec<XcmV0MultiAsset>',
        dest: 'XcmV0MultiLocation',
      },
      TransferReserveAsset: {
        assets: 'Vec<XcmV0MultiAsset>',
        dest: 'XcmV0MultiLocation',
        effects: 'Vec<XcmV0Order>',
      },
      Transact: {
        originType: 'XcmV0OriginKind',
        requireWeightAtMost: 'u64',
        call: 'XcmDoubleEncoded',
      },
      HrmpNewChannelOpenRequest: {
        sender: 'Compact<u32>',
        maxMessageSize: 'Compact<u32>',
        maxCapacity: 'Compact<u32>',
      },
      HrmpChannelAccepted: {
        recipient: 'Compact<u32>',
      },
      HrmpChannelClosing: {
        initiator: 'Compact<u32>',
        sender: 'Compact<u32>',
        recipient: 'Compact<u32>',
      },
      RelayedFrom: {
        who: 'XcmV0MultiLocation',
        message: 'XcmV0Xcm'
      }
    }
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup213: xcm::v0::order::Order<RuntimeCall>
=======
<<<<<<< HEAD
   * Lookup211: xcm::v0::order::Order<RuntimeCall>
=======
   * Lookup208: xcm::v0::order::Order<RuntimeCall>
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
   * Lookup202: xcm::v0::order::Order<RuntimeCall>
>>>>>>> ec6ecdbe... chore: regenerate types
   **/
  XcmV0Order: {
    _enum: {
      Null: 'Null',
      DepositAsset: {
        assets: 'Vec<XcmV0MultiAsset>',
        dest: 'XcmV0MultiLocation',
      },
      DepositReserveAsset: {
        assets: 'Vec<XcmV0MultiAsset>',
        dest: 'XcmV0MultiLocation',
        effects: 'Vec<XcmV0Order>',
      },
      ExchangeAsset: {
        give: 'Vec<XcmV0MultiAsset>',
        receive: 'Vec<XcmV0MultiAsset>',
      },
      InitiateReserveWithdraw: {
        assets: 'Vec<XcmV0MultiAsset>',
        reserve: 'XcmV0MultiLocation',
        effects: 'Vec<XcmV0Order>',
      },
      InitiateTeleport: {
        assets: 'Vec<XcmV0MultiAsset>',
        dest: 'XcmV0MultiLocation',
        effects: 'Vec<XcmV0Order>',
      },
      QueryHolding: {
        queryId: 'Compact<u64>',
        dest: 'XcmV0MultiLocation',
        assets: 'Vec<XcmV0MultiAsset>',
      },
      BuyExecution: {
        fees: 'XcmV0MultiAsset',
        weight: 'u64',
        debt: 'u64',
        haltOnError: 'bool',
        xcm: 'Vec<XcmV0Xcm>'
      }
    }
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup215: xcm::v0::Response
=======
<<<<<<< HEAD
   * Lookup213: xcm::v0::Response
=======
   * Lookup210: xcm::v0::Response
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
   * Lookup204: xcm::v0::Response
>>>>>>> ec6ecdbe... chore: regenerate types
   **/
  XcmV0Response: {
    _enum: {
      Assets: 'Vec<XcmV0MultiAsset>'
    }
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup216: xcm::v1::Xcm<RuntimeCall>
=======
<<<<<<< HEAD
   * Lookup214: xcm::v1::Xcm<RuntimeCall>
=======
   * Lookup211: xcm::v1::Xcm<RuntimeCall>
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
   * Lookup205: xcm::v1::Xcm<RuntimeCall>
>>>>>>> ec6ecdbe... chore: regenerate types
   **/
  XcmV1Xcm: {
    _enum: {
      WithdrawAsset: {
        assets: 'XcmV1MultiassetMultiAssets',
        effects: 'Vec<XcmV1Order>',
      },
      ReserveAssetDeposited: {
        assets: 'XcmV1MultiassetMultiAssets',
        effects: 'Vec<XcmV1Order>',
      },
      ReceiveTeleportedAsset: {
        assets: 'XcmV1MultiassetMultiAssets',
        effects: 'Vec<XcmV1Order>',
      },
      QueryResponse: {
        queryId: 'Compact<u64>',
        response: 'XcmV1Response',
      },
      TransferAsset: {
        assets: 'XcmV1MultiassetMultiAssets',
        beneficiary: 'XcmV1MultiLocation',
      },
      TransferReserveAsset: {
        assets: 'XcmV1MultiassetMultiAssets',
        dest: 'XcmV1MultiLocation',
        effects: 'Vec<XcmV1Order>',
      },
      Transact: {
        originType: 'XcmV0OriginKind',
        requireWeightAtMost: 'u64',
        call: 'XcmDoubleEncoded',
      },
      HrmpNewChannelOpenRequest: {
        sender: 'Compact<u32>',
        maxMessageSize: 'Compact<u32>',
        maxCapacity: 'Compact<u32>',
      },
      HrmpChannelAccepted: {
        recipient: 'Compact<u32>',
      },
      HrmpChannelClosing: {
        initiator: 'Compact<u32>',
        sender: 'Compact<u32>',
        recipient: 'Compact<u32>',
      },
      RelayedFrom: {
        who: 'XcmV1MultilocationJunctions',
        message: 'XcmV1Xcm',
      },
      SubscribeVersion: {
        queryId: 'Compact<u64>',
        maxResponseWeight: 'Compact<u64>',
      },
      UnsubscribeVersion: 'Null'
    }
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup218: xcm::v1::order::Order<RuntimeCall>
=======
<<<<<<< HEAD
   * Lookup216: xcm::v1::order::Order<RuntimeCall>
=======
   * Lookup213: xcm::v1::order::Order<RuntimeCall>
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
   * Lookup207: xcm::v1::order::Order<RuntimeCall>
>>>>>>> ec6ecdbe... chore: regenerate types
   **/
  XcmV1Order: {
    _enum: {
      Noop: 'Null',
      DepositAsset: {
        assets: 'XcmV1MultiassetMultiAssetFilter',
        maxAssets: 'u32',
        beneficiary: 'XcmV1MultiLocation',
      },
      DepositReserveAsset: {
        assets: 'XcmV1MultiassetMultiAssetFilter',
        maxAssets: 'u32',
        dest: 'XcmV1MultiLocation',
        effects: 'Vec<XcmV1Order>',
      },
      ExchangeAsset: {
        give: 'XcmV1MultiassetMultiAssetFilter',
        receive: 'XcmV1MultiassetMultiAssets',
      },
      InitiateReserveWithdraw: {
        assets: 'XcmV1MultiassetMultiAssetFilter',
        reserve: 'XcmV1MultiLocation',
        effects: 'Vec<XcmV1Order>',
      },
      InitiateTeleport: {
        assets: 'XcmV1MultiassetMultiAssetFilter',
        dest: 'XcmV1MultiLocation',
        effects: 'Vec<XcmV1Order>',
      },
      QueryHolding: {
        queryId: 'Compact<u64>',
        dest: 'XcmV1MultiLocation',
        assets: 'XcmV1MultiassetMultiAssetFilter',
      },
      BuyExecution: {
        fees: 'XcmV1MultiAsset',
        weight: 'u64',
        debt: 'u64',
        haltOnError: 'bool',
        instructions: 'Vec<XcmV1Xcm>'
      }
    }
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup220: xcm::v1::Response
=======
<<<<<<< HEAD
   * Lookup218: xcm::v1::Response
=======
   * Lookup215: xcm::v1::Response
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
   * Lookup209: xcm::v1::Response
>>>>>>> ec6ecdbe... chore: regenerate types
   **/
  XcmV1Response: {
    _enum: {
      Assets: 'XcmV1MultiassetMultiAssets',
      Version: 'u32'
    }
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup234: cumulus_pallet_xcm::pallet::Call<T>
   **/
  CumulusPalletXcmCall: 'Null',
  /**
   * Lookup235: cumulus_pallet_dmp_queue::pallet::Call<T>
=======
<<<<<<< HEAD
   * Lookup232: cumulus_pallet_xcm::pallet::Call<T>
   **/
  CumulusPalletXcmCall: 'Null',
  /**
   * Lookup233: cumulus_pallet_dmp_queue::pallet::Call<T>
=======
   * Lookup229: cumulus_pallet_xcm::pallet::Call<T>
   **/
  CumulusPalletXcmCall: 'Null',
  /**
   * Lookup230: cumulus_pallet_dmp_queue::pallet::Call<T>
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
   * Lookup224: cumulus_pallet_xcm::pallet::Call<T>
   **/
  CumulusPalletXcmCall: 'Null',
  /**
   * Lookup225: cumulus_pallet_dmp_queue::pallet::Call<T>
>>>>>>> ec6ecdbe... chore: regenerate types
   **/
  CumulusPalletDmpQueueCall: {
    _enum: {
      service_overweight: {
        index: 'u64',
        weightLimit: 'Weight'
      }
    }
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup236: pallet_inflation::pallet::Call<T>
=======
<<<<<<< HEAD
   * Lookup234: pallet_inflation::pallet::Call<T>
=======
   * Lookup231: pallet_inflation::pallet::Call<T>
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
   * Lookup226: pallet_inflation::pallet::Call<T>
>>>>>>> ec6ecdbe... chore: regenerate types
   **/
  PalletInflationCall: {
    _enum: {
      start_inflation: {
        inflationStartRelayBlock: 'u32'
      }
    }
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup237: pallet_unique::Call<T>
=======
<<<<<<< HEAD
   * Lookup235: pallet_unique::Call<T>
=======
   * Lookup232: pallet_unique::Call<T>
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
   * Lookup227: pallet_unique::Call<T>
>>>>>>> ec6ecdbe... chore: regenerate types
   **/
  PalletUniqueCall: {
    _enum: {
      create_collection: {
        collectionName: 'Vec<u16>',
        collectionDescription: 'Vec<u16>',
        tokenPrefix: 'Bytes',
        mode: 'UpDataStructsCollectionMode',
      },
      create_collection_ex: {
        data: 'UpDataStructsCreateCollectionData',
      },
      destroy_collection: {
        collectionId: 'u32',
      },
      add_to_allow_list: {
        collectionId: 'u32',
        address: 'PalletEvmAccountBasicCrossAccountIdRepr',
      },
      remove_from_allow_list: {
        collectionId: 'u32',
        address: 'PalletEvmAccountBasicCrossAccountIdRepr',
      },
      change_collection_owner: {
        collectionId: 'u32',
        newOwner: 'AccountId32',
      },
      add_collection_admin: {
        collectionId: 'u32',
        newAdminId: 'PalletEvmAccountBasicCrossAccountIdRepr',
      },
      remove_collection_admin: {
        collectionId: 'u32',
        accountId: 'PalletEvmAccountBasicCrossAccountIdRepr',
      },
      set_collection_sponsor: {
        collectionId: 'u32',
        newSponsor: 'AccountId32',
      },
      confirm_sponsorship: {
        collectionId: 'u32',
      },
      remove_collection_sponsor: {
        collectionId: 'u32',
      },
      create_item: {
        collectionId: 'u32',
        owner: 'PalletEvmAccountBasicCrossAccountIdRepr',
        data: 'UpDataStructsCreateItemData',
      },
      create_multiple_items: {
        collectionId: 'u32',
        owner: 'PalletEvmAccountBasicCrossAccountIdRepr',
        itemsData: 'Vec<UpDataStructsCreateItemData>',
      },
      set_collection_properties: {
        collectionId: 'u32',
        properties: 'Vec<UpDataStructsProperty>',
      },
      delete_collection_properties: {
        collectionId: 'u32',
        propertyKeys: 'Vec<Bytes>',
      },
      set_token_properties: {
        collectionId: 'u32',
        tokenId: 'u32',
        properties: 'Vec<UpDataStructsProperty>',
      },
      delete_token_properties: {
        collectionId: 'u32',
        tokenId: 'u32',
        propertyKeys: 'Vec<Bytes>',
      },
      set_token_property_permissions: {
        collectionId: 'u32',
        propertyPermissions: 'Vec<UpDataStructsPropertyKeyPermission>',
      },
      create_multiple_items_ex: {
        collectionId: 'u32',
        data: 'UpDataStructsCreateItemExData',
      },
      set_transfers_enabled_flag: {
        collectionId: 'u32',
        value: 'bool',
      },
      burn_item: {
        collectionId: 'u32',
        itemId: 'u32',
        value: 'u128',
      },
      burn_from: {
        collectionId: 'u32',
        from: 'PalletEvmAccountBasicCrossAccountIdRepr',
        itemId: 'u32',
        value: 'u128',
      },
      transfer: {
        recipient: 'PalletEvmAccountBasicCrossAccountIdRepr',
        collectionId: 'u32',
        itemId: 'u32',
        value: 'u128',
      },
      approve: {
        spender: 'PalletEvmAccountBasicCrossAccountIdRepr',
        collectionId: 'u32',
        itemId: 'u32',
        amount: 'u128',
      },
      transfer_from: {
        from: 'PalletEvmAccountBasicCrossAccountIdRepr',
        recipient: 'PalletEvmAccountBasicCrossAccountIdRepr',
        collectionId: 'u32',
        itemId: 'u32',
        value: 'u128',
      },
      set_collection_limits: {
        collectionId: 'u32',
        newLimit: 'UpDataStructsCollectionLimits',
      },
      set_collection_permissions: {
        collectionId: 'u32',
        newPermission: 'UpDataStructsCollectionPermissions',
      },
      repartition: {
        collectionId: 'u32',
        tokenId: 'u32',
        amount: 'u128',
      },
      repair_item: {
        collectionId: 'u32',
        itemId: 'u32'
      }
    }
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup242: up_data_structs::CollectionMode
=======
<<<<<<< HEAD
   * Lookup240: up_data_structs::CollectionMode
=======
   * Lookup237: up_data_structs::CollectionMode
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
   * Lookup232: up_data_structs::CollectionMode
>>>>>>> ec6ecdbe... chore: regenerate types
   **/
  UpDataStructsCollectionMode: {
    _enum: {
      NFT: 'Null',
      Fungible: 'u8',
      ReFungible: 'Null'
    }
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup243: up_data_structs::CreateCollectionData<sp_core::crypto::AccountId32>
=======
<<<<<<< HEAD
   * Lookup241: up_data_structs::CreateCollectionData<sp_core::crypto::AccountId32>
=======
   * Lookup238: up_data_structs::CreateCollectionData<sp_core::crypto::AccountId32>
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
   * Lookup233: up_data_structs::CreateCollectionData<sp_core::crypto::AccountId32>
>>>>>>> ec6ecdbe... chore: regenerate types
   **/
  UpDataStructsCreateCollectionData: {
    mode: 'UpDataStructsCollectionMode',
    access: 'Option<UpDataStructsAccessMode>',
    name: 'Vec<u16>',
    description: 'Vec<u16>',
    tokenPrefix: 'Bytes',
    pendingSponsor: 'Option<AccountId32>',
    limits: 'Option<UpDataStructsCollectionLimits>',
    permissions: 'Option<UpDataStructsCollectionPermissions>',
    tokenPropertyPermissions: 'Vec<UpDataStructsPropertyKeyPermission>',
    properties: 'Vec<UpDataStructsProperty>'
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup245: up_data_structs::AccessMode
=======
<<<<<<< HEAD
   * Lookup243: up_data_structs::AccessMode
=======
   * Lookup240: up_data_structs::AccessMode
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
   * Lookup235: up_data_structs::AccessMode
>>>>>>> ec6ecdbe... chore: regenerate types
   **/
  UpDataStructsAccessMode: {
    _enum: ['Normal', 'AllowList']
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup247: up_data_structs::CollectionLimits
=======
<<<<<<< HEAD
   * Lookup245: up_data_structs::CollectionLimits
=======
   * Lookup242: up_data_structs::CollectionLimits
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
   * Lookup237: up_data_structs::CollectionLimits
>>>>>>> ec6ecdbe... chore: regenerate types
   **/
  UpDataStructsCollectionLimits: {
    accountTokenOwnershipLimit: 'Option<u32>',
    sponsoredDataSize: 'Option<u32>',
    sponsoredDataRateLimit: 'Option<UpDataStructsSponsoringRateLimit>',
    tokenLimit: 'Option<u32>',
    sponsorTransferTimeout: 'Option<u32>',
    sponsorApproveTimeout: 'Option<u32>',
    ownerCanTransfer: 'Option<bool>',
    ownerCanDestroy: 'Option<bool>',
    transfersEnabled: 'Option<bool>'
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup249: up_data_structs::SponsoringRateLimit
=======
<<<<<<< HEAD
   * Lookup247: up_data_structs::SponsoringRateLimit
=======
   * Lookup244: up_data_structs::SponsoringRateLimit
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
   * Lookup239: up_data_structs::SponsoringRateLimit
>>>>>>> ec6ecdbe... chore: regenerate types
   **/
  UpDataStructsSponsoringRateLimit: {
    _enum: {
      SponsoringDisabled: 'Null',
      Blocks: 'u32'
    }
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup252: up_data_structs::CollectionPermissions
=======
<<<<<<< HEAD
   * Lookup250: up_data_structs::CollectionPermissions
=======
   * Lookup247: up_data_structs::CollectionPermissions
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
   * Lookup242: up_data_structs::CollectionPermissions
>>>>>>> ec6ecdbe... chore: regenerate types
   **/
  UpDataStructsCollectionPermissions: {
    access: 'Option<UpDataStructsAccessMode>',
    mintMode: 'Option<bool>',
    nesting: 'Option<UpDataStructsNestingPermissions>'
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup254: up_data_structs::NestingPermissions
=======
<<<<<<< HEAD
   * Lookup252: up_data_structs::NestingPermissions
=======
   * Lookup249: up_data_structs::NestingPermissions
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
   * Lookup244: up_data_structs::NestingPermissions
>>>>>>> ec6ecdbe... chore: regenerate types
   **/
  UpDataStructsNestingPermissions: {
    tokenOwner: 'bool',
    collectionAdmin: 'bool',
    restricted: 'Option<UpDataStructsOwnerRestrictedSet>'
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup256: up_data_structs::OwnerRestrictedSet
   **/
  UpDataStructsOwnerRestrictedSet: 'BTreeSet<u32>',
  /**
   * Lookup261: up_data_structs::PropertyKeyPermission
=======
<<<<<<< HEAD
   * Lookup254: up_data_structs::OwnerRestrictedSet
   **/
  UpDataStructsOwnerRestrictedSet: 'BTreeSet<u32>',
  /**
   * Lookup259: up_data_structs::PropertyKeyPermission
=======
   * Lookup251: up_data_structs::OwnerRestrictedSet
   **/
  UpDataStructsOwnerRestrictedSet: 'BTreeSet<u32>',
  /**
   * Lookup256: up_data_structs::PropertyKeyPermission
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
   * Lookup246: up_data_structs::OwnerRestrictedSet
   **/
  UpDataStructsOwnerRestrictedSet: 'BTreeSet<u32>',
  /**
   * Lookup251: up_data_structs::PropertyKeyPermission
>>>>>>> ec6ecdbe... chore: regenerate types
   **/
  UpDataStructsPropertyKeyPermission: {
    key: 'Bytes',
    permission: 'UpDataStructsPropertyPermission'
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup262: up_data_structs::PropertyPermission
=======
<<<<<<< HEAD
   * Lookup260: up_data_structs::PropertyPermission
=======
   * Lookup257: up_data_structs::PropertyPermission
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
   * Lookup252: up_data_structs::PropertyPermission
>>>>>>> ec6ecdbe... chore: regenerate types
   **/
  UpDataStructsPropertyPermission: {
    mutable: 'bool',
    collectionAdmin: 'bool',
    tokenOwner: 'bool'
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup265: up_data_structs::Property
=======
<<<<<<< HEAD
   * Lookup263: up_data_structs::Property
=======
   * Lookup260: up_data_structs::Property
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
   * Lookup255: up_data_structs::Property
>>>>>>> ec6ecdbe... chore: regenerate types
   **/
  UpDataStructsProperty: {
    key: 'Bytes',
    value: 'Bytes'
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup268: up_data_structs::CreateItemData
=======
<<<<<<< HEAD
   * Lookup266: up_data_structs::CreateItemData
=======
   * Lookup263: up_data_structs::CreateItemData
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
   * Lookup258: up_data_structs::CreateItemData
>>>>>>> ec6ecdbe... chore: regenerate types
   **/
  UpDataStructsCreateItemData: {
    _enum: {
      NFT: 'UpDataStructsCreateNftData',
      Fungible: 'UpDataStructsCreateFungibleData',
      ReFungible: 'UpDataStructsCreateReFungibleData'
    }
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup269: up_data_structs::CreateNftData
=======
<<<<<<< HEAD
   * Lookup267: up_data_structs::CreateNftData
=======
   * Lookup264: up_data_structs::CreateNftData
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
   * Lookup259: up_data_structs::CreateNftData
>>>>>>> ec6ecdbe... chore: regenerate types
   **/
  UpDataStructsCreateNftData: {
    properties: 'Vec<UpDataStructsProperty>'
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup270: up_data_structs::CreateFungibleData
=======
<<<<<<< HEAD
   * Lookup268: up_data_structs::CreateFungibleData
=======
   * Lookup265: up_data_structs::CreateFungibleData
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
   * Lookup260: up_data_structs::CreateFungibleData
>>>>>>> ec6ecdbe... chore: regenerate types
   **/
  UpDataStructsCreateFungibleData: {
    value: 'u128'
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup271: up_data_structs::CreateReFungibleData
=======
<<<<<<< HEAD
   * Lookup269: up_data_structs::CreateReFungibleData
=======
   * Lookup266: up_data_structs::CreateReFungibleData
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
   * Lookup261: up_data_structs::CreateReFungibleData
>>>>>>> ec6ecdbe... chore: regenerate types
   **/
  UpDataStructsCreateReFungibleData: {
    pieces: 'u128',
    properties: 'Vec<UpDataStructsProperty>'
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup274: up_data_structs::CreateItemExData<pallet_evm::account::BasicCrossAccountIdRepr<sp_core::crypto::AccountId32>>
=======
<<<<<<< HEAD
   * Lookup272: up_data_structs::CreateItemExData<pallet_evm::account::BasicCrossAccountIdRepr<sp_core::crypto::AccountId32>>
=======
   * Lookup269: up_data_structs::CreateItemExData<pallet_evm::account::BasicCrossAccountIdRepr<sp_core::crypto::AccountId32>>
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
   * Lookup264: up_data_structs::CreateItemExData<pallet_evm::account::BasicCrossAccountIdRepr<sp_core::crypto::AccountId32>>
>>>>>>> ec6ecdbe... chore: regenerate types
   **/
  UpDataStructsCreateItemExData: {
    _enum: {
      NFT: 'Vec<UpDataStructsCreateNftExData>',
      Fungible: 'BTreeMap<PalletEvmAccountBasicCrossAccountIdRepr, u128>',
      RefungibleMultipleItems: 'Vec<UpDataStructsCreateRefungibleExSingleOwner>',
      RefungibleMultipleOwners: 'UpDataStructsCreateRefungibleExMultipleOwners'
    }
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup276: up_data_structs::CreateNftExData<pallet_evm::account::BasicCrossAccountIdRepr<sp_core::crypto::AccountId32>>
=======
<<<<<<< HEAD
   * Lookup274: up_data_structs::CreateNftExData<pallet_evm::account::BasicCrossAccountIdRepr<sp_core::crypto::AccountId32>>
=======
   * Lookup271: up_data_structs::CreateNftExData<pallet_evm::account::BasicCrossAccountIdRepr<sp_core::crypto::AccountId32>>
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
   * Lookup266: up_data_structs::CreateNftExData<pallet_evm::account::BasicCrossAccountIdRepr<sp_core::crypto::AccountId32>>
>>>>>>> ec6ecdbe... chore: regenerate types
   **/
  UpDataStructsCreateNftExData: {
    properties: 'Vec<UpDataStructsProperty>',
    owner: 'PalletEvmAccountBasicCrossAccountIdRepr'
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup283: up_data_structs::CreateRefungibleExSingleOwner<pallet_evm::account::BasicCrossAccountIdRepr<sp_core::crypto::AccountId32>>
=======
<<<<<<< HEAD
   * Lookup281: up_data_structs::CreateRefungibleExSingleOwner<pallet_evm::account::BasicCrossAccountIdRepr<sp_core::crypto::AccountId32>>
=======
   * Lookup278: up_data_structs::CreateRefungibleExSingleOwner<pallet_evm::account::BasicCrossAccountIdRepr<sp_core::crypto::AccountId32>>
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
   * Lookup273: up_data_structs::CreateRefungibleExSingleOwner<pallet_evm::account::BasicCrossAccountIdRepr<sp_core::crypto::AccountId32>>
>>>>>>> ec6ecdbe... chore: regenerate types
   **/
  UpDataStructsCreateRefungibleExSingleOwner: {
    user: 'PalletEvmAccountBasicCrossAccountIdRepr',
    pieces: 'u128',
    properties: 'Vec<UpDataStructsProperty>'
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup285: up_data_structs::CreateRefungibleExMultipleOwners<pallet_evm::account::BasicCrossAccountIdRepr<sp_core::crypto::AccountId32>>
=======
<<<<<<< HEAD
   * Lookup283: up_data_structs::CreateRefungibleExMultipleOwners<pallet_evm::account::BasicCrossAccountIdRepr<sp_core::crypto::AccountId32>>
=======
   * Lookup280: up_data_structs::CreateRefungibleExMultipleOwners<pallet_evm::account::BasicCrossAccountIdRepr<sp_core::crypto::AccountId32>>
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
   * Lookup275: up_data_structs::CreateRefungibleExMultipleOwners<pallet_evm::account::BasicCrossAccountIdRepr<sp_core::crypto::AccountId32>>
>>>>>>> ec6ecdbe... chore: regenerate types
   **/
  UpDataStructsCreateRefungibleExMultipleOwners: {
    users: 'BTreeMap<PalletEvmAccountBasicCrossAccountIdRepr, u128>',
    properties: 'Vec<UpDataStructsProperty>'
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup286: pallet_unique_scheduler::pallet::Call<T>
=======
<<<<<<< HEAD
   * Lookup284: pallet_unique_scheduler::pallet::Call<T>
>>>>>>> 394f6563... chore: regenerate stubs & types
   **/
  PalletUniqueSchedulerCall: {
    _enum: {
      schedule_named: {
        id: '[u8;16]',
        when: 'u32',
        maybePeriodic: 'Option<(u32,u32)>',
        priority: 'Option<u8>',
        call: 'FrameSupportScheduleMaybeHashed',
      },
      cancel_named: {
        id: '[u8;16]',
      },
      schedule_named_after: {
        id: '[u8;16]',
        after: 'u32',
        maybePeriodic: 'Option<(u32,u32)>',
        priority: 'Option<u8>',
        call: 'FrameSupportScheduleMaybeHashed',
      },
      change_named_priority: {
        id: '[u8;16]',
        priority: 'u8'
      }
    }
  },
  /**
   * Lookup289: frame_support::traits::schedule::MaybeHashed<opal_runtime::RuntimeCall, primitive_types::H256>
   **/
  FrameSupportScheduleMaybeHashed: {
    _enum: {
      Value: 'Call',
      Hash: 'H256'
    }
  },
  /**
<<<<<<< HEAD
   * Lookup290: pallet_configuration::pallet::Call<T>
=======
   * Lookup288: pallet_configuration::pallet::Call<T>
=======
   * Lookup281: pallet_configuration::pallet::Call<T>
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
   * Lookup276: pallet_configuration::pallet::Call<T>
>>>>>>> ec6ecdbe... chore: regenerate types
   **/
  PalletConfigurationCall: {
    _enum: {
      set_weight_to_fee_coefficient_override: {
        coeff: 'Option<u32>',
      },
      set_min_gas_price_override: {
        coeff: 'Option<u64>',
      },
      set_xcm_allowed_locations: {
        locations: 'Option<Vec<XcmV1MultiLocation>>',
      },
      set_app_promotion_configuration_override: {
        configuration: 'PalletConfigurationAppPromotionConfiguration'
      }
    }
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup292: pallet_template_transaction_payment::Call<T>
=======
<<<<<<< HEAD
   * Lookup290: pallet_template_transaction_payment::Call<T>
>>>>>>> 394f6563... chore: regenerate stubs & types
   **/
  PalletTemplateTransactionPaymentCall: 'Null',
  /**
   * Lookup293: pallet_structure::pallet::Call<T>
   **/
  PalletStructureCall: 'Null',
  /**
<<<<<<< HEAD
   * Lookup294: pallet_rmrk_core::pallet::Call<T>
=======
   * Lookup292: pallet_rmrk_core::pallet::Call<T>
=======
   * Lookup286: pallet_configuration::AppPromotionConfiguration<BlockNumber>
=======
   * Lookup281: pallet_configuration::AppPromotionConfiguration<BlockNumber>
>>>>>>> ec6ecdbe... chore: regenerate types
   **/
  PalletConfigurationAppPromotionConfiguration: {
    recalculationInterval: 'Option<u32>',
    pendingInterval: 'Option<u32>',
    intervalIncome: 'Option<Perbill>',
    maxStakersPerCalculation: 'Option<u8>'
  },
  /**
   * Lookup284: pallet_template_transaction_payment::Call<T>
   **/
  PalletTemplateTransactionPaymentCall: 'Null',
  /**
   * Lookup285: pallet_structure::pallet::Call<T>
   **/
  PalletStructureCall: 'Null',
  /**
<<<<<<< HEAD
   * Lookup291: pallet_rmrk_core::pallet::Call<T>
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
   **/
  PalletRmrkCoreCall: {
    _enum: {
      create_collection: {
        metadata: 'Bytes',
        max: 'Option<u32>',
        symbol: 'Bytes',
      },
      destroy_collection: {
        collectionId: 'u32',
      },
      change_collection_issuer: {
        collectionId: 'u32',
        newIssuer: 'MultiAddress',
      },
      lock_collection: {
        collectionId: 'u32',
      },
      mint_nft: {
        owner: 'Option<AccountId32>',
        collectionId: 'u32',
        recipient: 'Option<AccountId32>',
        royaltyAmount: 'Option<Permill>',
        metadata: 'Bytes',
        transferable: 'bool',
        resources: 'Option<Vec<RmrkTraitsResourceResourceTypes>>',
      },
      burn_nft: {
        collectionId: 'u32',
        nftId: 'u32',
        maxBurns: 'u32',
      },
      send: {
        rmrkCollectionId: 'u32',
        rmrkNftId: 'u32',
        newOwner: 'RmrkTraitsNftAccountIdOrCollectionNftTuple',
      },
      accept_nft: {
        rmrkCollectionId: 'u32',
        rmrkNftId: 'u32',
        newOwner: 'RmrkTraitsNftAccountIdOrCollectionNftTuple',
      },
      reject_nft: {
        rmrkCollectionId: 'u32',
        rmrkNftId: 'u32',
      },
      accept_resource: {
        rmrkCollectionId: 'u32',
        rmrkNftId: 'u32',
        resourceId: 'u32',
      },
      accept_resource_removal: {
        rmrkCollectionId: 'u32',
        rmrkNftId: 'u32',
        resourceId: 'u32',
      },
      set_property: {
        rmrkCollectionId: 'Compact<u32>',
        maybeNftId: 'Option<u32>',
        key: 'Bytes',
        value: 'Bytes',
      },
      set_priority: {
        rmrkCollectionId: 'u32',
        rmrkNftId: 'u32',
        priorities: 'Vec<u32>',
      },
      add_basic_resource: {
        rmrkCollectionId: 'u32',
        nftId: 'u32',
        resource: 'RmrkTraitsResourceBasicResource',
      },
      add_composable_resource: {
        rmrkCollectionId: 'u32',
        nftId: 'u32',
        resource: 'RmrkTraitsResourceComposableResource',
      },
      add_slot_resource: {
        rmrkCollectionId: 'u32',
        nftId: 'u32',
        resource: 'RmrkTraitsResourceSlotResource',
      },
      remove_resource: {
        rmrkCollectionId: 'u32',
        nftId: 'u32',
        resourceId: 'u32'
      }
    }
  },
  /**
<<<<<<< HEAD
   * Lookup300: rmrk_traits::resource::ResourceTypes<sp_core::bounded::bounded_vec::BoundedVec<T, S>, sp_core::bounded::bounded_vec::BoundedVec<T, S>>
=======
<<<<<<< HEAD
   * Lookup298: rmrk_traits::resource::ResourceTypes<sp_core::bounded::bounded_vec::BoundedVec<T, S>, sp_core::bounded::bounded_vec::BoundedVec<T, S>>
=======
   * Lookup297: rmrk_traits::resource::ResourceTypes<sp_core::bounded::bounded_vec::BoundedVec<T, S>, sp_core::bounded::bounded_vec::BoundedVec<T, S>>
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
   **/
  RmrkTraitsResourceResourceTypes: {
    _enum: {
      Basic: 'RmrkTraitsResourceBasicResource',
      Composable: 'RmrkTraitsResourceComposableResource',
      Slot: 'RmrkTraitsResourceSlotResource'
    }
  },
  /**
<<<<<<< HEAD
   * Lookup302: rmrk_traits::resource::BasicResource<sp_core::bounded::bounded_vec::BoundedVec<T, S>>
=======
<<<<<<< HEAD
   * Lookup300: rmrk_traits::resource::BasicResource<sp_core::bounded::bounded_vec::BoundedVec<T, S>>
=======
   * Lookup299: rmrk_traits::resource::BasicResource<sp_core::bounded::bounded_vec::BoundedVec<T, S>>
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
   **/
  RmrkTraitsResourceBasicResource: {
    src: 'Option<Bytes>',
    metadata: 'Option<Bytes>',
    license: 'Option<Bytes>',
    thumb: 'Option<Bytes>'
  },
  /**
<<<<<<< HEAD
   * Lookup304: rmrk_traits::resource::ComposableResource<sp_core::bounded::bounded_vec::BoundedVec<T, S>, sp_core::bounded::bounded_vec::BoundedVec<T, S>>
=======
<<<<<<< HEAD
   * Lookup302: rmrk_traits::resource::ComposableResource<sp_core::bounded::bounded_vec::BoundedVec<T, S>, sp_core::bounded::bounded_vec::BoundedVec<T, S>>
=======
   * Lookup301: rmrk_traits::resource::ComposableResource<sp_core::bounded::bounded_vec::BoundedVec<T, S>, sp_core::bounded::bounded_vec::BoundedVec<T, S>>
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
   **/
  RmrkTraitsResourceComposableResource: {
    parts: 'Vec<u32>',
    base: 'u32',
    src: 'Option<Bytes>',
    metadata: 'Option<Bytes>',
    license: 'Option<Bytes>',
    thumb: 'Option<Bytes>'
  },
  /**
<<<<<<< HEAD
   * Lookup305: rmrk_traits::resource::SlotResource<sp_core::bounded::bounded_vec::BoundedVec<T, S>>
=======
<<<<<<< HEAD
   * Lookup303: rmrk_traits::resource::SlotResource<sp_core::bounded::bounded_vec::BoundedVec<T, S>>
=======
   * Lookup302: rmrk_traits::resource::SlotResource<sp_core::bounded::bounded_vec::BoundedVec<T, S>>
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
   **/
  RmrkTraitsResourceSlotResource: {
    base: 'u32',
    src: 'Option<Bytes>',
    metadata: 'Option<Bytes>',
    slot: 'u32',
    license: 'Option<Bytes>',
    thumb: 'Option<Bytes>'
  },
  /**
<<<<<<< HEAD
   * Lookup308: pallet_rmrk_equip::pallet::Call<T>
=======
<<<<<<< HEAD
   * Lookup306: pallet_rmrk_equip::pallet::Call<T>
=======
   * Lookup305: pallet_rmrk_equip::pallet::Call<T>
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
   **/
  PalletRmrkEquipCall: {
    _enum: {
      create_base: {
        baseType: 'Bytes',
        symbol: 'Bytes',
        parts: 'Vec<RmrkTraitsPartPartType>',
      },
      theme_add: {
        baseId: 'u32',
        theme: 'RmrkTraitsTheme',
      },
      equippable: {
        baseId: 'u32',
        slotId: 'u32',
        equippables: 'RmrkTraitsPartEquippableList'
      }
    }
  },
  /**
<<<<<<< HEAD
   * Lookup311: rmrk_traits::part::PartType<sp_core::bounded::bounded_vec::BoundedVec<T, S>, sp_core::bounded::bounded_vec::BoundedVec<T, S>>
=======
<<<<<<< HEAD
   * Lookup309: rmrk_traits::part::PartType<sp_core::bounded::bounded_vec::BoundedVec<T, S>, sp_core::bounded::bounded_vec::BoundedVec<T, S>>
=======
   * Lookup308: rmrk_traits::part::PartType<sp_core::bounded::bounded_vec::BoundedVec<T, S>, sp_core::bounded::bounded_vec::BoundedVec<T, S>>
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
   **/
  RmrkTraitsPartPartType: {
    _enum: {
      FixedPart: 'RmrkTraitsPartFixedPart',
      SlotPart: 'RmrkTraitsPartSlotPart'
    }
  },
  /**
<<<<<<< HEAD
   * Lookup313: rmrk_traits::part::FixedPart<sp_core::bounded::bounded_vec::BoundedVec<T, S>>
=======
<<<<<<< HEAD
   * Lookup311: rmrk_traits::part::FixedPart<sp_core::bounded::bounded_vec::BoundedVec<T, S>>
=======
   * Lookup310: rmrk_traits::part::FixedPart<sp_core::bounded::bounded_vec::BoundedVec<T, S>>
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
   **/
  RmrkTraitsPartFixedPart: {
    id: 'u32',
    z: 'u32',
    src: 'Bytes'
  },
  /**
<<<<<<< HEAD
   * Lookup314: rmrk_traits::part::SlotPart<sp_core::bounded::bounded_vec::BoundedVec<T, S>, sp_core::bounded::bounded_vec::BoundedVec<T, S>>
=======
<<<<<<< HEAD
   * Lookup312: rmrk_traits::part::SlotPart<sp_core::bounded::bounded_vec::BoundedVec<T, S>, sp_core::bounded::bounded_vec::BoundedVec<T, S>>
=======
   * Lookup311: rmrk_traits::part::SlotPart<sp_core::bounded::bounded_vec::BoundedVec<T, S>, sp_core::bounded::bounded_vec::BoundedVec<T, S>>
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
   **/
  RmrkTraitsPartSlotPart: {
    id: 'u32',
    equippable: 'RmrkTraitsPartEquippableList',
    src: 'Bytes',
    z: 'u32'
  },
  /**
<<<<<<< HEAD
   * Lookup315: rmrk_traits::part::EquippableList<sp_core::bounded::bounded_vec::BoundedVec<T, S>>
=======
<<<<<<< HEAD
   * Lookup313: rmrk_traits::part::EquippableList<sp_core::bounded::bounded_vec::BoundedVec<T, S>>
=======
   * Lookup312: rmrk_traits::part::EquippableList<sp_core::bounded::bounded_vec::BoundedVec<T, S>>
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
   **/
  RmrkTraitsPartEquippableList: {
    _enum: {
      All: 'Null',
      Empty: 'Null',
      Custom: 'Vec<u32>'
    }
  },
  /**
<<<<<<< HEAD
   * Lookup317: rmrk_traits::theme::Theme<sp_core::bounded::bounded_vec::BoundedVec<T, S>, sp_core::bounded::bounded_vec::BoundedVec<rmrk_traits::theme::ThemeProperty<sp_core::bounded::bounded_vec::BoundedVec<T, S>>, S>>
=======
<<<<<<< HEAD
   * Lookup315: rmrk_traits::theme::Theme<sp_core::bounded::bounded_vec::BoundedVec<T, S>, sp_core::bounded::bounded_vec::BoundedVec<rmrk_traits::theme::ThemeProperty<sp_core::bounded::bounded_vec::BoundedVec<T, S>>, S>>
=======
   * Lookup314: rmrk_traits::theme::Theme<sp_core::bounded::bounded_vec::BoundedVec<T, S>, sp_core::bounded::bounded_vec::BoundedVec<rmrk_traits::theme::ThemeProperty<sp_core::bounded::bounded_vec::BoundedVec<T, S>>, S>>
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
   **/
  RmrkTraitsTheme: {
    name: 'Bytes',
    properties: 'Vec<RmrkTraitsThemeThemeProperty>',
    inherit: 'bool'
  },
  /**
<<<<<<< HEAD
   * Lookup319: rmrk_traits::theme::ThemeProperty<sp_core::bounded::bounded_vec::BoundedVec<T, S>>
=======
<<<<<<< HEAD
   * Lookup317: rmrk_traits::theme::ThemeProperty<sp_core::bounded::bounded_vec::BoundedVec<T, S>>
=======
   * Lookup316: rmrk_traits::theme::ThemeProperty<sp_core::bounded::bounded_vec::BoundedVec<T, S>>
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
   **/
  RmrkTraitsThemeThemeProperty: {
    key: 'Bytes',
    value: 'Bytes'
  },
  /**
<<<<<<< HEAD
   * Lookup321: pallet_app_promotion::pallet::Call<T>
=======
<<<<<<< HEAD
   * Lookup319: pallet_app_promotion::pallet::Call<T>
=======
   * Lookup318: pallet_app_promotion::pallet::Call<T>
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
   * Lookup286: pallet_app_promotion::pallet::Call<T>
>>>>>>> ec6ecdbe... chore: regenerate types
   **/
  PalletAppPromotionCall: {
    _enum: {
      set_admin_address: {
        admin: 'PalletEvmAccountBasicCrossAccountIdRepr',
      },
      stake: {
        amount: 'u128',
      },
      unstake: 'Null',
      sponsor_collection: {
        collectionId: 'u32',
      },
      stop_sponsoring_collection: {
        collectionId: 'u32',
      },
      sponsor_contract: {
        contractId: 'H160',
      },
      stop_sponsoring_contract: {
        contractId: 'H160',
      },
      payout_stakers: {
        stakersNumber: 'Option<u8>'
      }
    }
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup322: pallet_foreign_assets::module::Call<T>
=======
<<<<<<< HEAD
   * Lookup320: pallet_foreign_assets::module::Call<T>
=======
   * Lookup319: pallet_foreign_assets::module::Call<T>
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
   * Lookup287: pallet_foreign_assets::module::Call<T>
>>>>>>> ec6ecdbe... chore: regenerate types
   **/
  PalletForeignAssetsModuleCall: {
    _enum: {
      register_foreign_asset: {
        owner: 'AccountId32',
        location: 'XcmVersionedMultiLocation',
        metadata: 'PalletForeignAssetsModuleAssetMetadata',
      },
      update_foreign_asset: {
        foreignAssetId: 'u32',
        location: 'XcmVersionedMultiLocation',
        metadata: 'PalletForeignAssetsModuleAssetMetadata'
      }
    }
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup323: pallet_evm::pallet::Call<T>
=======
<<<<<<< HEAD
   * Lookup321: pallet_evm::pallet::Call<T>
=======
   * Lookup320: pallet_evm::pallet::Call<T>
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
   * Lookup288: pallet_evm::pallet::Call<T>
>>>>>>> ec6ecdbe... chore: regenerate types
   **/
  PalletEvmCall: {
    _enum: {
      withdraw: {
        address: 'H160',
        value: 'u128',
      },
      call: {
        source: 'H160',
        target: 'H160',
        input: 'Bytes',
        value: 'U256',
        gasLimit: 'u64',
        maxFeePerGas: 'U256',
        maxPriorityFeePerGas: 'Option<U256>',
        nonce: 'Option<U256>',
        accessList: 'Vec<(H160,Vec<H256>)>',
      },
      create: {
        source: 'H160',
        init: 'Bytes',
        value: 'U256',
        gasLimit: 'u64',
        maxFeePerGas: 'U256',
        maxPriorityFeePerGas: 'Option<U256>',
        nonce: 'Option<U256>',
        accessList: 'Vec<(H160,Vec<H256>)>',
      },
      create2: {
        source: 'H160',
        init: 'Bytes',
        salt: 'H256',
        value: 'U256',
        gasLimit: 'u64',
        maxFeePerGas: 'U256',
        maxPriorityFeePerGas: 'Option<U256>',
        nonce: 'Option<U256>',
        accessList: 'Vec<(H160,Vec<H256>)>'
      }
    }
  },
  /**
   * Lookup294: pallet_ethereum::pallet::Call<T>
   **/
  PalletEthereumCall: {
    _enum: {
      transact: {
        transaction: 'EthereumTransactionTransactionV2'
      }
    }
  },
  /**
   * Lookup295: ethereum::transaction::TransactionV2
   **/
  EthereumTransactionTransactionV2: {
    _enum: {
      Legacy: 'EthereumTransactionLegacyTransaction',
      EIP2930: 'EthereumTransactionEip2930Transaction',
      EIP1559: 'EthereumTransactionEip1559Transaction'
    }
  },
  /**
   * Lookup296: ethereum::transaction::LegacyTransaction
   **/
  EthereumTransactionLegacyTransaction: {
    nonce: 'U256',
    gasPrice: 'U256',
    gasLimit: 'U256',
    action: 'EthereumTransactionTransactionAction',
    value: 'U256',
    input: 'Bytes',
    signature: 'EthereumTransactionTransactionSignature'
  },
  /**
   * Lookup297: ethereum::transaction::TransactionAction
   **/
  EthereumTransactionTransactionAction: {
    _enum: {
      Call: 'H160',
      Create: 'Null'
    }
  },
  /**
   * Lookup298: ethereum::transaction::TransactionSignature
   **/
  EthereumTransactionTransactionSignature: {
    v: 'u64',
    r: 'H256',
    s: 'H256'
  },
  /**
   * Lookup300: ethereum::transaction::EIP2930Transaction
   **/
  EthereumTransactionEip2930Transaction: {
    chainId: 'u64',
    nonce: 'U256',
    gasPrice: 'U256',
    gasLimit: 'U256',
    action: 'EthereumTransactionTransactionAction',
    value: 'U256',
    input: 'Bytes',
    accessList: 'Vec<EthereumTransactionAccessListItem>',
    oddYParity: 'bool',
    r: 'H256',
    s: 'H256'
  },
  /**
   * Lookup302: ethereum::transaction::AccessListItem
   **/
  EthereumTransactionAccessListItem: {
    address: 'H160',
    storageKeys: 'Vec<H256>'
  },
  /**
   * Lookup303: ethereum::transaction::EIP1559Transaction
   **/
  EthereumTransactionEip1559Transaction: {
    chainId: 'u64',
    nonce: 'U256',
    maxPriorityFeePerGas: 'U256',
    maxFeePerGas: 'U256',
    gasLimit: 'U256',
    action: 'EthereumTransactionTransactionAction',
    value: 'U256',
    input: 'Bytes',
    accessList: 'Vec<EthereumTransactionAccessListItem>',
    oddYParity: 'bool',
    r: 'H256',
    s: 'H256'
  },
  /**
   * Lookup304: pallet_evm_migration::pallet::Call<T>
   **/
  PalletEvmMigrationCall: {
    _enum: {
      begin: {
        address: 'H160',
      },
      set_data: {
        address: 'H160',
        data: 'Vec<(H256,H256)>',
      },
      finish: {
        address: 'H160',
        code: 'Bytes',
      },
      insert_eth_logs: {
        logs: 'Vec<EthereumLog>',
      },
      insert_events: {
        events: 'Vec<Bytes>'
      }
    }
  },
  /**
   * Lookup308: pallet_maintenance::pallet::Call<T>
   **/
  PalletMaintenanceCall: {
    _enum: ['enable', 'disable']
  },
  /**
   * Lookup309: pallet_sudo::pallet::Error<T>
   **/
  PalletSudoError: {
    _enum: ['RequireSudo']
  },
  /**
   * Lookup311: orml_vesting::module::Error<T>
   **/
  OrmlVestingModuleError: {
    _enum: ['ZeroVestingPeriod', 'ZeroVestingPeriodCount', 'InsufficientBalanceToLock', 'TooManyVestingSchedules', 'AmountLow', 'MaxVestingSchedulesExceeded']
  },
  /**
   * Lookup312: orml_xtokens::module::Error<T>
   **/
  OrmlXtokensModuleError: {
    _enum: ['AssetHasNoReserve', 'NotCrossChainTransfer', 'InvalidDest', 'NotCrossChainTransferableCurrency', 'UnweighableMessage', 'XcmExecutionFailed', 'CannotReanchor', 'InvalidAncestry', 'InvalidAsset', 'DestinationNotInvertible', 'BadVersion', 'DistinctReserveForAssetAndFee', 'ZeroFee', 'ZeroAmount', 'TooManyAssetsBeingSent', 'AssetIndexNonExistent', 'FeeNotEnough', 'NotSupportedMultiLocation', 'MinXcmFeeNotDefined']
  },
  /**
   * Lookup315: orml_tokens::BalanceLock<Balance>
   **/
  OrmlTokensBalanceLock: {
    id: '[u8;8]',
    amount: 'u128'
  },
  /**
   * Lookup317: orml_tokens::AccountData<Balance>
   **/
  OrmlTokensAccountData: {
    free: 'u128',
    reserved: 'u128',
    frozen: 'u128'
  },
  /**
   * Lookup319: orml_tokens::ReserveData<ReserveIdentifier, Balance>
   **/
  OrmlTokensReserveData: {
    id: 'Null',
    amount: 'u128'
  },
  /**
   * Lookup321: orml_tokens::module::Error<T>
   **/
  OrmlTokensModuleError: {
    _enum: ['BalanceTooLow', 'AmountIntoBalanceFailed', 'LiquidityRestrictions', 'MaxLocksExceeded', 'KeepAlive', 'ExistentialDeposit', 'DeadAccount', 'TooManyReserves']
  },
  /**
   * Lookup323: cumulus_pallet_xcmp_queue::InboundChannelDetails
   **/
  CumulusPalletXcmpQueueInboundChannelDetails: {
    sender: 'u32',
    state: 'CumulusPalletXcmpQueueInboundState',
    messageMetadata: 'Vec<(u32,PolkadotParachainPrimitivesXcmpMessageFormat)>'
  },
  /**
   * Lookup324: cumulus_pallet_xcmp_queue::InboundState
   **/
  CumulusPalletXcmpQueueInboundState: {
    _enum: ['Ok', 'Suspended']
  },
  /**
   * Lookup327: polkadot_parachain::primitives::XcmpMessageFormat
   **/
  PolkadotParachainPrimitivesXcmpMessageFormat: {
    _enum: ['ConcatenatedVersionedXcm', 'ConcatenatedEncodedBlob', 'Signals']
  },
  /**
   * Lookup330: cumulus_pallet_xcmp_queue::OutboundChannelDetails
   **/
  CumulusPalletXcmpQueueOutboundChannelDetails: {
    recipient: 'u32',
    state: 'CumulusPalletXcmpQueueOutboundState',
    signalsExist: 'bool',
    firstIndex: 'u16',
    lastIndex: 'u16'
  },
  /**
   * Lookup331: cumulus_pallet_xcmp_queue::OutboundState
   **/
  CumulusPalletXcmpQueueOutboundState: {
    _enum: ['Ok', 'Suspended']
  },
  /**
   * Lookup333: cumulus_pallet_xcmp_queue::QueueConfigData
   **/
  CumulusPalletXcmpQueueQueueConfigData: {
    suspendThreshold: 'u32',
    dropThreshold: 'u32',
    resumeThreshold: 'u32',
    thresholdWeight: 'Weight',
    weightRestrictDecay: 'Weight',
    xcmpMaxIndividualWeight: 'Weight'
  },
  /**
   * Lookup335: cumulus_pallet_xcmp_queue::pallet::Error<T>
   **/
  CumulusPalletXcmpQueueError: {
    _enum: ['FailedToSend', 'BadXcmOrigin', 'BadXcm', 'BadOverweightIndex', 'WeightOverLimit']
  },
  /**
   * Lookup336: pallet_xcm::pallet::Error<T>
   **/
  PalletXcmError: {
    _enum: ['Unreachable', 'SendFailure', 'Filtered', 'UnweighableMessage', 'DestinationNotInvertible', 'Empty', 'CannotReanchor', 'TooManyAssets', 'InvalidOrigin', 'BadVersion', 'BadLocation', 'NoSubscription', 'AlreadySubscribed']
  },
  /**
   * Lookup337: cumulus_pallet_xcm::pallet::Error<T>
   **/
  CumulusPalletXcmError: 'Null',
  /**
   * Lookup338: cumulus_pallet_dmp_queue::ConfigData
   **/
  CumulusPalletDmpQueueConfigData: {
    maxIndividual: 'Weight'
  },
  /**
   * Lookup339: cumulus_pallet_dmp_queue::PageIndexData
   **/
  CumulusPalletDmpQueuePageIndexData: {
    beginUsed: 'u32',
    endUsed: 'u32',
    overweightCount: 'u64'
  },
  /**
   * Lookup342: cumulus_pallet_dmp_queue::pallet::Error<T>
   **/
  CumulusPalletDmpQueueError: {
    _enum: ['Unknown', 'OverLimit']
  },
  /**
   * Lookup346: pallet_unique::Error<T>
   **/
  PalletUniqueError: {
    _enum: ['CollectionDecimalPointLimitExceeded', 'ConfirmUnsetSponsorFail', 'EmptyArgument', 'RepartitionCalledOnNonRefungibleCollection']
  },
  /**
   * Lookup347: pallet_configuration::pallet::Error<T>
   **/
  PalletConfigurationError: {
    _enum: ['InconsistentConfiguration']
  },
  /**
   * Lookup348: up_data_structs::Collection<sp_core::crypto::AccountId32>
   **/
  UpDataStructsCollection: {
    owner: 'AccountId32',
    mode: 'UpDataStructsCollectionMode',
    name: 'Vec<u16>',
    description: 'Vec<u16>',
    tokenPrefix: 'Bytes',
    sponsorship: 'UpDataStructsSponsorshipStateAccountId32',
    limits: 'UpDataStructsCollectionLimits',
    permissions: 'UpDataStructsCollectionPermissions',
    flags: '[u8;1]'
  },
  /**
   * Lookup349: up_data_structs::SponsorshipState<sp_core::crypto::AccountId32>
   **/
  UpDataStructsSponsorshipStateAccountId32: {
    _enum: {
      Disabled: 'Null',
      Unconfirmed: 'AccountId32',
      Confirmed: 'AccountId32'
    }
  },
  /**
   * Lookup351: up_data_structs::Properties
   **/
  UpDataStructsProperties: {
    map: 'UpDataStructsPropertiesMapBoundedVec',
    consumedSpace: 'u32',
    spaceLimit: 'u32'
  },
  /**
   * Lookup352: up_data_structs::PropertiesMap<sp_core::bounded::bounded_vec::BoundedVec<T, S>>
   **/
  UpDataStructsPropertiesMapBoundedVec: 'BTreeMap<Bytes, Bytes>',
  /**
   * Lookup357: up_data_structs::PropertiesMap<up_data_structs::PropertyPermission>
   **/
  UpDataStructsPropertiesMapPropertyPermission: 'BTreeMap<Bytes, UpDataStructsPropertyPermission>',
  /**
   * Lookup364: up_data_structs::CollectionStats
   **/
  UpDataStructsCollectionStats: {
    created: 'u32',
    destroyed: 'u32',
    alive: 'u32'
  },
  /**
   * Lookup365: up_data_structs::TokenChild
   **/
  UpDataStructsTokenChild: {
    token: 'u32',
    collection: 'u32'
  },
  /**
   * Lookup366: PhantomType::up_data_structs<T>
   **/
  PhantomTypeUpDataStructs: '[(UpDataStructsTokenData,UpDataStructsRpcCollection,RmrkTraitsCollectionCollectionInfo,RmrkTraitsNftNftInfo,RmrkTraitsResourceResourceInfo,RmrkTraitsPropertyPropertyInfo,RmrkTraitsBaseBaseInfo,RmrkTraitsPartPartType,RmrkTraitsTheme,RmrkTraitsNftNftChild);0]',
  /**
   * Lookup368: up_data_structs::TokenData<pallet_evm::account::BasicCrossAccountIdRepr<sp_core::crypto::AccountId32>>
   **/
  UpDataStructsTokenData: {
    properties: 'Vec<UpDataStructsProperty>',
    owner: 'Option<PalletEvmAccountBasicCrossAccountIdRepr>',
    pieces: 'u128'
  },
  /**
   * Lookup370: up_data_structs::RpcCollection<sp_core::crypto::AccountId32>
   **/
  UpDataStructsRpcCollection: {
    owner: 'AccountId32',
    mode: 'UpDataStructsCollectionMode',
    name: 'Vec<u16>',
    description: 'Vec<u16>',
    tokenPrefix: 'Bytes',
    sponsorship: 'UpDataStructsSponsorshipStateAccountId32',
    limits: 'UpDataStructsCollectionLimits',
    permissions: 'UpDataStructsCollectionPermissions',
    tokenPropertyPermissions: 'Vec<UpDataStructsPropertyKeyPermission>',
    properties: 'Vec<UpDataStructsProperty>',
    readOnly: 'bool',
    flags: 'UpDataStructsRpcCollectionFlags'
  },
  /**
   * Lookup371: up_data_structs::RpcCollectionFlags
   **/
  UpDataStructsRpcCollectionFlags: {
    foreign: 'bool',
    erc721metadata: 'bool'
  },
  /**
   * Lookup372: rmrk_traits::collection::CollectionInfo<sp_core::bounded::bounded_vec::BoundedVec<T, S>, sp_core::bounded::bounded_vec::BoundedVec<T, S>, sp_core::crypto::AccountId32>
   **/
  RmrkTraitsCollectionCollectionInfo: {
    issuer: 'AccountId32',
    metadata: 'Bytes',
    max: 'Option<u32>',
    symbol: 'Bytes',
    nftsCount: 'u32'
  },
  /**
   * Lookup375: rmrk_traits::nft::NftInfo<sp_core::crypto::AccountId32, sp_arithmetic::per_things::Permill, sp_core::bounded::bounded_vec::BoundedVec<T, S>>
   **/
  RmrkTraitsNftNftInfo: {
    owner: 'RmrkTraitsNftAccountIdOrCollectionNftTuple',
    royalty: 'Option<RmrkTraitsNftRoyaltyInfo>',
    metadata: 'Bytes',
    equipped: 'bool',
    pending: 'bool'
  },
  /**
   * Lookup376: rmrk_traits::nft::AccountIdOrCollectionNftTuple<sp_core::crypto::AccountId32>
   **/
  RmrkTraitsNftAccountIdOrCollectionNftTuple: {
    _enum: {
      AccountId: 'AccountId32',
      CollectionAndNftTuple: '(u32,u32)'
    }
  },
  /**
   * Lookup378: rmrk_traits::nft::RoyaltyInfo<sp_core::crypto::AccountId32, sp_arithmetic::per_things::Permill>
   **/
  RmrkTraitsNftRoyaltyInfo: {
    recipient: 'AccountId32',
    amount: 'Permill'
  },
  /**
   * Lookup379: rmrk_traits::resource::ResourceInfo<sp_core::bounded::bounded_vec::BoundedVec<T, S>, sp_core::bounded::bounded_vec::BoundedVec<T, S>>
   **/
  RmrkTraitsResourceResourceInfo: {
    id: 'u32',
    resource: 'RmrkTraitsResourceResourceTypes',
    pending: 'bool',
    pendingRemoval: 'bool'
  },
  /**
   * Lookup381: rmrk_traits::resource::ResourceTypes<sp_core::bounded::bounded_vec::BoundedVec<T, S>, sp_core::bounded::bounded_vec::BoundedVec<T, S>>
   **/
  RmrkTraitsResourceResourceTypes: {
    _enum: {
      Basic: 'RmrkTraitsResourceBasicResource',
      Composable: 'RmrkTraitsResourceComposableResource',
      Slot: 'RmrkTraitsResourceSlotResource'
    }
  },
  /**
   * Lookup382: rmrk_traits::resource::BasicResource<sp_core::bounded::bounded_vec::BoundedVec<T, S>>
   **/
  RmrkTraitsResourceBasicResource: {
    src: 'Option<Bytes>',
    metadata: 'Option<Bytes>',
    license: 'Option<Bytes>',
    thumb: 'Option<Bytes>'
  },
  /**
   * Lookup384: rmrk_traits::resource::ComposableResource<sp_core::bounded::bounded_vec::BoundedVec<T, S>, sp_core::bounded::bounded_vec::BoundedVec<T, S>>
   **/
  RmrkTraitsResourceComposableResource: {
    parts: 'Vec<u32>',
    base: 'u32',
    src: 'Option<Bytes>',
    metadata: 'Option<Bytes>',
    license: 'Option<Bytes>',
    thumb: 'Option<Bytes>'
  },
  /**
   * Lookup385: rmrk_traits::resource::SlotResource<sp_core::bounded::bounded_vec::BoundedVec<T, S>>
   **/
  RmrkTraitsResourceSlotResource: {
    base: 'u32',
    src: 'Option<Bytes>',
    metadata: 'Option<Bytes>',
    slot: 'u32',
    license: 'Option<Bytes>',
    thumb: 'Option<Bytes>'
  },
  /**
   * Lookup386: rmrk_traits::property::PropertyInfo<sp_core::bounded::bounded_vec::BoundedVec<T, S>, sp_core::bounded::bounded_vec::BoundedVec<T, S>>
   **/
  RmrkTraitsPropertyPropertyInfo: {
    key: 'Bytes',
    value: 'Bytes'
  },
  /**
   * Lookup389: rmrk_traits::base::BaseInfo<sp_core::crypto::AccountId32, sp_core::bounded::bounded_vec::BoundedVec<T, S>>
   **/
  RmrkTraitsBaseBaseInfo: {
    issuer: 'AccountId32',
    baseType: 'Bytes',
    symbol: 'Bytes'
  },
  /**
   * Lookup390: rmrk_traits::part::PartType<sp_core::bounded::bounded_vec::BoundedVec<T, S>, sp_core::bounded::bounded_vec::BoundedVec<T, S>>
   **/
  RmrkTraitsPartPartType: {
    _enum: {
      FixedPart: 'RmrkTraitsPartFixedPart',
      SlotPart: 'RmrkTraitsPartSlotPart'
    }
  },
  /**
   * Lookup392: rmrk_traits::part::FixedPart<sp_core::bounded::bounded_vec::BoundedVec<T, S>>
   **/
  RmrkTraitsPartFixedPart: {
    id: 'u32',
    z: 'u32',
    src: 'Bytes'
  },
  /**
   * Lookup393: rmrk_traits::part::SlotPart<sp_core::bounded::bounded_vec::BoundedVec<T, S>, sp_core::bounded::bounded_vec::BoundedVec<T, S>>
   **/
  RmrkTraitsPartSlotPart: {
    id: 'u32',
    equippable: 'RmrkTraitsPartEquippableList',
    src: 'Bytes',
    z: 'u32'
  },
  /**
   * Lookup394: rmrk_traits::part::EquippableList<sp_core::bounded::bounded_vec::BoundedVec<T, S>>
   **/
  RmrkTraitsPartEquippableList: {
    _enum: {
      All: 'Null',
      Empty: 'Null',
      Custom: 'Vec<u32>'
    }
  },
  /**
   * Lookup395: rmrk_traits::theme::Theme<sp_core::bounded::bounded_vec::BoundedVec<T, S>, sp_core::bounded::bounded_vec::BoundedVec<rmrk_traits::theme::ThemeProperty<sp_core::bounded::bounded_vec::BoundedVec<T, S>>, S>>
   **/
  RmrkTraitsTheme: {
    name: 'Bytes',
    properties: 'Vec<RmrkTraitsThemeThemeProperty>',
    inherit: 'bool'
  },
  /**
   * Lookup397: rmrk_traits::theme::ThemeProperty<sp_core::bounded::bounded_vec::BoundedVec<T, S>>
   **/
  RmrkTraitsThemeThemeProperty: {
    key: 'Bytes',
    value: 'Bytes'
  },
  /**
   * Lookup399: rmrk_traits::nft::NftChild
   **/
  RmrkTraitsNftNftChild: {
    collectionId: 'u32',
    nftId: 'u32'
  },
  /**
   * Lookup401: pallet_common::pallet::Error<T>
   **/
  PalletCommonError: {
    _enum: ['CollectionNotFound', 'MustBeTokenOwner', 'NoPermission', 'CantDestroyNotEmptyCollection', 'PublicMintingNotAllowed', 'AddressNotInAllowlist', 'CollectionNameLimitExceeded', 'CollectionDescriptionLimitExceeded', 'CollectionTokenPrefixLimitExceeded', 'TotalCollectionsLimitExceeded', 'CollectionAdminCountExceeded', 'CollectionLimitBoundsExceeded', 'OwnerPermissionsCantBeReverted', 'TransferNotAllowed', 'AccountTokenLimitExceeded', 'CollectionTokenLimitExceeded', 'MetadataFlagFrozen', 'TokenNotFound', 'TokenValueTooLow', 'ApprovedValueTooLow', 'CantApproveMoreThanOwned', 'AddressIsZero', 'UnsupportedOperation', 'NotSufficientFounds', 'UserIsNotAllowedToNest', 'SourceCollectionIsNotAllowedToNest', 'CollectionFieldSizeExceeded', 'NoSpaceForProperty', 'PropertyLimitReached', 'PropertyKeyIsTooLong', 'InvalidCharacterInPropertyKey', 'EmptyPropertyKey', 'CollectionIsExternal', 'CollectionIsInternal']
  },
  /**
   * Lookup403: pallet_fungible::pallet::Error<T>
   **/
  PalletFungibleError: {
    _enum: ['NotFungibleDataUsedToMintFungibleCollectionToken', 'FungibleItemsHaveNoId', 'FungibleItemsDontHaveData', 'FungibleDisallowsNesting', 'SettingPropertiesNotAllowed', 'FungibleTokensAreAlwaysValid']
  },
  /**
   * Lookup404: pallet_refungible::ItemData
   **/
  PalletRefungibleItemData: {
    constData: 'Bytes'
  },
  /**
   * Lookup409: pallet_refungible::pallet::Error<T>
   **/
  PalletRefungibleError: {
    _enum: ['NotRefungibleDataUsedToMintFungibleCollectionToken', 'WrongRefungiblePieces', 'RepartitionWhileNotOwningAllPieces', 'RefungibleDisallowsNesting', 'SettingPropertiesNotAllowed']
  },
  /**
   * Lookup410: pallet_nonfungible::ItemData<pallet_evm::account::BasicCrossAccountIdRepr<sp_core::crypto::AccountId32>>
   **/
  PalletNonfungibleItemData: {
    owner: 'PalletEvmAccountBasicCrossAccountIdRepr'
  },
  /**
   * Lookup412: up_data_structs::PropertyScope
   **/
  UpDataStructsPropertyScope: {
    _enum: ['None', 'Rmrk']
  },
  /**
   * Lookup414: pallet_nonfungible::pallet::Error<T>
   **/
  PalletNonfungibleError: {
    _enum: ['NotNonfungibleDataUsedToMintFungibleCollectionToken', 'NonfungibleItemsHaveNoAmount', 'CantBurnNftWithChildren']
  },
  /**
   * Lookup415: pallet_structure::pallet::Error<T>
   **/
  PalletStructureError: {
    _enum: ['OuroborosDetected', 'DepthLimit', 'BreadthLimit', 'TokenNotFound']
  },
  /**
   * Lookup421: pallet_app_promotion::pallet::Error<T>
   **/
  PalletAppPromotionError: {
    _enum: ['AdminNotSet', 'NoPermission', 'NotSufficientFunds', 'PendingForBlockOverflow', 'SponsorNotSet', 'IncorrectLockedBalanceOperation']
  },
  /**
   * Lookup422: pallet_foreign_assets::module::Error<T>
   **/
  PalletForeignAssetsModuleError: {
    _enum: ['BadLocation', 'MultiLocationExisted', 'AssetIdNotExists', 'AssetIdExisted']
  },
  /**
   * Lookup424: pallet_evm::pallet::Error<T>
   **/
  PalletEvmError: {
    _enum: ['BalanceLow', 'FeeOverflow', 'PaymentOverflow', 'WithdrawFailed', 'GasPriceTooLow', 'InvalidNonce']
  },
  /**
   * Lookup427: fp_rpc::TransactionStatus
   **/
  FpRpcTransactionStatus: {
    transactionHash: 'H256',
    transactionIndex: 'u32',
    from: 'H160',
    to: 'Option<H160>',
    contractAddress: 'Option<H160>',
    logs: 'Vec<EthereumLog>',
    logsBloom: 'EthbloomBloom'
  },
  /**
   * Lookup429: ethbloom::Bloom
   **/
  EthbloomBloom: '[u8;256]',
  /**
   * Lookup431: ethereum::receipt::ReceiptV3
   **/
  EthereumReceiptReceiptV3: {
    _enum: {
      Legacy: 'EthereumReceiptEip658ReceiptData',
      EIP2930: 'EthereumReceiptEip658ReceiptData',
      EIP1559: 'EthereumReceiptEip658ReceiptData'
    }
  },
  /**
   * Lookup432: ethereum::receipt::EIP658ReceiptData
   **/
  EthereumReceiptEip658ReceiptData: {
    statusCode: 'u8',
    usedGas: 'U256',
    logsBloom: 'EthbloomBloom',
    logs: 'Vec<EthereumLog>'
  },
  /**
   * Lookup433: ethereum::block::Block<ethereum::transaction::TransactionV2>
   **/
  EthereumBlock: {
    header: 'EthereumHeader',
    transactions: 'Vec<EthereumTransactionTransactionV2>',
    ommers: 'Vec<EthereumHeader>'
  },
  /**
   * Lookup434: ethereum::header::Header
   **/
  EthereumHeader: {
    parentHash: 'H256',
    ommersHash: 'H256',
    beneficiary: 'H160',
    stateRoot: 'H256',
    transactionsRoot: 'H256',
    receiptsRoot: 'H256',
    logsBloom: 'EthbloomBloom',
    difficulty: 'U256',
    number: 'U256',
    gasLimit: 'U256',
    gasUsed: 'U256',
    timestamp: 'u64',
    extraData: 'Bytes',
    mixHash: 'H256',
    nonce: 'EthereumTypesHashH64'
  },
  /**
   * Lookup435: ethereum_types::hash::H64
   **/
  EthereumTypesHashH64: '[u8;8]',
  /**
   * Lookup440: pallet_ethereum::pallet::Error<T>
   **/
  PalletEthereumError: {
    _enum: ['InvalidSignature', 'PreLogExists']
  },
  /**
   * Lookup441: pallet_evm_coder_substrate::pallet::Error<T>
   **/
  PalletEvmCoderSubstrateError: {
    _enum: ['OutOfGas', 'OutOfFund']
  },
  /**
   * Lookup442: up_data_structs::SponsorshipState<pallet_evm::account::BasicCrossAccountIdRepr<sp_core::crypto::AccountId32>>
   **/
  UpDataStructsSponsorshipStateBasicCrossAccountIdRepr: {
    _enum: {
      Disabled: 'Null',
      Unconfirmed: 'PalletEvmAccountBasicCrossAccountIdRepr',
      Confirmed: 'PalletEvmAccountBasicCrossAccountIdRepr'
    }
  },
  /**
   * Lookup443: pallet_evm_contract_helpers::SponsoringModeT
   **/
  PalletEvmContractHelpersSponsoringModeT: {
    _enum: ['Disabled', 'Allowlisted', 'Generous']
  },
  /**
   * Lookup449: pallet_evm_contract_helpers::pallet::Error<T>
   **/
  PalletEvmContractHelpersError: {
    _enum: ['NoPermission', 'NoPendingSponsor', 'TooManyMethodsHaveSponsoredLimit']
  },
  /**
   * Lookup450: pallet_evm_migration::pallet::Error<T>
   **/
  PalletEvmMigrationError: {
    _enum: ['AccountNotEmpty', 'AccountIsNotMigrating', 'BadEvent']
  },
  /**
   * Lookup451: pallet_maintenance::pallet::Error<T>
   **/
  PalletMaintenanceError: 'Null',
  /**
   * Lookup453: sp_runtime::MultiSignature
   **/
  SpRuntimeMultiSignature: {
    _enum: {
      Ed25519: 'SpCoreEd25519Signature',
      Sr25519: 'SpCoreSr25519Signature',
      Ecdsa: 'SpCoreEcdsaSignature'
    }
  },
  /**
   * Lookup454: sp_core::ed25519::Signature
   **/
  SpCoreEd25519Signature: '[u8;64]',
  /**
   * Lookup456: sp_core::sr25519::Signature
   **/
  SpCoreSr25519Signature: '[u8;64]',
  /**
   * Lookup457: sp_core::ecdsa::Signature
   **/
  SpCoreEcdsaSignature: '[u8;65]',
  /**
   * Lookup460: frame_system::extensions::check_spec_version::CheckSpecVersion<T>
   **/
  FrameSystemExtensionsCheckSpecVersion: 'Null',
  /**
   * Lookup461: frame_system::extensions::check_tx_version::CheckTxVersion<T>
   **/
  FrameSystemExtensionsCheckTxVersion: 'Null',
  /**
   * Lookup462: frame_system::extensions::check_genesis::CheckGenesis<T>
   **/
  FrameSystemExtensionsCheckGenesis: 'Null',
  /**
   * Lookup465: frame_system::extensions::check_nonce::CheckNonce<T>
   **/
  FrameSystemExtensionsCheckNonce: 'Compact<u32>',
  /**
   * Lookup466: frame_system::extensions::check_weight::CheckWeight<T>
   **/
  FrameSystemExtensionsCheckWeight: 'Null',
  /**
   * Lookup467: opal_runtime::runtime_common::maintenance::CheckMaintenance
   **/
  OpalRuntimeRuntimeCommonMaintenanceCheckMaintenance: 'Null',
  /**
   * Lookup468: pallet_template_transaction_payment::ChargeTransactionPayment<opal_runtime::Runtime>
   **/
  PalletTemplateTransactionPaymentChargeTransactionPayment: 'Compact<u128>',
  /**
   * Lookup469: opal_runtime::Runtime
   **/
  OpalRuntimeRuntime: 'Null',
  /**
   * Lookup470: pallet_ethereum::FakeTransactionFinalizer<opal_runtime::Runtime>
   **/
  PalletEthereumFakeTransactionFinalizer: 'Null'
};
