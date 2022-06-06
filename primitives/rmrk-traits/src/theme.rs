use codec::{Decode, Encode};
use scale_info::TypeInfo;

#[cfg(feature = "std")]
use serde::Serialize;

#[cfg(feature = "std")]
use crate::serialize;

#[cfg_attr(feature = "std", derive(Eq, Serialize))]
#[derive(Encode, Decode, Debug, TypeInfo, Clone, PartialEq)]
#[cfg_attr(
	feature = "std",
	serde(bound = r#"
			BoundedString: AsRef<[u8]>,
			PropertyList: AsRef<[ThemeProperty<BoundedString>]>,
		"#)
)]
pub struct Theme<BoundedString, PropertyList> {
	/// Name of the theme
	#[cfg_attr(feature = "std", serde(with = "serialize::vec"))]
	pub name: BoundedString,

	/// Theme properties
	#[cfg_attr(feature = "std", serde(with = "serialize::vec"))]
	pub properties: PropertyList,
	/// Inheritability
	pub inherit: bool,
}

#[cfg_attr(feature = "std", derive(Eq, Serialize))]
#[derive(Encode, Decode, Debug, TypeInfo, Clone, PartialEq)]
#[cfg_attr(feature = "std", serde(bound = "BoundedString: AsRef<[u8]>"))]
pub struct ThemeProperty<BoundedString> {
	/// Key of the property
	#[cfg_attr(feature = "std", serde(with = "serialize::vec"))]
	pub key: BoundedString,

	/// Value of the property
	#[cfg_attr(feature = "std", serde(with = "serialize::vec"))]
	pub value: BoundedString,
}
