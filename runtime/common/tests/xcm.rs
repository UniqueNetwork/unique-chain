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
use crate::{
    Call,
    xcm_config::Barrier,
};

fn catch_xcm_barrier_log(logger: &mut Logger, expected_msg: &str) {
    for record in logger {
        if record.target() == "xcm::barrier"
        && record.args() == expected_msg {
            return;
        }
    }

    panic!("the expected XCM barrier log `{}` is not found", expected_msg);
}

#[test]
fn xcm_barrier_does_not_allow_transact() {
    // We have a `AllowTopLevelPaidExecutionFrom` barrier,
    // so an XCM program should start from one of the following commands: 
    // * `WithdrawAsset`
    // * `ReceiveTeleportedAsset`
    // * `ReserveAssetDeposited`
    // * `ClaimAsset` 
    // We use the `WithdrawAsset` in this test

    let location = MultiLocation {
        parents: 0,
        interior: Junctions::Here,
    };

    // let id = AssetId::Concrete(location.clone());
    // let fun = Fungibility::Fungible(42);
    // let multiasset = MultiAsset {
    //     id,
    //     fun,
    // };
    // let withdraw_inst = WithdrawAsset(multiasset.into());

    // We will never decode this "call",
    // so it is irrelevant what we are passing to the `transact` cmd.
    let fake_encoded_call = vec![0u8];

    let transact_inst = Transact {
        origin_type: OriginKind::Superuser,
        require_weight_at_most: 0,
        call: fake_encoded_call.into(),
    };

    let mut xcm_program = Xcm::<Call>(vec![transact_inst]);

    let mut logger = Logger::start();

    let max_weight = 100_000;
    let mut weight_credit = 0;

    let result = Barrier::should_execute(
        &location,
        &mut xcm_program,
        max_weight,
        &mut weight_credit
    );

    assert!(result.is_err(), "the barrier should disallow the XCM transact cmd");

    catch_xcm_barrier_log(&mut logger, "transact XCM rejected");
}
