use evm_coder::{solidity_interface, solidity, types::*, ToLog};
use sp_std::vec::Vec;

#[solidity_interface]
pub trait InlineNameSymbol {
	type Error;

	fn name(&self) -> Result<string, Self::Error>;
	fn symbol(&self) -> Result<string, Self::Error>;
}

#[solidity_interface]
pub trait InlineTotalSupply {
	type Error;

	fn total_supply(&self) -> Result<uint256, Self::Error>;
}

#[solidity_interface]
pub trait ERC165 {
	type Error;

	fn supports_interface(&self, interface_id: bytes4) -> Result<bool, Self::Error>;
}

#[solidity_interface(inline_is(InlineNameSymbol))]
pub trait ERC721Metadata {
	type Error;

	#[solidity(rename_selector = "tokenURI")]
	fn token_uri(&self, token_id: uint256) -> Result<string, Self::Error>;
}

#[solidity_interface(inline_is(InlineTotalSupply))]
pub trait ERC721Enumerable {
	type Error;

	fn token_by_index(&self, index: uint256) -> Result<uint256, Self::Error>;
	fn token_of_owner_by_index(
		&self,
		owner: address,
		index: uint256,
	) -> Result<uint256, Self::Error>;
}

#[derive(ToLog)]
pub enum ERC721Events {
	Transfer {
		#[indexed]
		from: address,
		#[indexed]
		to: address,
		#[indexed]
		token_id: uint256,
	},
	Approval {
		#[indexed]
		owner: address,
		#[indexed]
		approved: address,
		#[indexed]
		token_id: uint256,
	},
	#[allow(dead_code)]
	ApprovalForAll {
		#[indexed]
		owner: address,
		#[indexed]
		operator: address,
		approved: bool,
	},
}

#[solidity_interface(is(ERC165), events(ERC721Events))]
pub trait ERC721 {
	type Error;

	fn balance_of(&self, owner: address) -> Result<uint256, Self::Error>;
	fn owner_of(&self, token_id: uint256) -> Result<address, Self::Error>;

	#[solidity(rename_selector = "safeTransferFrom")]
	fn safe_transfer_from_with_data(
		&mut self,
		from: address,
		to: address,
		token_id: uint256,
		data: bytes,
		value: value,
	) -> Result<void, Self::Error>;
	fn safe_transfer_from(
		&mut self,
		from: address,
		to: address,
		token_id: uint256,
		value: value,
	) -> Result<void, Self::Error>;

	fn transfer_from(
		&mut self,
		caller: caller,
		from: address,
		to: address,
		token_id: uint256,
		value: value,
	) -> Result<void, Self::Error>;
	fn approve(
		&mut self,
		caller: caller,
		approved: address,
		token_id: uint256,
		value: value,
	) -> Result<void, Self::Error>;
	fn set_approval_for_all(
		&mut self,
		caller: caller,
		operator: address,
		approved: bool,
	) -> Result<void, Self::Error>;

	fn get_approved(&self, token_id: uint256) -> Result<address, Self::Error>;
	fn is_approved_for_all(
		&self,
		owner: address,
		operator: address,
	) -> Result<address, Self::Error>;
}

#[solidity_interface]
pub trait ERC721UniqueExtensions {
	type Error;

	fn transfer(
		&mut self,
		caller: caller,
		to: address,
		token_id: uint256,
		value: value,
	) -> Result<void, Self::Error>;
}

#[solidity_interface(is(
	ERC165,
	ERC721,
	ERC721Metadata,
	ERC721Enumerable,
	ERC721UniqueExtensions
))]
pub trait UniqueNFT {
	type Error;
}

#[derive(ToLog)]
pub enum ERC20Events {
	Transfer {
		#[indexed]
		from: address,
		#[indexed]
		to: address,
		value: uint256,
	},
	Approval {
		#[indexed]
		owner: address,
		#[indexed]
		spender: address,
		value: uint256,
	},
}

#[solidity_interface(inline_is(InlineNameSymbol, InlineTotalSupply), events(ERC20Events))]
pub trait ERC20 {
	type Error;

	fn decimals(&self) -> Result<uint8, Self::Error>;
	fn balance_of(&self, owner: address) -> Result<uint256, Self::Error>;
	fn transfer(
		&mut self,
		caller: caller,
		to: address,
		value: uint256,
	) -> Result<bool, Self::Error>;
	fn transfer_from(
		&mut self,
		caller: caller,
		from: address,
		to: address,
		value: uint256,
	) -> Result<bool, Self::Error>;
	fn approve(
		&mut self,
		caller: caller,
		spender: address,
		value: uint256,
	) -> Result<bool, Self::Error>;
	fn allowance(&self, owner: address, spender: address) -> Result<uint256, Self::Error>;
}

#[solidity_interface(is(ERC165, ERC20))]
pub trait UniqueFungible {
	type Error;
}
