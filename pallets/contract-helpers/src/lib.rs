#![cfg_attr(not(feature = "std"), no_std)]

pub use pallet::*;

#[frame_support::pallet]
pub mod pallet {
	use frame_support::sp_runtime::traits::StaticLookup;
	use frame_support::{pallet_prelude::*, traits::IsSubType};
	use frame_system::pallet_prelude::*;
	use pallet_contracts::chain_extension::UncheckedFrom;
	use sp_runtime::{
		traits::{DispatchInfoOf, Hash, PostDispatchInfoOf, SignedExtension},
		transaction_validity,
	};
	use sp_std::vec::Vec;
	use up_sponsorship::SponsorshipHandler;

	#[pallet::error]
	pub enum Error<T> {
		/// Should be contract owner
		NoPermission,
	}

	#[pallet::config]
	pub trait Config: frame_system::Config + pallet_contracts::Config {}

	#[pallet::pallet]
	#[pallet::generate_store(pub(super) trait Store)]
	pub struct Pallet<T>(_);

	#[pallet::storage]
	pub(super) type Owner<T: Config> = StorageMap<
		Hasher = Twox128,
		Key = T::AccountId,
		Value = T::AccountId,
		QueryKind = ValueQuery,
	>;

	#[pallet::storage]
	pub(super) type AllowlistEnabled<T: Config> =
		StorageMap<Hasher = Twox128, Key = T::AccountId, Value = bool, QueryKind = ValueQuery>;

	#[pallet::storage]
	pub(super) type Allowlist<T: Config> = StorageDoubleMap<
		Hasher1 = Twox128,
		Key1 = T::AccountId,
		Hasher2 = Twox64Concat,
		Key2 = T::AccountId,
		Value = bool,
		QueryKind = ValueQuery,
	>;

	#[pallet::storage]
	pub(super) type SelfSponsoring<T: Config> =
		StorageMap<Hasher = Twox128, Key = T::AccountId, Value = bool, QueryKind = ValueQuery>;

	#[pallet::storage]
	pub(super) type SponsoringRateLimit<T: Config> = StorageMap<
		Hasher = Twox128,
		Key = T::AccountId,
		Value = T::BlockNumber,
		QueryKind = ValueQuery,
	>;

	#[pallet::storage]
	pub(super) type SponsorBasket<T: Config> = StorageDoubleMap<
		Hasher1 = Twox128,
		Key1 = T::AccountId,
		Hasher2 = Twox128,
		Key2 = T::AccountId,
		Value = T::BlockNumber,
		QueryKind = ValueQuery,
	>;

	#[pallet::call]
	impl<T: Config> Pallet<T> {
		#[pallet::weight(0)]
		fn toggle_sponsoring(
			origin: OriginFor<T>,
			contract: T::AccountId,
			sponsoring: bool,
		) -> DispatchResult {
			let sender = ensure_signed(origin)?;
			ensure!(
				<Owner<T>>::get(&contract) == sender,
				<Error<T>>::NoPermission
			);

			if sponsoring {
				<SelfSponsoring<T>>::insert(contract, true);
			} else {
				<SelfSponsoring<T>>::remove(contract);
			}
			Ok(())
		}

		#[pallet::weight(0)]
		fn toggle_allowlist(
			origin: OriginFor<T>,
			contract: T::AccountId,
			enabled: bool,
		) -> DispatchResult {
			let sender = ensure_signed(origin)?;
			ensure!(
				<Owner<T>>::get(&contract) == sender,
				<Error<T>>::NoPermission
			);

			if enabled {
				<AllowlistEnabled<T>>::insert(contract, true);
			} else {
				<AllowlistEnabled<T>>::remove(contract);
			}
			Ok(())
		}

		#[pallet::weight(0)]
		fn toggle_allowed(
			origin: OriginFor<T>,
			contract: T::AccountId,
			user: T::AccountId,
			allowed: bool,
		) -> DispatchResult {
			let sender = ensure_signed(origin)?;
			ensure!(
				<Owner<T>>::get(&contract) == sender,
				<Error<T>>::NoPermission
			);

			if allowed {
				<Allowlist<T>>::insert(contract, user, true);
			} else {
				<Allowlist<T>>::remove(contract, user);
			}
			Ok(())
		}

		#[pallet::weight(0)]
		fn set_sponsoring_rate_limit(
			origin: OriginFor<T>,
			contract: T::AccountId,
			rate_limit: T::BlockNumber,
		) -> DispatchResult {
			let sender = ensure_signed(origin)?;
			ensure!(
				<Owner<T>>::get(&contract) == sender,
				<Error<T>>::NoPermission
			);

			<SponsoringRateLimit<T>>::insert(contract, rate_limit);
			Ok(())
		}
	}

