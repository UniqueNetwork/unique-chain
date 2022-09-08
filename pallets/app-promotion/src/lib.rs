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

//! # App promotion
//!
//! The app promotion pallet is designed to ... .
//!
//! ## Interface
//!
//! ### Dispatchable Functions
//!

// #![recursion_limit = "1024"]
#![cfg_attr(not(feature = "std"), no_std)]

#[cfg(feature = "runtime-benchmarks")]
mod benchmarking;

pub mod types;
pub mod weights;

use sp_std::{
	vec::{Vec},
	vec,
	iter::Sum,
	borrow::ToOwned,
	cell::RefCell,
};
use sp_core::H160;
use codec::EncodeLike;
use pallet_balances::BalanceLock;
pub use types::*;

use up_data_structs::CollectionId;

use frame_support::{
	dispatch::{DispatchResult},
	traits::{
		Currency, Get, LockableCurrency, WithdrawReasons, tokens::Balance, ExistenceRequirement,
	},
	ensure,
};

use weights::WeightInfo;

pub use pallet::*;
use pallet_evm::account::CrossAccountId;
use sp_runtime::{
	Perbill,
	traits::{BlockNumberProvider, CheckedAdd, CheckedSub, AccountIdConversion, Zero},
	ArithmeticError,
};

pub const LOCK_IDENTIFIER: [u8; 8] = *b"appstake";

const PENDING_LIMIT_PER_BLOCK: u32 = 3;

type BalanceOf<T> =
	<<T as Config>::Currency as Currency<<T as frame_system::Config>::AccountId>>::Balance;

#[frame_support::pallet]
pub mod pallet {
	use super::*;
	use frame_support::{
		Blake2_128Concat, Twox64Concat, pallet_prelude::*, storage::Key, PalletId,
		traits::ReservableCurrency,
	};
	use frame_system::pallet_prelude::*;

	#[pallet::config]
	pub trait Config: frame_system::Config + pallet_evm::account::Config {
		/// Type to interact with the native token
		type Currency: ExtendedLockableCurrency<Self::AccountId>
			+ ReservableCurrency<Self::AccountId>;

		/// Type for interacting with collections
		type CollectionHandler: CollectionHandler<
			AccountId = Self::AccountId,
			CollectionId = CollectionId,
		>;

		/// Type for interacting with conrtacts
		type ContractHandler: ContractHandler<AccountId = Self::CrossAccountId, ContractId = H160>;

		/// ID for treasury
		type TreasuryAccountId: Get<Self::AccountId>;

		/// The app's pallet id, used for deriving its sovereign account ID.
		#[pallet::constant]
		type PalletId: Get<PalletId>;

		/// In relay blocks.
		#[pallet::constant]
		type RecalculationInterval: Get<Self::BlockNumber>;

		/// In parachain blocks.
		#[pallet::constant]
		type PendingInterval: Get<Self::BlockNumber>;

		/// Rate of return for interval in blocks defined in `RecalculationInterval`.
		#[pallet::constant]
		type IntervalIncome: Get<Perbill>;

		/// Decimals for the `Currency`.
		#[pallet::constant]
		type Nominal: Get<BalanceOf<Self>>;

		/// Weight information for extrinsics in this pallet.
		type WeightInfo: WeightInfo;

		// The relay block number provider
		type RelayBlockNumberProvider: BlockNumberProvider<BlockNumber = Self::BlockNumber>;

		/// Events compatible with [`frame_system::Config::Event`].
		type Event: IsType<<Self as frame_system::Config>::Event> + From<Event<Self>>;
	}

	#[pallet::pallet]
	#[pallet::generate_store(pub(super) trait Store)]
	pub struct Pallet<T>(_);

	#[pallet::event]
	#[pallet::generate_deposit(fn deposit_event)]
	pub enum Event<T: Config> {
		/// Staking recalculation was performed
		///
		/// # Arguments
		/// * AccountId: ID of the staker.
		/// * Balance : recalculation base
		/// * Balance : total income
		StakingRecalculation(
			/// An recalculated staker
			T::AccountId,
			/// Base on which interest is calculated
			BalanceOf<T>,
			/// Amount of accrued interest
			BalanceOf<T>,
		),

		/// Staking was performed
		///
		/// # Arguments
		/// * AccountId: ID of the staker
		/// * Balance : staking amount
		Stake(T::AccountId, BalanceOf<T>),

