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

use super::{Call, Config, Pallet};
use frame_benchmarking::benchmarks;
use frame_system::RawOrigin;
use sp_core::{H160, H256};
use sp_std::{vec::Vec, vec};

benchmarks! {
	where_clause { where <T as Config>::RuntimeEvent: codec::Encode }

	begin {
	}: _(RawOrigin::Root, H160::default())

	set_data {
		let b in 0..80;
		let address = H160::from_low_u64_be(b as u64);
		let mut data = Vec::new();
		for i in 0..b {
			data.push((
				H256::from_low_u64_be(i as u64),
				H256::from_low_u64_be(i as u64),
			));
		}
		<Pallet<T>>::begin(RawOrigin::Root.into(), address)?;
	}: _(RawOrigin::Root, address, data)

	finish {
		let b in 0..80;
		let address = H160::from_low_u64_be(b as u64);
		let data: Vec<u8> = (0..b as u8).collect();
		<Pallet<T>>::begin(RawOrigin::Root.into(), address)?;
	}: _(RawOrigin::Root, address, data)

	insert_eth_logs {
		let b in 0..200;
		let logs = (0..b).map(|_| ethereum::Log {
			address: H160([b as u8; 20]),
			data: vec![b as u8; 128],
			topics: vec![H256([b as u8; 32]); 6],
		}).collect::<Vec<_>>();
	}: _(RawOrigin::Root, logs)

	insert_events {
		let b in 0..200;
		use codec::Encode;
		let logs = (0..b).map(|_| <T as Config>::RuntimeEvent::from(crate::Event::<T>::TestEvent).encode()).collect::<Vec<_>>();
	}: _(RawOrigin::Root, logs)

	set_identities {
		let b in 0..600;
		use frame_benchmarking::account;
		use pallet_identity::{BalanceOf, Registration, IdentityInfo};
		let identities = (0..b).map(|i| (
			account("caller", i, 0),
			Some(Registration::<BalanceOf<T>, T::MaxRegistrars, T::MaxAdditionalFields> {
				judgements: Default::default(),
				deposit: Default::default(),
				info: IdentityInfo {
					additional: Default::default(),
					display: Default::default(),
					legal: Default::default(),
					web: Default::default(),
					riot: Default::default(),
					email: Default::default(),
					pgp_fingerprint: None,
					image: Default::default(),
					twitter: Default::default(),
				},
			}),
		)).collect::<Vec<_>>();
	}: _(RawOrigin::Root, identities)
}
