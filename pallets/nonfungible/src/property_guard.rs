use super::*;

pub struct PropertyGuard<'a, T: Config> {
	pub sender: &'a T::CrossAccountId,
	pub collection: &'a NonfungibleHandle<T>,
	pub token: TokenId,
	pub is_token_create: bool,
	budget: &'a dyn Budget,

	collection_admin_result: Option<DispatchResult>,
	token_owner_result: Option<DispatchResult>,
}

impl<'a, T: Config> PropertyGuard<'a, T> {
	pub fn new(
		sender: &'a T::CrossAccountId,
		collection: &'a NonfungibleHandle<T>,
		token: TokenId,
		is_token_create: bool,
		budget: &'a dyn Budget,
	) -> Self {
		Self {
			sender,
			collection,
			token,
			is_token_create,
			budget,

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
				self.token,
				None,
				self.budget,
			)?;

			if is_owned {
				Ok(())
			} else {
				Err(<CommonError<T>>::NoPermission.into())
			}
		})
	}
}