		/// Unstaking was performed
		///
		/// # Arguments
		/// * AccountId: ID of the staker
		/// * Balance : unstaking amount
		Unstake(T::AccountId, BalanceOf<T>),

		/// The admin was set
		///
		/// # Arguments
		/// * AccountId: ID of the admin
		SetAdmin(T::AccountId),
	}

	#[pallet::error]
	pub enum Error<T> {
		/// Error due to action requiring admin to be set.
		AdminNotSet,
		/// No permission to perform an action.
		NoPermission,
		/// Insufficient funds to perform an action.
		NotSufficientFunds,
		/// Occurs when a pending unstake cannot be added in this block. PENDING_LIMIT_PER_BLOCK` limits exceeded.
		PendingForBlockOverflow,
		/// The error is due to the fact that the collection/contract must already be sponsored in order to perform the action.
		SponsorNotSet,
		/// Errors caused by incorrect actions with a locked balance.
		IncorrectLockedBalanceOperation,
	}

	#[pallet::storage]
	pub type TotalStaked<T: Config> = StorageValue<Value = BalanceOf<T>, QueryKind = ValueQuery>;

	#[pallet::storage]
	pub type Admin<T: Config> = StorageValue<Value = T::AccountId, QueryKind = OptionQuery>;

	/// Amount of tokens staked by account in the blocknumber.
	#[pallet::storage]
	pub type Staked<T: Config> = StorageNMap<
		Key = (
			Key<Blake2_128Concat, T::AccountId>,
			Key<Twox64Concat, T::BlockNumber>,
		),
		Value = (BalanceOf<T>, T::BlockNumber),
		QueryKind = ValueQuery,
	>;
	/// Amount of stakes for an Account
	#[pallet::storage]
	pub type StakesPerAccount<T: Config> =
		StorageMap<_, Blake2_128Concat, T::AccountId, u8, ValueQuery>;

	#[pallet::storage]
	pub type PendingUnstake<T: Config> = StorageMap<
		_,
		Twox64Concat,
		T::BlockNumber,
		BoundedVec<(T::AccountId, BalanceOf<T>), ConstU32<PENDING_LIMIT_PER_BLOCK>>,
		ValueQuery,
	>;

	/// Stores a key for record for which the next revenue recalculation would be performed.
	/// If `None`, then recalculation has not yet been performed or calculations have been completed for all stakers.
	#[pallet::storage]
	#[pallet::getter(fn get_next_calculated_record)]
	pub type NextCalculatedRecord<T: Config> =
		StorageValue<Value = (T::AccountId, T::BlockNumber), QueryKind = OptionQuery>;

	#[pallet::hooks]
	impl<T: Config> Hooks<BlockNumberFor<T>> for Pallet<T> {
		/// Block overflow is impossible due to the fact that the unstake algorithm in on_initialize
		/// implies the execution of a strictly limited number of relatively lightweight operations.
		/// A separate benchmark has been implemented to scale the weight depending on the number of pendings.
		fn on_initialize(current_block_number: T::BlockNumber) -> Weight
		where
			<T as frame_system::Config>::BlockNumber: From<u32>,
		{
			let block_pending = PendingUnstake::<T>::take(current_block_number);
			let counter = block_pending.len() as u32;

			if !block_pending.is_empty() {
				block_pending.into_iter().for_each(|(staker, amount)| {
					<T::Currency as ReservableCurrency<T::AccountId>>::unreserve(&staker, amount);
				});
			}

			T::WeightInfo::on_initialize(counter)
		}
	}

