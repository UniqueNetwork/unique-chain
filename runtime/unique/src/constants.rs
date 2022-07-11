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

use sp_runtime::create_runtime_str;
use sp_version::RuntimeVersion;

use super::constructor::RUNTIME_API_VERSIONS_PUB;

pub const RUNTIME_NAME: &str = "unique";
pub const TOKEN_SYMBOL: &str = "UNQ";

/// This runtime version.
pub const VERSION: RuntimeVersion = RuntimeVersion {
	spec_name: create_runtime_str!(RUNTIME_NAME),
	impl_name: create_runtime_str!(RUNTIME_NAME),
	authoring_version: 1,
	spec_version: 924010,
	impl_version: 0,
	apis: RUNTIME_API_VERSIONS_PUB,
	transaction_version: 1,
	state_version: 0,
};
