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
//! * `start_inflation` - This method sets the inflation start date. Can be only called once.
//! Inflation start block can be backdated and will catch up. The method will create Treasury
//!	account if it does not exist and perform the first inflation deposit.

// #![recursion_limit = "1024"]
#![cfg_attr(not(feature = "std"), no_std)]

#[cfg(feature = "runtime-benchmarks")]
mod benchmarking;
#[cfg(test)]
mod tests;
pub mod types;
pub mod weights;

use sp_std::{vec::Vec, iter::Sum, borrow::ToOwned};
use codec::EncodeLike;
use pallet_balances::BalanceLock;
pub use types::ExtendedLockableCurrency;

// use up_common::constants::{DAYS, UNIQUE};
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
	traits::{BlockNumberProvider, CheckedAdd, CheckedSub, AccountIdConversion},
	ArithmeticError,
};

type BalanceOf<T> =
	<<T as Config>::Currency as Currency<<T as frame_system::Config>::AccountId>>::Balance;

// const SECONDS_TO_BLOCK: u32 = 6;
// const DAY: u32 = 60 * 60 * 24 / SECONDS_TO_BLOCK;
// const WEEK: u32 = 7 * DAY;
// const TWO_WEEK: u32 = 2 * WEEK;
// const YEAR: u32 = DAY * 365;

pub const LOCK_IDENTIFIER: [u8; 8] = *b"appstake";

#[frame_support::pallet]
pub mod pallet {
	use super::*;
	use frame_support::{Blake2_128Concat, Twox64Concat, pallet_prelude::*, storage::Key, PalletId};
	use frame_system::pallet_prelude::*;
	use types::CollectionHandler;

	#[pallet::config]
	pub trait Config: frame_system::Config + pallet_evm::account::Config {
		type Currency: ExtendedLockableCurrency<Self::AccountId>;

		type CollectionHandler: CollectionHandler<
			AccountId = Self::AccountId,
			CollectionId = CollectionId,
		>;

		type TreasuryAccountId: Get<Self::AccountId>;

		/// The app's pallet id, used for deriving its sovereign account ID.
		#[pallet::constant]
		type PalletId: Get<PalletId>;

		/// In relay blocks.
		#[pallet::constant]
		type RecalculationInterval: Get<Self::BlockNumber>;
		/// In chain blocks.
		#[pallet::constant]
		type PendingInterval: Get<Self::BlockNumber>;

		/// In chain blocks.
		#[pallet::constant]
		type Day: Get<Self::BlockNumber>; // useless

		#[pallet::constant]
		type Nominal: Get<BalanceOf<Self>>;

		#[pallet::constant]
		type IntervalIncome: Get<Perbill>;

		/// Weight information for extrinsics in this pallet.
		type WeightInfo: WeightInfo;

		// The relay block number provider
		type RelayBlockNumberProvider: BlockNumberProvider<BlockNumber = Self::BlockNumber>;

		/// Events compatible with [`frame_system::Config::Event`].
		type Event: IsType<<Self as frame_system::Config>::Event> + From<Event<Self>>;

		// /// Number of blocks that pass between treasury balance updates due to inflation
		// #[pallet::constant]
		// type InterestBlockInterval: Get<Self::BlockNumber>;

		// // Weight information for functions of this pallet.
		// type WeightInfo: WeightInfo;
	}

	#[pallet::pallet]
	#[pallet::generate_store(pub(super) trait Store)]
	pub struct Pallet<T>(_);

	#[pallet::event]
	#[pallet::generate_deposit(fn deposit_event)]
	pub enum Event<T: Config> {
		StakingRecalculation(
			/// Base on which interest is calculated
			BalanceOf<T>,
			/// Amount of accrued interest
			BalanceOf<T>,
		),
	}