	#[pallet::call]
	impl<T: Config> Pallet<T>
	where
		T::BlockNumber: From<u32> + Into<u32>,
		<<T as Config>::Currency as Currency<T::AccountId>>::Balance: Sum + From<u128>,
	{
		#[pallet::weight(T::WeightInfo::set_admin_address())]
		pub fn set_admin_address(origin: OriginFor<T>, admin: T::CrossAccountId) -> DispatchResult {
			ensure_root(origin)?;

			<Admin<T>>::set(Some(admin.as_sub().to_owned()));

			Self::deposit_event(Event::SetAdmin(admin.as_sub().to_owned()));

			Ok(())
		}

		#[pallet::weight(T::WeightInfo::stake())]
		pub fn stake(staker: OriginFor<T>, amount: BalanceOf<T>) -> DispatchResult {
			let staker_id = ensure_signed(staker)?;

			ensure!(
				StakesPerAccount::<T>::get(&staker_id) < 10,
				Error::<T>::NoPermission
			);

			ensure!(
				amount >= <BalanceOf<T>>::from(100u128) * T::Nominal::get(),
				ArithmeticError::Underflow
			);

			let balance =
				<<T as Config>::Currency as Currency<T::AccountId>>::free_balance(&staker_id);

			<<T as Config>::Currency as Currency<T::AccountId>>::ensure_can_withdraw(
				&staker_id,
				amount,
				WithdrawReasons::all(),
				balance
					.checked_sub(&amount)
					.ok_or(ArithmeticError::Underflow)?,
			)?;

			Self::add_lock_balance(&staker_id, amount)?;

			let block_number = T::RelayBlockNumberProvider::current_block_number();

			let recalculate_after_interval: T::BlockNumber =
				if block_number % T::RecalculationInterval::get() == 0u32.into() {
					1u32.into()
				} else {
					2u32.into()
				};

			let recalc_block = (block_number / T::RecalculationInterval::get()
				+ recalculate_after_interval)
				* T::RecalculationInterval::get();

			<Staked<T>>::insert((&staker_id, block_number), {
				let mut balance_and_recalc_block = <Staked<T>>::get((&staker_id, block_number));
				balance_and_recalc_block.0 = balance_and_recalc_block
					.0
					.checked_add(&amount)
					.ok_or(ArithmeticError::Overflow)?;
				balance_and_recalc_block.1 = recalc_block;
				balance_and_recalc_block
			});

			<TotalStaked<T>>::set(
				<TotalStaked<T>>::get()
					.checked_add(&amount)
					.ok_or(ArithmeticError::Overflow)?,
			);

			StakesPerAccount::<T>::mutate(&staker_id, |stakes| *stakes += 1);

			Self::deposit_event(Event::Stake(staker_id, amount));

			Ok(())
		}

		#[pallet::weight(T::WeightInfo::unstake())]
		pub fn unstake(staker: OriginFor<T>) -> DispatchResultWithPostInfo {
			let staker_id = ensure_signed(staker)?;
			let block = <frame_system::Pallet<T>>::block_number() + T::PendingInterval::get();
			let mut pendings = <PendingUnstake<T>>::get(block);

			ensure!(!pendings.is_full(), Error::<T>::PendingForBlockOverflow);

			let mut total_stakes = 0u64;

			let total_staked: BalanceOf<T> = Staked::<T>::drain_prefix((&staker_id,))
				.map(|(_, (amount, _))| {
					total_stakes += 1;
					amount
				})
				.sum();

			if total_staked.is_zero() {
				return Ok(None.into()); // TO-DO
			}

			pendings
				.try_push((staker_id.clone(), total_staked))
				.map_err(|_| Error::<T>::PendingForBlockOverflow)?;

			<PendingUnstake<T>>::insert(block, pendings);

			Self::unlock_balance(&staker_id, total_staked)?;

			<T::Currency as ReservableCurrency<T::AccountId>>::reserve(&staker_id, total_staked)?;

			TotalStaked::<T>::set(
				TotalStaked::<T>::get()
					.checked_sub(&total_staked)
					.ok_or(ArithmeticError::Underflow)?,
			);

			StakesPerAccount::<T>::remove(&staker_id);

			Self::deposit_event(Event::Unstake(staker_id, total_staked));

			Ok(None.into())
		}

		#[pallet::weight(T::WeightInfo::sponsor_collection())]
		pub fn sponsor_collection(
			admin: OriginFor<T>,
			collection_id: CollectionId,
		) -> DispatchResult {
			let admin_id = ensure_signed(admin)?;
			ensure!(
				admin_id == Admin::<T>::get().ok_or(Error::<T>::AdminNotSet)?,
				Error::<T>::NoPermission
			);

			T::CollectionHandler::set_sponsor(Self::account_id(), collection_id)
		}
		#[pallet::weight(T::WeightInfo::stop_sponsoring_collection())]
		pub fn stop_sponsoring_collection(
			admin: OriginFor<T>,
			collection_id: CollectionId,
		) -> DispatchResult {
			let admin_id = ensure_signed(admin)?;

			ensure!(
				admin_id == Admin::<T>::get().ok_or(Error::<T>::AdminNotSet)?,
				Error::<T>::NoPermission
			);

			ensure!(
				T::CollectionHandler::sponsor(collection_id)?.ok_or(<Error<T>>::SponsorNotSet)?
					== Self::account_id(),
				<Error<T>>::NoPermission
			);
			T::CollectionHandler::remove_collection_sponsor(collection_id)
		}

		#[pallet::weight(T::WeightInfo::sponsor_contract())]
		pub fn sponsor_contract(admin: OriginFor<T>, contract_id: H160) -> DispatchResult {
			let admin_id = ensure_signed(admin)?;

			ensure!(
				admin_id == Admin::<T>::get().ok_or(Error::<T>::AdminNotSet)?,
				Error::<T>::NoPermission
			);

			T::ContractHandler::set_sponsor(
				T::CrossAccountId::from_sub(Self::account_id()),
				contract_id,
			)
		}

		#[pallet::weight(T::WeightInfo::stop_sponsoring_contract())]
		pub fn stop_sponsoring_contract(admin: OriginFor<T>, contract_id: H160) -> DispatchResult {
			let admin_id = ensure_signed(admin)?;

			ensure!(
				admin_id == Admin::<T>::get().ok_or(Error::<T>::AdminNotSet)?,
				Error::<T>::NoPermission
			);

			ensure!(
				T::ContractHandler::sponsor(contract_id)?
					.ok_or(<Error<T>>::SponsorNotSet)?
					.as_sub() == &Self::account_id(),
				<Error<T>>::NoPermission
			);
			T::ContractHandler::remove_contract_sponsor(contract_id)
		}

		#[pallet::weight(T::WeightInfo::payout_stakers(stakers_number.unwrap_or(20) as u32))]
		pub fn payout_stakers(admin: OriginFor<T>, stakers_number: Option<u8>) -> DispatchResult {
			let admin_id = ensure_signed(admin)?;

			ensure!(
				admin_id == Admin::<T>::get().ok_or(Error::<T>::AdminNotSet)?,
				Error::<T>::NoPermission
			);

			let current_recalc_block =
				Self::get_current_recalc_block(T::RelayBlockNumberProvider::current_block_number());
			let next_recalc_block = current_recalc_block + T::RecalculationInterval::get();

			let mut storage_iterator = Self::get_next_calculated_key()
				.map_or(Staked::<T>::iter(), |key| Staked::<T>::iter_from(key));

			NextCalculatedRecord::<T>::set(None);

			// {
			// 	let mut stakers_number = stakers_number.unwrap_or(20);
			// 	let mut last_id = admin_id;
			// 	let mut income_acc = BalanceOf::<T>::default();
			// 	let mut amount_acc = BalanceOf::<T>::default();

			// 	while let Some((
			// 		(current_id, staked_block),
			// 		(amount, next_recalc_block_for_stake),
			// 	)) = storage_iterator.next()
			// 	{
			// 		if last_id != current_id {
			// 			if income_acc != BalanceOf::<T>::default() {
			// 				<T::Currency as Currency<T::AccountId>>::transfer(
			// 					&T::TreasuryAccountId::get(),
			// 					&last_id,
			// 					income_acc,
			// 					ExistenceRequirement::KeepAlive,
			// 				)
			// 				.and_then(|_| Self::add_lock_balance(&last_id, income_acc))?;

			// 				Self::deposit_event(Event::StakingRecalculation(
			// 					last_id, amount, income_acc,
			// 				));
			// 			}

			// 			if stakers_number == 0 {
			// 				NextCalculatedRecord::<T>::set(Some((current_id, staked_block)));
			// 				break;
			// 			}
			// 			stakers_number -= 1;
			// 			income_acc = BalanceOf::<T>::default();
			// 			last_id = current_id;
			// 		};
			// 		if current_recalc_block >= next_recalc_block_for_stake {
			// 			Self::recalculate_and_insert_stake(
			// 				&last_id,
			// 				staked_block,
			// 				next_recalc_block,
			// 				amount,
			// 				((current_recalc_block - next_recalc_block_for_stake)
			// 					/ T::RecalculationInterval::get())
			// 				.into() + 1,
			// 				&mut income_acc,
			// 			);
			// 		}
			// 	}
			// }

			{
				let mut stakers_number = stakers_number.unwrap_or(20);
				let last_id = RefCell::new(None);
				let income_acc = RefCell::new(BalanceOf::<T>::default());
				let amount_acc = RefCell::new(BalanceOf::<T>::default());

				let flush_stake = || -> DispatchResult {
					if let Some(last_id) = &*last_id.borrow() {
						if !income_acc.borrow().is_zero() {
							<T::Currency as Currency<T::AccountId>>::transfer(
								&T::TreasuryAccountId::get(),
								last_id,
								*income_acc.borrow(),
								ExistenceRequirement::KeepAlive,
							)
							.and_then(|_| {
								Self::add_lock_balance(last_id, *income_acc.borrow())?;
								<TotalStaked<T>>::try_mutate(|staked| {
									staked
										.checked_add(&*income_acc.borrow())
										.ok_or(ArithmeticError::Overflow.into())
								})
							})?;

							Self::deposit_event(Event::StakingRecalculation(
								last_id.clone(),
								*amount_acc.borrow(),
								*income_acc.borrow(),
							));
						}

						*income_acc.borrow_mut() = BalanceOf::<T>::default();
						*amount_acc.borrow_mut() = BalanceOf::<T>::default();
					}
					Ok(())
				};

				while let Some((
					(current_id, staked_block),
					(amount, next_recalc_block_for_stake),
				)) = storage_iterator.next()
				{
					if stakers_number == 0 {
						NextCalculatedRecord::<T>::set(Some((current_id, staked_block)));
						break;
					}
					if last_id.borrow().as_ref() != Some(&current_id) {
						flush_stake()?;
						*last_id.borrow_mut() = Some(current_id.clone());
						stakers_number -= 1;
					};
					if current_recalc_block >= next_recalc_block_for_stake {
						*amount_acc.borrow_mut() += amount;
						Self::recalculate_and_insert_stake(
							&current_id,
							staked_block,
							next_recalc_block,
							amount,
							((current_recalc_block - next_recalc_block_for_stake)
								/ T::RecalculationInterval::get())
							.into() + 1,
							&mut *income_acc.borrow_mut(),
						);
					}
				}
				flush_stake()?;
			}

			Ok(())
		}
	}
}

