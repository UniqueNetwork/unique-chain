use frame_support::{parameter_types, PalletId};
#[cfg(not(feature = "governance"))]
use frame_system::EnsureRoot;
use pallet_evm::account::CrossAccountId;
use sp_core::H160;
use staging_xcm::prelude::*;
use staging_xcm_builder::AccountKey20Aliases;

#[cfg(feature = "governance")]
use crate::runtime_common::config::governance;
use crate::{
	runtime_common::config::{
		ethereum::CrossAccountId as ConfigCrossAccountId,
		xcm::{LocationToCrossAccountId, SelfLocation},
	},
	DerivativeCollections, RelayNetwork, Runtime, RuntimeEvent,
};

parameter_types! {
	pub ForeignAssetPalletId: PalletId = PalletId(*b"frgnasts");
}

impl pallet_foreign_assets::Config for Runtime {
	type RuntimeEvent = RuntimeEvent;

	#[cfg(feature = "governance")]
	type ManagerOrigin = governance::RootOrFinancialCouncilMember;

	#[cfg(not(feature = "governance"))]
	type ManagerOrigin = EnsureRoot<Self::AccountId>;

	type PalletId = ForeignAssetPalletId;
	type SelfLocation = SelfLocation;
	type LocationToAccountId = LocationToCrossAccountId;
	type DerivativeCollectionsRegistry = DerivativeCollections;
	type WeightInfo = pallet_foreign_assets::weights::SubstrateWeight<Self>;
}
