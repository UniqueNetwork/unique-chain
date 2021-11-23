// Tests to be written here
use super::*;
use crate::mock::*;
use crate::{AccessMode, CollectionMode};
use nft_data_structs::{
	COLLECTION_NUMBER_LIMIT, Collection, CollectionId, CreateItemData, CreateFungibleData, 
	CreateNftData, CreateReFungibleData, ExistenceRequirement, MAX_COLLECTION_DESCRIPTION_LENGTH, 
	MAX_COLLECTION_NAME_LENGTH, MAX_DECIMAL_POINTS, MAX_TOKEN_PREFIX_LENGTH, COLLECTION_ADMINS_LIMIT, 
	MetaUpdatePermission, Pays, PostDispatchInfo, TokenId, Weight, WithdrawReasons,
};

use frame_support::{assert_noop, assert_ok};
use sp_std::convert::TryInto;

fn default_nft_data() -> CreateNftData {
	CreateNftData {
		const_data: vec![1, 2, 3].try_into().unwrap(),
		variable_data: vec![3, 2, 1].try_into().unwrap(),
	}
}

fn default_fungible_data() -> CreateFungibleData {
	CreateFungibleData { value: 5 }
}

fn default_re_fungible_data() -> CreateReFungibleData {
	CreateReFungibleData {
		const_data: vec![1, 2, 3].try_into().unwrap(),
		variable_data: vec![3, 2, 1].try_into().unwrap(),
		pieces: 1023,
	}
}

fn create_test_collection_for_owner(
	mode: &CollectionMode,
	owner: u64,
	id: CollectionId,
) -> CollectionId {
	let col_name1: Vec<u16> = "Test1\0".encode_utf16().collect::<Vec<u16>>();
	let col_desc1: Vec<u16> = "TestDescription1\0".encode_utf16().collect::<Vec<u16>>();
	let token_prefix1: Vec<u8> = b"token_prefix1\0".to_vec();

	let origin1 = Origin::signed(owner);
	assert_ok!(TemplateModule::create_collection(
		origin1,
		col_name1,
		col_desc1,
		token_prefix1,
		mode.clone()
	));

	let saved_col_name: Vec<u16> = "Test1\0".encode_utf16().collect::<Vec<u16>>();
	let saved_description: Vec<u16> = "TestDescription1\0".encode_utf16().collect::<Vec<u16>>();
	let saved_prefix: Vec<u8> = b"token_prefix1\0".to_vec();
	assert_eq!(<pallet_common::CollectionById<Test>>::get(id).unwrap().owner, owner);
	assert_eq!(
		<pallet_common::CollectionById<Test>>::get(id).unwrap().name,
		saved_col_name
	);
	assert_eq!(<pallet_common::CollectionById<Test>>::get(id).unwrap().mode, *mode);
	assert_eq!(
		<pallet_common::CollectionById<Test>>::get(id).unwrap().description,
		saved_description
	);
	assert_eq!(
		<pallet_common::CollectionById<Test>>::get(id).unwrap().token_prefix,
		saved_prefix
	);
	id
}

fn create_test_collection(mode: &CollectionMode, id: CollectionId) -> CollectionId {
	create_test_collection_for_owner(&mode, 1, id)
}

fn create_test_item(collection_id: CollectionId, data: &CreateItemData) {
	let origin1 = Origin::signed(1);
	assert_ok!(TemplateModule::create_item(
		origin1,
		collection_id,
		account(1),
		data.clone()
	));
}

fn account(sub: u64) -> TestCrossAccountId {
	TestCrossAccountId::from_sub(sub)
}

// Use cases tests region
// #region

#[test]
fn set_version_schema() {
	new_test_ext().execute_with(|| {
		let origin1 = Origin::signed(1);
		let collection_id = create_test_collection(&CollectionMode::NFT, CollectionId(1));

		assert_ok!(TemplateModule::set_schema_version(
			origin1,
			collection_id,
			SchemaVersion::Unique
		));
		assert_eq!(
			<pallet_common::CollectionById<Test>>::get(collection_id)
				.unwrap()
				.schema_version,
			SchemaVersion::Unique
		);
	});
}

#[test]
fn create_fungible_collection_fails_with_large_decimal_numbers() {
	new_test_ext().execute_with(|| {
		let col_name1: Vec<u16> = "Test1\0".encode_utf16().collect::<Vec<u16>>();
		let col_desc1: Vec<u16> = "TestDescription1\0".encode_utf16().collect::<Vec<u16>>();
		let token_prefix1: Vec<u8> = b"token_prefix1\0".to_vec();

		let origin1 = Origin::signed(1);
		assert_noop!(
			TemplateModule::create_collection(
				origin1,
				col_name1,
				col_desc1,
				token_prefix1,
				CollectionMode::Fungible(MAX_DECIMAL_POINTS + 1)
			),
			Error::<Test>::CollectionDecimalPointLimitExceeded
		);
	});
}

#[test]
fn create_nft_item() {
	new_test_ext().execute_with(|| {
		let collection_id = create_test_collection(&CollectionMode::NFT, CollectionId(1));

		let data = default_nft_data();
		create_test_item(collection_id, &data.clone().into());

		let item = <pallet_nonfungible::TokenData<Test>>::get((collection_id, 1)).unwrap();
		assert_eq!(item.const_data, data.const_data.into_inner());
		assert_eq!(item.variable_data, data.variable_data.into_inner());
	});
}

// Use cases tests region
// #region
#[test]
fn create_nft_multiple_items() {
	new_test_ext().execute_with(|| {
		create_test_collection(&CollectionMode::NFT, CollectionId(1));

		let origin1 = Origin::signed(1);

		let items_data = vec![default_nft_data(), default_nft_data(), default_nft_data()];

		assert_ok!(TemplateModule::create_multiple_items(
			origin1,
			CollectionId(1),
			account(1),
			items_data
				.clone()
				.into_iter()
				.map(|d| { d.into() })
				.collect()
		));
		for (index, data) in items_data.into_iter().enumerate() {
			let item = <pallet_nonfungible::TokenData<Test>>::get((CollectionId(1), TokenId((index + 1) as u32))).unwrap();
			assert_eq!(item.const_data.to_vec(), data.const_data.into_inner());
			assert_eq!(item.variable_data.to_vec(), data.variable_data.into_inner());
		}
	});
}

#[test]
fn create_refungible_item() {
	new_test_ext().execute_with(|| {
		let collection_id = create_test_collection(&CollectionMode::ReFungible, CollectionId(1));

		let data = default_re_fungible_data();
		create_test_item(collection_id, &data.clone().into());
		let item = <pallet_refungible::TokenData<Test>>::get((collection_id, TokenId(1)));
		let balance = <pallet_refungible::Balance<Test>>::get((collection_id, TokenId(1), account(1)));
		assert_eq!(item.const_data, data.const_data.into_inner());
		assert_eq!(item.variable_data, data.variable_data.into_inner());
		assert_eq!(balance, 1023);
	});
}

#[test]
fn create_multiple_refungible_items() {
	new_test_ext().execute_with(|| {
		create_test_collection(&CollectionMode::ReFungible, CollectionId(1));

		let origin1 = Origin::signed(1);

		let items_data = vec![
			default_re_fungible_data(),
			default_re_fungible_data(),
			default_re_fungible_data(),
		];

		assert_ok!(TemplateModule::create_multiple_items(
			origin1,
			CollectionId(1),
			account(1),
			items_data
				.clone()
				.into_iter()
				.map(|d| { d.into() })
				.collect()
		));
		for (index, data) in items_data.into_iter().enumerate() {
			let item = <pallet_nonfungible::TokenData<Test>>::get((CollectionId(1), TokenId((index + 1) as u32))).unwrap();
			let balance = <pallet_refungible::Balance<Test>>::get((CollectionId(1), TokenId(1), account(1)));
			assert_eq!(item.const_data.to_vec(), data.const_data.into_inner());
			assert_eq!(item.variable_data.to_vec(), data.variable_data.into_inner());
			assert_eq!(balance, 1023);
		}
	});
}

#[test]
fn create_fungible_item() {
	new_test_ext().execute_with(|| {
		let collection_id = create_test_collection(&CollectionMode::Fungible(3), CollectionId(1));

		let data = default_fungible_data();
		create_test_item(collection_id, &data.into());

		assert_eq!(<pallet_fungible::Balance<Test>>::get((collection_id, account(1))), 5);
	});
}

//#[test]
// fn create_multiple_fungible_items() {
//     new_test_ext().execute_with(|| {
//         default_limits();

//         create_test_collection(&CollectionMode::Fungible(3), CollectionId(1));

//         let origin1 = Origin::signed(1);

//         let items_data = vec![default_fungible_data(), default_fungible_data(), default_fungible_data()];

//         assert_ok!(TemplateModule::create_multiple_items(
//             origin1.clone(),
//             1,
//             1,
//             items_data.clone().into_iter().map(|d| { d.into() }).collect()
//         ));

