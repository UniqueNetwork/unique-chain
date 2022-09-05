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

use logtest::Logger;
use crate::{
    runtime_common::tests::xcm::*,
    xcm_config::Barrier,
};

const QUARTZ_PARA_ID: u32 = 2095;

pub fn quartz_xcm_tests(logger: &mut Logger) {
    barrier_denies_transact::<Barrier>(logger);

    barrier_denies_transfer_from_unknown_location::<Barrier>(
        logger,
        QUARTZ_PARA_ID,
    ).expect("quartz runtime denies an unknown location");
}
