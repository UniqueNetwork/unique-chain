#![cfg_attr(not(feature = "std"), no_std)]

use codec::{Decode, Encode};
/// A FRAME pallet template with necessary imports

/// Feel free to remove or edit this file as needed.
/// If you change the name of this file, make sure to update its references in runtime/src/lib.rs
/// If you remove this file, you can remove those references

/// For more guidance on Substrate FRAME, see the example pallet
/// https://github.com/paritytech/substrate/blob/master/frame/example/src/lib.rs
pub use frame_support::{
    decl_event, decl_module, decl_storage,
    construct_runtime, parameter_types,
    traits::{Currency, Get, ExistenceRequirement, KeyOwnerProofSystem, OnUnbalanced, Randomness, WithdrawReason, Imbalance},
    weights::{
        DispatchInfo, PostDispatchInfo, constants::{BlockExecutionWeight, ExtrinsicBaseWeight, RocksDbWeight, WEIGHT_PER_SECOND},
        IdentityFee, Weight, WeightToFeePolynomial, GetDispatchInfo, Pays,
    },
    StorageValue,
    dispatch::DispatchResult, 
    IsSubType,
    ensure
};

use frame_system::{self as system, ensure_signed};
use sp_runtime::sp_std::prelude::Vec;
use sp_std::prelude::*;
use sp_runtime::{
	FixedU128, FixedPointOperand, 
	transaction_validity::{
		TransactionPriority, ValidTransaction, InvalidTransaction, TransactionValidityError, TransactionValidity
	},
	traits::{
        Saturating, Dispatchable, DispatchInfoOf, PostDispatchInfoOf, SignedExtension, Zero, SaturatedConversion,
	},
};

#[cfg(test)]
mod mock;

#[cfg(test)]
mod tests;

#[derive(Encode, Decode, Default, Clone, PartialEq)]
#[cfg_attr(feature = "std", derive(Debug))]
pub struct CollectionType<AccountId> {
    pub owner: AccountId,
    pub next_item_id: u64,
    pub name: Vec<u16>,        // 64 include null escape char
    pub description: Vec<u16>, // 256 include null escape char
    pub token_prefix: Vec<u8>, // 16 include null escape char
    pub custom_data_size: u32,
    pub sponsor: AccountId,    // Who pays fees. If set to default address, the fees are applied to the transaction sender
    pub unconfirmed_sponsor: AccountId, // Sponsor address that has not yet confirmed sponsorship
}

#[derive(Encode, Decode, Default, Clone, PartialEq)]
#[cfg_attr(feature = "std", derive(Debug))]
pub struct CollectionAdminsType<AccountId> {
    pub admin: AccountId,
    pub collection_id: u64,
}

#[derive(Encode, Decode, Default, Clone, PartialEq)]
#[cfg_attr(feature = "std", derive(Debug))]
pub struct NftItemType<AccountId> {
    pub collection: u64,
    pub owner: AccountId,
    pub data: Vec<u8>,
}

/// The pallet's configuration trait.
pub trait Trait: system::Trait {
    // Add other types and constants required to configure this pallet.

    /// The overarching event type.
    type Event: From<Event<Self>> + Into<<Self as system::Trait>::Event>;

}

// This pallet's storage items.
decl_storage! {
    // It is important to update your storage name so that your pallet's
    // storage items are isolated from other pallets.
    trait Store for Module<T: Trait> as Nft {

        /// Next available collection ID
        pub NextCollectionID get(fn next_collection_id): u64;
        pub Collection get(fn collection): map hasher(identity) u64 => CollectionType<T::AccountId>;
        pub AdminList get(fn admin_list_collection): map hasher(identity) u64 => Vec<T::AccountId>;

        /// Balance owner per collection map
        pub Balance get(fn balance_count): map hasher(blake2_128_concat) (u64, T::AccountId) => u64;
        pub ApprovedList get(fn approved): map hasher(blake2_128_concat) (u64, u64) => Vec<T::AccountId>;

        pub ItemList get(fn item_id): map hasher(blake2_128_concat) (u64, u64) => NftItemType<T::AccountId>;
        pub ItemListIndex get(fn item_index): map hasher(blake2_128_concat) u64 => u64;

        pub AddressTokens get(fn address_tokens): map hasher(blake2_128_concat) (u64, T::AccountId) => Vec<u64>;
    }
}

