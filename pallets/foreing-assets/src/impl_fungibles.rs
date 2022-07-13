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
use up_data_structs::{ CollectionId };
use pallet_common::CollectionHandle;
use pallet_fungible::FungibleHandle;
use pallet_common::CommonCollectionOperations;
use up_data_structs::budget::Unlimited;

impl<T: Config> fungibles::Inspect<<T as SystemConfig>::AccountId> for Pallet<T> {
	type AssetId = ForeignAssetId;
	type Balance = BalanceOf<T>;

	fn total_issuance(asset: Self::AssetId) -> Self::Balance {
		log::trace!(target: "foreing-assets", "impl_fungible total_issuance");
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
		log::trace!(target: "foreing-assets", "impl_fungible minimum_balance");

		AssetMetadatas::<T>::get(AssetIds::ForeignAssetId(asset)).map(|x| x.minimal_balance).unwrap_or_else(Zero::zero)
	}

	fn balance(asset: Self::AssetId, who: &<T as SystemConfig>::AccountId) -> Self::Balance {
		log::trace!(target: "foreing-assets", "impl_fungible balance");
		let target_collection_id = match <AssetBinding<T>>::get(asset) {
			Some(v) => v,
			None => return Zero::zero(),
		};
		let collection_handle = match <CollectionHandle<T>>::try_get(target_collection_id) {
			Ok(v) => v,
			Err(_) => return Zero::zero(),		
		};
		let collection = FungibleHandle::cast(collection_handle);
		Self::Balance::try_from(collection.balance(
			T::CrossAccountId::from_sub(who.clone()), 
			TokenId(0)))
		.unwrap_or(Zero::zero())
	}

	fn reducible_balance(
		asset: Self::AssetId,
		who: &<T as SystemConfig>::AccountId,
		keep_alive: bool,
	) -> Self::Balance {
		log::trace!(target: "foreing-assets", "impl_fungible reducible_balance");
		// TODO: check correctness
		Self::balance(asset, who)
	}

	fn can_deposit(
        asset: Self::AssetId,
		who: &<T as SystemConfig>::AccountId,
		amount: Self::Balance,
		mint: bool,
	) -> DepositConsequence {
		log::trace!(target: "foreing-assets", "impl_fungible can_deposit");
		// TODO: check correctness
        DepositConsequence::Success
	}

	fn can_withdraw(
		asset: Self::AssetId,
		who: &<T as SystemConfig>::AccountId,
		amount: Self::Balance,
	) -> WithdrawConsequence<Self::Balance> {
		log::trace!(target: "foreing-assets", "impl_fungible can_withdraw");
		// TODO: check correctness
        WithdrawConsequence::Success
	}
}

// impl<T: Config<I>, I: 'static> fungibles::InspectMetadata<<T as SystemConfig>::AccountId>
// 	for Pallet<T, I>
// {
// 	/// Return the name of an asset.
// 	fn name(asset: &Self::AssetId) -> Vec<u8> {
// 		Metadata::<T, I>::get(asset).name.to_vec()
// 	}

// 	/// Return the symbol of an asset.
// 	fn symbol(asset: &Self::AssetId) -> Vec<u8> {
// 		Metadata::<T, I>::get(asset).symbol.to_vec()
// 	}

// 	/// Return the decimals of an asset.
// 	fn decimals(asset: &Self::AssetId) -> u8 {
// 		Metadata::<T, I>::get(asset).decimals
// 	}
// }

impl<T: Config> fungibles::Mutate<<T as SystemConfig>::AccountId> for Pallet<T> {
	fn mint_into(
		asset: Self::AssetId,
		who: &<T as SystemConfig>::AccountId,
		amount: Self::Balance,
	) -> DispatchResult {
		//Self::do_mint(asset, who, amount, None)
		log::trace!(target: "foreing-assets", "impl_fungible mint_into");

		// pub fn create_item(
		// 	collection: &FungibleHandle<T>,
		// 	sender: &T::CrossAccountId,
		// 	data: CreateItemData<T>,
		// 	nesting_budget: &dyn Budget,

		let target_collection_id = match <AssetBinding<T>>::get(asset) {
			Some(v) => v,
			None => return Err(DispatchError::Other("Associated collection not found for asset")),
		};
		let collection = FungibleHandle::cast(<CollectionHandle<T>>::try_get(target_collection_id)?);
		let account = T::CrossAccountId::from_sub(who.clone());

		let value: u128 = match amount.try_into() { 
			Ok(val) => val, 
			Err(_) => return Err(DispatchError::Other("Bad amount to value conversion")), 
		}; 

		let amount_data: pallet_fungible::CreateItemData<T> = (account.clone(), value);

		pallet_fungible::Pallet::<T>::create_item(
			&collection, 
			&account,
			amount_data, 
			&Unlimited)?;

        Ok(())
	}

