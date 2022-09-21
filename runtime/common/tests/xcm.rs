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

use xcm_executor::traits::ShouldExecute;
use xcm::latest::prelude::*;
use logtest::Logger;
use crate::Call;
use super::new_test_ext;

fn catch_xcm_barrier_log(logger: &mut Logger, expected_msg: &str) -> Result<(), String> {
	for record in logger {
		if record.target() == "xcm::barrier" && record.args() == expected_msg {
			return Ok(());
		}
	}

	Err(format!(
		"the expected XCM barrier log `{}` is not found",
		expected_msg
	))
}

/// WARNING: Uses log capturing
/// See https://docs.rs/logtest/latest/logtest/index.html#constraints
pub fn barrier_denies_transact<B: ShouldExecute>(logger: &mut Logger) {
	let location = MultiLocation {
		parents: 0,
		interior: Junctions::Here,
	};

	// We will never decode this "call",
	// so it is irrelevant what we are passing to the `transact` cmd.
	let fake_encoded_call = vec![0u8];

	let transact_inst = Transact {
		origin_type: OriginKind::Superuser,
		require_weight_at_most: 0,
		call: fake_encoded_call.into(),
	};

	let mut xcm_program = Xcm::<Call>(vec![transact_inst]);

	let max_weight = 100_000;
	let mut weight_credit = 100_000_000;

	let result = B::should_execute(&location, &mut xcm_program, max_weight, &mut weight_credit);

	assert!(
		result.is_err(),
		"the barrier should disallow the XCM transact cmd"
	);

	catch_xcm_barrier_log(logger, "transact XCM rejected").unwrap();
}

fn xcm_execute<B: ShouldExecute>(
	self_para_id: u32,
	location: &MultiLocation,
	xcm: &mut Xcm<Call>,
) -> Result<(), ()> {
	new_test_ext(self_para_id).execute_with(|| {
		let max_weight = 100_000;
		let mut weight_credit = 100_000_000;

		B::should_execute(&location, xcm, max_weight, &mut weight_credit)
	})
}

fn make_multiassets(location: &MultiLocation) -> MultiAssets {
	let id = AssetId::Concrete(location.clone());
	let fun = Fungibility::Fungible(42);
	let multiasset = MultiAsset { id, fun };

	multiasset.into()
}

fn make_transfer_reserve_asset(location: &MultiLocation) -> Xcm<Call> {
	let assets = make_multiassets(location);
	let inst = TransferReserveAsset {
		assets,
		dest: location.clone(),
		xcm: Xcm(vec![]),
	};

	Xcm::<Call>(vec![inst])
}

fn make_deposit_reserve_asset(location: &MultiLocation) -> Xcm<Call> {
	let assets = make_multiassets(location);
	let inst = DepositReserveAsset {
		assets: assets.into(),
		max_assets: 42,
		dest: location.clone(),
		xcm: Xcm(vec![]),
	};

	Xcm::<Call>(vec![inst])
}

fn expect_transfer_location_denied<B: ShouldExecute>(
	logger: &mut Logger,
	self_para_id: u32,
	location: &MultiLocation,
	xcm: &mut Xcm<Call>,
) -> Result<(), String> {
	let result = xcm_execute::<B>(self_para_id, location, xcm);

	if result.is_ok() {
		return Err("the barrier should deny the unknown location".into());
	}

	catch_xcm_barrier_log(logger, "Unexpected deposit or transfer location")
}

/// WARNING: Uses log capturing
/// See https://docs.rs/logtest/latest/logtest/index.html#constraints
pub fn barrier_denies_transfer_from_unknown_location<B>(
	logger: &mut Logger,
	self_para_id: u32,
) -> Result<(), String>
where
	B: ShouldExecute,
{
	const UNKNOWN_PARACHAIN_ID: u32 = 4057;

	let unknown_location = MultiLocation {
		parents: 1,
		interior: X1(Parachain(UNKNOWN_PARACHAIN_ID)),
	};

	let mut transfer_reserve_asset = make_transfer_reserve_asset(&unknown_location);
	let mut deposit_reserve_asset = make_deposit_reserve_asset(&unknown_location);

	expect_transfer_location_denied::<B>(
		logger,
		self_para_id,
		&unknown_location,
		&mut transfer_reserve_asset,
	)?;

	expect_transfer_location_denied::<B>(
		logger,
		self_para_id,
		&unknown_location,
		&mut deposit_reserve_asset,
	)?;

	Ok(())
}