	#[pallet::error]
	pub enum Error<T> {
		AdminNotSet,
		/// No permission to perform action
		NoPermission,
		/// Insufficient funds to perform an action
		NotSufficientFounds,
		InvalidArgument,
		AlreadySponsored,
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
		Value = BalanceOf<T>,
		QueryKind = ValueQuery,
	>;

	/// Amount of tokens pending unstake per user per block.
	#[pallet::storage]
	pub type PendingUnstake<T: Config> = StorageNMap<
		Key = (
			Key<Blake2_128Concat, T::AccountId>,
			Key<Twox64Concat, T::BlockNumber>,
		),
		Value = BalanceOf<T>,
		QueryKind = ValueQuery,
	>;

	/// A block when app-promotion has started
	#[pallet::storage]
	pub type StartBlock<T: Config> = StorageValue<Value = T::BlockNumber, QueryKind = ValueQuery>;

	/// Next target block when interest is recalculated
	#[pallet::storage]
	#[pallet::getter(fn get_interest_block)]
	pub type NextInterestBlock<T: Config> =
		StorageValue<Value = T::BlockNumber, QueryKind = ValueQuery>;

	#[pallet::hooks]
	impl<T: Config> Hooks<BlockNumberFor<T>> for Pallet<T> {
		fn on_initialize(current_block: T::BlockNumber) -> Weight
		where
			<T as frame_system::Config>::BlockNumber: From<u32>,
		{
			let mut consumed_weight = 0;
			let mut add_weight = |reads, writes, weight| {
				consumed_weight += T::DbWeight::get().reads_writes(reads, writes);
				consumed_weight += weight;
			};

			PendingUnstake::<T>::iter()
				.filter_map(|((staker, block), amount)| {
					if block <= current_block {
						Some((staker, block, amount))
					} else {
						None
					}
				})
				.for_each(|(staker, block, amount)| {
					Self::unlock_balance_unchecked(&staker, amount); // TO-DO : Replace with a method that will check that the unstack is less than it was blocked, otherwise take the delta from the treasuries
					<PendingUnstake<T>>::remove((staker, block));
				});

			let next_interest_block = Self::get_interest_block();
			let current_relay_block = T::RelayBlockNumberProvider::current_block_number();
			if next_interest_block != 0.into() && current_relay_block >= next_interest_block {
				let mut acc = <BalanceOf<T>>::default();
				let mut base_acc = <BalanceOf<T>>::default();

				NextInterestBlock::<T>::set(
					NextInterestBlock::<T>::get() + T::RecalculationInterval::get(),
				);
				add_weight(0, 1, 0);

				Staked::<T>::iter()
					.filter(|((_, block), _)| {
						*block + T::RecalculationInterval::get() <= current_relay_block
					})
					.for_each(|((staker, block), amount)| {
						Self::recalculate_stake(&staker, block, amount, &mut acc);
						add_weight(0, 0, T::WeightInfo::recalculate_stake());
						base_acc += amount;
					});
				<TotalStaked<T>>::get()
					.checked_add(&acc)
					.map(|res| <TotalStaked<T>>::set(res));

				Self::deposit_event(Event::StakingRecalculation(base_acc, acc));
				add_weight(0, 1, 0);
			} else {
				add_weight(1, 0, 0)
			};
			consumed_weight
		}
	}

	#[pallet::call]
	impl<T: Config> Pallet<T> {
		#[pallet::weight(T::WeightInfo::set_admin_address())]
		pub fn set_admin_address(origin: OriginFor<T>, admin: T::CrossAccountId) -> DispatchResult {
			ensure_root(origin)?;
			<Admin<T>>::set(Some(admin.as_sub().to_owned()));

			Ok(())
		}

