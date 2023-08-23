use up_common::constants::{MAXIMUM_BLOCK_WEIGHT, NORMAL_DISPATCH_RATIO};

use super::*;

parameter_types! {
	pub MaximumSchedulerWeight: Weight = Perbill::from_percent(80) *
		<Runtime as frame_system::Config>::BlockWeights::get()
		.per_class.get(frame_support::pallet_prelude::DispatchClass::Normal).max_total
		.unwrap_or(NORMAL_DISPATCH_RATIO * MAXIMUM_BLOCK_WEIGHT);
	pub MaxScheduledPerBlock: u32 = 50;
}

impl pallet_scheduler::Config for Runtime {
	type RuntimeOrigin = RuntimeOrigin;
	type RuntimeEvent = RuntimeEvent;
	type PalletsOrigin = OriginCaller;
	type RuntimeCall = RuntimeCall;
	type MaximumWeight = MaximumSchedulerWeight;
	type ScheduleOrigin = EnsureRoot<AccountId>;
	type MaxScheduledPerBlock = MaxScheduledPerBlock;
	type WeightInfo = pallet_scheduler::weights::SubstrateWeight<Runtime>;
	type OriginPrivilegeCmp = EqualPrivilegeOnly;
	type Preimages = Preimage;
}
