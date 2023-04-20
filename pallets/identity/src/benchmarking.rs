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
// This file is part of Substrate.

// Copyright (C) 2020-2022 Parity Technologies (UK) Ltd.
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

//! Identity pallet benchmarking.

#![cfg(feature = "runtime-benchmarks")]

use super::*;

use crate::Pallet as Identity;
use frame_benchmarking::{account, benchmarks, whitelisted_caller};
use frame_support::{
	ensure, assert_ok,
	traits::{EnsureOrigin, Get},
};
use frame_system::RawOrigin;
use sp_runtime::traits::Bounded;

const SEED: u32 = 0;

fn assert_last_event<T: Config>(generic_event: <T as Config>::RuntimeEvent) {
	frame_system::Pallet::<T>::assert_last_event(generic_event.into());
}

// Adds `r` registrars to the Identity Pallet. These registrars will have set fees and fields.
fn add_registrars<T: Config>(r: u32) -> Result<(), &'static str> {
	for i in 0..r {
		let registrar: T::AccountId = account("registrar", i, SEED);
		let registrar_lookup = T::Lookup::unlookup(registrar.clone());
		let _ = T::Currency::make_free_balance_be(&registrar, BalanceOf::<T>::max_value());
		let registrar_origin = T::RegistrarOrigin::try_successful_origin().unwrap();
		Identity::<T>::add_registrar(registrar_origin, registrar_lookup)?;
		Identity::<T>::set_fee(RawOrigin::Signed(registrar.clone()).into(), i, 10u32.into())?;
		let fields = IdentityFields(
			IdentityField::Display
				| IdentityField::Legal
				| IdentityField::Web
				| IdentityField::Riot
				| IdentityField::Email
				| IdentityField::PgpFingerprint
				| IdentityField::Image
				| IdentityField::Twitter,
		);
		Identity::<T>::set_fields(RawOrigin::Signed(registrar.clone()).into(), i, fields)?;
	}

	assert_eq!(Registrars::<T>::get().len(), r as usize);
	Ok(())
}

// Create `s` sub-accounts for the identity of `who` and return them.
// Each will have 32 bytes of raw data added to it.
fn create_sub_accounts<T: Config>(
	who: &T::AccountId,
	s: u32,
) -> Result<Vec<(T::AccountId, Data)>, &'static str> {
	let mut subs = Vec::new();
	let who_origin = RawOrigin::Signed(who.clone());
	let data = Data::Raw(vec![0; 32].try_into().unwrap());

	for i in 0..s {
		let sub_account = account("sub", i, SEED);
		subs.push((sub_account, data.clone()));
	}

	// Set identity so `set_subs` does not fail.
	if IdentityOf::<T>::get(who).is_none() {
		let _ = T::Currency::make_free_balance_be(who, BalanceOf::<T>::max_value() / 2u32.into());
		let info = create_identity_info::<T>(1);
		Identity::<T>::set_identity(who_origin.into(), Box::new(info))?;
	}

	Ok(subs)
}

// Adds `s` sub-accounts to the identity of `who`. Each will have 32 bytes of raw data added to it.
// This additionally returns the vector of sub-accounts so it can be modified if needed.
fn add_sub_accounts<T: Config>(
	who: &T::AccountId,
	s: u32,
) -> Result<Vec<(T::AccountId, Data)>, &'static str> {
	let who_origin = RawOrigin::Signed(who.clone());
	let subs = create_sub_accounts::<T>(who, s)?;

	Identity::<T>::set_subs(who_origin.into(), subs.clone())?;

	Ok(subs)
}

// This creates an `IdentityInfo` object with `num_fields` extra fields.
// All data is pre-populated with some arbitrary bytes.
fn create_identity_info<T: Config>(num_fields: u32) -> IdentityInfo<T::MaxAdditionalFields> {
	let data = Data::Raw(vec![0; 32].try_into().unwrap());

	IdentityInfo {
		additional: vec![(data.clone(), data.clone()); num_fields as usize]
			.try_into()
			.unwrap(),
		display: data.clone(),
		legal: data.clone(),
		web: data.clone(),
		riot: data.clone(),
		email: data.clone(),
		pgp_fingerprint: Some([0; 20]),
		image: data.clone(),
		twitter: data,
	}
}

/// `Currency::minimum_balance` was used originally, but in unique-chain, we have
/// zero existential deposit, thus triggering zero bond assertion.
fn balance_unit<T: Config>() -> <T::Currency as Currency<T::AccountId>>::Balance {
	200u32.into()
}