		#[pallet::weight(T::WeightInfo::start_app_promotion())]
		pub fn start_app_promotion(
			origin: OriginFor<T>,
			promotion_start_relay_block: Option<T::BlockNumber>,
		) -> DispatchResult
		where
			<T as frame_system::Config>::BlockNumber: From<u32>,
		{
			ensure_root(origin)?;

			// Start app-promotion mechanics if it has not been yet initialized
			if <StartBlock<T>>::get() == 0u32.into() {
				let start_block = promotion_start_relay_block
					.unwrap_or(T::RelayBlockNumberProvider::current_block_number());

				// Set promotion global start block
				<StartBlock<T>>::set(start_block);

				<NextInterestBlock<T>>::set(start_block + T::RecalculationInterval::get());
			}

			Ok(())
		}

		#[pallet::weight(T::WeightInfo::stake())]
		pub fn stake(staker: OriginFor<T>, amount: BalanceOf<T>) -> DispatchResult {
			let staker_id = ensure_signed(staker)?;

			ensure!(amount >= T::Nominal::get(), ArithmeticError::Underflow);

			let balance =
				<<T as Config>::Currency as Currency<T::AccountId>>::free_balance(&staker_id);

			ensure!(balance >= amount, ArithmeticError::Underflow);

			<<T as Config>::Currency as Currency<T::AccountId>>::ensure_can_withdraw(
				&staker_id,
				amount,
				WithdrawReasons::all(),
				balance - amount,
			)?;

			Self::add_lock_balance(&staker_id, amount)?;

			let block_number = T::RelayBlockNumberProvider::current_block_number();

			<Staked<T>>::insert(
				(&staker_id, block_number),
				<Staked<T>>::get((&staker_id, block_number))
					.checked_add(&amount)
					.ok_or(ArithmeticError::Overflow)?,
			);

			<TotalStaked<T>>::set(
				<TotalStaked<T>>::get()
					.checked_add(&amount)
					.ok_or(ArithmeticError::Overflow)?,
			);

			Ok(())
		}

		#[pallet::weight(T::WeightInfo::unstake())]
		pub fn unstake(staker: OriginFor<T>, amount: BalanceOf<T>) -> DispatchResult {
			let staker_id = ensure_signed(staker)?;

			let mut stakes = Staked::<T>::iter_prefix((&staker_id,)).collect::<Vec<_>>();

			let total_staked = stakes
				.iter()
				.fold(<BalanceOf<T>>::default(), |acc, (_, amount)| acc + *amount);

			ensure!(total_staked >= amount, ArithmeticError::Underflow);

			<TotalStaked<T>>::set(
				<TotalStaked<T>>::get()
					.checked_sub(&amount)
					.ok_or(ArithmeticError::Underflow)?,
			);

			let block = frame_system::Pallet::<T>::block_number() + T::PendingInterval::get();
			<PendingUnstake<T>>::insert(
				(&staker_id, block),
				<PendingUnstake<T>>::get((&staker_id, block))
					.checked_add(&amount)
					.ok_or(ArithmeticError::Overflow)?,
			);

			stakes.sort_by_key(|(block, _)| *block);

			let mut acc_amount = amount;
			let new_state = stakes
				.into_iter()
				.map_while(|(block, balance_per_block)| {
					if acc_amount == <BalanceOf<T>>::default() {
						return None;
					}
					if acc_amount <= balance_per_block {
						let res = (block, balance_per_block - acc_amount, acc_amount);
						acc_amount = <BalanceOf<T>>::default();
						return Some(res);
					} else {
						acc_amount -= balance_per_block;
						return Some((block, <BalanceOf<T>>::default(), acc_amount));
					}
				})
				.collect::<Vec<_>>();

			new_state
				.into_iter()
				.for_each(|(block, to_staked, _to_pending)| {
					if to_staked == <BalanceOf<T>>::default() {
						<Staked<T>>::remove((&staker_id, block));
					} else {
						<Staked<T>>::insert((&staker_id, block), to_staked);
					}
				});

			Ok(())
		}

