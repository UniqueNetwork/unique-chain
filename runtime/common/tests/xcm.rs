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

use parity_scale_codec::Encode;
use staging_xcm::latest::{prelude::*, Error};

use super::{new_test_ext, AccountId};
use crate::{runtime_common::config::xcm::XcmExecutorConfig, Runtime, RuntimeCall};

type XcmExecutor = staging_xcm_executor::XcmExecutor<XcmExecutorConfig<Runtime>>;

const ALICE: AccountId = AccountId::new([0u8; 32]);
const BOB: AccountId = AccountId::new([1u8; 32]);

const INITIAL_BALANCE: u128 = 10_000_000_000_000_000_000_000; // 10_000 UNQ

#[test]
pub fn xcm_transact_is_forbidden() {
	new_test_ext(vec![(ALICE, INITIAL_BALANCE)]).execute_with(|| {
		let max_weight = Weight::from_parts(1001000, 2000);

		let origin: Location = AccountId32 {
			network: None,
			id: *ALICE.as_ref(),
		}
		.into();
		let message = Xcm(vec![Transact {
			origin_kind: OriginKind::Native,
			fallback_max_weight: Some(Weight::from_parts(1000, 1000)),
			call: RuntimeCall::Balances(pallet_balances::Call::<Runtime>::transfer_keep_alive {
				dest: BOB.into(),
				value: INITIAL_BALANCE / 2,
			})
			.encode()
			.into(),
		}]);
		let mut hash = message.using_encoded(sp_io::hashing::blake2_256);
		let weight_limit = max_weight;
		let weight_credit = max_weight;

		let error = XcmExecutor::prepare_and_execute(
			origin,
			message,
			&mut hash,
			weight_limit,
			weight_credit,
		)
		.ensure_complete()
		.expect_err("XCM Transact shouldn't succeed");

		assert_eq!(error, Error::NoPermission);
	});
}
