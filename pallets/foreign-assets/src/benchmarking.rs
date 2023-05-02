#![allow(missing_docs)]

use super::{Config, Pallet, Call};
use frame_benchmarking::{benchmarks, account};
use frame_system::RawOrigin;
use crate::AssetMetadata;
use xcm::opaque::latest::Junction::Parachain;
use xcm::VersionedMultiLocation;
use xcm::v3::Junctions::X1;
use frame_support::traits::Currency;
use sp_std::{vec::Vec, boxed::Box};

fn bounded<T: TryFrom<Vec<u8>>>(slice: &[u8]) -> T {
	T::try_from(slice.to_vec())
		.map_err(|_| "slice doesn't fit")
		.unwrap()
}

benchmarks! {
	register_foreign_asset {
		let owner: T::AccountId = account("user", 0, 1);
		let location: VersionedMultiLocation = VersionedMultiLocation::from(X1(Parachain(1000)));
		let metadata: AssetMetadata<<<T as Config>::Currency as Currency<<T as frame_system::Config>::AccountId>>::Balance> = AssetMetadata{
			name: bounded(b"name"),
			symbol: bounded(b"symbol"),
			decimals: 18,
			minimal_balance: 1u32.into()
		};
		let mut balance: <<T as Config>::Currency as Currency<<T as frame_system::Config>::AccountId>>::Balance =
		   4_000_000_000u32.into();
		balance = balance * balance;
		<T as Config>::Currency::make_free_balance_be(&owner,
			balance);
	}: _(RawOrigin::Root, owner, Box::new(location), Box::new(metadata))

	update_foreign_asset {
		let owner: T::AccountId = account("user", 0, 1);
		let location: VersionedMultiLocation = VersionedMultiLocation::from(X1(Parachain(2000)));
		let metadata: AssetMetadata<<<T as Config>::Currency as Currency<<T as frame_system::Config>::AccountId>>::Balance> = AssetMetadata{
			name: bounded(b"name"),
			symbol: bounded(b"symbol"),
			decimals: 18,
			minimal_balance: 1u32.into()
		};
		let metadata2: AssetMetadata<<<T as Config>::Currency as Currency<<T as frame_system::Config>::AccountId>>::Balance> = AssetMetadata{
			name: bounded(b"name2"),
			symbol: bounded(b"symbol2"),
			decimals: 18,
			minimal_balance: 1u32.into()
		};
		let mut balance: <<T as Config>::Currency as Currency<<T as frame_system::Config>::AccountId>>::Balance =
		   4_000_000_000u32.into();
		balance = balance * balance;
		<T as Config>::Currency::make_free_balance_be(&owner, balance);
		Pallet::<T>::register_foreign_asset(RawOrigin::Root.into(), owner, Box::new(location.clone()), Box::new(metadata))?;
	}: _(RawOrigin::Root, 0, Box::new(location), Box::new(metadata2))
}
