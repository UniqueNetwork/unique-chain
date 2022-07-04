use super::*;

pub struct PropertyGuard<'a, T: Config> {
	pub sender: &'a T::CrossAccountId,
	pub collection: &'a NonfungibleHandle<T>,
	pub token_id: TokenId,
	pub is_token_create: bool,
	nesting_budget: &'a dyn Budget,

	collection_admin_result: Option<DispatchResult>,
	token_owner_result: Option<DispatchResult>,
}

pub struct PropertyGuardData<'a, T: Config> {
	pub sender: &'a T::CrossAccountId,
	pub collection: &'a NonfungibleHandle<T>,
	pub token_id: TokenId,
	pub is_token_create: bool,
	pub nesting_budget: &'a dyn Budget,
}

impl<'a, T: Config> PropertyGuard<'a, T> {
	pub fn new(data: PropertyGuardData<'a, T>) -> Self {
		Self {
			sender: data.sender,
			collection: data.collection,
			token_id: data.token_id,
			is_token_create: data.is_token_create,
			nesting_budget: data.nesting_budget,

			collection_admin_result: None,
			token_owner_result: None,
		}
	}

	pub fn check_collection_admin(&mut self) -> DispatchResult {
		*self
			.collection_admin_result
			.get_or_insert_with(|| self.collection.check_is_owner_or_admin(self.sender))
	}

	pub fn check_token_owner(&mut self) -> DispatchResult {
		*self.token_owner_result.get_or_insert_with(|| {
			let is_owned = <PalletStructure<T>>::check_indirectly_owned(
				self.sender.clone(),
				self.collection.id,
				self.token_id,
				None,
				self.nesting_budget,
			)?;

			if is_owned {
				Ok(())
			} else {
				Err(<CommonError<T>>::NoPermission.into())
			}
		})
	}
}
