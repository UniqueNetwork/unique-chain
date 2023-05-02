use crate::{Runtime, RuntimeEvent, RuntimeCall};

impl pallet_test_utils::Config for Runtime {
	type RuntimeEvent = RuntimeEvent;
	type RuntimeCall = RuntimeCall;
}
