use frame_support::{parameter_types, PalletId};
#[cfg(not(feature = "governance"))]
use frame_system::EnsureRoot;
use pallet_evm::account::CrossAccountId as CrossAccountIdT;
use sp_core::H160;
use staging_xcm::prelude::*;
use staging_xcm_builder::AccountKey20Aliases;
use up_common::types::CrossAccountId;

#[cfg(feature = "governance")]
use crate::runtime_common::config::governance;
use crate::{
	runtime_common::config::xcm::{LocationToAccountId, SelfLocation},
	RelayNetwork, Runtime, RuntimeEvent,
};

parameter_types! {
	pub ForeignAssetPalletId: PalletId = PalletId(*b"frgnasts");
}

pub struct LocationToCrossAccountId;
impl staging_xcm_executor::traits::ConvertLocation<CrossAccountId> for LocationToCrossAccountId {
	fn convert_location(location: &MultiLocation) -> Option<CrossAccountId> {
		LocationToAccountId::convert_location(location)
			.map(CrossAccountId::from_sub)
			.or_else(|| {
				let eth_address =
					AccountKey20Aliases::<RelayNetwork, H160>::convert_location(location)?;

				Some(CrossAccountId::from_eth(eth_address))
			})
	}
}

impl pallet_foreign_assets::Config for Runtime {
	type RuntimeEvent = RuntimeEvent;

	#[cfg(feature = "governance")]
	type ForceRegisterOrigin = governance::RootOrTechnicalCommitteeMember;

	#[cfg(not(feature = "governance"))]
	type ForceRegisterOrigin = EnsureRoot<Self::AccountId>;

	type PalletId = ForeignAssetPalletId;
	type SelfLocation = SelfLocation;
	type LocationToAccountId = LocationToCrossAccountId;
	type WeightInfo = pallet_foreign_assets::weights::SubstrateWeight<Self>;
}