//         for (index, _) in items_data.iter().enumerate() {
//             assert_eq!(TemplateModule::fungible_item_id(1, (index + 1) as TokenId).value, 5);
//         }
//         assert_eq!(TemplateModule::balance_count(1, 1), 3000);
//         assert_eq!(TemplateModule::address_tokens(1, 1), [1, 2, 3]);
//     });
// }

#[test]
fn transfer_fungible_item() {
	new_test_ext().execute_with(|| {
		let collection_id = create_test_collection(&CollectionMode::Fungible(3), CollectionId(1));

		let origin1 = Origin::signed(1);
		let origin2 = Origin::signed(2);

		let data = default_fungible_data();
		create_test_item(collection_id, &data.into());

		assert_eq!(<pallet_fungible::Balance<Test>>::get((CollectionId(1), account(1))), 5);

		// change owner scenario
		assert_ok!(TemplateModule::transfer(origin1, account(2), CollectionId(1), TokenId(1), 5));
		assert_eq!(<pallet_fungible::Balance<Test>>::get((CollectionId(1), account(1))), 0);

		// split item scenario
		assert_ok!(TemplateModule::transfer(
			origin2.clone(),
			account(3),
			CollectionId(1),
			TokenId(1),
			3
		));

		// split item and new owner has account scenario
		assert_ok!(TemplateModule::transfer(origin2, account(3), CollectionId(1), TokenId(1), 1));
		assert_eq!(<pallet_fungible::Balance<Test>>::get((CollectionId(1), account(2))), 1);
		assert_eq!(<pallet_fungible::Balance<Test>>::get((CollectionId(1), account(3))), 4);
	});
}

#[test]
fn transfer_refungible_item() {
	new_test_ext().execute_with(|| {
		let collection_id = create_test_collection(&CollectionMode::ReFungible, CollectionId(1));

		let data = default_re_fungible_data();
		create_test_item(collection_id, &data.clone().into());

		let origin1 = Origin::signed(1);
		let origin2 = Origin::signed(2);
		{
			let item = <pallet_refungible::TokenData<Test>>::get((collection_id, TokenId(1)));
			let balance = <pallet_refungible::Balance<Test>>::get((collection_id, TokenId(1), account(1)));
			assert_eq!(item.const_data, data.const_data.into_inner());
			assert_eq!(item.variable_data, data.variable_data.into_inner());
			assert_eq!(balance, 1023);
		}
		
		assert_eq!(<pallet_refungible::AccountBalance<Test>>::get((collection_id, account(1))), 1023);
		assert_eq!(<pallet_refungible::Owned<Test>>::get((collection_id, account(1), TokenId(1))), true);

		// change owner scenario
		assert_ok!(TemplateModule::transfer(origin1, account(2), CollectionId(1), TokenId(1), 1023));

		let balance2 = <pallet_refungible::Balance<Test>>::get((collection_id, TokenId(1), account(2)));
		assert_eq!(balance2, 1023);
		assert_eq!(<pallet_refungible::AccountBalance<Test>>::get((collection_id, account(1))), 0);
		assert_eq!(<pallet_refungible::AccountBalance<Test>>::get((collection_id, account(2))), 1023);
		assert_eq!(<pallet_refungible::Owned<Test>>::get((collection_id, account(1), TokenId(1))), false);
		assert_eq!(<pallet_refungible::Owned<Test>>::get((collection_id, account(2), TokenId(1))), true);

		// split item scenario
		assert_ok!(TemplateModule::transfer(
			origin2.clone(),
			account(3),
			CollectionId(1),
			TokenId(1),
			500
		));
		{
			let item = <pallet_refungible::TokenData<Test>>::get((CollectionId(1), TokenId(1)));
			let balance2 = <pallet_refungible::Balance<Test>>::get((collection_id, TokenId(1), account(2)));
			let balance3 = <pallet_refungible::Balance<Test>>::get((collection_id, TokenId(1), account(3)));
			assert_eq!(balance2, 523);
			assert_eq!(balance3, 500);
		}
		assert_eq!(<pallet_refungible::AccountBalance<Test>>::get((collection_id, account(2))), 523);
		assert_eq!(<pallet_refungible::AccountBalance<Test>>::get((collection_id, account(3))), 500);
		assert_eq!(<pallet_refungible::Owned<Test>>::get((collection_id, account(2), TokenId(1))), true);
		assert_eq!(<pallet_refungible::Owned<Test>>::get((collection_id, account(3), TokenId(1))), true);

		// split item and new owner has account scenario
		assert_ok!(TemplateModule::transfer(origin2, account(3), CollectionId(1), TokenId(1), 200));
		{
			let item = <pallet_refungible::TokenData<Test>>::get((CollectionId(1), TokenId(1)));
			let balance2 = <pallet_refungible::Balance<Test>>::get((collection_id, TokenId(1), account(2)));
			let balance3 = <pallet_refungible::Balance<Test>>::get((collection_id, TokenId(1), account(3)));
			assert_eq!(balance2, 323);
			assert_eq!(balance3, 700);
		}
		assert_eq!(<pallet_refungible::AccountBalance<Test>>::get((collection_id, account(2))), 323);
		assert_eq!(<pallet_refungible::AccountBalance<Test>>::get((collection_id, account(3))), 700);
		assert_eq!(<pallet_refungible::Owned<Test>>::get((collection_id, account(2), TokenId(1))), true);
		assert_eq!(<pallet_refungible::Owned<Test>>::get((collection_id, account(3), TokenId(1))), true);
	});
}

#[test]
fn transfer_nft_item() {
	new_test_ext().execute_with(|| {
		let collection_id = create_test_collection(&CollectionMode::NFT, CollectionId(1));

		let data = default_nft_data();
		create_test_item(collection_id, &data.into());
		assert_eq!(<pallet_nonfungible::AccountBalance<Test>>::get((collection_id, account(1))), 1);
		assert_eq!(<pallet_nonfungible::Owned<Test>>::get((collection_id, account(1), TokenId(1))), true);


		let origin1 = Origin::signed(1);
		// default scenario
		assert_ok!(TemplateModule::transfer(origin1, account(2), CollectionId(1), TokenId(1), 1000));
		assert_eq!(<pallet_nonfungible::AccountBalance<Test>>::get((collection_id, account(1))), 0);
		assert_eq!(<pallet_nonfungible::AccountBalance<Test>>::get((collection_id, account(2))), 1);
		assert_eq!(<pallet_nonfungible::Owned<Test>>::get((collection_id, account(1), TokenId(1))), false);
		assert_eq!(<pallet_nonfungible::Owned<Test>>::get((collection_id, account(2), TokenId(1))), true);
	});
}

#[test]
fn nft_approve_and_transfer_from() {
	new_test_ext().execute_with(|| {
		let collection_id = create_test_collection(&CollectionMode::NFT, CollectionId(1));

		let data = default_nft_data();
		create_test_item(collection_id, &data.into());

		let origin1 = Origin::signed(1);
		let origin2 = Origin::signed(2);

		assert_eq!(<pallet_nonfungible::AccountBalance<Test>>::get((collection_id, account(1))), 1);
		assert_eq!(<pallet_nonfungible::Owned<Test>>::get((collection_id, account(1), TokenId(1))), true);

		// neg transfer
		assert_noop!(
			TemplateModule::transfer_from(origin2.clone(), account(1), account(2), CollectionId(1), TokenId(1), 1),
			CommonError::<Test>::NoPermission
		);

		// do approve
		assert_ok!(TemplateModule::approve(origin1, account(2), CollectionId(1), TokenId(1), 5));
		assert_eq!(<pallet_nonfungible::Allowance<Test>>::get((CollectionId(1), TokenId(1))).unwrap(), account(2));

		assert_ok!(TemplateModule::transfer_from(
			origin2,
			account(1),
			account(3),
			CollectionId(1),
			TokenId(1),
			1
		));
		assert!(<pallet_nonfungible::Allowance<Test>>::get((CollectionId(1), TokenId(1))).is_none());
	});
}

#[test]
fn nft_approve_and_transfer_from_allow_list() {
	new_test_ext().execute_with(|| {
		let collection_id = create_test_collection(&CollectionMode::NFT, CollectionId(1));

		let origin1 = Origin::signed(1);
		let origin2 = Origin::signed(2);

		let data = default_nft_data();
		create_test_item(collection_id, &data.clone().into());

		assert_eq!(
			&<pallet_nonfungible::TokenData<Test>>::get((collection_id, TokenId(1))).unwrap().const_data,
			&data.const_data.into_inner()
		);
		assert_eq!(<pallet_nonfungible::AccountBalance<Test>>::get((collection_id, account(1))), 1);
		assert_eq!(<pallet_nonfungible::Owned<Test>>::get((collection_id, account(1), TokenId(1))), true);

		assert_ok!(TemplateModule::set_mint_permission(
			origin1.clone(),
			CollectionId(1),
			true
		));
		assert_ok!(TemplateModule::set_public_access_mode(
			origin1.clone(),
			CollectionId(1),
			AccessMode::AllowList
		));
		assert_ok!(TemplateModule::add_to_allow_list(
			origin1.clone(),
			CollectionId(1),
			account(1)
		));
		assert_ok!(TemplateModule::add_to_allow_list(
			origin1.clone(),
			CollectionId(1),
			account(2)
		));
		assert_ok!(TemplateModule::add_to_allow_list(
			origin1.clone(),
			CollectionId(1),
			account(3)
		));

		// do approve
		assert_ok!(TemplateModule::approve(
			origin1.clone(),
			account(2),
			CollectionId(1),
			TokenId(1),
			5
		));
		assert_eq!(<pallet_nonfungible::Allowance<Test>>::get((CollectionId(1), TokenId(1))).unwrap(), account(2));
		assert_ok!(TemplateModule::approve(origin1, account(3), CollectionId(1), TokenId(1), 5));
		assert_eq!(<pallet_nonfungible::Allowance<Test>>::get((CollectionId(1), TokenId(1))).unwrap(), account(3));

		assert_ok!(TemplateModule::transfer_from(
			origin2,
			account(1),
			account(3),
			CollectionId(1),
			TokenId(1),
			1
		));
		assert!(<pallet_nonfungible::Allowance<Test>>::get((CollectionId(1), TokenId(1))).is_none());
	});
}

