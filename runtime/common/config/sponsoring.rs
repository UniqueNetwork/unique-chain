use crate::{
	runtime_common::{sponsoring::UniqueSponsorshipHandler},
	Runtime,
};
use frame_support::parameter_types;
use sp_core::U256;
use up_common::{constants::*, types::BlockNumber};

parameter_types! {
	pub const DefaultSponsoringRateLimit: BlockNumber = 1 * DAYS;
	pub const DefaultSponsoringFeeLimit: U256 = U256::MAX;
}

type SponsorshipHandler = (
	UniqueSponsorshipHandler<Runtime>,
	pallet_evm_transaction_payment::BridgeSponsorshipHandler<Runtime>,
);

impl pallet_charge_transaction::Config for Runtime {
	type SponsorshipHandler = SponsorshipHandler;
}
