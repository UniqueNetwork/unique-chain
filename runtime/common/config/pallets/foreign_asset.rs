use frame_support::{
	pallet_prelude::*, parameter_types, traits::AsEnsureOriginWithArg, weights::Weight, PalletId,
};
#[cfg(not(feature = "governance"))]
use frame_system::EnsureRoot;
use pallet_common::{
	dispatch::CollectionDispatch, CollectionIssuer, CommonCollectionOperations,
	Error as CommonError,
};
use pallet_evm::account::CrossAccountId as CrossAccountIdT;
use pallet_nonfungible::{CreateItemData, NonfungibleHandle};
use pallet_unique::weights::WeightInfo as UniqueWeightInfo;
use xnft_primitives::{
	conversion::{IndexAssetInstance, InteriorGeneralIndex},
	traits::{DerivativeWithdrawal, DispatchErrorConvert, NftClass, NftEngine},
};
use sp_core::H160;
use sp_runtime::traits::{TryConvertInto, AccountIdConversion};
use staging_xcm::prelude::*;
use staging_xcm_builder::AccountKey20Aliases;
use up_common::types::AccountId;
use up_data_structs::{
	budget::ZeroBudget as ZeroNestingBudget, CollectionFlags, CollectionId, CollectionName,
	CollectionTokenPrefix, CreateCollectionData, TokenId,
};

#[cfg(feature = "governance")]
use crate::runtime_common::config::governance;
use crate::{
	runtime_common::{
		config::{
			ethereum::CrossAccountId,
			xcm::{LocationToAccountId, UniversalLocation},
		},
		dispatch::CollectionDispatchT,
	},
	Common, Nonfungible, RelayNetwork, Runtime, RuntimeEvent,
};

parameter_types! {
	pub ForeignAssetsPalletId: PalletId = PalletId(*b"frgnasts");
}

pub struct LocationToCrossAccountId;
impl staging_xcm_executor::traits::ConvertLocation<CrossAccountId> for LocationToCrossAccountId {
	fn convert_location(location: &MultiLocation) -> Option<CrossAccountId> {
		LocationToAccountId::convert_location(location)
			.map(CrossAccountId::from_sub)
			.or_else(|| {
				let eth_address =
					AccountKey20Aliases::<RelayNetwork, H160>::convert_location(location)?;

				Some(CrossAccountId::from_eth(eth_address))
			})
	}
}

impl pallet_xfun::Config for Runtime {
	type RuntimeEvent = RuntimeEvent;

	type PalletId = ForeignAssetsPalletId;
	type UniversalLocation = UniversalLocation;
	type LocationToAccountId = LocationToCrossAccountId;

	type ForeignAssetRegisterOrigin =
		AsEnsureOriginWithArg<governance::RootOrTechnicalCommitteeMember>;
}

#[derive(Debug, PartialEq, Eq, Clone, Encode, Decode, TypeInfo)]
pub struct DerivativeCollectionData {
	pub name: CollectionName,
	pub token_prefix: CollectionTokenPrefix,
}

pub struct UniqueClassData;
impl NftClass<CrossAccountId> for UniqueClassData {
	type ClassId = CollectionId;
	type ClassData = DerivativeCollectionData;

	fn create_class_weight(_data: &Self::ClassData) -> Weight {
		<Runtime as pallet_unique::Config>::WeightInfo::create_collection()
	}

	fn create_class(
		owner: &CrossAccountId,
		data: Self::ClassData,
	) -> Result<Self::ClassId, DispatchError> {
		<Runtime as pallet_common::Config>::CollectionDispatch::create(
			owner.clone(),
			CollectionIssuer::Internals,
			CreateCollectionData {
				name: data.name,
				token_prefix: data.token_prefix,
				flags: CollectionFlags {
					foreign: true,
					..Default::default()
				},
				..Default::default()
			},
		)
	}
}

pub struct UniqueNftEngine;
impl UniqueNftEngine {
	fn nft_collection(
		collection_id: CollectionId,
	) -> Result<NonfungibleHandle<Runtime>, DispatchError> {
		let collection =
			<Runtime as pallet_common::Config>::CollectionDispatch::dispatch(collection_id)?;

		match collection {
			CollectionDispatchT::Nonfungible(collection) => Ok(collection),
			_ => Err(<CommonError<Runtime>>::NoPermission.into()),
		}
	}
}

impl NftEngine<AccountId> for UniqueNftEngine {
	type AccountId = CrossAccountId;
	type Class = UniqueClassData;
	type ClassInstanceId = TokenId;

	fn transfer_class_instance(
		collection_id: &CollectionId,
		token_id: &TokenId,
		from: &CrossAccountId,
		to: &CrossAccountId,
	) -> DispatchResult {
		let collection = Self::nft_collection(*collection_id)?;

		Nonfungible::transfer(&collection, &from, &to, *token_id, &ZeroNestingBudget)
			.map_err(|info| info.error)?;

		Ok(())
	}

	fn mint_derivative(
		collection_id: &CollectionId,
		to: &CrossAccountId,
	) -> Result<Self::ClassInstanceId, DispatchError> {
		let collection = Self::nft_collection(*collection_id)?;
		if !collection.flags.foreign {
			return Err(<CommonError<Runtime>>::NoPermission.into());
		}

		let collection_owner = collection.owner.clone();
		let depositor = CrossAccountId::from_sub(collection_owner);

		Nonfungible::create_item(
			&collection,
			&depositor,
			CreateItemData::<Runtime> {
				owner: to.clone(),
				properties: Default::default(),
			},
			&ZeroNestingBudget,
		)?;

		let derivative_id = collection.last_token_id();
		Ok(derivative_id)
	}

	fn withdraw_derivative(
		_collection_id: &CollectionId,
		_token_id: &TokenId,
		_from: &CrossAccountId,
	) -> Result<DerivativeWithdrawal, DispatchError> {
		Ok(DerivativeWithdrawal::Stash)
	}
}

parameter_types! {
	pub NftEnginePrefix: InteriorMultiLocation = Here.into();

	pub XnftPalletAccountId: CrossAccountId = {
		CrossAccountId::from_sub(ForeignAssetsPalletId::get().into_account_truncating())
	};
}

impl pallet_xnft::Config for Runtime {
	type RuntimeEvent = RuntimeEvent;
	type WeightInfo = pallet_xnft::weights::SubstrateWeight<Self>;

	type NftEngine = UniqueNftEngine;

	type PalletAccountId = XnftPalletAccountId;
	type InteriorAssetIdConvert =
		InteriorGeneralIndex<NftEnginePrefix, CollectionId, TryConvertInto>;
	type AssetInstanceConvert = IndexAssetInstance<TokenId, TryConvertInto>;
	type UniversalLocation = UniversalLocation;
	type LocationToAccountId = LocationToCrossAccountId;
	type ForeignAssetRegisterOrigin =
		AsEnsureOriginWithArg<governance::RootOrTechnicalCommitteeMember>;

	type DispatchErrorsConvert = (CommonToXcmError,);
}

pub struct CommonToXcmError;
impl DispatchErrorConvert for CommonToXcmError {
	type Pallet = Common;
	type Error = CommonError<Runtime>;

	fn convert(error: CommonError<Runtime>) -> XcmError {
		match error {
			CommonError::NoPermission => XcmError::NoPermission,
			_ => XcmError::FailedToTransactAsset(error.into()),
		}
	}
}