impl<T: Config> Pallet<T> {
	pub fn account_id() -> T::AccountId {
		T::PalletId::get().into_account_truncating()
	}

	fn unlock_balance(staker: &T::AccountId, amount: BalanceOf<T>) -> DispatchResult {
		let locked_balance = Self::get_locked_balance(staker)
			.map(|l| l.amount)
			.ok_or(<Error<T>>::IncorrectLockedBalanceOperation)?;

		// It is understood that we cannot unlock more funds than were locked by staking.
		// Therefore, if implemented correctly, this error should not occur.
		Self::set_lock_unchecked(
			staker,
			locked_balance
				.checked_sub(&amount)
				.ok_or(ArithmeticError::Underflow)?,
		);
		Ok(())
	}

	fn add_lock_balance(staker: &T::AccountId, amount: BalanceOf<T>) -> DispatchResult {
		Self::get_locked_balance(staker)
			.map_or(<BalanceOf<T>>::default(), |l| l.amount)
			.checked_add(&amount)
			.map(|new_lock| Self::set_lock_unchecked(staker, new_lock))
			.ok_or(ArithmeticError::Overflow.into())
	}

	fn set_lock_unchecked(staker: &T::AccountId, amount: BalanceOf<T>) {
		if amount.is_zero() {
			<T::Currency as LockableCurrency<T::AccountId>>::remove_lock(LOCK_IDENTIFIER, &staker);
		} else {
			<T::Currency as LockableCurrency<T::AccountId>>::set_lock(
				LOCK_IDENTIFIER,
				staker,
				amount,
				WithdrawReasons::all(),
			)
		}
	}

