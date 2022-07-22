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

//! Implementations for fungibles trait.

use super::*;
use frame_system::Config as SystemConfig;

use frame_support::traits::tokens::{DepositConsequence, WithdrawConsequence};
use pallet_common::CollectionHandle;
use pallet_fungible::FungibleHandle;
use pallet_common::CommonCollectionOperations;
use up_data_structs::budget::Unlimited;

impl<T: Config> fungibles::Inspect<<T as SystemConfig>::AccountId> for Pallet<T>
where
	T: orml_tokens::Config<CurrencyId = AssetIds>,
{
	type AssetId = u32;
	type Balance = BalanceOf<T>;

	fn total_issuance(asset: Self::AssetId) -> Self::Balance {
		log::trace!(target: "fassets::impl_foreing_assets", "impl_fungible total_issuance");
		// KSM
		if asset == 999 {
			let amount =
				<orml_tokens::Pallet<T> as fungibles::Inspect<T::AccountId>>::total_issuance(
					AssetIds::NativeAssetId(NativeCurrency::Parent),
				);

			let value: u128 = match amount.try_into() {
				Ok(val) => val,
				Err(_) => return Zero::zero(),
			};

			let ti: Self::Balance = match value.try_into() {
				Ok(val) => val,
				Err(_) => return Zero::zero(),
			};

			return ti;
		};

		// QTZ
		if asset == 9999 {
			let parent_amount =
				<pallet_balances::Pallet<T> as fungible::Inspect<T::AccountId>>::total_issuance();

			let value: u128 = match parent_amount.try_into() {
				Ok(val) => val,
				Err(_) => return Zero::zero(),
			};

			let ti: Self::Balance = match value.try_into() {
				Ok(val) => val,
				Err(_) => return Zero::zero(),
			};

			return ti;
		};

		let target_collection_id = match <AssetBinding<T>>::get(asset) {
			Some(v) => v,
			None => return Zero::zero(),
		};
		let collection_handle = match <CollectionHandle<T>>::try_get(target_collection_id) {
			Ok(v) => v,
			Err(_) => return Zero::zero(),
		};
		let collection = FungibleHandle::cast(collection_handle);
		Self::Balance::try_from(collection.total_supply()).unwrap_or(Zero::zero())
	}

	fn minimum_balance(asset: Self::AssetId) -> Self::Balance {
		log::trace!(target: "fassets::impl_foreing_assets", "impl_fungible minimum_balance");
		//stub for native
		// KSM
		if asset == 999 {
			let amount =
				<orml_tokens::Pallet<T> as fungibles::Inspect<T::AccountId>>::minimum_balance(
					AssetIds::NativeAssetId(NativeCurrency::Parent),
				);

			let value: u128 = match amount.try_into() {
				Ok(val) => val,
				Err(_) => return Zero::zero(),
			};

			let ti: Self::Balance = match value.try_into() {
				Ok(val) => val,
				Err(_) => return Zero::zero(),
			};

			return ti;
		};

		// QTZ
		if asset == 9999 {
			let parent_amount =
				<pallet_balances::Pallet<T> as fungible::Inspect<T::AccountId>>::minimum_balance();

			let value: u128 = match parent_amount.try_into() {
				Ok(val) => val,
				Err(_) => return Zero::zero(),
			};

			let ti: Self::Balance = match value.try_into() {
				Ok(val) => val,
				Err(_) => return Zero::zero(),
			};

			return ti;
		};

		AssetMetadatas::<T>::get(AssetIds::ForeignAssetId(asset))
			.map(|x| x.minimal_balance)
			.unwrap_or_else(Zero::zero)
	}

	fn balance(asset: Self::AssetId, who: &<T as SystemConfig>::AccountId) -> Self::Balance {
		//stub for native
		// KSM
		if asset == 999 {
			let amount = <orml_tokens::Pallet<T> as fungibles::Inspect<T::AccountId>>::balance(
				AssetIds::NativeAssetId(NativeCurrency::Parent),
				who,
			);

			let value: u128 = match amount.try_into() {
				Ok(val) => val,
				Err(_) => return Zero::zero(),
			};

			let ti: Self::Balance = match value.try_into() {
				Ok(val) => val,
				Err(_) => return Zero::zero(),
			};

			return ti;
		};

		// QTZ
		if asset == 9999 {
			let parent_amount =
				<pallet_balances::Pallet<T> as fungible::Inspect<T::AccountId>>::balance(who);

			let value: u128 = match parent_amount.try_into() {
				Ok(val) => val,
				Err(_) => return Zero::zero(),
			};

			let ti: Self::Balance = match value.try_into() {
				Ok(val) => val,
				Err(_) => return Zero::zero(),
			};

			return ti;
		};
		log::trace!(target: "fassets::impl_foreing_assets", "impl_fungible balance");
		let target_collection_id = match <AssetBinding<T>>::get(asset) {
			Some(v) => v,
			None => return Zero::zero(),
		};
		let collection_handle = match <CollectionHandle<T>>::try_get(target_collection_id) {
			Ok(v) => v,
			Err(_) => return Zero::zero(),
		};
		let collection = FungibleHandle::cast(collection_handle);
		Self::Balance::try_from(
			collection.balance(T::CrossAccountId::from_sub(who.clone()), TokenId(0)),
		)
		.unwrap_or(Zero::zero())
	}

	fn reducible_balance(
		asset: Self::AssetId,
		who: &<T as SystemConfig>::AccountId,
		keep_alive: bool,
	) -> Self::Balance {
		log::trace!(target: "fassets::impl_foreing_assets", "impl_fungible reducible_balance");
		// TODO: check correctness
		Self::balance(asset, who)
	}

	fn can_deposit(
		asset: Self::AssetId,
		who: &<T as SystemConfig>::AccountId,
		amount: Self::Balance,
		mint: bool,
	) -> DepositConsequence {
		log::trace!(target: "fassets::impl_foreing_assets", "impl_fungible can_deposit");
		// TODO: check correctness
		DepositConsequence::Success
	}

	fn can_withdraw(
		asset: Self::AssetId,
		who: &<T as SystemConfig>::AccountId,
		amount: Self::Balance,
	) -> WithdrawConsequence<Self::Balance> {
		log::trace!(target: "fassets::impl_foreing_assets", "impl_fungible can_withdraw");
		// TODO: check correctness
		WithdrawConsequence::Success
	}
}

