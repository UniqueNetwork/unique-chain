use pallet_evm::PrecompileLog;
use sp_std::cell::RefCell;
use sp_std::vec::Vec;
use sp_core::{H160, H256};

#[derive(Default)]
pub struct LogRecorder(RefCell<Vec<(Vec<H256>, Vec<u8>)>>);

impl LogRecorder {
    pub fn log(&self, topics: Vec<H256>, data: super::abi::AbiWriter) {
        self.0.borrow_mut().push((topics, data.finish()));
    }
    fn retrieve_logs(self) -> Vec<(Vec<H256>, Vec<u8>)> {
        self.0.replace(Vec::new())
    }
    pub fn retrieve_logs_for_contract(self, contract: H160) -> Vec<PrecompileLog> {
        // TODO: Remove reallocation
        self.retrieve_logs().into_iter()
            .map(|(topics, data)| PrecompileLog(contract.clone(), topics, data))
            .collect()
    }
}
impl Drop for LogRecorder {
    fn drop(&mut self) {
        #[cfg(feature = "std")]
        {
            // In debug mode, log recorder panics if dropped with logs left
            let logs = self.0.borrow();
            if !logs.is_empty() {
                eprintln!("Logs lost:");
                for line in logs.iter() {
                    eprintln!("{:?} {:?}", line.0, line.1);
                }
                panic!();
            }
        }
    }
}
