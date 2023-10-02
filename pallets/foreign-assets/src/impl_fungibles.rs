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

use frame_support::traits::tokens::{
	DepositConsequence, Fortitude, Precision, Preservation, Provenance, WithdrawConsequence,
};
use frame_system::Config as SystemConfig;
use pallet_common::{CollectionHandle, CommonCollectionOperations};
use pallet_fungible::FungibleHandle;
use sp_runtime::traits::{CheckedAdd, CheckedSub};
use up_data_structs::budget::Value;

use super::*;

impl<T: Config> fungibles::Inspect<<T as SystemConfig>::AccountId> for Pallet<T>
where
	T: orml_tokens::Config<CurrencyId = AssetId>,
	BalanceOf<T>: From<<T as pallet_balances::Config>::Balance>,
	BalanceOf<T>: From<<T as orml_tokens::Config>::Balance>,
	<T as pallet_balances::Config>::Balance: From<BalanceOf<T>>,
	<T as orml_tokens::Config>::Balance: From<BalanceOf<T>>,
{
	type AssetId = AssetId;
	type Balance = BalanceOf<T>;

	fn total_issuance(asset: Self::AssetId) -> Self::Balance {
		log::trace!(target: "fassets::impl_foreign_assets", "impl_fungible total_issuance");

		match asset {
			AssetId::NativeAssetId(NativeCurrency::Here) => {
				<pallet_balances::Pallet<T> as fungible::Inspect<T::AccountId>>::total_issuance()
					.into()
			}
			AssetId::NativeAssetId(NativeCurrency::Parent) => {
				<orml_tokens::Pallet<T> as fungibles::Inspect<T::AccountId>>::total_issuance(
					AssetId::NativeAssetId(NativeCurrency::Parent),
				)
				.into()
			}
			AssetId::ForeignAssetId(fid) => {
				let target_collection_id = match <AssetBinding<T>>::get(fid) {
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
		}
	}

	fn minimum_balance(asset: Self::AssetId) -> Self::Balance {
		log::trace!(target: "fassets::impl_foreign_assets", "impl_fungible minimum_balance");
		match asset {
			AssetId::NativeAssetId(NativeCurrency::Here) => {
				<pallet_balances::Pallet<T> as fungible::Inspect<T::AccountId>>::minimum_balance()
					.into()
			}
			AssetId::NativeAssetId(NativeCurrency::Parent) => {
				<orml_tokens::Pallet<T> as fungibles::Inspect<T::AccountId>>::minimum_balance(
					AssetId::NativeAssetId(NativeCurrency::Parent),
				)
				.into()
			}
			AssetId::ForeignAssetId(fid) => AssetMetadatas::<T>::get(AssetId::ForeignAssetId(fid))
				.map(|x| x.minimal_balance)
				.unwrap_or_else(Zero::zero),
		}
	}

	fn balance(asset: Self::AssetId, who: &<T as SystemConfig>::AccountId) -> Self::Balance {
		log::trace!(target: "fassets::impl_foreign_assets", "impl_fungible balance");
		match asset {
			AssetId::NativeAssetId(NativeCurrency::Here) => {
				<pallet_balances::Pallet<T> as fungible::Inspect<T::AccountId>>::balance(who).into()
			}
			AssetId::NativeAssetId(NativeCurrency::Parent) => {
				<orml_tokens::Pallet<T> as fungibles::Inspect<T::AccountId>>::balance(
					AssetId::NativeAssetId(NativeCurrency::Parent),
					who,
				)
				.into()
			}
			AssetId::ForeignAssetId(fid) => {
				let target_collection_id = match <AssetBinding<T>>::get(fid) {
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
		}
	}

	fn total_balance(asset: Self::AssetId, who: &<T as SystemConfig>::AccountId) -> Self::Balance {
		Self::balance(asset, who)
	}

	fn reducible_balance(
		asset: Self::AssetId,
		who: &<T as SystemConfig>::AccountId,
		preservation: Preservation,
		fortitude: Fortitude,
	) -> Self::Balance {
		log::trace!(target: "fassets::impl_foreign_assets", "impl_fungible reducible_balance");

		match asset {
			AssetId::NativeAssetId(NativeCurrency::Here) => {
				<pallet_balances::Pallet<T> as fungible::Inspect<T::AccountId>>::reducible_balance(
					who,
					preservation,
					fortitude,
				)
				.into()
			}
			AssetId::NativeAssetId(NativeCurrency::Parent) => {
				<orml_tokens::Pallet<T> as fungibles::Inspect<T::AccountId>>::reducible_balance(
					AssetId::NativeAssetId(NativeCurrency::Parent),
					who,
					preservation,
					fortitude,
				)
				.into()
			}
			_ => Self::balance(asset, who),
		}
	}

	fn can_deposit(
		asset: Self::AssetId,
		who: &<T as SystemConfig>::AccountId,
		amount: Self::Balance,
		provenance: Provenance,
	) -> DepositConsequence {
		log::trace!(target: "fassets::impl_foreign_assets", "impl_fungible can_deposit");

		match asset {
			AssetId::NativeAssetId(NativeCurrency::Here) => {
				<pallet_balances::Pallet<T> as fungible::Inspect<T::AccountId>>::can_deposit(
					who,
					amount.into(),
					provenance,
				)
			}
			AssetId::NativeAssetId(NativeCurrency::Parent) => {
				<orml_tokens::Pallet<T> as fungibles::Inspect<T::AccountId>>::can_deposit(
					AssetId::NativeAssetId(NativeCurrency::Parent),
					who,
					amount.into(),
					provenance,
				)
			}
			_ => {
				if amount.is_zero() {
					return DepositConsequence::Success;
				}

				let extential_deposit_value = T::ExistentialDeposit::get();
				let ed_value: u128 = match extential_deposit_value.try_into() {
					Ok(val) => val,
					Err(_) => return DepositConsequence::CannotCreate,
				};
				let extential_deposit: Self::Balance = match ed_value.try_into() {
					Ok(val) => val,
					Err(_) => return DepositConsequence::CannotCreate,
				};

				let new_total_balance = match Self::balance(asset, who).checked_add(&amount) {
					Some(x) => x,
					None => return DepositConsequence::Overflow,
				};

				if new_total_balance < extential_deposit {
					return DepositConsequence::BelowMinimum;
				}

				DepositConsequence::Success
			}
		}
	}

	fn can_withdraw(
		asset: Self::AssetId,
		who: &<T as SystemConfig>::AccountId,
		amount: Self::Balance,
	) -> WithdrawConsequence<Self::Balance> {
		log::trace!(target: "fassets::impl_foreign_assets", "impl_fungible can_withdraw");
		let value: u128 = match amount.try_into() {
			Ok(val) => val,
			Err(_) => return WithdrawConsequence::UnknownAsset,
		};

		match asset {
			AssetId::NativeAssetId(NativeCurrency::Here) => {
				let this_amount: <T as pallet_balances::Config>::Balance = match value.try_into() {
					Ok(val) => val,
					Err(_) => {
						return WithdrawConsequence::UnknownAsset;
					}
				};
				match <pallet_balances::Pallet<T> as fungible::Inspect<T::AccountId>>::can_withdraw(
					who,
					this_amount,
				) {
					WithdrawConsequence::BalanceLow => WithdrawConsequence::BalanceLow,
					WithdrawConsequence::WouldDie => WithdrawConsequence::WouldDie,
					WithdrawConsequence::UnknownAsset => WithdrawConsequence::UnknownAsset,
					WithdrawConsequence::Underflow => WithdrawConsequence::Underflow,
					WithdrawConsequence::Overflow => WithdrawConsequence::Overflow,
					WithdrawConsequence::Frozen => WithdrawConsequence::Frozen,
					WithdrawConsequence::Success => WithdrawConsequence::Success,
					_ => WithdrawConsequence::BalanceLow,
				}
			}
			AssetId::NativeAssetId(NativeCurrency::Parent) => {
				let parent_amount: <T as orml_tokens::Config>::Balance = match value.try_into() {
					Ok(val) => val,
					Err(_) => {
						return WithdrawConsequence::UnknownAsset;
					}
				};
				match <orml_tokens::Pallet<T> as fungibles::Inspect<T::AccountId>>::can_withdraw(
					AssetId::NativeAssetId(NativeCurrency::Parent),
					who,
					parent_amount,
				) {
					WithdrawConsequence::BalanceLow => WithdrawConsequence::BalanceLow,
					WithdrawConsequence::WouldDie => WithdrawConsequence::WouldDie,
					WithdrawConsequence::UnknownAsset => WithdrawConsequence::UnknownAsset,
					WithdrawConsequence::Underflow => WithdrawConsequence::Underflow,
					WithdrawConsequence::Overflow => WithdrawConsequence::Overflow,
					WithdrawConsequence::Frozen => WithdrawConsequence::Frozen,
					WithdrawConsequence::Success => WithdrawConsequence::Success,
					_ => WithdrawConsequence::BalanceLow,
				}
			}
			_ => match Self::balance(asset, who).checked_sub(&amount) {
				Some(_) => WithdrawConsequence::Success,
				None => WithdrawConsequence::BalanceLow,
			},
		}
	}

	fn asset_exists(asset: AssetId) -> bool {
		match asset {
			AssetId::NativeAssetId(_) => true,
			AssetId::ForeignAssetId(fid) => <AssetBinding<T>>::contains_key(fid),
		}
	}
}

impl<T: Config> fungibles::Mutate<<T as SystemConfig>::AccountId> for Pallet<T>
where
	T: orml_tokens::Config<CurrencyId = AssetId>,
	BalanceOf<T>: From<<T as pallet_balances::Config>::Balance>,
	BalanceOf<T>: From<<T as orml_tokens::Config>::Balance>,
	<T as pallet_balances::Config>::Balance: From<BalanceOf<T>>,
	<T as orml_tokens::Config>::Balance: From<BalanceOf<T>>,
	u128: From<BalanceOf<T>>,
{
	fn mint_into(
		asset: Self::AssetId,
		who: &<T as SystemConfig>::AccountId,
		amount: Self::Balance,
	) -> Result<BalanceOf<T>, DispatchError> {
		//Self::do_mint(asset, who, amount, None)
		log::trace!(target: "fassets::impl_foreign_assets", "impl_fungible mint_into {:?}", asset);

		match asset {
			AssetId::NativeAssetId(NativeCurrency::Here) => {
				<pallet_balances::Pallet<T> as fungible::Mutate<T::AccountId>>::mint_into(
					who,
					amount.into(),
				)
				.map(Into::into)
			}
			AssetId::NativeAssetId(NativeCurrency::Parent) => {
				<orml_tokens::Pallet<T> as fungibles::Mutate<T::AccountId>>::mint_into(
					AssetId::NativeAssetId(NativeCurrency::Parent),
					who,
					amount.into(),
				)
				.map(Into::into)
			}
			AssetId::ForeignAssetId(fid) => {
				let target_collection_id = match <AssetBinding<T>>::get(fid) {
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

				let amount_data: pallet_fungible::CreateItemData<T> =
					(account.clone(), amount.into());

				pallet_fungible::Pallet::<T>::create_item_foreign(
					&collection,
					&account,
					amount_data,
					&Value::new(0),
				)?;

				Ok(amount)
			}
		}
	}

	fn burn_from(
		asset: Self::AssetId,
		who: &<T as SystemConfig>::AccountId,
		amount: Self::Balance,
		precision: Precision,
		fortitude: Fortitude,
	) -> Result<Self::Balance, DispatchError> {
		// let f = DebitFlags { keep_alive: false, best_effort: false };
		log::trace!(target: "fassets::impl_foreign_assets", "impl_fungible burn_from");

		match asset {
			AssetId::NativeAssetId(NativeCurrency::Here) => {
				<pallet_balances::Pallet<T> as fungible::Mutate<T::AccountId>>::burn_from(
					who,
					amount.into(),
					precision,
					fortitude,
				)
				.map(Into::into)
			}
			AssetId::NativeAssetId(NativeCurrency::Parent) => {
				<orml_tokens::Pallet<T> as fungibles::Mutate<T::AccountId>>::burn_from(
					AssetId::NativeAssetId(NativeCurrency::Parent),
					who,
					amount.into(),
					precision,
					fortitude,
				)
				.map(Into::into)
			}
			AssetId::ForeignAssetId(fid) => {
				let target_collection_id = match <AssetBinding<T>>::get(fid) {
					Some(v) => v,
					None => {
						return Err(DispatchError::Other(
							"Associated collection not found for asset",
						))
					}
				};
				let collection =
					FungibleHandle::cast(<CollectionHandle<T>>::try_get(target_collection_id)?);
				pallet_fungible::Pallet::<T>::burn_foreign(
					&collection,
					&T::CrossAccountId::from_sub(who.clone()),
					amount.into(),
				)?;

				Ok(amount)
			}
		}
	}

	fn transfer(
		asset: Self::AssetId,
		source: &<T as SystemConfig>::AccountId,
		dest: &<T as SystemConfig>::AccountId,
		amount: Self::Balance,
		preservation: Preservation,
	) -> Result<Self::Balance, DispatchError> {
		// let f = TransferFlags { keep_alive, best_effort: false, burn_dust: false };
		log::trace!(target: "fassets::impl_foreign_assets", "impl_fungible transfer");

		match asset {
			AssetId::NativeAssetId(NativeCurrency::Here) => {
				match <pallet_balances::Pallet<T> as fungible::Mutate<T::AccountId>>::transfer(
					source,
					dest,
					amount.into(),
					preservation,
				) {
					Ok(_) => Ok(amount),
					Err(_) => Err(DispatchError::Other(
						"Bad amount to relay chain value conversion",
					)),
				}
			}
			AssetId::NativeAssetId(NativeCurrency::Parent) => {
				match <orml_tokens::Pallet<T> as fungibles::Mutate<T::AccountId>>::transfer(
					AssetId::NativeAssetId(NativeCurrency::Parent),
					source,
					dest,
					amount.into(),
					preservation,
				) {
					Ok(_) => Ok(amount),
					Err(e) => Err(e),
				}
			}
			AssetId::ForeignAssetId(fid) => {
				let target_collection_id = match <AssetBinding<T>>::get(fid) {
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
					amount.into(),
					&Value::new(0),
				)
				.map_err(|e| e.error)?;

				Ok(amount)
			}
		}
	}
}

#[cfg(not(debug_assertions))]
extern "C" {
	// This function does not exists, thus compilation will fail, if its call is
	// not optimized away, which is only possible if it's not called at all.
	//
	// not(debug_assertions) is used to ensure compiler is dropping unused functions, as
	// this option is enabled in release by defailt
	//
	// FIXME: maybe use build.rs, to ensure it will fail even in release with debug_assertions
	// enabled?
	fn unbalanced_fungible_is_called();
}
macro_rules! ensure_balanced {
	() => {{
		#[cfg(debug_assertions)]
		panic!("unbalanced fungible methods should not be used");
		#[cfg(not(debug_assertions))]
		{
			unsafe { unbalanced_fungible_is_called() };
			unreachable!();
		}
	}};
}

impl<T: Config> fungibles::Unbalanced<<T as SystemConfig>::AccountId> for Pallet<T>
where
	T: orml_tokens::Config<CurrencyId = AssetId>,
	BalanceOf<T>: From<<T as pallet_balances::Config>::Balance>,
	BalanceOf<T>: From<<T as orml_tokens::Config>::Balance>,
	<T as pallet_balances::Config>::Balance: From<BalanceOf<T>>,
	<T as orml_tokens::Config>::Balance: From<BalanceOf<T>>,
	u128: From<BalanceOf<T>>,
{
	fn handle_dust(_dust: fungibles::Dust<<T as SystemConfig>::AccountId, Self>) {
		ensure_balanced!();
	}
	fn write_balance(
		_asset: Self::AssetId,
		_who: &<T as SystemConfig>::AccountId,
		_amount: Self::Balance,
	) -> Result<Option<Self::Balance>, DispatchError> {
		ensure_balanced!();
	}
	fn set_total_issuance(_asset: Self::AssetId, _amount: Self::Balance) {
		ensure_balanced!();
	}
}