	fn burn_from(
		asset: Self::AssetId,
		who: &<T as SystemConfig>::AccountId,
		amount: Self::Balance,
	) -> Result<Self::Balance, DispatchError> {
		// let f = DebitFlags { keep_alive: false, best_effort: false };
		log::trace!(target: "foreing-assets", "impl_fungible burn_from");

		let target_collection_id = match <AssetBinding<T>>::get(asset) {
			Some(v) => v,
			None => return Err(DispatchError::Other("Associated collection not found for asset")),
		};
		let collection = FungibleHandle::cast(<CollectionHandle<T>>::try_get(target_collection_id)?);
		let account = T::CrossAccountId::from_sub(who.clone());
		let value: u128 = match amount.try_into() { 
			Ok(val) => val, 
			Err(_) => return Err(DispatchError::Other("Bad amount to value conversion")), 
		}; 
		pallet_fungible::Pallet::<T>::burn_from(
			&collection, 
			&account.clone(),
			&account,
			value, 
			&Unlimited)?;

        Ok(amount)
	}

	fn slash(
		asset: Self::AssetId,
		who: &<T as SystemConfig>::AccountId,
		amount: Self::Balance,
	) -> Result<Self::Balance, DispatchError> {
		// let f = DebitFlags { keep_alive: false, best_effort: true };
		log::trace!(target: "foreing-assets", "impl_fungible slash");
		Self::burn_from(asset, who, amount)?;
        Ok(amount)

	}
}

impl<T: Config> fungibles::Transfer<T::AccountId> for Pallet<T> {
	fn transfer(
		asset: Self::AssetId,
		source: &<T as SystemConfig>::AccountId,
		dest: &<T as SystemConfig>::AccountId,
		amount: Self::Balance,
		keep_alive: bool,
	) -> Result<Self::Balance, DispatchError> {
		// let f = TransferFlags { keep_alive, best_effort: false, burn_dust: false };
		log::trace!(target: "foreing-assets", "impl_fungible transfer");

		let target_collection_id = match <AssetBinding<T>>::get(asset) {
			Some(v) => v,
			None => return Err(DispatchError::Other("Associated collection not found for asset")),
		};
		let collection = FungibleHandle::cast(<CollectionHandle<T>>::try_get(target_collection_id)?);

		let value: u128 = match amount.try_into() { 
			Ok(val) => val, 
			Err(_) => return Err(DispatchError::Other("Bad amount to value conversion")), 
		}; 

		pallet_fungible::Pallet::<T>::transfer(
			&collection, 
			&T::CrossAccountId::from_sub(source.clone()), 
			&T::CrossAccountId::from_sub(dest.clone()), 
			value, 
			&Unlimited)?;

        Ok(amount)
	}
}

// impl<T: Config<I>, I: 'static> fungibles::Unbalanced<T::AccountId> for Pallet<T, I> {
// 	fn set_balance(_: Self::AssetId, _: &T::AccountId, _: Self::Balance) -> DispatchResult {
// 		unreachable!("set_balance is not used if other functions are impl'd");
// 	}
// 	fn set_total_issuance(id: T::AssetId, amount: Self::Balance) {
// 		Asset::<T, I>::mutate_exists(id, |maybe_asset| {
// 			if let Some(ref mut asset) = maybe_asset {
// 				asset.supply = amount
// 			}
// 		});
// 	}
// 	fn decrease_balance(
// 		asset: T::AssetId,
// 		who: &T::AccountId,
// 		amount: Self::Balance,
// 	) -> Result<Self::Balance, DispatchError> {
// 		let f = DebitFlags { keep_alive: false, best_effort: false };
// 		Self::decrease_balance(asset, who, amount, f, |_, _| Ok(()))
// 	}
// 	fn decrease_balance_at_most(
// 		asset: T::AssetId,
// 		who: &T::AccountId,
// 		amount: Self::Balance,
// 	) -> Self::Balance {
// 		let f = DebitFlags { keep_alive: false, best_effort: true };
// 		Self::decrease_balance(asset, who, amount, f, |_, _| Ok(())).unwrap_or(Zero::zero())
// 	}
// 	fn increase_balance(
// 		asset: T::AssetId,
// 		who: &T::AccountId,
// 		amount: Self::Balance,
// 	) -> Result<Self::Balance, DispatchError> {
// 		Self::increase_balance(asset, who, amount, |_| Ok(()))?;
// 		Ok(amount)
// 	}
// 	fn increase_balance_at_most(
// 		asset: T::AssetId,
// 		who: &T::AccountId,
// 		amount: Self::Balance,
// 	) -> Self::Balance {
// 		match Self::increase_balance(asset, who, amount, |_| Ok(())) {
// 			Ok(()) => amount,
// 			Err(_) => Zero::zero(),
// 		}
// 	}
// }

