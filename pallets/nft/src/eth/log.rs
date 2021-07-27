use sp_std::cell::RefCell;
use sp_std::vec::Vec;

use ethereum::Log;

#[derive(Default)]
pub struct LogRecorder(RefCell<Vec<Log>>);

impl LogRecorder {
	pub fn is_empty(&self) -> bool {
		self.0.borrow().is_empty()
	}
	pub fn log(&self, log: Log) {
		self.0.borrow_mut().push(log);
	}
	pub fn retrieve_logs(self) -> Vec<Log> {
		self.0.into_inner()
	}
}
