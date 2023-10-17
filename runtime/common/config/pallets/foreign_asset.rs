use frame_support::{parameter_types, PalletId};

use crate::{runtime_common::config::governance, Runtime, RuntimeEvent};

parameter_types! {
	pub ForeignAssetPalletId: PalletId = PalletId(*b"frgnasts");
}

impl pallet_foreign_assets::Config for Runtime {
	type RuntimeEvent = RuntimeEvent;
	type ForceRegisterOrigin = governance::RootOrTechnicalCommitteeMember;
	type PalletId = ForeignAssetPalletId;
	type WeightInfo = pallet_foreign_assets::weights::SubstrateWeight<Self>;
}
