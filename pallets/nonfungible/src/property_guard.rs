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
		if self.collection_admin_result.is_none() {
			self.collection_admin_result =
				Some(self.collection.check_is_owner_or_admin(self.sender));
		}

		self.collection_admin_result.unwrap()
	}

	pub fn check_token_owner(&mut self) -> DispatchResult {
		if self.token_owner_result.is_none() {
			let is_owned = <PalletStructure<T>>::check_indirectly_owned(
				self.sender.clone(),
				self.collection.id,
				self.token,
				None,
				self.budget,
			)?;

			let result = if is_owned {
				Ok(())
			} else {
				Err(<CommonError<T>>::NoPermission.into())
			};

			self.token_owner_result = Some(result);
		}

		self.token_owner_result.unwrap()
	}
}
