// Copyright 2019-2022 Unique Network (Gibraltar) Ltd.
// This file is part of Unique Network.

// Unique Network is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// Unique Network is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with Unique Network. If not, see <http://www.gnu.org/licenses/>.

// Tests to be written here
use crate::{Test, TestCrossAccountId, CollectionCreationPrice, Origin, Unique, new_test_ext};
use up_data_structs::{
	COLLECTION_NUMBER_LIMIT, CollectionId, CreateItemData, CreateFungibleData, CreateNftData,
	CreateReFungibleData, MAX_DECIMAL_POINTS, COLLECTION_ADMINS_LIMIT, TokenId,
	MAX_TOKEN_OWNERSHIP, CreateCollectionData, CollectionMode, AccessMode, CollectionPermissions,
	PropertyKeyPermission, PropertyPermission, Property, CollectionPropertiesVec,
	CollectionPropertiesPermissionsVec,
};
use frame_support::{assert_noop, assert_ok, assert_err};
use sp_std::convert::TryInto;
use pallet_evm::account::CrossAccountId;
use pallet_common::Error as CommonError;
use pallet_unique::Error as UniqueError;

fn add_balance(user: u64, value: u64) {
	const DONOR_USER: u64 = 999;
	assert_ok!(<pallet_balances::Pallet<Test>>::set_balance(
		Origin::root(),
		DONOR_USER,
		value,
		0
	));
	assert_ok!(<pallet_balances::Pallet<Test>>::force_transfer(
		Origin::root(),
		DONOR_USER,
		user,
		value
	));
}

fn default_nft_data() -> CreateNftData {
	CreateNftData {
		properties: vec![Property {
			key: b"test-prop".to_vec().try_into().unwrap(),
			value: b"test-nft-prop".to_vec().try_into().unwrap(),
		}]
		.try_into()
		.unwrap(),
	}
}

fn default_fungible_data() -> CreateFungibleData {
	CreateFungibleData { value: 5 }
}

fn default_re_fungible_data() -> CreateReFungibleData {
	CreateReFungibleData {
		const_data: vec![1, 2, 3].try_into().unwrap(),
		pieces: 1023,
	}
}

fn create_test_collection_for_owner(
	mode: &CollectionMode,
	owner: u64,
	id: CollectionId,
) -> CollectionId {
	add_balance(owner, CollectionCreationPrice::get() as u64 + 1);

	let col_name1: Vec<u16> = "Test1\0".encode_utf16().collect::<Vec<u16>>();
	let col_desc1: Vec<u16> = "TestDescription1\0".encode_utf16().collect::<Vec<u16>>();
	let token_prefix1: Vec<u8> = b"token_prefix1\0".to_vec();
	let token_property_permissions: CollectionPropertiesPermissionsVec =
		vec![PropertyKeyPermission {
			key: b"test-prop".to_vec().try_into().unwrap(),
			permission: PropertyPermission {
				mutable: true,
				collection_admin: false,
				token_owner: true,
			},
		}]
		.try_into()
		.unwrap();
	let properties: CollectionPropertiesVec = vec![Property {
		key: b"test-collection-prop".to_vec().try_into().unwrap(),
		value: b"test-collection-value".to_vec().try_into().unwrap(),
	}]
	.try_into()
	.unwrap();

	let data: CreateCollectionData<u64> = CreateCollectionData {
		name: col_name1.try_into().unwrap(),
		description: col_desc1.try_into().unwrap(),
		token_prefix: token_prefix1.try_into().unwrap(),
		mode: mode.clone(),
		token_property_permissions: token_property_permissions.clone(),
		properties: properties.clone(),
		..Default::default()
	};

	let origin1 = Origin::signed(owner);
	assert_ok!(Unique::create_collection_ex(origin1, data));

	let saved_col_name: Vec<u16> = "Test1\0".encode_utf16().collect::<Vec<u16>>();
	let saved_description: Vec<u16> = "TestDescription1\0".encode_utf16().collect::<Vec<u16>>();
	let saved_prefix: Vec<u8> = b"token_prefix1\0".to_vec();
	assert_eq!(
		<pallet_common::CollectionById<Test>>::get(id)
			.unwrap()
			.owner,
		owner
	);
	assert_eq!(
		<pallet_common::CollectionById<Test>>::get(id).unwrap().name,
		saved_col_name
	);
	assert_eq!(
		<pallet_common::CollectionById<Test>>::get(id).unwrap().mode,
		*mode
	);
	assert_eq!(
		<pallet_common::CollectionById<Test>>::get(id)
			.unwrap()
			.description,
		saved_description
	);
	assert_eq!(
		<pallet_common::CollectionById<Test>>::get(id)
			.unwrap()
			.token_prefix,
		saved_prefix
	);
	assert_eq!(
		get_collection_property_permissions(id).as_slice(),
		token_property_permissions.as_slice()
	);
	assert_eq!(
		get_collection_properties(id).as_slice(),
		properties.as_slice()
	);
	id
}

fn get_collection_property_permissions(collection_id: CollectionId) -> Vec<PropertyKeyPermission> {
	<pallet_common::Pallet<Test>>::property_permissions(collection_id)
		.into_iter()
		.map(|(key, permission)| PropertyKeyPermission { key, permission })
		.collect()
}

fn get_collection_properties(collection_id: CollectionId) -> Vec<Property> {
	<pallet_common::Pallet<Test>>::collection_properties(collection_id)
		.into_iter()
		.map(|(key, value)| Property { key, value })
		.collect()
}

fn get_token_properties(collection_id: CollectionId, token_id: TokenId) -> Vec<Property> {
	<pallet_nonfungible::Pallet<Test>>::token_properties((collection_id, token_id))
		.into_iter()
		.map(|(key, value)| Property { key, value })
		.collect()
}

fn create_test_collection(mode: &CollectionMode, id: CollectionId) -> CollectionId {
	create_test_collection_for_owner(&mode, 1, id)
}

