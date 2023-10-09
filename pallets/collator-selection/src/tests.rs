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

use frame_support::{
	assert_noop, assert_ok,
	traits::{fungible, OnInitialize},
};
use scale_info::prelude::*;
use sp_runtime::{traits::BadOrigin, BuildStorage, TokenError};

use crate::{self as collator_selection, mock::*, Config, Error};

fn get_license_and_onboard(account_id: <Test as frame_system::Config>::AccountId) {
	assert_ok!(CollatorSelection::get_license(RuntimeOrigin::signed(
		account_id
	)));
	assert_ok!(CollatorSelection::onboard(RuntimeOrigin::signed(
		account_id
	)));
}

#[test]
fn basic_setup_works() {
	new_test_ext().execute_with(|| {
		assert!(CollatorSelection::candidates().is_empty());
		assert_eq!(CollatorSelection::invulnerables(), vec![1, 2]);
	});
}

#[test]
fn it_should_add_invulnerables() {
	new_test_ext().execute_with(|| {
		assert_ok!(CollatorSelection::add_invulnerable(
			RuntimeOrigin::signed(RootAccount::get()),
			1
		));
		assert_ok!(CollatorSelection::add_invulnerable(
			RuntimeOrigin::signed(RootAccount::get()),
			2
		));
		assert_eq!(CollatorSelection::invulnerables(), vec![1, 2]);

		// cannot set with non-root.
		assert_noop!(
			CollatorSelection::add_invulnerable(RuntimeOrigin::signed(1), 3),
			BadOrigin
		);

		// cannot set invulnerables without associated validator keys
		assert_noop!(
			CollatorSelection::add_invulnerable(RuntimeOrigin::signed(RootAccount::get()), 7),
			Error::<Test>::ValidatorNotRegistered
		);
	});
}

#[test]
fn it_should_remove_invulnerables() {
	new_test_ext().execute_with(|| {
		assert_ok!(CollatorSelection::add_invulnerable(
			RuntimeOrigin::signed(RootAccount::get()),
			1
		));
		assert_ok!(CollatorSelection::add_invulnerable(
			RuntimeOrigin::signed(RootAccount::get()),
			2
		));

		// cannot remove with non-root.
		assert_noop!(
			CollatorSelection::remove_invulnerable(RuntimeOrigin::signed(1), 3),
			BadOrigin
		);

		assert_ok!(CollatorSelection::remove_invulnerable(
			RuntimeOrigin::signed(RootAccount::get()),
			2
		));
		assert_eq!(CollatorSelection::invulnerables(), vec![1]);

		// cannot remove an invulnerable if there would be 0 invulnerables.
		assert_noop!(
			CollatorSelection::remove_invulnerable(RuntimeOrigin::signed(RootAccount::get()), 1),
			Error::<Test>::TooFewInvulnerables
		);
	});
}

#[test]
fn cannot_onboard_candidate_with_no_license() {
	new_test_ext().execute_with(|| {
		// can't onboard a candidate who did not get a license.
		assert_noop!(
			CollatorSelection::onboard(RuntimeOrigin::signed(3)),
			Error::<Test>::NoLicense,
		);

		// but give it a license and welcome aboard.
		assert_ok!(CollatorSelection::get_license(RuntimeOrigin::signed(3)));
		assert_ok!(CollatorSelection::onboard(RuntimeOrigin::signed(3)));
	})
}

#[test]
fn cannot_onboard_candidate_if_too_many() {
	new_test_ext().execute_with(|| {
		// can accept desired value of collators.
		for c in 3u64..=(<Test as Config>::DesiredCollators::get()).into() {
			assert_ok!(CollatorSelection::get_license(RuntimeOrigin::signed(c)));
			assert_ok!(CollatorSelection::onboard(RuntimeOrigin::signed(c)));
		}

		// but no more.
		let undesired_collator = (<Test as Config>::DesiredCollators::get() + 1) as u64;
		assert_ok!(CollatorSelection::get_license(RuntimeOrigin::signed(
			undesired_collator
		)));
		assert_noop!(
			CollatorSelection::onboard(RuntimeOrigin::signed(undesired_collator)),
			Error::<Test>::TooManyCandidates,
		);
	})
}

