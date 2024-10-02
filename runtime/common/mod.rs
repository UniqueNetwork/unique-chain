// Copyright 2019-2022 Unique Network (Gibraltar) Ltd.
// This file is part of Unique Network.

// Unique Network is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// Unique Network is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with Unique Network. If not, see <http://www.gnu.org/licenses/>.

pub mod config;
pub mod construct_runtime;
pub mod dispatch;
pub mod ethereum;
pub mod identity;
pub mod instance;
pub mod maintenance;
pub mod runtime_apis;

pub mod sponsoring;
#[allow(missing_docs)]
pub mod weights;

#[cfg(test)]
pub mod tests;

use frame_support::{
	pallet_prelude::{GetStorageVersion, PalletInfoAccess},
	parameter_types,
	traits::{Currency, OnRuntimeUpgrade, PalletInfo, StorageVersion},
	weights::Weight,
};
use sp_core::Get;
use sp_runtime::{
	generic, impl_opaque_keys,
	traits::{BlakeTwo256, BlockNumberProvider},
};
use sp_std::{marker::PhantomData, vec::Vec};
#[cfg(feature = "std")]
use sp_version::NativeVersion;
use up_common::types::{AccountId, BlockNumber};

use crate::{AllPalletsWithSystem, Aura, Balances, Runtime, RuntimeCall, Signature, Treasury};

#[macro_export]
macro_rules! unsupported {
	() => {
		pallet_common::unsupported!($crate::Runtime)
	};
}

/// The address format for describing accounts.
pub type Address = sp_runtime::MultiAddress<AccountId, ()>;
/// A Block signed with a Justification
pub type SignedBlock = generic::SignedBlock<Block>;
/// Frontier wrapped extrinsic
pub type UncheckedExtrinsic =
	fp_self_contained::UncheckedExtrinsic<Address, RuntimeCall, Signature, SignedExtra>;
/// Header type.
pub type Header = generic::Header<BlockNumber, BlakeTwo256>;
/// Block type.
pub type Block = generic::Block<Header, UncheckedExtrinsic>;
/// BlockId type as expected by this runtime.
pub type BlockId = generic::BlockId<Block>;

impl_opaque_keys! {
	pub struct SessionKeys {
		pub aura: Aura,
	}
}

/// The version information used to identify this runtime when compiled natively.
#[cfg(feature = "std")]
pub fn native_version() -> NativeVersion {
	NativeVersion {
		runtime_version: crate::VERSION,
		can_author_with: Default::default(),
	}
}

pub type SignedExtra = (
	frame_system::CheckSpecVersion<Runtime>,
	frame_system::CheckTxVersion<Runtime>,
	frame_system::CheckGenesis<Runtime>,
	frame_system::CheckEra<Runtime>,
	pallet_charge_transaction::CheckNonce<Runtime>,
	frame_system::CheckWeight<Runtime>,
	maintenance::CheckMaintenance,
	identity::DisableIdentityCalls,
	pallet_charge_transaction::ChargeTransactionPayment<Runtime>,
	//pallet_contract_helpers::ContractHelpersExtension<Runtime>,
	pallet_ethereum::FakeTransactionFinalizer<Runtime>,
	frame_metadata_hash_extension::CheckMetadataHash<Runtime>,
);

/// Executive: handles dispatch to the various modules.
pub type Executive = frame_executive::Executive<
	Runtime,
	Block,
	frame_system::ChainContext<Runtime>,
	Runtime,
	AllPalletsWithSystem,
	Migrations,
>;

type NegativeImbalance = <Balances as Currency<AccountId>>::NegativeImbalance;

pub(crate) type DealWithFees = Treasury;

pub struct RelayChainBlockNumberProvider<T>(sp_std::marker::PhantomData<T>);

impl<T: cumulus_pallet_parachain_system::Config> BlockNumberProvider
	for RelayChainBlockNumberProvider<T>
{
	type BlockNumber = BlockNumber;

	fn current_block_number() -> Self::BlockNumber {
		cumulus_pallet_parachain_system::RelaychainDataProvider::<T>::current_block_number()
	}
	#[cfg(feature = "runtime-benchmarks")]
	fn set_block_number(block: Self::BlockNumber) {
		cumulus_pallet_parachain_system::RelaychainDataProvider::<T>::set_block_number(block)
	}
}

#[derive(parity_scale_codec::Encode, parity_scale_codec::Decode)]
pub enum XCMPMessage<XAccountId, XBalance> {
	/// Transfer tokens to the given account from the Parachain account.
	TransferToken(XAccountId, XBalance),
}

/// All migrations that will run on the next runtime upgrade.
pub type Migrations = (Unreleased, AuraToCollatorSelection);

