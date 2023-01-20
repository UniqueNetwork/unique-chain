use jsonrpsee::{proc_macros::rpc, core::RpcResult as Result};

use crate::shared::{LocalMaintenanceData, UpgradeGoAhead, SharedLocalMaintenanceData};

#[rpc(server)]
#[async_trait]
trait LocalMaintenanceApi {
	/// Check if the token exists.
	#[method(name = "localMaintenance_injectUpgradeGoAhead")]
	fn inject_upgrade_go_ahead(&self, signal: UpgradeGoAhead) -> Result<()>;

	#[method(name = "localMaintenance_currentData")]
	fn current_data(&self) -> Result<LocalMaintenanceData>;
}

pub struct LocalMaintenance {
	data: SharedLocalMaintenanceData,
}

impl LocalMaintenance {
	pub fn new(data: SharedLocalMaintenanceData) -> Self {
		Self { data }
	}
}

impl LocalMaintenanceApiServer for LocalMaintenance {
	fn inject_upgrade_go_ahead(&self, signal: UpgradeGoAhead) -> Result<()> {
		self.data.lock().unwrap().upgrade_go_ahead = Some(signal);
		Ok(())
	}

	fn current_data(&self) -> Result<LocalMaintenanceData> {
		Ok(self.data.lock().unwrap().clone())
	}
}
