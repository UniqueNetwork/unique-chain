use evm_coder::{execution::Result, generate_stubgen, solidity_interface, types::*};

struct ERC20;

#[solidity_interface(name = "ERC20")]
impl ERC20 {
	fn decimals(&self) -> Result<uint8> {
		todo!()
	}
	/// Get balance of specified owner
	fn balance_of(&self, _owner: address) -> Result<uint256> {
		todo!()
	}
	fn transfer(&mut self, _caller: caller, _to: address, _value: uint256) -> Result<bool> {
		todo!()
	}
	fn transfer_from(
		&mut self,
		_caller: caller,
		_from: address,
		_to: address,
		_value: uint256,
	) -> Result<bool> {
		todo!()
	}
	fn approve(&mut self, _caller: caller, _spender: address, _value: uint256) -> Result<bool> {
		todo!()
	}
	fn allowance(&self, _owner: address, _spender: address) -> Result<uint256> {
		todo!()
	}
}

generate_stubgen!(gen_impl, ERC20Call, true);
generate_stubgen!(gen_iface, ERC20Call, false);
