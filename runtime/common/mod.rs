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
pub mod instance;
pub mod runtime_apis;
pub mod scheduler;
pub mod sponsoring;
pub mod weights;

use sp_core::H160;
use frame_support::{
	traits::{Currency, OnUnbalanced, Imbalance},
	weights::Weight,
};
use sp_runtime::{
	generic,
	traits::{BlakeTwo256, BlockNumberProvider},
	impl_opaque_keys,
};
use sp_std::vec::Vec;

#[cfg(feature = "std")]
use sp_version::NativeVersion;

use crate::{
	Runtime, Call, Balances, Treasury, Aura, Signature, AllPalletsReversedWithSystemFirst,
	InherentDataExt,
};
use up_common::types::{AccountId, BlockNumber};

#[macro_export]
macro_rules! unsupported {
	() => {
		pallet_common::unsupported!($crate::Runtime)
	};
}

/// The address format for describing accounts.
pub type Address = sp_runtime::MultiAddress<AccountId, ()>;
/// Block header type as expected by this runtime.
pub type Header = generic::Header<BlockNumber, BlakeTwo256>;
/// Block type as expected by this runtime.
pub type Block = generic::Block<Header, UncheckedExtrinsic>;
/// A Block signed with a Justification
pub type SignedBlock = generic::SignedBlock<Block>;
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

pub type ChargeTransactionPayment = pallet_charge_transaction::ChargeTransactionPayment<Runtime>;

pub type SignedExtra = (
	frame_system::CheckSpecVersion<Runtime>,
	// system::CheckTxVersion<Runtime>,
	frame_system::CheckGenesis<Runtime>,
	frame_system::CheckEra<Runtime>,
	frame_system::CheckNonce<Runtime>,
	frame_system::CheckWeight<Runtime>,
	ChargeTransactionPayment,
	//pallet_contract_helpers::ContractHelpersExtension<Runtime>,
	pallet_ethereum::FakeTransactionFinalizer<Runtime>,
);

/// Unchecked extrinsic type as expected by this runtime.
pub type UncheckedExtrinsic =
	fp_self_contained::UncheckedExtrinsic<Address, Call, Signature, SignedExtra>;

/// Extrinsic type that has already been checked.
pub type CheckedExtrinsic = fp_self_contained::CheckedExtrinsic<AccountId, Call, SignedExtra, H160>;

/// Executive: handles dispatch to the various modules.
pub type Executive = frame_executive::Executive<
	Runtime,
	Block,
	frame_system::ChainContext<Runtime>,
	Runtime,
	AllPalletsReversedWithSystemFirst,
	AuraToCollatorSelection,
>;

type NegativeImbalance = <Balances as Currency<AccountId>>::NegativeImbalance;

pub struct DealWithFees;
impl OnUnbalanced<NegativeImbalance> for DealWithFees {
	fn on_unbalanceds<B>(mut fees_then_tips: impl Iterator<Item = NegativeImbalance>) {
		if let Some(fees) = fees_then_tips.next() {
			// for fees, 100% to treasury
			let mut split = fees.ration(100, 0);
			if let Some(tips) = fees_then_tips.next() {
				// for tips, if any, 100% to treasury
				tips.ration_merge_into(100, 0, &mut split);
			}
			Treasury::on_unbalanced(split.0);
			// Author::on_unbalanced(split.1);
		}
	}
}

pub struct RelayChainBlockNumberProvider<T>(sp_std::marker::PhantomData<T>);

impl<T: cumulus_pallet_parachain_system::Config> BlockNumberProvider
	for RelayChainBlockNumberProvider<T>
{
	type BlockNumber = BlockNumber;

	fn current_block_number() -> Self::BlockNumber {
		cumulus_pallet_parachain_system::Pallet::<T>::validation_data()
			.map(|d| d.relay_parent_number)
			.unwrap_or_default()
	}
}

pub(crate) struct CheckInherents;

