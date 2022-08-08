use crate::{
    runtime_common::{
        config::ethereum::CrossAccountId,
        ethereum::transaction_converter::TransactionConverter
    },
    Runtime,
};
use common_types::opaque::RuntimeInstance;

impl RuntimeInstance for Runtime {
	type CrossAccountId = CrossAccountId;
	type TransactionConverter = TransactionConverter;

	fn get_transaction_converter() -> TransactionConverter {
		TransactionConverter
	}
}