#[test]
fn refungible_approve_and_transfer_from() {
	new_test_ext().execute_with(|| {
		let collection_id = create_test_collection(&CollectionMode::ReFungible, CollectionId(1));

		let origin1 = Origin::signed(1);
		let origin2 = Origin::signed(2);

		let data = default_re_fungible_data();
		create_test_item(collection_id, &data.into());

		assert_eq!(<pallet_refungible::AccountBalance<Test>>::get((collection_id, account(1))), 1023);
		assert_eq!(<pallet_refungible::Owned<Test>>::get((collection_id, account(1), TokenId(1))), true);

		assert_ok!(TemplateModule::set_mint_permission(
			origin1.clone(),
			CollectionId(1),
			true
		));
		assert_ok!(TemplateModule::set_public_access_mode(
			origin1.clone(),
			CollectionId(1),
			AccessMode::AllowList
		));
		assert_ok!(TemplateModule::add_to_allow_list(
			origin1.clone(),
			CollectionId(1),
			account(1)
		));
		assert_ok!(TemplateModule::add_to_allow_list(
			origin1.clone(),
			CollectionId(1),
			account(2)
		));
		assert_ok!(TemplateModule::add_to_allow_list(
			origin1.clone(),
			CollectionId(1),
			account(3)
		));

		// do approve
		assert_ok!(TemplateModule::approve(origin1, account(2), CollectionId(1), TokenId(1), 1023));
		assert_eq!(<pallet_refungible::Allowance<Test>>::get((CollectionId(1), TokenId(1), account(1), account(2))), 1023);

		assert_ok!(TemplateModule::transfer_from(
			origin2,
			account(1),
			account(3),
			CollectionId(1),
			TokenId(1),
			100
		));
		assert_eq!(<pallet_refungible::AccountBalance<Test>>::get((collection_id, account(1))), 923);
		assert_eq!(<pallet_refungible::AccountBalance<Test>>::get((collection_id, account(3))), 100);
		assert_eq!(<pallet_refungible::Owned<Test>>::get((collection_id, account(1), TokenId(1))), true);
		assert_eq!(<pallet_refungible::Owned<Test>>::get((collection_id, account(1), TokenId(3))), true);
		assert_eq!(<pallet_refungible::Allowance<Test>>::get((CollectionId(1), TokenId(1), account(1), account(2))), 923);
	});
}

#[test]
fn fungible_approve_and_transfer_from() {
	new_test_ext().execute_with(|| {
		let collection_id = create_test_collection(&CollectionMode::Fungible(3), CollectionId(1));

		let data = default_fungible_data();
		create_test_item(collection_id, &data.into());

		let origin1 = Origin::signed(1);
		let origin2 = Origin::signed(2);

		assert_ok!(TemplateModule::set_mint_permission(
			origin1.clone(),
			CollectionId(1),
			true
		));
		assert_ok!(TemplateModule::set_public_access_mode(
			origin1.clone(),
			CollectionId(1),
			AccessMode::AllowList
		));
		assert_ok!(TemplateModule::add_to_allow_list(
			origin1.clone(),
			CollectionId(1),
			account(1)
		));
		assert_ok!(TemplateModule::add_to_allow_list(
			origin1.clone(),
			CollectionId(1),
			account(2)
		));
		assert_ok!(TemplateModule::add_to_allow_list(
			origin1.clone(),
			CollectionId(1),
			account(3)
		));

		// do approve
		assert_ok!(TemplateModule::approve(
			origin1.clone(),
			account(2),
			CollectionId(1),
			TokenId(1),
			5
		));
		assert_eq!(<pallet_fungible::Allowance<Test>>::get((CollectionId(1), account(1), account(2))), 5);
		assert_ok!(TemplateModule::approve(origin1, account(3), CollectionId(1), TokenId(1), 5));
		assert_eq!(<pallet_fungible::Allowance<Test>>::get((CollectionId(1), account(1), account(2))), 5);
		assert_eq!(<pallet_fungible::Allowance<Test>>::get((CollectionId(1), account(1), account(3))), 5);

		assert_ok!(TemplateModule::transfer_from(
			origin2.clone(),
			account(1),
			account(3),
			CollectionId(1),
			TokenId(1),
			4
		));

		assert_eq!(<pallet_fungible::Allowance<Test>>::get((CollectionId(1), account(1), account(2))), 1);

		assert_noop!(
			TemplateModule::transfer_from(origin2, account(1), account(3), CollectionId(1), TokenId(1), 4),
			CommonError::<Test>::NoPermission
		);
	});
}

#[test]
fn change_collection_owner() {
	new_test_ext().execute_with(|| {
		let collection_id = create_test_collection(&CollectionMode::NFT, CollectionId(1));

		let origin1 = Origin::signed(1);
		assert_ok!(TemplateModule::change_collection_owner(
			origin1,
			collection_id,
			2
		));
		assert_eq!(
			<pallet_common::CollectionById<Test>>::get(collection_id).unwrap().owner,
			2
		);
	});
}

#[test]
fn destroy_collection() {
	new_test_ext().execute_with(|| {
		let collection_id = create_test_collection(&CollectionMode::NFT, CollectionId(1));

		let origin1 = Origin::signed(1);
		assert_ok!(TemplateModule::destroy_collection(origin1, collection_id));
	});
}

#[test]
fn burn_nft_item() {
	new_test_ext().execute_with(|| {
		let collection_id = create_test_collection(&CollectionMode::NFT, CollectionId(1));

		let origin1 = Origin::signed(1);
		assert_ok!(TemplateModule::add_collection_admin(
			origin1.clone(),
			collection_id,
			account(2)
		));

		let data = default_nft_data();
		create_test_item(collection_id, &data.into());

		// check balance (collection with id = 1, user id = 1)
		assert_eq!(<pallet_refungible::AccountBalance<Test>>::get((collection_id, account(1))), 1);

		// burn item
		assert_ok!(TemplateModule::burn_item(
			origin1.clone(),
			collection_id,
			TokenId(1),
			1
		));
		assert_noop!(
			TemplateModule::burn_item(origin1, collection_id, TokenId(1), 1),
			CommonError::<Test>::TokenNotFound
		);

		assert_eq!(<pallet_refungible::AccountBalance<Test>>::get((collection_id, account(1))), 0);
	});
}

#[test]
fn burn_fungible_item() {
	new_test_ext().execute_with(|| {
		let collection_id = create_test_collection(&CollectionMode::Fungible(3), CollectionId(1));

		let origin1 = Origin::signed(1);
		assert_ok!(TemplateModule::add_collection_admin(
			origin1.clone(),
			collection_id,
			account(2)
		));

		let data = default_fungible_data();
		create_test_item(collection_id, &data.into());

		// check balance (collection with id = 1, user id = 1)
		assert_eq!(<pallet_fungible::Balance<Test>>::get((collection_id, account(1))), 5);

		// burn item
		assert_ok!(TemplateModule::burn_item(origin1.clone(), CollectionId(1), TokenId(1), 5));
		assert_noop!(
			TemplateModule::burn_item(origin1, CollectionId(1), TokenId(1), 5),
			CommonError::<Test>::TokenValueNotEnough
		);

		assert_eq!(<pallet_fungible::Balance<Test>>::get((collection_id, account(1))), 0);
	});
}