impl cumulus_pallet_parachain_system::CheckInherents<Block> for CheckInherents {
	fn check_inherents(
		block: &Block,
		relay_state_proof: &cumulus_pallet_parachain_system::RelayChainStateProof,
	) -> sp_inherents::CheckInherentsResult {
		let relay_chain_slot = relay_state_proof
			.read_slot()
			.expect("Could not read the relay chain slot from the proof");

		let inherent_data =
			cumulus_primitives_timestamp::InherentDataProvider::from_relay_chain_slot_and_duration(
				relay_chain_slot,
				sp_std::time::Duration::from_secs(6),
			)
			.create_inherent_data()
			.expect("Could not create the timestamp inherent data");

		inherent_data.check_extrinsics(block)
	}
}

#[derive(codec::Encode, codec::Decode)]
pub enum XCMPMessage<XAccountId, XBalance> {
	/// Transfer tokens to the given account from the Parachain account.
	TransferToken(XAccountId, XBalance),
}

pub struct AuraToCollatorSelection;
impl frame_support::traits::OnRuntimeUpgrade for AuraToCollatorSelection {
	fn on_runtime_upgrade() -> Weight {
		use frame_support::{BoundedVec, storage::migration};
		use sp_runtime::{
			traits::{OpaqueKeys, Saturating},
			RuntimeAppPublic,
		};
		use pallet_session::SessionManager;
		use up_common::constants::EXISTENTIAL_DEPOSIT;
		use crate::config::substrate::MaxInvulnerables;

		let mut weight = <Runtime as frame_system::Config>::DbWeight::get().reads(1);

		let version =
			migration::get_storage_value::<()>(b"AuraToCollatorSelection", b"StorageVersion", &[]);

		let should_upgrade = match version {
			None => true,
			Some(_) => false,
		};

		if should_upgrade {
			log::info!(
				target: "runtime::aura_to_collator_selection",
				"Running migration of Aura authorities to Collator Selection invulnerables"
			);

			let invulnerables = pallet_aura::Pallet::<Runtime>::authorities()
				.iter()
				.cloned()
				.filter_map(|authority_id| {
					weight.saturating_accrue(<Runtime as frame_system::Config>::DbWeight::get().reads_writes(1, 1));
					let vec = authority_id.clone().to_raw_vec();
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

			let bounded_invulnerables = BoundedVec::<_, MaxInvulnerables>::try_from(
				invulnerables
					.iter()
					.cloned()
					.map(|(acc, _)| acc)
					.collect::<Vec<_>>(),
			)
			.expect("Existing collators/invulnerables are more than MaxInvulnerables");

			<pallet_collator_selection::Invulnerables<Runtime>>::put(bounded_invulnerables);
			<pallet_collator_selection::DesiredCandidates<Runtime>>::put(0);
			<pallet_collator_selection::CandidacyBond<Runtime>>::put(EXISTENTIAL_DEPOSIT * 16);

			let keys = invulnerables
				.into_iter()
				.map(|(acc, aura)| {
					(
						acc.clone(),                        // account id
						acc,                                // validator id
						SessionKeys { aura: aura.clone() }, // session keys
					)
				})
				.collect::<Vec<_>>();

			for (account, val, keys) in keys.iter().cloned() {
				for id in <Runtime as pallet_session::Config>::Keys::key_ids() {
					<pallet_session::KeyOwner<Runtime>>::insert((*id, keys.get_raw(*id)), &val)
				}
				<pallet_session::NextKeys<Runtime>>::insert(&val, &keys);
				// todo exercise caution, the following is taken from genesis
				if frame_system::Pallet::<Runtime>::inc_consumers_without_limit(&account).is_err() {
					log::warn!(
						"We have entered an error with incrementing consumers without limit during the migration"
					);
					// This will leak a provider reference, however it only happens once (at
					// genesis) so it's really not a big deal and we assume that the user wants to
					// do this since it's the only way a non-endowed account can contain a session
					// key.
					frame_system::Pallet::<Runtime>::inc_providers(&account);
				}
			}

			let initial_validators_0 =
				<Runtime as pallet_session::Config>::SessionManager::new_session(0).unwrap_or_else(
					|| {
						frame_support::print(
							"No initial validator provided by `SessionManager`, use \
						session config keys to generate initial validator set.",
						);
						keys.iter().map(|x| x.1.clone()).collect()
					},
				);
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
}
