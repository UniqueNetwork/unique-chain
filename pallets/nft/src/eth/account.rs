use crate::Config;
use codec::{Encode, EncodeLike, Decode};
use sp_core::crypto::AccountId32;
use primitive_types::H160;
use core::cmp::Ordering;
use serde::{Serialize, Deserialize};
use pallet_evm::AddressMapping;
use sp_std::vec::Vec;
use sp_std::clone::Clone;

pub trait CrossAccountId<AccountId>: 
    Encode + EncodeLike + Decode + 
    Clone + PartialEq + Ord + core::fmt::Debug // + 
    // Serialize + Deserialize<'static> 
{
    fn as_sub(&self) -> &AccountId;
    fn as_eth(&self) -> &H160;

    fn from_sub(account: AccountId) -> Self;
    fn from_eth(account: H160) -> Self;
}

#[derive(Eq)]
#[derive(Serialize, Deserialize)]
pub struct BasicCrossAccountId<T: Config> {
    /// If true - then ethereum is canonical encoding
    from_ethereum: bool,
    substrate: T::AccountId,
    ethereum: H160,
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
        self.partial_cmp(other).expect("substrate account is total ordered")
    }
}

impl<T: Config> PartialEq for BasicCrossAccountId<T> {
    fn eq(&self, other: &Self) -> bool {
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
        let as_result = if !self.from_ethereum {
            Ok(self.substrate.clone())
        } else {
            Err(self.ethereum)
        };
        as_result.encode()
    }
}
impl<T: Config> EncodeLike for BasicCrossAccountId<T> {}
impl<T: Config> Decode for BasicCrossAccountId<T> {
    fn decode<I>(input: &mut I) -> Result<Self, codec::Error>
        where I: codec::Input
    {
        Ok(match <Result<T::AccountId, H160>>::decode(input)? {
            Ok(s) => Self::from_sub(s),
            Err(e) => Self::from_eth(e),
        })
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
}

pub trait EvmBackwardsAddressMapping<AccountId> {
    fn from_account_id(account_id: AccountId) -> H160;
}

/// Should have same mapping as EnsureAddressTruncated
pub struct MapBackwardsAddressTruncated;
impl EvmBackwardsAddressMapping<AccountId32> for MapBackwardsAddressTruncated {
    fn from_account_id(account_id: AccountId32) -> H160 {
        let mut out = [0; 20];
        out.copy_from_slice(&(account_id.as_ref() as &[u8])[0..20]);
        H160(out)
    }
}