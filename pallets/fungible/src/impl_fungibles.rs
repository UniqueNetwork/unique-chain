use evm_coder::ToLog;
use frame_support::{
	pallet_prelude::*,
	traits::{
		fungibles,
		tokens::{
			AssetId, DepositConsequence, Fortitude, Preservation, Provenance, WithdrawConsequence,
		},
	},
};
use pallet_common::{
	erc::CrossAccountId, eth::collection_id_to_address, CommonCollectionOperations,
	Error as CommonError, Event as CommonEvent, Pallet as PalletCommon,
};
use pallet_evm::Pallet as PalletEvm;
use sp_core::H160;
use sp_runtime::traits::Convert;
use up_data_structs::{CollectionId, TokenId};

use crate::{erc::ERC20Events, Config, FungibleHandle, Pallet};

pub struct FrameFungiblesAdapter<Id, IdConvert, Pallet>(PhantomData<(Id, IdConvert, Pallet)>);
impl<Id, IdConvert: Convert<Id, Option<CollectionId>>, T: Config>
	FrameFungiblesAdapter<Id, IdConvert, Pallet<T>>
{
	fn try_get_fungible_handle(asset: Id) -> Option<FungibleHandle<T>> {
		IdConvert::convert(asset)
			.map(|asset| <FungibleHandle<T>>::try_get(asset).ok())
			.flatten()
	}
}

// This implementation is inspired by Parity's pallet-assets
impl<Id, IdConvert, T> fungibles::Inspect<T::AccountId>
	for FrameFungiblesAdapter<Id, IdConvert, Pallet<T>>
where
	Id: AssetId,
	IdConvert: Convert<Id, Option<CollectionId>>,
	T: Config,
{
	type AssetId = Id;
	type Balance = u128;

	fn total_issuance(asset: Self::AssetId) -> Self::Balance {
		Self::try_get_fungible_handle(asset)
			.map(|handle| handle.total_pieces(TokenId::default()))
			.flatten()
			.unwrap_or(Zero::zero())
	}

	fn minimum_balance(_asset: Self::AssetId) -> Self::Balance {
		Zero::zero()
	}

	fn balance(asset: Self::AssetId, who: &T::AccountId) -> Self::Balance {
		Self::try_get_fungible_handle(asset)
			.map(|handle| {
				handle.balance(T::CrossAccountId::from_sub(who.clone()), TokenId::default())
			})
			.unwrap_or(Zero::zero())
	}

	fn total_balance(asset: Self::AssetId, who: &T::AccountId) -> Self::Balance {
		// we don't have holds/freezes, so the total balance is a regular balance
		Self::balance(asset, who)
	}

	fn reducible_balance(
		asset: Self::AssetId,
		who: &T::AccountId,
		_: Preservation, // we don't have ED, so account preservation doesn't apply
		_: Fortitude,    // we don't have holds/freezes, so reducible balance is a regular balance
	) -> Self::Balance {
		Self::balance(asset, who)
	}

	fn can_deposit(
		asset: Self::AssetId,
		who: &T::AccountId,
		amount: Self::Balance,
		provenance: Provenance,
	) -> DepositConsequence {
		if !Self::asset_exists(asset.clone()) {
			return DepositConsequence::UnknownAsset;
		};

		if provenance == Provenance::Minted {
			if Self::total_issuance(asset.clone())
				.checked_add(amount)
				.is_none()
			{
				return DepositConsequence::Overflow;
			}
		}

		if Self::total_balance(asset, who)
			.checked_add(amount)
			.is_none()
		{
			return DepositConsequence::Overflow;
		}

		DepositConsequence::Success
	}

	fn can_withdraw(
		asset: Self::AssetId,
		who: &T::AccountId,
		amount: Self::Balance,
	) -> WithdrawConsequence<Self::Balance> {
		if !Self::asset_exists(asset.clone()) {
			return WithdrawConsequence::UnknownAsset;
		};

		if Self::total_issuance(asset.clone())
			.checked_sub(amount)
			.is_none()
		{
			return WithdrawConsequence::Underflow;
		}

		if Self::reducible_balance(asset, who, Preservation::Expendable, Fortitude::Polite)
			.checked_sub(amount)
			.is_none()
		{
			return WithdrawConsequence::BalanceLow;
		}

		WithdrawConsequence::Success
	}

	fn asset_exists(asset: Self::AssetId) -> bool {
		Self::try_get_fungible_handle(asset).is_some()
	}
}