#[test]
fn cannot_obtain_license_if_keys_not_registered() {
	new_test_ext().execute_with(|| {
		// can't 7 because keys not registered.
		assert_noop!(
			CollatorSelection::get_license(RuntimeOrigin::signed(7)),
			Error::<Test>::ValidatorNotRegistered
		);
	})
}

#[test]
fn cannot_obtain_license_if_poor() {
	new_test_ext().execute_with(|| {
		let ed = <Test as pallet_balances::Config>::ExistentialDeposit::get();
		assert_eq!(Balances::free_balance(3), 100);
		assert_eq!(Balances::free_balance(33), ed);

		// works
		assert_ok!(CollatorSelection::get_license(RuntimeOrigin::signed(3)));

		// poor
		assert_noop!(
			CollatorSelection::get_license(RuntimeOrigin::signed(33)),
			TokenError::FundsUnavailable,
		);
	});
}

#[test]
fn cannot_onboard_dupe_candidate() {
	new_test_ext().execute_with(|| {
		// can add 3 as candidate
		get_license_and_onboard(3);
		assert_eq!(CollatorSelection::license_deposit_of(3), 10);
		assert_eq!(CollatorSelection::candidates(), vec![3]);
		assert_eq!(CollatorSelection::last_authored_block(3), 10);
		assert_eq!(Balances::free_balance(3), 90);

		// but no more
		assert_noop!(
			CollatorSelection::get_license(RuntimeOrigin::signed(3)),
			Error::<Test>::AlreadyHoldingLicense,
		);
		assert_noop!(
			CollatorSelection::onboard(RuntimeOrigin::signed(3)),
			Error::<Test>::AlreadyCandidate,
		);
	})
}

#[test]
fn becoming_candidate_works() {
	new_test_ext().execute_with(|| {
		assert_eq!(CollatorSelection::candidates(), Vec::new());
		assert_eq!(CollatorSelection::invulnerables(), vec![1, 2]);

		// take two endowed, non-invulnerables accounts.
		assert_eq!(Balances::free_balance(3), 100);
		assert_eq!(Balances::free_balance(4), 100);

		get_license_and_onboard(3);
		get_license_and_onboard(4);

		assert_eq!(Balances::free_balance(3), 90);
		assert_eq!(Balances::free_balance(4), 90);

		assert_eq!(CollatorSelection::candidates().len(), 2);
	});
}

#[test]
fn cannot_become_candidate_if_invulnerable() {
	new_test_ext().execute_with(|| {
		assert_eq!(CollatorSelection::invulnerables(), vec![1, 2]);

		// can obtain a license even if is invulnerable.
		assert_ok!(CollatorSelection::get_license(RuntimeOrigin::signed(1)));
		// but cannot onboard
		assert_noop!(
			CollatorSelection::onboard(RuntimeOrigin::signed(1)),
			Error::<Test>::AlreadyInvulnerable,
		);

		// get a license and then become invulnerable.
		assert_ok!(CollatorSelection::get_license(RuntimeOrigin::signed(3)));
		assert_ok!(CollatorSelection::add_invulnerable(
			RuntimeOrigin::signed(RootAccount::get()),
			3
		));
		assert_noop!(
			CollatorSelection::onboard(RuntimeOrigin::signed(3)),
			Error::<Test>::AlreadyInvulnerable,
		);
	})
}

#[test]
fn can_become_invulnerable_if_candidate() {
	new_test_ext().execute_with(|| {
		// become a candidate and then become invulnerable.
		get_license_and_onboard(3);
		assert_eq!(CollatorSelection::candidates(), vec![3]);

		assert_ok!(CollatorSelection::add_invulnerable(
			RuntimeOrigin::signed(RootAccount::get()),
			3
		));
		// should exclude from candidates, but not revoke the license
		assert_eq!(CollatorSelection::candidates(), vec![]);
		assert_eq!(CollatorSelection::license_deposit_of(3), 10);
		assert_eq!(Balances::free_balance(3), 90);
	});
}

