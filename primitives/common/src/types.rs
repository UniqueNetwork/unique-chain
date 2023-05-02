use sp_runtime::{
	generic,
	traits::{Verify, IdentifyAccount},
	MultiSignature,
};

/// Opaque types. These are used by the CLI to instantiate machinery that don't need to know
/// the specifics of the runtime. They can then be made to be agnostic over specific formats
/// of data like extrinsics, allowing for them to continue syncing the network through upgrades
/// to even the core data structures.
pub mod opaque {
	pub use sp_runtime::{generic, traits::BlakeTwo256, OpaqueExtrinsic as UncheckedExtrinsic};

	pub use super::{BlockNumber, Signature, AccountId, Balance, Index, Hash, AuraId};

	#[derive(Debug, Clone)]
	pub enum RuntimeId {
		Unique,
		Quartz,
		Opal,
		Unknown(sp_std::vec::Vec<u8>),
	}

	/// Opaque block header type.
	pub type Header = generic::Header<BlockNumber, BlakeTwo256>;

	/// Opaque block type.
	pub type Block = generic::Block<Header, UncheckedExtrinsic>;

	pub trait RuntimeInstance {
		type CrossAccountId: pallet_evm::account::CrossAccountId<sp_runtime::AccountId32>
			+ Send
			+ Sync
			+ 'static;

		type TransactionConverter: fp_rpc::ConvertTransaction<UncheckedExtrinsic>
			+ Send
			+ Sync
			+ 'static;

		fn get_transaction_converter() -> Self::TransactionConverter;
	}
}

pub type SessionHandlers = ();

/// An index to a block.
pub type BlockNumber = u32;

/// Alias to 512-bit hash when used in the context of a transaction signature on the chain.
pub type Signature = MultiSignature;

/// Some way of identifying an account on the chain. We intentionally make it equivalent
/// to the public key of our transaction signing scheme.
pub type AccountId = <<Signature as Verify>::Signer as IdentifyAccount>::AccountId;

/// The type for looking up accounts. We don't expect more than 4 billion of them, but you
/// never know...
pub type AccountIndex = u32;

/// Balance of an account.
pub type Balance = u128;

/// Index of a transaction in the chain.
pub type Index = u32;

/// A hash of some data used by the chain.
pub type Hash = sp_core::H256;

/// Digest item type.
pub type DigestItem = generic::DigestItem;

pub use sp_consensus_aura::sr25519::AuthorityId as AuraId;