// The default impls are good enough for us
impl<Id, IdConvert, T> fungibles::Unbalanced<T::AccountId>
	for FrameFungiblesAdapter<Id, IdConvert, Pallet<T>>
where
	Id: AssetId,
	IdConvert: Convert<Id, Option<CollectionId>>,
	T: Config,
{
	fn handle_dust(_dust: fungibles::Dust<T::AccountId, Self>) { /* we have no dust */
	}

	fn write_balance(
		asset: Self::AssetId,
		who: &T::AccountId,
		amount: Self::Balance,
	) -> Result<Option<Self::Balance>, DispatchError> {
		let handle =
			Self::try_get_fungible_handle(asset).ok_or(<CommonError<T>>::CollectionNotFound)?;
		let asset = handle.id;

		// NOTE: Since `who` is a Substrate account, it can't be a token (tokens always have Ethereum addresses).
		// So we don't need to check/do nesting here.

		let who = T::CrossAccountId::from_sub(who.clone());

		if amount == 0 {
			<crate::Balance<T>>::remove((asset, who));
		} else {
			<crate::Balance<T>>::insert((asset, who), amount);
		}

		let no_dust = None;
		Ok(no_dust)
	}

	fn set_total_issuance(asset: Self::AssetId, amount: Self::Balance) {
		let Some(handle) = Self::try_get_fungible_handle(asset) else {
			return;
		};
		let asset = handle.id;

		<crate::TotalSupply<T>>::insert(asset, amount);
	}
}

// The default impls are good enough for us
impl<Id, IdConvert, T> fungibles::Balanced<T::AccountId>
	for FrameFungiblesAdapter<Id, IdConvert, Pallet<T>>
where
	Id: AssetId,
	IdConvert: Convert<Id, Option<CollectionId>>,
	T: Config,
{
	type OnDropDebt = fungibles::IncreaseIssuance<T::AccountId, Self>;
	type OnDropCredit = fungibles::DecreaseIssuance<T::AccountId, Self>;

	fn done_deposit(asset: Self::AssetId, who: &T::AccountId, amount: Self::Balance) {
		let Some(handle) = Self::try_get_fungible_handle(asset) else {
			return;
		};
		let asset = handle.id;

		let who = T::CrossAccountId::from_sub(who.clone());

		<PalletEvm<T>>::deposit_log(
			ERC20Events::Transfer {
				from: H160::default(),
				to: *who.as_eth(),
				value: amount.into(),
			}
			.to_log(collection_id_to_address(asset)),
		);
		<PalletCommon<T>>::deposit_event(CommonEvent::ItemCreated(
			asset,
			TokenId::default(),
			who,
			amount,
		))
	}
	fn done_withdraw(asset: Self::AssetId, who: &T::AccountId, amount: Self::Balance) {
		let Some(handle) = Self::try_get_fungible_handle(asset) else {
			return;
		};
		let asset = handle.id;

		let who = T::CrossAccountId::from_sub(who.clone());

		<PalletEvm<T>>::deposit_log(
			ERC20Events::Transfer {
				from: *who.as_eth(),
				to: H160::default(),
				value: amount.into(),
			}
			.to_log(collection_id_to_address(asset)),
		);
		<PalletCommon<T>>::deposit_event(CommonEvent::ItemDestroyed(
			asset,
			TokenId::default(),
			who,
			amount,
		));
	}
}