		#[pallet::weight(0)]
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
		#[pallet::weight(0)]
		pub fn stop_sponsorign_collection(
			admin: OriginFor<T>,
			collection_id: CollectionId,
		) -> DispatchResult {
			let admin_id = ensure_signed(admin)?;

			ensure!(
				admin_id == Admin::<T>::get().ok_or(Error::<T>::AdminNotSet)?,
				Error::<T>::NoPermission
			);

			ensure!(
				T::CollectionHandler::get_sponsor(collection_id)?
					.ok_or(<Error<T>>::InvalidArgument)?
					== Self::account_id(),
				<Error<T>>::NoPermission
			);
			T::CollectionHandler::remove_collection_sponsor(collection_id)
		}
	}
}

impl<T: Config> Pallet<T> {
	// pub fn stake(staker: &T::AccountId, amount: BalanceOf<T>) -> DispatchResult {
	// 	let balance = <<T as Config>::Currency as Currency<T::AccountId>>::free_balance(staker);

	// 	ensure!(balance >= amount, ArithmeticError::Underflow);

	// 	Self::set_lock_unchecked(staker, amount);

	// 	let block_number = <T::BlockNumberProvider as BlockNumberProvider>::current_block_number();

	// 	<Staked<T>>::insert(
	// 		(staker, block_number),
	// 		<Staked<T>>::get((staker, block_number))
	// 			.checked_add(&amount)
	// 			.ok_or(ArithmeticError::Overflow)?,
	// 	);

	// 	<TotalStaked<T>>::set(
	// 		<TotalStaked<T>>::get()
	// 			.checked_add(&amount)
	// 			.ok_or(ArithmeticError::Overflow)?,
	// 	);

	// 	Ok(())
	// }

	// pub fn unstake(staker: &T::AccountId, amount: BalanceOf<T>) -> DispatchResult {
	// 	let mut stakes = Staked::<T>::iter_prefix((staker,)).collect::<Vec<_>>();

	// 	let total_staked = stakes
	// 		.iter()
	// 		.fold(<BalanceOf<T>>::default(), |acc, (_, amount)| acc + *amount);

	// 	ensure!(total_staked >= amount, ArithmeticError::Underflow);

	// 	<TotalStaked<T>>::set(
	// 		<TotalStaked<T>>::get()
	// 			.checked_sub(&amount)
	// 			.ok_or(ArithmeticError::Underflow)?,
	// 	);

	// 	let block = <T::BlockNumberProvider>::current_block_number() + WEEK.into();
	// 	<PendingUnstake<T>>::insert(
	// 		(staker, block),
	// 		<PendingUnstake<T>>::get((staker, block))
	// 			.checked_add(&amount)
	// 			.ok_or(ArithmeticError::Overflow)?,
	// 	);

	// 	stakes.sort_by_key(|(block, _)| *block);

	// 	let mut acc_amount = amount;
	// 	let new_state = stakes
	// 		.into_iter()
	// 		.map_while(|(block, balance_per_block)| {
	// 			if acc_amount == <BalanceOf<T>>::default() {
	// 				return None;
	// 			}
	// 			if acc_amount <= balance_per_block {
	// 				let res = (block, balance_per_block - acc_amount, acc_amount);
	// 				acc_amount = <BalanceOf<T>>::default();
	// 				return Some(res);
	// 			} else {
	// 				acc_amount -= balance_per_block;
	// 				return Some((block, <BalanceOf<T>>::default(), acc_amount));
	// 			}
	// 		})
	// 		.collect::<Vec<_>>();

	// 	new_state
	// 		.into_iter()
	// 		.for_each(|(block, to_staked, _to_pending)| {
	// 			if to_staked == <BalanceOf<T>>::default() {
	// 				<Staked<T>>::remove((staker, block));
	// 			} else {
	// 				<Staked<T>>::insert((staker, block), to_staked);
	// 			}
	// 		});

	// 	Ok(())
	// }

	// pub fn sponsor_collection(admin: T::AccountId, collection_id: u32) -> DispatchResult {
	// 	Ok(())
	// }