#[test]
fn offboard() {
	new_test_ext().execute_with(|| {
		// register a candidate.
		get_license_and_onboard(3);
		assert_eq!(Balances::free_balance(3), 90);

		// cannot leave if holds license but not yet candidate.
		assert_ok!(CollatorSelection::get_license(RuntimeOrigin::signed(4)));
		assert_noop!(
			CollatorSelection::offboard(RuntimeOrigin::signed(4)),
			Error::<Test>::NotCandidate
		);
		// cannot leave if does not hold license.
		assert_noop!(
			CollatorSelection::offboard(RuntimeOrigin::signed(5)),
			Error::<Test>::NotCandidate
		);

		// bond is returned - only after releasing the license
		assert_ok!(CollatorSelection::offboard(RuntimeOrigin::signed(3)));
		assert_eq!(Balances::free_balance(3), 90);
		assert_eq!(CollatorSelection::last_authored_block(3), 0);
		assert_ok!(CollatorSelection::release_license(RuntimeOrigin::signed(3)));
		assert_eq!(Balances::free_balance(3), 100);
	});
}

#[test]
fn release_license() {
	new_test_ext().execute_with(|| {
		// obtain a license to collate and reserve the bond.
		assert_ok!(CollatorSelection::get_license(RuntimeOrigin::signed(3)));
		assert_eq!(Balances::free_balance(3), 90);

		// release the license and get the bond back.
		assert_ok!(CollatorSelection::release_license(RuntimeOrigin::signed(3)));
		assert_eq!(Balances::free_balance(3), 100);

		// register a candidate.
		get_license_and_onboard(3);
		assert_eq!(Balances::free_balance(3), 90);

		// can release license even if onboarded.
		assert_ok!(CollatorSelection::release_license(RuntimeOrigin::signed(3)));
		assert_eq!(Balances::free_balance(3), 100);
		assert_eq!(CollatorSelection::candidates(), vec![]);
	});
}

#[test]
fn force_release_license() {
	new_test_ext().execute_with(|| {
		// obtain a license to collate and reserve the bond.
		assert_ok!(CollatorSelection::get_license(RuntimeOrigin::signed(3)));
		assert_eq!(Balances::free_balance(3), 90);

		// cannot execute the operation as non-root
		assert_noop!(
			CollatorSelection::force_release_license(RuntimeOrigin::signed(3), 3),
			BadOrigin
		);

		// release the license and get the bond back.
		assert_ok!(CollatorSelection::force_release_license(
			RuntimeOrigin::signed(RootAccount::get()),
			3
		));
		assert_eq!(Balances::free_balance(3), 100);

		// register a candidate.
		get_license_and_onboard(3);
		assert_eq!(Balances::free_balance(3), 90);

		// can release license even if onboarded.
		assert_ok!(CollatorSelection::force_release_license(
			RuntimeOrigin::signed(RootAccount::get()),
			3
		));
		assert_eq!(Balances::free_balance(3), 100);
		assert_eq!(CollatorSelection::candidates(), vec![]);
	});
}

#[test]
fn authorship_event_handler() {
	new_test_ext().execute_with(|| {
		// put 100 in the pot + 5 for ED
		<Balances as fungible::Mutate<_>>::set_balance(&CollatorSelection::account_id(), 105);

		// 4 is the default author.
		assert_eq!(Balances::free_balance(4), 100);
		get_license_and_onboard(4);
		// triggers `note_author`
		Authorship::on_initialize(1);

		assert_eq!(CollatorSelection::candidates(), vec![4]);
		assert_eq!(CollatorSelection::last_authored_block(4), 0);

		// half of the pot goes to the collator who's the author (4 in tests).
		assert_eq!(Balances::free_balance(4), 140);
		// half + ED stays.
		assert_eq!(Balances::free_balance(CollatorSelection::account_id()), 55);
	});
}