// The pallet's events
decl_event!(
    pub enum Event<T>
    where
        AccountId = <T as system::Trait>::AccountId,
    {
        Created(u64, AccountId),
        ItemCreated(u64, u64),
        ItemDestroyed(u64, u64),
    }
);

// The pallet's dispatchable functions.
decl_module! {
    /// The module declaration.
    pub struct Module<T: Trait> for enum Call where origin: T::Origin {

        // Initializing events
        // this is needed only if you are using events in your pallet
        fn deposit_event() = default;

        // Create collection of NFT with given parameters
        //
        // @param customDataSz size of custom data in each collection item
        // returns collection ID
        #[weight = 0]
        pub fn create_collection(   origin,
                                    collection_name: Vec<u16>,
                                    collection_description: Vec<u16>,
                                    token_prefix: Vec<u8>,
                                    custom_data_sz: u32) -> DispatchResult {

            // Anyone can create a collection
            let who = ensure_signed(origin)?;

            // check params
            let mut name = collection_name.to_vec();
            name.push(0);
            ensure!(name.len() <= 64, "Collection name can not be longer than 63 char");

            let mut description = collection_description.to_vec();
            description.push(0);
            ensure!(name.len() <= 256, "Collection description can not be longer than 255 char");

            let mut prefix = token_prefix.to_vec();
            prefix.push(0);
            ensure!(prefix.len() <= 16, "Token prefix can not be longer than 15 char");

            // Generate next collection ID
            let next_id = NextCollectionID::get()
                .checked_add(1)
                .expect("collection id error");

            NextCollectionID::put(next_id);

            // Create new collection
            let new_collection = CollectionType {
                owner: who.clone(),
                name: name,
                description: description,
                token_prefix: prefix,
                next_item_id: next_id,
                custom_data_size: custom_data_sz,
                sponsor: T::AccountId::default(),
                unconfirmed_sponsor: T::AccountId::default(),
            };

            // Add new collection to map
            <Collection<T>>::insert(next_id, new_collection);

            // call event
            Self::deposit_event(RawEvent::Created(next_id, who.clone()));

            Ok(())
        }

        #[weight = 0]
        pub fn destroy_collection(origin, collection_id: u64) -> DispatchResult {

            let sender = ensure_signed(origin)?;
            ensure!(<Collection<T>>::contains_key(collection_id), "This collection does not exist");

            let owner = <Collection<T>>::get(collection_id).owner;
            ensure!(sender == owner, "You do not own this collection");
            <Collection<T>>::remove(collection_id);

            Ok(())
        }

        #[weight = 0]
        pub fn change_collection_owner(origin, collection_id: u64, new_owner: T::AccountId) -> DispatchResult {

            let sender = ensure_signed(origin)?;
            ensure!(<Collection<T>>::contains_key(collection_id), "This collection does not exist");

            let mut target_collection = <Collection<T>>::get(collection_id);
            ensure!(sender == target_collection.owner, "You do not own this collection");

            target_collection.owner = new_owner;
            <Collection<T>>::insert(collection_id, target_collection);

            Ok(())
        }

        #[weight = 0]
        pub fn add_collection_admin(origin, collection_id: u64, new_admin_id: T::AccountId) -> DispatchResult {

            let sender = ensure_signed(origin)?;
            ensure!(<Collection<T>>::contains_key(collection_id), "This collection does not exist");

            let target_collection = <Collection<T>>::get(collection_id);
            let is_owner = sender == target_collection.owner;

            let no_perm_mes = "You do not have permissions to modify this collection";
            let exists = <AdminList<T>>::contains_key(collection_id);

            if !is_owner
            {
                 ensure!(exists, no_perm_mes);
                 ensure!(<AdminList<T>>::get(collection_id).contains(&sender), no_perm_mes);
            }

            let mut admin_arr: Vec<T::AccountId> = Vec::new();
            if exists
            {
                admin_arr = <AdminList<T>>::get(collection_id);
                ensure!(!admin_arr.contains(&new_admin_id), "Account already has admin role");
            }

            admin_arr.push(new_admin_id);
            <AdminList<T>>::insert(collection_id, admin_arr);

            Ok(())
        }

        #[weight = 0]
        pub fn remove_collection_admin(origin, collection_id: u64, account_id: T::AccountId) -> DispatchResult {

            let sender = ensure_signed(origin)?;
            ensure!(<Collection<T>>::contains_key(collection_id), "This collection does not exist");

            let target_collection = <Collection<T>>::get(collection_id);
            let is_owner = sender == target_collection.owner;

            let no_perm_mes = "You do not have permissions to modify this collection";
            let exists = <AdminList<T>>::contains_key(collection_id);

            if !is_owner
            {
                ensure!(exists, no_perm_mes);
                ensure!(<AdminList<T>>::get(collection_id).contains(&sender), no_perm_mes);
            }

            if exists
            {
                let mut admin_arr = <AdminList<T>>::get(collection_id);
                admin_arr.retain(|i| *i != account_id);
                <AdminList<T>>::insert(collection_id, admin_arr);
            }

            Ok(())
        }

        #[weight = 0]
        pub fn set_collection_sponsor(origin, collection_id: u64, new_sponsor: T::AccountId) -> DispatchResult {

            let sender = ensure_signed(origin)?;
            ensure!(<Collection<T>>::contains_key(collection_id), "This collection does not exist");

            let mut target_collection = <Collection<T>>::get(collection_id);
            ensure!(sender == target_collection.owner, "You do not own this collection");

            target_collection.unconfirmed_sponsor = new_sponsor;
            <Collection<T>>::insert(collection_id, target_collection);

            Ok(())
        }

        #[weight = 0]
        pub fn confirm_sponsorship(origin, collection_id: u64) -> DispatchResult {

            let sender = ensure_signed(origin)?;
            ensure!(<Collection<T>>::contains_key(collection_id), "This collection does not exist");

            let mut target_collection = <Collection<T>>::get(collection_id);
            ensure!(sender == target_collection.unconfirmed_sponsor, "This address is not set as sponsor, use setCollectionSponsor first");

            target_collection.sponsor = target_collection.unconfirmed_sponsor;
            target_collection.unconfirmed_sponsor = T::AccountId::default();
            <Collection<T>>::insert(collection_id, target_collection);

            Ok(())
        }

        #[weight = 0]
        pub fn remove_collection_sponsor(origin, collection_id: u64) -> DispatchResult {

            let sender = ensure_signed(origin)?;
            ensure!(<Collection<T>>::contains_key(collection_id), "This collection does not exist");

            let mut target_collection = <Collection<T>>::get(collection_id);
            ensure!(sender == target_collection.owner, "You do not own this collection");

            target_collection.sponsor = T::AccountId::default();
            <Collection<T>>::insert(collection_id, target_collection);

            Ok(())
        }
        


        #[weight = 0]
        pub fn create_item(origin, collection_id: u64, properties: Vec<u8>) -> DispatchResult {

            let sender = ensure_signed(origin)?;
            ensure!(<Collection<T>>::contains_key(collection_id), "This collection does not exist");

            let target_collection = <Collection<T>>::get(collection_id);
            ensure!(target_collection.custom_data_size >= properties.len() as u32, "Size of item is too large");
            let is_owner = sender == target_collection.owner;

            let no_perm_mes = "You do not have permissions to modify this collection";
            let exists = <AdminList<T>>::contains_key(collection_id);

            if !is_owner
            {
                ensure!(exists, no_perm_mes);
                ensure!(<AdminList<T>>::get(collection_id).contains(&sender), no_perm_mes);
            }

            let new_balance = <Balance<T>>::get((collection_id, sender.clone())) + 1;
            <Balance<T>>::insert((collection_id, sender.clone()), new_balance);

            // Create new item
            let new_item = NftItemType {
                collection: collection_id,
                owner: sender,
                data: properties,
            };


            let current_index = <ItemListIndex>::get(collection_id)
                .checked_add(1)
                .expect("Item list index id error");

            Self::add_token_index(collection_id, current_index, new_item.owner.clone())?;

            <ItemListIndex>::insert(collection_id, current_index);
            <ItemList<T>>::insert((collection_id, current_index), new_item);

            // call event
            Self::deposit_event(RawEvent::ItemCreated(collection_id, current_index));

            Ok(())
        }

        #[weight = 0]
        pub fn burn_item(origin, collection_id: u64, item_id: u64) -> DispatchResult {

            let sender = ensure_signed(origin)?;
            ensure!(<Collection<T>>::contains_key(collection_id), "This collection does not exist");

            let target_collection = <Collection<T>>::get(collection_id);
            let is_owner = sender == target_collection.owner;

            ensure!(<ItemList<T>>::contains_key((collection_id, item_id)), "Item does not exists");
            let item = <ItemList<T>>::get((collection_id, item_id));

            if !is_owner
            {
                // check if item owner
                if item.owner != sender
                {
                    let no_perm_mes = "You do not have permissions to modify this collection";

                    ensure!(<AdminList<T>>::contains_key(collection_id), no_perm_mes);
                    ensure!(<AdminList<T>>::get(collection_id).contains(&sender), no_perm_mes);
                }
            }
            <ItemList<T>>::remove((collection_id, item_id));

            Self::remove_token_index(collection_id, item_id, item.owner.clone())?;

            // update balance
            let new_balance = <Balance<T>>::get((collection_id, item.owner.clone())) - 1;
            <Balance<T>>::insert((collection_id, item.owner.clone()), new_balance);

            // call event
            Self::deposit_event(RawEvent::ItemDestroyed(collection_id, item_id));

            Ok(())
        }

        #[weight = 0]
        pub fn transfer(origin, collection_id: u64, item_id: u64, new_owner: T::AccountId) -> DispatchResult {

            let sender = ensure_signed(origin)?;
            ensure!(<Collection<T>>::contains_key(collection_id), "This collection does not exist");

            let target_collection = <Collection<T>>::get(collection_id);
            let is_owner = sender == target_collection.owner;

            ensure!(<ItemList<T>>::contains_key((collection_id, item_id)), "Item does not exists");
            let mut item = <ItemList<T>>::get((collection_id, item_id));

            if !is_owner
            {
                // check if item owner
                if item.owner != sender
                {
                    let no_perm_mes = "You do not have permissions to modify this collection";

                    ensure!(<AdminList<T>>::contains_key(collection_id), no_perm_mes);
                    ensure!(<AdminList<T>>::get(collection_id).contains(&sender), no_perm_mes);
                }
            }
            <ItemList<T>>::remove((collection_id, item_id));

            // update balance
            let balance_old_owner = <Balance<T>>::get((collection_id, item.owner.clone())) - 1;
            <Balance<T>>::insert((collection_id, item.owner.clone()), balance_old_owner);

            let balance_new_owner = <Balance<T>>::get((collection_id, new_owner.clone())) + 1;
            <Balance<T>>::insert((collection_id, new_owner.clone()), balance_new_owner);

            // change owner
            let old_owner = item.owner.clone();
            item.owner = new_owner.clone();
            <ItemList<T>>::insert((collection_id, item_id), item);

            // update index collection
            Self::move_token_index(collection_id, item_id, old_owner, new_owner.clone())?;

            // reset approved list
            let itm: Vec<T::AccountId> = Vec::new();
            <ApprovedList<T>>::insert((collection_id, item_id), itm);

            Ok(())
        }

        #[weight = 0]
        pub fn approve(origin, approved: T::AccountId, collection_id: u64, item_id: u64) -> DispatchResult {

            let sender = ensure_signed(origin)?;
            ensure!(<Collection<T>>::contains_key(collection_id), "This collection does not exist");

            let target_collection = <Collection<T>>::get(collection_id);
            let is_owner = sender == target_collection.owner;

            ensure!(<ItemList<T>>::contains_key((collection_id, item_id)), "Item does not exists");
            let item = <ItemList<T>>::get((collection_id, item_id));

            if !is_owner
            {
                // check if item owner
                if item.owner != sender
                {
                    let no_perm_mes = "You do not have permissions to modify this collection";

                    ensure!(<AdminList<T>>::contains_key(collection_id), no_perm_mes);
                    ensure!(<AdminList<T>>::get(collection_id).contains(&sender), no_perm_mes);
                }
            }

            let list_exists = <ApprovedList<T>>::contains_key((collection_id, item_id));
            if list_exists {

                let mut list = <ApprovedList<T>>::get((collection_id, item_id));
                let item_contains = list.contains(&approved.clone());

                if !item_contains {
                    list.push(approved.clone());
                }
            } else {

                let mut itm = Vec::new();
                itm.push(approved.clone());
                <ApprovedList<T>>::insert((collection_id, item_id), itm);
            }

            Ok(())
        }

        #[weight = 0]
        pub fn transfer_from(origin, collection_id: u64, item_id: u64, new_owner: T::AccountId) -> DispatchResult {

            let no_perm_mes = "You do not have permissions to modify this collection";
            ensure!(<ApprovedList<T>>::contains_key((collection_id, item_id)), no_perm_mes);
            let list_itm = <ApprovedList<T>>::get((collection_id, item_id));
            ensure!(list_itm.contains(&new_owner.clone()), no_perm_mes);

            Self::transfer(origin, collection_id, item_id, new_owner)?;

            Ok(())
        }

        #[weight = 0]
        pub fn safe_transfer_from(origin, collection_id: u64, item_id: u64, new_owner: T::AccountId) -> DispatchResult {

            let no_perm_mes = "You do not have permissions to modify this collection";
            ensure!(<ApprovedList<T>>::contains_key((collection_id, item_id)), no_perm_mes);
            let list_itm = <ApprovedList<T>>::get((collection_id, item_id));
            ensure!(list_itm.contains(&new_owner.clone()), no_perm_mes);

            // on_nft_received  call

            Self::transfer(origin, collection_id, item_id, new_owner)?;

            Ok(())
        }
    }
}