impl<T: Config> fungibles::Mutate<<T as SystemConfig>::AccountId> for Pallet<T>
where
	T: orml_tokens::Config<CurrencyId = AssetIds>,
{
	fn mint_into(
		asset: Self::AssetId,
		who: &<T as SystemConfig>::AccountId,
		amount: Self::Balance,
	) -> DispatchResult {
		//Self::do_mint(asset, who, amount, None)
		log::trace!(target: "fassets::impl_foreing_assets", "impl_fungible mint_into {:?}", asset);

		let value: u128 = match amount.try_into() {
			Ok(val) => val,
			Err(_) => return Err(DispatchError::Other("Bad amount to value conversion")),
		};

		//stub for native
		// KSM
		if asset == 999 {
			let parent_amount: <T as orml_tokens::Config>::Balance = match value.try_into() {
				Ok(val) => val,
				Err(_) => {
					return Err(DispatchError::Other(
						"Bad amount to relay chain value conversion",
					))
				}
			};

			return <orml_tokens::Pallet<T> as fungibles::Mutate<T::AccountId>>::mint_into(
				AssetIds::NativeAssetId(NativeCurrency::Parent),
				who,
				parent_amount,
			);
		};

		// QTZ
		if asset == 9999 {
			let this_amount: <T as pallet_balances::Config>::Balance = match value.try_into() {
				Ok(val) => val,
				Err(_) => {
					return Err(DispatchError::Other(
						"Bad amount to this parachain value conversion",
					))
				}
			};

			return <pallet_balances::Pallet<T> as fungible::Mutate<T::AccountId>>::mint_into(
				who,
				this_amount,
			);
		};

		let target_collection_id = match <AssetBinding<T>>::get(asset) {
			Some(v) => v,
			None => {
				return Err(DispatchError::Other(
					"Associated collection not found for asset",
				))
			}
		};
		let collection =
			FungibleHandle::cast(<CollectionHandle<T>>::try_get(target_collection_id)?);
		let account = T::CrossAccountId::from_sub(who.clone());

		let amount_data: pallet_fungible::CreateItemData<T> = (account.clone(), value);

		pallet_fungible::Pallet::<T>::create_item(&collection, &account, amount_data, &Unlimited)?;

		Ok(())
	}

	fn burn_from(
		asset: Self::AssetId,
		who: &<T as SystemConfig>::AccountId,
		amount: Self::Balance,
	) -> Result<Self::Balance, DispatchError> {
		// let f = DebitFlags { keep_alive: false, best_effort: false };
		log::trace!(target: "fassets::impl_foreing_assets", "impl_fungible burn_from");
		let value: u128 = match amount.try_into() {
			Ok(val) => val,
			Err(_) => return Err(DispatchError::Other("Bad amount to value conversion")),
		};

		//stub for native
		// KSM
		if asset == 999 {
			let parent_amount: <T as orml_tokens::Config>::Balance = match value.try_into() {
				Ok(val) => val,
				Err(_) => {
					return Err(DispatchError::Other(
						"Bad amount to relay chain value conversion",
					))
				}
			};

			return match <orml_tokens::Pallet<T> as fungibles::Mutate<T::AccountId>>::burn_from(
				AssetIds::NativeAssetId(NativeCurrency::Parent),
				who,
				parent_amount,
			) {
				Ok(_) => Ok(amount),
				Err(e) => Err(e),
			};
		};

		// QTZ
		if asset == 9999 {
			let this_amount: <T as pallet_balances::Config>::Balance = match value.try_into() {
				Ok(val) => val,
				Err(_) => {
					return Err(DispatchError::Other(
						"Bad amount to this parachain value conversion",
					))
				}
			};

			return match <pallet_balances::Pallet<T> as fungible::Mutate<T::AccountId>>::burn_from(
				who,
				this_amount,
			) {
				Ok(_) => Ok(amount),
				Err(e) => Err(e),
			};
		};

		let target_collection_id = match <AssetBinding<T>>::get(asset) {
			Some(v) => v,
			None => {
				return Err(DispatchError::Other(
					"Associated collection not found for asset",
				))
			}
		};
		let collection =
			FungibleHandle::cast(<CollectionHandle<T>>::try_get(target_collection_id)?);
		let account = T::CrossAccountId::from_sub(who.clone());
		pallet_fungible::Pallet::<T>::burn_from(
			&collection,
			&account.clone(),
			&account,
			value,
			&Unlimited,
		)?;

		Ok(amount)
	}

	fn slash(
		asset: Self::AssetId,
		who: &<T as SystemConfig>::AccountId,
		amount: Self::Balance,
	) -> Result<Self::Balance, DispatchError> {
		// let f = DebitFlags { keep_alive: false, best_effort: true };
		log::trace!(target: "fassets::impl_foreing_assets", "impl_fungible slash");
		Self::burn_from(asset, who, amount)?;
		Ok(amount)
	}
}

