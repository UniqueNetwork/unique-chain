use codec::{Decode, Encode, MaxEncodedLen};
use scale_info::TypeInfo;

#[cfg(feature = "std")]
use serde::Serialize;

#[cfg(feature = "std")]
use crate::serialize;

#[cfg_attr(feature = "std", derive(PartialEq, Eq, Serialize))]
#[derive(Encode, Decode, Debug, TypeInfo, MaxEncodedLen)]
#[cfg_attr(
	feature = "std",
	serde(bound = r#"
			AccountId: Serialize,
			BoundedString: AsRef<[u8]>
		"#)
)]
pub struct BaseInfo<AccountId, BoundedString> {
	/// Original creator of the Base
	pub issuer: AccountId,

	/// Specifies how an NFT should be rendered, ie "svg"
	#[cfg_attr(feature = "std", serde(with = "serialize::vec"))]
	pub base_type: BoundedString,

	/// User provided symbol during Base creation
	#[cfg_attr(feature = "std", serde(with = "serialize::vec"))]
	pub symbol: BoundedString,
}
