use core::fmt;
use sp_std::collections::{btree_map::BTreeMap, btree_set::BTreeSet};
use sp_std::vec::Vec;

use frame_support::{
	BoundedVec,
	storage::{bounded_btree_map::BoundedBTreeMap, bounded_btree_set::BoundedBTreeSet},
};

/// BoundedVec doesn't supports serde
#[cfg(feature = "serde1")]
pub mod vec_serde {
	use core::convert::TryFrom;
	use frame_support::{BoundedVec, traits::Get};
	use serde::{
		ser::{self, Serialize},
		de::{self, Deserialize, Error},
	};
	use sp_std::vec::Vec;

	pub fn serialize<D, V, S>(value: &BoundedVec<V, S>, serializer: D) -> Result<D::Ok, D::Error>
	where
		D: ser::Serializer,
		V: Serialize,
	{
		(value as &Vec<_>).serialize(serializer)
	}

	pub fn deserialize<'de, D, V, S>(deserializer: D) -> Result<BoundedVec<V, S>, D::Error>
	where
		D: de::Deserializer<'de>,
		V: de::Deserialize<'de>,
		S: Get<u32>,
	{
		// TODO: Implement custom visitor, which will limit vec size at parse time? Will serde only be used by chainspec?
		let vec = <Vec<V>>::deserialize(deserializer)?;
		let len = vec.len();
		TryFrom::try_from(vec).map_err(|_| D::Error::invalid_length(len, &"lesser size"))
	}
}

pub fn vec_debug<V, S>(v: &BoundedVec<V, S>, f: &mut fmt::Formatter) -> Result<(), fmt::Error>
where
	V: fmt::Debug,
{
	use core::fmt::Debug;
	(&v as &Vec<V>).fmt(f)
}

#[cfg(feature = "serde1")]
#[allow(dead_code)]
pub mod map_serde {
	use core::convert::TryFrom;
	use sp_std::collections::btree_map::BTreeMap;
	use frame_support::{traits::Get, storage::bounded_btree_map::BoundedBTreeMap};
	use serde::{
		ser::{self, Serialize},
		de::{self, Deserialize, Error},
	};
	pub fn serialize<D, K, V, S>(
		value: &BoundedBTreeMap<K, V, S>,
		serializer: D,
	) -> Result<D::Ok, D::Error>
	where
		D: ser::Serializer,
		K: Serialize + Ord,
		V: Serialize,
	{
		(value as &BTreeMap<_, _>).serialize(serializer)
	}

	pub fn deserialize<'de, D, K, V, S>(
		deserializer: D,
	) -> Result<BoundedBTreeMap<K, V, S>, D::Error>
	where
		D: de::Deserializer<'de>,
		K: de::Deserialize<'de> + Ord,
		V: de::Deserialize<'de>,
		S: Get<u32>,
	{
		let map = <BTreeMap<K, V>>::deserialize(deserializer)?;
		let len = map.len();
		TryFrom::try_from(map).map_err(|_| D::Error::invalid_length(len, &"lesser size"))
	}
}

pub fn map_debug<K, V, S>(
	v: &BoundedBTreeMap<K, V, S>,
	f: &mut fmt::Formatter,
) -> Result<(), fmt::Error>
where
	K: fmt::Debug + Ord,
	V: fmt::Debug,
{
	use core::fmt::Debug;
	(&v as &BTreeMap<K, V>).fmt(f)
}

#[cfg(feature = "serde1")]
#[allow(dead_code)]
pub mod set_serde {
	use core::convert::TryFrom;
	use sp_std::collections::btree_set::BTreeSet;
	use frame_support::{traits::Get, storage::bounded_btree_set::BoundedBTreeSet};
	use serde::{
		ser::{self, Serialize},
		de::{self, Deserialize, Error},
	};
	pub fn serialize<D, K, S>(
		value: &BoundedBTreeSet<K, S>,
		serializer: D,
	) -> Result<D::Ok, D::Error>
	where
		D: ser::Serializer,
		K: Serialize + Ord,
	{
		(value as &BTreeSet<_>).serialize(serializer)
	}

	pub fn deserialize<'de, D, K, S>(deserializer: D) -> Result<BoundedBTreeSet<K, S>, D::Error>
	where
		D: de::Deserializer<'de>,
		K: de::Deserialize<'de> + Ord,
		S: Get<u32>,
	{
		let map = <BTreeSet<K>>::deserialize(deserializer)?;
		let len = map.len();
		TryFrom::try_from(map).map_err(|_| D::Error::invalid_length(len, &"lesser size"))
	}
}

pub fn set_debug<K, S>(v: &BoundedBTreeSet<K, S>, f: &mut fmt::Formatter) -> Result<(), fmt::Error>
where
	K: fmt::Debug + Ord,
{
	use core::fmt::Debug;
	(&v as &BTreeSet<K>).fmt(f)
}
