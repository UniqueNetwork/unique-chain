// Template adopted from https://github.com/paritytech/substrate/blob/master/.maintain/frame-weight-template.hbs

//! Autogenerated weights for pallet_foreign_assets
//!
//! THIS FILE WAS AUTO-GENERATED USING THE SUBSTRATE BENCHMARK CLI VERSION 4.0.0-dev
//! DATE: 2023-01-18, STEPS: `50`, REPEAT: 80, LOW RANGE: `[]`, HIGH RANGE: `[]`
//! EXECUTION: None, WASM-EXECUTION: Compiled, CHAIN: None, DB CACHE: 1024

// Executed Command:
// target/release/unique-collator
// benchmark
// pallet
// --pallet
// pallet-foreign-assets
// --wasm-execution
// compiled
// --extrinsic
// *
// --template
// .maintain/frame-weight-template.hbs
// --steps=50
// --repeat=80
// --heap-pages=4096
// --output=./pallets/foreign-assets/src/weights.rs

#![cfg_attr(rustfmt, rustfmt_skip)]
#![allow(unused_parens)]
#![allow(unused_imports)]
#![allow(missing_docs)]
#![allow(clippy::unnecessary_cast)]

use frame_support::{traits::Get, weights::{Weight, constants::RocksDbWeight}};
use sp_std::marker::PhantomData;

/// Weight functions needed for pallet_foreign_assets.
pub trait WeightInfo {
	fn register_foreign_asset() -> Weight;
	fn update_foreign_asset() -> Weight;
}

/// Weights for pallet_foreign_assets using the Substrate node and recommended hardware.
pub struct SubstrateWeight<T>(PhantomData<T>);
impl<T: frame_system::Config> WeightInfo for SubstrateWeight<T> {
	// Storage: Common CreatedCollectionCount (r:1 w:1)
	// Storage: Common DestroyedCollectionCount (r:1 w:0)
	// Storage: System Account (r:2 w:2)
	// Storage: ForeignAssets NextForeignAssetId (r:1 w:1)
	// Storage: ForeignAssets LocationToCurrencyIds (r:1 w:1)
	// Storage: ForeignAssets ForeignAssetLocations (r:1 w:1)
	// Storage: ForeignAssets AssetMetadatas (r:1 w:1)
	// Storage: ForeignAssets AssetBinding (r:1 w:1)
	// Storage: Common CollectionPropertyPermissions (r:0 w:1)
	// Storage: Common CollectionProperties (r:0 w:1)
	// Storage: Common CollectionById (r:0 w:1)
	fn register_foreign_asset() -> Weight {
		Weight::from_ref_time(53_122_000 as u64)
			.saturating_add(T::DbWeight::get().reads(9 as u64))
			.saturating_add(T::DbWeight::get().writes(11 as u64))
	}
	// Storage: ForeignAssets ForeignAssetLocations (r:1 w:1)
	// Storage: ForeignAssets AssetMetadatas (r:1 w:1)
	fn update_foreign_asset() -> Weight {
		Weight::from_ref_time(23_796_000 as u64)
			.saturating_add(T::DbWeight::get().reads(2 as u64))
			.saturating_add(T::DbWeight::get().writes(2 as u64))
	}
}

// For backwards compatibility and tests
impl WeightInfo for () {
	// Storage: Common CreatedCollectionCount (r:1 w:1)
	// Storage: Common DestroyedCollectionCount (r:1 w:0)
	// Storage: System Account (r:2 w:2)
	// Storage: ForeignAssets NextForeignAssetId (r:1 w:1)
	// Storage: ForeignAssets LocationToCurrencyIds (r:1 w:1)
	// Storage: ForeignAssets ForeignAssetLocations (r:1 w:1)
	// Storage: ForeignAssets AssetMetadatas (r:1 w:1)
	// Storage: ForeignAssets AssetBinding (r:1 w:1)
	// Storage: Common CollectionPropertyPermissions (r:0 w:1)
	// Storage: Common CollectionProperties (r:0 w:1)
	// Storage: Common CollectionById (r:0 w:1)
	fn register_foreign_asset() -> Weight {
		Weight::from_ref_time(53_122_000 as u64)
			.saturating_add(RocksDbWeight::get().reads(9 as u64))
			.saturating_add(RocksDbWeight::get().writes(11 as u64))
	}
	// Storage: ForeignAssets ForeignAssetLocations (r:1 w:1)
	// Storage: ForeignAssets AssetMetadatas (r:1 w:1)
	fn update_foreign_asset() -> Weight {
		Weight::from_ref_time(23_796_000 as u64)
			.saturating_add(RocksDbWeight::get().reads(2 as u64))
			.saturating_add(RocksDbWeight::get().writes(2 as u64))
	}
}
