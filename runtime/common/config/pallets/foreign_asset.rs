use frame_support::{parameter_types, PalletId};
use pallet_evm::account::CrossAccountId;
use sp_core::H160;
use staging_xcm::prelude::*;
use staging_xcm_builder::AccountKey20Aliases;

#[cfg(feature = "governance")]
use crate::runtime_common::config::governance;

#[cfg(not(feature = "governance"))]
use frame_system::EnsureRoot;

use crate::{
	runtime_common::config::{
		ethereum::CrossAccountId as ConfigCrossAccountId,
		xcm::{LocationToAccountId, SelfLocation},
	},
	RelayNetwork, Runtime, RuntimeEvent,
};

parameter_types! {
	pub ForeignAssetPalletId: PalletId = PalletId(*b"frgnasts");
}

pub struct LocationToCrossAccountId;
impl staging_xcm_executor::traits::ConvertLocation<ConfigCrossAccountId>
	for LocationToCrossAccountId
{
	fn convert_location(location: &MultiLocation) -> Option<ConfigCrossAccountId> {
		LocationToAccountId::convert_location(location)
			.map(|sub| ConfigCrossAccountId::from_sub(sub))
			.or_else(|| {
				let eth_address =
					AccountKey20Aliases::<RelayNetwork, H160>::convert_location(location)?;

				Some(ConfigCrossAccountId::from_eth(eth_address))
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