#[test]
fn burn_refungible_item() {
	new_test_ext().execute_with(|| {
		let collection_id = create_test_collection(&CollectionMode::ReFungible, CollectionId(1));
		let origin1 = Origin::signed(1);

		assert_ok!(TemplateModule::set_mint_permission(
			origin1.clone(),
			collection_id,
			true
		));
		assert_ok!(TemplateModule::set_public_access_mode(
			origin1.clone(),
			collection_id,
			AccessMode::AllowList
		));
		assert_ok!(TemplateModule::add_to_allow_list(
			origin1.clone(),
			collection_id,
			account(1)
		));

		assert_ok!(TemplateModule::add_collection_admin(
			origin1.clone(),
			collection_id,
			account(2)
		));

		let data = default_re_fungible_data();
		create_test_item(collection_id, &data.into());

		// check balance (collection with id = 1, user id = 2)
		assert_eq!(<pallet_refungible::AccountBalance<Test>>::get((collection_id, account(1))), 1023);
		assert_eq!(<pallet_refungible::Balance<Test>>::get((collection_id, TokenId(1), account(1))), 1023);

		// burn item
		assert_ok!(TemplateModule::burn_item(origin1.clone(), collection_id, TokenId(1), 1023));
		assert_noop!(
			TemplateModule::burn_item(origin1, collection_id, TokenId(1), 1023),
			CommonError::<Test>::TokenNotFound
		);

		assert_eq!(<pallet_refungible::Balance<Test>>::get((collection_id, TokenId(1), account(1))), 0);
	});
}

#[test]
fn add_collection_admin() {
	new_test_ext().execute_with(|| {
		let collection1_id = create_test_collection_for_owner(&CollectionMode::NFT, 1, CollectionId(1));
		create_test_collection_for_owner(&CollectionMode::NFT, 2, CollectionId(2));
		create_test_collection_for_owner(&CollectionMode::NFT, 3, CollectionId(3));

		let origin1 = Origin::signed(1);

		// collection admin
		assert_ok!(TemplateModule::add_collection_admin(
			origin1.clone(),
			collection1_id,
			account(2)
		));
		assert_ok!(TemplateModule::add_collection_admin(
			origin1,
			collection1_id,
			account(3)
		));

		assert!(<pallet_common::IsAdmin<Test>>::get((CollectionId(1), account(1))));
		assert!(<pallet_common::IsAdmin<Test>>::get((CollectionId(1), account(2))));
		assert!(<pallet_common::IsAdmin<Test>>::get((CollectionId(1), account(3))));
	});
}

#[test]
fn remove_collection_admin() {
	new_test_ext().execute_with(|| {
		let collection1_id = create_test_collection_for_owner(&CollectionMode::NFT, 1, CollectionId(1));
		create_test_collection_for_owner(&CollectionMode::NFT, 2, CollectionId(2));
		create_test_collection_for_owner(&CollectionMode::NFT, 3, CollectionId(3));

		let origin1 = Origin::signed(1);
		let origin2 = Origin::signed(2);

		// collection admin
		assert_ok!(TemplateModule::add_collection_admin(
			origin1.clone(),
			collection1_id,
			account(2)
		));
		assert_ok!(TemplateModule::add_collection_admin(
			origin1,
			collection1_id,
			account(3)
		));

		assert!(<pallet_common::IsAdmin<Test>>::get((CollectionId(1), account(2))));
		assert!(<pallet_common::IsAdmin<Test>>::get((CollectionId(1), account(3))));

		// remove admin
		assert_ok!(TemplateModule::remove_collection_admin(
			origin2,
			CollectionId(1),
			account(3)
		));
		assert!(<pallet_common::IsAdmin<Test>>::get((CollectionId(1), account(3))));
		assert_eq!(<pallet_common::IsAdmin<Test>>::get((CollectionId(1), account(2))), false);
	});
}

#[test]
fn balance_of() {
	new_test_ext().execute_with(|| {
		let nft_collection_id = create_test_collection(&CollectionMode::NFT, CollectionId(1));
		let fungible_collection_id = create_test_collection(&CollectionMode::Fungible(3), CollectionId(2));
		let re_fungible_collection_id = create_test_collection(&CollectionMode::ReFungible, CollectionId(3));

		// check balance before
		assert_eq!(<pallet_nonfungible::AccountBalance<Test>>::get((nft_collection_id, account(1))), 0);
		assert_eq!(<pallet_fungible::Balance<Test>>::get((fungible_collection_id, account(1))), 0);
		assert_eq!(<pallet_refungible::AccountBalance<Test>>::get((re_fungible_collection_id, account(1))), 0);

		let nft_data = default_nft_data();
		create_test_item(nft_collection_id, &nft_data.into());

		let fungible_data = default_fungible_data();
		create_test_item(fungible_collection_id, &fungible_data.into());

		let re_fungible_data = default_re_fungible_data();
		create_test_item(re_fungible_collection_id, &re_fungible_data.into());

		// check balance (collection with id = 1, user id = 1)
		assert_eq!(<pallet_nonfungible::AccountBalance<Test>>::get((nft_collection_id, account(1))), 1);
		assert_eq!(<pallet_fungible::Balance<Test>>::get((fungible_collection_id, account(1))), 5);
		assert_eq!(<pallet_refungible::AccountBalance<Test>>::get((re_fungible_collection_id, account(1))), 1023);

		assert_eq!(<pallet_nonfungible::Owned<Test>>::get((nft_collection_id, account(1), TokenId(1))), true);
		assert_eq!(<pallet_refungible::Owned<Test>>::get((nft_collection_id, account(1), TokenId(1))), true);
	});
}

#[test]
fn approve() {
	new_test_ext().execute_with(|| {
		let collection_id = create_test_collection(&CollectionMode::NFT, CollectionId(1));

		let data = default_nft_data();
		create_test_item(collection_id, &data.into());

		let origin1 = Origin::signed(1);

		// approve
		assert_ok!(TemplateModule::approve(origin1, account(2), CollectionId(1), TokenId(1), 1));
		assert_eq!(<pallet_nonfungible::Allowance<Test>>::get((CollectionId(1), TokenId(1))).unwrap(), account(2));
	});
}

#[test]
fn transfer_from() {
	new_test_ext().execute_with(|| {
		let collection_id = create_test_collection(&CollectionMode::NFT, CollectionId(1));
		let origin1 = Origin::signed(1);
		let origin2 = Origin::signed(2);

		let data = default_nft_data();
		create_test_item(collection_id, &data.into());

		// approve
		assert_ok!(TemplateModule::approve(
			origin1.clone(),
			account(2),
			CollectionId(1),
			TokenId(1),
			1
		));
		assert_eq!(<pallet_nonfungible::Allowance<Test>>::get((CollectionId(1), TokenId(1))).unwrap(), account(2));

		assert_ok!(TemplateModule::set_mint_permission(
			origin1.clone(),
			CollectionId(1),
			true
		));
		assert_ok!(TemplateModule::set_public_access_mode(
			origin1.clone(),
			CollectionId(1),
			AccessMode::AllowList
		));
		assert_ok!(TemplateModule::add_to_allow_list(
			origin1.clone(),
			CollectionId(1),
			account(1)
		));
		assert_ok!(TemplateModule::add_to_allow_list(
			origin1.clone(),
			CollectionId(1),
			account(2)
		));
		assert_ok!(TemplateModule::add_to_allow_list(origin1, CollectionId(1), account(3)));

		assert_ok!(TemplateModule::transfer_from(
			origin2,
			account(1),
			account(2),
			CollectionId(1),
			TokenId(1),
			1
		));

		// after transfer
		assert_eq!(<pallet_nonfungible::AccountBalance<Test>>::get((CollectionId(1), account(1))), 0);
		assert_eq!(<pallet_nonfungible::AccountBalance<Test>>::get((CollectionId(1), account(2))), 1);
	});
}

// #endregion

// Coverage tests region
// #region

#[test]
fn owner_can_add_address_to_allow_list() {
	new_test_ext().execute_with(|| {
		let collection_id = create_test_collection(&CollectionMode::NFT, CollectionId(1));

		let origin1 = Origin::signed(1);
		assert_ok!(TemplateModule::add_to_allow_list(
			origin1,
			collection_id,
			account(2)
		));
		assert!(<pallet_common::Allowlist<Test>>::get((collection_id, account(2))));
	});
}

#[test]
fn admin_can_add_address_to_allow_list() {
	new_test_ext().execute_with(|| {
		let collection_id = create_test_collection(&CollectionMode::NFT, CollectionId(1));
		let origin1 = Origin::signed(1);
		let origin2 = Origin::signed(2);

		assert_ok!(TemplateModule::add_collection_admin(
			origin1,
			collection_id,
			account(2)
		));
		assert_ok!(TemplateModule::add_to_allow_list(
			origin2,
			collection_id,
			account(3)
		));
		assert!(<pallet_common::Allowlist<Test>>::get((collection_id, account(3))));
	});
}

#[test]
fn nonprivileged_user_cannot_add_address_to_allow_list() {
	new_test_ext().execute_with(|| {
		let collection_id = create_test_collection(&CollectionMode::NFT, CollectionId(1));

		let origin2 = Origin::signed(2);
		assert_noop!(
			TemplateModule::add_to_allow_list(origin2, collection_id, account(3)),
			CommonError::<Test>::NoPermission
		);
	});
}

#[test]
fn nobody_can_add_address_to_allow_list_of_nonexisting_collection() {
	new_test_ext().execute_with(|| {
		let origin1 = Origin::signed(1);

		assert_noop!(
			TemplateModule::add_to_allow_list(origin1, CollectionId(1), account(2)),
			CommonError::<Test>::CollectionNotFound
		);
	});
}