impl<T: Config> fungibles::Transfer<T::AccountId> for Pallet<T>
where
	T: orml_tokens::Config<CurrencyId = AssetIds>,
{
	fn transfer(
		asset: Self::AssetId,
		source: &<T as SystemConfig>::AccountId,
		dest: &<T as SystemConfig>::AccountId,
		amount: Self::Balance,
		keep_alive: bool,
	) -> Result<Self::Balance, DispatchError> {
		// let f = TransferFlags { keep_alive, best_effort: false, burn_dust: false };
		log::trace!(target: "fassets::impl_foreing_assets", "impl_fungible transfer");

		let value: u128 = match amount.try_into() {
			Ok(val) => val,
			Err(_) => return Err(DispatchError::Other("Bad amount to value conversion")),
		};

		//stub for native
		// KSM
		if asset == 999 {
			let parent_amount: <T as orml_tokens::Config>::Balance = match value.try_into() {
				Ok(val) => val,
				Err(_) => {
					return Err(DispatchError::Other(
						"Bad amount to relay chain value conversion",
					))
				}
			};

			return match <orml_tokens::Pallet<T> as fungibles::Transfer<T::AccountId>>::transfer(
				AssetIds::NativeAssetId(NativeCurrency::Parent),
				source,
				dest,
				parent_amount,
				keep_alive,
			) {
				Ok(_) => Ok(amount),
				Err(e) => Err(e),
			};
		};

		// QTZ
		if asset == 9999 {
			let this_amount: <T as pallet_balances::Config>::Balance = match value.try_into() {
				Ok(val) => val,
				Err(_) => {
					return Err(DispatchError::Other(
						"Bad amount to this parachain value conversion",
					))
				}
			};

			return match <pallet_balances::Pallet<T> as fungible::Transfer<T::AccountId>>::transfer(
				source,
				dest,
				this_amount,
				keep_alive,
			) {
				Ok(_) => Ok(amount),
				Err(_) => Err(DispatchError::Other(
					"Bad amount to relay chain value conversion",
				)),
			};
		};

		let target_collection_id = match <AssetBinding<T>>::get(asset) {
			Some(v) => v,
			None => {
				return Err(DispatchError::Other(
					"Associated collection not found for asset",
				))
			}
		};
		let collection =
			FungibleHandle::cast(<CollectionHandle<T>>::try_get(target_collection_id)?);

		pallet_fungible::Pallet::<T>::transfer(
			&collection,
			&T::CrossAccountId::from_sub(source.clone()),
			&T::CrossAccountId::from_sub(dest.clone()),
			value,
			&Unlimited,
		)?;

		Ok(amount)
	}
}
