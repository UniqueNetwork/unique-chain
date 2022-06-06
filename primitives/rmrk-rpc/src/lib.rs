#![cfg_attr(not(feature = "std"), no_std)]

use sp_api::{Encode, Decode};
use sp_std::vec::Vec;
use sp_runtime::DispatchError;
use rmrk_traits::{primitives::*, NftChild};

pub type Result<T> = core::result::Result<T, DispatchError>;

pub type RpcString = Vec<u8>;

pub type PropertyKey = RpcString;

pub type ThemeName = RpcString;

sp_api::decl_runtime_apis! {
	pub trait RmrkApi<
		AccountId,
		CollectionInfo,
		NftInfo,
		ResourceInfo,
		PropertyInfo,
		BaseInfo,
		PartType,
		Theme
	>
	where
		AccountId: Encode,
		CollectionInfo: Decode,
		NftInfo: Decode,
		ResourceInfo: Decode,
		PropertyInfo: Decode,
		BaseInfo: Decode,
		PartType: Decode,
		Theme: Decode,
	{
		fn last_collection_idx() -> Result<CollectionId>;

		fn collection_by_id(id: CollectionId) -> Result<Option<CollectionInfo>>;

		fn nft_by_id(collection_id: CollectionId, nft_id: NftId) -> Result<Option<NftInfo>>;

		fn account_tokens(account_id: AccountId, collection_id: CollectionId) -> Result<Vec<NftId>>;

		fn nft_children(collection_id: CollectionId, nft_id: NftId) -> Result<Vec<NftChild>>;

		fn collection_properties(collection_id: CollectionId, filter_keys: Option<Vec<PropertyKey>>) -> Result<Vec<PropertyInfo>>;

		fn nft_properties(collection_id: CollectionId, nft_id: NftId, filter_keys: Option<Vec<PropertyKey>>) -> Result<Vec<PropertyInfo>>;

		fn nft_resources(collection_id: CollectionId, nft_id: NftId) -> Result<Vec<ResourceInfo>>;

		fn nft_resource_priority(collection_id: CollectionId, nft_id: NftId, resource_id: ResourceId) -> Result<Option<u32>>;

		fn base(base_id: BaseId) -> Result<Option<BaseInfo>>;

		fn base_parts(base_id: BaseId) -> Result<Vec<PartType>>;

		fn theme_names(base_id: BaseId) -> Result<Vec<ThemeName>>;

		fn theme(base_id: BaseId, theme_name: ThemeName, filter_keys: Option<Vec<PropertyKey>>) -> Result<Option<Theme>>;
	}
}
