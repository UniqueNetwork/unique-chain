// Auto-generated via `yarn polkadot-types-from-defs`, do not edit
/* eslint-disable */

/* eslint-disable sort-keys */

export default {
  /**
   * Lookup2: polkadot_primitives::v2::PersistedValidationData<primitive_types::H256, N>
   **/
  PolkadotPrimitivesV2PersistedValidationData: {
    parentHead: 'Bytes',
    relayParentNumber: 'u32',
    relayParentStorageRoot: 'H256',
    maxPovSize: 'u32'
  },
  /**
   * Lookup9: polkadot_primitives::v2::UpgradeRestriction
   **/
  PolkadotPrimitivesV2UpgradeRestriction: {
    _enum: ['Present']
  },
  /**
   * Lookup10: sp_trie::storage_proof::StorageProof
   **/
  SpTrieStorageProof: {
    trieNodes: 'BTreeSet<Bytes>'
  },
  /**
   * Lookup13: cumulus_pallet_parachain_system::relay_state_snapshot::MessagingStateSnapshot
   **/
  CumulusPalletParachainSystemRelayStateSnapshotMessagingStateSnapshot: {
    dmqMqcHead: 'H256',
    relayDispatchQueueSize: '(u32,u32)',
    ingressChannels: 'Vec<(u32,PolkadotPrimitivesV2AbridgedHrmpChannel)>',
    egressChannels: 'Vec<(u32,PolkadotPrimitivesV2AbridgedHrmpChannel)>'
  },
  /**
   * Lookup18: polkadot_primitives::v2::AbridgedHrmpChannel
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
   * Lookup20: polkadot_primitives::v2::AbridgedHostConfiguration
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
   * Lookup26: polkadot_core_primitives::OutboundHrmpMessage<polkadot_parachain::primitives::Id>
   **/
  PolkadotCorePrimitivesOutboundHrmpMessage: {
    recipient: 'u32',
    data: 'Bytes'
  },
  /**
   * Lookup28: cumulus_pallet_parachain_system::pallet::Call<T>
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
   * Lookup29: cumulus_primitives_parachain_inherent::ParachainInherentData
   **/
  CumulusPrimitivesParachainInherentParachainInherentData: {
    validationData: 'PolkadotPrimitivesV2PersistedValidationData',
    relayChainState: 'SpTrieStorageProof',
    downwardMessages: 'Vec<PolkadotCorePrimitivesInboundDownwardMessage>',
    horizontalMessages: 'BTreeMap<u32, Vec<PolkadotCorePrimitivesInboundHrmpMessage>>'
  },
  /**
   * Lookup31: polkadot_core_primitives::InboundDownwardMessage<BlockNumber>
   **/
  PolkadotCorePrimitivesInboundDownwardMessage: {
    sentAt: 'u32',
    msg: 'Bytes'
  },
  /**
   * Lookup34: polkadot_core_primitives::InboundHrmpMessage<BlockNumber>
   **/
  PolkadotCorePrimitivesInboundHrmpMessage: {
    sentAt: 'u32',
    data: 'Bytes'
  },
  /**
   * Lookup37: cumulus_pallet_parachain_system::pallet::Event<T>
   **/
  CumulusPalletParachainSystemEvent: {
    _enum: {
      ValidationFunctionStored: 'Null',
      ValidationFunctionApplied: 'u32',
      ValidationFunctionDiscarded: 'Null',
      UpgradeAuthorized: 'H256',
      DownwardMessagesReceived: 'u32',
      DownwardMessagesProcessed: '(u64,H256)'
    }
  },
  /**
   * Lookup38: cumulus_pallet_parachain_system::pallet::Error<T>
   **/
  CumulusPalletParachainSystemError: {
    _enum: ['OverlappingUpgrades', 'ProhibitedByPolkadot', 'TooBig', 'ValidationDataNotAvailable', 'HostConfigurationNotAvailable', 'NotScheduled', 'NothingAuthorized', 'Unauthorized']
  },
  /**
   * Lookup41: pallet_balances::AccountData<Balance>
   **/
  PalletBalancesAccountData: {
    free: 'u128',
    reserved: 'u128',
    miscFrozen: 'u128',
    feeFrozen: 'u128'
  },
  /**
   * Lookup43: pallet_balances::BalanceLock<Balance>
   **/
  PalletBalancesBalanceLock: {
    id: '[u8;8]',
    amount: 'u128',
    reasons: 'PalletBalancesReasons'
  },
  /**
   * Lookup45: pallet_balances::Reasons
   **/
  PalletBalancesReasons: {
    _enum: ['Fee', 'Misc', 'All']
  },
  /**
   * Lookup48: pallet_balances::ReserveData<ReserveIdentifier, Balance>
   **/
  PalletBalancesReserveData: {
    id: '[u8;8]',
    amount: 'u128'
  },
  /**
   * Lookup50: pallet_balances::Releases
   **/
  PalletBalancesReleases: {
    _enum: ['V1_0_0', 'V2_0_0']
  },
  /**
   * Lookup51: pallet_balances::pallet::Call<T, I>
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
   * Lookup57: pallet_balances::pallet::Event<T, I>
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
   * Lookup58: frame_support::traits::tokens::misc::BalanceStatus
   **/
  FrameSupportTokensMiscBalanceStatus: {
    _enum: ['Free', 'Reserved']
  },
  /**
   * Lookup59: pallet_balances::pallet::Error<T, I>
   **/
  PalletBalancesError: {
    _enum: ['VestingBalance', 'LiquidityRestrictions', 'InsufficientBalance', 'ExistentialDeposit', 'KeepAlive', 'ExistingVestingSchedule', 'DeadAccount', 'TooManyReserves']
  },
  /**
   * Lookup62: pallet_timestamp::pallet::Call<T>
   **/
  PalletTimestampCall: {
    _enum: {
      set: {
        now: 'Compact<u64>'
      }
    }
  },
  /**
   * Lookup65: pallet_transaction_payment::Releases
   **/
  PalletTransactionPaymentReleases: {
    _enum: ['V1Ancient', 'V2']
  },
  /**
   * Lookup67: frame_support::weights::WeightToFeeCoefficient<Balance>
   **/
  FrameSupportWeightsWeightToFeeCoefficient: {
    coeffInteger: 'u128',
    coeffFrac: 'Perbill',
    negative: 'bool',
    degree: 'u8'
  },
  /**
   * Lookup69: pallet_treasury::Proposal<sp_core::crypto::AccountId32, Balance>
   **/
  PalletTreasuryProposal: {
    proposer: 'AccountId32',
    value: 'u128',
    beneficiary: 'AccountId32',
    bond: 'u128'
  },
  /**
   * Lookup72: pallet_treasury::pallet::Call<T, I>
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
        proposalId: 'Compact<u32>'
      }
    }
  },
  /**
   * Lookup74: pallet_treasury::pallet::Event<T, I>
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
        value: 'u128'
      }
    }
  },
  /**
   * Lookup77: frame_support::PalletId
   **/
  FrameSupportPalletId: '[u8;8]',
  /**
   * Lookup78: pallet_treasury::pallet::Error<T, I>
   **/
  PalletTreasuryError: {
    _enum: ['InsufficientProposersBalance', 'InvalidIndex', 'TooManyApprovals']
  },
  /**
   * Lookup79: pallet_sudo::pallet::Call<T>
   **/
  PalletSudoCall: {
    _enum: {
      sudo: {
        call: 'Call',
      },
      sudo_unchecked_weight: {
        call: 'Call',
        weight: 'u64',
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
   * Lookup81: frame_system::pallet::Call<T>
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
   * Lookup84: orml_vesting::module::Call<T>
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
   * Lookup85: orml_vesting::VestingSchedule<BlockNumber, Balance>
   **/
  OrmlVestingVestingSchedule: {
    start: 'u32',
    period: 'u32',
    periodCount: 'u32',
    perPeriod: 'Compact<u128>'
  },
  /**
   * Lookup87: cumulus_pallet_xcmp_queue::pallet::Call<T>
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
   * Lookup88: pallet_xcm::pallet::Call<T>
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
   * Lookup89: xcm::VersionedMultiLocation
   **/
  XcmVersionedMultiLocation: {
    _enum: {
      V0: 'XcmV0MultiLocation',
      V1: 'XcmV1MultiLocation'
    }
  },
  /**
   * Lookup90: xcm::v0::multi_location::MultiLocation
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
   * Lookup91: xcm::v0::junction::Junction
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
   * Lookup92: xcm::v0::junction::NetworkId
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
   * Lookup93: xcm::v0::junction::BodyId
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
   * Lookup94: xcm::v0::junction::BodyPart
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
   * Lookup95: xcm::v1::multilocation::MultiLocation
   **/
  XcmV1MultiLocation: {
    parents: 'u8',
    interior: 'XcmV1MultilocationJunctions'
  },
  /**
   * Lookup96: xcm::v1::multilocation::Junctions
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
   * Lookup97: xcm::v1::junction::Junction
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
   * Lookup98: xcm::VersionedXcm<Call>
   **/
  XcmVersionedXcm: {
    _enum: {
      V0: 'XcmV0Xcm',
      V1: 'XcmV1Xcm',
      V2: 'XcmV2Xcm'
    }
  },
  /**
   * Lookup99: xcm::v0::Xcm<Call>
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
   * Lookup101: xcm::v0::multi_asset::MultiAsset
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
   * Lookup102: xcm::v1::multiasset::AssetInstance
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
   * Lookup106: xcm::v0::order::Order<Call>
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
   * Lookup108: xcm::v0::Response
   **/
  XcmV0Response: {
    _enum: {
      Assets: 'Vec<XcmV0MultiAsset>'
    }
  },
  /**
   * Lookup109: xcm::v0::OriginKind
   **/
  XcmV0OriginKind: {
    _enum: ['Native', 'SovereignAccount', 'Superuser', 'Xcm']
  },
  /**
   * Lookup110: xcm::double_encoded::DoubleEncoded<T>
   **/
  XcmDoubleEncoded: {
    encoded: 'Bytes'
  },
  /**
   * Lookup111: xcm::v1::Xcm<Call>
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
   * Lookup112: xcm::v1::multiasset::MultiAssets
   **/
  XcmV1MultiassetMultiAssets: 'Vec<XcmV1MultiAsset>',
  /**
   * Lookup114: xcm::v1::multiasset::MultiAsset
   **/
  XcmV1MultiAsset: {
    id: 'XcmV1MultiassetAssetId',
    fun: 'XcmV1MultiassetFungibility'
  },
  /**
   * Lookup115: xcm::v1::multiasset::AssetId
   **/
  XcmV1MultiassetAssetId: {
    _enum: {
      Concrete: 'XcmV1MultiLocation',
      Abstract: 'Bytes'
    }
  },
  /**
   * Lookup116: xcm::v1::multiasset::Fungibility
   **/
  XcmV1MultiassetFungibility: {
    _enum: {
      Fungible: 'Compact<u128>',
      NonFungible: 'XcmV1MultiassetAssetInstance'
    }
  },
  /**
   * Lookup118: xcm::v1::order::Order<Call>
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
   * Lookup119: xcm::v1::multiasset::MultiAssetFilter
   **/
  XcmV1MultiassetMultiAssetFilter: {
    _enum: {
      Definite: 'XcmV1MultiassetMultiAssets',
      Wild: 'XcmV1MultiassetWildMultiAsset'
    }
  },
  /**
   * Lookup120: xcm::v1::multiasset::WildMultiAsset
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
   * Lookup121: xcm::v1::multiasset::WildFungibility
   **/
  XcmV1MultiassetWildFungibility: {
    _enum: ['Fungible', 'NonFungible']
  },
  /**
   * Lookup123: xcm::v1::Response
   **/
  XcmV1Response: {
    _enum: {
      Assets: 'XcmV1MultiassetMultiAssets',
      Version: 'u32'
    }
  },
  /**
   * Lookup124: xcm::v2::Xcm<Call>
   **/
  XcmV2Xcm: 'Vec<XcmV2Instruction>',
  /**
   * Lookup126: xcm::v2::Instruction<Call>
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
   * Lookup127: xcm::v2::Response
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
   * Lookup130: xcm::v2::traits::Error
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
   * Lookup131: xcm::v2::WeightLimit
   **/
  XcmV2WeightLimit: {
    _enum: {
      Unlimited: 'Null',
      Limited: 'Compact<u64>'
    }
  },
  /**
   * Lookup132: xcm::VersionedMultiAssets
   **/
  XcmVersionedMultiAssets: {
    _enum: {
      V0: 'Vec<XcmV0MultiAsset>',
      V1: 'XcmV1MultiassetMultiAssets'
    }
  },
  /**
   * Lookup147: cumulus_pallet_xcm::pallet::Call<T>
   **/
  CumulusPalletXcmCall: 'Null',
  /**
   * Lookup148: cumulus_pallet_dmp_queue::pallet::Call<T>
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
   * Lookup149: pallet_inflation::pallet::Call<T>
   **/
  PalletInflationCall: {
    _enum: {
      start_inflation: {
        inflationStartRelayBlock: 'u32'
      }
    }
  },
  /**
   * Lookup150: pallet_unique::Call<T>
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
      set_property_permissions: {
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
        newLimit: 'UpDataStructsCollectionPermissions'
      }
    }
  },
  /**
   * Lookup156: up_data_structs::CollectionMode
   **/
  UpDataStructsCollectionMode: {
    _enum: {
      NFT: 'Null',
      Fungible: 'u8',
      ReFungible: 'Null'
    }
  },
  /**
   * Lookup157: up_data_structs::CreateCollectionData<sp_core::crypto::AccountId32>
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
   * Lookup159: up_data_structs::AccessMode
   **/
  UpDataStructsAccessMode: {
    _enum: ['Normal', 'AllowList']
  },
  /**
   * Lookup162: up_data_structs::CollectionLimits
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
   * Lookup164: up_data_structs::SponsoringRateLimit
   **/
  UpDataStructsSponsoringRateLimit: {
    _enum: {
      SponsoringDisabled: 'Null',
      Blocks: 'u32'
    }
  },
  /**
   * Lookup167: up_data_structs::CollectionPermissions
   **/
  UpDataStructsCollectionPermissions: {
    access: 'Option<UpDataStructsAccessMode>',
    mintMode: 'Option<bool>',
    nesting: 'Option<UpDataStructsNestingRule>'
  },
  /**
   * Lookup169: up_data_structs::NestingRule
   **/
  UpDataStructsNestingRule: {
    _enum: {
      Disabled: 'Null',
      Owner: 'Null',
      OwnerRestricted: 'BTreeSet<u32>'
    }
  },
  /**
   * Lookup175: up_data_structs::PropertyKeyPermission
   **/
  UpDataStructsPropertyKeyPermission: {
    key: 'Bytes',
    permission: 'UpDataStructsPropertyPermission'
  },
  /**
   * Lookup177: up_data_structs::PropertyPermission
   **/
  UpDataStructsPropertyPermission: {
    mutable: 'bool',
    collectionAdmin: 'bool',
    tokenOwner: 'bool'
  },
  /**
   * Lookup180: up_data_structs::Property
   **/
  UpDataStructsProperty: {
    key: 'Bytes',
    value: 'Bytes'
  },
  /**
   * Lookup183: pallet_evm::account::BasicCrossAccountIdRepr<sp_core::crypto::AccountId32>
   **/
  PalletEvmAccountBasicCrossAccountIdRepr: {
    _enum: {
      Substrate: 'AccountId32',
      Ethereum: 'H160'
    }
  },
  /**
   * Lookup185: up_data_structs::CreateItemData
   **/
  UpDataStructsCreateItemData: {
    _enum: {
      NFT: 'UpDataStructsCreateNftData',
      Fungible: 'UpDataStructsCreateFungibleData',
      ReFungible: 'UpDataStructsCreateReFungibleData'
    }
  },
  /**
   * Lookup186: up_data_structs::CreateNftData
   **/
  UpDataStructsCreateNftData: {
    properties: 'Vec<UpDataStructsProperty>'
  },
  /**
   * Lookup187: up_data_structs::CreateFungibleData
   **/
  UpDataStructsCreateFungibleData: {
    value: 'u128'
  },
  /**
   * Lookup188: up_data_structs::CreateReFungibleData
   **/
  UpDataStructsCreateReFungibleData: {
    constData: 'Bytes',
    pieces: 'u128'
  },
  /**
   * Lookup193: up_data_structs::CreateItemExData<pallet_evm::account::BasicCrossAccountIdRepr<sp_core::crypto::AccountId32>>
   **/
  UpDataStructsCreateItemExData: {
    _enum: {
      NFT: 'Vec<UpDataStructsCreateNftExData>',
      Fungible: 'BTreeMap<PalletEvmAccountBasicCrossAccountIdRepr, u128>',
      RefungibleMultipleItems: 'Vec<UpDataStructsCreateRefungibleExData>',
      RefungibleMultipleOwners: 'UpDataStructsCreateRefungibleExData'
    }
  },
  /**
   * Lookup195: up_data_structs::CreateNftExData<pallet_evm::account::BasicCrossAccountIdRepr<sp_core::crypto::AccountId32>>
   **/
  UpDataStructsCreateNftExData: {
    properties: 'Vec<UpDataStructsProperty>',
    owner: 'PalletEvmAccountBasicCrossAccountIdRepr'
  },
  /**
   * Lookup202: up_data_structs::CreateRefungibleExData<pallet_evm::account::BasicCrossAccountIdRepr<sp_core::crypto::AccountId32>>
   **/
  UpDataStructsCreateRefungibleExData: {
    constData: 'Bytes',
    users: 'BTreeMap<PalletEvmAccountBasicCrossAccountIdRepr, u128>'
  },
  /**
   * Lookup204: pallet_template_transaction_payment::Call<T>
   **/
  PalletTemplateTransactionPaymentCall: 'Null',
  /**
   * Lookup205: pallet_structure::pallet::Call<T>
   **/
  PalletStructureCall: 'Null',
  /**
   * Lookup206: pallet_rmrk_core::pallet::Call<T>
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
        owner: 'AccountId32',
        collectionId: 'u32',
        recipient: 'Option<AccountId32>',
        royaltyAmount: 'Option<Permill>',
        metadata: 'Bytes',
      },
      burn_nft: {
        collectionId: 'u32',
        nftId: 'u32',
      },
      set_property: {
        rmrkCollectionId: 'Compact<u32>',
        maybeNftId: 'Option<u32>',
        key: 'Bytes',
        value: 'Bytes',
      },
      add_basic_resource: {
        collectionId: 'u32',
        nftId: 'u32',
        resource: 'UpDataStructsRmrkBasicResource',
      },
      add_composable_resource: {
        collectionId: 'u32',
        nftId: 'u32',
        resourceId: 'Bytes',
        resource: 'UpDataStructsRmrkComposableResource',
      },
      add_slot_resource: {
        collectionId: 'u32',
        nftId: 'u32',
        resource: 'UpDataStructsRmrkSlotResource'
      }
    }
  },
  /**
   * Lookup212: up_data_structs::rmrk::BasicResource<frame_support::storage::bounded_vec::BoundedVec<T, S>>
   **/
  UpDataStructsRmrkBasicResource: {
    src: 'Option<Bytes>',
    metadata: 'Option<Bytes>',
    license: 'Option<Bytes>',
    thumb: 'Option<Bytes>'
  },
  /**
   * Lookup215: up_data_structs::rmrk::ComposableResource<frame_support::storage::bounded_vec::BoundedVec<T, S>, frame_support::storage::bounded_vec::BoundedVec<T, S>>
   **/
  UpDataStructsRmrkComposableResource: {
    parts: 'Vec<u32>',
    base: 'u32',
    src: 'Option<Bytes>',
    metadata: 'Option<Bytes>',
    license: 'Option<Bytes>',
    thumb: 'Option<Bytes>'
  },
  /**
   * Lookup217: up_data_structs::rmrk::SlotResource<frame_support::storage::bounded_vec::BoundedVec<T, S>>
   **/
  UpDataStructsRmrkSlotResource: {
    base: 'u32',
    src: 'Option<Bytes>',
    metadata: 'Option<Bytes>',
    slot: 'u32',
    license: 'Option<Bytes>',
    thumb: 'Option<Bytes>'
  },
  /**
   * Lookup218: pallet_rmrk_equip::pallet::Call<T>
   **/
  PalletRmrkEquipCall: {
    _enum: {
      create_base: {
        baseType: 'Bytes',
        symbol: 'Bytes',
        parts: 'Vec<UpDataStructsRmrkPartType>',
      },
      theme_add: {
        baseId: 'u32',
        theme: 'UpDataStructsRmrkTheme'
      }
    }
  },
  /**
   * Lookup220: up_data_structs::rmrk::PartType<frame_support::storage::bounded_vec::BoundedVec<T, S>, frame_support::storage::bounded_vec::BoundedVec<T, S>>
   **/
  UpDataStructsRmrkPartType: {
    _enum: {
      FixedPart: 'UpDataStructsRmrkFixedPart',
      SlotPart: 'UpDataStructsRmrkSlotPart'
    }
  },
  /**
   * Lookup222: up_data_structs::rmrk::FixedPart<frame_support::storage::bounded_vec::BoundedVec<T, S>>
   **/
  UpDataStructsRmrkFixedPart: {
    id: 'u32',
    z: 'u32',
    src: 'Bytes'
  },
  /**
   * Lookup223: up_data_structs::rmrk::SlotPart<frame_support::storage::bounded_vec::BoundedVec<T, S>, frame_support::storage::bounded_vec::BoundedVec<T, S>>
   **/
  UpDataStructsRmrkSlotPart: {
    id: 'u32',
    equippable: 'UpDataStructsRmrkEquippableList',
    src: 'Bytes',
    z: 'u32'
  },
  /**
   * Lookup224: up_data_structs::rmrk::EquippableList<frame_support::storage::bounded_vec::BoundedVec<T, S>>
   **/
  UpDataStructsRmrkEquippableList: {
    _enum: {
      All: 'Null',
      Empty: 'Null',
      Custom: 'Vec<u32>'
    }
  },
  /**
   * Lookup226: up_data_structs::rmrk::Theme<frame_support::storage::bounded_vec::BoundedVec<T, S>, PropertyList>
   **/
  UpDataStructsRmrkTheme: {
    name: 'Bytes',
    properties: 'Vec<UpDataStructsRmrkThemeProperty>',
    inherit: 'bool'
  },
  /**
   * Lookup228: up_data_structs::rmrk::ThemeProperty<frame_support::storage::bounded_vec::BoundedVec<T, S>>
   **/
  UpDataStructsRmrkThemeProperty: {
    key: 'Bytes',
    value: 'Bytes'
  },
  /**
   * Lookup229: pallet_evm::pallet::Call<T>
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
   * Lookup235: pallet_ethereum::pallet::Call<T>
   **/
  PalletEthereumCall: {
    _enum: {
      transact: {
        transaction: 'EthereumTransactionTransactionV2'
      }
    }
  },
  /**
   * Lookup236: ethereum::transaction::TransactionV2
   **/
  EthereumTransactionTransactionV2: {
    _enum: {
      Legacy: 'EthereumTransactionLegacyTransaction',
      EIP2930: 'EthereumTransactionEip2930Transaction',
      EIP1559: 'EthereumTransactionEip1559Transaction'
    }
  },
  /**
   * Lookup237: ethereum::transaction::LegacyTransaction
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
   * Lookup238: ethereum::transaction::TransactionAction
   **/
  EthereumTransactionTransactionAction: {
    _enum: {
      Call: 'H160',
      Create: 'Null'
    }
  },
  /**
   * Lookup239: ethereum::transaction::TransactionSignature
   **/
  EthereumTransactionTransactionSignature: {
    v: 'u64',
    r: 'H256',
    s: 'H256'
  },
  /**
   * Lookup241: ethereum::transaction::EIP2930Transaction
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
   * Lookup243: ethereum::transaction::AccessListItem
   **/
  EthereumTransactionAccessListItem: {
    address: 'H160',
    storageKeys: 'Vec<H256>'
  },
  /**
   * Lookup244: ethereum::transaction::EIP1559Transaction
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
   * Lookup245: pallet_evm_migration::pallet::Call<T>
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
        code: 'Bytes'
      }
    }
  },
  /**
   * Lookup248: pallet_sudo::pallet::Event<T>
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
   * Lookup250: sp_runtime::DispatchError
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
   * Lookup251: sp_runtime::ModuleError
   **/
  SpRuntimeModuleError: {
    index: 'u8',
    error: '[u8;4]'
  },
  /**
   * Lookup252: sp_runtime::TokenError
   **/
  SpRuntimeTokenError: {
    _enum: ['NoFunds', 'WouldDie', 'BelowMinimum', 'CannotCreate', 'UnknownAsset', 'Frozen', 'Unsupported']
  },
  /**
   * Lookup253: sp_runtime::ArithmeticError
   **/
  SpRuntimeArithmeticError: {
    _enum: ['Underflow', 'Overflow', 'DivisionByZero']
  },
  /**
   * Lookup254: sp_runtime::TransactionalError
   **/
  SpRuntimeTransactionalError: {
    _enum: ['LimitReached', 'NoLayer']
  },
  /**
   * Lookup255: pallet_sudo::pallet::Error<T>
   **/
  PalletSudoError: {
    _enum: ['RequireSudo']
  },
  /**
   * Lookup256: frame_system::AccountInfo<Index, pallet_balances::AccountData<Balance>>
   **/
  FrameSystemAccountInfo: {
    nonce: 'u32',
    consumers: 'u32',
    providers: 'u32',
    sufficients: 'u32',
    data: 'PalletBalancesAccountData'
  },
  /**
   * Lookup257: frame_support::weights::PerDispatchClass<T>
   **/
  FrameSupportWeightsPerDispatchClassU64: {
    normal: 'u64',
    operational: 'u64',
    mandatory: 'u64'
  },
  /**
   * Lookup258: sp_runtime::generic::digest::Digest
   **/
  SpRuntimeDigest: {
    logs: 'Vec<SpRuntimeDigestDigestItem>'
  },
  /**
   * Lookup260: sp_runtime::generic::digest::DigestItem
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
   * Lookup262: frame_system::EventRecord<opal_runtime::Event, primitive_types::H256>
   **/
  FrameSystemEventRecord: {
    phase: 'FrameSystemPhase',
    event: 'Event',
    topics: 'Vec<H256>'
  },
  /**
   * Lookup264: frame_system::pallet::Event<T>
   **/
  FrameSystemEvent: {
    _enum: {
      ExtrinsicSuccess: {
        dispatchInfo: 'FrameSupportWeightsDispatchInfo',
      },
      ExtrinsicFailed: {
        dispatchError: 'SpRuntimeDispatchError',
        dispatchInfo: 'FrameSupportWeightsDispatchInfo',
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
   * Lookup265: frame_support::weights::DispatchInfo
   **/
  FrameSupportWeightsDispatchInfo: {
    weight: 'u64',
    class: 'FrameSupportWeightsDispatchClass',
    paysFee: 'FrameSupportWeightsPays'
  },
  /**
   * Lookup266: frame_support::weights::DispatchClass
   **/
  FrameSupportWeightsDispatchClass: {
    _enum: ['Normal', 'Operational', 'Mandatory']
  },
  /**
   * Lookup267: frame_support::weights::Pays
   **/
  FrameSupportWeightsPays: {
    _enum: ['Yes', 'No']
  },
  /**
   * Lookup268: orml_vesting::module::Event<T>
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
   * Lookup269: cumulus_pallet_xcmp_queue::pallet::Event<T>
   **/
  CumulusPalletXcmpQueueEvent: {
    _enum: {
      Success: 'Option<H256>',
      Fail: '(Option<H256>,XcmV2TraitsError)',
      BadVersion: 'Option<H256>',
      BadFormat: 'Option<H256>',
      UpwardMessageSent: 'Option<H256>',
      XcmpMessageSent: 'Option<H256>',
      OverweightEnqueued: '(u32,u32,u64,u64)',
      OverweightServiced: '(u64,u64)'
    }
  },
  /**
   * Lookup270: pallet_xcm::pallet::Event<T>
   **/
  PalletXcmEvent: {
    _enum: {
      Attempted: 'XcmV2TraitsOutcome',
      Sent: '(XcmV1MultiLocation,XcmV1MultiLocation,XcmV2Xcm)',
      UnexpectedResponse: '(XcmV1MultiLocation,u64)',
      ResponseReady: '(u64,XcmV2Response)',
      Notified: '(u64,u8,u8)',
      NotifyOverweight: '(u64,u8,u8,u64,u64)',
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
   * Lookup271: xcm::v2::traits::Outcome
   **/
  XcmV2TraitsOutcome: {
    _enum: {
      Complete: 'u64',
      Incomplete: '(u64,XcmV2TraitsError)',
      Error: 'XcmV2TraitsError'
    }
  },
  /**
   * Lookup273: cumulus_pallet_xcm::pallet::Event<T>
   **/
  CumulusPalletXcmEvent: {
    _enum: {
      InvalidFormat: '[u8;8]',
      UnsupportedVersion: '[u8;8]',
      ExecutedDownward: '([u8;8],XcmV2TraitsOutcome)'
    }
  },
  /**
   * Lookup274: cumulus_pallet_dmp_queue::pallet::Event<T>
   **/
  CumulusPalletDmpQueueEvent: {
    _enum: {
      InvalidFormat: '[u8;32]',
      UnsupportedVersion: '[u8;32]',
      ExecutedDownward: '([u8;32],XcmV2TraitsOutcome)',
      WeightExhausted: '([u8;32],u64,u64)',
      OverweightEnqueued: '([u8;32],u64,u64)',
      OverweightServiced: '(u64,u64)'
    }
  },
  /**
   * Lookup275: pallet_unique::RawEvent<sp_core::crypto::AccountId32, pallet_evm::account::BasicCrossAccountIdRepr<sp_core::crypto::AccountId32>>
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
   * Lookup276: pallet_common::pallet::Event<T>
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
   * Lookup277: pallet_structure::pallet::Event<T>
   **/
  PalletStructureEvent: {
    _enum: {
      Executed: 'Result<Null, SpRuntimeDispatchError>'
    }
  },
  /**
   * Lookup278: pallet_rmrk_core::pallet::Event<T>
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
      PropertySet: {
        collectionId: 'u32',
        maybeNftId: 'Option<u32>',
        key: 'Bytes',
        value: 'Bytes',
      },
      ResourceAdded: {
        nftId: 'u32',
        resourceId: 'u32'
      }
    }
  },
  /**
   * Lookup279: pallet_rmrk_equip::pallet::Event<T>
   **/
  PalletRmrkEquipEvent: {
    _enum: {
      BaseCreated: {
        issuer: 'AccountId32',
        baseId: 'u32'
      }
    }
  },
  /**
   * Lookup280: pallet_evm::pallet::Event<T>
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
   * Lookup281: ethereum::log::Log
   **/
  EthereumLog: {
    address: 'H160',
    topics: 'Vec<H256>',
    data: 'Bytes'
  },
  /**
   * Lookup282: pallet_ethereum::pallet::Event
   **/
  PalletEthereumEvent: {
    _enum: {
      Executed: '(H160,H160,H256,EvmCoreErrorExitReason)'
    }
  },
  /**
   * Lookup283: evm_core::error::ExitReason
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
   * Lookup284: evm_core::error::ExitSucceed
   **/
  EvmCoreErrorExitSucceed: {
    _enum: ['Stopped', 'Returned', 'Suicided']
  },
  /**
   * Lookup285: evm_core::error::ExitError
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
   * Lookup288: evm_core::error::ExitRevert
   **/
  EvmCoreErrorExitRevert: {
    _enum: ['Reverted']
  },
  /**
   * Lookup289: evm_core::error::ExitFatal
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
   * Lookup290: frame_system::Phase
   **/
  FrameSystemPhase: {
    _enum: {
      ApplyExtrinsic: 'u32',
      Finalization: 'Null',
      Initialization: 'Null'
    }
  },
  /**
   * Lookup292: frame_system::LastRuntimeUpgradeInfo
   **/
  FrameSystemLastRuntimeUpgradeInfo: {
    specVersion: 'Compact<u32>',
    specName: 'Text'
  },
  /**
   * Lookup293: frame_system::limits::BlockWeights
   **/
  FrameSystemLimitsBlockWeights: {
    baseBlock: 'u64',
    maxBlock: 'u64',
    perClass: 'FrameSupportWeightsPerDispatchClassWeightsPerClass'
  },
  /**
   * Lookup294: frame_support::weights::PerDispatchClass<frame_system::limits::WeightsPerClass>
   **/
  FrameSupportWeightsPerDispatchClassWeightsPerClass: {
    normal: 'FrameSystemLimitsWeightsPerClass',
    operational: 'FrameSystemLimitsWeightsPerClass',
    mandatory: 'FrameSystemLimitsWeightsPerClass'
  },
  /**
   * Lookup295: frame_system::limits::WeightsPerClass
   **/
  FrameSystemLimitsWeightsPerClass: {
    baseExtrinsic: 'u64',
    maxExtrinsic: 'Option<u64>',
    maxTotal: 'Option<u64>',
    reserved: 'Option<u64>'
  },
  /**
   * Lookup297: frame_system::limits::BlockLength
   **/
  FrameSystemLimitsBlockLength: {
    max: 'FrameSupportWeightsPerDispatchClassU32'
  },
  /**
   * Lookup298: frame_support::weights::PerDispatchClass<T>
   **/
  FrameSupportWeightsPerDispatchClassU32: {
    normal: 'u32',
    operational: 'u32',
    mandatory: 'u32'
  },
  /**
   * Lookup299: frame_support::weights::RuntimeDbWeight
   **/
  FrameSupportWeightsRuntimeDbWeight: {
    read: 'u64',
    write: 'u64'
  },
  /**
   * Lookup300: sp_version::RuntimeVersion
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
   * Lookup304: frame_system::pallet::Error<T>
   **/
  FrameSystemError: {
    _enum: ['InvalidSpecName', 'SpecVersionNeedsToIncrease', 'FailedToExtractRuntimeVersion', 'NonDefaultComposite', 'NonZeroRefCount', 'CallFiltered']
  },
  /**
   * Lookup306: orml_vesting::module::Error<T>
   **/
  OrmlVestingModuleError: {
    _enum: ['ZeroVestingPeriod', 'ZeroVestingPeriodCount', 'InsufficientBalanceToLock', 'TooManyVestingSchedules', 'AmountLow', 'MaxVestingSchedulesExceeded']
  },
  /**
   * Lookup308: cumulus_pallet_xcmp_queue::InboundChannelDetails
   **/
  CumulusPalletXcmpQueueInboundChannelDetails: {
    sender: 'u32',
    state: 'CumulusPalletXcmpQueueInboundState',
    messageMetadata: 'Vec<(u32,PolkadotParachainPrimitivesXcmpMessageFormat)>'
  },
  /**
   * Lookup309: cumulus_pallet_xcmp_queue::InboundState
   **/
  CumulusPalletXcmpQueueInboundState: {
    _enum: ['Ok', 'Suspended']
  },
  /**
   * Lookup312: polkadot_parachain::primitives::XcmpMessageFormat
   **/
  PolkadotParachainPrimitivesXcmpMessageFormat: {
    _enum: ['ConcatenatedVersionedXcm', 'ConcatenatedEncodedBlob', 'Signals']
  },
  /**
   * Lookup315: cumulus_pallet_xcmp_queue::OutboundChannelDetails
   **/
  CumulusPalletXcmpQueueOutboundChannelDetails: {
    recipient: 'u32',
    state: 'CumulusPalletXcmpQueueOutboundState',
    signalsExist: 'bool',
    firstIndex: 'u16',
    lastIndex: 'u16'
  },
  /**
   * Lookup316: cumulus_pallet_xcmp_queue::OutboundState
   **/
  CumulusPalletXcmpQueueOutboundState: {
    _enum: ['Ok', 'Suspended']
  },
  /**
   * Lookup318: cumulus_pallet_xcmp_queue::QueueConfigData
   **/
  CumulusPalletXcmpQueueQueueConfigData: {
    suspendThreshold: 'u32',
    dropThreshold: 'u32',
    resumeThreshold: 'u32',
    thresholdWeight: 'u64',
    weightRestrictDecay: 'u64',
    xcmpMaxIndividualWeight: 'u64'
  },
  /**
   * Lookup320: cumulus_pallet_xcmp_queue::pallet::Error<T>
   **/
  CumulusPalletXcmpQueueError: {
    _enum: ['FailedToSend', 'BadXcmOrigin', 'BadXcm', 'BadOverweightIndex', 'WeightOverLimit']
  },
  /**
   * Lookup321: pallet_xcm::pallet::Error<T>
   **/
  PalletXcmError: {
    _enum: ['Unreachable', 'SendFailure', 'Filtered', 'UnweighableMessage', 'DestinationNotInvertible', 'Empty', 'CannotReanchor', 'TooManyAssets', 'InvalidOrigin', 'BadVersion', 'BadLocation', 'NoSubscription', 'AlreadySubscribed']
  },
  /**
   * Lookup322: cumulus_pallet_xcm::pallet::Error<T>
   **/
  CumulusPalletXcmError: 'Null',
  /**
   * Lookup323: cumulus_pallet_dmp_queue::ConfigData
   **/
  CumulusPalletDmpQueueConfigData: {
    maxIndividual: 'u64'
  },
  /**
   * Lookup324: cumulus_pallet_dmp_queue::PageIndexData
   **/
  CumulusPalletDmpQueuePageIndexData: {
    beginUsed: 'u32',
    endUsed: 'u32',
    overweightCount: 'u64'
  },
  /**
   * Lookup327: cumulus_pallet_dmp_queue::pallet::Error<T>
   **/
  CumulusPalletDmpQueueError: {
    _enum: ['Unknown', 'OverLimit']
  },
  /**
   * Lookup331: pallet_unique::Error<T>
   **/
  PalletUniqueError: {
    _enum: ['CollectionDecimalPointLimitExceeded', 'ConfirmUnsetSponsorFail', 'EmptyArgument']
  },
  /**
   * Lookup332: up_data_structs::Collection<sp_core::crypto::AccountId32>
   **/
  UpDataStructsCollection: {
    owner: 'AccountId32',
    mode: 'UpDataStructsCollectionMode',
    name: 'Vec<u16>',
    description: 'Vec<u16>',
    tokenPrefix: 'Bytes',
    sponsorship: 'UpDataStructsSponsorshipState',
    limits: 'UpDataStructsCollectionLimits',
    permissions: 'UpDataStructsCollectionPermissions'
  },
  /**
   * Lookup333: up_data_structs::SponsorshipState<sp_core::crypto::AccountId32>
   **/
  UpDataStructsSponsorshipState: {
    _enum: {
      Disabled: 'Null',
      Unconfirmed: 'AccountId32',
      Confirmed: 'AccountId32'
    }
  },
  /**
   * Lookup334: up_data_structs::Properties
   **/
  UpDataStructsProperties: {
    map: 'UpDataStructsPropertiesMapBoundedVec',
    consumedSpace: 'u32',
    spaceLimit: 'u32'
  },
  /**
   * Lookup335: up_data_structs::PropertiesMap<frame_support::storage::bounded_vec::BoundedVec<T, S>>
   **/
  UpDataStructsPropertiesMapBoundedVec: 'BTreeMap<Bytes, Bytes>',
  /**
   * Lookup340: up_data_structs::PropertiesMap<up_data_structs::PropertyPermission>
   **/
  UpDataStructsPropertiesMapPropertyPermission: 'BTreeMap<Bytes, UpDataStructsPropertyPermission>',
  /**
   * Lookup347: up_data_structs::CollectionStats
   **/
  UpDataStructsCollectionStats: {
    created: 'u32',
    destroyed: 'u32',
    alive: 'u32'
  },
  /**
   * Lookup348: PhantomType::up_data_structs<T>
   **/
  PhantomTypeUpDataStructs: '[(UpDataStructsTokenData,UpDataStructsRpcCollection,UpDataStructsRmrkCollectionInfo,UpDataStructsRmrkNftInfo,UpDataStructsRmrkResourceInfo,UpDataStructsRmrkPropertyInfo,UpDataStructsRmrkBaseInfo,UpDataStructsRmrkPartType,UpDataStructsRmrkTheme,UpDataStructsRmrkNftChild);0]',
  /**
   * Lookup350: up_data_structs::TokenData<pallet_evm::account::BasicCrossAccountIdRepr<sp_core::crypto::AccountId32>>
   **/
  UpDataStructsTokenData: {
    properties: 'Vec<UpDataStructsProperty>',
    owner: 'Option<PalletEvmAccountBasicCrossAccountIdRepr>'
  },
  /**
   * Lookup352: up_data_structs::RpcCollection<sp_core::crypto::AccountId32>
   **/
  UpDataStructsRpcCollection: {
    owner: 'AccountId32',
    mode: 'UpDataStructsCollectionMode',
    name: 'Vec<u16>',
    description: 'Vec<u16>',
    tokenPrefix: 'Bytes',
    sponsorship: 'UpDataStructsSponsorshipState',
    limits: 'UpDataStructsCollectionLimits',
    permissions: 'UpDataStructsCollectionPermissions',
    tokenPropertyPermissions: 'Vec<UpDataStructsPropertyKeyPermission>',
    properties: 'Vec<UpDataStructsProperty>'
  },
  /**
   * Lookup353: up_data_structs::rmrk::CollectionInfo<frame_support::storage::bounded_vec::BoundedVec<T, S>, frame_support::storage::bounded_vec::BoundedVec<T, S>, sp_core::crypto::AccountId32>
   **/
  UpDataStructsRmrkCollectionInfo: {
    issuer: 'AccountId32',
    metadata: 'Bytes',
    max: 'Option<u32>',
    symbol: 'Bytes',
    nftsCount: 'u32'
  },
  /**
   * Lookup354: up_data_structs::rmrk::NftInfo<sp_core::crypto::AccountId32, sp_arithmetic::per_things::Permill, frame_support::storage::bounded_vec::BoundedVec<T, S>>
   **/
  UpDataStructsRmrkNftInfo: {
    owner: 'UpDataStructsRmrkAccountIdOrCollectionNftTuple',
    royalty: 'Option<UpDataStructsRmrkRoyaltyInfo>',
    metadata: 'Bytes',
    equipped: 'bool',
    pending: 'bool'
  },
  /**
   * Lookup355: up_data_structs::rmrk::AccountIdOrCollectionNftTuple<sp_core::crypto::AccountId32>
   **/
  UpDataStructsRmrkAccountIdOrCollectionNftTuple: {
    _enum: {
      AccountId: 'AccountId32',
      CollectionAndNftTuple: '(u32,u32)'
    }
  },
  /**
   * Lookup357: up_data_structs::rmrk::RoyaltyInfo<sp_core::crypto::AccountId32, sp_arithmetic::per_things::Permill>
   **/
  UpDataStructsRmrkRoyaltyInfo: {
    recipient: 'AccountId32',
    amount: 'Permill'
  },
  /**
   * Lookup358: up_data_structs::rmrk::ResourceInfo<frame_support::storage::bounded_vec::BoundedVec<T, S>, frame_support::storage::bounded_vec::BoundedVec<T, S>>
   **/
  UpDataStructsRmrkResourceInfo: {
    id: 'u32',
    resource: 'UpDataStructsRmrkResourceTypes',
    pending: 'bool',
    pendingRemoval: 'bool'
  },
  /**
   * Lookup359: up_data_structs::rmrk::ResourceTypes<frame_support::storage::bounded_vec::BoundedVec<T, S>, frame_support::storage::bounded_vec::BoundedVec<T, S>>
   **/
  UpDataStructsRmrkResourceTypes: {
    _enum: {
      Basic: 'UpDataStructsRmrkBasicResource',
      Composable: 'UpDataStructsRmrkComposableResource',
      Slot: 'UpDataStructsRmrkSlotResource'
    }
  },
  /**
   * Lookup360: up_data_structs::rmrk::PropertyInfo<frame_support::storage::bounded_vec::BoundedVec<T, S>, frame_support::storage::bounded_vec::BoundedVec<T, S>>
   **/
  UpDataStructsRmrkPropertyInfo: {
    key: 'Bytes',
    value: 'Bytes'
  },
  /**
   * Lookup361: up_data_structs::rmrk::BaseInfo<sp_core::crypto::AccountId32, frame_support::storage::bounded_vec::BoundedVec<T, S>>
   **/
  UpDataStructsRmrkBaseInfo: {
    issuer: 'AccountId32',
    baseType: 'Bytes',
    symbol: 'Bytes'
  },
  /**
   * Lookup362: up_data_structs::rmrk::NftChild
   **/
  UpDataStructsRmrkNftChild: {
    collectionId: 'u32',
    nftId: 'u32'
  },
  /**
   * Lookup364: pallet_common::pallet::Error<T>
   **/
  PalletCommonError: {
    _enum: ['CollectionNotFound', 'MustBeTokenOwner', 'NoPermission', 'CantDestroyNotEmptyCollection', 'PublicMintingNotAllowed', 'AddressNotInAllowlist', 'CollectionNameLimitExceeded', 'CollectionDescriptionLimitExceeded', 'CollectionTokenPrefixLimitExceeded', 'TotalCollectionsLimitExceeded', 'CollectionAdminCountExceeded', 'CollectionLimitBoundsExceeded', 'OwnerPermissionsCantBeReverted', 'TransferNotAllowed', 'AccountTokenLimitExceeded', 'CollectionTokenLimitExceeded', 'MetadataFlagFrozen', 'TokenNotFound', 'TokenValueTooLow', 'ApprovedValueTooLow', 'CantApproveMoreThanOwned', 'AddressIsZero', 'UnsupportedOperation', 'NotSufficientFounds', 'NestingIsDisabled', 'OnlyOwnerAllowedToNest', 'SourceCollectionIsNotAllowedToNest', 'CollectionFieldSizeExceeded', 'NoSpaceForProperty', 'PropertyLimitReached', 'PropertyKeyIsTooLong', 'InvalidCharacterInPropertyKey', 'EmptyPropertyKey']
  },
  /**
   * Lookup366: pallet_fungible::pallet::Error<T>
   **/
  PalletFungibleError: {
    _enum: ['NotFungibleDataUsedToMintFungibleCollectionToken', 'FungibleItemsHaveNoId', 'FungibleItemsDontHaveData', 'FungibleDisallowsNesting', 'SettingPropertiesNotAllowed']
  },
  /**
   * Lookup367: pallet_refungible::ItemData
   **/
  PalletRefungibleItemData: {
    constData: 'Bytes'
  },
  /**
   * Lookup371: pallet_refungible::pallet::Error<T>
   **/
  PalletRefungibleError: {
    _enum: ['NotRefungibleDataUsedToMintFungibleCollectionToken', 'WrongRefungiblePieces', 'RefungibleDisallowsNesting', 'SettingPropertiesNotAllowed']
  },
  /**
   * Lookup372: pallet_nonfungible::ItemData<pallet_evm::account::BasicCrossAccountIdRepr<sp_core::crypto::AccountId32>>
   **/
  PalletNonfungibleItemData: {
    owner: 'PalletEvmAccountBasicCrossAccountIdRepr'
  },
  /**
   * Lookup374: pallet_nonfungible::pallet::Error<T>
   **/
  PalletNonfungibleError: {
    _enum: ['NotNonfungibleDataUsedToMintFungibleCollectionToken', 'NonfungibleItemsHaveNoAmount', 'CantBurnNftWithChildren']
  },
  /**
   * Lookup375: pallet_structure::pallet::Error<T>
   **/
  PalletStructureError: {
    _enum: ['OuroborosDetected', 'DepthLimit', 'TokenNotFound']
  },
  /**
   * Lookup376: pallet_rmrk_core::pallet::Error<T>
   **/
  PalletRmrkCoreError: {
    _enum: ['CorruptedCollectionType', 'NftTypeEncodeError', 'RmrkPropertyKeyIsTooLong', 'RmrkPropertyValueIsTooLong', 'CollectionNotEmpty', 'NoAvailableCollectionId', 'NoAvailableNftId', 'CollectionUnknown', 'NoPermission', 'CollectionFullOrLocked']
  },
  /**
   * Lookup378: pallet_rmrk_equip::pallet::Error<T>
   **/
  PalletRmrkEquipError: {
    _enum: ['PermissionError', 'NoAvailableBaseId', 'NoAvailablePartId', 'BaseDoesntExist', 'NeedsDefaultThemeFirst']
  },
  /**
   * Lookup381: pallet_evm::pallet::Error<T>
   **/
  PalletEvmError: {
    _enum: ['BalanceLow', 'FeeOverflow', 'PaymentOverflow', 'WithdrawFailed', 'GasPriceTooLow', 'InvalidNonce']
  },
  /**
   * Lookup384: fp_rpc::TransactionStatus
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
   * Lookup386: ethbloom::Bloom
   **/
  EthbloomBloom: '[u8;256]',
  /**
   * Lookup388: ethereum::receipt::ReceiptV3
   **/
  EthereumReceiptReceiptV3: {
    _enum: {
      Legacy: 'EthereumReceiptEip658ReceiptData',
      EIP2930: 'EthereumReceiptEip658ReceiptData',
      EIP1559: 'EthereumReceiptEip658ReceiptData'
    }
  },
  /**
   * Lookup389: ethereum::receipt::EIP658ReceiptData
   **/
  EthereumReceiptEip658ReceiptData: {
    statusCode: 'u8',
    usedGas: 'U256',
    logsBloom: 'EthbloomBloom',
    logs: 'Vec<EthereumLog>'
  },
  /**
   * Lookup390: ethereum::block::Block<ethereum::transaction::TransactionV2>
   **/
  EthereumBlock: {
    header: 'EthereumHeader',
    transactions: 'Vec<EthereumTransactionTransactionV2>',
    ommers: 'Vec<EthereumHeader>'
  },
  /**
   * Lookup391: ethereum::header::Header
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
   * Lookup392: ethereum_types::hash::H64
   **/
  EthereumTypesHashH64: '[u8;8]',
  /**
   * Lookup397: pallet_ethereum::pallet::Error<T>
   **/
  PalletEthereumError: {
    _enum: ['InvalidSignature', 'PreLogExists']
  },
  /**
   * Lookup398: pallet_evm_coder_substrate::pallet::Error<T>
   **/
  PalletEvmCoderSubstrateError: {
    _enum: ['OutOfGas', 'OutOfFund']
  },
  /**
   * Lookup399: pallet_evm_contract_helpers::SponsoringModeT
   **/
  PalletEvmContractHelpersSponsoringModeT: {
    _enum: ['Disabled', 'Allowlisted', 'Generous']
  },
  /**
   * Lookup401: pallet_evm_contract_helpers::pallet::Error<T>
   **/
  PalletEvmContractHelpersError: {
    _enum: ['NoPermission']
  },
  /**
   * Lookup402: pallet_evm_migration::pallet::Error<T>
   **/
  PalletEvmMigrationError: {
    _enum: ['AccountNotEmpty', 'AccountIsNotMigrating']
  },
  /**
   * Lookup404: sp_runtime::MultiSignature
   **/
  SpRuntimeMultiSignature: {
    _enum: {
      Ed25519: 'SpCoreEd25519Signature',
      Sr25519: 'SpCoreSr25519Signature',
      Ecdsa: 'SpCoreEcdsaSignature'
    }
  },
  /**
   * Lookup405: sp_core::ed25519::Signature
   **/
  SpCoreEd25519Signature: '[u8;64]',
  /**
   * Lookup407: sp_core::sr25519::Signature
   **/
  SpCoreSr25519Signature: '[u8;64]',
  /**
   * Lookup408: sp_core::ecdsa::Signature
   **/
  SpCoreEcdsaSignature: '[u8;65]',
  /**
   * Lookup411: frame_system::extensions::check_spec_version::CheckSpecVersion<T>
   **/
  FrameSystemExtensionsCheckSpecVersion: 'Null',
  /**
   * Lookup412: frame_system::extensions::check_genesis::CheckGenesis<T>
   **/
  FrameSystemExtensionsCheckGenesis: 'Null',
  /**
   * Lookup415: frame_system::extensions::check_nonce::CheckNonce<T>
   **/
  FrameSystemExtensionsCheckNonce: 'Compact<u32>',
  /**
   * Lookup416: frame_system::extensions::check_weight::CheckWeight<T>
   **/
  FrameSystemExtensionsCheckWeight: 'Null',
  /**
   * Lookup417: pallet_template_transaction_payment::ChargeTransactionPayment<opal_runtime::Runtime>
   **/
  PalletTemplateTransactionPaymentChargeTransactionPayment: 'Compact<u128>',
  /**
   * Lookup418: opal_runtime::Runtime
   **/
  OpalRuntimeRuntime: 'Null',
  /**
   * Lookup419: pallet_ethereum::FakeTransactionFinalizer<opal_runtime::Runtime>
   **/
  PalletEthereumFakeTransactionFinalizer: 'Null'
};
