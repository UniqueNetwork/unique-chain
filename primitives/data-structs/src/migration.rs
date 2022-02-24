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