impl<T: Trait> Module<T> {
    fn add_token_index(collection_id: u64, item_index: u64, owner: T::AccountId) -> DispatchResult {
        let list_exists = <AddressTokens<T>>::contains_key((collection_id, owner.clone()));
        if list_exists {
            let mut list = <AddressTokens<T>>::get((collection_id, owner.clone()));
            let item_contains = list.contains(&item_index.clone());

            if !item_contains {
                list.push(item_index.clone());
            }

            <AddressTokens<T>>::insert((collection_id, owner.clone()), list);
        } else {
            let mut itm = Vec::new();
            itm.push(item_index.clone());
            <AddressTokens<T>>::insert((collection_id, owner), itm);
        }

        Ok(())
    }

    fn remove_token_index(
        collection_id: u64,
        item_index: u64,
        owner: T::AccountId,
    ) -> DispatchResult {
        let list_exists = <AddressTokens<T>>::contains_key((collection_id, owner.clone()));
        if list_exists {
            let mut list = <AddressTokens<T>>::get((collection_id, owner.clone()));
            let item_contains = list.contains(&item_index.clone());

            if item_contains {
                list.retain(|&item| item != item_index);
                <AddressTokens<T>>::insert((collection_id, owner), list);
            }
        }

        Ok(())
    }

    fn move_token_index(
        collection_id: u64,
        item_index: u64,
        old_owner: T::AccountId,
        new_owner: T::AccountId,
    ) -> DispatchResult {
        Self::remove_token_index(collection_id, item_index, old_owner)?;
        Self::add_token_index(collection_id, item_index, new_owner)?;

        Ok(())
    }
}