	#[derive(Encode, Decode, Clone, PartialEq, Eq)]
	pub struct ContractHelpersExtension<T>(PhantomData<T>);
	impl<T> core::fmt::Debug for ContractHelpersExtension<T> {
		fn fmt(&self, fmt: &mut core::fmt::Formatter<'_>) -> Result<(), core::fmt::Error> {
			fmt.debug_struct("ContractHelpersExtension").finish()
		}
	}

	type CodeHash<T> = <T as frame_system::Config>::Hash;
	impl<T> SignedExtension for ContractHelpersExtension<T>
	where
		T: Config + Send + Sync,
		T::Call: sp_runtime::traits::Dispatchable,
		T::Call: IsSubType<pallet_contracts::Call<T>>,
		T::AccountId: UncheckedFrom<T::Hash>,
		T::AccountId: AsRef<[u8]>,
	{
		const IDENTIFIER: &'static str = "ContractHelpers";
		type AccountId = T::AccountId;
		type Call = T::Call;
		type AdditionalSigned = ();
		type Pre = Option<(Self::AccountId, CodeHash<T>, Vec<u8>)>;

		fn additional_signed(&self) -> Result<(), transaction_validity::TransactionValidityError> {
			Ok(())
		}

		fn validate(
			&self,
			who: &T::AccountId,
			call: &Self::Call,
			_info: &DispatchInfoOf<Self::Call>,
			_len: usize,
		) -> transaction_validity::TransactionValidity {
			if let Some(pallet_contracts::Call::call(dest, _value, _gas_limit, _data)) =
				IsSubType::<pallet_contracts::Call<T>>::is_sub_type(call)
			{
				let called_contract: T::AccountId =
					T::Lookup::lookup((*dest).clone()).unwrap_or_default();
				if <AllowlistEnabled<T>>::get(&called_contract)
					&& !<Allowlist<T>>::get(&called_contract, who)
					&& &<Owner<T>>::get(&called_contract) != who
				{
					return Err(transaction_validity::InvalidTransaction::Call.into());
				}
			}
			Ok(transaction_validity::ValidTransaction::default())
		}

		fn pre_dispatch(
			self,
			who: &Self::AccountId,
			call: &Self::Call,
			_info: &DispatchInfoOf<Self::Call>,
			_len: usize,
		) -> Result<Self::Pre, TransactionValidityError> {
			match IsSubType::<pallet_contracts::Call<T>>::is_sub_type(call) {
				Some(pallet_contracts::Call::instantiate(_, _, code_hash, _, salt)) => {
					Ok(Some((who.clone(), *code_hash, salt.clone())))
				}
				Some(pallet_contracts::Call::instantiate_with_code(_, _, code, _, salt)) => {
					let code_hash = &T::Hashing::hash(code);
					Ok(Some((who.clone(), *code_hash, salt.clone())))
				}
				_ => Ok(None),
			}
		}

		fn post_dispatch(
			pre: Self::Pre,
			_info: &DispatchInfoOf<Self::Call>,
			_post_info: &PostDispatchInfoOf<Self::Call>,
			_len: usize,
			_result: &DispatchResult,
		) -> Result<(), TransactionValidityError> {
			if let Some((who, code_hash, salt)) = pre {
				let new_contract_address =
					<pallet_contracts::Pallet<T>>::contract_address(&who, &code_hash, &salt);
				<Owner<T>>::insert(&new_contract_address, &who);
			}

			Ok(())
		}
	}

	pub struct ContractSponsorshipHandler<T>(PhantomData<T>);
	impl<T, C> SponsorshipHandler<T::AccountId, C> for ContractSponsorshipHandler<T>
	where
		T: Config,
		C: IsSubType<pallet_contracts::Call<T>>,
		T::AccountId: UncheckedFrom<T::Hash>,
		T::AccountId: AsRef<[u8]>,
	{
		fn get_sponsor(who: &T::AccountId, call: &C) -> Option<T::AccountId> {
			if let Some(pallet_contracts::Call::call(dest, _value, _gas_limit, _data)) =
				IsSubType::<pallet_contracts::Call<T>>::is_sub_type(call)
			{
				let called_contract: T::AccountId =
					T::Lookup::lookup((*dest).clone()).unwrap_or_default();
				if <SelfSponsoring<T>>::get(&called_contract) {
					let last_tx_block = SponsorBasket::<T>::get(&called_contract, &who);
					let block_number = <frame_system::Pallet<T>>::block_number() as T::BlockNumber;
					let rate_limit = SponsoringRateLimit::<T>::get(&called_contract);
					let limit_time = last_tx_block + rate_limit;

					if block_number >= limit_time {
						SponsorBasket::<T>::insert(&called_contract, who, block_number);
						return Some(called_contract);
					}
				}
			}
			None
		}
	}
}
