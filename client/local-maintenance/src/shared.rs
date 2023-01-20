use std::sync::{Arc, Mutex};

use cumulus_primitives_core::relay_chain;
use serde::{Deserialize, Serialize};

/// This struct is used to communicate between runtime and RPC
#[derive(Serialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct LocalMaintenanceData {
	pub upgrade_go_ahead: Option<UpgradeGoAhead>,
}

#[derive(Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub enum UpgradeGoAhead {
	Abort,
	GoAhead,
}
#[allow(clippy::from_over_into/*, reason: "Can't implement From for foreign struct"*/)]
impl Into<relay_chain::v2::UpgradeGoAhead> for UpgradeGoAhead {
	fn into(self) -> relay_chain::v2::UpgradeGoAhead {
		match self {
			UpgradeGoAhead::Abort => relay_chain::v2::UpgradeGoAhead::Abort,
			UpgradeGoAhead::GoAhead => relay_chain::v2::UpgradeGoAhead::GoAhead,
		}
	}
}

pub type SharedLocalMaintenanceData = Arc<Mutex<LocalMaintenanceData>>;