parameter_types! {
	pub const PalletPreimageBaseStorageVersion: StorageVersion = StorageVersion::new(0);
	pub const PalletPreimageTargetStorageVersion: StorageVersion = StorageVersion::new(1);

	pub const PalletCollectiveBaseStorageVersion: StorageVersion = StorageVersion::new(0);
	pub const PalletCollectiveTargetStorageVersion: StorageVersion = StorageVersion::new(4);

	pub const PalletMembershipBaseStorageVersion: StorageVersion = StorageVersion::new(0);
	pub const PalletMembershipTargetStorageVersion: StorageVersion = StorageVersion::new(4);
}

/// All migrations that will need to be removed after the current release.
pub type Unreleased = (
	// Workaround to fix the pallet_preimage version mismatch
	// with what is stored on the chain.
	//
	// Preimage pallet was added when we used Polkadot SDK v0.9.37, but
	// the migration provided by the pallet_preimage hasn't been applied.
	//
	// However, the migration provided by the pallet_preimage is unnecessary since
	// we used the actual v1 types from the beginning. We only need to align
	// the reported storage version with the actual format on the chain (already v1).
	PalletVersionMigration<
		Runtime,
		crate::Preimage,
		PalletPreimageBaseStorageVersion,
		PalletPreimageTargetStorageVersion,
	>,
	// Workaround for pallet_collective.
	//
	// Migrations in this pallet are only needed for renaming
	// (moving from the old name to the new) and bumping the version from 0 to 4.
	// The storage remains unchanged.
	//
	// In our case, we only need to bump the version, without renaming.
	PalletVersionMigration<
		Runtime,
		crate::Council,
		PalletCollectiveBaseStorageVersion,
		PalletCollectiveTargetStorageVersion,
	>,
	PalletVersionMigration<
		Runtime,
		crate::TechnicalCommittee,
		PalletCollectiveBaseStorageVersion,
		PalletCollectiveTargetStorageVersion,
	>,
	// Workaround for pallet_membership.
	//
	// Migrations in this pallet are only needed for renaming
	// (moving from the old name to the new) and bumping the version from 0 to 4.
	// The storage remains unchanged.
	//
	// In our case, we only need to bump the version, without renaming.
	PalletVersionMigration<
		Runtime,
		crate::CouncilMembership,
		PalletMembershipBaseStorageVersion,
		PalletMembershipTargetStorageVersion,
	>,
	PalletVersionMigration<
		Runtime,
		crate::TechnicalCommitteeMembership,
		PalletMembershipBaseStorageVersion,
		PalletMembershipTargetStorageVersion,
	>,
	// Parity migrations
	pallet_balances::migration::MigrateManyToTrackInactive<Runtime, ()>,
	pallet_democracy::migrations::v1::v1::Migration<Runtime>,
	pallet_referenda::migration::v1::MigrateV0ToV1<Runtime>,
	cumulus_pallet_xcmp_queue::migration::v4::MigrationToV4<Runtime>,
	cumulus_pallet_xcmp_queue::migration::v5::MigrateV4ToV5<Runtime>,
	pallet_xcm::migration::v1::MigrateToV1<Runtime>,
);

pub struct PalletVersionMigration<T, P, Base, Target>(PhantomData<(T, P, Base, Target)>);

impl<T, P, Base, Target> OnRuntimeUpgrade for PalletVersionMigration<T, P, Base, Target>
where
	T: frame_system::Config,
	P: GetStorageVersion + PalletInfoAccess + 'static,
	Base: Get<StorageVersion>,
	Target: Get<StorageVersion>,
{
	fn on_runtime_upgrade() -> Weight {
		let pallet_name = T::PalletInfo::name::<P>().unwrap();
		let base_version = Base::get();
		let target_version = Target::get();

		let mut weight = T::DbWeight::get().reads(1);

		if StorageVersion::get::<P>() == base_version {
			log::info!("🚚 Pallet \"{pallet_name}\" migrating version from {base_version:?} to {target_version:?}");

			target_version.put::<P>();
			weight += T::DbWeight::get().writes(1);
		}

		weight
	}
}