	pub fn get_locked_balance(
		staker: impl EncodeLike<T::AccountId>,
	) -> Option<BalanceLock<BalanceOf<T>>> {
		<T::Currency as ExtendedLockableCurrency<T::AccountId>>::locks(staker)
			.into_iter()
			.find(|l| l.id == LOCK_IDENTIFIER)
	}

	pub fn total_staked_by_id(staker: impl EncodeLike<T::AccountId>) -> Option<BalanceOf<T>> {
		let staked = Staked::<T>::iter_prefix((staker,))
			.into_iter()
			.fold(<BalanceOf<T>>::default(), |acc, (_, (amount, _))| {
				acc + amount
			});
		if staked != <BalanceOf<T>>::default() {
			Some(staked)
		} else {
			None
		}
	}

	pub fn total_staked_by_id_per_block(
		staker: impl EncodeLike<T::AccountId>,
	) -> Option<Vec<(T::BlockNumber, BalanceOf<T>)>> {
		let mut staked = Staked::<T>::iter_prefix((staker,))
			.into_iter()
			.map(|(block, (amount, _))| (block, amount))
			.collect::<Vec<_>>();
		staked.sort_by_key(|(block, _)| *block);
		if !staked.is_empty() {
			Some(staked)
		} else {
			None
		}
	}