#[test]
fn fees_edgecases() {
	new_test_ext().execute_with(|| {
		// Nothing panics, no reward when no ED in balance
		Authorship::on_initialize(1);
		// put some money into the pot at ED
		<Balances as fungible::Mutate<_>>::set_balance(&CollatorSelection::account_id(), 5);
		// 4 is the default author.
		assert_eq!(Balances::free_balance(4), 100);
		get_license_and_onboard(4);
		// triggers `note_author`
		Authorship::on_initialize(1);

		assert_eq!(CollatorSelection::candidates(), vec![4]);
		assert_eq!(CollatorSelection::last_authored_block(4), 0);
		// Nothing received
		assert_eq!(Balances::free_balance(4), 90);
		// all fee stays
		assert_eq!(Balances::free_balance(CollatorSelection::account_id()), 5);
	});
}

#[test]
fn session_management_works() {
	new_test_ext().execute_with(|| {
		initialize_to_block(1);

		assert_eq!(SessionChangeBlock::get(), 0);
		assert_eq!(SessionHandlerCollators::get(), vec![1, 2]);

		initialize_to_block(4);

		assert_eq!(SessionChangeBlock::get(), 0);
		assert_eq!(SessionHandlerCollators::get(), vec![1, 2]);

		// add a new collator
		get_license_and_onboard(5);

		// session won't see this.
		assert_eq!(SessionHandlerCollators::get(), vec![1, 2]);
		// but we have a new candidate.
		assert_eq!(CollatorSelection::candidates().len(), 1);

		initialize_to_block(10);
		assert_eq!(SessionChangeBlock::get(), 10);
		// pallet-session has 1 session delay; current validators are the same.
		assert_eq!(Session::validators(), vec![1, 2]);
		// queued ones are changed, and now we have 3.
		assert_eq!(Session::queued_keys().len(), 3);
		// session handlers (aura, et. al.) cannot see this yet.
		assert_eq!(SessionHandlerCollators::get(), vec![1, 2]);

		initialize_to_block(20);
		assert_eq!(SessionChangeBlock::get(), 20);
		// changed are now reflected to session handlers.
		assert_eq!(SessionHandlerCollators::get(), vec![1, 2, 5]);
	});
}

#[test]
fn kick_mechanism() {
	new_test_ext().execute_with(|| {
		// add a new collator
		get_license_and_onboard(3);
		get_license_and_onboard(4);

		initialize_to_block(10);
		assert_eq!(CollatorSelection::candidates().len(), 2);

		initialize_to_block(20);
		assert_eq!(SessionChangeBlock::get(), 20);
		// 4 authored this block, gets to stay 3 was kicked
		assert_eq!(CollatorSelection::candidates().len(), 1);
		// 3 will be kicked after 1 session delay
		assert_eq!(SessionHandlerCollators::get(), vec![1, 2, 3, 4]);

		assert_eq!(CollatorSelection::candidates(), vec![4]);
		// assert_eq!(<KickThreshold<Test>>::get(), 10);
		assert_eq!(CollatorSelection::last_authored_block(4), 20);

		initialize_to_block(30);
		// 3 gets kicked after 1 session delay
		assert_eq!(SessionHandlerCollators::get(), vec![1, 2, 4]);
		// kicked collator gets their funds slashed, the deposit going to treasury
		assert_eq!(Balances::free_balance(3), 90);
	});
}

#[test]
#[should_panic = "duplicate invulnerables in genesis."]
fn cannot_set_genesis_value_twice() {
	sp_tracing::try_init_simple();
	let mut t = <frame_system::GenesisConfig<Test>>::default()
		.build_storage()
		.unwrap();
	let invulnerables = vec![1, 1];

	let collator_selection = collator_selection::GenesisConfig::<Test> { invulnerables };
	// collator selection must be initialized before session.
	collator_selection.assimilate_storage(&mut t).unwrap();
}