pub struct AuraToCollatorSelection;
impl OnRuntimeUpgrade for AuraToCollatorSelection {
	fn on_runtime_upgrade() -> Weight {
		#[cfg(feature = "collator-selection")]
		{
			use frame_support::{storage::migration, BoundedVec};
			use pallet_session::SessionManager;
			use sp_runtime::RuntimeAppPublic;

			use crate::config::pallets::MaxCollators;

			let mut weight = <Runtime as frame_system::Config>::DbWeight::get().reads(1);

			let version = migration::get_storage_value::<()>(
				b"AuraToCollatorSelection",
				b"StorageVersion",
				&[],
			);

			let should_upgrade = version.is_none();

			if should_upgrade {
				log::info!(
					target: "runtime::aura_to_collator_selection",
					"Running migration of Aura authorities to Collator Selection invulnerables"
				);

				let invulnerables = pallet_aura::Authorities::<Runtime>::get()
					.iter()
					.cloned()
					.filter_map(|authority_id| {
						weight.saturating_accrue(<Runtime as frame_system::Config>::DbWeight::get().reads_writes(1, 1));
						let vec = authority_id.to_raw_vec();
						let slice = vec.as_slice();
						let array: Option<[u8; 32]> = match slice.try_into() {
							Ok(a) => Some(a),
							Err(_) => {
								log::error!("Failed to convert an Aura authority to a Collator Selection invulnerable: {:?}", authority_id);
								None
							},
						};
						array.map(|a| (AccountId::from(a), authority_id))
					})
					.collect::<Vec<_>>();

				let bounded_invulnerables = BoundedVec::<_, MaxCollators>::try_from(
					invulnerables
						.iter()
						.cloned()
						.map(|(acc, _)| acc)
						.collect::<Vec<_>>(),
				)
				.expect("Existing collators/invulnerables are more than MaxCollators");

				<pallet_collator_selection::Invulnerables<Runtime>>::put(bounded_invulnerables);

				let keys = invulnerables
					.into_iter()
					.map(|(acc, aura)| {
						(
							acc.clone(),          // account id
							acc,                  // validator id
							SessionKeys { aura }, // session keys
						)
					})
					.collect::<Vec<_>>();

				for (account, val, keys) in keys.iter() {
					use sp_runtime::traits::OpaqueKeys;
					for id in <Runtime as pallet_session::Config>::Keys::key_ids() {
						<pallet_session::KeyOwner<Runtime>>::insert((*id, keys.get_raw(*id)), val)
					}
					<pallet_session::NextKeys<Runtime>>::insert(val, keys);
					// todo exercise caution, the following is taken from genesis
					if frame_system::Pallet::<Runtime>::inc_consumers_without_limit(account)
						.is_err()
					{
						log::warn!(
							"We have entered an error with incrementing consumers without limit during the migration"
						);
						// This will leak a provider reference, however it only happens once (at
						// genesis) so it's really not a big deal and we assume that the user wants to
						// do this since it's the only way a non-endowed account can contain a session
						// key.
						frame_system::Pallet::<Runtime>::inc_providers(account);
					}
				}

				let initial_validators_0 =
					<Runtime as pallet_session::Config>::SessionManager::new_session(0)
						.unwrap_or_else(|| {
							frame_support::print(
								"No initial validator provided by `SessionManager`, use \
							session config keys to generate initial validator set.",
							);
							keys.iter().map(|x| x.1.clone()).collect()
						});
				/*assert!(
					!initial_validators_0.is_empty(),
					"Empty validator set for session 0 in (pseudo) genesis block!"
				);*/

				let initial_validators_1 =
					<Runtime as pallet_session::Config>::SessionManager::new_session(1)
						.unwrap_or_else(|| initial_validators_0.clone());
				/*assert!(
					!initial_validators_1.is_empty(),
					"Empty validator set for session 1 in (pseudo) genesis block!"
				);*/

				let queued_keys: Vec<_> = initial_validators_1
					.iter()
					.cloned()
					.map(|v| {
						(
							v.clone(),
							<pallet_session::NextKeys<Runtime>>::get(&v)
								.expect("Validator in session 1 missing keys!"),
						)
					})
					.collect();

				// Tell everyone about the genesis session keys -- Aura must've already initialized it
				//<Runtime as pallet_session::Config>::SessionHandler::on_genesis_session::<<Runtime as pallet_session::Config>::Keys>(&queued_keys);

				<pallet_session::Validators<Runtime>>::put(initial_validators_0);
				<pallet_session::QueuedKeys<Runtime>>::put(queued_keys);

				<Runtime as pallet_session::Config>::SessionManager::start_session(0);

				log::info!(
					target: "runtime::aura_to_collator_selection",
					"Migration of Aura authorities to Collator Selection invulnerables is complete."
				);

				migration::put_storage_value::<()>(
					b"AuraToCollatorSelection",
					b"StorageVersion",
					&[],
					(),
				);

				weight += <Runtime as frame_system::Config>::DbWeight::get().writes(1)
			} else {
				log::info!(
					target: "runtime::aura_to_collator_selection",
					"The storage migration has already been flagged as complete. No migration needs to be done.",
				);
			}

			weight
		}

		#[cfg(not(feature = "collator-selection"))]
		{
			Weight::zero()
		}
	}
}
