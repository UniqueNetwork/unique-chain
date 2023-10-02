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

// Original license:
// Copyright (C) 2021 Parity Technologies (UK) Ltd.
// SPDX-License-Identifier: Apache-2.0

// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// 	http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

//! Benchmarking setup for pallet-collator-selection

use super::*;

#[allow(unused)]
use crate::{Pallet as CollatorSelection, BalanceOf};
use frame_benchmarking::{account, benchmarks, impl_benchmark_test_suite, whitelisted_caller};
use frame_support::{
	assert_ok,
	codec::Decode,
	traits::{
		EnsureOrigin,
		fungible::{Inspect, Mutate},
		Get,
	},
};
use frame_system::{EventRecord, RawOrigin};
use pallet_authorship::EventHandler;
use pallet_session::{self as session, SessionManager};
use sp_std::prelude::*;

use super::*;
#[allow(unused)]
use crate::{BalanceOf, Pallet as CollatorSelection};

const SEED: u32 = 0;

// TODO: remove if this is given in substrate commit.
macro_rules! whitelist {
	($acc:ident) => {
		frame_benchmarking::benchmarking::add_to_whitelist(
			frame_system::Account::<T>::hashed_key_for(&$acc).into(),
		);
	};
}

fn assert_last_event<T: Config>(generic_event: <T as Config>::RuntimeEvent) {
	let events = frame_system::Pallet::<T>::events();
	let system_event: <T as frame_system::Config>::RuntimeEvent = generic_event.into();
	// compare to the last event record
	let EventRecord { event, .. } = &events[events.len() - 1];
	assert_eq!(event, &system_event);
}

fn create_funded_user<T: Config>(
	string: &'static str,
	n: u32,
	balance_factor: u32,
) -> T::AccountId {
	let user = account(string, n, SEED);
	let balance = balance_unit::<T>() * balance_factor.into();
	let _ = T::Currency::set_balance(&user, balance);
	user
}

fn keys<T: Config + session::Config>(c: u32) -> <T as session::Config>::Keys {
	use rand::{RngCore, SeedableRng};

	let keys = {
		let mut keys = [0u8; 128];

		if c > 0 {
			let mut rng = rand::rngs::StdRng::seed_from_u64(c as u64);
			rng.fill_bytes(&mut keys);
		}

		keys
	};

	Decode::decode(&mut &keys[..]).unwrap()
}

fn validator<T: Config + session::Config>(c: u32) -> (T::AccountId, <T as session::Config>::Keys) {
	(create_funded_user::<T>("candidate", c, 1000), keys::<T>(c))
}

fn register_validators<T: Config + session::Config>(count: u32) -> Vec<T::AccountId> {
	let validators = (0..count).map(|c| validator::<T>(c)).collect::<Vec<_>>();

	for (who, keys) in validators.clone() {
		<session::Pallet<T>>::set_keys(RawOrigin::Signed(who).into(), keys, Vec::new()).unwrap();
	}

	validators.into_iter().map(|(who, _)| who).collect()
}

fn register_invulnerables<T: Config>(count: u32) {
	let candidates = (0..count)
		.map(|c| account("candidate", c, SEED))
		.collect::<Vec<_>>();

	for who in candidates {
		<CollatorSelection<T>>::add_invulnerable(
			T::UpdateOrigin::try_successful_origin().unwrap(),
			who,
		)
		.unwrap();
	}
}

fn register_candidates<T: Config>(count: u32) {
	let candidates = (0..count)
		.map(|c| account("candidate", c, SEED))
		.collect::<Vec<_>>();
	assert!(T::LicenseBond::get() > 0u32.into(), "Bond cannot be zero!");

	for who in candidates {
		T::Currency::set_balance(&who, T::LicenseBond::get() * 2u32.into());
		<CollatorSelection<T>>::get_license(RawOrigin::Signed(who.clone()).into()).unwrap();
		<CollatorSelection<T>>::onboard(RawOrigin::Signed(who).into()).unwrap();
	}
}

