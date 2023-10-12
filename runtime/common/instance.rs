use up_common::types::opaque::RuntimeInstance;

use crate::{runtime_common::config::ethereum::CrossAccountId, Runtime};

impl RuntimeInstance for Runtime {
	type CrossAccountId = CrossAccountId;
}
