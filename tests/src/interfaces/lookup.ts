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
    normal: 'SpWeightsWeightV2Weight',
    operational: 'SpWeightsWeightV2Weight',
    mandatory: 'SpWeightsWeightV2Weight'
  },
  /**
   * Lookup8: sp_weights::weight_v2::Weight
   **/
  SpWeightsWeightV2Weight: {
    refTime: 'Compact<u64>',
    proofSize: 'Compact<u64>'
  },
  /**
   * Lookup13: sp_runtime::generic::digest::Digest
   **/
  SpRuntimeDigest: {
    logs: 'Vec<SpRuntimeDigestDigestItem>'
  },
  /**
   * Lookup15: sp_runtime::generic::digest::DigestItem
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
   * Lookup18: frame_system::EventRecord<opal_runtime::RuntimeEvent, primitive_types::H256>
   **/
  FrameSystemEventRecord: {
    phase: 'FrameSystemPhase',
    event: 'Event',
    topics: 'Vec<H256>'
  },
  /**
   * Lookup20: frame_system::pallet::Event<T>
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
   * Lookup21: frame_support::dispatch::DispatchInfo
   **/
  FrameSupportDispatchDispatchInfo: {
    weight: 'SpWeightsWeightV2Weight',
    class: 'FrameSupportDispatchDispatchClass',
    paysFee: 'FrameSupportDispatchPays'
  },
  /**
   * Lookup22: frame_support::dispatch::DispatchClass
   **/
  FrameSupportDispatchDispatchClass: {
    _enum: ['Normal', 'Operational', 'Mandatory']
  },
  /**
   * Lookup23: frame_support::dispatch::Pays
   **/
  FrameSupportDispatchPays: {
    _enum: ['Yes', 'No']
  },
  /**
   * Lookup24: sp_runtime::DispatchError
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
      Transactional: 'SpRuntimeTransactionalError',
      Exhausted: 'Null',
      Corruption: 'Null',
      Unavailable: 'Null'
    }
  },
  /**
   * Lookup25: sp_runtime::ModuleError
   **/
  SpRuntimeModuleError: {
    index: 'u8',
    error: '[u8;4]'
  },
  /**
   * Lookup26: sp_runtime::TokenError
   **/
  SpRuntimeTokenError: {
    _enum: ['NoFunds', 'WouldDie', 'BelowMinimum', 'CannotCreate', 'UnknownAsset', 'Frozen', 'Unsupported']
  },
  /**
   * Lookup27: sp_runtime::ArithmeticError
   **/
  SpRuntimeArithmeticError: {
    _enum: ['Underflow', 'Overflow', 'DivisionByZero']
  },
  /**
   * Lookup28: sp_runtime::TransactionalError
   **/
  SpRuntimeTransactionalError: {
    _enum: ['LimitReached', 'NoLayer']
  },
  /**
   * Lookup29: cumulus_pallet_parachain_system::pallet::Event<T>
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
        weightUsed: 'SpWeightsWeightV2Weight',
        dmqHead: 'H256'
      }
    }
  },
  /**
   * Lookup30: pallet_balances::pallet::Event<T, I>
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
   * Lookup31: frame_support::traits::tokens::misc::BalanceStatus
   **/
  FrameSupportTokensMiscBalanceStatus: {
    _enum: ['Free', 'Reserved']
  },
  /**
   * Lookup32: pallet_transaction_payment::pallet::Event<T>
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
   * Lookup33: pallet_treasury::pallet::Event<T, I>
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
   * Lookup34: pallet_sudo::pallet::Event<T>
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
   * Lookup38: orml_vesting::module::Event<T>
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
   * Lookup39: orml_vesting::VestingSchedule<BlockNumber, Balance>
   **/
  OrmlVestingVestingSchedule: {
    start: 'u32',
    period: 'u32',
    periodCount: 'u32',
    perPeriod: 'Compact<u128>'
  },
  /**
   * Lookup41: orml_xtokens::module::Event<T>
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
   * Lookup42: xcm::v1::multiasset::MultiAssets
   **/
  XcmV1MultiassetMultiAssets: 'Vec<XcmV1MultiAsset>',
  /**
   * Lookup44: xcm::v1::multiasset::MultiAsset
   **/
  XcmV1MultiAsset: {
    id: 'XcmV1MultiassetAssetId',
    fun: 'XcmV1MultiassetFungibility'
  },
  /**
   * Lookup45: xcm::v1::multiasset::AssetId
   **/
  XcmV1MultiassetAssetId: {
    _enum: {
      Concrete: 'XcmV1MultiLocation',
      Abstract: 'Bytes'
    }
  },
  /**
   * Lookup46: xcm::v1::multilocation::MultiLocation
   **/
  XcmV1MultiLocation: {
    parents: 'u8',
    interior: 'XcmV1MultilocationJunctions'
  },
  /**
   * Lookup47: xcm::v1::multilocation::Junctions
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
   * Lookup48: xcm::v1::junction::Junction
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
   * Lookup50: xcm::v0::junction::NetworkId
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
        weight: 'SpWeightsWeightV2Weight',
      },
      Fail: {
        messageHash: 'Option<H256>',
        error: 'XcmV2TraitsError',
        weight: 'SpWeightsWeightV2Weight',
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
        required: 'SpWeightsWeightV2Weight',
      },
      OverweightServiced: {
        index: 'u64',
        used: 'SpWeightsWeightV2Weight'
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
      NotifyOverweight: '(u64,u8,u8,SpWeightsWeightV2Weight,SpWeightsWeightV2Weight)',
      NotifyDispatchError: '(u64,u8,u8)',
      NotifyDecodeFailed: '(u64,u8,u8)',
      InvalidResponder: '(XcmV1MultiLocation,u64,Option<XcmV1MultiLocation>)',
      InvalidResponderVersion: '(XcmV1MultiLocation,u64)',
      ResponseTaken: 'u64',
      AssetsTrapped: '(H256,XcmV1MultiLocation,XcmVersionedMultiAssets)',
      VersionChangeNotified: '(XcmV1MultiLocation,u32)',
      SupportedVersionChanged: '(XcmV1MultiLocation,u32)',
      NotifyTargetSendFail: '(XcmV1MultiLocation,u64,XcmV2TraitsError)',
      NotifyTargetMigrationFail: '(XcmVersionedMultiLocation,u64)',
      AssetsClaimed: '(H256,XcmV1MultiLocation,XcmVersionedMultiAssets)'
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
        remainingWeight: 'SpWeightsWeightV2Weight',
        requiredWeight: 'SpWeightsWeightV2Weight',
      },
      OverweightEnqueued: {
        messageId: '[u8;32]',
        overweightIndex: 'u64',
        requiredWeight: 'SpWeightsWeightV2Weight',
      },
      OverweightServiced: {
        overweightIndex: 'u64',
        weightUsed: 'SpWeightsWeightV2Weight'
      }
    }
  },
  /**
   * Lookup89: pallet_common::pallet::Event<T>
   **/
  PalletCommonEvent: {
    _enum: {
      CollectionCreated: '(u32,u8,AccountId32)',
      CollectionDestroyed: 'u32',
      ItemCreated: '(u32,u32,PalletEvmAccountBasicCrossAccountIdRepr,u128)',
      ItemDestroyed: '(u32,u32,PalletEvmAccountBasicCrossAccountIdRepr,u128)',
      Transfer: '(u32,u32,PalletEvmAccountBasicCrossAccountIdRepr,PalletEvmAccountBasicCrossAccountIdRepr,u128)',
      Approved: '(u32,u32,PalletEvmAccountBasicCrossAccountIdRepr,PalletEvmAccountBasicCrossAccountIdRepr,u128)',
      ApprovedForAll: '(u32,PalletEvmAccountBasicCrossAccountIdRepr,PalletEvmAccountBasicCrossAccountIdRepr,bool)',
      CollectionPropertySet: '(u32,Bytes)',
      CollectionPropertyDeleted: '(u32,Bytes)',
      TokenPropertySet: '(u32,u32,Bytes)',
      TokenPropertyDeleted: '(u32,u32,Bytes)',
      PropertyPermissionSet: '(u32,Bytes)',
      AllowListAddressAdded: '(u32,PalletEvmAccountBasicCrossAccountIdRepr)',
      AllowListAddressRemoved: '(u32,PalletEvmAccountBasicCrossAccountIdRepr)',
      CollectionAdminAdded: '(u32,PalletEvmAccountBasicCrossAccountIdRepr)',
      CollectionAdminRemoved: '(u32,PalletEvmAccountBasicCrossAccountIdRepr)',
      CollectionLimitSet: 'u32',
      CollectionOwnerChanged: '(u32,AccountId32)',
      CollectionPermissionSet: 'u32',
      CollectionSponsorSet: '(u32,AccountId32)',
      SponsorshipConfirmed: '(u32,AccountId32)',
      CollectionSponsorRemoved: 'u32'
    }
  },
  /**
   * Lookup92: pallet_evm::account::BasicCrossAccountIdRepr<sp_core::crypto::AccountId32>
   **/
  PalletEvmAccountBasicCrossAccountIdRepr: {
    _enum: {
      Substrate: 'AccountId32',
      Ethereum: 'H160'
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
   * Lookup97: pallet_rmrk_core::pallet::Event<T>
   **/
  PalletRmrkCoreEvent: {
    _enum: {
      CollectionCreated: {
        issuer: 'AccountId32',
        collectionId: 'u32',
      },
      CollectionDestroyed: {
        issuer: 'AccountId32',
        collectionId: 'u32',
      },
      IssuerChanged: {
        oldIssuer: 'AccountId32',
        newIssuer: 'AccountId32',
        collectionId: 'u32',
      },
      CollectionLocked: {
        issuer: 'AccountId32',
        collectionId: 'u32',
      },
      NftMinted: {
        owner: 'AccountId32',
        collectionId: 'u32',
        nftId: 'u32',
      },
      NFTBurned: {
        owner: 'AccountId32',
        nftId: 'u32',
      },
      NFTSent: {
        sender: 'AccountId32',
        recipient: 'RmrkTraitsNftAccountIdOrCollectionNftTuple',
        collectionId: 'u32',
        nftId: 'u32',
        approvalRequired: 'bool',
      },
      NFTAccepted: {
        sender: 'AccountId32',
        recipient: 'RmrkTraitsNftAccountIdOrCollectionNftTuple',
        collectionId: 'u32',
        nftId: 'u32',
      },
      NFTRejected: {
        sender: 'AccountId32',
        collectionId: 'u32',
        nftId: 'u32',
      },
      PropertySet: {
        collectionId: 'u32',
        maybeNftId: 'Option<u32>',
        key: 'Bytes',
        value: 'Bytes',
      },
      ResourceAdded: {
        nftId: 'u32',
        resourceId: 'u32',
      },
      ResourceRemoval: {
        nftId: 'u32',
        resourceId: 'u32',
      },
      ResourceAccepted: {
        nftId: 'u32',
        resourceId: 'u32',
      },
      ResourceRemovalAccepted: {
        nftId: 'u32',
        resourceId: 'u32',
      },
      PrioritySet: {
        collectionId: 'u32',
        nftId: 'u32'
      }
    }
  },
  /**
   * Lookup98: rmrk_traits::nft::AccountIdOrCollectionNftTuple<sp_core::crypto::AccountId32>
   **/
  RmrkTraitsNftAccountIdOrCollectionNftTuple: {
    _enum: {
      AccountId: 'AccountId32',
      CollectionAndNftTuple: '(u32,u32)'
    }
  },
  /**
   * Lookup102: pallet_rmrk_equip::pallet::Event<T>
   **/
  PalletRmrkEquipEvent: {
    _enum: {
      BaseCreated: {
        issuer: 'AccountId32',
        baseId: 'u32',
      },
      EquippablesUpdated: {
        baseId: 'u32',
        slotId: 'u32'
      }
    }
  },
  /**
   * Lookup103: pallet_app_promotion::pallet::Event<T>
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
   * Lookup104: pallet_foreign_assets::module::Event<T>
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
   * Lookup105: pallet_foreign_assets::module::AssetMetadata<Balance>
   **/
  PalletForeignAssetsModuleAssetMetadata: {
    name: 'Bytes',
    symbol: 'Bytes',
    decimals: 'u8',
    minimalBalance: 'u128'
  },
  /**
   * Lookup106: pallet_evm::pallet::Event<T>
   **/
  PalletEvmEvent: {
    _enum: {
      Log: {
        log: 'EthereumLog',
      },
      Created: {
        address: 'H160',
      },
      CreatedFailed: {
        address: 'H160',
      },
      Executed: {
        address: 'H160',
      },
      ExecutedFailed: {
        address: 'H160'
      }
    }
  },
  /**
   * Lookup107: ethereum::log::Log
   **/
  EthereumLog: {
    address: 'H160',
    topics: 'Vec<H256>',
    data: 'Bytes'
  },
  /**
   * Lookup109: pallet_ethereum::pallet::Event
   **/
  PalletEthereumEvent: {
    _enum: {
      Executed: {
        from: 'H160',
        to: 'H160',
        transactionHash: 'H256',
        exitReason: 'EvmCoreErrorExitReason'
      }
    }
  },
  /**
   * Lookup110: evm_core::error::ExitReason
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
   * Lookup111: evm_core::error::ExitSucceed
   **/
  EvmCoreErrorExitSucceed: {
    _enum: ['Stopped', 'Returned', 'Suicided']
  },
  /**
   * Lookup112: evm_core::error::ExitError
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
   * Lookup115: evm_core::error::ExitRevert
   **/
  EvmCoreErrorExitRevert: {
    _enum: ['Reverted']
  },
  /**
   * Lookup116: evm_core::error::ExitFatal
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
   * Lookup117: pallet_evm_contract_helpers::pallet::Event<T>
   **/
  PalletEvmContractHelpersEvent: {
    _enum: {
      ContractSponsorSet: '(H160,AccountId32)',
      ContractSponsorshipConfirmed: '(H160,AccountId32)',
      ContractSponsorRemoved: 'H160'
    }
  },
  /**
   * Lookup118: pallet_evm_migration::pallet::Event<T>
   **/
  PalletEvmMigrationEvent: {
    _enum: ['TestEvent']
  },
  /**
   * Lookup119: pallet_maintenance::pallet::Event<T>
   **/
  PalletMaintenanceEvent: {
    _enum: ['MaintenanceEnabled', 'MaintenanceDisabled']
  },
  /**
   * Lookup120: pallet_test_utils::pallet::Event<T>
   **/
  PalletTestUtilsEvent: {
    _enum: ['ValueIsSet', 'ShouldRollback', 'BatchCompleted']
  },
  /**
   * Lookup121: frame_system::Phase
   **/
  FrameSystemPhase: {
    _enum: {
      ApplyExtrinsic: 'u32',
      Finalization: 'Null',
      Initialization: 'Null'
    }
  },
  /**
   * Lookup124: frame_system::LastRuntimeUpgradeInfo
   **/
  FrameSystemLastRuntimeUpgradeInfo: {
    specVersion: 'Compact<u32>',
    specName: 'Text'
  },
  /**
   * Lookup125: frame_system::pallet::Call<T>
   **/
  FrameSystemCall: {
    _enum: {
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
   * Lookup129: frame_system::limits::BlockWeights
   **/
  FrameSystemLimitsBlockWeights: {
    baseBlock: 'SpWeightsWeightV2Weight',
    maxBlock: 'SpWeightsWeightV2Weight',
    perClass: 'FrameSupportDispatchPerDispatchClassWeightsPerClass'
  },
  /**
   * Lookup130: frame_support::dispatch::PerDispatchClass<frame_system::limits::WeightsPerClass>
   **/
  FrameSupportDispatchPerDispatchClassWeightsPerClass: {
    normal: 'FrameSystemLimitsWeightsPerClass',
    operational: 'FrameSystemLimitsWeightsPerClass',
    mandatory: 'FrameSystemLimitsWeightsPerClass'
  },
  /**
   * Lookup131: frame_system::limits::WeightsPerClass
   **/
  FrameSystemLimitsWeightsPerClass: {
    baseExtrinsic: 'SpWeightsWeightV2Weight',
    maxExtrinsic: 'Option<SpWeightsWeightV2Weight>',
    maxTotal: 'Option<SpWeightsWeightV2Weight>',
    reserved: 'Option<SpWeightsWeightV2Weight>'
  },
  /**
   * Lookup133: frame_system::limits::BlockLength
   **/
  FrameSystemLimitsBlockLength: {
    max: 'FrameSupportDispatchPerDispatchClassU32'
  },
  /**
   * Lookup134: frame_support::dispatch::PerDispatchClass<T>
   **/
  FrameSupportDispatchPerDispatchClassU32: {
    normal: 'u32',
    operational: 'u32',
    mandatory: 'u32'
  },
  /**
   * Lookup135: sp_weights::RuntimeDbWeight
   **/
  SpWeightsRuntimeDbWeight: {
    read: 'u64',
    write: 'u64'
  },
  /**
   * Lookup136: sp_version::RuntimeVersion
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
   * Lookup141: frame_system::pallet::Error<T>
   **/
  FrameSystemError: {
    _enum: ['InvalidSpecName', 'SpecVersionNeedsToIncrease', 'FailedToExtractRuntimeVersion', 'NonDefaultComposite', 'NonZeroRefCount', 'CallFiltered']
  },
  /**
   * Lookup142: polkadot_primitives::v2::PersistedValidationData<primitive_types::H256, N>
   **/
  PolkadotPrimitivesV2PersistedValidationData: {
    parentHead: 'Bytes',
    relayParentNumber: 'u32',
    relayParentStorageRoot: 'H256',
    maxPovSize: 'u32'
  },
  /**
   * Lookup145: polkadot_primitives::v2::UpgradeRestriction
   **/
  PolkadotPrimitivesV2UpgradeRestriction: {
    _enum: ['Present']
  },
  /**
   * Lookup146: sp_trie::storage_proof::StorageProof
   **/
  SpTrieStorageProof: {
    trieNodes: 'BTreeSet<Bytes>'
  },
  /**
   * Lookup148: cumulus_pallet_parachain_system::relay_state_snapshot::MessagingStateSnapshot
   **/
  CumulusPalletParachainSystemRelayStateSnapshotMessagingStateSnapshot: {
    dmqMqcHead: 'H256',
    relayDispatchQueueSize: '(u32,u32)',
    ingressChannels: 'Vec<(u32,PolkadotPrimitivesV2AbridgedHrmpChannel)>',
    egressChannels: 'Vec<(u32,PolkadotPrimitivesV2AbridgedHrmpChannel)>'
  },
  /**
   * Lookup151: polkadot_primitives::v2::AbridgedHrmpChannel
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
   * Lookup152: polkadot_primitives::v2::AbridgedHostConfiguration
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
   * Lookup158: polkadot_core_primitives::OutboundHrmpMessage<polkadot_parachain::primitives::Id>
   **/
  PolkadotCorePrimitivesOutboundHrmpMessage: {
    recipient: 'u32',
    data: 'Bytes'
  },
  /**
   * Lookup159: cumulus_pallet_parachain_system::pallet::Call<T>
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
   * Lookup160: cumulus_primitives_parachain_inherent::ParachainInherentData
   **/
  CumulusPrimitivesParachainInherentParachainInherentData: {
    validationData: 'PolkadotPrimitivesV2PersistedValidationData',
    relayChainState: 'SpTrieStorageProof',
    downwardMessages: 'Vec<PolkadotCorePrimitivesInboundDownwardMessage>',
    horizontalMessages: 'BTreeMap<u32, Vec<PolkadotCorePrimitivesInboundHrmpMessage>>'
  },
  /**
   * Lookup162: polkadot_core_primitives::InboundDownwardMessage<BlockNumber>
   **/
  PolkadotCorePrimitivesInboundDownwardMessage: {
    sentAt: 'u32',
    msg: 'Bytes'
  },
  /**
   * Lookup165: polkadot_core_primitives::InboundHrmpMessage<BlockNumber>
   **/
  PolkadotCorePrimitivesInboundHrmpMessage: {
    sentAt: 'u32',
    data: 'Bytes'
  },
  /**
   * Lookup168: cumulus_pallet_parachain_system::pallet::Error<T>
   **/
  CumulusPalletParachainSystemError: {
    _enum: ['OverlappingUpgrades', 'ProhibitedByPolkadot', 'TooBig', 'ValidationDataNotAvailable', 'HostConfigurationNotAvailable', 'NotScheduled', 'NothingAuthorized', 'Unauthorized']
  },
  /**
   * Lookup170: pallet_balances::BalanceLock<Balance>
   **/
  PalletBalancesBalanceLock: {
    id: '[u8;8]',
    amount: 'u128',
    reasons: 'PalletBalancesReasons'
  },
  /**
   * Lookup171: pallet_balances::Reasons
   **/
  PalletBalancesReasons: {
    _enum: ['Fee', 'Misc', 'All']
  },
  /**
   * Lookup174: pallet_balances::ReserveData<ReserveIdentifier, Balance>
   **/
  PalletBalancesReserveData: {
    id: '[u8;16]',
    amount: 'u128'
  },
  /**
   * Lookup176: pallet_balances::pallet::Call<T, I>
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
   * Lookup179: pallet_balances::pallet::Error<T, I>
   **/
  PalletBalancesError: {
    _enum: ['VestingBalance', 'LiquidityRestrictions', 'InsufficientBalance', 'ExistentialDeposit', 'KeepAlive', 'ExistingVestingSchedule', 'DeadAccount', 'TooManyReserves']
  },
  /**
   * Lookup181: pallet_timestamp::pallet::Call<T>
   **/
  PalletTimestampCall: {
    _enum: {
      set: {
        now: 'Compact<u64>'
      }
    }
  },
  /**
   * Lookup183: pallet_transaction_payment::Releases
   **/
  PalletTransactionPaymentReleases: {
    _enum: ['V1Ancient', 'V2']
  },
  /**
   * Lookup184: pallet_treasury::Proposal<sp_core::crypto::AccountId32, Balance>
   **/
  PalletTreasuryProposal: {
    proposer: 'AccountId32',
    value: 'u128',
    beneficiary: 'AccountId32',
    bond: 'u128'
  },
  /**
   * Lookup187: pallet_treasury::pallet::Call<T, I>
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
   * Lookup190: frame_support::PalletId
   **/
  FrameSupportPalletId: '[u8;8]',
  /**
   * Lookup191: pallet_treasury::pallet::Error<T, I>
   **/
  PalletTreasuryError: {
    _enum: ['InsufficientProposersBalance', 'InvalidIndex', 'TooManyApprovals', 'InsufficientPermission', 'ProposalNotApproved']
  },
  /**
   * Lookup192: pallet_sudo::pallet::Call<T>
   **/
  PalletSudoCall: {
    _enum: {
      sudo: {
        call: 'Call',
      },
      sudo_unchecked_weight: {
        call: 'Call',
        weight: 'SpWeightsWeightV2Weight',
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
   * Lookup194: orml_vesting::module::Call<T>
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
   * Lookup196: orml_xtokens::module::Call<T>
   **/
  OrmlXtokensModuleCall: {
    _enum: {
      transfer: {
        currencyId: 'PalletForeignAssetsAssetIds',
        amount: 'u128',
        dest: 'XcmVersionedMultiLocation',
        destWeightLimit: 'XcmV2WeightLimit',
      },
      transfer_multiasset: {
        asset: 'XcmVersionedMultiAsset',
        dest: 'XcmVersionedMultiLocation',
        destWeightLimit: 'XcmV2WeightLimit',
      },
      transfer_with_fee: {
        currencyId: 'PalletForeignAssetsAssetIds',
        amount: 'u128',
        fee: 'u128',
        dest: 'XcmVersionedMultiLocation',
        destWeightLimit: 'XcmV2WeightLimit',
      },
      transfer_multiasset_with_fee: {
        asset: 'XcmVersionedMultiAsset',
        fee: 'XcmVersionedMultiAsset',
        dest: 'XcmVersionedMultiLocation',
        destWeightLimit: 'XcmV2WeightLimit',
      },
      transfer_multicurrencies: {
        currencies: 'Vec<(PalletForeignAssetsAssetIds,u128)>',
        feeItem: 'u32',
        dest: 'XcmVersionedMultiLocation',
        destWeightLimit: 'XcmV2WeightLimit',
      },
      transfer_multiassets: {
        assets: 'XcmVersionedMultiAssets',
        feeItem: 'u32',
        dest: 'XcmVersionedMultiLocation',
        destWeightLimit: 'XcmV2WeightLimit'
      }
    }
  },
  /**
   * Lookup197: xcm::VersionedMultiAsset
   **/
  XcmVersionedMultiAsset: {
    _enum: {
      V0: 'XcmV0MultiAsset',
      V1: 'XcmV1MultiAsset'
    }
  },
  /**
   * Lookup200: orml_tokens::module::Call<T>
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
   * Lookup201: cumulus_pallet_xcmp_queue::pallet::Call<T>
   **/
  CumulusPalletXcmpQueueCall: {
    _enum: {
      service_overweight: {
        index: 'u64',
        weightLimit: 'u64',
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
        new_: 'u64',
      },
      update_weight_restrict_decay: {
        _alias: {
          new_: 'new',
        },
        new_: 'u64',
      },
      update_xcmp_max_individual_weight: {
        _alias: {
          new_: 'new',
        },
        new_: 'u64'
      }
    }
  },
  /**
   * Lookup202: pallet_xcm::pallet::Call<T>
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
        maxWeight: 'u64',
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
   * Lookup203: xcm::VersionedXcm<RuntimeCall>
   **/
  XcmVersionedXcm: {
    _enum: {
      V0: 'XcmV0Xcm',
      V1: 'XcmV1Xcm',
      V2: 'XcmV2Xcm'
    }
  },
  /**
   * Lookup204: xcm::v0::Xcm<RuntimeCall>
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
   * Lookup206: xcm::v0::order::Order<RuntimeCall>
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
   * Lookup208: xcm::v0::Response
   **/
  XcmV0Response: {
    _enum: {
      Assets: 'Vec<XcmV0MultiAsset>'
    }
  },
  /**
   * Lookup209: xcm::v1::Xcm<RuntimeCall>
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
   * Lookup211: xcm::v1::order::Order<RuntimeCall>
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
   * Lookup213: xcm::v1::Response
   **/
  XcmV1Response: {
    _enum: {
      Assets: 'XcmV1MultiassetMultiAssets',
      Version: 'u32'
    }
  },
  /**
   * Lookup227: cumulus_pallet_xcm::pallet::Call<T>
   **/
  CumulusPalletXcmCall: 'Null',
  /**
   * Lookup228: cumulus_pallet_dmp_queue::pallet::Call<T>
   **/
  CumulusPalletDmpQueueCall: {
    _enum: {
      service_overweight: {
        index: 'u64',
        weightLimit: 'u64'
      }
    }
  },
  /**
   * Lookup229: pallet_inflation::pallet::Call<T>
   **/
  PalletInflationCall: {
    _enum: {
      start_inflation: {
        inflationStartRelayBlock: 'u32'
      }
    }
  },
  /**
   * Lookup230: pallet_unique::Call<T>
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
      set_allowance_for_all: {
        collectionId: 'u32',
        operator: 'PalletEvmAccountBasicCrossAccountIdRepr',
        approve: 'bool',
      },
      force_repair_collection: {
        collectionId: 'u32',
      },
      force_repair_item: {
        collectionId: 'u32',
        itemId: 'u32'
      }
    }
  },
  /**
   * Lookup235: up_data_structs::CollectionMode
   **/
  UpDataStructsCollectionMode: {
    _enum: {
      NFT: 'Null',
      Fungible: 'u8',
      ReFungible: 'Null'
    }
  },
  /**
   * Lookup236: up_data_structs::CreateCollectionData<sp_core::crypto::AccountId32>
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
   * Lookup238: up_data_structs::AccessMode
   **/
  UpDataStructsAccessMode: {
    _enum: ['Normal', 'AllowList']
  },
  /**
   * Lookup240: up_data_structs::CollectionLimits
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
   * Lookup242: up_data_structs::SponsoringRateLimit
   **/
  UpDataStructsSponsoringRateLimit: {
    _enum: {
      SponsoringDisabled: 'Null',
      Blocks: 'u32'
    }
  },
  /**
   * Lookup245: up_data_structs::CollectionPermissions
   **/
  UpDataStructsCollectionPermissions: {
    access: 'Option<UpDataStructsAccessMode>',
    mintMode: 'Option<bool>',
    nesting: 'Option<UpDataStructsNestingPermissions>'
  },
  /**
   * Lookup247: up_data_structs::NestingPermissions
   **/
  UpDataStructsNestingPermissions: {
    tokenOwner: 'bool',
    collectionAdmin: 'bool',
    restricted: 'Option<UpDataStructsOwnerRestrictedSet>'
  },
  /**
   * Lookup249: up_data_structs::OwnerRestrictedSet
   **/
  UpDataStructsOwnerRestrictedSet: 'BTreeSet<u32>',
  /**
   * Lookup254: up_data_structs::PropertyKeyPermission
   **/
  UpDataStructsPropertyKeyPermission: {
    key: 'Bytes',
    permission: 'UpDataStructsPropertyPermission'
  },
  /**
   * Lookup255: up_data_structs::PropertyPermission
   **/
  UpDataStructsPropertyPermission: {
    mutable: 'bool',
    collectionAdmin: 'bool',
    tokenOwner: 'bool'
  },
  /**
   * Lookup258: up_data_structs::Property
   **/
  UpDataStructsProperty: {
    key: 'Bytes',
    value: 'Bytes'
  },
  /**
   * Lookup261: up_data_structs::CreateItemData
   **/
  UpDataStructsCreateItemData: {
    _enum: {
      NFT: 'UpDataStructsCreateNftData',
      Fungible: 'UpDataStructsCreateFungibleData',
      ReFungible: 'UpDataStructsCreateReFungibleData'
    }
  },
  /**
   * Lookup262: up_data_structs::CreateNftData
   **/
  UpDataStructsCreateNftData: {
    properties: 'Vec<UpDataStructsProperty>'
  },
  /**
   * Lookup263: up_data_structs::CreateFungibleData
   **/
  UpDataStructsCreateFungibleData: {
    value: 'u128'
  },
  /**
   * Lookup264: up_data_structs::CreateReFungibleData
   **/
  UpDataStructsCreateReFungibleData: {
    pieces: 'u128',
    properties: 'Vec<UpDataStructsProperty>'
  },
  /**
   * Lookup267: up_data_structs::CreateItemExData<pallet_evm::account::BasicCrossAccountIdRepr<sp_core::crypto::AccountId32>>
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
   * Lookup269: up_data_structs::CreateNftExData<pallet_evm::account::BasicCrossAccountIdRepr<sp_core::crypto::AccountId32>>
   **/
  UpDataStructsCreateNftExData: {
    properties: 'Vec<UpDataStructsProperty>',
    owner: 'PalletEvmAccountBasicCrossAccountIdRepr'
  },
  /**
   * Lookup276: up_data_structs::CreateRefungibleExSingleOwner<pallet_evm::account::BasicCrossAccountIdRepr<sp_core::crypto::AccountId32>>
   **/
  UpDataStructsCreateRefungibleExSingleOwner: {
    user: 'PalletEvmAccountBasicCrossAccountIdRepr',
    pieces: 'u128',
    properties: 'Vec<UpDataStructsProperty>'
  },
  /**
   * Lookup278: up_data_structs::CreateRefungibleExMultipleOwners<pallet_evm::account::BasicCrossAccountIdRepr<sp_core::crypto::AccountId32>>
   **/
  UpDataStructsCreateRefungibleExMultipleOwners: {
    users: 'BTreeMap<PalletEvmAccountBasicCrossAccountIdRepr, u128>',
    properties: 'Vec<UpDataStructsProperty>'
  },
  /**
   * Lookup279: pallet_configuration::pallet::Call<T>
   **/
  PalletConfigurationCall: {
    _enum: {
      set_weight_to_fee_coefficient_override: {
        coeff: 'Option<u64>',
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
   * Lookup284: pallet_configuration::AppPromotionConfiguration<BlockNumber>
   **/
  PalletConfigurationAppPromotionConfiguration: {
    recalculationInterval: 'Option<u32>',
    pendingInterval: 'Option<u32>',
    intervalIncome: 'Option<Perbill>',
    maxStakersPerCalculation: 'Option<u8>'
  },
  /**
   * Lookup288: pallet_template_transaction_payment::Call<T>
   **/
  PalletTemplateTransactionPaymentCall: 'Null',
  /**
   * Lookup289: pallet_structure::pallet::Call<T>
   **/
  PalletStructureCall: 'Null',
  /**
   * Lookup290: pallet_rmrk_core::pallet::Call<T>
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
   * Lookup296: rmrk_traits::resource::ResourceTypes<sp_core::bounded::bounded_vec::BoundedVec<T, S>, sp_core::bounded::bounded_vec::BoundedVec<T, S>>
   **/
  RmrkTraitsResourceResourceTypes: {
    _enum: {
      Basic: 'RmrkTraitsResourceBasicResource',
      Composable: 'RmrkTraitsResourceComposableResource',
      Slot: 'RmrkTraitsResourceSlotResource'
    }
  },
  /**
   * Lookup298: rmrk_traits::resource::BasicResource<sp_core::bounded::bounded_vec::BoundedVec<T, S>>
   **/
  RmrkTraitsResourceBasicResource: {
    src: 'Option<Bytes>',
    metadata: 'Option<Bytes>',
    license: 'Option<Bytes>',
    thumb: 'Option<Bytes>'
  },
  /**
   * Lookup300: rmrk_traits::resource::ComposableResource<sp_core::bounded::bounded_vec::BoundedVec<T, S>, sp_core::bounded::bounded_vec::BoundedVec<T, S>>
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
   * Lookup301: rmrk_traits::resource::SlotResource<sp_core::bounded::bounded_vec::BoundedVec<T, S>>
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
   * Lookup304: pallet_rmrk_equip::pallet::Call<T>
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
   * Lookup307: rmrk_traits::part::PartType<sp_core::bounded::bounded_vec::BoundedVec<T, S>, sp_core::bounded::bounded_vec::BoundedVec<T, S>>
   **/
  RmrkTraitsPartPartType: {
    _enum: {
      FixedPart: 'RmrkTraitsPartFixedPart',
      SlotPart: 'RmrkTraitsPartSlotPart'
    }
  },
  /**
   * Lookup309: rmrk_traits::part::FixedPart<sp_core::bounded::bounded_vec::BoundedVec<T, S>>
   **/
  RmrkTraitsPartFixedPart: {
    id: 'u32',
    z: 'u32',
    src: 'Bytes'
  },
  /**
   * Lookup310: rmrk_traits::part::SlotPart<sp_core::bounded::bounded_vec::BoundedVec<T, S>, sp_core::bounded::bounded_vec::BoundedVec<T, S>>
   **/
  RmrkTraitsPartSlotPart: {
    id: 'u32',
    equippable: 'RmrkTraitsPartEquippableList',
    src: 'Bytes',
    z: 'u32'
  },
  /**
   * Lookup311: rmrk_traits::part::EquippableList<sp_core::bounded::bounded_vec::BoundedVec<T, S>>
   **/
  RmrkTraitsPartEquippableList: {
    _enum: {
      All: 'Null',
      Empty: 'Null',
      Custom: 'Vec<u32>'
    }
  },
  /**
   * Lookup313: rmrk_traits::theme::Theme<sp_core::bounded::bounded_vec::BoundedVec<T, S>, sp_core::bounded::bounded_vec::BoundedVec<rmrk_traits::theme::ThemeProperty<sp_core::bounded::bounded_vec::BoundedVec<T, S>>, S>>
   **/
  RmrkTraitsTheme: {
    name: 'Bytes',
    properties: 'Vec<RmrkTraitsThemeThemeProperty>',
    inherit: 'bool'
  },
  /**
   * Lookup315: rmrk_traits::theme::ThemeProperty<sp_core::bounded::bounded_vec::BoundedVec<T, S>>
   **/
  RmrkTraitsThemeThemeProperty: {
    key: 'Bytes',
    value: 'Bytes'
  },
  /**
   * Lookup317: pallet_app_promotion::pallet::Call<T>
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
   * Lookup318: pallet_foreign_assets::module::Call<T>
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
   * Lookup319: pallet_evm::pallet::Call<T>
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
   * Lookup325: pallet_ethereum::pallet::Call<T>
   **/
  PalletEthereumCall: {
    _enum: {
      transact: {
        transaction: 'EthereumTransactionTransactionV2'
      }
    }
  },
  /**
   * Lookup326: ethereum::transaction::TransactionV2
   **/
  EthereumTransactionTransactionV2: {
    _enum: {
      Legacy: 'EthereumTransactionLegacyTransaction',
      EIP2930: 'EthereumTransactionEip2930Transaction',
      EIP1559: 'EthereumTransactionEip1559Transaction'
    }
  },
  /**
   * Lookup327: ethereum::transaction::LegacyTransaction
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
   * Lookup328: ethereum::transaction::TransactionAction
   **/
  EthereumTransactionTransactionAction: {
    _enum: {
      Call: 'H160',
      Create: 'Null'
    }
  },
  /**
   * Lookup329: ethereum::transaction::TransactionSignature
   **/
  EthereumTransactionTransactionSignature: {
    v: 'u64',
    r: 'H256',
    s: 'H256'
  },
  /**
   * Lookup331: ethereum::transaction::EIP2930Transaction
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
   * Lookup333: ethereum::transaction::AccessListItem
   **/
  EthereumTransactionAccessListItem: {
    address: 'H160',
    storageKeys: 'Vec<H256>'
  },
  /**
   * Lookup334: ethereum::transaction::EIP1559Transaction
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
   * Lookup335: pallet_evm_migration::pallet::Call<T>
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
   * Lookup339: pallet_maintenance::pallet::Call<T>
   **/
  PalletMaintenanceCall: {
    _enum: ['enable', 'disable']
  },
  /**
   * Lookup340: pallet_test_utils::pallet::Call<T>
   **/
  PalletTestUtilsCall: {
    _enum: {
      enable: 'Null',
      set_test_value: {
        value: 'u32',
      },
      set_test_value_and_rollback: {
        value: 'u32',
      },
      inc_test_value: 'Null',
      just_take_fee: 'Null',
      batch_all: {
        calls: 'Vec<Call>'
      }
    }
  },
  /**
   * Lookup342: pallet_sudo::pallet::Error<T>
   **/
  PalletSudoError: {
    _enum: ['RequireSudo']
  },
  /**
   * Lookup344: orml_vesting::module::Error<T>
   **/
  OrmlVestingModuleError: {
    _enum: ['ZeroVestingPeriod', 'ZeroVestingPeriodCount', 'InsufficientBalanceToLock', 'TooManyVestingSchedules', 'AmountLow', 'MaxVestingSchedulesExceeded']
  },
  /**
   * Lookup345: orml_xtokens::module::Error<T>
   **/
  OrmlXtokensModuleError: {
    _enum: ['AssetHasNoReserve', 'NotCrossChainTransfer', 'InvalidDest', 'NotCrossChainTransferableCurrency', 'UnweighableMessage', 'XcmExecutionFailed', 'CannotReanchor', 'InvalidAncestry', 'InvalidAsset', 'DestinationNotInvertible', 'BadVersion', 'DistinctReserveForAssetAndFee', 'ZeroFee', 'ZeroAmount', 'TooManyAssetsBeingSent', 'AssetIndexNonExistent', 'FeeNotEnough', 'NotSupportedMultiLocation', 'MinXcmFeeNotDefined']
  },
  /**
   * Lookup348: orml_tokens::BalanceLock<Balance>
   **/
  OrmlTokensBalanceLock: {
    id: '[u8;8]',
    amount: 'u128'
  },
  /**
   * Lookup350: orml_tokens::AccountData<Balance>
   **/
  OrmlTokensAccountData: {
    free: 'u128',
    reserved: 'u128',
    frozen: 'u128'
  },
  /**
   * Lookup352: orml_tokens::ReserveData<ReserveIdentifier, Balance>
   **/
  OrmlTokensReserveData: {
    id: 'Null',
    amount: 'u128'
  },
  /**
   * Lookup354: orml_tokens::module::Error<T>
   **/
  OrmlTokensModuleError: {
    _enum: ['BalanceTooLow', 'AmountIntoBalanceFailed', 'LiquidityRestrictions', 'MaxLocksExceeded', 'KeepAlive', 'ExistentialDeposit', 'DeadAccount', 'TooManyReserves']
  },
  /**
   * Lookup356: cumulus_pallet_xcmp_queue::InboundChannelDetails
   **/
  CumulusPalletXcmpQueueInboundChannelDetails: {
    sender: 'u32',
    state: 'CumulusPalletXcmpQueueInboundState',
    messageMetadata: 'Vec<(u32,PolkadotParachainPrimitivesXcmpMessageFormat)>'
  },
  /**
   * Lookup357: cumulus_pallet_xcmp_queue::InboundState
   **/
  CumulusPalletXcmpQueueInboundState: {
    _enum: ['Ok', 'Suspended']
  },
  /**
   * Lookup360: polkadot_parachain::primitives::XcmpMessageFormat
   **/
  PolkadotParachainPrimitivesXcmpMessageFormat: {
    _enum: ['ConcatenatedVersionedXcm', 'ConcatenatedEncodedBlob', 'Signals']
  },
  /**
   * Lookup363: cumulus_pallet_xcmp_queue::OutboundChannelDetails
   **/
  CumulusPalletXcmpQueueOutboundChannelDetails: {
    recipient: 'u32',
    state: 'CumulusPalletXcmpQueueOutboundState',
    signalsExist: 'bool',
    firstIndex: 'u16',
    lastIndex: 'u16'
  },
  /**
   * Lookup364: cumulus_pallet_xcmp_queue::OutboundState
   **/
  CumulusPalletXcmpQueueOutboundState: {
    _enum: ['Ok', 'Suspended']
  },
  /**
   * Lookup366: cumulus_pallet_xcmp_queue::QueueConfigData
   **/
  CumulusPalletXcmpQueueQueueConfigData: {
    suspendThreshold: 'u32',
    dropThreshold: 'u32',
    resumeThreshold: 'u32',
    thresholdWeight: 'SpWeightsWeightV2Weight',
    weightRestrictDecay: 'SpWeightsWeightV2Weight',
    xcmpMaxIndividualWeight: 'SpWeightsWeightV2Weight'
  },
  /**
   * Lookup368: cumulus_pallet_xcmp_queue::pallet::Error<T>
   **/
  CumulusPalletXcmpQueueError: {
    _enum: ['FailedToSend', 'BadXcmOrigin', 'BadXcm', 'BadOverweightIndex', 'WeightOverLimit']
  },
  /**
   * Lookup369: pallet_xcm::pallet::Error<T>
   **/
  PalletXcmError: {
    _enum: ['Unreachable', 'SendFailure', 'Filtered', 'UnweighableMessage', 'DestinationNotInvertible', 'Empty', 'CannotReanchor', 'TooManyAssets', 'InvalidOrigin', 'BadVersion', 'BadLocation', 'NoSubscription', 'AlreadySubscribed']
  },
  /**
   * Lookup370: cumulus_pallet_xcm::pallet::Error<T>
   **/
  CumulusPalletXcmError: 'Null',
  /**
   * Lookup371: cumulus_pallet_dmp_queue::ConfigData
   **/
  CumulusPalletDmpQueueConfigData: {
    maxIndividual: 'SpWeightsWeightV2Weight'
  },
  /**
   * Lookup372: cumulus_pallet_dmp_queue::PageIndexData
   **/
  CumulusPalletDmpQueuePageIndexData: {
    beginUsed: 'u32',
    endUsed: 'u32',
    overweightCount: 'u64'
  },
  /**
   * Lookup375: cumulus_pallet_dmp_queue::pallet::Error<T>
   **/
  CumulusPalletDmpQueueError: {
    _enum: ['Unknown', 'OverLimit']
  },
  /**
   * Lookup379: pallet_unique::Error<T>
   **/
  PalletUniqueError: {
    _enum: ['CollectionDecimalPointLimitExceeded', 'EmptyArgument', 'RepartitionCalledOnNonRefungibleCollection']
  },
  /**
   * Lookup380: pallet_configuration::pallet::Error<T>
   **/
  PalletConfigurationError: {
    _enum: ['InconsistentConfiguration']
  },
  /**
   * Lookup381: up_data_structs::Collection<sp_core::crypto::AccountId32>
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
   * Lookup382: up_data_structs::SponsorshipState<sp_core::crypto::AccountId32>
   **/
  UpDataStructsSponsorshipStateAccountId32: {
    _enum: {
      Disabled: 'Null',
      Unconfirmed: 'AccountId32',
      Confirmed: 'AccountId32'
    }
  },
  /**
   * Lookup384: up_data_structs::Properties
   **/
  UpDataStructsProperties: {
    map: 'UpDataStructsPropertiesMapBoundedVec',
    consumedSpace: 'u32',
    spaceLimit: 'u32'
  },
  /**
   * Lookup385: up_data_structs::PropertiesMap<sp_core::bounded::bounded_vec::BoundedVec<T, S>>
   **/
  UpDataStructsPropertiesMapBoundedVec: 'BTreeMap<Bytes, Bytes>',
  /**
   * Lookup390: up_data_structs::PropertiesMap<up_data_structs::PropertyPermission>
   **/
  UpDataStructsPropertiesMapPropertyPermission: 'BTreeMap<Bytes, UpDataStructsPropertyPermission>',
  /**
   * Lookup397: up_data_structs::CollectionStats
   **/
  UpDataStructsCollectionStats: {
    created: 'u32',
    destroyed: 'u32',
    alive: 'u32'
  },
  /**
   * Lookup398: up_data_structs::TokenChild
   **/
  UpDataStructsTokenChild: {
    token: 'u32',
    collection: 'u32'
  },
  /**
   * Lookup399: PhantomType::up_data_structs<T>
   **/
  PhantomTypeUpDataStructs: '[(UpDataStructsTokenData,UpDataStructsRpcCollection,RmrkTraitsCollectionCollectionInfo,RmrkTraitsNftNftInfo,RmrkTraitsResourceResourceInfo,RmrkTraitsPropertyPropertyInfo,RmrkTraitsBaseBaseInfo,RmrkTraitsPartPartType,RmrkTraitsTheme,RmrkTraitsNftNftChild,UpPovEstimateRpcPovInfo);0]',
  /**
   * Lookup401: up_data_structs::TokenData<pallet_evm::account::BasicCrossAccountIdRepr<sp_core::crypto::AccountId32>>
   **/
  UpDataStructsTokenData: {
    properties: 'Vec<UpDataStructsProperty>',
    owner: 'Option<PalletEvmAccountBasicCrossAccountIdRepr>',
    pieces: 'u128'
  },
  /**
   * Lookup403: up_data_structs::RpcCollection<sp_core::crypto::AccountId32>
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
   * Lookup404: up_data_structs::RpcCollectionFlags
   **/
  UpDataStructsRpcCollectionFlags: {
    foreign: 'bool',
    erc721metadata: 'bool'
  },
  /**
   * Lookup405: rmrk_traits::collection::CollectionInfo<sp_core::bounded::bounded_vec::BoundedVec<T, S>, sp_core::bounded::bounded_vec::BoundedVec<T, S>, sp_core::crypto::AccountId32>
   **/
  RmrkTraitsCollectionCollectionInfo: {
    issuer: 'AccountId32',
    metadata: 'Bytes',
    max: 'Option<u32>',
    symbol: 'Bytes',
    nftsCount: 'u32'
  },
  /**
   * Lookup406: rmrk_traits::nft::NftInfo<sp_core::crypto::AccountId32, sp_arithmetic::per_things::Permill, sp_core::bounded::bounded_vec::BoundedVec<T, S>>
   **/
  RmrkTraitsNftNftInfo: {
    owner: 'RmrkTraitsNftAccountIdOrCollectionNftTuple',
    royalty: 'Option<RmrkTraitsNftRoyaltyInfo>',
    metadata: 'Bytes',
    equipped: 'bool',
    pending: 'bool'
  },
  /**
   * Lookup408: rmrk_traits::nft::RoyaltyInfo<sp_core::crypto::AccountId32, sp_arithmetic::per_things::Permill>
   **/
  RmrkTraitsNftRoyaltyInfo: {
    recipient: 'AccountId32',
    amount: 'Permill'
  },
  /**
   * Lookup409: rmrk_traits::resource::ResourceInfo<sp_core::bounded::bounded_vec::BoundedVec<T, S>, sp_core::bounded::bounded_vec::BoundedVec<T, S>>
   **/
  RmrkTraitsResourceResourceInfo: {
    id: 'u32',
    resource: 'RmrkTraitsResourceResourceTypes',
    pending: 'bool',
    pendingRemoval: 'bool'
  },
  /**
   * Lookup410: rmrk_traits::property::PropertyInfo<sp_core::bounded::bounded_vec::BoundedVec<T, S>, sp_core::bounded::bounded_vec::BoundedVec<T, S>>
   **/
  RmrkTraitsPropertyPropertyInfo: {
    key: 'Bytes',
    value: 'Bytes'
  },
  /**
   * Lookup411: rmrk_traits::base::BaseInfo<sp_core::crypto::AccountId32, sp_core::bounded::bounded_vec::BoundedVec<T, S>>
   **/
  RmrkTraitsBaseBaseInfo: {
    issuer: 'AccountId32',
    baseType: 'Bytes',
    symbol: 'Bytes'
  },
  /**
   * Lookup412: rmrk_traits::nft::NftChild
   **/
  RmrkTraitsNftNftChild: {
    collectionId: 'u32',
    nftId: 'u32'
  },
  /**
   * Lookup413: up_pov_estimate_rpc::PovInfo
   **/
  UpPovEstimateRpcPovInfo: {
    proofSize: 'u64',
    compactProofSize: 'u64',
    compressedProofSize: 'u64',
    results: 'Vec<Result<Result<Null, SpRuntimeDispatchError>, SpRuntimeTransactionValidityTransactionValidityError>>',
    keyValues: 'Vec<UpPovEstimateRpcTrieKeyValue>'
  },
  /**
   * Lookup416: sp_runtime::transaction_validity::TransactionValidityError
   **/
  SpRuntimeTransactionValidityTransactionValidityError: {
    _enum: {
      Invalid: 'SpRuntimeTransactionValidityInvalidTransaction',
      Unknown: 'SpRuntimeTransactionValidityUnknownTransaction'
    }
  },
  /**
   * Lookup417: sp_runtime::transaction_validity::InvalidTransaction
   **/
  SpRuntimeTransactionValidityInvalidTransaction: {
    _enum: {
      Call: 'Null',
      Payment: 'Null',
      Future: 'Null',
      Stale: 'Null',
      BadProof: 'Null',
      AncientBirthBlock: 'Null',
      ExhaustsResources: 'Null',
      Custom: 'u8',
      BadMandatory: 'Null',
      MandatoryValidation: 'Null',
      BadSigner: 'Null'
    }
  },
  /**
   * Lookup418: sp_runtime::transaction_validity::UnknownTransaction
   **/
  SpRuntimeTransactionValidityUnknownTransaction: {
    _enum: {
      CannotLookup: 'Null',
      NoUnsignedValidator: 'Null',
      Custom: 'u8'
    }
  },
  /**
   * Lookup420: up_pov_estimate_rpc::TrieKeyValue
   **/
  UpPovEstimateRpcTrieKeyValue: {
    key: 'Bytes',
    value: 'Bytes'
  },
  /**
   * Lookup422: pallet_common::pallet::Error<T>
   **/
  PalletCommonError: {
    _enum: ['CollectionNotFound', 'MustBeTokenOwner', 'NoPermission', 'CantDestroyNotEmptyCollection', 'PublicMintingNotAllowed', 'AddressNotInAllowlist', 'CollectionNameLimitExceeded', 'CollectionDescriptionLimitExceeded', 'CollectionTokenPrefixLimitExceeded', 'TotalCollectionsLimitExceeded', 'CollectionAdminCountExceeded', 'CollectionLimitBoundsExceeded', 'OwnerPermissionsCantBeReverted', 'TransferNotAllowed', 'AccountTokenLimitExceeded', 'CollectionTokenLimitExceeded', 'MetadataFlagFrozen', 'TokenNotFound', 'TokenValueTooLow', 'ApprovedValueTooLow', 'CantApproveMoreThanOwned', 'AddressIsZero', 'UnsupportedOperation', 'NotSufficientFounds', 'UserIsNotAllowedToNest', 'SourceCollectionIsNotAllowedToNest', 'CollectionFieldSizeExceeded', 'NoSpaceForProperty', 'PropertyLimitReached', 'PropertyKeyIsTooLong', 'InvalidCharacterInPropertyKey', 'EmptyPropertyKey', 'CollectionIsExternal', 'CollectionIsInternal', 'ConfirmSponsorshipFail', 'UserIsNotCollectionAdmin']
  },
  /**
   * Lookup424: pallet_fungible::pallet::Error<T>
   **/
  PalletFungibleError: {
    _enum: ['NotFungibleDataUsedToMintFungibleCollectionToken', 'FungibleItemsHaveNoId', 'FungibleItemsDontHaveData', 'FungibleDisallowsNesting', 'SettingPropertiesNotAllowed', 'SettingAllowanceForAllNotAllowed', 'FungibleTokensAreAlwaysValid']
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup420: pallet_refungible::pallet::Error<T>
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
=======
>>>>>>> chore: regenerate types
<<<<<<< HEAD
   * Lookup417: pallet_refungible::ItemData
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
   * Lookup418: pallet_refungible::ItemData
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
   * Lookup431: pallet_refungible::ItemData
=======
   * Lookup427: pallet_refungible::ItemData
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
=======
=======
=======
   * Lookup431: pallet_refungible::ItemData
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
=======
=======
=======
   * Lookup437: pallet_refungible::ItemData
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
   * Lookup439: pallet_refungible::ItemData
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
=======
=======
>>>>>>> chore: regenerate types
   * Lookup425: pallet_refungible::ItemData
   **/
  PalletRefungibleItemData: {
    constData: 'Bytes'
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup422: pallet_refungible::pallet::Error<T>
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
   * Lookup423: pallet_refungible::pallet::Error<T>
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
   * Lookup436: pallet_refungible::pallet::Error<T>
=======
   * Lookup432: pallet_refungible::pallet::Error<T>
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
=======
=======
=======
=======
   * Lookup436: pallet_refungible::pallet::Error<T>
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
=======
=======
=======
=======
   * Lookup442: pallet_refungible::pallet::Error<T>
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
=======
   * Lookup444: pallet_refungible::pallet::Error<T>
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
>>>>>>> fix: regenerate types after rebase
=======
=======
   * Lookup430: pallet_refungible::pallet::Error<T>
>>>>>>> chore: regenerate types
>>>>>>> chore: regenerate types
=======
   * Lookup430: pallet_refungible::pallet::Error<T>
>>>>>>> chore: regenerate types
   **/
  PalletRefungibleError: {
    _enum: ['NotRefungibleDataUsedToMintFungibleCollectionToken', 'WrongRefungiblePieces', 'RepartitionWhileNotOwningAllPieces', 'RefungibleDisallowsNesting', 'SettingPropertiesNotAllowed']
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup421: pallet_nonfungible::ItemData<pallet_evm::account::BasicCrossAccountIdRepr<sp_core::crypto::AccountId32>>
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
=======
>>>>>>> chore: regenerate types
<<<<<<< HEAD
   * Lookup423: pallet_nonfungible::ItemData<pallet_evm::account::BasicCrossAccountIdRepr<sp_core::crypto::AccountId32>>
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
   * Lookup424: pallet_nonfungible::ItemData<pallet_evm::account::BasicCrossAccountIdRepr<sp_core::crypto::AccountId32>>
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
   * Lookup437: pallet_nonfungible::ItemData<pallet_evm::account::BasicCrossAccountIdRepr<sp_core::crypto::AccountId32>>
=======
   * Lookup433: pallet_nonfungible::ItemData<pallet_evm::account::BasicCrossAccountIdRepr<sp_core::crypto::AccountId32>>
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
=======
=======
=======
=======
   * Lookup437: pallet_nonfungible::ItemData<pallet_evm::account::BasicCrossAccountIdRepr<sp_core::crypto::AccountId32>>
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
=======
=======
=======
=======
   * Lookup443: pallet_nonfungible::ItemData<pallet_evm::account::BasicCrossAccountIdRepr<sp_core::crypto::AccountId32>>
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
=======
   * Lookup445: pallet_nonfungible::ItemData<pallet_evm::account::BasicCrossAccountIdRepr<sp_core::crypto::AccountId32>>
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
>>>>>>> fix: regenerate types after rebase
=======
=======
   * Lookup431: pallet_nonfungible::ItemData<pallet_evm::account::BasicCrossAccountIdRepr<sp_core::crypto::AccountId32>>
>>>>>>> chore: regenerate types
>>>>>>> chore: regenerate types
=======
   * Lookup431: pallet_nonfungible::ItemData<pallet_evm::account::BasicCrossAccountIdRepr<sp_core::crypto::AccountId32>>
>>>>>>> chore: regenerate types
   **/
  PalletNonfungibleItemData: {
    owner: 'PalletEvmAccountBasicCrossAccountIdRepr'
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup423: up_data_structs::PropertyScope
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
=======
>>>>>>> chore: regenerate types
<<<<<<< HEAD
   * Lookup425: up_data_structs::PropertyScope
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
   * Lookup426: up_data_structs::PropertyScope
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
   * Lookup439: up_data_structs::PropertyScope
=======
   * Lookup435: up_data_structs::PropertyScope
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
=======
=======
=======
=======
   * Lookup439: up_data_structs::PropertyScope
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
=======
=======
=======
=======
   * Lookup445: up_data_structs::PropertyScope
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
=======
   * Lookup447: up_data_structs::PropertyScope
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
>>>>>>> fix: regenerate types after rebase
=======
=======
   * Lookup433: up_data_structs::PropertyScope
>>>>>>> chore: regenerate types
>>>>>>> chore: regenerate types
=======
   * Lookup433: up_data_structs::PropertyScope
>>>>>>> chore: regenerate types
   **/
  UpDataStructsPropertyScope: {
    _enum: ['None', 'Rmrk']
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup426: pallet_nonfungible::pallet::Error<T>
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
=======
>>>>>>> chore: regenerate types
<<<<<<< HEAD
   * Lookup427: pallet_nonfungible::pallet::Error<T>
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
   * Lookup428: pallet_nonfungible::pallet::Error<T>
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
   * Lookup441: pallet_nonfungible::pallet::Error<T>
=======
   * Lookup437: pallet_nonfungible::pallet::Error<T>
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
=======
=======
=======
=======
   * Lookup441: pallet_nonfungible::pallet::Error<T>
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
=======
=======
=======
=======
   * Lookup447: pallet_nonfungible::pallet::Error<T>
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
=======
   * Lookup449: pallet_nonfungible::pallet::Error<T>
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
>>>>>>> fix: regenerate types after rebase
=======
=======
   * Lookup435: pallet_nonfungible::pallet::Error<T>
>>>>>>> chore: regenerate types
>>>>>>> chore: regenerate types
=======
   * Lookup435: pallet_nonfungible::pallet::Error<T>
>>>>>>> chore: regenerate types
   **/
  PalletNonfungibleError: {
    _enum: ['NotNonfungibleDataUsedToMintFungibleCollectionToken', 'NonfungibleItemsHaveNoAmount', 'CantBurnNftWithChildren']
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup427: pallet_structure::pallet::Error<T>
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
=======
>>>>>>> chore: regenerate types
<<<<<<< HEAD
   * Lookup428: pallet_structure::pallet::Error<T>
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
   * Lookup429: pallet_structure::pallet::Error<T>
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
   * Lookup442: pallet_structure::pallet::Error<T>
=======
   * Lookup438: pallet_structure::pallet::Error<T>
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
=======
=======
=======
=======
   * Lookup442: pallet_structure::pallet::Error<T>
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
=======
=======
=======
=======
   * Lookup448: pallet_structure::pallet::Error<T>
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
=======
   * Lookup450: pallet_structure::pallet::Error<T>
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
>>>>>>> fix: regenerate types after rebase
=======
=======
   * Lookup436: pallet_structure::pallet::Error<T>
>>>>>>> chore: regenerate types
>>>>>>> chore: regenerate types
=======
   * Lookup436: pallet_structure::pallet::Error<T>
>>>>>>> chore: regenerate types
   **/
  PalletStructureError: {
    _enum: ['OuroborosDetected', 'DepthLimit', 'BreadthLimit', 'TokenNotFound']
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup428: pallet_rmrk_core::pallet::Error<T>
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
=======
>>>>>>> chore: regenerate types
<<<<<<< HEAD
   * Lookup429: pallet_rmrk_core::pallet::Error<T>
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
   * Lookup430: pallet_rmrk_core::pallet::Error<T>
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
   * Lookup443: pallet_rmrk_core::pallet::Error<T>
=======
   * Lookup439: pallet_rmrk_core::pallet::Error<T>
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
=======
=======
=======
=======
   * Lookup443: pallet_rmrk_core::pallet::Error<T>
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
=======
=======
=======
=======
   * Lookup449: pallet_rmrk_core::pallet::Error<T>
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
=======
   * Lookup451: pallet_rmrk_core::pallet::Error<T>
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
>>>>>>> fix: regenerate types after rebase
=======
=======
   * Lookup437: pallet_rmrk_core::pallet::Error<T>
>>>>>>> chore: regenerate types
>>>>>>> chore: regenerate types
=======
   * Lookup437: pallet_rmrk_core::pallet::Error<T>
>>>>>>> chore: regenerate types
   **/
  PalletRmrkCoreError: {
    _enum: ['CorruptedCollectionType', 'RmrkPropertyKeyIsTooLong', 'RmrkPropertyValueIsTooLong', 'RmrkPropertyIsNotFound', 'UnableToDecodeRmrkData', 'CollectionNotEmpty', 'NoAvailableCollectionId', 'NoAvailableNftId', 'CollectionUnknown', 'NoPermission', 'NonTransferable', 'CollectionFullOrLocked', 'ResourceDoesntExist', 'CannotSendToDescendentOrSelf', 'CannotAcceptNonOwnedNft', 'CannotRejectNonOwnedNft', 'CannotRejectNonPendingNft', 'ResourceNotPending', 'NoAvailableResourceId']
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup430: pallet_rmrk_equip::pallet::Error<T>
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
=======
>>>>>>> chore: regenerate types
<<<<<<< HEAD
   * Lookup431: pallet_rmrk_equip::pallet::Error<T>
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
   * Lookup432: pallet_rmrk_equip::pallet::Error<T>
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
   * Lookup445: pallet_rmrk_equip::pallet::Error<T>
=======
   * Lookup441: pallet_rmrk_equip::pallet::Error<T>
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
=======
=======
=======
=======
   * Lookup445: pallet_rmrk_equip::pallet::Error<T>
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
=======
=======
=======
=======
   * Lookup451: pallet_rmrk_equip::pallet::Error<T>
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
=======
   * Lookup453: pallet_rmrk_equip::pallet::Error<T>
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
>>>>>>> fix: regenerate types after rebase
=======
=======
   * Lookup439: pallet_rmrk_equip::pallet::Error<T>
>>>>>>> chore: regenerate types
>>>>>>> chore: regenerate types
=======
   * Lookup439: pallet_rmrk_equip::pallet::Error<T>
>>>>>>> chore: regenerate types
   **/
  PalletRmrkEquipError: {
    _enum: ['PermissionError', 'NoAvailableBaseId', 'NoAvailablePartId', 'BaseDoesntExist', 'NeedsDefaultThemeFirst', 'PartDoesntExist', 'NoEquippableOnFixedPart']
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup436: pallet_app_promotion::pallet::Error<T>
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
=======
>>>>>>> chore: regenerate types
<<<<<<< HEAD
   * Lookup437: pallet_app_promotion::pallet::Error<T>
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
   * Lookup438: pallet_app_promotion::pallet::Error<T>
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
   * Lookup451: pallet_app_promotion::pallet::Error<T>
=======
   * Lookup447: pallet_app_promotion::pallet::Error<T>
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
=======
=======
=======
=======
   * Lookup451: pallet_app_promotion::pallet::Error<T>
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
=======
=======
=======
=======
   * Lookup457: pallet_app_promotion::pallet::Error<T>
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
=======
   * Lookup459: pallet_app_promotion::pallet::Error<T>
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
>>>>>>> fix: regenerate types after rebase
=======
=======
   * Lookup445: pallet_app_promotion::pallet::Error<T>
>>>>>>> chore: regenerate types
>>>>>>> chore: regenerate types
=======
   * Lookup445: pallet_app_promotion::pallet::Error<T>
>>>>>>> chore: regenerate types
   **/
  PalletAppPromotionError: {
    _enum: ['AdminNotSet', 'NoPermission', 'NotSufficientFunds', 'PendingForBlockOverflow', 'SponsorNotSet', 'IncorrectLockedBalanceOperation']
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup437: pallet_foreign_assets::module::Error<T>
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
=======
>>>>>>> chore: regenerate types
<<<<<<< HEAD
   * Lookup438: pallet_foreign_assets::module::Error<T>
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
   * Lookup439: pallet_foreign_assets::module::Error<T>
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
   * Lookup452: pallet_foreign_assets::module::Error<T>
=======
   * Lookup448: pallet_foreign_assets::module::Error<T>
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
=======
=======
=======
=======
   * Lookup452: pallet_foreign_assets::module::Error<T>
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
=======
=======
=======
=======
   * Lookup458: pallet_foreign_assets::module::Error<T>
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
=======
   * Lookup460: pallet_foreign_assets::module::Error<T>
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
>>>>>>> fix: regenerate types after rebase
=======
=======
   * Lookup446: pallet_foreign_assets::module::Error<T>
>>>>>>> chore: regenerate types
>>>>>>> chore: regenerate types
=======
   * Lookup446: pallet_foreign_assets::module::Error<T>
>>>>>>> chore: regenerate types
   **/
  PalletForeignAssetsModuleError: {
    _enum: ['BadLocation', 'MultiLocationExisted', 'AssetIdNotExists', 'AssetIdExisted']
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup439: pallet_evm::pallet::Error<T>
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
=======
>>>>>>> chore: regenerate types
<<<<<<< HEAD
   * Lookup440: pallet_evm::pallet::Error<T>
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
   * Lookup441: pallet_evm::pallet::Error<T>
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
   * Lookup454: pallet_evm::pallet::Error<T>
=======
   * Lookup451: pallet_evm::pallet::Error<T>
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
=======
=======
=======
=======
   * Lookup455: pallet_evm::pallet::Error<T>
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
=======
=======
=======
=======
   * Lookup461: pallet_evm::pallet::Error<T>
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
=======
   * Lookup462: pallet_evm::pallet::Error<T>
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
>>>>>>> fix: regenerate types after rebase
=======
=======
   * Lookup448: pallet_evm::pallet::Error<T>
>>>>>>> chore: regenerate types
>>>>>>> chore: regenerate types
=======
   * Lookup448: pallet_evm::pallet::Error<T>
>>>>>>> chore: regenerate types
   **/
  PalletEvmError: {
    _enum: ['BalanceLow', 'FeeOverflow', 'PaymentOverflow', 'WithdrawFailed', 'GasPriceTooLow', 'InvalidNonce', 'GasLimitTooLow', 'GasLimitTooHigh', 'Undefined', 'Reentrancy', 'TransactionMustComeFromEOA']
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup442: fp_rpc::TransactionStatus
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
=======
>>>>>>> chore: regenerate types
<<<<<<< HEAD
   * Lookup443: fp_rpc::TransactionStatus
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
   * Lookup444: fp_rpc::TransactionStatus
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
   * Lookup457: fp_rpc::TransactionStatus
=======
   * Lookup454: fp_rpc::TransactionStatus
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
=======
=======
=======
=======
   * Lookup458: fp_rpc::TransactionStatus
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
=======
=======
=======
=======
   * Lookup464: fp_rpc::TransactionStatus
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
=======
   * Lookup465: fp_rpc::TransactionStatus
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
>>>>>>> fix: regenerate types after rebase
=======
=======
   * Lookup451: fp_rpc::TransactionStatus
>>>>>>> chore: regenerate types
>>>>>>> chore: regenerate types
=======
   * Lookup451: fp_rpc::TransactionStatus
>>>>>>> chore: regenerate types
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
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup444: ethbloom::Bloom
   **/
  EthbloomBloom: '[u8;256]',
  /**
   * Lookup446: ethereum::receipt::ReceiptV3
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
=======
>>>>>>> chore: regenerate types
<<<<<<< HEAD
   * Lookup445: ethbloom::Bloom
   **/
  EthbloomBloom: '[u8;256]',
  /**
   * Lookup447: ethereum::receipt::ReceiptV3
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
   * Lookup446: ethbloom::Bloom
   **/
  EthbloomBloom: '[u8;256]',
  /**
   * Lookup448: ethereum::receipt::ReceiptV3
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
   * Lookup459: ethbloom::Bloom
   **/
  EthbloomBloom: '[u8;256]',
  /**
   * Lookup461: ethereum::receipt::ReceiptV3
=======
   * Lookup456: ethbloom::Bloom
   **/
  EthbloomBloom: '[u8;256]',
  /**
   * Lookup458: ethereum::receipt::ReceiptV3
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
=======
=======
=======
=======
   * Lookup460: ethbloom::Bloom
   **/
  EthbloomBloom: '[u8;256]',
  /**
   * Lookup462: ethereum::receipt::ReceiptV3
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
=======
=======
=======
=======
   * Lookup466: ethbloom::Bloom
   **/
  EthbloomBloom: '[u8;256]',
  /**
   * Lookup468: ethereum::receipt::ReceiptV3
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
=======
   * Lookup467: ethbloom::Bloom
   **/
  EthbloomBloom: '[u8;256]',
  /**
   * Lookup469: ethereum::receipt::ReceiptV3
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
>>>>>>> fix: regenerate types after rebase
=======
=======
=======
>>>>>>> chore: regenerate types
   * Lookup453: ethbloom::Bloom
   **/
  EthbloomBloom: '[u8;256]',
  /**
   * Lookup455: ethereum::receipt::ReceiptV3
<<<<<<< HEAD
>>>>>>> chore: regenerate types
>>>>>>> chore: regenerate types
=======
>>>>>>> chore: regenerate types
   **/
  EthereumReceiptReceiptV3: {
    _enum: {
      Legacy: 'EthereumReceiptEip658ReceiptData',
      EIP2930: 'EthereumReceiptEip658ReceiptData',
      EIP1559: 'EthereumReceiptEip658ReceiptData'
    }
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup447: ethereum::receipt::EIP658ReceiptData
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
=======
>>>>>>> chore: regenerate types
<<<<<<< HEAD
   * Lookup448: ethereum::receipt::EIP658ReceiptData
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
   * Lookup449: ethereum::receipt::EIP658ReceiptData
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
   * Lookup462: ethereum::receipt::EIP658ReceiptData
=======
   * Lookup459: ethereum::receipt::EIP658ReceiptData
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
=======
=======
=======
=======
   * Lookup463: ethereum::receipt::EIP658ReceiptData
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
=======
=======
=======
=======
   * Lookup469: ethereum::receipt::EIP658ReceiptData
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
=======
   * Lookup470: ethereum::receipt::EIP658ReceiptData
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
>>>>>>> fix: regenerate types after rebase
=======
=======
   * Lookup456: ethereum::receipt::EIP658ReceiptData
>>>>>>> chore: regenerate types
>>>>>>> chore: regenerate types
=======
   * Lookup456: ethereum::receipt::EIP658ReceiptData
>>>>>>> chore: regenerate types
   **/
  EthereumReceiptEip658ReceiptData: {
    statusCode: 'u8',
    usedGas: 'U256',
    logsBloom: 'EthbloomBloom',
    logs: 'Vec<EthereumLog>'
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup448: ethereum::block::Block<ethereum::transaction::TransactionV2>
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
=======
>>>>>>> chore: regenerate types
<<<<<<< HEAD
   * Lookup449: ethereum::block::Block<ethereum::transaction::TransactionV2>
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
   * Lookup450: ethereum::block::Block<ethereum::transaction::TransactionV2>
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
   * Lookup463: ethereum::block::Block<ethereum::transaction::TransactionV2>
=======
   * Lookup460: ethereum::block::Block<ethereum::transaction::TransactionV2>
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
=======
=======
=======
=======
   * Lookup464: ethereum::block::Block<ethereum::transaction::TransactionV2>
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
=======
=======
=======
=======
   * Lookup470: ethereum::block::Block<ethereum::transaction::TransactionV2>
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
=======
   * Lookup471: ethereum::block::Block<ethereum::transaction::TransactionV2>
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
>>>>>>> fix: regenerate types after rebase
=======
=======
   * Lookup457: ethereum::block::Block<ethereum::transaction::TransactionV2>
>>>>>>> chore: regenerate types
>>>>>>> chore: regenerate types
=======
   * Lookup457: ethereum::block::Block<ethereum::transaction::TransactionV2>
>>>>>>> chore: regenerate types
   **/
  EthereumBlock: {
    header: 'EthereumHeader',
    transactions: 'Vec<EthereumTransactionTransactionV2>',
    ommers: 'Vec<EthereumHeader>'
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup449: ethereum::header::Header
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
=======
>>>>>>> chore: regenerate types
<<<<<<< HEAD
   * Lookup450: ethereum::header::Header
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
   * Lookup451: ethereum::header::Header
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
   * Lookup464: ethereum::header::Header
=======
   * Lookup461: ethereum::header::Header
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
=======
=======
=======
=======
   * Lookup465: ethereum::header::Header
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
=======
=======
=======
=======
   * Lookup471: ethereum::header::Header
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
=======
   * Lookup472: ethereum::header::Header
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
>>>>>>> fix: regenerate types after rebase
=======
=======
   * Lookup458: ethereum::header::Header
>>>>>>> chore: regenerate types
>>>>>>> chore: regenerate types
=======
   * Lookup458: ethereum::header::Header
>>>>>>> chore: regenerate types
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
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup450: ethereum_types::hash::H64
   **/
  EthereumTypesHashH64: '[u8;8]',
  /**
   * Lookup455: pallet_ethereum::pallet::Error<T>
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
=======
>>>>>>> chore: regenerate types
<<<<<<< HEAD
   * Lookup451: ethereum_types::hash::H64
   **/
  EthereumTypesHashH64: '[u8;8]',
  /**
   * Lookup456: pallet_ethereum::pallet::Error<T>
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
   * Lookup452: ethereum_types::hash::H64
   **/
  EthereumTypesHashH64: '[u8;8]',
  /**
   * Lookup457: pallet_ethereum::pallet::Error<T>
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
   * Lookup465: ethereum_types::hash::H64
   **/
  EthereumTypesHashH64: '[u8;8]',
  /**
   * Lookup470: pallet_ethereum::pallet::Error<T>
=======
   * Lookup462: ethereum_types::hash::H64
   **/
  EthereumTypesHashH64: '[u8;8]',
  /**
   * Lookup467: pallet_ethereum::pallet::Error<T>
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
=======
=======
=======
=======
   * Lookup466: ethereum_types::hash::H64
   **/
  EthereumTypesHashH64: '[u8;8]',
  /**
   * Lookup471: pallet_ethereum::pallet::Error<T>
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
=======
=======
=======
=======
   * Lookup472: ethereum_types::hash::H64
   **/
  EthereumTypesHashH64: '[u8;8]',
  /**
   * Lookup477: pallet_ethereum::pallet::Error<T>
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
=======
   * Lookup473: ethereum_types::hash::H64
   **/
  EthereumTypesHashH64: '[u8;8]',
  /**
   * Lookup478: pallet_ethereum::pallet::Error<T>
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
>>>>>>> fix: regenerate types after rebase
=======
=======
=======
>>>>>>> chore: regenerate types
   * Lookup459: ethereum_types::hash::H64
   **/
  EthereumTypesHashH64: '[u8;8]',
  /**
   * Lookup464: pallet_ethereum::pallet::Error<T>
<<<<<<< HEAD
>>>>>>> chore: regenerate types
>>>>>>> chore: regenerate types
=======
>>>>>>> chore: regenerate types
   **/
  PalletEthereumError: {
    _enum: ['InvalidSignature', 'PreLogExists']
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup456: pallet_evm_coder_substrate::pallet::Error<T>
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
=======
>>>>>>> chore: regenerate types
<<<<<<< HEAD
   * Lookup457: pallet_evm_coder_substrate::pallet::Error<T>
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
   * Lookup458: pallet_evm_coder_substrate::pallet::Error<T>
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
   * Lookup471: pallet_evm_coder_substrate::pallet::Error<T>
=======
   * Lookup468: pallet_evm_coder_substrate::pallet::Error<T>
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
=======
=======
=======
=======
   * Lookup472: pallet_evm_coder_substrate::pallet::Error<T>
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
=======
=======
=======
=======
   * Lookup478: pallet_evm_coder_substrate::pallet::Error<T>
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
=======
   * Lookup479: pallet_evm_coder_substrate::pallet::Error<T>
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
>>>>>>> fix: regenerate types after rebase
=======
=======
   * Lookup465: pallet_evm_coder_substrate::pallet::Error<T>
>>>>>>> chore: regenerate types
>>>>>>> chore: regenerate types
=======
   * Lookup465: pallet_evm_coder_substrate::pallet::Error<T>
>>>>>>> chore: regenerate types
   **/
  PalletEvmCoderSubstrateError: {
    _enum: ['OutOfGas', 'OutOfFund']
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup457: up_data_structs::SponsorshipState<pallet_evm::account::BasicCrossAccountIdRepr<sp_core::crypto::AccountId32>>
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
=======
>>>>>>> chore: regenerate types
<<<<<<< HEAD
   * Lookup458: up_data_structs::SponsorshipState<pallet_evm::account::BasicCrossAccountIdRepr<sp_core::crypto::AccountId32>>
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
   * Lookup459: up_data_structs::SponsorshipState<pallet_evm::account::BasicCrossAccountIdRepr<sp_core::crypto::AccountId32>>
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
   * Lookup472: up_data_structs::SponsorshipState<pallet_evm::account::BasicCrossAccountIdRepr<sp_core::crypto::AccountId32>>
=======
   * Lookup469: up_data_structs::SponsorshipState<pallet_evm::account::BasicCrossAccountIdRepr<sp_core::crypto::AccountId32>>
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
=======
=======
=======
=======
   * Lookup473: up_data_structs::SponsorshipState<pallet_evm::account::BasicCrossAccountIdRepr<sp_core::crypto::AccountId32>>
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
=======
=======
=======
=======
   * Lookup479: up_data_structs::SponsorshipState<pallet_evm::account::BasicCrossAccountIdRepr<sp_core::crypto::AccountId32>>
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
=======
   * Lookup480: up_data_structs::SponsorshipState<pallet_evm::account::BasicCrossAccountIdRepr<sp_core::crypto::AccountId32>>
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
>>>>>>> fix: regenerate types after rebase
=======
=======
   * Lookup466: up_data_structs::SponsorshipState<pallet_evm::account::BasicCrossAccountIdRepr<sp_core::crypto::AccountId32>>
>>>>>>> chore: regenerate types
>>>>>>> chore: regenerate types
=======
   * Lookup466: up_data_structs::SponsorshipState<pallet_evm::account::BasicCrossAccountIdRepr<sp_core::crypto::AccountId32>>
>>>>>>> chore: regenerate types
   **/
  UpDataStructsSponsorshipStateBasicCrossAccountIdRepr: {
    _enum: {
      Disabled: 'Null',
      Unconfirmed: 'PalletEvmAccountBasicCrossAccountIdRepr',
      Confirmed: 'PalletEvmAccountBasicCrossAccountIdRepr'
    }
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup458: pallet_evm_contract_helpers::SponsoringModeT
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
=======
>>>>>>> chore: regenerate types
<<<<<<< HEAD
   * Lookup459: pallet_evm_contract_helpers::SponsoringModeT
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
   * Lookup460: pallet_evm_contract_helpers::SponsoringModeT
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
   * Lookup473: pallet_evm_contract_helpers::SponsoringModeT
=======
   * Lookup470: pallet_evm_contract_helpers::SponsoringModeT
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
=======
=======
=======
=======
   * Lookup474: pallet_evm_contract_helpers::SponsoringModeT
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
=======
=======
=======
=======
   * Lookup480: pallet_evm_contract_helpers::SponsoringModeT
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
=======
   * Lookup481: pallet_evm_contract_helpers::SponsoringModeT
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
>>>>>>> fix: regenerate types after rebase
=======
=======
   * Lookup467: pallet_evm_contract_helpers::SponsoringModeT
>>>>>>> chore: regenerate types
>>>>>>> chore: regenerate types
=======
   * Lookup467: pallet_evm_contract_helpers::SponsoringModeT
>>>>>>> chore: regenerate types
   **/
  PalletEvmContractHelpersSponsoringModeT: {
    _enum: ['Disabled', 'Allowlisted', 'Generous']
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup464: pallet_evm_contract_helpers::pallet::Error<T>
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
=======
>>>>>>> chore: regenerate types
<<<<<<< HEAD
   * Lookup465: pallet_evm_contract_helpers::pallet::Error<T>
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
   * Lookup466: pallet_evm_contract_helpers::pallet::Error<T>
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
   * Lookup479: pallet_evm_contract_helpers::pallet::Error<T>
=======
   * Lookup476: pallet_evm_contract_helpers::pallet::Error<T>
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
=======
=======
=======
=======
   * Lookup480: pallet_evm_contract_helpers::pallet::Error<T>
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
=======
=======
=======
=======
   * Lookup486: pallet_evm_contract_helpers::pallet::Error<T>
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
=======
   * Lookup487: pallet_evm_contract_helpers::pallet::Error<T>
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
>>>>>>> fix: regenerate types after rebase
=======
=======
   * Lookup473: pallet_evm_contract_helpers::pallet::Error<T>
>>>>>>> chore: regenerate types
>>>>>>> chore: regenerate types
=======
   * Lookup473: pallet_evm_contract_helpers::pallet::Error<T>
>>>>>>> chore: regenerate types
   **/
  PalletEvmContractHelpersError: {
    _enum: ['NoPermission', 'NoPendingSponsor', 'TooManyMethodsHaveSponsoredLimit']
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup465: pallet_evm_migration::pallet::Error<T>
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
=======
>>>>>>> chore: regenerate types
<<<<<<< HEAD
   * Lookup466: pallet_evm_migration::pallet::Error<T>
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
   * Lookup467: pallet_evm_migration::pallet::Error<T>
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
   * Lookup480: pallet_evm_migration::pallet::Error<T>
=======
   * Lookup477: pallet_evm_migration::pallet::Error<T>
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
=======
=======
=======
=======
   * Lookup481: pallet_evm_migration::pallet::Error<T>
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
=======
=======
=======
=======
   * Lookup487: pallet_evm_migration::pallet::Error<T>
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
=======
   * Lookup488: pallet_evm_migration::pallet::Error<T>
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
>>>>>>> fix: regenerate types after rebase
=======
=======
   * Lookup474: pallet_evm_migration::pallet::Error<T>
>>>>>>> chore: regenerate types
>>>>>>> chore: regenerate types
=======
   * Lookup474: pallet_evm_migration::pallet::Error<T>
>>>>>>> chore: regenerate types
   **/
  PalletEvmMigrationError: {
    _enum: ['AccountNotEmpty', 'AccountIsNotMigrating', 'BadEvent']
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup466: pallet_maintenance::pallet::Error<T>
   **/
  PalletMaintenanceError: 'Null',
  /**
   * Lookup467: pallet_test_utils::pallet::Error<T>
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
=======
>>>>>>> chore: regenerate types
<<<<<<< HEAD
   * Lookup467: pallet_maintenance::pallet::Error<T>
   **/
  PalletMaintenanceError: 'Null',
  /**
   * Lookup468: pallet_test_utils::pallet::Error<T>
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
   * Lookup468: pallet_maintenance::pallet::Error<T>
   **/
  PalletMaintenanceError: 'Null',
  /**
   * Lookup469: pallet_test_utils::pallet::Error<T>
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
   * Lookup481: pallet_maintenance::pallet::Error<T>
   **/
  PalletMaintenanceError: 'Null',
  /**
   * Lookup482: pallet_test_utils::pallet::Error<T>
=======
   * Lookup478: pallet_maintenance::pallet::Error<T>
   **/
  PalletMaintenanceError: 'Null',
  /**
   * Lookup479: pallet_test_utils::pallet::Error<T>
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
=======
=======
=======
=======
   * Lookup482: pallet_maintenance::pallet::Error<T>
   **/
  PalletMaintenanceError: 'Null',
  /**
   * Lookup483: pallet_test_utils::pallet::Error<T>
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
=======
=======
=======
=======
   * Lookup488: pallet_maintenance::pallet::Error<T>
   **/
  PalletMaintenanceError: 'Null',
  /**
   * Lookup489: pallet_test_utils::pallet::Error<T>
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
=======
   * Lookup489: pallet_maintenance::pallet::Error<T>
   **/
  PalletMaintenanceError: 'Null',
  /**
   * Lookup490: pallet_test_utils::pallet::Error<T>
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
>>>>>>> fix: regenerate types after rebase
=======
=======
=======
>>>>>>> chore: regenerate types
   * Lookup475: pallet_maintenance::pallet::Error<T>
   **/
  PalletMaintenanceError: 'Null',
  /**
   * Lookup476: pallet_test_utils::pallet::Error<T>
<<<<<<< HEAD
>>>>>>> chore: regenerate types
>>>>>>> chore: regenerate types
=======
>>>>>>> chore: regenerate types
   **/
  PalletTestUtilsError: {
    _enum: ['TestPalletDisabled', 'TriggerRollback']
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup469: sp_runtime::MultiSignature
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
=======
>>>>>>> chore: regenerate types
<<<<<<< HEAD
   * Lookup470: sp_runtime::MultiSignature
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
   * Lookup471: sp_runtime::MultiSignature
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
   * Lookup484: sp_runtime::MultiSignature
=======
   * Lookup481: sp_runtime::MultiSignature
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
=======
=======
=======
=======
   * Lookup485: sp_runtime::MultiSignature
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
=======
=======
=======
=======
   * Lookup491: sp_runtime::MultiSignature
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
=======
   * Lookup492: sp_runtime::MultiSignature
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
>>>>>>> fix: regenerate types after rebase
=======
=======
   * Lookup478: sp_runtime::MultiSignature
>>>>>>> chore: regenerate types
>>>>>>> chore: regenerate types
=======
   * Lookup478: sp_runtime::MultiSignature
>>>>>>> chore: regenerate types
   **/
  SpRuntimeMultiSignature: {
    _enum: {
      Ed25519: 'SpCoreEd25519Signature',
      Sr25519: 'SpCoreSr25519Signature',
      Ecdsa: 'SpCoreEcdsaSignature'
    }
  },
  /**
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup470: sp_core::ed25519::Signature
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
=======
>>>>>>> chore: regenerate types
<<<<<<< HEAD
   * Lookup471: sp_core::ed25519::Signature
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
   * Lookup472: sp_core::ed25519::Signature
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
   * Lookup485: sp_core::ed25519::Signature
>>>>>>> fix: update polkadot types and definitions
>>>>>>> fix: update polkadot types and definitions
>>>>>>> fix: update polkadot types and definitions
   **/
  SpCoreEd25519Signature: '[u8;64]',
  /**
   * Lookup472: sp_core::sr25519::Signature
   **/
  SpCoreSr25519Signature: '[u8;64]',
  /**
   * Lookup473: sp_core::ecdsa::Signature
   **/
  SpCoreEcdsaSignature: '[u8;65]',
  /**
   * Lookup476: frame_system::extensions::check_spec_version::CheckSpecVersion<T>
   **/
  FrameSystemExtensionsCheckSpecVersion: 'Null',
  /**
   * Lookup477: frame_system::extensions::check_tx_version::CheckTxVersion<T>
   **/
  FrameSystemExtensionsCheckTxVersion: 'Null',
  /**
   * Lookup478: frame_system::extensions::check_genesis::CheckGenesis<T>
   **/
  FrameSystemExtensionsCheckGenesis: 'Null',
  /**
   * Lookup481: frame_system::extensions::check_nonce::CheckNonce<T>
   **/
  FrameSystemExtensionsCheckNonce: 'Compact<u32>',
  /**
   * Lookup482: frame_system::extensions::check_weight::CheckWeight<T>
   **/
  FrameSystemExtensionsCheckWeight: 'Null',
  /**
   * Lookup483: opal_runtime::runtime_common::maintenance::CheckMaintenance
   **/
  OpalRuntimeRuntimeCommonMaintenanceCheckMaintenance: 'Null',
  /**
   * Lookup484: pallet_template_transaction_payment::ChargeTransactionPayment<opal_runtime::Runtime>
   **/
  PalletTemplateTransactionPaymentChargeTransactionPayment: 'Compact<u128>',
  /**
   * Lookup485: opal_runtime::Runtime
   **/
  OpalRuntimeRuntime: 'Null',
  /**
<<<<<<< HEAD
   * Lookup486: pallet_ethereum::FakeTransactionFinalizer<opal_runtime::Runtime>
=======
<<<<<<< HEAD
   * Lookup487: pallet_ethereum::FakeTransactionFinalizer<opal_runtime::Runtime>
=======
<<<<<<< HEAD
   * Lookup488: pallet_ethereum::FakeTransactionFinalizer<opal_runtime::Runtime>
=======
   * Lookup501: pallet_ethereum::FakeTransactionFinalizer<opal_runtime::Runtime>
=======
   * Lookup482: sp_core::ed25519::Signature
=======
   * Lookup486: sp_core::ed25519::Signature
>>>>>>> chore: regenerate types
=======
   * Lookup492: sp_core::ed25519::Signature
>>>>>>> chore:  regenerate types
=======
   * Lookup493: sp_core::ed25519::Signature
>>>>>>> fix: regenerate types after rebase
=======
=======
>>>>>>> chore: regenerate types
   * Lookup479: sp_core::ed25519::Signature
   **/
  SpCoreEd25519Signature: '[u8;64]',
  /**
   * Lookup481: sp_core::sr25519::Signature
   **/
  SpCoreSr25519Signature: '[u8;64]',
  /**
   * Lookup482: sp_core::ecdsa::Signature
   **/
  SpCoreEcdsaSignature: '[u8;65]',
  /**
   * Lookup485: frame_system::extensions::check_spec_version::CheckSpecVersion<T>
   **/
  FrameSystemExtensionsCheckSpecVersion: 'Null',
  /**
   * Lookup486: frame_system::extensions::check_tx_version::CheckTxVersion<T>
   **/
  FrameSystemExtensionsCheckTxVersion: 'Null',
  /**
   * Lookup487: frame_system::extensions::check_genesis::CheckGenesis<T>
   **/
  FrameSystemExtensionsCheckGenesis: 'Null',
  /**
   * Lookup490: frame_system::extensions::check_nonce::CheckNonce<T>
   **/
  FrameSystemExtensionsCheckNonce: 'Compact<u32>',
  /**
   * Lookup491: frame_system::extensions::check_weight::CheckWeight<T>
   **/
  FrameSystemExtensionsCheckWeight: 'Null',
  /**
   * Lookup492: opal_runtime::runtime_common::maintenance::CheckMaintenance
   **/
  OpalRuntimeRuntimeCommonMaintenanceCheckMaintenance: 'Null',
  /**
   * Lookup493: pallet_template_transaction_payment::ChargeTransactionPayment<opal_runtime::Runtime>
   **/
  PalletTemplateTransactionPaymentChargeTransactionPayment: 'Compact<u128>',
  /**
   * Lookup494: opal_runtime::Runtime
   **/
  OpalRuntimeRuntime: 'Null',
  /**
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
   * Lookup498: pallet_ethereum::FakeTransactionFinalizer<opal_runtime::Runtime>
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
=======
=======
=======
=======
   * Lookup502: pallet_ethereum::FakeTransactionFinalizer<opal_runtime::Runtime>
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
=======
=======
=======
=======
   * Lookup508: pallet_ethereum::FakeTransactionFinalizer<opal_runtime::Runtime>
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
=======
   * Lookup509: pallet_ethereum::FakeTransactionFinalizer<opal_runtime::Runtime>
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
>>>>>>> fix: regenerate types after rebase
=======
=======
   * Lookup495: pallet_ethereum::FakeTransactionFinalizer<opal_runtime::Runtime>
>>>>>>> chore: regenerate types
>>>>>>> chore: regenerate types
=======
   * Lookup495: pallet_ethereum::FakeTransactionFinalizer<opal_runtime::Runtime>
>>>>>>> chore: regenerate types
   **/
  PalletEthereumFakeTransactionFinalizer: 'Null'
};