fn get_licenses<T: Config>(count: u32) {
	let candidates = (0..count)
		.map(|c| account("candidate", c, SEED))
		.collect::<Vec<_>>();
	assert!(T::LicenseBond::get() > 0u32.into(), "Bond cannot be zero!");

	for who in candidates {
		T::Currency::set_balance(&who, T::LicenseBond::get() * 2u32.into());
		<CollatorSelection<T>>::get_license(RawOrigin::Signed(who.clone()).into()).unwrap();
	}
}

/// `Currency::minimum_balance` was used originally, but in unique-chain, we have
/// zero existential deposit, thus triggering zero bond assertion.
fn balance_unit<T: Config>() -> BalanceOf<T> {
	T::LicenseBond::get()
}

/// Our benchmarking environment already has invulnerables registered.
const INITIAL_INVULNERABLES: u32 = 2;

benchmarks! {
	where_clause { where
		T: Config + pallet_authorship::Config + session::Config
	}

	// todo:collator this and all the following do not work for some reason, going all the way up to 10 in length
	// Both invulnerables and candidates count together against MaxCollators.
	// Maybe try putting it in braces? 1 .. (T::MaxCollators::get() - 2)
	add_invulnerable {
		let b in 1 .. T::MaxCollators::get() - INITIAL_INVULNERABLES - 1;
		register_validators::<T>(b);
		register_invulnerables::<T>(b);

		// log::info!("{} {}", <Invulnerables<T>>::get().len(), b);

		let new_invulnerable: T::AccountId = whitelisted_caller();
		let bond: BalanceOf<T> = balance_unit::<T>() * 2u32.into();
		<T as Config>::Currency::set_balance(&new_invulnerable, bond);

		<session::Pallet<T>>::set_keys(
			RawOrigin::Signed(new_invulnerable.clone()).into(),
			keys::<T>(b + 1),
			Vec::new()
		).unwrap();

		let root_origin = T::UpdateOrigin::try_successful_origin().unwrap();
	}: {
		assert_ok!(
			<CollatorSelection<T>>::add_invulnerable(root_origin, new_invulnerable.clone())
		);
	}
	verify {
		assert_last_event::<T>(Event::InvulnerableAdded{invulnerable: new_invulnerable}.into());
	}

	remove_invulnerable {
		let b in 1 .. T::MaxCollators::get() - INITIAL_INVULNERABLES - 1;
		register_validators::<T>(b);
		register_invulnerables::<T>(b);

		let root_origin = T::UpdateOrigin::try_successful_origin().unwrap();
		let leaving = <Invulnerables<T>>::get().last().unwrap().clone();
		whitelist!(leaving);
	}: {
		assert_ok!(
			<CollatorSelection<T>>::remove_invulnerable(root_origin, leaving.clone())
		);
	}
	verify {
		assert_last_event::<T>(Event::InvulnerableRemoved{invulnerable: leaving}.into());
	}

	get_license {
		let c in 1 .. T::MaxCollators::get() - 1;

		register_validators::<T>(c);
		get_licenses::<T>(c);

		let caller: T::AccountId = whitelisted_caller();
		let bond: BalanceOf<T> = balance_unit::<T>() * 2u32.into();
		T::Currency::set_balance(&caller, bond);

		<session::Pallet<T>>::set_keys(
			RawOrigin::Signed(caller.clone()).into(),
			keys::<T>(c + 1),
			Vec::new()
		).unwrap();

	}: _(RawOrigin::Signed(caller.clone()))
	verify {
		assert_last_event::<T>(Event::LicenseObtained{account_id: caller, deposit: bond / 2u32.into()}.into());
	}

	// worst case is when we have all the max-candidate slots filled except one, and we fill that
	// one.
	onboard {
		let c in 1 .. T::MaxCollators::get() - INITIAL_INVULNERABLES - 1;

		register_validators::<T>(c);
		register_candidates::<T>(c);

		let caller: T::AccountId = whitelisted_caller();
		let bond: BalanceOf<T> = balance_unit::<T>() * 2u32.into();
		T::Currency::set_balance(&caller, bond);

		let origin = RawOrigin::Signed(caller.clone());

		<session::Pallet<T>>::set_keys(
			origin.clone().into(),
			keys::<T>(c + 1),
			Vec::new()
		).unwrap();

		assert_ok!(
			<CollatorSelection<T>>::get_license(origin.clone().into())
		);
	}: _(origin)
	verify {
		assert_last_event::<T>(Event::CandidateAdded{account_id: caller}.into());
	}

	// worst case is the last candidate leaving.
	offboard {
		let c in 1 .. T::MaxCollators::get() - INITIAL_INVULNERABLES;

		register_validators::<T>(c);
		register_candidates::<T>(c);

		let leaving = <Candidates<T>>::get().last().unwrap().clone();
		whitelist!(leaving);
	}: _(RawOrigin::Signed(leaving.clone()))
	verify {
		assert_last_event::<T>(Event::CandidateRemoved{account_id: leaving}.into());
	}

	// worst case is the last candidate leaving.
	release_license {
		let c in 1 .. T::MaxCollators::get() - INITIAL_INVULNERABLES;
		let bond = balance_unit::<T>();

		register_validators::<T>(c);
		register_candidates::<T>(c);

		let leaving = <Candidates<T>>::get().last().unwrap().clone();
		whitelist!(leaving);
	}: _(RawOrigin::Signed(leaving.clone()))
	verify {
		assert_last_event::<T>(Event::LicenseReleased{account_id: leaving, deposit_returned: bond}.into());
	}

	// worst case is the last candidate leaving.
	force_release_license {
		let c in 1 .. T::MaxCollators::get() - INITIAL_INVULNERABLES;
		let bond = balance_unit::<T>();

		register_validators::<T>(c);
		register_candidates::<T>(c);

		let leaving = <Candidates<T>>::get().last().unwrap().clone();
		whitelist!(leaving);
		let origin = T::UpdateOrigin::try_successful_origin().unwrap();
	}: {
		assert_ok!(
			<CollatorSelection<T>>::force_release_license(origin, leaving.clone())
		);
	}
	verify {
		assert_last_event::<T>(Event::LicenseReleased{account_id: leaving, deposit_returned: bond}.into());
	}

	// worst case is paying a non-existing candidate account.
	note_author {
		T::Currency::set_balance(
			&<CollatorSelection<T>>::account_id(),
			balance_unit::<T>() * 4u32.into(),
		);
		let author = account("author", 0, SEED);
		let new_block: BlockNumberFor<T>= 10u32.into();

		frame_system::Pallet::<T>::set_block_number(new_block);
		assert!(T::Currency::balance(&author) == 0u32.into());
	}: {
		<CollatorSelection<T> as EventHandler<_, _>>::note_author(author.clone())
	} verify {
		assert!(T::Currency::balance(&author) > 0u32.into());
		assert_eq!(frame_system::Pallet::<T>::block_number(), new_block);
	}

	// worst case for new session.
	new_session {
		let r in 1 .. T::MaxCollators::get() - INITIAL_INVULNERABLES;
		let c in 1 .. T::MaxCollators::get() - INITIAL_INVULNERABLES;

		frame_system::Pallet::<T>::set_block_number(0u32.into());

		register_validators::<T>(c);
		register_candidates::<T>(c);

		let new_block: BlockNumberFor<T>= 1800u32.into();
		let zero_block: T::BlockNumber = 0u32.into();
		let candidates = <Candidates<T>>::get();

		let non_removals = c.saturating_sub(r);

		for i in 0..c {
			<LastAuthoredBlock<T>>::insert(candidates[i as usize].clone(), zero_block);
		}

		if non_removals > 0 {
			for i in 0..non_removals {
				<LastAuthoredBlock<T>>::insert(candidates[i as usize].clone(), new_block);
			}
		} else {
			for i in 0..c {
				<LastAuthoredBlock<T>>::insert(candidates[i as usize].clone(), new_block);
			}
		}

		let pre_length = <Candidates<T>>::get().len();

		frame_system::Pallet::<T>::set_block_number(new_block);

		assert!(<Candidates<T>>::get().len() == c as usize);
	}: {
		<CollatorSelection<T> as SessionManager<_>>::new_session(0)
	} verify {
		if c > r {
			assert!(<Candidates<T>>::get().len() < pre_length);
		} else {
			assert!(<Candidates<T>>::get().len() == pre_length);
		}
	}
}

impl_benchmark_test_suite!(
	CollatorSelection,
	crate::mock::new_test_ext(),
	crate::mock::Test,
);