#[test]
fn nobody_can_add_address_to_allow_list_of_deleted_collection() {
	new_test_ext().execute_with(|| {
		let collection_id = create_test_collection(&CollectionMode::NFT, CollectionId(1));

		let origin1 = Origin::signed(1);
		assert_ok!(TemplateModule::destroy_collection(
			origin1.clone(),
			collection_id
		));
		assert_noop!(
			TemplateModule::add_to_allow_list(origin1, collection_id, account(2)),
			CommonError::<Test>::CollectionNotFound
		);
	});
}

// If address is already added to allow list, nothing happens
#[test]
fn address_is_already_added_to_allow_list() {
	new_test_ext().execute_with(|| {
		let collection_id = create_test_collection(&CollectionMode::NFT, CollectionId(1));
		let origin1 = Origin::signed(1);

		assert_ok!(TemplateModule::add_to_allow_list(
			origin1.clone(),
			collection_id,
			account(2)
		));
		assert_ok!(TemplateModule::add_to_allow_list(
			origin1,
			collection_id,
			account(2)
		));
		assert!(<pallet_common::Allowlist<Test>>::get((collection_id, account(2))));
	});
}

#[test]
fn owner_can_remove_address_from_allow_list() {
	new_test_ext().execute_with(|| {
		let collection_id = create_test_collection(&CollectionMode::NFT, CollectionId(1));

		let origin1 = Origin::signed(1);
		assert_ok!(TemplateModule::add_to_allow_list(
			origin1.clone(),
			collection_id,
			account(2)
		));
		assert_ok!(TemplateModule::remove_from_allow_list(
			origin1,
			collection_id,
			account(2)
		));
		assert!(<pallet_common::Allowlist<Test>>::get((collection_id, account(2))));
	});
}

#[test]
fn admin_can_remove_address_from_allow_list() {
	new_test_ext().execute_with(|| {
		let collection_id = create_test_collection(&CollectionMode::NFT, CollectionId(1));
		let origin1 = Origin::signed(1);
		let origin2 = Origin::signed(2);

		assert_ok!(TemplateModule::add_collection_admin(
			origin1.clone(),
			collection_id,
			account(2)
		));

		assert_ok!(TemplateModule::add_to_allow_list(
			origin1,
			collection_id,
			account(3)
		));
		assert_ok!(TemplateModule::remove_from_allow_list(
			origin2,
			collection_id,
			account(3)
		));
		assert!(<pallet_common::Allowlist<Test>>::get((collection_id, account(3))));
	});
}

#[test]
fn nonprivileged_user_cannot_remove_address_from_allow_list() {
	new_test_ext().execute_with(|| {
		let collection_id = create_test_collection(&CollectionMode::NFT, CollectionId(1));
		let origin1 = Origin::signed(1);
		let origin2 = Origin::signed(2);

		assert_ok!(TemplateModule::add_to_allow_list(
			origin1,
			collection_id,
			account(2)
		));
		assert_noop!(
			TemplateModule::remove_from_allow_list(origin2, collection_id, account(2)),
			CommonError::<Test>::NoPermission
		);
		assert!(<pallet_common::Allowlist<Test>>::get((collection_id, account(2))));
	});
}

#[test]
fn nobody_can_remove_address_from_allow_list_of_nonexisting_collection() {
	new_test_ext().execute_with(|| {
		let origin1 = Origin::signed(1);

		assert_noop!(
			TemplateModule::remove_from_allow_list(origin1, CollectionId(1), account(2)),
			CommonError::<Test>::CollectionNotFound
		);
	});
}

#[test]
fn nobody_can_remove_address_from_allow_list_of_deleted_collection() {
	new_test_ext().execute_with(|| {
		let collection_id = create_test_collection(&CollectionMode::NFT, CollectionId(1));
		let origin1 = Origin::signed(1);
		let origin2 = Origin::signed(2);

		assert_ok!(TemplateModule::add_to_allow_list(
			origin1.clone(),
			collection_id,
			account(2)
		));
		assert_ok!(TemplateModule::destroy_collection(origin1, collection_id));
		assert_noop!(
			TemplateModule::remove_from_allow_list(origin2, collection_id, account(2)),
			CommonError::<Test>::CollectionNotFound
		);
		assert!(<pallet_common::Allowlist<Test>>::get((collection_id, account(2))));
	});
}

// If address is already removed from allow list, nothing happens
#[test]
fn address_is_already_removed_from_allow_list() {
	new_test_ext().execute_with(|| {
		let collection_id = create_test_collection(&CollectionMode::NFT, CollectionId(1));
		let origin1 = Origin::signed(1);

		assert_ok!(TemplateModule::add_to_allow_list(
			origin1.clone(),
			collection_id,
			account(2)
		));
		assert_ok!(TemplateModule::remove_from_allow_list(
			origin1.clone(),
			collection_id,
			account(2)
		));
		assert_ok!(TemplateModule::remove_from_allow_list(
			origin1,
			collection_id,
			account(2)
		));
		assert!(<pallet_common::Allowlist<Test>>::get((collection_id, account(2))));
	});
}

// If Public Access mode is set to AllowList, tokens can’t be transferred from a non-allowlisted address with transfer or transferFrom (2 tests)
#[test]
fn allow_list_test_1() {
	new_test_ext().execute_with(|| {
		let collection_id = create_test_collection(&CollectionMode::NFT, CollectionId(1));

		let origin1 = Origin::signed(1);

		let data = default_nft_data();
		create_test_item(collection_id, &data.into());

		assert_ok!(TemplateModule::set_public_access_mode(
			origin1.clone(),
			collection_id,
			AccessMode::AllowList
		));
		assert_ok!(TemplateModule::add_to_allow_list(
			origin1.clone(),
			collection_id,
			account(2)
		));

		assert_noop!(
			TemplateModule::transfer(origin1, account(3), CollectionId(1), TokenId(1), 1),
			CommonError::<Test>::AddressNotInAllowlist
		);
	});
}

#[test]
fn allow_list_test_2() {
	new_test_ext().execute_with(|| {
		let collection_id = create_test_collection(&CollectionMode::NFT, CollectionId(1));
		let origin1 = Origin::signed(1);

		let data = default_nft_data();
		create_test_item(collection_id, &data.into());

		assert_ok!(TemplateModule::set_public_access_mode(
			origin1.clone(),
			collection_id,
			AccessMode::AllowList
		));
		assert_ok!(TemplateModule::add_to_allow_list(
			origin1.clone(),
			collection_id,
			account(1)
		));
		assert_ok!(TemplateModule::add_to_allow_list(
			origin1.clone(),
			collection_id,
			account(2)
		));

		// do approve
		assert_ok!(TemplateModule::approve(
			origin1.clone(),
			account(1),
			collection_id,
			TokenId(1),
			1
		));
		assert_eq!(<pallet_nonfungible::Allowance<Test>>::get((CollectionId(1), TokenId(1))).unwrap(), account(1));

		assert_ok!(TemplateModule::remove_from_allow_list(
			origin1.clone(),
			collection_id,
			account(1)
		));

		assert_noop!(
			TemplateModule::transfer_from(origin1, account(1), account(3), CollectionId(1), TokenId(1), 1),
			CommonError::<Test>::AddressNotInAllowlist
		);
	});
}

// If Public Access mode is set to AllowList, tokens can’t be transferred to a non-allowlisted address with transfer or transferFrom (2 tests)
#[test]
fn allow_list_test_3() {
	new_test_ext().execute_with(|| {
		let collection_id = create_test_collection(&CollectionMode::NFT, CollectionId(1));

		let origin1 = Origin::signed(1);

		let data = default_nft_data();
		create_test_item(collection_id, &data.into());

		assert_ok!(TemplateModule::set_public_access_mode(
			origin1.clone(),
			collection_id,
			AccessMode::AllowList
		));
		assert_ok!(TemplateModule::add_to_allow_list(
			origin1.clone(),
			collection_id,
			account(1)
		));

		assert_noop!(
			TemplateModule::transfer(origin1, account(3), collection_id, TokenId(1), 1),
			CommonError::<Test>::AddressNotInAllowlist
		);
	});
}

#[test]
fn allow_list_test_4() {
	new_test_ext().execute_with(|| {
		let collection_id = create_test_collection(&CollectionMode::NFT, CollectionId(1));

		let origin1 = Origin::signed(1);

		let data = default_nft_data();
		create_test_item(collection_id, &data.into());

		assert_ok!(TemplateModule::set_public_access_mode(
			origin1.clone(),
			collection_id,
			AccessMode::AllowList
		));
		assert_ok!(TemplateModule::add_to_allow_list(
			origin1.clone(),
			collection_id,
			account(1)
		));
		assert_ok!(TemplateModule::add_to_allow_list(
			origin1.clone(),
			collection_id,
			account(2)
		));

		// do approve
		assert_ok!(TemplateModule::approve(
			origin1.clone(),
			account(1),
			collection_id,
			TokenId(1),
			1
		));
		assert_eq!(<pallet_nonfungible::Allowance<Test>>::get((CollectionId(1), TokenId(1))).unwrap(), account(1));

		assert_ok!(TemplateModule::remove_from_allow_list(
			origin1.clone(),
			collection_id,
			account(2)
		));

		assert_noop!(
			TemplateModule::transfer_from(origin1, account(1), account(3), collection_id, TokenId(1), 1),
			CommonError::<Test>::AddressNotInAllowlist
		);
	});
}

