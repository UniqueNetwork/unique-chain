use crate::Config;
use codec::{Encode, EncodeLike, Decode};
use sp_core::H160;
use scale_info::{Type, TypeInfo};
use core::cmp::Ordering;
use serde::{Serialize, Deserialize};
use pallet_evm::AddressMapping;
use sp_std::vec::Vec;
use sp_std::clone::Clone;
pub use up_evm_mapping::EvmBackwardsAddressMapping;

pub trait CrossAccountId<AccountId>:
	Encode + EncodeLike + Decode + TypeInfo + Clone + PartialEq + Ord + core::fmt::Debug + Default
// +
// Serialize + Deserialize<'static>
{
	fn as_sub(&self) -> &AccountId;
	fn as_eth(&self) -> &H160;

	fn from_sub(account: AccountId) -> Self;
	fn from_eth(account: H160) -> Self;

	fn conv_eq(&self, other: &Self) -> bool;
}

#[derive(Encode, Decode, Serialize, Deserialize, TypeInfo)]
#[serde(rename_all = "camelCase")]
enum BasicCrossAccountIdRepr<AccountId> {
	Substrate(AccountId),
	Ethereum(H160),
}

#[derive(PartialEq, Eq)]
pub struct BasicCrossAccountId<T: Config> {
	/// If true - then ethereum is canonical encoding
	from_ethereum: bool,
	substrate: T::AccountId,
	ethereum: H160,
}

impl<T: Config> TypeInfo for BasicCrossAccountId<T> {
	type Identity = Self;

	fn type_info() -> Type {
		<BasicCrossAccountIdRepr<T::AccountId>>::type_info()
	}
}

impl<T: Config> Default for BasicCrossAccountId<T> {
	fn default() -> Self {
		Self::from_sub(T::AccountId::default())
	}
}

impl<T: Config> core::fmt::Debug for BasicCrossAccountId<T> {
	fn fmt(&self, fmt: &mut core::fmt::Formatter) -> core::fmt::Result {
		if self.from_ethereum {
			fmt.debug_tuple("CrossAccountId::Ethereum")
				.field(&self.ethereum)
				.finish()
		} else {
			fmt.debug_tuple("CrossAccountId::Substrate")
				.field(&self.substrate)
				.finish()
		}
	}
}

impl<T: Config> PartialOrd for BasicCrossAccountId<T> {
	fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
		Some(self.substrate.cmp(&other.substrate))
	}
}

impl<T: Config> Ord for BasicCrossAccountId<T> {
	fn cmp(&self, other: &Self) -> Ordering {
		self.partial_cmp(other)
			.expect("substrate account is total ordered")
	}
}

impl<T: Config> Clone for BasicCrossAccountId<T> {
	fn clone(&self) -> Self {
		Self {
			from_ethereum: self.from_ethereum,
			substrate: self.substrate.clone(),
			ethereum: self.ethereum,
		}
	}
}
impl<T: Config> Encode for BasicCrossAccountId<T> {
	fn encode(&self) -> Vec<u8> {
		BasicCrossAccountIdRepr::from(self.clone()).encode()
	}
}
impl<T: Config> EncodeLike for BasicCrossAccountId<T> {}
impl<T: Config> Decode for BasicCrossAccountId<T> {
	fn decode<I>(input: &mut I) -> Result<Self, codec::Error>
	where
		I: codec::Input,
	{
		Ok(BasicCrossAccountIdRepr::decode(input)?.into())
	}
}
impl<T> Serialize for BasicCrossAccountId<T>
where
	T: Config,
	T::AccountId: Serialize,
{
	fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
	where
		S: serde::Serializer,
	{
		let repr = BasicCrossAccountIdRepr::from(self.clone());
		(&repr).serialize(serializer)
	}
}
impl<'de, T> Deserialize<'de> for BasicCrossAccountId<T>
where
	T: Config,
	T::AccountId: Deserialize<'de>,
{
	fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
	where
		D: serde::Deserializer<'de>,
	{
		Ok(BasicCrossAccountIdRepr::deserialize(deserializer)?.into())
	}
}
impl<T: Config> CrossAccountId<T::AccountId> for BasicCrossAccountId<T> {
	fn as_sub(&self) -> &T::AccountId {
		&self.substrate
	}
	fn as_eth(&self) -> &H160 {
		&self.ethereum
	}
	fn from_sub(substrate: T::AccountId) -> Self {
		Self {
			ethereum: T::EvmBackwardsAddressMapping::from_account_id(substrate.clone()),
			substrate,
			from_ethereum: false,
		}
	}
	fn from_eth(ethereum: H160) -> Self {
		Self {
			ethereum,
			substrate: T::EvmAddressMapping::into_account_id(ethereum),
			from_ethereum: true,
		}
	}
	fn conv_eq(&self, other: &Self) -> bool {
		if self.from_ethereum == other.from_ethereum {
			self.substrate == other.substrate && self.ethereum == other.ethereum
		} else if self.from_ethereum {
			// ethereum is canonical encoding, but we need to compare derived address
			self.substrate == other.substrate
		} else {
			self.ethereum == other.ethereum
		}
	}
}
impl<T: Config> From<BasicCrossAccountIdRepr<T::AccountId>> for BasicCrossAccountId<T> {
	fn from(repr: BasicCrossAccountIdRepr<T::AccountId>) -> Self {
		match repr {
			BasicCrossAccountIdRepr::Substrate(s) => Self::from_sub(s),
			BasicCrossAccountIdRepr::Ethereum(e) => Self::from_eth(e),
		}
	}
}
impl<T: Config> From<BasicCrossAccountId<T>> for BasicCrossAccountIdRepr<T::AccountId> {
	fn from(v: BasicCrossAccountId<T>) -> Self {
		if v.from_ethereum {
			BasicCrossAccountIdRepr::Ethereum(*v.as_eth())
		} else {
			BasicCrossAccountIdRepr::Substrate(v.as_sub().clone())
		}
	}
}