// impl<T: Config<I>, I: 'static> fungibles::Create<T::AccountId> for Pallet<T, I> {
// 	fn create(
// 		id: T::AssetId,
// 		admin: T::AccountId,
// 		is_sufficient: bool,
// 		min_balance: Self::Balance,
// 	) -> DispatchResult {
// 		Self::do_force_create(id, admin, is_sufficient, min_balance)
// 	}
// }

// impl<T: Config<I>, I: 'static> fungibles::Destroy<T::AccountId> for Pallet<T, I> {
// 	type DestroyWitness = DestroyWitness;

// 	fn get_destroy_witness(asset: &T::AssetId) -> Option<Self::DestroyWitness> {
// 		Asset::<T, I>::get(asset).map(|asset_details| asset_details.destroy_witness())
// 	}

// 	fn destroy(
// 		id: T::AssetId,
// 		witness: Self::DestroyWitness,
// 		maybe_check_owner: Option<T::AccountId>,
// 	) -> Result<Self::DestroyWitness, DispatchError> {
// 		Self::do_destroy(id, witness, maybe_check_owner)
// 	}
// }

// impl<T: Config<I>, I: 'static> fungibles::metadata::Inspect<<T as SystemConfig>::AccountId>
// 	for Pallet<T, I>
// {
// 	fn name(asset: T::AssetId) -> Vec<u8> {
// 		Metadata::<T, I>::get(asset).name.to_vec()
// 	}

// 	fn symbol(asset: T::AssetId) -> Vec<u8> {
// 		Metadata::<T, I>::get(asset).symbol.to_vec()
// 	}

// 	fn decimals(asset: T::AssetId) -> u8 {
// 		Metadata::<T, I>::get(asset).decimals
// 	}
// }

// impl<T: Config<I>, I: 'static> fungibles::metadata::Mutate<<T as SystemConfig>::AccountId>
// 	for Pallet<T, I>
// {
// 	fn set(
// 		asset: T::AssetId,
// 		from: &<T as SystemConfig>::AccountId,
// 		name: Vec<u8>,
// 		symbol: Vec<u8>,
// 		decimals: u8,
// 	) -> DispatchResult {
// 		Self::do_set_metadata(asset, from, name, symbol, decimals)
// 	}
// }

// impl<T: Config<I>, I: 'static> fungibles::approvals::Inspect<<T as SystemConfig>::AccountId>
// 	for Pallet<T, I>
// {
// 	// Check the amount approved to be spent by an owner to a delegate
// 	fn allowance(
// 		asset: T::AssetId,
// 		owner: &<T as SystemConfig>::AccountId,
// 		delegate: &<T as SystemConfig>::AccountId,
// 	) -> T::Balance {
// 		Approvals::<T, I>::get((asset, &owner, &delegate))
// 			.map(|x| x.amount)
// 			.unwrap_or_else(Zero::zero)
// 	}
// }

// impl<T: Config<I>, I: 'static> fungibles::approvals::Mutate<<T as SystemConfig>::AccountId>
// 	for Pallet<T, I>
// {
// 	fn approve(
// 		asset: T::AssetId,
// 		owner: &<T as SystemConfig>::AccountId,
// 		delegate: &<T as SystemConfig>::AccountId,
// 		amount: T::Balance,
// 	) -> DispatchResult {
// 		Self::do_approve_transfer(asset, owner, delegate, amount)
// 	}

// 	// Aprove spending tokens from a given account
// 	fn transfer_from(
// 		asset: T::AssetId,
// 		owner: &<T as SystemConfig>::AccountId,
// 		delegate: &<T as SystemConfig>::AccountId,
// 		dest: &<T as SystemConfig>::AccountId,
// 		amount: T::Balance,
// 	) -> DispatchResult {
// 		Self::do_transfer_approved(asset, owner, delegate, dest, amount)
// 	}
// }