// If Public Access mode is set to AllowList, tokens can’t be destroyed by a non-allowlisted address (even if it owned them before enabling AllowList mode)
#[test]
fn allow_list_test_5() {
	new_test_ext().execute_with(|| {
		let collection_id = create_test_collection(&CollectionMode::NFT, CollectionId(1));

		let origin1 = Origin::signed(1);

		let data = default_nft_data();
		create_test_item(collection_id, &data.into());

		assert_ok!(TemplateModule::set_public_access_mode(
			origin1.clone(),
			collection_id,
			AccessMode::AllowList
		));
		assert_noop!(
			TemplateModule::burn_item(origin1.clone(), CollectionId(1), TokenId(1), 5),
			CommonError::<Test>::AddressNotInAllowlist
		);
	});
}

// If Public Access mode is set to AllowList, token transfers can’t be Approved by a non-allowlisted address (see Approve method).
#[test]
fn allow_list_test_6() {
	new_test_ext().execute_with(|| {
		let collection_id = create_test_collection(&CollectionMode::NFT, CollectionId(1));

		let origin1 = Origin::signed(1);

		let data = default_nft_data();
		create_test_item(collection_id, &data.into());

		assert_ok!(TemplateModule::set_public_access_mode(
			origin1.clone(),
			collection_id,
			AccessMode::AllowList
		));

		// do approve
		assert_noop!(
			TemplateModule::approve(origin1, account(1), CollectionId(1), TokenId(1), 5),
			CommonError::<Test>::AddressNotInAllowlist
		);
	});
}

// If Public Access mode is set to AllowList, tokens can be transferred from a allowlisted address with transfer or transferFrom (2 tests) and
//          tokens can be transferred from a allowlisted address with transfer or transferFrom (2 tests)
#[test]
fn allow_list_test_7() {
	new_test_ext().execute_with(|| {
		let collection_id = create_test_collection(&CollectionMode::NFT, CollectionId(1));

		let data = default_nft_data();
		create_test_item(collection_id, &data.into());

		let origin1 = Origin::signed(1);

		assert_ok!(TemplateModule::set_public_access_mode(
			origin1.clone(),
			collection_id,
			AccessMode::AllowList
		));
		assert_ok!(TemplateModule::add_to_allow_list(
			origin1.clone(),
			collection_id,
			account(1)
		));
		assert_ok!(TemplateModule::add_to_allow_list(
			origin1.clone(),
			collection_id,
			account(2)
		));

		assert_ok!(TemplateModule::transfer(origin1, account(2), CollectionId(1), TokenId(1), 1));
	});
}

#[test]
fn allow_list_test_8() {
	new_test_ext().execute_with(|| {
		let collection_id = create_test_collection(&CollectionMode::NFT, CollectionId(1));

		let data = default_nft_data();
		create_test_item(collection_id, &data.into());

		let origin1 = Origin::signed(1);

		assert_ok!(TemplateModule::set_public_access_mode(
			origin1.clone(),
			collection_id,
			AccessMode::AllowList
		));
		assert_ok!(TemplateModule::add_to_allow_list(
			origin1.clone(),
			collection_id,
			account(1)
		));
		assert_ok!(TemplateModule::add_to_allow_list(
			origin1.clone(),
			collection_id,
			account(2)
		));

		// do approve
		assert_ok!(TemplateModule::approve(
			origin1.clone(),
			account(1),
			CollectionId(1), 
			TokenId(1),
			5
		));
		assert_eq!(<pallet_nonfungible::Allowance<Test>>::get((CollectionId(1), TokenId(1))).unwrap(), account(1));

		assert_ok!(TemplateModule::transfer_from(
			origin1,
			account(1),
			account(2),
			CollectionId(1), 
			TokenId(1),
			1
		));
	});
}

// If Public Access mode is set to AllowList, and Mint Permission is set to false, tokens can be created by owner.
#[test]
fn allow_list_test_9() {
	new_test_ext().execute_with(|| {
		let collection_id = create_test_collection(&CollectionMode::NFT, CollectionId(1));
		let origin1 = Origin::signed(1);

		assert_ok!(TemplateModule::set_public_access_mode(
			origin1.clone(),
			collection_id,
			AccessMode::AllowList
		));
		assert_ok!(TemplateModule::set_mint_permission(
			origin1,
			collection_id,
			false
		));

		let data = default_nft_data();
		create_test_item(collection_id, &data.into());
	});
}

// If Public Access mode is set to AllowList, and Mint Permission is set to false, tokens can be created by admin.
#[test]
fn allow_list_test_10() {
	new_test_ext().execute_with(|| {
		let collection_id = create_test_collection(&CollectionMode::NFT, CollectionId(1));

		let origin1 = Origin::signed(1);
		let origin2 = Origin::signed(2);

		assert_ok!(TemplateModule::set_public_access_mode(
			origin1.clone(),
			collection_id,
			AccessMode::AllowList
		));
		assert_ok!(TemplateModule::set_mint_permission(
			origin1.clone(),
			collection_id,
			false
		));

		assert_ok!(TemplateModule::add_collection_admin(
			origin1,
			collection_id,
			account(2)
		));

		assert_ok!(TemplateModule::create_item(
			origin2,
			collection_id,
			account(2),
			default_nft_data().into()
		));
	});
}

// If Public Access mode is set to AllowList, and Mint Permission is set to false, tokens cannot be created by non-privileged and allow listed address.
#[test]
fn allow_list_test_11() {
	new_test_ext().execute_with(|| {
		let collection_id = create_test_collection(&CollectionMode::NFT, CollectionId(1));

		let origin1 = Origin::signed(1);
		let origin2 = Origin::signed(2);

		assert_ok!(TemplateModule::set_public_access_mode(
			origin1.clone(),
			collection_id,
			AccessMode::AllowList
		));
		assert_ok!(TemplateModule::set_mint_permission(
			origin1.clone(),
			collection_id,
			false
		));
		assert_ok!(TemplateModule::add_to_allow_list(
			origin1,
			collection_id,
			account(2)
		));

		assert_noop!(
			TemplateModule::create_item(origin2, CollectionId(1), account(2), default_nft_data().into()),
			CommonError::<Test>::PublicMintingNotAllowed
		);
	});
}

// If Public Access mode is set to AllowList, and Mint Permission is set to false, tokens cannot be created by non-privileged and non-allow listed address.
#[test]
fn allow_list_test_12() {
	new_test_ext().execute_with(|| {
		let collection_id = create_test_collection(&CollectionMode::NFT, CollectionId(1));

		let origin1 = Origin::signed(1);
		let origin2 = Origin::signed(2);

		assert_ok!(TemplateModule::set_public_access_mode(
			origin1.clone(),
			collection_id,
			AccessMode::AllowList
		));
		assert_ok!(TemplateModule::set_mint_permission(
			origin1,
			collection_id,
			false
		));

		assert_noop!(
			TemplateModule::create_item(origin2, CollectionId(1), account(2), default_nft_data().into()),
			CommonError::<Test>::PublicMintingNotAllowed
		);
	});
}

// If Public Access mode is set to AllowList, and Mint Permission is set to true, tokens can be created by owner.
#[test]
fn allow_list_test_13() {
	new_test_ext().execute_with(|| {
		let collection_id = create_test_collection(&CollectionMode::NFT, CollectionId(1));

		let origin1 = Origin::signed(1);

		assert_ok!(TemplateModule::set_public_access_mode(
			origin1.clone(),
			collection_id,
			AccessMode::AllowList
		));
		assert_ok!(TemplateModule::set_mint_permission(
			origin1,
			collection_id,
			true
		));

		let data = default_nft_data();
		create_test_item(collection_id, &data.into());
	});
}

// If Public Access mode is set to AllowList, and Mint Permission is set to true, tokens can be created by admin.
#[test]
fn allow_list_test_14() {
	new_test_ext().execute_with(|| {
		let collection_id = create_test_collection(&CollectionMode::NFT, CollectionId(1));

		let origin1 = Origin::signed(1);
		let origin2 = Origin::signed(2);

		assert_ok!(TemplateModule::set_public_access_mode(
			origin1.clone(),
			collection_id,
			AccessMode::AllowList
		));
		assert_ok!(TemplateModule::set_mint_permission(
			origin1.clone(),
			collection_id,
			true
		));

		assert_ok!(TemplateModule::add_collection_admin(
			origin1,
			collection_id,
			account(2)
		));

		assert_ok!(TemplateModule::create_item(
			origin2,
			collection_id,
			account(2),
			default_nft_data().into()
		));
	});
}