fn create_test_item(collection_id: CollectionId, data: &CreateItemData) {
	let origin1 = Origin::signed(1);
	assert_ok!(Unique::create_item(
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
fn check_not_sufficient_founds() {
	new_test_ext().execute_with(|| {
		let acc: u64 = 1;
		<pallet_balances::Pallet<Test>>::set_balance(Origin::root(), acc, 0, 0).unwrap();

		let name: Vec<u16> = "Test1\0".encode_utf16().collect::<Vec<u16>>();
		let description: Vec<u16> = "TestDescription1\0".encode_utf16().collect::<Vec<u16>>();
		let token_prefix: Vec<u8> = b"token_prefix1\0".to_vec();

		let data: CreateCollectionData<<Test as frame_system::Config>::AccountId> =
			CreateCollectionData {
				name: name.try_into().unwrap(),
				description: description.try_into().unwrap(),
				token_prefix: token_prefix.try_into().unwrap(),
				mode: CollectionMode::NFT,
				..Default::default()
			};

		let result = Unique::create_collection_ex(Origin::signed(acc), data);
		assert_err!(result, <CommonError<Test>>::NotSufficientFounds);
	});
}

#[test]
fn create_fungible_collection_fails_with_large_decimal_numbers() {
	new_test_ext().execute_with(|| {
		let col_name1: Vec<u16> = "Test1\0".encode_utf16().collect::<Vec<u16>>();
		let col_desc1: Vec<u16> = "TestDescription1\0".encode_utf16().collect::<Vec<u16>>();
		let token_prefix1: Vec<u8> = b"token_prefix1\0".to_vec();

		let data: CreateCollectionData<u64> = CreateCollectionData {
			name: col_name1.try_into().unwrap(),
			description: col_desc1.try_into().unwrap(),
			token_prefix: token_prefix1.try_into().unwrap(),
			mode: CollectionMode::Fungible(MAX_DECIMAL_POINTS + 1),
			..Default::default()
		};

		let origin1 = Origin::signed(1);
		assert_noop!(
			Unique::create_collection_ex(origin1, data),
			UniqueError::<Test>::CollectionDecimalPointLimitExceeded
		);
	});
}

#[test]
fn create_nft_item() {
	new_test_ext().execute_with(|| {
		let collection_id = create_test_collection(&CollectionMode::NFT, CollectionId(1));

		let data = default_nft_data();
		create_test_item(collection_id, &data.clone().into());

		assert_eq!(
			get_token_properties(collection_id, TokenId(1)).as_slice(),
			data.properties.as_slice(),
		);
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

		assert_ok!(Unique::create_multiple_items(
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
			assert_eq!(
				get_token_properties(CollectionId(1), TokenId(index as u32 + 1)).as_slice(),
				data.properties.as_slice()
			);
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
		let balance =
			<pallet_refungible::Balance<Test>>::get((collection_id, TokenId(1), account(1)));
		assert_eq!(item.const_data, data.const_data.into_inner());
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

		assert_ok!(Unique::create_multiple_items(
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
			let item = <pallet_refungible::TokenData<Test>>::get((
				CollectionId(1),
				TokenId((index + 1) as u32),
			));
			let balance =
				<pallet_refungible::Balance<Test>>::get((CollectionId(1), TokenId(1), account(1)));
			assert_eq!(item.const_data.to_vec(), data.const_data.into_inner());
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

		assert_eq!(
			<pallet_fungible::Balance<Test>>::get((collection_id, account(1))),
			5
		);
	});
}

//#[test]
// fn create_multiple_fungible_items() {
//     new_test_ext().execute_with(|| {
//         default_limits();

//         create_test_collection(&CollectionMode::Fungible(3), CollectionId(1));

//         let origin1 = Origin::signed(1);

//         let items_data = vec![default_fungible_data(), default_fungible_data(), default_fungible_data()];

//         assert_ok!(Unique::create_multiple_items(
//             origin1.clone(),
//             1,
//             1,
//             items_data.clone().into_iter().map(|d| { d.into() }).collect()
//         ));

//         for (index, _) in items_data.iter().enumerate() {
//             assert_eq!(Unique::fungible_item_id(1, (index + 1) as TokenId).value, 5);
//         }
//         assert_eq!(Unique::balance_count(1, 1), 3000);
//         assert_eq!(Unique::address_tokens(1, 1), [1, 2, 3]);
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

		assert_eq!(
			<pallet_fungible::Balance<Test>>::get((CollectionId(1), account(1))),
			5
		);

		// change owner scenario
		assert_ok!(Unique::transfer(
			origin1,
			account(2),
			CollectionId(1),
			TokenId(0),
			5
		));
		assert_eq!(
			<pallet_fungible::Balance<Test>>::get((CollectionId(1), account(1))),
			0
		);

		// split item scenario
		assert_ok!(Unique::transfer(
			origin2.clone(),
			account(3),
			CollectionId(1),
			TokenId(0),
			3
		));

		// split item and new owner has account scenario
		assert_ok!(Unique::transfer(
			origin2,
			account(3),
			CollectionId(1),
			TokenId(0),
			1
		));
		assert_eq!(
			<pallet_fungible::Balance<Test>>::get((CollectionId(1), account(2))),
			1
		);
		assert_eq!(
			<pallet_fungible::Balance<Test>>::get((CollectionId(1), account(3))),
			4
		);
	});
}

#[test]
fn transfer_refungible_item() {
	new_test_ext().execute_with(|| {
		let collection_id = create_test_collection(&CollectionMode::ReFungible, CollectionId(1));

		// Create RFT 1 in 1023 pieces for account 1
		let data = default_re_fungible_data();
		create_test_item(collection_id, &data.clone().into());
		let item = <pallet_refungible::TokenData<Test>>::get((collection_id, TokenId(1)));
		assert_eq!(item.const_data, data.const_data.into_inner());
		assert_eq!(
			<pallet_refungible::AccountBalance<Test>>::get((collection_id, account(1))),
			1
		);
		assert_eq!(
			<pallet_refungible::Balance<Test>>::get((collection_id, TokenId(1), account(1))),
			1023
		);
		assert_eq!(
			<pallet_refungible::Owned<Test>>::get((collection_id, account(1), TokenId(1))),
			true
		);

		// Account 1 transfers all 1023 pieces of RFT 1 to account 2
		let origin1 = Origin::signed(1);
		let origin2 = Origin::signed(2);
		assert_ok!(Unique::transfer(
			origin1,
			account(2),
			CollectionId(1),
			TokenId(1),
			1023
		));
		assert_eq!(
			<pallet_refungible::Balance<Test>>::get((collection_id, TokenId(1), account(2))),
			1023
		);
		assert_eq!(
			<pallet_refungible::AccountBalance<Test>>::get((collection_id, account(1))),
			0
		);
		assert_eq!(
			<pallet_refungible::AccountBalance<Test>>::get((collection_id, account(2))),
			1
		);
		assert_eq!(
			<pallet_refungible::Owned<Test>>::get((collection_id, account(1), TokenId(1))),
			false
		);
		assert_eq!(
			<pallet_refungible::Owned<Test>>::get((collection_id, account(2), TokenId(1))),
			true
		);

		// Account 2 transfers 500 pieces of RFT 1 to account 3
		assert_ok!(Unique::transfer(
			origin2.clone(),
			account(3),
			CollectionId(1),
			TokenId(1),
			500
		));
		assert_eq!(
			<pallet_refungible::Balance<Test>>::get((collection_id, TokenId(1), account(2))),
			523
		);
		assert_eq!(
			<pallet_refungible::Balance<Test>>::get((collection_id, TokenId(1), account(3))),
			500
		);
		assert_eq!(
			<pallet_refungible::AccountBalance<Test>>::get((collection_id, account(2))),
			1
		);
		assert_eq!(
			<pallet_refungible::AccountBalance<Test>>::get((collection_id, account(3))),
			1
		);
		assert_eq!(
			<pallet_refungible::Owned<Test>>::get((collection_id, account(2), TokenId(1))),
			true
		);
		assert_eq!(
			<pallet_refungible::Owned<Test>>::get((collection_id, account(3), TokenId(1))),
			true
		);

		// Account 2 transfers 200 more pieces of RFT 1 to account 3 with pre-existing balance
		assert_ok!(Unique::transfer(
			origin2,
			account(3),
			CollectionId(1),
			TokenId(1),
			200
		));
		assert_eq!(
			<pallet_refungible::Balance<Test>>::get((collection_id, TokenId(1), account(2))),
			323
		);
		assert_eq!(
			<pallet_refungible::Balance<Test>>::get((collection_id, TokenId(1), account(3))),
			700
		);
		assert_eq!(
			<pallet_refungible::AccountBalance<Test>>::get((collection_id, account(2))),
			1
		);
		assert_eq!(
			<pallet_refungible::AccountBalance<Test>>::get((collection_id, account(3))),
			1
		);
		assert_eq!(
			<pallet_refungible::Owned<Test>>::get((collection_id, account(2), TokenId(1))),
			true
		);
		assert_eq!(
			<pallet_refungible::Owned<Test>>::get((collection_id, account(3), TokenId(1))),
			true
		);
	});
}

#[test]
fn transfer_nft_item() {
	new_test_ext().execute_with(|| {
		let collection_id = create_test_collection(&CollectionMode::NFT, CollectionId(1));

		let data = default_nft_data();
		create_test_item(collection_id, &data.into());
		assert_eq!(
			<pallet_nonfungible::AccountBalance<Test>>::get((collection_id, account(1))),
			1
		);
		assert_eq!(
			<pallet_nonfungible::Owned<Test>>::get((collection_id, account(1), TokenId(1))),
			true
		);

		let origin1 = Origin::signed(1);
		// default scenario
		assert_ok!(Unique::transfer(
			origin1,
			account(2),
			CollectionId(1),
			TokenId(1),
			1
		));
		assert_eq!(
			<pallet_nonfungible::AccountBalance<Test>>::get((collection_id, account(1))),
			0
		);
		assert_eq!(
			<pallet_nonfungible::AccountBalance<Test>>::get((collection_id, account(2))),
			1
		);
		assert_eq!(
			<pallet_nonfungible::Owned<Test>>::get((collection_id, account(1), TokenId(1))),
			false
		);
		assert_eq!(
			<pallet_nonfungible::Owned<Test>>::get((collection_id, account(2), TokenId(1))),
			true
		);
	});
}

#[test]
fn transfer_nft_item_wrong_value() {
	new_test_ext().execute_with(|| {
		let collection_id = create_test_collection(&CollectionMode::NFT, CollectionId(1));

		let data = default_nft_data();
		create_test_item(collection_id, &data.into());
		assert_eq!(
			<pallet_nonfungible::AccountBalance<Test>>::get((collection_id, account(1))),
			1
		);
		assert_eq!(
			<pallet_nonfungible::Owned<Test>>::get((collection_id, account(1), TokenId(1))),
			true
		);

		let origin1 = Origin::signed(1);

		assert_noop!(
			Unique::transfer(origin1, account(2), CollectionId(1), TokenId(1), 2)
				.map_err(|e| e.error),
			<pallet_nonfungible::Error::<Test>>::NonfungibleItemsHaveNoAmount
		);
	});
}

#[test]
fn transfer_nft_item_zero_value() {
	new_test_ext().execute_with(|| {
		let collection_id = create_test_collection(&CollectionMode::NFT, CollectionId(1));

		let data = default_nft_data();
		create_test_item(collection_id, &data.into());
		assert_eq!(
			<pallet_nonfungible::AccountBalance<Test>>::get((collection_id, account(1))),
			1
		);
		assert_eq!(
			<pallet_nonfungible::Owned<Test>>::get((collection_id, account(1), TokenId(1))),
			true
		);

		let origin1 = Origin::signed(1);

		// Transferring 0 amount works on NFT...
		assert_ok!(Unique::transfer(
			origin1,
			account(2),
			CollectionId(1),
			TokenId(1),
			0
		));
		// ... and results in no transfer
		assert_eq!(
			<pallet_nonfungible::AccountBalance<Test>>::get((collection_id, account(1))),
			1
		);
		assert_eq!(
			<pallet_nonfungible::Owned<Test>>::get((collection_id, account(1), TokenId(1))),
			true
		);
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

		assert_eq!(
			<pallet_nonfungible::AccountBalance<Test>>::get((collection_id, account(1))),
			1
		);
		assert_eq!(
			<pallet_nonfungible::Owned<Test>>::get((collection_id, account(1), TokenId(1))),
			true
		);

		// neg transfer_from
		assert_noop!(
			Unique::transfer_from(
				origin2.clone(),
				account(1),
				account(2),
				CollectionId(1),
				TokenId(1),
				1
			)
			.map_err(|e| e.error),
			CommonError::<Test>::ApprovedValueTooLow
		);

		// do approve
		assert_ok!(Unique::approve(
			origin1,
			account(2),
			CollectionId(1),
			TokenId(1),
			1
		));
		assert_eq!(
			<pallet_nonfungible::Allowance<Test>>::get((CollectionId(1), TokenId(1))).unwrap(),
			account(2)
		);

		assert_ok!(Unique::transfer_from(
			origin2,
			account(1),
			account(3),
			CollectionId(1),
			TokenId(1),
			1
		));
		assert!(
			<pallet_nonfungible::Allowance<Test>>::get((CollectionId(1), TokenId(1))).is_none()
		);
	});
}

#[test]
fn nft_approve_and_transfer_from_allow_list() {
	new_test_ext().execute_with(|| {
		let collection_id = create_test_collection(&CollectionMode::NFT, CollectionId(1));

		let origin1 = Origin::signed(1);
		let origin2 = Origin::signed(2);

		// Create NFT 1 for account 1
		let data = default_nft_data();
		create_test_item(collection_id, &data.clone().into());
		assert_eq!(
			<pallet_nonfungible::AccountBalance<Test>>::get((collection_id, account(1))),
			1
		);
		assert_eq!(
			<pallet_nonfungible::Owned<Test>>::get((collection_id, account(1), TokenId(1))),
			true
		);

		// Allow allow-list users to mint and add accounts 1, 2, and 3 to allow-list
		assert_ok!(Unique::set_collection_permissions(
			origin1.clone(),
			CollectionId(1),
			CollectionPermissions {
				mint_mode: Some(true),
				access: Some(AccessMode::AllowList),
				nesting: None,
			}
		));
		assert_ok!(Unique::add_to_allow_list(
			origin1.clone(),
			CollectionId(1),
			account(1)
		));
		assert_ok!(Unique::add_to_allow_list(
			origin1.clone(),
			CollectionId(1),
			account(2)
		));
		assert_ok!(Unique::add_to_allow_list(
			origin1.clone(),
			CollectionId(1),
			account(3)
		));

		// Account 1 approves account 2 for NFT 1
		assert_ok!(Unique::approve(
			origin1.clone(),
			account(2),
			CollectionId(1),
			TokenId(1),
			1
		));
		assert_eq!(
			<pallet_nonfungible::Allowance<Test>>::get((CollectionId(1), TokenId(1))).unwrap(),
			account(2)
		);

		// Account 2 transfers NFT 1 from account 1 to account 3
		assert_ok!(Unique::transfer_from(
			origin2,
			account(1),
			account(3),
			CollectionId(1),
			TokenId(1),
			1
		));
		assert!(
			<pallet_nonfungible::Allowance<Test>>::get((CollectionId(1), TokenId(1))).is_none()
		);
	});
}

#[test]
fn refungible_approve_and_transfer_from() {
	new_test_ext().execute_with(|| {
		let collection_id = create_test_collection(&CollectionMode::ReFungible, CollectionId(1));

		let origin1 = Origin::signed(1);
		let origin2 = Origin::signed(2);

		// Create RFT 1 in 1023 pieces for account 1
		let data = default_re_fungible_data();
		create_test_item(collection_id, &data.into());

		assert_eq!(
			<pallet_refungible::AccountBalance<Test>>::get((collection_id, account(1))),
			1
		);
		assert_eq!(
			<pallet_refungible::Balance<Test>>::get((collection_id, TokenId(1), account(1))),
			1023
		);
		assert_eq!(
			<pallet_refungible::Owned<Test>>::get((collection_id, account(1), TokenId(1))),
			true
		);

		// Allow public minting, enable allow-list and add accounts 1, 2, 3 to allow-list
		assert_ok!(Unique::set_collection_permissions(
			origin1.clone(),
			CollectionId(1),
			CollectionPermissions {
				mint_mode: Some(true),
				access: Some(AccessMode::AllowList),
				nesting: None,
			}
		));
		assert_ok!(Unique::add_to_allow_list(
			origin1.clone(),
			CollectionId(1),
			account(1)
		));
		assert_ok!(Unique::add_to_allow_list(
			origin1.clone(),
			CollectionId(1),
			account(2)
		));
		assert_ok!(Unique::add_to_allow_list(
			origin1.clone(),
			CollectionId(1),
			account(3)
		));

		// Account 1 approves account 2 for 1023 pieces of RFT 1
		assert_ok!(Unique::approve(
			origin1,
			account(2),
			CollectionId(1),
			TokenId(1),
			1023
		));
		assert_eq!(
			<pallet_refungible::Allowance<Test>>::get((
				CollectionId(1),
				TokenId(1),
				account(1),
				account(2)
			)),
			1023
		);

		// Account 2 transfers 100 pieces of RFT 1 from account 1 to account 3
		assert_ok!(Unique::transfer_from(
			origin2,
			account(1),
			account(3),
			CollectionId(1),
			TokenId(1),
			100
		));
		assert_eq!(
			<pallet_refungible::AccountBalance<Test>>::get((collection_id, account(1))),
			1
		);
		assert_eq!(
			<pallet_refungible::AccountBalance<Test>>::get((collection_id, account(3))),
			1
		);
		assert_eq!(
			<pallet_refungible::Balance<Test>>::get((collection_id, TokenId(1), account(1))),
			923
		);
		assert_eq!(
			<pallet_refungible::Balance<Test>>::get((collection_id, TokenId(1), account(3))),
			100
		);
		assert_eq!(
			<pallet_refungible::Owned<Test>>::get((collection_id, account(1), TokenId(1))),
			true
		);
		assert_eq!(
			<pallet_refungible::Owned<Test>>::get((collection_id, account(1), TokenId(1))),
			true
		);
		assert_eq!(
			<pallet_refungible::Allowance<Test>>::get((
				CollectionId(1),
				TokenId(1),
				account(1),
				account(2)
			)),
			923
		);
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

		assert_ok!(Unique::set_collection_permissions(
			origin1.clone(),
			CollectionId(1),
			CollectionPermissions {
				mint_mode: Some(true),
				access: Some(AccessMode::AllowList),
				nesting: None,
			}
		));
		assert_ok!(Unique::add_to_allow_list(
			origin1.clone(),
			CollectionId(1),
			account(1)
		));
		assert_ok!(Unique::add_to_allow_list(
			origin1.clone(),
			CollectionId(1),
			account(2)
		));
		assert_ok!(Unique::add_to_allow_list(
			origin1.clone(),
			CollectionId(1),
			account(3)
		));

		// do approve
		assert_ok!(Unique::approve(
			origin1.clone(),
			account(2),
			CollectionId(1),
			TokenId(0),
			5
		));
		assert_eq!(
			<pallet_fungible::Allowance<Test>>::get((CollectionId(1), account(1), account(2))),
			5
		);
		assert_ok!(Unique::approve(
			origin1,
			account(3),
			CollectionId(1),
			TokenId(0),
			5
		));
		assert_eq!(
			<pallet_fungible::Allowance<Test>>::get((CollectionId(1), account(1), account(2))),
			5
		);
		assert_eq!(
			<pallet_fungible::Allowance<Test>>::get((CollectionId(1), account(1), account(3))),
			5
		);

		assert_ok!(Unique::transfer_from(
			origin2.clone(),
			account(1),
			account(3),
			CollectionId(1),
			TokenId(0),
			4
		));

		assert_eq!(
			<pallet_fungible::Allowance<Test>>::get((CollectionId(1), account(1), account(2))),
			1
		);

		assert_noop!(
			Unique::transfer_from(
				origin2,
				account(1),
				account(3),
				CollectionId(1),
				TokenId(0),
				4
			)
			.map_err(|e| e.error),
			CommonError::<Test>::ApprovedValueTooLow
		);
	});
}

#[test]
fn change_collection_owner() {
	new_test_ext().execute_with(|| {
		let collection_id = create_test_collection(&CollectionMode::NFT, CollectionId(1));

		let origin1 = Origin::signed(1);
		assert_ok!(Unique::change_collection_owner(origin1, collection_id, 2));
		assert_eq!(
			<pallet_common::CollectionById<Test>>::get(collection_id)
				.unwrap()
				.owner,
			2
		);
	});
}

#[test]
fn destroy_collection() {
	new_test_ext().execute_with(|| {
		let collection_id = create_test_collection(&CollectionMode::NFT, CollectionId(1));

		let origin1 = Origin::signed(1);
		assert_ok!(Unique::destroy_collection(origin1, collection_id));
	});
}

#[test]
fn burn_nft_item() {
	new_test_ext().execute_with(|| {
		let collection_id = create_test_collection(&CollectionMode::NFT, CollectionId(1));

		let origin1 = Origin::signed(1);

		let data = default_nft_data();
		create_test_item(collection_id, &data.into());

		// check balance (collection with id = 1, user id = 1)
		assert_eq!(
			<pallet_nonfungible::AccountBalance<Test>>::get((collection_id, account(1))),
			1
		);

		// burn item
		assert_ok!(Unique::burn_item(
			origin1.clone(),
			collection_id,
			TokenId(1),
			1
		));
		assert_eq!(
			<pallet_nonfungible::AccountBalance<Test>>::get((collection_id, account(1))),
			0
		);
	});
}

#[test]
fn burn_same_nft_item_twice() {
	new_test_ext().execute_with(|| {
		let collection_id = create_test_collection(&CollectionMode::NFT, CollectionId(1));

		let origin1 = Origin::signed(1);

		let data = default_nft_data();
		create_test_item(collection_id, &data.into());

		// check balance (collection with id = 1, user id = 1)
		assert_eq!(
			<pallet_nonfungible::AccountBalance<Test>>::get((collection_id, account(1))),
			1
		);

		// burn item
		assert_ok!(Unique::burn_item(
			origin1.clone(),
			collection_id,
			TokenId(1),
			1
		));

		// burn item again
		assert_noop!(
			Unique::burn_item(origin1, collection_id, TokenId(1), 1).map_err(|e| e.error),
			CommonError::<Test>::TokenNotFound
		);

		assert_eq!(
			<pallet_nonfungible::AccountBalance<Test>>::get((collection_id, account(1))),
			0
		);
	});
}

#[test]
fn burn_fungible_item() {
	new_test_ext().execute_with(|| {
		let collection_id = create_test_collection(&CollectionMode::Fungible(3), CollectionId(1));

		let origin1 = Origin::signed(1);
		assert_ok!(Unique::add_collection_admin(
			origin1.clone(),
			collection_id,
			account(2)
		));

		let data = default_fungible_data();
		create_test_item(collection_id, &data.into());

		// check balance (collection with id = 1, user id = 1)
		assert_eq!(
			<pallet_fungible::Balance<Test>>::get((collection_id, account(1))),
			5
		);

		// burn item
		assert_ok!(Unique::burn_item(
			origin1.clone(),
			CollectionId(1),
			TokenId(0),
			5
		));
		assert_noop!(
			Unique::burn_item(origin1, CollectionId(1), TokenId(0), 5).map_err(|e| e.error),
			CommonError::<Test>::TokenValueTooLow
		);

		assert_eq!(
			<pallet_fungible::Balance<Test>>::get((collection_id, account(1))),
			0
		);
	});
}

#[test]
fn burn_fungible_item_with_token_id() {
	new_test_ext().execute_with(|| {
		let collection_id = create_test_collection(&CollectionMode::Fungible(3), CollectionId(1));

		let origin1 = Origin::signed(1);
		assert_ok!(Unique::add_collection_admin(
			origin1.clone(),
			collection_id,
			account(2)
		));

		let data = default_fungible_data();
		create_test_item(collection_id, &data.into());

		// check balance (collection with id = 1, user id = 1)
		assert_eq!(
			<pallet_fungible::Balance<Test>>::get((collection_id, account(1))),
			5
		);

		// Try to burn item using Token ID
		assert_noop!(
			Unique::burn_item(origin1, CollectionId(1), TokenId(1), 5).map_err(|e| e.error),
			<pallet_fungible::Error::<Test>>::FungibleItemsHaveNoId
		);
	});
}
#[test]
fn burn_refungible_item() {
	new_test_ext().execute_with(|| {
		let collection_id = create_test_collection(&CollectionMode::ReFungible, CollectionId(1));
		let origin1 = Origin::signed(1);

		assert_ok!(Unique::set_collection_permissions(
			origin1.clone(),
			collection_id,
			CollectionPermissions {
				mint_mode: Some(true),
				access: Some(AccessMode::AllowList),
				nesting: None,
			}
		));
		assert_ok!(Unique::add_to_allow_list(
			origin1.clone(),
			collection_id,
			account(1)
		));

		assert_ok!(Unique::add_collection_admin(
			origin1.clone(),
			collection_id,
			account(2)
		));

		let data = default_re_fungible_data();
		create_test_item(collection_id, &data.into());

		// check balance (collection with id = 1, user id = 2)
		assert_eq!(
			<pallet_refungible::AccountBalance<Test>>::get((collection_id, account(1))),
			1
		);
		assert_eq!(
			<pallet_refungible::Balance<Test>>::get((collection_id, TokenId(1), account(1))),
			1023
		);

		// burn item
		assert_ok!(Unique::burn_item(
			origin1.clone(),
			collection_id,
			TokenId(1),
			1023
		));
		assert_noop!(
			Unique::burn_item(origin1, collection_id, TokenId(1), 1023).map_err(|e| e.error),
			CommonError::<Test>::TokenValueTooLow
		);

		assert_eq!(
			<pallet_refungible::Balance<Test>>::get((collection_id, TokenId(1), account(1))),
			0
		);
	});
}

#[test]
fn add_collection_admin() {
	new_test_ext().execute_with(|| {
		let collection1_id =
			create_test_collection_for_owner(&CollectionMode::NFT, 1, CollectionId(1));
		let origin1 = Origin::signed(1);

		// Add collection admins
		assert_ok!(Unique::add_collection_admin(
			origin1.clone(),
			collection1_id,
			account(2)
		));
		assert_ok!(Unique::add_collection_admin(
			origin1,
			collection1_id,
			account(3)
		));

		// Owner is not an admin by default
		assert_eq!(
			<pallet_common::IsAdmin<Test>>::get((CollectionId(1), account(1))),
			false
		);
		assert!(<pallet_common::IsAdmin<Test>>::get((
			CollectionId(1),
			account(2)
		)));
		assert!(<pallet_common::IsAdmin<Test>>::get((
			CollectionId(1),
			account(3)
		)));
	});
}

#[test]
fn remove_collection_admin() {
	new_test_ext().execute_with(|| {
		let collection1_id =
			create_test_collection_for_owner(&CollectionMode::NFT, 1, CollectionId(1));
		let origin1 = Origin::signed(1);

		// Add collection admins 2 and 3
		assert_ok!(Unique::add_collection_admin(
			origin1.clone(),
			collection1_id,
			account(2)
		));
		assert_ok!(Unique::add_collection_admin(
			origin1.clone(),
			collection1_id,
			account(3)
		));

		assert!(<pallet_common::IsAdmin<Test>>::get((
			CollectionId(1),
			account(2)
		)));
		assert!(<pallet_common::IsAdmin<Test>>::get((
			CollectionId(1),
			account(3)
		)));

		// remove admin 3
		assert_ok!(Unique::remove_collection_admin(
			origin1,
			CollectionId(1),
			account(3)
		));

		// 2 is still admin, 3 is not an admin anymore
		assert!(<pallet_common::IsAdmin<Test>>::get((
			CollectionId(1),
			account(2)
		)));
		assert_eq!(
			<pallet_common::IsAdmin<Test>>::get((CollectionId(1), account(3))),
			false
		);
	});
}

#[test]
fn balance_of() {
	new_test_ext().execute_with(|| {
		let nft_collection_id = create_test_collection(&CollectionMode::NFT, CollectionId(1));
		let fungible_collection_id =
			create_test_collection(&CollectionMode::Fungible(3), CollectionId(2));
		let re_fungible_collection_id =
			create_test_collection(&CollectionMode::ReFungible, CollectionId(3));

		// check balance before
		assert_eq!(
			<pallet_nonfungible::AccountBalance<Test>>::get((nft_collection_id, account(1))),
			0
		);
		assert_eq!(
			<pallet_fungible::Balance<Test>>::get((fungible_collection_id, account(1))),
			0
		);
		assert_eq!(
			<pallet_refungible::AccountBalance<Test>>::get((re_fungible_collection_id, account(1))),
			0
		);

		let nft_data = default_nft_data();
		create_test_item(nft_collection_id, &nft_data.into());

		let fungible_data = default_fungible_data();
		create_test_item(fungible_collection_id, &fungible_data.into());

		let re_fungible_data = default_re_fungible_data();
		create_test_item(re_fungible_collection_id, &re_fungible_data.into());

		// check balance (collection with id = 1, user id = 1)
		assert_eq!(
			<pallet_nonfungible::AccountBalance<Test>>::get((nft_collection_id, account(1))),
			1
		);
		assert_eq!(
			<pallet_fungible::Balance<Test>>::get((fungible_collection_id, account(1))),
			5
		);
		assert_eq!(
			<pallet_refungible::AccountBalance<Test>>::get((re_fungible_collection_id, account(1))),
			1
		);

		assert_eq!(
			<pallet_nonfungible::Owned<Test>>::get((nft_collection_id, account(1), TokenId(1))),
			true
		);
		assert_eq!(
			<pallet_refungible::Owned<Test>>::get((
				re_fungible_collection_id,
				account(1),
				TokenId(1)
			)),
			true
		);
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
		assert_ok!(Unique::approve(
			origin1,
			account(2),
			CollectionId(1),
			TokenId(1),
			1
		));
		assert_eq!(
			<pallet_nonfungible::Allowance<Test>>::get((CollectionId(1), TokenId(1))).unwrap(),
			account(2)
		);
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
		assert_ok!(Unique::approve(
			origin1.clone(),
			account(2),
			CollectionId(1),
			TokenId(1),
			1
		));
		assert_eq!(
			<pallet_nonfungible::Allowance<Test>>::get((CollectionId(1), TokenId(1))).unwrap(),
			account(2)
		);

		assert_ok!(Unique::set_collection_permissions(
			origin1.clone(),
			CollectionId(1),
			CollectionPermissions {
				mint_mode: Some(true),
				access: Some(AccessMode::AllowList),
				nesting: None,
			}
		));
		assert_ok!(Unique::add_to_allow_list(
			origin1.clone(),
			CollectionId(1),
			account(1)
		));
		assert_ok!(Unique::add_to_allow_list(
			origin1.clone(),
			CollectionId(1),
			account(2)
		));
		assert_ok!(Unique::add_to_allow_list(
			origin1,
			CollectionId(1),
			account(3)
		));

		assert_ok!(Unique::transfer_from(
			origin2,
			account(1),
			account(2),
			CollectionId(1),
			TokenId(1),
			1
		));

		// after transfer
		assert_eq!(
			<pallet_nonfungible::AccountBalance<Test>>::get((CollectionId(1), account(1))),
			0
		);
		assert_eq!(
			<pallet_nonfungible::AccountBalance<Test>>::get((CollectionId(1), account(2))),
			1
		);
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
		assert_ok!(Unique::add_to_allow_list(
			origin1,
			collection_id,
			account(2)
		));
		assert!(<pallet_common::Allowlist<Test>>::get((
			collection_id,
			account(2)
		)));
	});
}

#[test]
fn admin_can_add_address_to_allow_list() {
	new_test_ext().execute_with(|| {
		let collection_id = create_test_collection(&CollectionMode::NFT, CollectionId(1));
		let origin1 = Origin::signed(1);
		let origin2 = Origin::signed(2);

		assert_ok!(Unique::add_collection_admin(
			origin1,
			collection_id,
			account(2)
		));
		assert_ok!(Unique::add_to_allow_list(
			origin2,
			collection_id,
			account(3)
		));
		assert!(<pallet_common::Allowlist<Test>>::get((
			collection_id,
			account(3)
		)));
	});
}

#[test]
fn nonprivileged_user_cannot_add_address_to_allow_list() {
	new_test_ext().execute_with(|| {
		let collection_id = create_test_collection(&CollectionMode::NFT, CollectionId(1));

		let origin2 = Origin::signed(2);
		assert_noop!(
			Unique::add_to_allow_list(origin2, collection_id, account(3)),
			CommonError::<Test>::NoPermission
		);
	});
}

#[test]
fn nobody_can_add_address_to_allow_list_of_nonexisting_collection() {
	new_test_ext().execute_with(|| {
		let origin1 = Origin::signed(1);

		assert_noop!(
			Unique::add_to_allow_list(origin1, CollectionId(1), account(2)),
			CommonError::<Test>::CollectionNotFound
		);
	});
}

#[test]
fn nobody_can_add_address_to_allow_list_of_deleted_collection() {
	new_test_ext().execute_with(|| {
		let collection_id = create_test_collection(&CollectionMode::NFT, CollectionId(1));

		let origin1 = Origin::signed(1);
		assert_ok!(Unique::destroy_collection(origin1.clone(), collection_id));
		assert_noop!(
			Unique::add_to_allow_list(origin1, collection_id, account(2)),
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

		assert_ok!(Unique::add_to_allow_list(
			origin1.clone(),
			collection_id,
			account(2)
		));
		assert_ok!(Unique::add_to_allow_list(
			origin1,
			collection_id,
			account(2)
		));
		assert!(<pallet_common::Allowlist<Test>>::get((
			collection_id,
			account(2)
		)));
	});
}

#[test]
fn owner_can_remove_address_from_allow_list() {
	new_test_ext().execute_with(|| {
		let collection_id = create_test_collection(&CollectionMode::NFT, CollectionId(1));

		let origin1 = Origin::signed(1);
		assert_ok!(Unique::add_to_allow_list(
			origin1.clone(),
			collection_id,
			account(2)
		));
		assert_ok!(Unique::remove_from_allow_list(
			origin1,
			collection_id,
			account(2)
		));
		assert_eq!(
			<pallet_common::Allowlist<Test>>::get((collection_id, account(2))),
			false
		);
	});
}

#[test]
fn admin_can_remove_address_from_allow_list() {
	new_test_ext().execute_with(|| {
		let collection_id = create_test_collection(&CollectionMode::NFT, CollectionId(1));
		let origin1 = Origin::signed(1);
		let origin2 = Origin::signed(2);

		// Owner adds admin
		assert_ok!(Unique::add_collection_admin(
			origin1.clone(),
			collection_id,
			account(2)
		));

		// Owner adds address 3 to allow list
		assert_ok!(Unique::add_to_allow_list(
			origin1,
			collection_id,
			account(3)
		));

		// Admin removes address 3 from allow list
		assert_ok!(Unique::remove_from_allow_list(
			origin2,
			collection_id,
			account(3)
		));
		assert_eq!(
			<pallet_common::Allowlist<Test>>::get((collection_id, account(3))),
			false
		);
	});
}

#[test]
fn nonprivileged_user_cannot_remove_address_from_allow_list() {
	new_test_ext().execute_with(|| {
		let collection_id = create_test_collection(&CollectionMode::NFT, CollectionId(1));
		let origin1 = Origin::signed(1);
		let origin2 = Origin::signed(2);

		assert_ok!(Unique::add_to_allow_list(
			origin1,
			collection_id,
			account(2)
		));
		assert_noop!(
			Unique::remove_from_allow_list(origin2, collection_id, account(2)),
			CommonError::<Test>::NoPermission
		);
		assert!(<pallet_common::Allowlist<Test>>::get((
			collection_id,
			account(2)
		)));
	});
}

#[test]
fn nobody_can_remove_address_from_allow_list_of_nonexisting_collection() {
	new_test_ext().execute_with(|| {
		let origin1 = Origin::signed(1);

		assert_noop!(
			Unique::remove_from_allow_list(origin1, CollectionId(1), account(2)),
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

		// Add account 2 to allow list
		assert_ok!(Unique::add_to_allow_list(
			origin1.clone(),
			collection_id,
			account(2)
		));

		// Account 2 is in collection allow-list
		assert!(<pallet_common::Allowlist<Test>>::get((
			collection_id,
			account(2)
		)));

		// Destroy collection
		assert_ok!(Unique::destroy_collection(origin1, collection_id));

		// Attempt to remove account 2 from collection allow-list => error
		assert_noop!(
			Unique::remove_from_allow_list(origin2, collection_id, account(2)),
			CommonError::<Test>::CollectionNotFound
		);

		// Account 2 is not found in collection allow-list anyway
		assert_eq!(
			<pallet_common::Allowlist<Test>>::get((collection_id, account(2))),
			false
		);
	});
}

// If address is already removed from allow list, nothing happens
#[test]
fn address_is_already_removed_from_allow_list() {
	new_test_ext().execute_with(|| {
		let collection_id = create_test_collection(&CollectionMode::NFT, CollectionId(1));
		let origin1 = Origin::signed(1);

		assert_ok!(Unique::add_to_allow_list(
			origin1.clone(),
			collection_id,
			account(2)
		));
		assert_ok!(Unique::remove_from_allow_list(
			origin1.clone(),
			collection_id,
			account(2)
		));
		assert_eq!(
			<pallet_common::Allowlist<Test>>::get((collection_id, account(2))),
			false
		);
		assert_ok!(Unique::remove_from_allow_list(
			origin1,
			collection_id,
			account(2)
		));
		assert_eq!(
			<pallet_common::Allowlist<Test>>::get((collection_id, account(2))),
			false
		);
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

		assert_ok!(Unique::set_collection_permissions(
			origin1.clone(),
			collection_id,
			CollectionPermissions {
				mint_mode: None,
				access: Some(AccessMode::AllowList),
				nesting: None,
			}
		));
		assert_ok!(Unique::add_to_allow_list(
			origin1.clone(),
			collection_id,
			account(2)
		));

		assert_noop!(
			Unique::transfer(origin1, account(3), CollectionId(1), TokenId(1), 1)
				.map_err(|e| e.error),
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

		assert_ok!(Unique::set_collection_permissions(
			origin1.clone(),
			collection_id,
			CollectionPermissions {
				mint_mode: None,
				access: Some(AccessMode::AllowList),
				nesting: None,
			}
		));
		assert_ok!(Unique::add_to_allow_list(
			origin1.clone(),
			collection_id,
			account(1)
		));
		assert_ok!(Unique::add_to_allow_list(
			origin1.clone(),
			collection_id,
			account(2)
		));

		// do approve
		assert_ok!(Unique::approve(
			origin1.clone(),
			account(1),
			collection_id,
			TokenId(1),
			1
		));
		assert_eq!(
			<pallet_nonfungible::Allowance<Test>>::get((CollectionId(1), TokenId(1))).unwrap(),
			account(1)
		);

		assert_ok!(Unique::remove_from_allow_list(
			origin1.clone(),
			collection_id,
			account(1)
		));

		assert_noop!(
			Unique::transfer_from(
				origin1,
				account(1),
				account(3),
				CollectionId(1),
				TokenId(1),
				1
			)
			.map_err(|e| e.error),
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

		assert_ok!(Unique::set_collection_permissions(
			origin1.clone(),
			collection_id,
			CollectionPermissions {
				mint_mode: None,
				access: Some(AccessMode::AllowList),
				nesting: None,
			}
		));
		assert_ok!(Unique::add_to_allow_list(
			origin1.clone(),
			collection_id,
			account(1)
		));

		assert_noop!(
			Unique::transfer(origin1, account(3), collection_id, TokenId(1), 1)
				.map_err(|e| e.error),
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

		assert_ok!(Unique::set_collection_permissions(
			origin1.clone(),
			collection_id,
			CollectionPermissions {
				mint_mode: None,
				access: Some(AccessMode::AllowList),
				nesting: None,
			}
		));
		assert_ok!(Unique::add_to_allow_list(
			origin1.clone(),
			collection_id,
			account(1)
		));
		assert_ok!(Unique::add_to_allow_list(
			origin1.clone(),
			collection_id,
			account(2)
		));

		// do approve
		assert_ok!(Unique::approve(
			origin1.clone(),
			account(1),
			collection_id,
			TokenId(1),
			1
		));
		assert_eq!(
			<pallet_nonfungible::Allowance<Test>>::get((CollectionId(1), TokenId(1))).unwrap(),
			account(1)
		);

		assert_ok!(Unique::remove_from_allow_list(
			origin1.clone(),
			collection_id,
			account(2)
		));

		assert_noop!(
			Unique::transfer_from(
				origin1,
				account(1),
				account(3),
				collection_id,
				TokenId(1),
				1
			)
			.map_err(|e| e.error),
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

		assert_ok!(Unique::set_collection_permissions(
			origin1.clone(),
			collection_id,
			CollectionPermissions {
				mint_mode: None,
				access: Some(AccessMode::AllowList),
				nesting: None,
			}
		));
		assert_noop!(
			Unique::burn_item(origin1.clone(), CollectionId(1), TokenId(1), 1).map_err(|e| e.error),
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

		assert_ok!(Unique::set_collection_permissions(
			origin1.clone(),
			collection_id,
			CollectionPermissions {
				mint_mode: None,
				access: Some(AccessMode::AllowList),
				nesting: None,
			}
		));

		// do approve
		assert_noop!(
			Unique::approve(origin1, account(1), CollectionId(1), TokenId(1), 1)
				.map_err(|e| e.error),
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

		assert_ok!(Unique::set_collection_permissions(
			origin1.clone(),
			collection_id,
			CollectionPermissions {
				mint_mode: None,
				access: Some(AccessMode::AllowList),
				nesting: None,
			}
		));
		assert_ok!(Unique::add_to_allow_list(
			origin1.clone(),
			collection_id,
			account(1)
		));
		assert_ok!(Unique::add_to_allow_list(
			origin1.clone(),
			collection_id,
			account(2)
		));

		assert_ok!(Unique::transfer(
			origin1,
			account(2),
			CollectionId(1),
			TokenId(1),
			1
		));
	});
}

#[test]
fn allow_list_test_8() {
	new_test_ext().execute_with(|| {
		let collection_id = create_test_collection(&CollectionMode::NFT, CollectionId(1));

		// Create NFT for account 1
		let data = default_nft_data();
		create_test_item(collection_id, &data.into());

		let origin1 = Origin::signed(1);

		// Toggle Allow List mode and add accounts 1 and 2
		assert_ok!(Unique::set_collection_permissions(
			origin1.clone(),
			collection_id,
			CollectionPermissions {
				mint_mode: None,
				access: Some(AccessMode::AllowList),
				nesting: None,
			}
		));
		assert_ok!(Unique::add_to_allow_list(
			origin1.clone(),
			collection_id,
			account(1)
		));
		assert_ok!(Unique::add_to_allow_list(
			origin1.clone(),
			collection_id,
			account(2)
		));

		// Sself-approve account 1 for NFT 1
		assert_ok!(Unique::approve(
			origin1.clone(),
			account(1),
			CollectionId(1),
			TokenId(1),
			1
		));
		assert_eq!(
			<pallet_nonfungible::Allowance<Test>>::get((CollectionId(1), TokenId(1))).unwrap(),
			account(1)
		);

		// Transfer from 1 to 2
		assert_ok!(Unique::transfer_from(
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

		assert_ok!(Unique::set_collection_permissions(
			origin1.clone(),
			collection_id,
			CollectionPermissions {
				mint_mode: Some(false),
				access: Some(AccessMode::AllowList),
				nesting: None,
			}
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

		assert_ok!(Unique::set_collection_permissions(
			origin1.clone(),
			collection_id,
			CollectionPermissions {
				mint_mode: Some(false),
				access: Some(AccessMode::AllowList),
				nesting: None,
			}
		));

		assert_ok!(Unique::add_collection_admin(
			origin1,
			collection_id,
			account(2)
		));

		assert_ok!(Unique::create_item(
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

		assert_ok!(Unique::set_collection_permissions(
			origin1.clone(),
			collection_id,
			CollectionPermissions {
				mint_mode: Some(false),
				access: Some(AccessMode::AllowList),
				nesting: None,
			}
		));
		assert_ok!(Unique::add_to_allow_list(
			origin1,
			collection_id,
			account(2)
		));

		assert_noop!(
			Unique::create_item(
				origin2,
				CollectionId(1),
				account(2),
				default_nft_data().into()
			)
			.map_err(|e| e.error),
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

		assert_ok!(Unique::set_collection_permissions(
			origin1.clone(),
			collection_id,
			CollectionPermissions {
				mint_mode: Some(false),
				access: Some(AccessMode::AllowList),
				nesting: None,
			}
		));

		assert_noop!(
			Unique::create_item(
				origin2,
				CollectionId(1),
				account(2),
				default_nft_data().into()
			)
			.map_err(|e| e.error),
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

		assert_ok!(Unique::set_collection_permissions(
			origin1.clone(),
			collection_id,
			CollectionPermissions {
				mint_mode: Some(true),
				access: Some(AccessMode::AllowList),
				nesting: None,
			}
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

		assert_ok!(Unique::set_collection_permissions(
			origin1.clone(),
			collection_id,
			CollectionPermissions {
				mint_mode: Some(true),
				access: Some(AccessMode::AllowList),
				nesting: None,
			}
		));

		assert_ok!(Unique::add_collection_admin(
			origin1,
			collection_id,
			account(2)
		));

		assert_ok!(Unique::create_item(
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

		assert_ok!(Unique::set_collection_permissions(
			origin1.clone(),
			collection_id,
			CollectionPermissions {
				mint_mode: Some(true),
				access: Some(AccessMode::AllowList),
				nesting: None,
			}
		));

		assert_noop!(
			Unique::create_item(
				origin2,
				collection_id,
				account(2),
				default_nft_data().into()
			)
			.map_err(|e| e.error),
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

		assert_ok!(Unique::set_collection_permissions(
			origin1.clone(),
			collection_id,
			CollectionPermissions {
				mint_mode: Some(true),
				access: Some(AccessMode::AllowList),
				nesting: None,
			}
		));
		assert_ok!(Unique::add_to_allow_list(
			origin1,
			collection_id,
			account(2)
		));

		assert_ok!(Unique::create_item(
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

#[test]
fn create_max_collections() {
	new_test_ext().execute_with(|| {
		for i in 1..COLLECTION_NUMBER_LIMIT {
			create_test_collection(&CollectionMode::NFT, CollectionId(i));
		}
	});
}

// Total number of collections. Negative test
#[test]
fn total_number_collections_bound_neg() {
	new_test_ext().execute_with(|| {
		let origin1 = Origin::signed(1);

		for i in 1..=COLLECTION_NUMBER_LIMIT {
			create_test_collection(&CollectionMode::NFT, CollectionId(i));
		}

		let col_name1: Vec<u16> = "Test1\0".encode_utf16().collect::<Vec<u16>>();
		let col_desc1: Vec<u16> = "TestDescription1\0".encode_utf16().collect::<Vec<u16>>();
		let token_prefix1: Vec<u8> = b"token_prefix1\0".to_vec();

		let data: CreateCollectionData<u64> = CreateCollectionData {
			name: col_name1.try_into().unwrap(),
			description: col_desc1.try_into().unwrap(),
			token_prefix: token_prefix1.try_into().unwrap(),
			mode: CollectionMode::NFT,
			..Default::default()
		};

		// 11-th collection in chain. Expects error
		assert_noop!(
			Unique::create_collection_ex(origin1, data),
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

		for _ in 1..=MAX_TOKEN_OWNERSHIP {
			let data = default_nft_data();
			create_test_item(collection_id, &data.clone().into());
		}

		let data = default_nft_data();
		assert_noop!(
			Unique::create_item(origin1, CollectionId(1), account(1), data.into())
				.map_err(|e| e.error),
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

		assert_ok!(Unique::add_collection_admin(
			origin1.clone(),
			collection_id,
			account(2)
		));
		assert_ok!(Unique::add_collection_admin(
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
			assert_ok!(Unique::add_collection_admin(
				origin1.clone(),
				collection_id,
				account((2 + i).into())
			));
		}
		assert_noop!(
			Unique::add_collection_admin(
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
fn collection_transfer_flag_works() {
	new_test_ext().execute_with(|| {
		let origin1 = Origin::signed(1);

		let collection_id = create_test_collection(&CollectionMode::NFT, CollectionId(1));
		assert_ok!(Unique::set_transfers_enabled_flag(
			origin1,
			collection_id,
			true
		));

		let data = default_nft_data();
		create_test_item(collection_id, &data.into());
		assert_eq!(
			<pallet_nonfungible::AccountBalance<Test>>::get((collection_id, account(1))),
			1
		);
		assert_eq!(
			<pallet_nonfungible::Owned<Test>>::get((collection_id, account(1), TokenId(1))),
			true
		);

		let origin1 = Origin::signed(1);

		// default scenario
		assert_ok!(Unique::transfer(
			origin1,
			account(2),
			collection_id,
			TokenId(1),
			1
		));
		assert_eq!(
			<pallet_nonfungible::Owned<Test>>::get((collection_id, account(1), TokenId(1))),
			false
		);
		assert_eq!(
			<pallet_nonfungible::Owned<Test>>::get((collection_id, account(2), TokenId(1))),
			true
		);
		assert_eq!(
			<pallet_nonfungible::AccountBalance<Test>>::get((collection_id, account(1))),
			0
		);
		assert_eq!(
			<pallet_nonfungible::AccountBalance<Test>>::get((collection_id, account(2))),
			1
		);
	});
}

#[test]
fn collection_transfer_flag_works_neg() {
	new_test_ext().execute_with(|| {
		let origin1 = Origin::signed(1);

		let collection_id = create_test_collection(&CollectionMode::NFT, CollectionId(1));
		assert_ok!(Unique::set_transfers_enabled_flag(
			origin1,
			collection_id,
			false
		));

		let data = default_nft_data();
		create_test_item(collection_id, &data.into());
		assert_eq!(
			<pallet_nonfungible::AccountBalance<Test>>::get((collection_id, account(1))),
			1
		);
		assert_eq!(
			<pallet_nonfungible::Owned<Test>>::get((collection_id, account(1), TokenId(1))),
			true
		);

		let origin1 = Origin::signed(1);

		// default scenario
		assert_noop!(
			Unique::transfer(origin1, account(2), CollectionId(1), TokenId(1), 1)
				.map_err(|e| e.error),
			CommonError::<Test>::TransferNotAllowed
		);
		assert_eq!(
			<pallet_nonfungible::AccountBalance<Test>>::get((collection_id, account(1))),
			1
		);
		assert_eq!(
			<pallet_nonfungible::AccountBalance<Test>>::get((collection_id, account(2))),
			0
		);
		assert_eq!(
			<pallet_nonfungible::Owned<Test>>::get((collection_id, account(1), TokenId(1))),
			true
		);
		assert_eq!(
			<pallet_nonfungible::Owned<Test>>::get((collection_id, account(2), TokenId(1))),
			false
		);
	});
}

#[test]
fn collection_sponsoring() {
	new_test_ext().execute_with(|| {
		// default_limits();
		let user1 = 1_u64;
		let user2 = 777_u64;
		let origin1 = Origin::signed(user1);
		let origin2 = Origin::signed(user2);
		let account2 = account(user2);

		let collection_id =
			create_test_collection_for_owner(&CollectionMode::NFT, user1, CollectionId(1));
		assert_ok!(Unique::set_collection_sponsor(
			origin1.clone(),
			collection_id,
			user1
		));
		assert_ok!(Unique::confirm_sponsorship(origin1.clone(), collection_id));

		// Expect error while have no permissions
		assert!(Unique::create_item(
			origin2.clone(),
			collection_id,
			account2.clone(),
			default_nft_data().into()
		)
		.is_err());

		assert_ok!(Unique::set_collection_permissions(
			origin1.clone(),
			collection_id,
			CollectionPermissions {
				mint_mode: Some(true),
				access: Some(AccessMode::AllowList),
				nesting: None,
			}
		));
		assert_ok!(Unique::add_to_allow_list(
			origin1.clone(),
			collection_id,
			account2.clone()
		));

		assert_ok!(Unique::create_item(
			origin2,
			collection_id,
			account2,
			default_nft_data().into()
		));
	});
}
