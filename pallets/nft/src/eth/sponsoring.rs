//! Implements EVM sponsoring logic via OnChargeEVMTransaction

use crate::{Collection, ChainLimit, CollectionById, Config, NftTransferBasket, FungibleTransferBasket, eth::account::EvmBackwardsAddressMapping};
use evm_coder::abi::AbiReader;
use frame_support::{storage::{StorageMap, StorageDoubleMap, StorageValue}, traits::Currency};
use pallet_evm::{EVMCurrencyAdapter, WithdrawReason};
use sp_core::{H160, U256};
use sp_std::prelude::*;
use super::{account::CrossAccountId, erc::{UniqueFungibleCall, UniqueNFTCall, ERC721Call, ERC20Call, ERC721UniqueExtensionsCall}};
use core::convert::TryInto;

type NegativeImbalanceOf<C, T> =
    <C as Currency<<T as frame_system::Config>::AccountId>>::NegativeImbalance;

pub struct ChargeEvmTransaction;
pub struct ChargeEvmLiquidityInfo<T>
where
    T: Config,
    T: pallet_evm::Config,
{
    who: H160,
    negative_imbalance: NegativeImbalanceOf<<T as Config>::Currency, T>,
}

struct AnyError;

fn try_sponsor<T: Config>(caller: &H160, collection_id: u32, collection: &Collection<T>, call: &[u8]) -> Result<(), AnyError> {
    let (method_id, mut reader) = AbiReader::new_call(call).map_err(|_| AnyError)?;
    match &collection.mode {
        crate::CollectionMode::NFT => {
            let call: UniqueNFTCall = UniqueNFTCall::parse(method_id, &mut reader).map_err(|_| AnyError)?.ok_or(AnyError)?;
            match call {
                UniqueNFTCall::ERC721UniqueExtensions(ERC721UniqueExtensionsCall::Transfer {token_id, ..}) | UniqueNFTCall::ERC721(ERC721Call::TransferFrom {token_id, ..})  => {
                    let token_id: u32 = token_id.try_into().map_err(|_| AnyError)?;
                    let block_number = <frame_system::Module<T>>::block_number() as T::BlockNumber;
                    let collection_limits = &collection.limits;
                    let limit: u32 = if collection_limits.sponsor_transfer_timeout > 0 {
                        collection_limits.sponsor_transfer_timeout
                    } else {
                        ChainLimit::get().nft_sponsor_transfer_timeout
                    };

                    let mut sponsor = true;
                    if <NftTransferBasket<T>>::contains_key(collection_id, token_id) {
                        let last_tx_block = <NftTransferBasket<T>>::get(collection_id, token_id);
                        let limit_time = last_tx_block + limit.into();
                        if block_number <= limit_time {
                            sponsor = false;
                        }
                    }
                    if sponsor {
                        <NftTransferBasket<T>>::insert(collection_id, token_id, block_number);
                        return Ok(())
                    }
                },
                _ => {},
            }
        },
        crate::CollectionMode::Fungible(_) => {
            let call: UniqueFungibleCall = UniqueFungibleCall::parse(method_id, &mut reader).map_err(|_| AnyError)?.ok_or(AnyError)?;
            match call {
                UniqueFungibleCall::ERC20(ERC20Call::Transfer {..})  => {
                    let who = T::CrossAccountId::from_eth(caller.clone());
                    let collection_limits = &collection.limits;
                    let limit: u32 = if collection_limits.sponsor_transfer_timeout > 0 {
                        collection_limits.sponsor_transfer_timeout
                    } else {
                        ChainLimit::get().fungible_sponsor_transfer_timeout
                    };

                    let block_number = <frame_system::Module<T>>::block_number() as T::BlockNumber;
                    let mut sponsored = true;
                    if <FungibleTransferBasket<T>>::contains_key(collection_id, who.as_sub()) {
                        let last_tx_block = <FungibleTransferBasket<T>>::get(collection_id, who.as_sub());
                        let limit_time = last_tx_block + limit.into();
                        if block_number <= limit_time {
                            sponsored = false;
                        }
                    }
                    if sponsored {
                        <FungibleTransferBasket<T>>::insert(collection_id, who.as_sub(), block_number);
                        return Ok(())
                    }
                },
                _ => {},
            }
        },
        _ => {},
    }
    return Err(AnyError)
}

impl<T> pallet_evm::OnChargeEVMTransaction<T> for ChargeEvmTransaction
where
    T: Config,
    T: pallet_evm::Config,
{
    type LiquidityInfo = Option<ChargeEvmLiquidityInfo<T>>;

    fn withdraw_fee(
        who: &H160,
        reason: WithdrawReason,
        fee: U256,
    ) -> Result<Self::LiquidityInfo, pallet_evm::Error<T>> {
        let mut who_pays_fee = *who;
        if let WithdrawReason::Call { target, input } = &reason {
            if let Some(collection_id) = crate::eth::map_eth_to_id(&target) {
                if let Some(collection) = <CollectionById<T>>::get(collection_id) {
                    if let Some(sponsor) = collection.sponsorship.sponsor() {
                        if try_sponsor(who, collection_id, &collection, &input).is_ok() {
                            who_pays_fee =
                                T::EvmBackwardsAddressMapping::from_account_id(sponsor.clone());
                        }
                    }
                }
            }
        }

        // TODO: Pay fee from substrate address
        let negative_imbalance = EVMCurrencyAdapter::<<T as Config>::Currency, ()>::withdraw_fee(
            &who_pays_fee,
            reason,
            fee,
        )?;
        Ok(negative_imbalance.map(|i| ChargeEvmLiquidityInfo {
            who: who_pays_fee,
            negative_imbalance: i,
        }))
    }

    fn correct_and_deposit_fee(
        who: &H160,
        corrected_fee: U256,
        already_withdrawn: Self::LiquidityInfo,
    ) -> Result<(), pallet_evm::Error<T>> {
        EVMCurrencyAdapter::<<T as Config>::Currency, ()>::correct_and_deposit_fee(
            &already_withdrawn.as_ref().map(|e| e.who).unwrap_or(*who),
            corrected_fee,
            already_withdrawn.map(|e| e.negative_imbalance),
        )
    }
}