	// pub fn stop_sponsorign_collection(admin: T::AccountId, collection_id: u32) -> DispatchResult {
	// 	Ok(())
	// }

	pub fn sponsor_conract(admin: T::AccountId, app_id: u32) -> DispatchResult {
		Ok(())
	}

	pub fn stop_sponsorign_contract(admin: T::AccountId, app_id: u32) -> DispatchResult {
		Ok(())
	}

	pub fn account_id() -> T::AccountId {
		T::PalletId::get().into_account_truncating()
	}
}

impl<T: Config> Pallet<T> {
	fn unlock_balance_unchecked(staker: &T::AccountId, amount: BalanceOf<T>) {
		let mut locked_balance = Self::get_locked_balance(staker).map(|l| l.amount).unwrap();
		locked_balance -= amount;
		Self::set_lock_unchecked(staker, locked_balance);
	}

	fn add_lock_balance(staker: &T::AccountId, amount: BalanceOf<T>) -> DispatchResult {
		Self::get_locked_balance(staker)
			.map_or(<BalanceOf<T>>::default(), |l| l.amount)
			.checked_add(&amount)
			.map(|new_lock| Self::set_lock_unchecked(staker, new_lock))
			.ok_or(ArithmeticError::Overflow.into())
	}

	fn set_lock_unchecked(staker: &T::AccountId, amount: BalanceOf<T>) {
		<T::Currency as LockableCurrency<T::AccountId>>::set_lock(
			LOCK_IDENTIFIER,
			staker,
			amount,
			WithdrawReasons::all(),
		)
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
			.fold(<BalanceOf<T>>::default(), |acc, (_, amount)| acc + amount);
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
			.map(|(block, amount)| (block, amount))
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
		// Self::total_staked_by_id(staker.as_sub())
	}

	pub fn cross_id_locked_balance(staker: T::CrossAccountId) -> BalanceOf<T> {
		Self::get_locked_balance(staker.as_sub())
			.map(|l| l.amount)
			.unwrap_or_default()
	}

	pub fn cross_id_total_staked_per_block(
		staker: T::CrossAccountId,
	) -> Vec<(T::BlockNumber, BalanceOf<T>)> {
		Self::total_staked_by_id_per_block(staker.as_sub()).unwrap_or_default()
	}

	fn recalculate_stake(
		staker: &T::AccountId,
		block: T::BlockNumber,
		base: BalanceOf<T>,
		income_acc: &mut BalanceOf<T>,
	) {
		let income = Self::calculate_income(base);
		base.checked_add(&income).map(|res| {
			<Staked<T>>::insert((staker, block), res);
			*income_acc += income;
			<T::Currency as Currency<T::AccountId>>::transfer(
				&T::TreasuryAccountId::get(),
				staker,
				income,
				ExistenceRequirement::KeepAlive,
			)
			.and_then(|_| Self::add_lock_balance(staker, income));
		});
	}

	fn calculate_income<I>(base: I) -> I
	where
		I: EncodeLike<BalanceOf<T>> + Balance,
	{
		T::IntervalIncome::get() * base
	}
}

impl<T: Config> Pallet<T>
where
	<<T as pallet::Config>::Currency as Currency<T::AccountId>>::Balance: Sum,
{
	pub fn cross_id_pending_unstake(staker: Option<T::CrossAccountId>) -> BalanceOf<T> {
		staker.map_or(PendingUnstake::<T>::iter_values().sum(), |s| {
			PendingUnstake::<T>::iter_prefix_values((s.as_sub(),)).sum()
		})
	}

	pub fn cross_id_pending_unstake_per_block(
		staker: T::CrossAccountId,
	) -> Vec<(T::BlockNumber, BalanceOf<T>)> {
		let mut unsorted_res = PendingUnstake::<T>::iter_prefix((staker.as_sub(),))
			.into_iter()
			.collect::<Vec<_>>();
		unsorted_res.sort_by_key(|(block, _)| *block);
		unsorted_res
	}
}