	pub fn cross_id_total_staked(staker: Option<T::CrossAccountId>) -> Option<BalanceOf<T>> {
		staker.map_or(Some(<TotalStaked<T>>::get()), |s| {
			Self::total_staked_by_id(s.as_sub())
		})
	}

	// pub fn cross_id_locked_balance(staker: T::CrossAccountId) -> BalanceOf<T> {
	// 	Self::get_locked_balance(staker.as_sub())
	// 		.map(|l| l.amount)
	// 		.unwrap_or_default()
	// }

	pub fn cross_id_total_staked_per_block(
		staker: T::CrossAccountId,
	) -> Vec<(T::BlockNumber, BalanceOf<T>)> {
		Self::total_staked_by_id_per_block(staker.as_sub()).unwrap_or_default()
	}

	fn recalculate_and_insert_stake(
		staker: &T::AccountId,
		staked_block: T::BlockNumber,
		next_recalc_block: T::BlockNumber,
		base: BalanceOf<T>,
		iters: u32,
		income_acc: &mut BalanceOf<T>,
	) {
		let income = Self::calculate_income(base, iters);

		base.checked_add(&income).map(|res| {
			<Staked<T>>::insert((staker, staked_block), (res, next_recalc_block));
			*income_acc += income;
		});
	}

	fn calculate_income<I>(base: I, iters: u32) -> I
	where
		I: EncodeLike<BalanceOf<T>> + Balance,
	{
		let mut income = base;

		(0..iters).for_each(|_| income += T::IntervalIncome::get() * income);

		income - base
	}

	fn get_current_recalc_block(current_relay_block: T::BlockNumber) -> T::BlockNumber {
		(current_relay_block / T::RecalculationInterval::get()) * T::RecalculationInterval::get()
	}

	// fn get_next_recalc_block(current_relay_block: T::BlockNumber) -> T::BlockNumber {
	// 	Self::get_current_recalc_block(current_relay_block) + T::RecalculationInterval::get()
	// }

	fn get_next_calculated_key() -> Option<Vec<u8>> {
		Self::get_next_calculated_record().map(|key| Staked::<T>::hashed_key_for(key))
	}
}

impl<T: Config> Pallet<T>
where
	<<T as Config>::Currency as Currency<T::AccountId>>::Balance: Sum,
{
	/// Since user funds are not transferred anywhere by staking, overflow protection is provided
	/// at the level of the associated type `Balance` of `Currency` trait. In order to overflow,
	/// the staker must have more funds on his account than the maximum set for `Balance` type.
	pub fn cross_id_pending_unstake(staker: Option<T::CrossAccountId>) -> BalanceOf<T> {
		staker.map_or(
			PendingUnstake::<T>::iter_values()
				.flat_map(|pendings| pendings.into_iter().map(|(_, amount)| amount))
				.sum(),
			|s| {
				PendingUnstake::<T>::iter_values()
					.flatten()
					.filter_map(|(id, amount)| {
						if id == *s.as_sub() {
							Some(amount)
						} else {
							None
						}
					})
					.sum()
			},
		)
	}

	pub fn cross_id_pending_unstake_per_block(
		staker: T::CrossAccountId,
	) -> Vec<(T::BlockNumber, BalanceOf<T>)> {
		let mut unsorted_res = vec![];
		PendingUnstake::<T>::iter().for_each(|(block, pendings)| {
			pendings.into_iter().for_each(|(id, amount)| {
				if id == *staker.as_sub() {
					unsorted_res.push((block, amount));
				};
			})
		});

		unsorted_res.sort_by_key(|(block, _)| *block);
		unsorted_res
	}
}
