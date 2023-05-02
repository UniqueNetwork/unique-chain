use frame_support::traits::Everything;
use xcm_builder::{AllowTopLevelPaidExecutionFrom, TakeWeightCredit};

pub type Barrier = (TakeWeightCredit, AllowTopLevelPaidExecutionFrom<Everything>);
