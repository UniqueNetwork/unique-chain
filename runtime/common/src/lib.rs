#![cfg_attr(not(feature = "std"), no_std)]

pub use types::*;
pub use constants::*;
pub use opaque::*;

/// Common types of runtimes.
mod types {
	use sp_runtime::{
		generic,
		traits::{BlakeTwo256, IdentifyAccount, Verify},
		MultiSignature,
	};

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

	pub type AuraId = sp_consensus_aura::sr25519::AuthorityId;

	/// Balance of an account.
	pub type Balance = u128;

	/// Index of a transaction in the chain.
	pub type Index = u32;

	/// A hash of some data used by the chain.
	pub type Hash = sp_core::H256;

	/// The hashing algorithm used.
	pub type Hashing = BlakeTwo256; // added from frame system

	/// Digest item type.
	pub type DigestItem = generic::DigestItem;

	pub type EvmAddressMapping = pallet_evm::HashedAddressMapping<Hashing>;
	pub type EvmBackwardsAddressMapping = up_evm_mapping::MapBackwardsAddressTruncated;

	#[derive(PartialEq, Eq, Clone)]
	pub struct BasicCrossAccountIdConfig;
	impl pallet_common::account::CrossAccountIdConfig for BasicCrossAccountIdConfig {
		type AccountId = AccountId;
		type EvmAddressMapping = EvmAddressMapping;
		type EvmBackwardsAddressMapping = EvmBackwardsAddressMapping;
	}

	pub type CrossAccountId =
		pallet_common::account::BasicCrossAccountId<BasicCrossAccountIdConfig>;
}

/// Common constants of runtimes.
mod constants {
	use super::types::BlockNumber;
	use frame_support::weights::{constants::WEIGHT_PER_SECOND, Weight};
	use sp_runtime::Perbill;
	/// This determines the average expected block time that we are targeting. Blocks will be
	/// produced at a minimum duration defined by `SLOT_DURATION`. `SLOT_DURATION` is picked up by
	/// `pallet_timestamp` which is in turn picked up by `pallet_aura` to implement `fn
	/// slot_duration()`.
	///
	/// Change this to adjust the block time.
	pub const MILLISECS_PER_BLOCK: u64 = 12000;

	pub const SLOT_DURATION: u64 = MILLISECS_PER_BLOCK;

	// These time units are defined in number of blocks.
	pub const MINUTES: BlockNumber = 60_000 / (MILLISECS_PER_BLOCK as BlockNumber);
	pub const HOURS: BlockNumber = MINUTES * 60;
	pub const DAYS: BlockNumber = HOURS * 24;

	/// We assume that ~10% of the block weight is consumed by `on_initalize` handlers.
	/// This is used to limit the maximal weight of a single extrinsic.
	pub const AVERAGE_ON_INITIALIZE_RATIO: Perbill = Perbill::from_percent(10);
	/// We allow `Normal` extrinsics to fill up the block up to 75%, the rest can be used
	/// by  Operational  extrinsics.
	pub const NORMAL_DISPATCH_RATIO: Perbill = Perbill::from_percent(75);
	/// We allow for 2 seconds of compute with a 6 second average block time.
	pub const MAXIMUM_BLOCK_WEIGHT: Weight = WEIGHT_PER_SECOND / 2;

	/// Limiting EVM execution to 50% of block for substrate users and management tasks
	/// EVM transaction consumes more weight than substrate's, so we can't rely on them being
	/// scheduled fairly
	pub const EVM_DISPATCH_RATIO: Perbill = Perbill::from_percent(50);
}

/// Opaque types. These are used by the CLI to instantiate machinery that don't need to know
/// the specifics of the runtime. They can then be made to be agnostic over specific formats
/// of data like extrinsics, allowing for them to continue syncing the network through upgrades
/// to even the core data structures.
pub mod opaque {
	use super::*;
	use sp_runtime::{generic, traits::BlakeTwo256};
	pub use sp_runtime::OpaqueExtrinsic as UncheckedExtrinsic;

	/// Opaque block header type.
	pub type Header = generic::Header<BlockNumber, BlakeTwo256>;
	/// Opaque block type.
	pub type Block = generic::Block<Header, UncheckedExtrinsic>;
	/// Opaque block identifier type.
	pub type BlockId = generic::BlockId<Block>;

	pub type SessionHandlers = ();

	/*
	impl_opaque_keys! {
		pub struct SessionKeys {
			pub aura: Aura,
		}
	}
	*/
}
