use crate::{
	runtime_common::{
		config::ethereum::CrossAccountId,
	},
	Runtime,
};
use up_common::types::opaque::RuntimeInstance;

impl RuntimeInstance for Runtime {
	type CrossAccountId = CrossAccountId;
}
