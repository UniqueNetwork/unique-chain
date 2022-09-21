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

/// Storage migration is not required for this change, as SponsoringRateLimit has same encoding as Option<u32>
#[test]
fn sponsoring_rate_limit_has_same_encoding_as_option_u32() {
	use crate::SponsoringRateLimit;
	use codec::Encode;

	fn limit_to_option(limit: SponsoringRateLimit) -> Option<u32> {
		match limit {
			SponsoringRateLimit::SponsoringDisabled => None,
			SponsoringRateLimit::Blocks(v) => Some(v),
		}
	}

	fn test_to_option(limit: SponsoringRateLimit) {
		let encoded = limit.encode();
		let option = limit_to_option(limit);
		let encoded_option = option.encode();

		assert_eq!(encoded, encoded_option);
	}

	test_to_option(SponsoringRateLimit::SponsoringDisabled);
	test_to_option(SponsoringRateLimit::Blocks(10));
}

#[test]
fn collection_flags_have_same_encoding_as_bool() {
	use crate::CollectionFlags;
	use codec::Encode;

	assert_eq!(
		true.encode(),
		CollectionFlags {
			external: true,
			..Default::default()
		}
		.encode()
	);
	assert_eq!(
		false.encode(),
		CollectionFlags {
			external: false,
			..Default::default()
		}
		.encode()
	);
}
