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

#![allow(missing_docs)]

use super::{Config, Pallet};
use frame_benchmarking::{benchmarks, account};
use frame_system::RawOrigin;
use crate::AssetMetadata;
use crate::Pallet as ForeignAssets;
use xcm::opaque::latest::Junction::Parachain;
use xcm::VersionedMultiLocation;
use frame_support::{
	traits::{Currency},
};
use sp_std::boxed::Box;

benchmarks! {
	register_foreign_asset {
		let origin: RawOrigin<T::AccountId> = frame_system::RawOrigin::Root;
		let owner: T::AccountId = account("user", 0, 1);
		let location: VersionedMultiLocation = VersionedMultiLocation::from(Parachain(1000).into());
		let metadata: AssetMetadata<<<T as Config>::Currency as Currency<<T as frame_system::Config>::AccountId>>::Balance> = AssetMetadata{
			name: "name".into(),
			symbol: "symbol".into(),
			decimals: 18,
			minimal_balance: 1u32.into()
		};
		let mut balance: <<T as Config>::Currency as Currency<<T as frame_system::Config>::AccountId>>::Balance =
		   4_000_000_000u32.into();
		balance = balance * balance;
		<T as Config>::Currency::make_free_balance_be(&owner,
			balance);
	}: {
		ForeignAssets::<T>::register_foreign_asset(origin.into(), owner, Box::new(location), Box::new(metadata))?
	}

	update_foreign_asset {
		let origin: RawOrigin<T::AccountId> = frame_system::RawOrigin::Root;
		let owner: T::AccountId = account("user", 0, 1);
		let location: VersionedMultiLocation = VersionedMultiLocation::from(Parachain(2000).into());
		let metadata: AssetMetadata<<<T as Config>::Currency as Currency<<T as frame_system::Config>::AccountId>>::Balance> = AssetMetadata{
			name: "name".into(),
			symbol: "symbol".into(),
			decimals: 18,
			minimal_balance: 1u32.into()
		};
		let metadata2: AssetMetadata<<<T as Config>::Currency as Currency<<T as frame_system::Config>::AccountId>>::Balance> = AssetMetadata{
			name: "name2".into(),
			symbol: "symbol2".into(),
			decimals: 18,
			minimal_balance: 1u32.into()
		};
		let mut balance: <<T as Config>::Currency as Currency<<T as frame_system::Config>::AccountId>>::Balance =
		   4_000_000_000u32.into();
		balance = balance * balance;
		<T as Config>::Currency::make_free_balance_be(&owner, balance);
		ForeignAssets::<T>::register_foreign_asset(origin.clone().into(), owner, Box::new(location.clone()), Box::new(metadata))?;

	}: {
		ForeignAssets::<T>::update_foreign_asset(origin.into(), 0, Box::new(location), Box::new(metadata2))?
	}
}
