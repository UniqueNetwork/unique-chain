use evm_coder::{types::*, solidity_interface, execution::Result, Call};

pub struct Contract(bool);

#[solidity_interface(name = A)]
impl Contract {
	fn method_a() -> Result<void> {
		Ok(())
	}
}

#[solidity_interface(name = B)]
impl Contract {
	fn method_b() -> Result<void> {
		Ok(())
	}
}

#[solidity_interface(name = Contract, is(
	A(if(this.0)),
	B(if(!this.0)),
))]
impl Contract {}

#[test]
fn conditional_erc165() {
	assert!(ContractCall::supports_interface(
		&Contract(true),
		ACall::METHOD_A
	));
	assert!(!ContractCall::supports_interface(
		&Contract(false),
		ACall::METHOD_A
	));

	assert!(ContractCall::supports_interface(
		&Contract(false),
		BCall::METHOD_B
	));
	assert!(!ContractCall::supports_interface(
		&Contract(true),
		BCall::METHOD_B
	));
}