// If Public Access mode is set to AllowList, and Mint Permission is set to true, tokens cannot be created by non-privileged and non-allow listed address.
#[test]
fn allow_list_test_15() {
	new_test_ext().execute_with(|| {
		let collection_id = create_test_collection(&CollectionMode::NFT, CollectionId(1));

		let origin1 = Origin::signed(1);
		let origin2 = Origin::signed(2);

		assert_ok!(TemplateModule::set_public_access_mode(
			origin1.clone(),
			collection_id,
			AccessMode::AllowList
		));
		assert_ok!(TemplateModule::set_mint_permission(
			origin1,
			collection_id,
			true
		));

		assert_noop!(
			TemplateModule::create_item(origin2, collection_id, account(2), default_nft_data().into()),
			CommonError::<Test>::AddressNotInAllowlist
		);
	});
}

// If Public Access mode is set to AllowList, and Mint Permission is set to true, tokens can be created by non-privileged and allow listed address.
#[test]
fn allow_list_test_16() {
	new_test_ext().execute_with(|| {
		let collection_id = create_test_collection(&CollectionMode::NFT, CollectionId(1));

		let origin1 = Origin::signed(1);
		let origin2 = Origin::signed(2);

		assert_ok!(TemplateModule::set_public_access_mode(
			origin1.clone(),
			collection_id,
			AccessMode::AllowList
		));
		assert_ok!(TemplateModule::set_mint_permission(
			origin1.clone(),
			collection_id,
			true
		));
		assert_ok!(TemplateModule::add_to_allow_list(
			origin1,
			collection_id,
			account(2)
		));

		assert_ok!(TemplateModule::create_item(
			origin2,
			collection_id,
			account(2),
			default_nft_data().into()
		));
	});
}

// Total number of collections. Positive test
#[test]
fn total_number_collections_bound() {
	new_test_ext().execute_with(|| {
		create_test_collection(&CollectionMode::NFT, CollectionId(1));
	});
}

// Total number of collections. Negotive test
#[test]
fn total_number_collections_bound_neg() {
	new_test_ext().execute_with(|| {
		let origin1 = Origin::signed(1);

		for i in 0..COLLECTION_NUMBER_LIMIT {
			create_test_collection(&CollectionMode::NFT, CollectionId(i + 1));
		}

		let col_name1: Vec<u16> = "Test1\0".encode_utf16().collect::<Vec<u16>>();
		let col_desc1: Vec<u16> = "TestDescription1\0".encode_utf16().collect::<Vec<u16>>();
		let token_prefix1: Vec<u8> = b"token_prefix1\0".to_vec();

		// 11-th collection in chain. Expects error
		assert_noop!(
			TemplateModule::create_collection(
				origin1,
				col_name1,
				col_desc1,
				token_prefix1,
				CollectionMode::NFT
			),
			CommonError::<Test>::TotalCollectionsLimitExceeded
		);
	});
}

// Owned tokens by a single address. Positive test
#[test]
fn owned_tokens_bound() {
	new_test_ext().execute_with(|| {
		let collection_id = create_test_collection(&CollectionMode::NFT, CollectionId(1));

		let data = default_nft_data();
		create_test_item(collection_id, &data.clone().into());
		create_test_item(collection_id, &data.into());
	});
}

// Owned tokens by a single address. Negotive test
#[test]
fn owned_tokens_bound_neg() {
	new_test_ext().execute_with(|| {
		let collection_id = create_test_collection(&CollectionMode::NFT, CollectionId(1));

		let origin1 = Origin::signed(1);

		for _ in 0..MAX_TOKEN_OWNERSHIP {
			let data = default_nft_data();
			create_test_item(collection_id, &data.clone().into());
		}

		let data = default_nft_data();
		assert_noop!(
			TemplateModule::create_item(origin1, CollectionId(1), account(1), data.into()),
			CommonError::<Test>::AccountTokenLimitExceeded
		);
	});
}

// Number of collection admins. Positive test
#[test]
fn collection_admins_bound() {
	new_test_ext().execute_with(|| {
		let collection_id = create_test_collection(&CollectionMode::NFT, CollectionId(1));

		let origin1 = Origin::signed(1);

		assert_ok!(TemplateModule::add_collection_admin(
			origin1.clone(),
			collection_id,
			account(2)
		));
		assert_ok!(TemplateModule::add_collection_admin(
			origin1,
			collection_id,
			account(3)
		));
	});
}

// Number of collection admins. Negotive test
#[test]
fn collection_admins_bound_neg() {
	new_test_ext().execute_with(|| {
		let collection_id = create_test_collection(&CollectionMode::NFT, CollectionId(1));

		let origin1 = Origin::signed(1);

		for i in 0..COLLECTION_ADMINS_LIMIT {
			assert_ok!(TemplateModule::add_collection_admin(
				origin1.clone(),
				collection_id,
				account((2 + i).into())
			));
		}
		assert_noop!(
			TemplateModule::add_collection_admin(
				origin1,
				collection_id,
				account((3 + COLLECTION_ADMINS_LIMIT).into())
			),
			CommonError::<Test>::CollectionAdminCountExceeded
		);
	});
}
// #endregion

#[test]
fn set_const_on_chain_schema() {
	new_test_ext().execute_with(|| {
		let collection_id = create_test_collection(&CollectionMode::NFT, CollectionId(1));

		let origin1 = Origin::signed(1);
		assert_ok!(TemplateModule::set_const_on_chain_schema(
			origin1,
			collection_id,
			b"test const on chain schema".to_vec()
		));

		assert_eq!(
			<pallet_common::CollectionById<Test>>::get(collection_id)
				.unwrap()
				.const_on_chain_schema,
			b"test const on chain schema".to_vec()
		);
		assert_eq!(
			<pallet_common::CollectionById<Test>>::get(collection_id)
				.unwrap()
				.variable_on_chain_schema,
			b"".to_vec()
		);
	});
}

#[test]
fn set_variable_on_chain_schema() {
	new_test_ext().execute_with(|| {
		let collection_id = create_test_collection(&CollectionMode::NFT, CollectionId(1));

		let origin1 = Origin::signed(1);
		assert_ok!(TemplateModule::set_variable_on_chain_schema(
			origin1,
			collection_id,
			b"test variable on chain schema".to_vec()
		));

		assert_eq!(
			<pallet_common::CollectionById<Test>>::get(collection_id)
				.unwrap()
				.const_on_chain_schema,
			b"".to_vec()
		);
		assert_eq!(
			<pallet_common::CollectionById<Test>>::get(collection_id)
				.unwrap()
				.variable_on_chain_schema,
			b"test variable on chain schema".to_vec()
		);
	});
}

#[test]
fn set_variable_meta_data_on_nft_token_stores_variable_meta_data() {
	new_test_ext().execute_with(|| {
		let collection_id = create_test_collection(&CollectionMode::NFT, CollectionId(1));

		let origin1 = Origin::signed(1);

		let data = default_nft_data();
		create_test_item(CollectionId(1), &data.into());

		let variable_data = b"test data".to_vec();
		assert_ok!(TemplateModule::set_variable_meta_data(
			origin1,
			collection_id,
			TokenId(1),
			variable_data.clone()
		));

		assert_eq!(
			<pallet_nonfungible::TokenData<Test>>::get((collection_id, 1))
				.unwrap()
				.variable_data,
			variable_data
		);
	});
}

#[test]
fn set_variable_meta_data_on_re_fungible_token_stores_variable_meta_data() {
	new_test_ext().execute_with(|| {
		let collection_id = create_test_collection(&CollectionMode::ReFungible, CollectionId(1));

		let origin1 = Origin::signed(1);

		let data = default_re_fungible_data();
		create_test_item(collection_id, &data.into());

		let variable_data = b"test data".to_vec();
		assert_ok!(TemplateModule::set_variable_meta_data(
			origin1,
			collection_id,
			TokenId(1),
			variable_data.clone()
		));

		assert_eq!(
			<pallet_refungible::TokenData<Test>>::get((collection_id, TokenId(1)))
				.variable_data,
			variable_data
		);
	});
}

#[test]
fn set_variable_meta_data_on_fungible_token_fails() {
	new_test_ext().execute_with(|| {
		let collection_id = create_test_collection(&CollectionMode::Fungible(3), CollectionId(1));

		let origin1 = Origin::signed(1);

		let data = default_fungible_data();
		create_test_item(collection_id, &data.into());

		let variable_data = b"test data".to_vec();
		assert_noop!(
			TemplateModule::set_variable_meta_data(origin1, collection_id, TokenId(1), variable_data),
			<pallet_fungible::Error<Test>>::FungibleItemsDontHaveData
		);
	});
}

#[test]
fn set_variable_meta_data_on_nft_token_fails_for_big_data() {
	new_test_ext().execute_with(|| {
		let collection_id = create_test_collection(&CollectionMode::NFT, CollectionId(1));

		let origin1 = Origin::signed(1);

		let data = default_nft_data();
		create_test_item(collection_id, &data.into());

		let variable_data = b"test set_variable_meta_data method, bigger than limits.".to_vec();
		assert_noop!(
			TemplateModule::set_variable_meta_data(origin1, collection_id, TokenId(1), variable_data),
			CommonError::<Test>::TokenVariableDataLimitExceeded
		);
	});
}

