use sp_std::vec;

use frame_benchmarking::{benchmarks, account};
use frame_system::RawOrigin;
use frame_support::{
	traits::{Currency, Get},
	BoundedVec,
};
use sp_runtime::Permill;

use up_data_structs::*;

use super::*;

const SEED: u32 = 1;

fn create_data<S: Get<u32>>() -> BoundedVec<u8, S> {
	vec![0; S::get() as usize].try_into().expect("size == S")
}

fn create_max_collection<T: Config>(owner: &T::AccountId) -> DispatchResult {
	<T as pallet_common::Config>::Currency::deposit_creating(owner, T::CollectionCreationPrice::get());

	let metadata = create_data();
	let max = None;
	let symbol = create_data();

	<Pallet<T>>::create_collection(RawOrigin::Signed(owner.clone()).into(), metadata, max, symbol)
}

fn create_max_nft<T: Config>(owner: &T::AccountId, collection_id: RmrkCollectionId) -> DispatchResult {
	let royalty_recipient = Some(owner.clone());
	let royalty_amount = Some(Permill::from_percent(25));
	let metadata = create_data();
	let transferable = true;

	<Pallet<T>>::mint_nft(
		RawOrigin::Signed(owner.clone()).into(),
		owner.clone(),
		collection_id,
		royalty_recipient,
		royalty_amount,
		metadata,
		transferable
	)
}

struct NftBuilder {
	collection_id: RmrkCollectionId,
	current_nft_id: RmrkNftId
}

impl NftBuilder {
	fn new(collection_id: RmrkCollectionId) -> Self {
		Self {
			collection_id,
			current_nft_id: 0
		}
	}

	fn build<T: Config>(&mut self, owner: &T::AccountId) -> Result<RmrkNftId, DispatchError> {
		create_max_nft::<T>(owner, self.collection_id)?;
		self.current_nft_id += 1;

		Ok(self.current_nft_id)
	}

	fn build_tower<T: Config>(&mut self, owner: &T::AccountId, height: u32) -> Result<RmrkNftId, DispatchError> {
		self.build::<T>(owner)?;

		let mut prev_nft_id = self.current_nft_id;

		for _ in 0..height {
			self.build::<T>(owner)?;
			
			let new_owner = <RmrkAccountIdOrCollectionNftTuple<T::AccountId>>::CollectionAndNftTuple(
				self.collection_id,
				prev_nft_id
			);

			<Pallet<T>>::send(
				RawOrigin::Signed(owner.clone()).into(),
				self.collection_id,
				self.current_nft_id,
				new_owner,
			)?;

			prev_nft_id = self.current_nft_id;
		}

		let deepest_nft_id = self.current_nft_id;

		Ok(deepest_nft_id)
	}
}

benchmarks! {
	create_collection {
		let caller = account("caller", 0, SEED);
		<T as pallet_common::Config>::Currency::deposit_creating(&caller, T::CollectionCreationPrice::get());
		let metadata = create_data();
		let max = None;
		let symbol = create_data();
	}: _(RawOrigin::Signed(caller), metadata, max, symbol)

	destroy_collection {
		let caller = account("caller", 0, SEED);
		
		create_max_collection::<T>(&caller)?;
		let collection_id = 0;
	}: _(RawOrigin::Signed(caller), collection_id)

	change_collection_issuer {
		let caller: T::AccountId = account("caller", 0, SEED);

		create_max_collection::<T>(&caller)?;
		let collection_id = 0;

		let new_owner: T::AccountId = account("new_owner", 0, SEED);

		let new_owner_source = T::Lookup::unlookup(new_owner);
	}: _(RawOrigin::Signed(caller), collection_id, new_owner_source)

	lock_collection {
		let caller: T::AccountId = account("caller", 0, SEED);

		create_max_collection::<T>(&caller)?;
		let collection_id = 0;
	}: _(RawOrigin::Signed(caller), collection_id)

	mint_nft {
		let caller: T::AccountId = account("caller", 0, SEED);

		create_max_collection::<T>(&caller)?;
		let collection_id = 0;
		let owner = caller.clone();
		
		let royalty_recipient = Some(caller.clone());
		let royalty_amount = Some(Permill::from_percent(25));
		let metadata = create_data();
		let transferable = true;
	}:  _(
		RawOrigin::Signed(caller),
		owner,
		collection_id,
		royalty_recipient,
		royalty_amount,
		metadata,
		transferable
	)

	send {
		let caller: T::AccountId = account("caller", 0, SEED);
		create_max_collection::<T>(&caller)?;
		let collection_id = 0;

		let mut nft_builder = NftBuilder::new(collection_id);
		let src_nft_id = nft_builder.build::<T>(&caller)?;
		let target_nft_id = nft_builder.build_tower::<T>(&caller, NESTING_BUDGET - 2)?;
	}: _(
		RawOrigin::Signed(caller),
		collection_id,
		src_nft_id,
		<RmrkAccountIdOrCollectionNftTuple<T::AccountId>>::CollectionAndNftTuple(collection_id, target_nft_id)
	)

	accept_nft {
		let caller: T::AccountId = account("caller", 0, SEED);
		let sender: T::AccountId = account("sender", 0, SEED);

		create_max_collection::<T>(&sender)?;
		let src_collection_id = 0;

		create_max_collection::<T>(&caller)?;
		let target_collection_id = 1;

		let mut src_nft_builder = NftBuilder::new(src_collection_id);
		let src_nft_id = src_nft_builder.build::<T>(&sender)?;

		let mut target_nft_builder = NftBuilder::new(target_collection_id);
		let fake_target_nft_id = target_nft_builder.build::<T>(&caller)?;
		let target_nft_id = target_nft_builder.build_tower::<T>(&caller, NESTING_BUDGET - 1)?;

		let new_owner = <RmrkAccountIdOrCollectionNftTuple<T::AccountId>>::CollectionAndNftTuple(
			target_collection_id,
			fake_target_nft_id
		);

		let actual_new_owner = <RmrkAccountIdOrCollectionNftTuple<T::AccountId>>::CollectionAndNftTuple(
			target_collection_id,
			target_nft_id
		);

		<Pallet<T>>::send(
			RawOrigin::Signed(sender.clone()).into(),
			src_collection_id,
			src_nft_id,
			new_owner,
		)?;
	}: _(
		RawOrigin::Signed(caller),
		src_collection_id,
		src_nft_id,
		actual_new_owner
	)
}