benchmarks! {
	add_registrar {
		let r in 1 .. T::MaxRegistrars::get() - 1 => add_registrars::<T>(r)?;
		ensure!(Registrars::<T>::get().len() as u32 == r, "Registrars not set up correctly.");
		let origin = T::RegistrarOrigin::try_successful_origin().unwrap();
		let account = T::Lookup::unlookup(account("registrar", r + 1, SEED));
	}: _<T::RuntimeOrigin>(origin, account)
	verify {
		ensure!(Registrars::<T>::get().len() as u32 == r + 1, "Registrars not added.");
	}

	set_identity {
		let r in 1 .. T::MaxRegistrars::get() => add_registrars::<T>(r)?;
		let x in 0 .. T::MaxAdditionalFields::get();
		let caller = {
			// The target user
			let caller: T::AccountId = whitelisted_caller();
			let caller_lookup = T::Lookup::unlookup(caller.clone());
			let caller_origin: <T as frame_system::Config>::RuntimeOrigin = RawOrigin::Signed(caller.clone()).into();
			let _ = T::Currency::make_free_balance_be(&caller, BalanceOf::<T>::max_value());

			// Add an initial identity
			let initial_info = create_identity_info::<T>(1);
			Identity::<T>::set_identity(caller_origin.clone(), Box::new(initial_info.clone()))?;

			// User requests judgement from all the registrars, and they approve
			for i in 0..r {
				let registrar: T::AccountId = account("registrar", i, SEED);
				let registrar_lookup = T::Lookup::unlookup(registrar.clone());
				let balance_to_use =  balance_unit::<T>() * 10u32.into();
				let _ = T::Currency::make_free_balance_be(&registrar, balance_to_use);

				Identity::<T>::request_judgement(caller_origin.clone(), i, 10u32.into())?;
				Identity::<T>::provide_judgement(
					RawOrigin::Signed(registrar).into(),
					i,
					caller_lookup.clone(),
					Judgement::Reasonable,
					T::Hashing::hash_of(&initial_info),
				)?;
			}
			caller
		};
	}: _(RawOrigin::Signed(caller.clone()), Box::new(create_identity_info::<T>(x)))
	verify {
		assert_last_event::<T>(Event::<T>::IdentitySet { who: caller }.into());
	}

	// We need to split `set_subs` into two benchmarks to accurately isolate the potential
	// writes caused by new or old sub accounts. The actual weight should simply be
	// the sum of these two weights.
	set_subs_new {
		let caller: T::AccountId = whitelisted_caller();
		// Create a new subs vec with s sub accounts
		let s in 0 .. T::MaxSubAccounts::get() => ();
		let subs = create_sub_accounts::<T>(&caller, s)?;
		ensure!(SubsOf::<T>::get(&caller).1.len() == 0, "Caller already has subs");
	}: set_subs(RawOrigin::Signed(caller.clone()), subs)
	verify {
		ensure!(SubsOf::<T>::get(&caller).1.len() as u32 == s, "Subs not added");
	}

	set_subs_old {
		let caller: T::AccountId = whitelisted_caller();
		// Give them p many previous sub accounts.
		let p in 0 .. T::MaxSubAccounts::get() => {
			let _ = add_sub_accounts::<T>(&caller, p)?;
		};
		// Remove all subs.
		let subs = create_sub_accounts::<T>(&caller, 0)?;
		ensure!(
			SubsOf::<T>::get(&caller).1.len() as u32 == p,
			"Caller does have subs",
		);
	}: set_subs(RawOrigin::Signed(caller.clone()), subs)
	verify {
		ensure!(SubsOf::<T>::get(&caller).1.len() == 0, "Subs not removed");
	}

	clear_identity {
		let caller: T::AccountId = whitelisted_caller();
		let caller_origin = <T as frame_system::Config>::RuntimeOrigin::from(RawOrigin::Signed(caller.clone()));
		let caller_lookup = <T::Lookup as StaticLookup>::unlookup(caller.clone());
		let _ = T::Currency::make_free_balance_be(&caller, BalanceOf::<T>::max_value());

		let r in 1 .. T::MaxRegistrars::get() => add_registrars::<T>(r)?;
		let s in 0 .. T::MaxSubAccounts::get() => {
			// Give them s many sub accounts
			let caller: T::AccountId = whitelisted_caller();
			let _ = add_sub_accounts::<T>(&caller, s)?;
		};
		let x in 0 .. T::MaxAdditionalFields::get();

		// Create their main identity with x additional fields
		let info = create_identity_info::<T>(x);
		let caller: T::AccountId = whitelisted_caller();
		let caller_origin = <T as frame_system::Config>::RuntimeOrigin::from(RawOrigin::Signed(caller.clone()));
		Identity::<T>::set_identity(caller_origin.clone(), Box::new(info.clone()))?;

		// User requests judgement from all the registrars, and they approve
		for i in 0..r {
			let registrar: T::AccountId = account("registrar", i, SEED);
			let balance_to_use =  balance_unit::<T>() * 10u32.into();
			let _ = T::Currency::make_free_balance_be(&registrar, balance_to_use);

			Identity::<T>::request_judgement(caller_origin.clone(), i, 10u32.into())?;
			Identity::<T>::provide_judgement(
				RawOrigin::Signed(registrar).into(),
				i,
				caller_lookup.clone(),
				Judgement::Reasonable,
				T::Hashing::hash_of(&info),
			)?;
		}
		ensure!(IdentityOf::<T>::contains_key(&caller), "Identity does not exist.");
	}: _(RawOrigin::Signed(caller.clone()))
	verify {
		ensure!(!IdentityOf::<T>::contains_key(&caller), "Identity not cleared.");
	}

	request_judgement {
		let caller: T::AccountId = whitelisted_caller();
		let _ = T::Currency::make_free_balance_be(&caller, BalanceOf::<T>::max_value());

		let r in 1 .. T::MaxRegistrars::get() => add_registrars::<T>(r)?;
		let x in 0 .. T::MaxAdditionalFields::get() => {
			// Create their main identity with x additional fields
			let info = create_identity_info::<T>(x);
			let caller: T::AccountId = whitelisted_caller();
			let caller_origin = <T as frame_system::Config>::RuntimeOrigin::from(RawOrigin::Signed(caller));
			Identity::<T>::set_identity(caller_origin, Box::new(info))?;
		};
	}: _(RawOrigin::Signed(caller.clone()), r - 1, 10u32.into())
	verify {
		assert_last_event::<T>(Event::<T>::JudgementRequested { who: caller, registrar_index: r-1 }.into());
	}

	cancel_request {
		let caller: T::AccountId = whitelisted_caller();
		let caller_origin = <T as frame_system::Config>::RuntimeOrigin::from(RawOrigin::Signed(caller.clone()));
		let _ = T::Currency::make_free_balance_be(&caller, BalanceOf::<T>::max_value());

		let r in 1 .. T::MaxRegistrars::get() => add_registrars::<T>(r)?;
		let x in 0 .. T::MaxAdditionalFields::get() => {
			// Create their main identity with x additional fields
			let info = create_identity_info::<T>(x);
			let caller: T::AccountId = whitelisted_caller();
			let caller_origin = <T as frame_system::Config>::RuntimeOrigin::from(RawOrigin::Signed(caller));
			Identity::<T>::set_identity(caller_origin, Box::new(info))?;
		};

		Identity::<T>::request_judgement(caller_origin, r - 1, 10u32.into())?;
	}: _(RawOrigin::Signed(caller.clone()), r - 1)
	verify {
		assert_last_event::<T>(Event::<T>::JudgementUnrequested { who: caller, registrar_index: r-1 }.into());
	}

	set_fee {
		let caller: T::AccountId = whitelisted_caller();
		let caller_lookup = T::Lookup::unlookup(caller.clone());

		let r in 1 .. T::MaxRegistrars::get() - 1 => add_registrars::<T>(r)?;

		let registrar_origin = T::RegistrarOrigin::try_successful_origin().unwrap();
		Identity::<T>::add_registrar(registrar_origin, caller_lookup)?;
		let registrars = Registrars::<T>::get();
		ensure!(registrars[r as usize].as_ref().unwrap().fee == 0u32.into(), "Fee already set.");
	}: _(RawOrigin::Signed(caller), r, 100u32.into())
	verify {
		let registrars = Registrars::<T>::get();
		ensure!(registrars[r as usize].as_ref().unwrap().fee == 100u32.into(), "Fee not changed.");
	}

	set_account_id {
		let caller: T::AccountId = whitelisted_caller();
		let caller_lookup = T::Lookup::unlookup(caller.clone());
		let _ = T::Currency::make_free_balance_be(&caller, BalanceOf::<T>::max_value());

		let r in 1 .. T::MaxRegistrars::get() - 1 => add_registrars::<T>(r)?;

		let registrar_origin = T::RegistrarOrigin::try_successful_origin().unwrap();
		Identity::<T>::add_registrar(registrar_origin, caller_lookup)?;
		let registrars = Registrars::<T>::get();
		ensure!(registrars[r as usize].as_ref().unwrap().account == caller, "id not set.");
		let new_account = T::Lookup::unlookup(account("new", 0, SEED));
	}: _(RawOrigin::Signed(caller), r, new_account)
	verify {
		let registrars = Registrars::<T>::get();
		ensure!(registrars[r as usize].as_ref().unwrap().account == account("new", 0, SEED), "id not changed.");
	}

	set_fields {
		let caller: T::AccountId = whitelisted_caller();
		let caller_lookup = T::Lookup::unlookup(caller.clone());
		let _ = T::Currency::make_free_balance_be(&caller, BalanceOf::<T>::max_value());

		let r in 1 .. T::MaxRegistrars::get() - 1 => add_registrars::<T>(r)?;

		let registrar_origin = T::RegistrarOrigin::try_successful_origin().unwrap();
		Identity::<T>::add_registrar(registrar_origin, caller_lookup)?;
		let fields = IdentityFields(
			IdentityField::Display | IdentityField::Legal | IdentityField::Web | IdentityField::Riot
			| IdentityField::Email | IdentityField::PgpFingerprint | IdentityField::Image | IdentityField::Twitter
		);
		let registrars = Registrars::<T>::get();
		ensure!(registrars[r as usize].as_ref().unwrap().fields == Default::default(), "fields already set.");
	}: _(RawOrigin::Signed(caller), r, fields)
	verify {
		let registrars = Registrars::<T>::get();
		ensure!(registrars[r as usize].as_ref().unwrap().fields != Default::default(), "fields not set.");
	}

	provide_judgement {
		// The user
		let user: T::AccountId = account("user", r, SEED);
		let user_origin = <T as frame_system::Config>::RuntimeOrigin::from(RawOrigin::Signed(user.clone()));
		let user_lookup = <T::Lookup as StaticLookup>::unlookup(user.clone());
		let _ = T::Currency::make_free_balance_be(&user, BalanceOf::<T>::max_value());

		let caller: T::AccountId = whitelisted_caller();
		let caller_lookup = T::Lookup::unlookup(caller.clone());
		let _ = T::Currency::make_free_balance_be(&caller, BalanceOf::<T>::max_value());

		let r in 1 .. T::MaxRegistrars::get() - 1 => add_registrars::<T>(r)?;
		let x in 0 .. T::MaxAdditionalFields::get();

		let info = create_identity_info::<T>(x);
		let info_hash = T::Hashing::hash_of(&info);
		Identity::<T>::set_identity(user_origin.clone(), Box::new(info))?;

		let registrar_origin = T::RegistrarOrigin::try_successful_origin().unwrap();
		Identity::<T>::add_registrar(registrar_origin, caller_lookup)?;
		Identity::<T>::request_judgement(user_origin, r, 10u32.into())?;
	}: _(RawOrigin::Signed(caller), r, user_lookup, Judgement::Reasonable, info_hash)
	verify {
		assert_last_event::<T>(Event::<T>::JudgementGiven { target: user, registrar_index: r }.into())
	}

	kill_identity {
		let r in 1 .. T::MaxRegistrars::get() => add_registrars::<T>(r)?;
		let s in 0 .. T::MaxSubAccounts::get();
		let x in 0 .. T::MaxAdditionalFields::get();

		let target: T::AccountId = account("target", 0, SEED);
		let target_origin: <T as frame_system::Config>::RuntimeOrigin = RawOrigin::Signed(target.clone()).into();
		let target_lookup = T::Lookup::unlookup(target.clone());
		let _ = T::Currency::make_free_balance_be(&target, BalanceOf::<T>::max_value());

		let info = create_identity_info::<T>(x);
		Identity::<T>::set_identity(target_origin.clone(), Box::new(info.clone()))?;
		let _ = add_sub_accounts::<T>(&target, s)?;

		// User requests judgement from all the registrars, and they approve
		for i in 0..r {
			let registrar: T::AccountId = account("registrar", i, SEED);
			let balance_to_use =  balance_unit::<T>() * 10u32.into();
			let _ = T::Currency::make_free_balance_be(&registrar, balance_to_use);

			Identity::<T>::request_judgement(target_origin.clone(), i, 10u32.into())?;
			Identity::<T>::provide_judgement(
				RawOrigin::Signed(registrar).into(),
				i,
				target_lookup.clone(),
				Judgement::Reasonable,
				T::Hashing::hash_of(&info),
			)?;
		}
		ensure!(IdentityOf::<T>::contains_key(&target), "Identity not set");
		let origin = T::ForceOrigin::try_successful_origin().unwrap();
	}: _<T::RuntimeOrigin>(origin, target_lookup)
	verify {
		ensure!(!IdentityOf::<T>::contains_key(&target), "Identity not removed");
	}

	force_insert_identities {
		let x in 0 .. T::MaxAdditionalFields::get();
		let n in 0..600;
		use frame_benchmarking::account;
		let identities = (0..n).map(|i| (
			account("caller", i, SEED),
			Registration::<BalanceOf<T>, T::MaxRegistrars, T::MaxAdditionalFields> {
				judgements: Default::default(),
				deposit: Default::default(),
				info: create_identity_info::<T>(x),
			},
		)).collect::<Vec<_>>();
		let origin = T::ForceOrigin::try_successful_origin().unwrap();
	}: _<T::RuntimeOrigin>(origin, identities)

	force_remove_identities {
		let x in 0 .. T::MaxAdditionalFields::get();
		let n in 0..600;
		use frame_benchmarking::account;
		let origin = T::ForceOrigin::try_successful_origin().unwrap();
		let identities = (0..n).map(|i| (
			account("caller", i, SEED),
			Registration::<BalanceOf<T>, T::MaxRegistrars, T::MaxAdditionalFields> {
				judgements: Default::default(),
				deposit: Default::default(),
				info: create_identity_info::<T>(x),
			},
		)).collect::<Vec<_>>();
		assert_ok!(
			Identity::<T>::force_insert_identities(origin.clone(), identities.clone()),
		);
		let identities = identities.into_iter().map(|(acc, _)| acc).collect::<Vec<_>>();
	}: _<T::RuntimeOrigin>(origin, identities)

	force_set_subs {
		let s in 0 .. T::MaxSubAccounts::get();
		let n in 0..600;
		use frame_benchmarking::account;
		let identities = (0..n).map(|i| {
			let caller: T::AccountId = account("caller", i, SEED);
			(
				caller.clone(),
				(
					BalanceOf::<T>::max_value(),
					create_sub_accounts::<T>(&caller, s).unwrap().try_into().unwrap(),
				),
			)
		}).collect::<Vec<_>>();
		let origin = T::ForceOrigin::try_successful_origin().unwrap();
	}: _<T::RuntimeOrigin>(origin, identities)

	add_sub {
		let s in 0 .. T::MaxSubAccounts::get() - 1;

		let caller: T::AccountId = whitelisted_caller();
		let _ = add_sub_accounts::<T>(&caller, s)?;
		let sub = account("new_sub", 0, SEED);
		let data = Data::Raw(vec![0; 32].try_into().unwrap());
		ensure!(SubsOf::<T>::get(&caller).1.len() as u32 == s, "Subs not set.");
	}: _(RawOrigin::Signed(caller.clone()), T::Lookup::unlookup(sub), data)
	verify {
		ensure!(SubsOf::<T>::get(&caller).1.len() as u32 == s + 1, "Subs not added.");
	}

	rename_sub {
		let s in 1 .. T::MaxSubAccounts::get();

		let caller: T::AccountId = whitelisted_caller();
		let (sub, _) = add_sub_accounts::<T>(&caller, s)?.remove(0);
		let data = Data::Raw(vec![1; 32].try_into().unwrap());
		ensure!(SuperOf::<T>::get(&sub).unwrap().1 != data, "data already set");
	}: _(RawOrigin::Signed(caller), T::Lookup::unlookup(sub.clone()), data.clone())
	verify {
		ensure!(SuperOf::<T>::get(&sub).unwrap().1 == data, "data not set");
	}

	remove_sub {
		let s in 1 .. T::MaxSubAccounts::get();

		let caller: T::AccountId = whitelisted_caller();
		let (sub, _) = add_sub_accounts::<T>(&caller, s)?.remove(0);
		ensure!(SuperOf::<T>::contains_key(&sub), "Sub doesn't exists");
	}: _(RawOrigin::Signed(caller), T::Lookup::unlookup(sub.clone()))
	verify {
		ensure!(!SuperOf::<T>::contains_key(&sub), "Sub not removed");
	}

	quit_sub {
		let s in 0 .. T::MaxSubAccounts::get() - 1;

		let caller: T::AccountId = whitelisted_caller();
		let sup = account("super", 0, SEED);
		let _ = add_sub_accounts::<T>(&sup, s)?;
		let sup_origin = RawOrigin::Signed(sup).into();
		Identity::<T>::add_sub(sup_origin, T::Lookup::unlookup(caller.clone()), Data::Raw(vec![0; 32].try_into().unwrap()))?;
		ensure!(SuperOf::<T>::contains_key(&caller), "Sub doesn't exists");
	}: _(RawOrigin::Signed(caller.clone()))
	verify {
		ensure!(!SuperOf::<T>::contains_key(&caller), "Sub not removed");
	}

	impl_benchmark_test_suite!(Identity, crate::tests::new_test_ext(), crate::tests::Test);
}