////////////////////////////////////////////////////////////////////////////////////////////////////
// Economic models

/// Fee multiplier.
pub type Multiplier = FixedU128;

type BalanceOf<T> =
	<<T as transaction_payment::Trait>::Currency as Currency<<T as system::Trait>::AccountId>>::Balance;
type NegativeImbalanceOf<T> = <<T as transaction_payment::Trait>::Currency as Currency<
	<T as system::Trait>::AccountId,>>::NegativeImbalance;



/// Require the transactor pay for themselves and maybe include a tip to gain additional priority
/// in the queue.
#[derive(Encode, Decode, Clone, Eq, PartialEq)]
pub struct ChargeTransactionPayment<T: transaction_payment::Trait + Send + Sync>(#[codec(compact)] BalanceOf<T>);

impl<T:Trait + transaction_payment::Trait + Send + Sync> sp_std::fmt::Debug for ChargeTransactionPayment<T> {
	#[cfg(feature = "std")]
	fn fmt(&self, f: &mut sp_std::fmt::Formatter) -> sp_std::fmt::Result {
		write!(f, "ChargeTransactionPayment<{:?}>", self.0)
	}
	#[cfg(not(feature = "std"))]
	fn fmt(&self, _: &mut sp_std::fmt::Formatter) -> sp_std::fmt::Result {
		Ok(())
	}
}

impl<T:Trait + transaction_payment::Trait + Send + Sync> ChargeTransactionPayment<T> where
	T::Call: Dispatchable<Info=DispatchInfo, PostInfo=PostDispatchInfo> + IsSubType<Module<T>, T>,
	BalanceOf<T>: Send + Sync + FixedPointOperand,
{
	/// utility constructor. Used only in client/factory code.
	pub fn from(fee: BalanceOf<T>) -> Self {
		Self(fee)
	}

    pub fn traditional_fee(
        len: usize,
        info: &DispatchInfoOf<T::Call>,
        tip: BalanceOf<T>,
    ) -> BalanceOf<T> where
        T::Call: Dispatchable<Info=DispatchInfo>,
    {
        <transaction_payment::Module<T>>::compute_fee(len as u32, info, tip)
    }

	fn withdraw_fee(
		&self,
        who: &T::AccountId,
        call: &T::Call,
		info: &DispatchInfoOf<T::Call>,
		len: usize,
	) -> Result<(BalanceOf<T>, Option<NegativeImbalanceOf<T>>), TransactionValidityError> {
        let tip = self.0;

        // Set fee based on call type. Creating collection costs 1 Unique.
        // All other transactions have traditional fees so far
        let fee = match call.is_sub_type() {
            Some(Call::create_collection(..)) => <BalanceOf<T>>::from(1_000_000_000),
            _ => Self::traditional_fee(len, info, tip)

            // Flat fee model, use only for testing purposes
            // _ => <BalanceOf<T>>::from(100)
        };

        // Determine who is paying transaction fee based on ecnomic model
        // Parse call to extract collection ID and access collection sponsor
        let sponsor: T::AccountId = match call.is_sub_type() {
            Some(Call::create_item(collection_id, _properties)) => {
                <Collection<T>>::get(collection_id).sponsor
            },
            Some(Call::transfer(collection_id, _item_id, _new_owner)) => {
                <Collection<T>>::get(collection_id).sponsor
            },

            _ => T::AccountId::default()
        };

        let mut who_pays_fee: T::AccountId = sponsor.clone();
        if sponsor == T::AccountId::default() {
            who_pays_fee = who.clone();
        }

		// Only mess with balances if fee is not zero.
		if fee.is_zero() {
			return Ok((fee, None));
		}

		match <T as transaction_payment::Trait>::Currency::withdraw(
			&who_pays_fee,
			fee,
			if tip.is_zero() {
				WithdrawReason::TransactionPayment.into()
			} else {
				WithdrawReason::TransactionPayment | WithdrawReason::Tip
			},
			ExistenceRequirement::KeepAlive,
		) {
			Ok(imbalance) => Ok((fee, Some(imbalance))),
			Err(_) => Err(InvalidTransaction::Payment.into()),
		}
	}
}

impl<T:Trait + transaction_payment::Trait + Send + Sync> SignedExtension for ChargeTransactionPayment<T> where
    BalanceOf<T>: Send + Sync + From<u64> + FixedPointOperand,
    T::Call: Dispatchable<Info=DispatchInfo, PostInfo=PostDispatchInfo> + IsSubType<Module<T>, T>,
{
	const IDENTIFIER: &'static str = "ChargeTransactionPayment";
	type AccountId = T::AccountId;
	type Call = T::Call;
	type AdditionalSigned = ();
	type Pre = (BalanceOf<T>, Self::AccountId, Option<NegativeImbalanceOf<T>>, BalanceOf<T>);
	fn additional_signed(&self) -> sp_std::result::Result<(), TransactionValidityError> { Ok(()) }

	fn validate(
		&self,
		who: &Self::AccountId,
		call: &Self::Call,
		info: &DispatchInfoOf<Self::Call>,
		len: usize,
	) -> TransactionValidity {
		let (fee, _) = self.withdraw_fee(who, call, info, len)?;

		let mut r = ValidTransaction::default();
		// NOTE: we probably want to maximize the _fee (of any type) per weight unit_ here, which
		// will be a bit more than setting the priority to tip. For now, this is enough.
		r.priority = fee.saturated_into::<TransactionPriority>();
		Ok(r)
	}

	fn pre_dispatch(
		self,
		who: &Self::AccountId,
		call: &Self::Call,
		info: &DispatchInfoOf<Self::Call>,
		len: usize
	) -> Result<Self::Pre, TransactionValidityError> {
		let (fee, imbalance) = self.withdraw_fee(who, call, info, len)?;
		Ok((self.0, who.clone(), imbalance, fee))
	}

	fn post_dispatch(
		pre: Self::Pre,
		info: &DispatchInfoOf<Self::Call>,
		post_info: &PostDispatchInfoOf<Self::Call>,
		len: usize,
		_result: &DispatchResult,
	) -> Result<(), TransactionValidityError> {
		let (tip, who, imbalance, fee) = pre;
		if let Some(payed) = imbalance {
			let actual_fee = <transaction_payment::Module<T>>::compute_actual_fee(
				len as u32,
				info,
				post_info,
				tip,
			);
			let refund = fee.saturating_sub(actual_fee);
			let actual_payment = match <T as transaction_payment::Trait>::Currency::deposit_into_existing(&who, refund) {
				Ok(refund_imbalance) => {
					// The refund cannot be larger than the up front payed max weight.
					// `PostDispatchInfo::calc_unspent` guards against such a case.
					match payed.offset(refund_imbalance) {
						Ok(actual_payment) => actual_payment,
						Err(_) => return Err(InvalidTransaction::Payment.into()),
					}
				}
				// We do not recreate the account using the refund. The up front payment
				// is gone in that case.
				Err(_) => payed,
			};
			let imbalances = actual_payment.split(tip);
			<T as transaction_payment::Trait>::OnTransactionPayment::on_unbalanceds(Some(imbalances.0).into_iter()
				.chain(Some(imbalances.1)));
		}
		Ok(())
	}
}
