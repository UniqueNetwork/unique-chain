#![cfg_attr(not(feature = "std"), no_std)]

pub use pallet::*;
#[cfg(feature = "runtime-benchmarks")]
pub mod benchmarking;
pub mod weights;

#[frame_support::pallet]
pub mod pallet {
	use frame_support::{pallet_prelude::*, transactional};
	use frame_system::pallet_prelude::*;
	use sp_core::{H160, H256};
	use sp_std::vec::Vec;
	use super::weights::WeightInfo;

	#[pallet::config]
	pub trait Config: frame_system::Config + pallet_evm::Config {
		type WeightInfo: WeightInfo;
	}

	type SelfWeightOf<T> = <T as Config>::WeightInfo;

	#[pallet::pallet]
	#[pallet::generate_store(pub(super) trait Store)]
	pub struct Pallet<T>(_);

	#[pallet::error]
	pub enum Error<T> {
		AccountNotEmpty,
		AccountIsNotMigrating,
	}

	#[pallet::storage]
	pub(super) type MigrationPending<T: Config> =
		StorageMap<Hasher = Twox64Concat, Key = H160, Value = bool, QueryKind = ValueQuery>;

	#[pallet::call]
	impl<T: Config> Pallet<T> {
		#[pallet::weight(<SelfWeightOf<T>>::begin())]
		pub fn begin(origin: OriginFor<T>, address: H160) -> DispatchResult {
			ensure_root(origin)?;
			ensure!(
				<pallet_evm::Pallet<T>>::is_account_empty(&address)
					&& !<MigrationPending<T>>::get(&address),
				<Error<T>>::AccountNotEmpty,
			);

			<MigrationPending<T>>::insert(address, true);
			Ok(())
		}

		#[pallet::weight(<SelfWeightOf<T>>::set_data(data.len() as u32))]
		pub fn set_data(
			origin: OriginFor<T>,
			address: H160,
			data: Vec<(H256, H256)>,
		) -> DispatchResult {
			ensure_root(origin)?;
			ensure!(
				<MigrationPending<T>>::get(&address),
				<Error<T>>::AccountIsNotMigrating,
			);

			for (k, v) in data {
				<pallet_evm::AccountStorages<T>>::insert(&address, k, v);
			}
			Ok(())
		}

		#[pallet::weight(<SelfWeightOf<T>>::finish(code.len() as u32))]
		#[transactional]
		pub fn finish(origin: OriginFor<T>, address: H160, code: Vec<u8>) -> DispatchResult {
			ensure_root(origin)?;
			ensure!(
				<MigrationPending<T>>::get(&address),
				<Error<T>>::AccountIsNotMigrating,
			);

			<pallet_evm::AccountCodes<T>>::insert(&address, code);
			<MigrationPending<T>>::remove(address);
			Ok(())
		}
	}

	pub struct OnMethodCall<T>(PhantomData<T>);
	impl<T: Config> pallet_evm::OnMethodCall<T> for OnMethodCall<T> {
		fn is_reserved(contract: &H160) -> bool {
			<MigrationPending<T>>::get(&contract)
		}

		fn is_used(_contract: &H160) -> bool {
			false
		}

		fn call(
			_source: &H160,
			_arget: &H160,
			_gas_left: u64,
			_input: &[u8],
			_value: sp_core::U256,
		) -> Option<pallet_evm::PrecompileOutput> {
			None
		}

		fn get_code(_contract: &H160) -> Option<Vec<u8>> {
			None
		}
	}
}