#[test]
fn set_variable_meta_data_on_re_fungible_token_fails_for_big_data() {
	new_test_ext().execute_with(|| {
		let collection_id = create_test_collection(&CollectionMode::ReFungible, CollectionId(1));

		let origin1 = Origin::signed(1);

		let data = default_re_fungible_data();
		create_test_item(collection_id, &data.into());

		let variable_data = b"test set_variable_meta_data method, bigger than limits.".to_vec();
		assert_noop!(
			TemplateModule::set_variable_meta_data(origin1, collection_id, TokenId(1), variable_data),
			CommonError::<Test>::TokenVariableDataLimitExceeded
		);
	});
}

#[test]
fn set_variable_meta_data_on_nft_with_item_owner_permission_flag() {
	new_test_ext().execute_with(|| {
		//default_limits();

		let collection_id = create_test_collection(&CollectionMode::NFT, CollectionId(1));

		let origin1 = Origin::signed(1);

		let data = default_nft_data();
		create_test_item(collection_id, &data.into());

		assert_ok!(TemplateModule::set_meta_update_permission_flag(
			origin1.clone(),
			collection_id,
			MetaUpdatePermission::ItemOwner,
		));

		let variable_data = b"ten chars.".to_vec();
		assert_ok!(TemplateModule::set_variable_meta_data(
			origin1,
			collection_id,
			TokenId(1),
			variable_data.clone()
		));

		assert_eq!(
			<pallet_nonfungible::TokenData<Test>>::get((collection_id, TokenId(1)))
				.unwrap()
				.variable_data,
			variable_data
		);
	});
}

#[test]
fn set_variable_meta_data_on_nft_with_item_owner_permission_flag_neg() {
	new_test_ext().execute_with(|| {
		let collection_id = create_test_collection_for_owner(&CollectionMode::NFT, 1, CollectionId(1));

		let origin1 = Origin::signed(1);

		assert_ok!(TemplateModule::set_mint_permission(
			origin1.clone(),
			collection_id,
			true
		));
		assert_ok!(TemplateModule::add_to_allow_list(
			origin1.clone(),
			collection_id,
			account(1)
		));

		let data = default_nft_data();
		create_test_item(collection_id, &data.into());

		assert_ok!(TemplateModule::set_meta_update_permission_flag(
			origin1.clone(),
			collection_id,
			MetaUpdatePermission::ItemOwner,
		));

		let variable_data = b"1234567890123".to_vec();
		assert_noop!(
			TemplateModule::set_variable_meta_data(
				origin1,
				collection_id,
				TokenId(1),
				variable_data.clone()
			),
			CommonError::<Test>::TokenVariableDataLimitExceeded
		);
	})
}

#[test]
fn collection_transfer_flag_works() {
	new_test_ext().execute_with(|| {
		let origin1 = Origin::signed(1);

		let collection_id = create_test_collection(&CollectionMode::NFT, CollectionId(1));
		assert_ok!(TemplateModule::set_transfers_enabled_flag(origin1, collection_id, true));

		let data = default_nft_data();
		create_test_item(collection_id, &data.into());
		assert_eq!(<pallet_nonfungible::AccountBalance<Test>>::get((collection_id, account(1))), 1);
		assert_eq!(<pallet_nonfungible::Owned<Test>>::get((collection_id, account(1), TokenId(1))), true);

		let origin1 = Origin::signed(1);

		// default scenario
		assert_ok!(TemplateModule::transfer(origin1, account(2), collection_id, TokenId(1), 1000));
		assert_eq!(<pallet_nonfungible::Owned<Test>>::get((collection_id, account(1), TokenId(1))), false);
		assert_eq!(<pallet_nonfungible::Owned<Test>>::get((collection_id, account(2), TokenId(1))), true);
		assert_eq!(<pallet_nonfungible::AccountBalance<Test>>::get((collection_id, account(1))), 0);
		assert_eq!(<pallet_nonfungible::AccountBalance<Test>>::get((collection_id, account(2))), 1);
	});
}

#[test]
fn set_variable_meta_data_on_nft_with_admin_flag() {
	new_test_ext().execute_with(|| {
		// default_limits();

		let collection_id = create_test_collection_for_owner(&CollectionMode::NFT, 2, CollectionId(1));

		let origin1 = Origin::signed(1);
		let origin2 = Origin::signed(2);

		assert_ok!(TemplateModule::set_mint_permission(
			origin2.clone(),
			collection_id,
			true
		));
		assert_ok!(TemplateModule::add_to_allow_list(
			origin2.clone(),
			collection_id,
			account(1)
		));

		assert_ok!(TemplateModule::add_collection_admin(
			origin2.clone(),
			collection_id,
			account(1)
		));

		let data = default_nft_data();
		create_test_item(collection_id, &data.into());

		assert_ok!(TemplateModule::set_meta_update_permission_flag(
			origin2.clone(),
			collection_id,
			MetaUpdatePermission::Admin,
		));

		let variable_data = b"test.".to_vec();
		assert_ok!(TemplateModule::set_variable_meta_data(
			origin1,
			collection_id,
			TokenId(1),
			variable_data.clone()
		));

		assert_eq!(
			<pallet_nonfungible::TokenData<Test>>::get((collection_id, 1))
				.unwrap()
				.variable_data,
			variable_data
		);
	});
}

#[test]
fn set_variable_meta_data_on_nft_with_admin_flag_neg() {
	new_test_ext().execute_with(|| {
		// default_limits();

		let collection_id = create_test_collection_for_owner(&CollectionMode::NFT, 2, CollectionId(1));

		let origin1 = Origin::signed(1);
		let origin2 = Origin::signed(2);

		assert_ok!(TemplateModule::set_mint_permission(
			origin2.clone(),
			collection_id,
			true
		));
		assert_ok!(TemplateModule::add_to_allow_list(
			origin2.clone(),
			collection_id,
			account(1)
		));

		let data = default_nft_data();
		create_test_item(collection_id, &data.into());

		assert_ok!(TemplateModule::set_meta_update_permission_flag(
			origin2.clone(),
			collection_id,
			MetaUpdatePermission::Admin,
		));

		let variable_data = b"test.".to_vec();
		assert_noop!(
			TemplateModule::set_variable_meta_data(
				origin1,
				collection_id,
				TokenId(1),
				variable_data.clone()
			),
			CommonError::<Test>::NoPermission
		);
	});
}

#[test]
fn set_variable_meta_flag_after_freeze() {
	new_test_ext().execute_with(|| {
		// default_limits();

		let collection_id = create_test_collection_for_owner(&CollectionMode::NFT, 2, CollectionId(1));

		let origin2 = Origin::signed(2);

		assert_ok!(TemplateModule::set_meta_update_permission_flag(
			origin2.clone(),
			collection_id,
			MetaUpdatePermission::None,
		));
		assert_noop!(
			TemplateModule::set_meta_update_permission_flag(
				origin2.clone(),
				collection_id,
				MetaUpdatePermission::Admin
			),
			CommonError::<Test>::MetadataFlagFrozen
		);
	});
}

#[test]
fn set_variable_meta_data_on_nft_with_none_flag_neg() {
	new_test_ext().execute_with(|| {
		// default_limits();

		let collection_id = create_test_collection_for_owner(&CollectionMode::NFT, 1, CollectionId(1));
		let origin1 = Origin::signed(1);

		let data = default_nft_data();
		create_test_item(collection_id, &data.into());

		assert_ok!(TemplateModule::set_meta_update_permission_flag(
			origin1.clone(),
			collection_id,
			MetaUpdatePermission::None,
		));

		let variable_data = b"test.".to_vec();
		assert_noop!(
			TemplateModule::set_variable_meta_data(
				origin1.clone(),
				collection_id,
				TokenId(1),
				variable_data.clone()
			),
			CommonError::<Test>::NoPermission
		);
	});
}

#[test]
fn collection_transfer_flag_works_neg() {
	new_test_ext().execute_with(|| {
		let origin1 = Origin::signed(1);

		let collection_id = create_test_collection(&CollectionMode::NFT, CollectionId(1));
		assert_ok!(TemplateModule::set_transfers_enabled_flag(
			origin1, collection_id, false
		));

		let data = default_nft_data();
		create_test_item(collection_id, &data.into());
		assert_eq!(<pallet_nonfungible::AccountBalance<Test>>::get((collection_id, account(1))), 1);
		assert_eq!(<pallet_nonfungible::Owned<Test>>::get((collection_id, account(1), TokenId(1))), true);

		let origin1 = Origin::signed(1);

		// default scenario
		assert_noop!(
			TemplateModule::transfer(origin1, account(2), CollectionId(1), TokenId(1), 1000),
			CommonError::<Test>::TransferNotAllowed
		);
		assert_eq!(<pallet_nonfungible::AccountBalance<Test>>::get((collection_id, account(1))), 1);
		assert_eq!(<pallet_nonfungible::AccountBalance<Test>>::get((collection_id, account(2))), 0);
		assert_eq!(<pallet_nonfungible::Owned<Test>>::get((collection_id, account(1), TokenId(1))), true);
		assert_eq!(<pallet_nonfungible::Owned<Test>>::get((collection_id, account(2), TokenId(1))), false);
	});
}
