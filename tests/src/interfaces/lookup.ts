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
      Arithmetic: 'SpArithmeticArithmeticError',
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
   * Lookup27: sp_arithmetic::ArithmeticError
   **/
  SpArithmeticArithmeticError: {
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
   * Lookup30: pallet_collator_selection::pallet::Event<T>
   **/
  PalletCollatorSelectionEvent: {
    _enum: {
      InvulnerableAdded: {
        invulnerable: 'AccountId32',
      },
      InvulnerableRemoved: {
        invulnerable: 'AccountId32',
      },
      LicenseObtained: {
        accountId: 'AccountId32',
        deposit: 'u128',
      },
      LicenseReleased: {
        accountId: 'AccountId32',
        depositReturned: 'u128',
      },
      CandidateAdded: {
        accountId: 'AccountId32',
      },
      CandidateRemoved: {
        accountId: 'AccountId32'
      }
    }
  },
  /**
   * Lookup31: pallet_session::pallet::Event
   **/
  PalletSessionEvent: {
    _enum: {
      NewSession: {
        sessionIndex: 'u32'
      }
    }
  },
  /**
   * Lookup32: pallet_balances::pallet::Event<T, I>
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
   * Lookup33: frame_support::traits::tokens::misc::BalanceStatus
   **/
  FrameSupportTokensMiscBalanceStatus: {
    _enum: ['Free', 'Reserved']
  },
  /**
   * Lookup34: pallet_transaction_payment::pallet::Event<T>
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
   * Lookup35: pallet_treasury::pallet::Event<T, I>
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
        beneficiary: 'AccountId32',
      },
      UpdatedInactive: {
        reactivated: 'u128',
        deactivated: 'u128'
      }
    }
  },
  /**
   * Lookup36: pallet_sudo::pallet::Event<T>
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
   * Lookup40: orml_vesting::module::Event<T>
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
   * Lookup41: orml_vesting::VestingSchedule<BlockNumber, Balance>
   **/
  OrmlVestingVestingSchedule: {
    start: 'u32',
    period: 'u32',
    periodCount: 'u32',
    perPeriod: 'Compact<u128>'
  },
  /**
   * Lookup43: orml_xtokens::module::Event<T>
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
   * Lookup44: xcm::v1::multiasset::MultiAssets
   **/
  XcmV1MultiassetMultiAssets: 'Vec<XcmV1MultiAsset>',
  /**
   * Lookup46: xcm::v1::multiasset::MultiAsset
   **/
  XcmV1MultiAsset: {
    id: 'XcmV1MultiassetAssetId',
    fun: 'XcmV1MultiassetFungibility'
  },
  /**
   * Lookup47: xcm::v1::multiasset::AssetId
   **/
  XcmV1MultiassetAssetId: {
    _enum: {
      Concrete: 'XcmV1MultiLocation',
      Abstract: 'Bytes'
    }
  },
  /**
   * Lookup48: xcm::v1::multilocation::MultiLocation
   **/
  XcmV1MultiLocation: {
    parents: 'u8',
    interior: 'XcmV1MultilocationJunctions'
  },
  /**
   * Lookup49: xcm::v1::multilocation::Junctions
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
   * Lookup50: xcm::v1::junction::Junction
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
   * Lookup52: xcm::v0::junction::NetworkId
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
   * Lookup55: xcm::v0::junction::BodyId
   **/
  XcmV0JunctionBodyId: {
    _enum: {
      Unit: 'Null',
      Named: 'Bytes',
      Index: 'Compact<u32>',
      Executive: 'Null',
      Technical: 'Null',
      Legislative: 'Null',
      Judicial: 'Null',
      Defense: 'Null',
      Administration: 'Null',
      Treasury: 'Null'
    }
  },
  /**
   * Lookup56: xcm::v0::junction::BodyPart
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
   * Lookup57: xcm::v1::multiasset::Fungibility
   **/
  XcmV1MultiassetFungibility: {
    _enum: {
      Fungible: 'Compact<u128>',
      NonFungible: 'XcmV1MultiassetAssetInstance'
    }
  },
  /**
   * Lookup58: xcm::v1::multiasset::AssetInstance
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
   * Lookup61: orml_tokens::module::Event<T>
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
   * Lookup62: pallet_foreign_assets::AssetIds
   **/
  PalletForeignAssetsAssetIds: {
    _enum: {
      ForeignAssetId: 'u32',
      NativeAssetId: 'PalletForeignAssetsNativeCurrency'
    }
  },
  /**
   * Lookup63: pallet_foreign_assets::NativeCurrency
   **/
  PalletForeignAssetsNativeCurrency: {
    _enum: ['Here', 'Parent']
  },
  /**
   * Lookup64: pallet_identity::pallet::Event<T>
   **/
  PalletIdentityEvent: {
    _enum: {
      IdentitySet: {
        who: 'AccountId32',
      },
      IdentityCleared: {
        who: 'AccountId32',
        deposit: 'u128',
      },
      IdentityKilled: {
        who: 'AccountId32',
        deposit: 'u128',
      },
      IdentitiesInserted: {
        amount: 'u32',
      },
      IdentitiesRemoved: {
        amount: 'u32',
      },
      JudgementRequested: {
        who: 'AccountId32',
        registrarIndex: 'u32',
      },
      JudgementUnrequested: {
        who: 'AccountId32',
        registrarIndex: 'u32',
      },
      JudgementGiven: {
        target: 'AccountId32',
        registrarIndex: 'u32',
      },
      RegistrarAdded: {
        registrarIndex: 'u32',
      },
      SubIdentityAdded: {
        sub: 'AccountId32',
        main: 'AccountId32',
        deposit: 'u128',
      },
      SubIdentityRemoved: {
        sub: 'AccountId32',
        main: 'AccountId32',
        deposit: 'u128',
      },
      SubIdentityRevoked: {
        sub: 'AccountId32',
        main: 'AccountId32',
        deposit: 'u128',
      },
      SubIdentitiesInserted: {
        amount: 'u32'
      }
    }
  },
  /**
   * Lookup65: pallet_preimage::pallet::Event<T>
   **/
  PalletPreimageEvent: {
    _enum: {
      Noted: {
        _alias: {
          hash_: 'hash',
        },
        hash_: 'H256',
      },
      Requested: {
        _alias: {
          hash_: 'hash',
        },
        hash_: 'H256',
      },
      Cleared: {
        _alias: {
          hash_: 'hash',
        },
        hash_: 'H256'
      }
    }
  },
  /**
   * Lookup66: cumulus_pallet_xcmp_queue::pallet::Event<T>
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
   * Lookup68: xcm::v2::traits::Error
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
   * Lookup70: pallet_xcm::pallet::Event<T>
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
   * Lookup71: xcm::v2::traits::Outcome
   **/
  XcmV2TraitsOutcome: {
    _enum: {
      Complete: 'u64',
      Incomplete: '(u64,XcmV2TraitsError)',
      Error: 'XcmV2TraitsError'
    }
  },
  /**
   * Lookup72: xcm::v2::Xcm<RuntimeCall>
   **/
  XcmV2Xcm: 'Vec<XcmV2Instruction>',
  /**
   * Lookup74: xcm::v2::Instruction<RuntimeCall>
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
   * Lookup75: xcm::v2::Response
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
   * Lookup78: xcm::v0::OriginKind
   **/
  XcmV0OriginKind: {
    _enum: ['Native', 'SovereignAccount', 'Superuser', 'Xcm']
  },
  /**
   * Lookup79: xcm::double_encoded::DoubleEncoded<T>
   **/
  XcmDoubleEncoded: {
    encoded: 'Bytes'
  },
  /**
   * Lookup80: xcm::v1::multiasset::MultiAssetFilter
   **/
  XcmV1MultiassetMultiAssetFilter: {
    _enum: {
      Definite: 'XcmV1MultiassetMultiAssets',
      Wild: 'XcmV1MultiassetWildMultiAsset'
    }
  },
  /**
   * Lookup81: xcm::v1::multiasset::WildMultiAsset
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
   * Lookup82: xcm::v1::multiasset::WildFungibility
   **/
  XcmV1MultiassetWildFungibility: {
    _enum: ['Fungible', 'NonFungible']
  },
  /**
   * Lookup83: xcm::v2::WeightLimit
   **/
  XcmV2WeightLimit: {
    _enum: {
      Unlimited: 'Null',
      Limited: 'Compact<u64>'
    }
  },
  /**
   * Lookup85: xcm::VersionedMultiAssets
   **/
  XcmVersionedMultiAssets: {
    _enum: {
      V0: 'Vec<XcmV0MultiAsset>',
      V1: 'XcmV1MultiassetMultiAssets'
    }
  },
  /**
   * Lookup87: xcm::v0::multi_asset::MultiAsset
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
   * Lookup88: xcm::v0::multi_location::MultiLocation
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
   * Lookup89: xcm::v0::junction::Junction
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
   * Lookup90: xcm::VersionedMultiLocation
   **/
  XcmVersionedMultiLocation: {
    _enum: {
      V0: 'XcmV0MultiLocation',
      V1: 'XcmV1MultiLocation'
    }
  },
  /**
   * Lookup91: cumulus_pallet_xcm::pallet::Event<T>
   **/
  CumulusPalletXcmEvent: {
    _enum: {
      InvalidFormat: '[u8;8]',
      UnsupportedVersion: '[u8;8]',
      ExecutedDownward: '([u8;8],XcmV2TraitsOutcome)'
    }
  },
  /**
   * Lookup92: cumulus_pallet_dmp_queue::pallet::Event<T>
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
   * Lookup93: pallet_configuration::pallet::Event<T>
   **/
  PalletConfigurationEvent: {
    _enum: {
      NewDesiredCollators: {
        desiredCollators: 'Option<u32>',
      },
      NewCollatorLicenseBond: {
        bondCost: 'Option<u128>',
      },
      NewCollatorKickThreshold: {
        lengthInBlocks: 'Option<u32>'
      }
    }
  },
  /**
   * Lookup96: pallet_common::pallet::Event<T>
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
   * Lookup99: pallet_evm::account::BasicCrossAccountIdRepr<sp_core::crypto::AccountId32>
   **/
  PalletEvmAccountBasicCrossAccountIdRepr: {
    _enum: {
      Substrate: 'AccountId32',
      Ethereum: 'H160'
    }
  },
  /**
   * Lookup103: pallet_structure::pallet::Event<T>
   **/
  PalletStructureEvent: {
    _enum: {
      Executed: 'Result<Null, SpRuntimeDispatchError>'
    }
  },
  /**
   * Lookup104: pallet_app_promotion::pallet::Event<T>
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
   * Lookup105: pallet_foreign_assets::module::Event<T>
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
   * Lookup106: pallet_foreign_assets::module::AssetMetadata<Balance>
   **/
  PalletForeignAssetsModuleAssetMetadata: {
    name: 'Bytes',
    symbol: 'Bytes',
    decimals: 'u8',
    minimalBalance: 'u128'
  },
  /**
   * Lookup107: pallet_evm::pallet::Event<T>
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
   * Lookup108: ethereum::log::Log
   **/
  EthereumLog: {
    address: 'H160',
    topics: 'Vec<H256>',
    data: 'Bytes'
  },
  /**
   * Lookup110: pallet_ethereum::pallet::Event
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
   * Lookup111: evm_core::error::ExitReason
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
   * Lookup112: evm_core::error::ExitSucceed
   **/
  EvmCoreErrorExitSucceed: {
    _enum: ['Stopped', 'Returned', 'Suicided']
  },
  /**
   * Lookup113: evm_core::error::ExitError
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
      __Unused14: 'Null',
      InvalidCode: 'u8'
    }
  },
  /**
   * Lookup117: evm_core::error::ExitRevert
   **/
  EvmCoreErrorExitRevert: {
    _enum: ['Reverted']
  },
  /**
   * Lookup118: evm_core::error::ExitFatal
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
   * Lookup119: pallet_evm_contract_helpers::pallet::Event<T>
   **/
  PalletEvmContractHelpersEvent: {
    _enum: {
      ContractSponsorSet: '(H160,AccountId32)',
      ContractSponsorshipConfirmed: '(H160,AccountId32)',
      ContractSponsorRemoved: 'H160'
    }
  },
  /**
   * Lookup120: pallet_evm_migration::pallet::Event<T>
   **/
  PalletEvmMigrationEvent: {
    _enum: ['TestEvent']
  },
  /**
   * Lookup121: pallet_maintenance::pallet::Event<T>
   **/
  PalletMaintenanceEvent: {
    _enum: ['MaintenanceEnabled', 'MaintenanceDisabled']
  },
  /**
   * Lookup122: pallet_test_utils::pallet::Event<T>
   **/
  PalletTestUtilsEvent: {
    _enum: ['ValueIsSet', 'ShouldRollback', 'BatchCompleted']
  },
  /**
   * Lookup123: frame_system::Phase
   **/
  FrameSystemPhase: {
    _enum: {
      ApplyExtrinsic: 'u32',
      Finalization: 'Null',
      Initialization: 'Null'
    }
  },
  /**
   * Lookup126: frame_system::LastRuntimeUpgradeInfo
   **/
  FrameSystemLastRuntimeUpgradeInfo: {
    specVersion: 'Compact<u32>',
    specName: 'Text'
  },
  /**
   * Lookup127: frame_system::pallet::Call<T>
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
   * Lookup131: frame_system::limits::BlockWeights
   **/
  FrameSystemLimitsBlockWeights: {
    baseBlock: 'SpWeightsWeightV2Weight',
    maxBlock: 'SpWeightsWeightV2Weight',
    perClass: 'FrameSupportDispatchPerDispatchClassWeightsPerClass'
  },
  /**
   * Lookup132: frame_support::dispatch::PerDispatchClass<frame_system::limits::WeightsPerClass>
   **/
  FrameSupportDispatchPerDispatchClassWeightsPerClass: {
    normal: 'FrameSystemLimitsWeightsPerClass',
    operational: 'FrameSystemLimitsWeightsPerClass',
    mandatory: 'FrameSystemLimitsWeightsPerClass'
  },
  /**
   * Lookup133: frame_system::limits::WeightsPerClass
   **/
  FrameSystemLimitsWeightsPerClass: {
    baseExtrinsic: 'SpWeightsWeightV2Weight',
    maxExtrinsic: 'Option<SpWeightsWeightV2Weight>',
    maxTotal: 'Option<SpWeightsWeightV2Weight>',
    reserved: 'Option<SpWeightsWeightV2Weight>'
  },
  /**
   * Lookup135: frame_system::limits::BlockLength
   **/
  FrameSystemLimitsBlockLength: {
    max: 'FrameSupportDispatchPerDispatchClassU32'
  },
  /**
   * Lookup136: frame_support::dispatch::PerDispatchClass<T>
   **/
  FrameSupportDispatchPerDispatchClassU32: {
    normal: 'u32',
    operational: 'u32',
    mandatory: 'u32'
  },
  /**
   * Lookup137: sp_weights::RuntimeDbWeight
   **/
  SpWeightsRuntimeDbWeight: {
    read: 'u64',
    write: 'u64'
  },
  /**
   * Lookup138: sp_version::RuntimeVersion
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
   * Lookup143: frame_system::pallet::Error<T>
   **/
  FrameSystemError: {
    _enum: ['InvalidSpecName', 'SpecVersionNeedsToIncrease', 'FailedToExtractRuntimeVersion', 'NonDefaultComposite', 'NonZeroRefCount', 'CallFiltered']
  },
  /**
   * Lookup144: polkadot_primitives::v2::PersistedValidationData<primitive_types::H256, N>
   **/
  PolkadotPrimitivesV2PersistedValidationData: {
    parentHead: 'Bytes',
    relayParentNumber: 'u32',
    relayParentStorageRoot: 'H256',
    maxPovSize: 'u32'
  },
  /**
   * Lookup147: polkadot_primitives::v2::UpgradeRestriction
   **/
  PolkadotPrimitivesV2UpgradeRestriction: {
    _enum: ['Present']
  },
  /**
   * Lookup148: sp_trie::storage_proof::StorageProof
   **/
  SpTrieStorageProof: {
    trieNodes: 'BTreeSet<Bytes>'
  },
  /**
   * Lookup150: cumulus_pallet_parachain_system::relay_state_snapshot::MessagingStateSnapshot
   **/
  CumulusPalletParachainSystemRelayStateSnapshotMessagingStateSnapshot: {
    dmqMqcHead: 'H256',
    relayDispatchQueueSize: '(u32,u32)',
    ingressChannels: 'Vec<(u32,PolkadotPrimitivesV2AbridgedHrmpChannel)>',
    egressChannels: 'Vec<(u32,PolkadotPrimitivesV2AbridgedHrmpChannel)>'
  },
  /**
   * Lookup153: polkadot_primitives::v2::AbridgedHrmpChannel
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
   * Lookup154: polkadot_primitives::v2::AbridgedHostConfiguration
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
   * Lookup160: polkadot_core_primitives::OutboundHrmpMessage<polkadot_parachain::primitives::Id>
   **/
  PolkadotCorePrimitivesOutboundHrmpMessage: {
    recipient: 'u32',
    data: 'Bytes'
  },
  /**
   * Lookup161: cumulus_pallet_parachain_system::pallet::Call<T>
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
   * Lookup162: cumulus_primitives_parachain_inherent::ParachainInherentData
   **/
  CumulusPrimitivesParachainInherentParachainInherentData: {
    validationData: 'PolkadotPrimitivesV2PersistedValidationData',
    relayChainState: 'SpTrieStorageProof',
    downwardMessages: 'Vec<PolkadotCorePrimitivesInboundDownwardMessage>',
    horizontalMessages: 'BTreeMap<u32, Vec<PolkadotCorePrimitivesInboundHrmpMessage>>'
  },
  /**
   * Lookup164: polkadot_core_primitives::InboundDownwardMessage<BlockNumber>
   **/
  PolkadotCorePrimitivesInboundDownwardMessage: {
    sentAt: 'u32',
    msg: 'Bytes'
  },
  /**
   * Lookup167: polkadot_core_primitives::InboundHrmpMessage<BlockNumber>
   **/
  PolkadotCorePrimitivesInboundHrmpMessage: {
    sentAt: 'u32',
    data: 'Bytes'
  },
  /**
   * Lookup170: cumulus_pallet_parachain_system::pallet::Error<T>
   **/
  CumulusPalletParachainSystemError: {
    _enum: ['OverlappingUpgrades', 'ProhibitedByPolkadot', 'TooBig', 'ValidationDataNotAvailable', 'HostConfigurationNotAvailable', 'NotScheduled', 'NothingAuthorized', 'Unauthorized']
  },
  /**
   * Lookup172: pallet_authorship::UncleEntryItem<BlockNumber, primitive_types::H256, sp_core::crypto::AccountId32>
   **/
  PalletAuthorshipUncleEntryItem: {
    _enum: {
      InclusionHeight: 'u32',
      Uncle: '(H256,Option<AccountId32>)'
    }
  },
  /**
   * Lookup174: pallet_authorship::pallet::Call<T>
   **/
  PalletAuthorshipCall: {
    _enum: {
      set_uncles: {
        newUncles: 'Vec<SpRuntimeHeader>'
      }
    }
  },
  /**
   * Lookup176: sp_runtime::generic::header::Header<Number, sp_runtime::traits::BlakeTwo256>
   **/
  SpRuntimeHeader: {
    parentHash: 'H256',
    number: 'Compact<u32>',
    stateRoot: 'H256',
    extrinsicsRoot: 'H256',
    digest: 'SpRuntimeDigest'
  },
  /**
   * Lookup177: sp_runtime::traits::BlakeTwo256
   **/
  SpRuntimeBlakeTwo256: 'Null',
  /**
   * Lookup178: pallet_authorship::pallet::Error<T>
   **/
  PalletAuthorshipError: {
    _enum: ['InvalidUncleParent', 'UnclesAlreadySet', 'TooManyUncles', 'GenesisUncle', 'TooHighUncle', 'UncleAlreadyIncluded', 'OldUncle']
  },
  /**
   * Lookup181: pallet_collator_selection::pallet::Call<T>
   **/
  PalletCollatorSelectionCall: {
    _enum: {
      add_invulnerable: {
        _alias: {
          new_: 'new',
        },
        new_: 'AccountId32',
      },
      remove_invulnerable: {
        who: 'AccountId32',
      },
      get_license: 'Null',
      onboard: 'Null',
      offboard: 'Null',
      release_license: 'Null',
      force_release_license: {
        who: 'AccountId32'
      }
    }
  },
  /**
   * Lookup182: pallet_collator_selection::pallet::Error<T>
   **/
  PalletCollatorSelectionError: {
    _enum: ['TooManyCandidates', 'Unknown', 'Permission', 'AlreadyHoldingLicense', 'NoLicense', 'AlreadyCandidate', 'NotCandidate', 'TooManyInvulnerables', 'TooFewInvulnerables', 'AlreadyInvulnerable', 'NotInvulnerable', 'NoAssociatedValidatorId', 'ValidatorNotRegistered']
  },
  /**
   * Lookup185: opal_runtime::runtime_common::SessionKeys
   **/
  OpalRuntimeRuntimeCommonSessionKeys: {
    aura: 'SpConsensusAuraSr25519AppSr25519Public'
  },
  /**
   * Lookup186: sp_consensus_aura::sr25519::app_sr25519::Public
   **/
  SpConsensusAuraSr25519AppSr25519Public: 'SpCoreSr25519Public',
  /**
   * Lookup187: sp_core::sr25519::Public
   **/
  SpCoreSr25519Public: '[u8;32]',
  /**
   * Lookup190: sp_core::crypto::KeyTypeId
   **/
  SpCoreCryptoKeyTypeId: '[u8;4]',
  /**
   * Lookup191: pallet_session::pallet::Call<T>
   **/
  PalletSessionCall: {
    _enum: {
      set_keys: {
        _alias: {
          keys_: 'keys',
        },
        keys_: 'OpalRuntimeRuntimeCommonSessionKeys',
        proof: 'Bytes',
      },
      purge_keys: 'Null'
    }
  },
  /**
   * Lookup192: pallet_session::pallet::Error<T>
   **/
  PalletSessionError: {
    _enum: ['InvalidProof', 'NoAssociatedValidatorId', 'DuplicatedKey', 'NoKeys', 'NoAccount']
  },
  /**
   * Lookup194: pallet_balances::BalanceLock<Balance>
   **/
  PalletBalancesBalanceLock: {
    id: '[u8;8]',
    amount: 'u128',
    reasons: 'PalletBalancesReasons'
  },
  /**
   * Lookup195: pallet_balances::Reasons
   **/
  PalletBalancesReasons: {
    _enum: ['Fee', 'Misc', 'All']
  },
  /**
   * Lookup198: pallet_balances::ReserveData<ReserveIdentifier, Balance>
   **/
  PalletBalancesReserveData: {
    id: '[u8;16]',
    amount: 'u128'
  },
  /**
   * Lookup200: pallet_balances::pallet::Call<T, I>
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
   * Lookup203: pallet_balances::pallet::Error<T, I>
   **/
  PalletBalancesError: {
    _enum: ['VestingBalance', 'LiquidityRestrictions', 'InsufficientBalance', 'ExistentialDeposit', 'KeepAlive', 'ExistingVestingSchedule', 'DeadAccount', 'TooManyReserves']
  },
  /**
   * Lookup205: pallet_timestamp::pallet::Call<T>
   **/
  PalletTimestampCall: {
    _enum: {
      set: {
        now: 'Compact<u64>'
      }
    }
  },
  /**
   * Lookup207: pallet_transaction_payment::Releases
   **/
  PalletTransactionPaymentReleases: {
    _enum: ['V1Ancient', 'V2']
  },
  /**
   * Lookup208: pallet_treasury::Proposal<sp_core::crypto::AccountId32, Balance>
   **/
  PalletTreasuryProposal: {
    proposer: 'AccountId32',
    value: 'u128',
    beneficiary: 'AccountId32',
    bond: 'u128'
  },
  /**
   * Lookup210: pallet_treasury::pallet::Call<T, I>
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
   * Lookup212: frame_support::PalletId
   **/
  FrameSupportPalletId: '[u8;8]',
  /**
   * Lookup213: pallet_treasury::pallet::Error<T, I>
   **/
  PalletTreasuryError: {
    _enum: ['InsufficientProposersBalance', 'InvalidIndex', 'TooManyApprovals', 'InsufficientPermission', 'ProposalNotApproved']
  },
  /**
   * Lookup214: pallet_sudo::pallet::Call<T>
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
   * Lookup216: orml_vesting::module::Call<T>
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
   * Lookup218: orml_xtokens::module::Call<T>
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
   * Lookup219: xcm::VersionedMultiAsset
   **/
  XcmVersionedMultiAsset: {
    _enum: {
      V0: 'XcmV0MultiAsset',
      V1: 'XcmV1MultiAsset'
    }
  },
  /**
   * Lookup222: orml_tokens::module::Call<T>
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
   * Lookup223: pallet_identity::pallet::Call<T>
   **/
  PalletIdentityCall: {
    _enum: {
      add_registrar: {
        account: 'MultiAddress',
      },
      set_identity: {
        info: 'PalletIdentityIdentityInfo',
      },
      set_subs: {
        subs: 'Vec<(AccountId32,Data)>',
      },
      clear_identity: 'Null',
      request_judgement: {
        regIndex: 'Compact<u32>',
        maxFee: 'Compact<u128>',
      },
      cancel_request: {
        regIndex: 'u32',
      },
      set_fee: {
        index: 'Compact<u32>',
        fee: 'Compact<u128>',
      },
      set_account_id: {
        _alias: {
          new_: 'new',
        },
        index: 'Compact<u32>',
        new_: 'MultiAddress',
      },
      set_fields: {
        index: 'Compact<u32>',
        fields: 'PalletIdentityBitFlags',
      },
      provide_judgement: {
        regIndex: 'Compact<u32>',
        target: 'MultiAddress',
        judgement: 'PalletIdentityJudgement',
        identity: 'H256',
      },
      kill_identity: {
        target: 'MultiAddress',
      },
      add_sub: {
        sub: 'MultiAddress',
        data: 'Data',
      },
      rename_sub: {
        sub: 'MultiAddress',
        data: 'Data',
      },
      remove_sub: {
        sub: 'MultiAddress',
      },
      quit_sub: 'Null',
      force_insert_identities: {
        identities: 'Vec<(AccountId32,PalletIdentityRegistration)>',
      },
      force_remove_identities: {
        identities: 'Vec<AccountId32>',
      },
      force_set_subs: {
        subs: 'Vec<(AccountId32,(u128,Vec<(AccountId32,Data)>))>'
      }
    }
  },
  /**
   * Lookup224: pallet_identity::types::IdentityInfo<FieldLimit>
   **/
  PalletIdentityIdentityInfo: {
    additional: 'Vec<(Data,Data)>',
    display: 'Data',
    legal: 'Data',
    web: 'Data',
    riot: 'Data',
    email: 'Data',
    pgpFingerprint: 'Option<[u8;20]>',
    image: 'Data',
    twitter: 'Data'
  },
  /**
   * Lookup260: pallet_identity::types::BitFlags<pallet_identity::types::IdentityField>
   **/
  PalletIdentityBitFlags: {
    _bitLength: 64,
    Display: 1,
    Legal: 2,
    Web: 4,
    Riot: 8,
    Email: 16,
    PgpFingerprint: 32,
    Image: 64,
    Twitter: 128
  },
  /**
   * Lookup261: pallet_identity::types::IdentityField
   **/
  PalletIdentityIdentityField: {
    _enum: ['__Unused0', 'Display', 'Legal', '__Unused3', 'Web', '__Unused5', '__Unused6', '__Unused7', 'Riot', '__Unused9', '__Unused10', '__Unused11', '__Unused12', '__Unused13', '__Unused14', '__Unused15', 'Email', '__Unused17', '__Unused18', '__Unused19', '__Unused20', '__Unused21', '__Unused22', '__Unused23', '__Unused24', '__Unused25', '__Unused26', '__Unused27', '__Unused28', '__Unused29', '__Unused30', '__Unused31', 'PgpFingerprint', '__Unused33', '__Unused34', '__Unused35', '__Unused36', '__Unused37', '__Unused38', '__Unused39', '__Unused40', '__Unused41', '__Unused42', '__Unused43', '__Unused44', '__Unused45', '__Unused46', '__Unused47', '__Unused48', '__Unused49', '__Unused50', '__Unused51', '__Unused52', '__Unused53', '__Unused54', '__Unused55', '__Unused56', '__Unused57', '__Unused58', '__Unused59', '__Unused60', '__Unused61', '__Unused62', '__Unused63', 'Image', '__Unused65', '__Unused66', '__Unused67', '__Unused68', '__Unused69', '__Unused70', '__Unused71', '__Unused72', '__Unused73', '__Unused74', '__Unused75', '__Unused76', '__Unused77', '__Unused78', '__Unused79', '__Unused80', '__Unused81', '__Unused82', '__Unused83', '__Unused84', '__Unused85', '__Unused86', '__Unused87', '__Unused88', '__Unused89', '__Unused90', '__Unused91', '__Unused92', '__Unused93', '__Unused94', '__Unused95', '__Unused96', '__Unused97', '__Unused98', '__Unused99', '__Unused100', '__Unused101', '__Unused102', '__Unused103', '__Unused104', '__Unused105', '__Unused106', '__Unused107', '__Unused108', '__Unused109', '__Unused110', '__Unused111', '__Unused112', '__Unused113', '__Unused114', '__Unused115', '__Unused116', '__Unused117', '__Unused118', '__Unused119', '__Unused120', '__Unused121', '__Unused122', '__Unused123', '__Unused124', '__Unused125', '__Unused126', '__Unused127', 'Twitter']
  },
  /**
   * Lookup262: pallet_identity::types::Judgement<Balance>
   **/
  PalletIdentityJudgement: {
    _enum: {
      Unknown: 'Null',
      FeePaid: 'u128',
      Reasonable: 'Null',
      KnownGood: 'Null',
      OutOfDate: 'Null',
      LowQuality: 'Null',
      Erroneous: 'Null'
    }
  },
  /**
   * Lookup265: pallet_identity::types::Registration<Balance, MaxJudgements, MaxAdditionalFields>
   **/
  PalletIdentityRegistration: {
    judgements: 'Vec<(u32,PalletIdentityJudgement)>',
    deposit: 'u128',
    info: 'PalletIdentityIdentityInfo'
  },
  /**
   * Lookup273: pallet_preimage::pallet::Call<T>
   **/
  PalletPreimageCall: {
    _enum: {
      note_preimage: {
        bytes: 'Bytes',
      },
      unnote_preimage: {
        _alias: {
          hash_: 'hash',
        },
        hash_: 'H256',
      },
      request_preimage: {
        _alias: {
          hash_: 'hash',
        },
        hash_: 'H256',
      },
      unrequest_preimage: {
        _alias: {
          hash_: 'hash',
        },
        hash_: 'H256'
      }
    }
  },
  /**
   * Lookup274: cumulus_pallet_xcmp_queue::pallet::Call<T>
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
   * Lookup275: pallet_xcm::pallet::Call<T>
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
   * Lookup276: xcm::VersionedXcm<RuntimeCall>
   **/
  XcmVersionedXcm: {
    _enum: {
      V0: 'XcmV0Xcm',
      V1: 'XcmV1Xcm',
      V2: 'XcmV2Xcm'
    }
  },
  /**
   * Lookup277: xcm::v0::Xcm<RuntimeCall>
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
   * Lookup279: xcm::v0::order::Order<RuntimeCall>
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
   * Lookup281: xcm::v0::Response
   **/
  XcmV0Response: {
    _enum: {
      Assets: 'Vec<XcmV0MultiAsset>'
    }
  },
  /**
   * Lookup282: xcm::v1::Xcm<RuntimeCall>
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
   * Lookup284: xcm::v1::order::Order<RuntimeCall>
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
   * Lookup286: xcm::v1::Response
   **/
  XcmV1Response: {
    _enum: {
      Assets: 'XcmV1MultiassetMultiAssets',
      Version: 'u32'
    }
  },
  /**
   * Lookup300: cumulus_pallet_xcm::pallet::Call<T>
   **/
  CumulusPalletXcmCall: 'Null',
  /**
   * Lookup301: cumulus_pallet_dmp_queue::pallet::Call<T>
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
   * Lookup302: pallet_inflation::pallet::Call<T>
   **/
  PalletInflationCall: {
    _enum: {
      start_inflation: {
        inflationStartRelayBlock: 'u32'
      }
    }
  },
  /**
   * Lookup303: pallet_unique::Call<T>
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
      approve_from: {
        from: 'PalletEvmAccountBasicCrossAccountIdRepr',
        to: 'PalletEvmAccountBasicCrossAccountIdRepr',
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
   * Lookup308: up_data_structs::CollectionMode
   **/
  UpDataStructsCollectionMode: {
    _enum: {
      NFT: 'Null',
      Fungible: 'u8',
      ReFungible: 'Null'
    }
  },
  /**
   * Lookup309: up_data_structs::CreateCollectionData<sp_core::crypto::AccountId32>
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
   * Lookup311: up_data_structs::AccessMode
   **/
  UpDataStructsAccessMode: {
    _enum: ['Normal', 'AllowList']
  },
  /**
   * Lookup313: up_data_structs::CollectionLimits
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
   * Lookup315: up_data_structs::SponsoringRateLimit
   **/
  UpDataStructsSponsoringRateLimit: {
    _enum: {
      SponsoringDisabled: 'Null',
      Blocks: 'u32'
    }
  },
  /**
   * Lookup318: up_data_structs::CollectionPermissions
   **/
  UpDataStructsCollectionPermissions: {
    access: 'Option<UpDataStructsAccessMode>',
    mintMode: 'Option<bool>',
    nesting: 'Option<UpDataStructsNestingPermissions>'
  },
  /**
   * Lookup320: up_data_structs::NestingPermissions
   **/
  UpDataStructsNestingPermissions: {
    tokenOwner: 'bool',
    collectionAdmin: 'bool',
    restricted: 'Option<UpDataStructsOwnerRestrictedSet>'
  },
  /**
   * Lookup322: up_data_structs::OwnerRestrictedSet
   **/
  UpDataStructsOwnerRestrictedSet: 'BTreeSet<u32>',
  /**
   * Lookup327: up_data_structs::PropertyKeyPermission
   **/
  UpDataStructsPropertyKeyPermission: {
    key: 'Bytes',
    permission: 'UpDataStructsPropertyPermission'
  },
  /**
   * Lookup328: up_data_structs::PropertyPermission
   **/
  UpDataStructsPropertyPermission: {
    mutable: 'bool',
    collectionAdmin: 'bool',
    tokenOwner: 'bool'
  },
  /**
   * Lookup331: up_data_structs::Property
   **/
  UpDataStructsProperty: {
    key: 'Bytes',
    value: 'Bytes'
  },
  /**
   * Lookup334: up_data_structs::CreateItemData
   **/
  UpDataStructsCreateItemData: {
    _enum: {
      NFT: 'UpDataStructsCreateNftData',
      Fungible: 'UpDataStructsCreateFungibleData',
      ReFungible: 'UpDataStructsCreateReFungibleData'
    }
  },
  /**
   * Lookup335: up_data_structs::CreateNftData
   **/
  UpDataStructsCreateNftData: {
    properties: 'Vec<UpDataStructsProperty>'
  },
  /**
   * Lookup336: up_data_structs::CreateFungibleData
   **/
  UpDataStructsCreateFungibleData: {
    value: 'u128'
  },
  /**
   * Lookup337: up_data_structs::CreateReFungibleData
   **/
  UpDataStructsCreateReFungibleData: {
    pieces: 'u128',
    properties: 'Vec<UpDataStructsProperty>'
  },
  /**
   * Lookup340: up_data_structs::CreateItemExData<pallet_evm::account::BasicCrossAccountIdRepr<sp_core::crypto::AccountId32>>
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
   * Lookup342: up_data_structs::CreateNftExData<pallet_evm::account::BasicCrossAccountIdRepr<sp_core::crypto::AccountId32>>
   **/
  UpDataStructsCreateNftExData: {
    properties: 'Vec<UpDataStructsProperty>',
    owner: 'PalletEvmAccountBasicCrossAccountIdRepr'
  },
  /**
   * Lookup349: up_data_structs::CreateRefungibleExSingleOwner<pallet_evm::account::BasicCrossAccountIdRepr<sp_core::crypto::AccountId32>>
   **/
  UpDataStructsCreateRefungibleExSingleOwner: {
    user: 'PalletEvmAccountBasicCrossAccountIdRepr',
    pieces: 'u128',
    properties: 'Vec<UpDataStructsProperty>'
  },
  /**
   * Lookup351: up_data_structs::CreateRefungibleExMultipleOwners<pallet_evm::account::BasicCrossAccountIdRepr<sp_core::crypto::AccountId32>>
   **/
  UpDataStructsCreateRefungibleExMultipleOwners: {
    users: 'BTreeMap<PalletEvmAccountBasicCrossAccountIdRepr, u128>',
    properties: 'Vec<UpDataStructsProperty>'
  },
  /**
   * Lookup352: pallet_configuration::pallet::Call<T>
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
        configuration: 'PalletConfigurationAppPromotionConfiguration',
      },
      set_collator_selection_desired_collators: {
        max: 'Option<u32>',
      },
      set_collator_selection_license_bond: {
        amount: 'Option<u128>',
      },
      set_collator_selection_kick_threshold: {
        threshold: 'Option<u32>'
      }
    }
  },
  /**
   * Lookup357: pallet_configuration::AppPromotionConfiguration<BlockNumber>
   **/
  PalletConfigurationAppPromotionConfiguration: {
    recalculationInterval: 'Option<u32>',
    pendingInterval: 'Option<u32>',
    intervalIncome: 'Option<Perbill>',
    maxStakersPerCalculation: 'Option<u8>'
  },
  /**
   * Lookup361: pallet_template_transaction_payment::Call<T>
   **/
  PalletTemplateTransactionPaymentCall: 'Null',
  /**
   * Lookup362: pallet_structure::pallet::Call<T>
   **/
  PalletStructureCall: 'Null',
  /**
   * Lookup363: pallet_app_promotion::pallet::Call<T>
   **/
  PalletAppPromotionCall: {
    _enum: {
      set_admin_address: {
        admin: 'PalletEvmAccountBasicCrossAccountIdRepr',
      },
      stake: {
        amount: 'u128',
      },
      unstake_all: 'Null',
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
        stakersNumber: 'Option<u8>',
      },
      unstake_partial: {
        amount: 'u128'
      }
    }
  },
  /**
   * Lookup364: pallet_foreign_assets::module::Call<T>
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
   * Lookup365: pallet_evm::pallet::Call<T>
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
   * Lookup371: pallet_ethereum::pallet::Call<T>
   **/
  PalletEthereumCall: {
    _enum: {
      transact: {
        transaction: 'EthereumTransactionTransactionV2'
      }
    }
  },
  /**
   * Lookup372: ethereum::transaction::TransactionV2
   **/
  EthereumTransactionTransactionV2: {
    _enum: {
      Legacy: 'EthereumTransactionLegacyTransaction',
      EIP2930: 'EthereumTransactionEip2930Transaction',
      EIP1559: 'EthereumTransactionEip1559Transaction'
    }
  },
  /**
   * Lookup373: ethereum::transaction::LegacyTransaction
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
   * Lookup374: ethereum::transaction::TransactionAction
   **/
  EthereumTransactionTransactionAction: {
    _enum: {
      Call: 'H160',
      Create: 'Null'
    }
  },
  /**
   * Lookup375: ethereum::transaction::TransactionSignature
   **/
  EthereumTransactionTransactionSignature: {
    v: 'u64',
    r: 'H256',
    s: 'H256'
  },
  /**
   * Lookup377: ethereum::transaction::EIP2930Transaction
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
   * Lookup379: ethereum::transaction::AccessListItem
   **/
  EthereumTransactionAccessListItem: {
    address: 'H160',
    storageKeys: 'Vec<H256>'
  },
  /**
   * Lookup380: ethereum::transaction::EIP1559Transaction
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
   * Lookup381: pallet_evm_migration::pallet::Call<T>
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
        events: 'Vec<Bytes>',
      },
      remove_rmrk_data: 'Null'
    }
  },
  /**
   * Lookup385: pallet_maintenance::pallet::Call<T>
   **/
  PalletMaintenanceCall: {
    _enum: {
      enable: 'Null',
      disable: 'Null',
      execute_preimage: {
        _alias: {
          hash_: 'hash',
        },
        hash_: 'H256',
        weightBound: 'SpWeightsWeightV2Weight'
      }
    }
  },
  /**
   * Lookup386: pallet_test_utils::pallet::Call<T>
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
   * Lookup388: pallet_sudo::pallet::Error<T>
   **/
  PalletSudoError: {
    _enum: ['RequireSudo']
  },
  /**
   * Lookup390: orml_vesting::module::Error<T>
   **/
  OrmlVestingModuleError: {
    _enum: ['ZeroVestingPeriod', 'ZeroVestingPeriodCount', 'InsufficientBalanceToLock', 'TooManyVestingSchedules', 'AmountLow', 'MaxVestingSchedulesExceeded']
  },
  /**
   * Lookup391: orml_xtokens::module::Error<T>
   **/
  OrmlXtokensModuleError: {
    _enum: ['AssetHasNoReserve', 'NotCrossChainTransfer', 'InvalidDest', 'NotCrossChainTransferableCurrency', 'UnweighableMessage', 'XcmExecutionFailed', 'CannotReanchor', 'InvalidAncestry', 'InvalidAsset', 'DestinationNotInvertible', 'BadVersion', 'DistinctReserveForAssetAndFee', 'ZeroFee', 'ZeroAmount', 'TooManyAssetsBeingSent', 'AssetIndexNonExistent', 'FeeNotEnough', 'NotSupportedMultiLocation', 'MinXcmFeeNotDefined']
  },
  /**
   * Lookup394: orml_tokens::BalanceLock<Balance>
   **/
  OrmlTokensBalanceLock: {
    id: '[u8;8]',
    amount: 'u128'
  },
  /**
   * Lookup396: orml_tokens::AccountData<Balance>
   **/
  OrmlTokensAccountData: {
    free: 'u128',
    reserved: 'u128',
    frozen: 'u128'
  },
  /**
   * Lookup398: orml_tokens::ReserveData<ReserveIdentifier, Balance>
   **/
  OrmlTokensReserveData: {
    id: 'Null',
    amount: 'u128'
  },
  /**
   * Lookup400: orml_tokens::module::Error<T>
   **/
  OrmlTokensModuleError: {
    _enum: ['BalanceTooLow', 'AmountIntoBalanceFailed', 'LiquidityRestrictions', 'MaxLocksExceeded', 'KeepAlive', 'ExistentialDeposit', 'DeadAccount', 'TooManyReserves']
  },
  /**
   * Lookup405: pallet_identity::types::RegistrarInfo<Balance, sp_core::crypto::AccountId32>
   **/
  PalletIdentityRegistrarInfo: {
    account: 'AccountId32',
    fee: 'u128',
    fields: 'PalletIdentityBitFlags'
  },
  /**
   * Lookup407: pallet_identity::pallet::Error<T>
   **/
  PalletIdentityError: {
    _enum: ['TooManySubAccounts', 'NotFound', 'NotNamed', 'EmptyIndex', 'FeeChanged', 'NoIdentity', 'StickyJudgement', 'JudgementGiven', 'InvalidJudgement', 'InvalidIndex', 'InvalidTarget', 'TooManyFields', 'TooManyRegistrars', 'AlreadyClaimed', 'NotSub', 'NotOwned', 'JudgementForDifferentIdentity', 'JudgementPaymentFailed']
  },
  /**
   * Lookup408: pallet_preimage::RequestStatus<sp_core::crypto::AccountId32, Balance>
   **/
  PalletPreimageRequestStatus: {
    _enum: {
      Unrequested: {
        deposit: '(AccountId32,u128)',
        len: 'u32',
      },
      Requested: {
        deposit: 'Option<(AccountId32,u128)>',
        count: 'u32',
        len: 'Option<u32>'
      }
    }
  },
  /**
   * Lookup413: pallet_preimage::pallet::Error<T>
   **/
  PalletPreimageError: {
    _enum: ['TooBig', 'AlreadyNoted', 'NotAuthorized', 'NotNoted', 'Requested', 'NotRequested']
  },
  /**
   * Lookup415: cumulus_pallet_xcmp_queue::InboundChannelDetails
   **/
  CumulusPalletXcmpQueueInboundChannelDetails: {
    sender: 'u32',
    state: 'CumulusPalletXcmpQueueInboundState',
    messageMetadata: 'Vec<(u32,PolkadotParachainPrimitivesXcmpMessageFormat)>'
  },
  /**
   * Lookup416: cumulus_pallet_xcmp_queue::InboundState
   **/
  CumulusPalletXcmpQueueInboundState: {
    _enum: ['Ok', 'Suspended']
  },
  /**
   * Lookup419: polkadot_parachain::primitives::XcmpMessageFormat
   **/
  PolkadotParachainPrimitivesXcmpMessageFormat: {
    _enum: ['ConcatenatedVersionedXcm', 'ConcatenatedEncodedBlob', 'Signals']
  },
  /**
   * Lookup422: cumulus_pallet_xcmp_queue::OutboundChannelDetails
   **/
  CumulusPalletXcmpQueueOutboundChannelDetails: {
    recipient: 'u32',
    state: 'CumulusPalletXcmpQueueOutboundState',
    signalsExist: 'bool',
    firstIndex: 'u16',
    lastIndex: 'u16'
  },
  /**
   * Lookup423: cumulus_pallet_xcmp_queue::OutboundState
   **/
  CumulusPalletXcmpQueueOutboundState: {
    _enum: ['Ok', 'Suspended']
  },
  /**
   * Lookup425: cumulus_pallet_xcmp_queue::QueueConfigData
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
   * Lookup427: cumulus_pallet_xcmp_queue::pallet::Error<T>
   **/
  CumulusPalletXcmpQueueError: {
    _enum: ['FailedToSend', 'BadXcmOrigin', 'BadXcm', 'BadOverweightIndex', 'WeightOverLimit']
  },
  /**
   * Lookup428: pallet_xcm::pallet::Error<T>
   **/
  PalletXcmError: {
    _enum: ['Unreachable', 'SendFailure', 'Filtered', 'UnweighableMessage', 'DestinationNotInvertible', 'Empty', 'CannotReanchor', 'TooManyAssets', 'InvalidOrigin', 'BadVersion', 'BadLocation', 'NoSubscription', 'AlreadySubscribed']
  },
  /**
   * Lookup429: cumulus_pallet_xcm::pallet::Error<T>
   **/
  CumulusPalletXcmError: 'Null',
  /**
   * Lookup430: cumulus_pallet_dmp_queue::ConfigData
   **/
  CumulusPalletDmpQueueConfigData: {
    maxIndividual: 'SpWeightsWeightV2Weight'
  },
  /**
   * Lookup431: cumulus_pallet_dmp_queue::PageIndexData
   **/
  CumulusPalletDmpQueuePageIndexData: {
    beginUsed: 'u32',
    endUsed: 'u32',
    overweightCount: 'u64'
  },
  /**
   * Lookup434: cumulus_pallet_dmp_queue::pallet::Error<T>
   **/
  CumulusPalletDmpQueueError: {
    _enum: ['Unknown', 'OverLimit']
  },
  /**
   * Lookup438: pallet_unique::Error<T>
   **/
  PalletUniqueError: {
    _enum: ['CollectionDecimalPointLimitExceeded', 'EmptyArgument', 'RepartitionCalledOnNonRefungibleCollection']
  },
  /**
   * Lookup439: pallet_configuration::pallet::Error<T>
   **/
  PalletConfigurationError: {
    _enum: ['InconsistentConfiguration']
  },
  /**
   * Lookup440: up_data_structs::Collection<sp_core::crypto::AccountId32>
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
   * Lookup441: up_data_structs::SponsorshipState<sp_core::crypto::AccountId32>
   **/
  UpDataStructsSponsorshipStateAccountId32: {
    _enum: {
      Disabled: 'Null',
      Unconfirmed: 'AccountId32',
      Confirmed: 'AccountId32'
    }
  },
  /**
   * Lookup442: up_data_structs::Properties
   **/
  UpDataStructsProperties: {
    map: 'UpDataStructsPropertiesMapBoundedVec',
    consumedSpace: 'u32',
    spaceLimit: 'u32'
  },
  /**
   * Lookup443: up_data_structs::PropertiesMap<sp_core::bounded::bounded_vec::BoundedVec<T, S>>
   **/
  UpDataStructsPropertiesMapBoundedVec: 'BTreeMap<Bytes, Bytes>',
  /**
   * Lookup448: up_data_structs::PropertiesMap<up_data_structs::PropertyPermission>
   **/
  UpDataStructsPropertiesMapPropertyPermission: 'BTreeMap<Bytes, UpDataStructsPropertyPermission>',
  /**
   * Lookup455: up_data_structs::CollectionStats
   **/
  UpDataStructsCollectionStats: {
    created: 'u32',
    destroyed: 'u32',
    alive: 'u32'
  },
  /**
   * Lookup456: up_data_structs::TokenChild
   **/
  UpDataStructsTokenChild: {
    token: 'u32',
    collection: 'u32'
  },
  /**
   * Lookup457: PhantomType::up_data_structs<T>
   **/
  PhantomTypeUpDataStructs: '[(UpDataStructsTokenData,UpDataStructsRpcCollection,UpPovEstimateRpcPovInfo);0]',
  /**
   * Lookup459: up_data_structs::TokenData<pallet_evm::account::BasicCrossAccountIdRepr<sp_core::crypto::AccountId32>>
   **/
  UpDataStructsTokenData: {
    properties: 'Vec<UpDataStructsProperty>',
    owner: 'Option<PalletEvmAccountBasicCrossAccountIdRepr>',
    pieces: 'u128'
  },
  /**
   * Lookup461: up_data_structs::RpcCollection<sp_core::crypto::AccountId32>
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
   * Lookup462: up_data_structs::RpcCollectionFlags
   **/
  UpDataStructsRpcCollectionFlags: {
    foreign: 'bool',
    erc721metadata: 'bool'
  },
  /**
   * Lookup463: up_pov_estimate_rpc::PovInfo
   **/
  UpPovEstimateRpcPovInfo: {
    proofSize: 'u64',
    compactProofSize: 'u64',
    compressedProofSize: 'u64',
    results: 'Vec<Result<Result<Null, SpRuntimeDispatchError>, SpRuntimeTransactionValidityTransactionValidityError>>',
    keyValues: 'Vec<UpPovEstimateRpcTrieKeyValue>'
  },
  /**
   * Lookup466: sp_runtime::transaction_validity::TransactionValidityError
   **/
  SpRuntimeTransactionValidityTransactionValidityError: {
    _enum: {
      Invalid: 'SpRuntimeTransactionValidityInvalidTransaction',
      Unknown: 'SpRuntimeTransactionValidityUnknownTransaction'
    }
  },
  /**
   * Lookup467: sp_runtime::transaction_validity::InvalidTransaction
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
   * Lookup468: sp_runtime::transaction_validity::UnknownTransaction
   **/
  SpRuntimeTransactionValidityUnknownTransaction: {
    _enum: {
      CannotLookup: 'Null',
      NoUnsignedValidator: 'Null',
      Custom: 'u8'
    }
  },
  /**
   * Lookup470: up_pov_estimate_rpc::TrieKeyValue
   **/
  UpPovEstimateRpcTrieKeyValue: {
    key: 'Bytes',
    value: 'Bytes'
  },
  /**
   * Lookup472: pallet_common::pallet::Error<T>
   **/
  PalletCommonError: {
    _enum: ['CollectionNotFound', 'MustBeTokenOwner', 'NoPermission', 'CantDestroyNotEmptyCollection', 'PublicMintingNotAllowed', 'AddressNotInAllowlist', 'CollectionNameLimitExceeded', 'CollectionDescriptionLimitExceeded', 'CollectionTokenPrefixLimitExceeded', 'TotalCollectionsLimitExceeded', 'CollectionAdminCountExceeded', 'CollectionLimitBoundsExceeded', 'OwnerPermissionsCantBeReverted', 'TransferNotAllowed', 'AccountTokenLimitExceeded', 'CollectionTokenLimitExceeded', 'MetadataFlagFrozen', 'TokenNotFound', 'TokenValueTooLow', 'ApprovedValueTooLow', 'CantApproveMoreThanOwned', 'AddressIsNotEthMirror', 'AddressIsZero', 'UnsupportedOperation', 'NotSufficientFounds', 'UserIsNotAllowedToNest', 'SourceCollectionIsNotAllowedToNest', 'CollectionFieldSizeExceeded', 'NoSpaceForProperty', 'PropertyLimitReached', 'PropertyKeyIsTooLong', 'InvalidCharacterInPropertyKey', 'EmptyPropertyKey', 'CollectionIsExternal', 'CollectionIsInternal', 'ConfirmSponsorshipFail', 'UserIsNotCollectionAdmin']
  },
  /**
   * Lookup474: pallet_fungible::pallet::Error<T>
   **/
  PalletFungibleError: {
    _enum: ['NotFungibleDataUsedToMintFungibleCollectionToken', 'FungibleItemsHaveNoId', 'FungibleItemsDontHaveData', 'FungibleDisallowsNesting', 'SettingPropertiesNotAllowed', 'SettingAllowanceForAllNotAllowed', 'FungibleTokensAreAlwaysValid']
  },
  /**
   * Lookup478: pallet_refungible::pallet::Error<T>
   **/
  PalletRefungibleError: {
    _enum: ['NotRefungibleDataUsedToMintFungibleCollectionToken', 'WrongRefungiblePieces', 'RepartitionWhileNotOwningAllPieces', 'RefungibleDisallowsNesting', 'SettingPropertiesNotAllowed']
  },
  /**
   * Lookup479: pallet_nonfungible::ItemData<pallet_evm::account::BasicCrossAccountIdRepr<sp_core::crypto::AccountId32>>
   **/
  PalletNonfungibleItemData: {
    owner: 'PalletEvmAccountBasicCrossAccountIdRepr'
  },
  /**
   * Lookup481: up_data_structs::PropertyScope
   **/
  UpDataStructsPropertyScope: {
    _enum: ['None', 'Rmrk']
  },
  /**
   * Lookup484: pallet_nonfungible::pallet::Error<T>
   **/
  PalletNonfungibleError: {
    _enum: ['NotNonfungibleDataUsedToMintFungibleCollectionToken', 'NonfungibleItemsHaveNoAmount', 'CantBurnNftWithChildren']
  },
  /**
   * Lookup485: pallet_structure::pallet::Error<T>
   **/
  PalletStructureError: {
    _enum: ['OuroborosDetected', 'DepthLimit', 'BreadthLimit', 'TokenNotFound', 'CantNestTokenUnderCollection']
  },
  /**
   * Lookup490: pallet_app_promotion::pallet::Error<T>
   **/
  PalletAppPromotionError: {
    _enum: ['AdminNotSet', 'NoPermission', 'NotSufficientFunds', 'PendingForBlockOverflow', 'SponsorNotSet', 'IncorrectLockedBalanceOperation', 'InsufficientStakedBalance']
  },
  /**
   * Lookup491: pallet_foreign_assets::module::Error<T>
   **/
  PalletForeignAssetsModuleError: {
    _enum: ['BadLocation', 'MultiLocationExisted', 'AssetIdNotExists', 'AssetIdExisted']
  },
  /**
   * Lookup493: pallet_evm::pallet::Error<T>
   **/
  PalletEvmError: {
    _enum: ['BalanceLow', 'FeeOverflow', 'PaymentOverflow', 'WithdrawFailed', 'GasPriceTooLow', 'InvalidNonce', 'GasLimitTooLow', 'GasLimitTooHigh', 'Undefined', 'Reentrancy', 'TransactionMustComeFromEOA']
  },
  /**
   * Lookup496: fp_rpc::TransactionStatus
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
   * Lookup498: ethbloom::Bloom
   **/
  EthbloomBloom: '[u8;256]',
  /**
   * Lookup500: ethereum::receipt::ReceiptV3
   **/
  EthereumReceiptReceiptV3: {
    _enum: {
      Legacy: 'EthereumReceiptEip658ReceiptData',
      EIP2930: 'EthereumReceiptEip658ReceiptData',
      EIP1559: 'EthereumReceiptEip658ReceiptData'
    }
  },
  /**
   * Lookup501: ethereum::receipt::EIP658ReceiptData
   **/
  EthereumReceiptEip658ReceiptData: {
    statusCode: 'u8',
    usedGas: 'U256',
    logsBloom: 'EthbloomBloom',
    logs: 'Vec<EthereumLog>'
  },
  /**
   * Lookup502: ethereum::block::Block<ethereum::transaction::TransactionV2>
   **/
  EthereumBlock: {
    header: 'EthereumHeader',
    transactions: 'Vec<EthereumTransactionTransactionV2>',
    ommers: 'Vec<EthereumHeader>'
  },
  /**
   * Lookup503: ethereum::header::Header
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
   * Lookup504: ethereum_types::hash::H64
   **/
  EthereumTypesHashH64: '[u8;8]',
  /**
   * Lookup509: pallet_ethereum::pallet::Error<T>
   **/
  PalletEthereumError: {
    _enum: ['InvalidSignature', 'PreLogExists']
  },
  /**
   * Lookup510: pallet_evm_coder_substrate::pallet::Error<T>
   **/
  PalletEvmCoderSubstrateError: {
    _enum: ['OutOfGas', 'OutOfFund']
  },
  /**
   * Lookup511: up_data_structs::SponsorshipState<pallet_evm::account::BasicCrossAccountIdRepr<sp_core::crypto::AccountId32>>
   **/
  UpDataStructsSponsorshipStateBasicCrossAccountIdRepr: {
    _enum: {
      Disabled: 'Null',
      Unconfirmed: 'PalletEvmAccountBasicCrossAccountIdRepr',
      Confirmed: 'PalletEvmAccountBasicCrossAccountIdRepr'
    }
  },
  /**
   * Lookup512: pallet_evm_contract_helpers::SponsoringModeT
   **/
  PalletEvmContractHelpersSponsoringModeT: {
    _enum: ['Disabled', 'Allowlisted', 'Generous']
  },
  /**
   * Lookup518: pallet_evm_contract_helpers::pallet::Error<T>
   **/
  PalletEvmContractHelpersError: {
    _enum: ['NoPermission', 'NoPendingSponsor', 'TooManyMethodsHaveSponsoredLimit']
  },
  /**
   * Lookup519: pallet_evm_migration::pallet::Error<T>
   **/
  PalletEvmMigrationError: {
    _enum: ['AccountNotEmpty', 'AccountIsNotMigrating', 'BadEvent']
  },
  /**
   * Lookup520: pallet_maintenance::pallet::Error<T>
   **/
  PalletMaintenanceError: 'Null',
  /**
   * Lookup521: pallet_test_utils::pallet::Error<T>
   **/
  PalletTestUtilsError: {
    _enum: ['TestPalletDisabled', 'TriggerRollback']
  },
  /**
   * Lookup523: sp_runtime::MultiSignature
   **/
  SpRuntimeMultiSignature: {
    _enum: {
      Ed25519: 'SpCoreEd25519Signature',
      Sr25519: 'SpCoreSr25519Signature',
      Ecdsa: 'SpCoreEcdsaSignature'
    }
  },
  /**
   * Lookup524: sp_core::ed25519::Signature
   **/
  SpCoreEd25519Signature: '[u8;64]',
  /**
   * Lookup526: sp_core::sr25519::Signature
   **/
  SpCoreSr25519Signature: '[u8;64]',
  /**
   * Lookup527: sp_core::ecdsa::Signature
   **/
  SpCoreEcdsaSignature: '[u8;65]',
  /**
   * Lookup530: frame_system::extensions::check_spec_version::CheckSpecVersion<T>
   **/
  FrameSystemExtensionsCheckSpecVersion: 'Null',
  /**
   * Lookup531: frame_system::extensions::check_tx_version::CheckTxVersion<T>
   **/
  FrameSystemExtensionsCheckTxVersion: 'Null',
  /**
   * Lookup532: frame_system::extensions::check_genesis::CheckGenesis<T>
   **/
  FrameSystemExtensionsCheckGenesis: 'Null',
  /**
   * Lookup535: frame_system::extensions::check_nonce::CheckNonce<T>
   **/
  FrameSystemExtensionsCheckNonce: 'Compact<u32>',
  /**
   * Lookup536: frame_system::extensions::check_weight::CheckWeight<T>
   **/
  FrameSystemExtensionsCheckWeight: 'Null',
  /**
   * Lookup537: opal_runtime::runtime_common::maintenance::CheckMaintenance
   **/
  OpalRuntimeRuntimeCommonMaintenanceCheckMaintenance: 'Null',
  /**
   * Lookup538: opal_runtime::runtime_common::identity::DisableIdentityCalls
   **/
  OpalRuntimeRuntimeCommonIdentityDisableIdentityCalls: 'Null',
  /**
   * Lookup539: pallet_template_transaction_payment::ChargeTransactionPayment<opal_runtime::Runtime>
   **/
  PalletTemplateTransactionPaymentChargeTransactionPayment: 'Compact<u128>',
  /**
   * Lookup540: opal_runtime::Runtime
   **/
  OpalRuntimeRuntime: 'Null',
  /**
   * Lookup541: pallet_ethereum::FakeTransactionFinalizer<opal_runtime::Runtime>
   **/
  PalletEthereumFakeTransactionFinalizer: 'Null'
};
