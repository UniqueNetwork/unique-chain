// Tests to be written here
use super::*;
use crate::mock::*;
use crate::{AccessMode, ApprovePermissions, CollectionMode,
    Ownership, ChainLimits, CreateItemData, CreateNftData, CreateFungibleData, CreateReFungibleData,
    CollectionId, TokenId, MAX_DECIMAL_POINTS};
use frame_support::{assert_noop, assert_ok};
use frame_system::{ RawOrigin };

fn default_collection_numbers_limit() -> u32 {
    10
}

fn default_limits() {
    assert_ok!(TemplateModule::set_chain_limits(RawOrigin::Root.into(), ChainLimits { 
            collection_numbers_limit: default_collection_numbers_limit(),
            account_token_ownership_limit: 10,
            collections_admins_limit: 5,
            custom_data_limit: 2048,
            nft_sponsor_transfer_timeout: 15,
            fungible_sponsor_transfer_timeout: 15,
            refungible_sponsor_transfer_timeout: 15,          
        }));
}

fn default_nft_data() -> CreateNftData {
    CreateNftData { const_data: vec![1, 2, 3], variable_data: vec![3, 2, 1] }
}

fn default_fungible_data () -> CreateFungibleData {
    CreateFungibleData { }
}

fn default_re_fungible_data () -> CreateReFungibleData {
    CreateReFungibleData { const_data: vec![1, 2, 3], variable_data: vec![3, 2, 1] }
}

fn create_test_collection_for_owner(mode: &CollectionMode, owner: u64, id: CollectionId) -> CollectionId {
    let col_name1: Vec<u16> = "Test1\0".encode_utf16().collect::<Vec<u16>>();
    let col_desc1: Vec<u16> = "TestDescription1\0".encode_utf16().collect::<Vec<u16>>();
    let token_prefix1: Vec<u8> = b"token_prefix1\0".to_vec();

    let origin1 = Origin::signed(owner);
    assert_ok!(TemplateModule::create_collection(
            origin1.clone(),
            col_name1.clone(),
            col_desc1.clone(),
            token_prefix1.clone(),
            mode.clone()
        ));

    let saved_col_name: Vec<u16> = "Test1\0".encode_utf16().collect::<Vec<u16>>();
    let saved_description: Vec<u16> = "TestDescription1\0".encode_utf16().collect::<Vec<u16>>();
    let saved_prefix: Vec<u8> = b"token_prefix1\0".to_vec();
    assert_eq!(TemplateModule::collection(id).owner, owner);
    assert_eq!(TemplateModule::collection(id).name, saved_col_name);
    assert_eq!(TemplateModule::collection(id).mode, *mode);
    assert_eq!(TemplateModule::collection(id).description, saved_description);
    assert_eq!(TemplateModule::collection(id).token_prefix, saved_prefix);
    id
}

fn create_test_collection(mode: &CollectionMode, id: CollectionId) -> CollectionId {
    create_test_collection_for_owner(&mode, 1, id)
}

fn create_test_item(collection_id: CollectionId, data: &CreateItemData) {
    let origin1 = Origin::signed(1);
    assert_ok!(TemplateModule::create_item(
            origin1.clone(),
            collection_id,
            1,
            data.clone()
        ));

}

// Use cases tests region
// #region

#[test]
fn set_version_schema() {
    new_test_ext().execute_with(|| {
        default_limits();
        let origin1 = Origin::signed(1);
        let collection_id = create_test_collection(&CollectionMode::NFT, 1);
        
        assert_ok!(TemplateModule::set_schema_version(origin1, collection_id, SchemaVersion::Unique));
        assert_eq!(TemplateModule::collection(collection_id).schema_version, SchemaVersion::Unique);
    });
}

#[test]
fn create_fungible_collection_fails_with_large_decimal_numbers() {
    new_test_ext().execute_with(|| {
        default_limits();

        let col_name1: Vec<u16> = "Test1\0".encode_utf16().collect::<Vec<u16>>();
        let col_desc1: Vec<u16> = "TestDescription1\0".encode_utf16().collect::<Vec<u16>>();
        let token_prefix1: Vec<u8> = b"token_prefix1\0".to_vec();

        let origin1 = Origin::signed(1);
        assert_noop!(TemplateModule::create_collection(
            origin1,
            col_name1,
            col_desc1,
            token_prefix1,
            CollectionMode::Fungible(MAX_DECIMAL_POINTS + 1)
        ), Error::<Test>::CollectionDecimalPointLimitExceeded);
    });    
}

#[test]
fn create_re_fungible_collection_fails_with_large_decimal_numbers() {
    new_test_ext().execute_with(|| {
        default_limits();

        let col_name1: Vec<u16> = "Test1\0".encode_utf16().collect::<Vec<u16>>();
        let col_desc1: Vec<u16> = "TestDescription1\0".encode_utf16().collect::<Vec<u16>>();
        let token_prefix1: Vec<u8> = b"token_prefix1\0".to_vec();

        let origin1 = Origin::signed(1);
        assert_noop!(TemplateModule::create_collection(
            origin1,
            col_name1,
            col_desc1,
            token_prefix1,
            CollectionMode::ReFungible(MAX_DECIMAL_POINTS + 1)
        ), Error::<Test>::CollectionDecimalPointLimitExceeded);
    });
}

#[test]
fn create_nft_item() {
    new_test_ext().execute_with(|| {
        default_limits();
        let collection_id = create_test_collection(&CollectionMode::NFT, 1);
        
        let data = default_nft_data();
        create_test_item(collection_id, &data.clone().into());
        assert_eq!(TemplateModule::nft_item_id(collection_id, 1).const_data, data.const_data);
        assert_eq!(TemplateModule::nft_item_id(collection_id, 1).variable_data, data.variable_data);
    });
}

// Use cases tests region
// #region
#[test]
fn create_nft_multiple_items() {
    new_test_ext().execute_with(|| {
        default_limits();
        
        create_test_collection(&CollectionMode::NFT, 1);

        let origin1 = Origin::signed(1);

        let items_data = vec![default_nft_data(), default_nft_data(), default_nft_data()];

        assert_ok!(TemplateModule::create_multiple_items(
            origin1.clone(),
            1,
            1,
            items_data.clone().into_iter().map(|d| { d.into() }).collect()
        ));
        for (index, data) in items_data.iter().enumerate() {
            assert_eq!(TemplateModule::nft_item_id(1, (index + 1) as TokenId).const_data.to_vec(), data.const_data);
            assert_eq!(TemplateModule::nft_item_id(1, (index + 1) as TokenId).variable_data.to_vec(), data.variable_data);
        }
    });
}

#[test]
fn create_refungible_item() {
    new_test_ext().execute_with(|| {
        default_limits();
        let collection_id = create_test_collection(&CollectionMode::ReFungible(3), 1);

        let data = default_re_fungible_data();
        create_test_item(collection_id, &data.clone().into());
        assert_eq!(
            TemplateModule::refungible_item_id(collection_id, 1).const_data,
            data.const_data
        );
        assert_eq!(
            TemplateModule::refungible_item_id(collection_id, 1).variable_data,
            data.variable_data
        );
        assert_eq!(
            TemplateModule::refungible_item_id(collection_id, 1).owner[0],
            Ownership {
                owner: 1,
                fraction: 1000
            }
        );
    });
}

#[test]
fn create_multiple_refungible_items() {
    new_test_ext().execute_with(|| {
        default_limits();
        
        create_test_collection(&CollectionMode::ReFungible(3), 1);

        let origin1 = Origin::signed(1);

        let items_data = vec![default_re_fungible_data(), default_re_fungible_data(), default_re_fungible_data()];

        assert_ok!(TemplateModule::create_multiple_items(
            origin1.clone(),
            1,
            1,
            items_data.clone().into_iter().map(|d| { d.into() }).collect()
        ));
        for (index, data) in items_data.iter().enumerate() {

            let item = TemplateModule::refungible_item_id(1, (index + 1) as TokenId);
            assert_eq!(item.const_data.to_vec(), data.const_data);
            assert_eq!(item.variable_data.to_vec(), data.variable_data);
            assert_eq!(
                item.owner[0],
                Ownership {
                    owner: 1,
                    fraction: 1000
                }
            );
        }
    });
}

#[test]
fn create_fungible_item() {
    new_test_ext().execute_with(|| {
        default_limits();
        
        let collection_id = create_test_collection(&CollectionMode::Fungible(3), 1);

        let data = default_fungible_data();
        create_test_item(collection_id, &data.into());

        assert_eq!(TemplateModule::fungible_item_id(collection_id, 1).owner, 1);
    });
}

#[test]
fn create_multiple_fungible_items() {
    new_test_ext().execute_with(|| {
        default_limits();

        create_test_collection(&CollectionMode::Fungible(3), 1);

        let origin1 = Origin::signed(1);

        let items_data = vec![default_fungible_data(), default_fungible_data(), default_fungible_data()];

        assert_ok!(TemplateModule::create_multiple_items(
            origin1.clone(),
            1,
            1,
            items_data.clone().into_iter().map(|d| { d.into() }).collect()
        ));
        
        for (index, _) in items_data.iter().enumerate() {
            assert_eq!(TemplateModule::fungible_item_id(1, (index + 1) as TokenId).owner, 1);
        }
        assert_eq!(TemplateModule::balance_count(1, 1), 3000);
        assert_eq!(TemplateModule::address_tokens(1, 1), [1, 2, 3]);
    });
}

#[test]
fn transfer_fungible_item() {
    new_test_ext().execute_with(|| {
        default_limits();
        
        let collection_id = create_test_collection(&CollectionMode::Fungible(3), 1);

        let origin1 = Origin::signed(1);
        let origin2 = Origin::signed(2);

        let data = default_fungible_data();
        create_test_item(collection_id, &data.into());

        assert_eq!(TemplateModule::fungible_item_id(1, 1).owner, 1);
        assert_eq!(TemplateModule::balance_count(1, 1), 1000);
        assert_eq!(TemplateModule::address_tokens(1, 1), [1]);

        // change owner scenario
        assert_ok!(TemplateModule::transfer(origin1.clone(), 2, 1, 1, 1000));
        assert_eq!(TemplateModule::fungible_item_id(1, 1).owner, 2);
        assert_eq!(TemplateModule::fungible_item_id(1, 1).value, 1000);
        assert_eq!(TemplateModule::balance_count(1, 1), 0);
        assert_eq!(TemplateModule::balance_count(1, 2), 1000);
        // assert_eq!(TemplateModule::address_tokens(1, 1), []);
        assert_eq!(TemplateModule::address_tokens(1, 2), [1]);

        // split item scenario
        assert_ok!(TemplateModule::transfer(origin2.clone(), 3, 1, 1, 500));
        assert_eq!(TemplateModule::fungible_item_id(1, 1).owner, 2);
        assert_eq!(TemplateModule::fungible_item_id(1, 2).owner, 3);
        assert_eq!(TemplateModule::balance_count(1, 2), 500);
        assert_eq!(TemplateModule::balance_count(1, 3), 500);
        assert_eq!(TemplateModule::address_tokens(1, 2), [1]);
        assert_eq!(TemplateModule::address_tokens(1, 3), [2]);

        // split item and new owner has account scenario
        assert_ok!(TemplateModule::transfer(origin2.clone(), 3, 1, 1, 200));
        assert_eq!(TemplateModule::fungible_item_id(1, 1).value, 300);
        assert_eq!(TemplateModule::fungible_item_id(1, 2).value, 700);
        assert_eq!(TemplateModule::balance_count(1, 2), 300);
        assert_eq!(TemplateModule::balance_count(1, 3), 700);
        assert_eq!(TemplateModule::address_tokens(1, 2), [1]);
        assert_eq!(TemplateModule::address_tokens(1, 3), [2]);
    });
}

#[test]
fn transfer_refungible_item() {
    new_test_ext().execute_with(|| {
        default_limits();
        
        let collection_id = create_test_collection(&CollectionMode::ReFungible(3), 1);

        let data = default_re_fungible_data();
        create_test_item(collection_id, &data.clone().into());

        let origin1 = Origin::signed(1);
        let origin2 = Origin::signed(2);
        assert_eq!(
            TemplateModule::refungible_item_id(collection_id, 1).const_data,
            data.const_data
        );
        assert_eq!(
            TemplateModule::refungible_item_id(collection_id, 1).variable_data,
            data.variable_data
        );
        assert_eq!(
            TemplateModule::refungible_item_id(collection_id, 1).owner[0],
            Ownership {
                owner: 1,
                fraction: 1000
            }
        );
        assert_eq!(TemplateModule::balance_count(1, 1), 1000);
        assert_eq!(TemplateModule::address_tokens(1, 1), [1]);

        // change owner scenario
        assert_ok!(TemplateModule::transfer(origin1.clone(), 2, 1, 1, 1000));
        assert_eq!(
            TemplateModule::refungible_item_id(1, 1).owner[0],
            Ownership {
                owner: 2,
                fraction: 1000
            }
        );
        assert_eq!(TemplateModule::balance_count(1, 1), 0);
        assert_eq!(TemplateModule::balance_count(1, 2), 1000);
        // assert_eq!(TemplateModule::address_tokens(1, 1), []);
        assert_eq!(TemplateModule::address_tokens(1, 2), [1]);

        // split item scenario
        assert_ok!(TemplateModule::transfer(origin2.clone(), 3, 1, 1, 500));
        assert_eq!(
            TemplateModule::refungible_item_id(1, 1).owner[0],
            Ownership {
                owner: 2,
                fraction: 500
            }
        );
        assert_eq!(
            TemplateModule::refungible_item_id(1, 1).owner[1],
            Ownership {
                owner: 3,
                fraction: 500
            }
        );
        assert_eq!(TemplateModule::balance_count(1, 2), 500);
        assert_eq!(TemplateModule::balance_count(1, 3), 500);
        assert_eq!(TemplateModule::address_tokens(1, 2), [1]);
        assert_eq!(TemplateModule::address_tokens(1, 3), [1]);

        // split item and new owner has account scenario
        assert_ok!(TemplateModule::transfer(origin2.clone(), 3, 1, 1, 200));
        assert_eq!(
            TemplateModule::refungible_item_id(1, 1).owner[0],
            Ownership {
                owner: 2,
                fraction: 300
            }
        );
        assert_eq!(
            TemplateModule::refungible_item_id(1, 1).owner[1],
            Ownership {
                owner: 3,
                fraction: 700
            }
        );
        assert_eq!(TemplateModule::balance_count(1, 2), 300);
        assert_eq!(TemplateModule::balance_count(1, 3), 700);
        assert_eq!(TemplateModule::address_tokens(1, 2), [1]);
        assert_eq!(TemplateModule::address_tokens(1, 3), [1]);
    });
}

#[test]
fn transfer_nft_item() {
    new_test_ext().execute_with(|| {
        default_limits();
        
        let collection_id = create_test_collection(&CollectionMode::NFT, 1);

        let data = default_nft_data();
        create_test_item(collection_id, &data.into());
        assert_eq!(TemplateModule::balance_count(1, 1), 1);
        assert_eq!(TemplateModule::address_tokens(1, 1), [1]);

        let origin1 = Origin::signed(1);
        // default scenario
        assert_ok!(TemplateModule::transfer(origin1.clone(), 2, 1, 1, 1000));
        assert_eq!(TemplateModule::nft_item_id(1, 1).owner, 2);
        assert_eq!(TemplateModule::balance_count(1, 1), 0);
        assert_eq!(TemplateModule::balance_count(1, 2), 1);
        // assert_eq!(TemplateModule::address_tokens(1, 1), []);
        assert_eq!(TemplateModule::address_tokens(1, 2), [1]);
    });
}

#[test]
fn nft_approve_and_transfer_from() {
    new_test_ext().execute_with(|| {
        default_limits();
        
        let collection_id = create_test_collection(&CollectionMode::NFT, 1);

        let data = default_nft_data();
        create_test_item(collection_id, &data.into());

        let origin1 = Origin::signed(1);
        let origin2 = Origin::signed(2);

        assert_eq!(TemplateModule::balance_count(1, 1), 1);
        assert_eq!(TemplateModule::address_tokens(1, 1), [1]);

        // neg transfer
        assert_noop!(TemplateModule::transfer_from(
            origin2.clone(),
            1,
            2,
            1,
            1,
            1), Error::<Test>::NoPermission);

        // do approve
        assert_ok!(TemplateModule::approve(origin1.clone(), 2, 1, 1));
        assert_eq!(TemplateModule::approved(1, (1, 1)).len(), 1);
        assert_eq!(
            TemplateModule::approved(1, (1, 1))[0],
            ApprovePermissions {
                approved: 2,
                amount: 100000000
            }
        );

        assert_ok!(TemplateModule::transfer_from(
            origin2.clone(),
            1,
            2,
            1,
            1,
            1
        ));
        assert_eq!(TemplateModule::approved(1, (1, 1)).len(), 0);
    });
}

#[test]
fn nft_approve_and_transfer_from_white_list() {
    new_test_ext().execute_with(|| {
        default_limits();
        
        let collection_id = create_test_collection(&CollectionMode::NFT, 1);

        let origin1 = Origin::signed(1);
        let origin2 = Origin::signed(2);

        let data = default_nft_data();
        create_test_item(collection_id, &data.clone().into());

        assert_eq!(TemplateModule::nft_item_id(1, 1).const_data, data.const_data);
        assert_eq!(TemplateModule::balance_count(1, 1), 1);
        assert_eq!(TemplateModule::address_tokens(1, 1), [1]);

        assert_ok!(TemplateModule::set_mint_permission(
            origin1.clone(),
            1,
            true
        ));
        assert_ok!(TemplateModule::set_public_access_mode(
            origin1.clone(),
            1,
            AccessMode::WhiteList
        ));
        assert_ok!(TemplateModule::add_to_white_list(origin1.clone(), 1, 1));
        assert_ok!(TemplateModule::add_to_white_list(origin1.clone(), 1, 2));
        assert_ok!(TemplateModule::add_to_white_list(origin1.clone(), 1, 3));

        // do approve
        assert_ok!(TemplateModule::approve(origin1.clone(), 2, 1, 1));
        assert_eq!(TemplateModule::approved(1, (1, 1)).len(), 1);
        assert_ok!(TemplateModule::approve(origin1.clone(), 3, 1, 1));
        assert_eq!(TemplateModule::approved(1, (1, 1)).len(), 2);
        assert_eq!(
            TemplateModule::approved(1, (1, 1))[0],
            ApprovePermissions {
                approved: 2,
                amount: 100000000
            }
        );

        assert_ok!(TemplateModule::transfer_from(
            origin2.clone(),
            1,
            3,
            1,
            1,
            1
        ));
        assert_eq!(TemplateModule::approved(1, (1, 1)).len(), 0);
    });
}

#[test]
fn refungible_approve_and_transfer_from() {
    new_test_ext().execute_with(|| {
        default_limits();
        
        let collection_id = create_test_collection(&CollectionMode::ReFungible(3), 1);
        
        let origin1 = Origin::signed(1);
        let origin2 = Origin::signed(2);

        let data = default_re_fungible_data();
        create_test_item(collection_id, &data.into());

        assert_eq!(TemplateModule::balance_count(1, 1), 1000);
        assert_eq!(TemplateModule::address_tokens(1, 1), [1]);

        assert_ok!(TemplateModule::set_mint_permission(
            origin1.clone(),
            1,
            true
        ));
        assert_ok!(TemplateModule::set_public_access_mode(
            origin1.clone(),
            1,
            AccessMode::WhiteList
        ));
        assert_ok!(TemplateModule::add_to_white_list(origin1.clone(), 1, 1));
        assert_ok!(TemplateModule::add_to_white_list(origin1.clone(), 1, 2));
        assert_ok!(TemplateModule::add_to_white_list(origin1.clone(), 1, 3));

        // do approve
        assert_ok!(TemplateModule::approve(origin1.clone(), 2, 1, 1));
        assert_eq!(TemplateModule::approved(1, (1, 1)).len(), 1);
        assert_ok!(TemplateModule::approve(origin1.clone(), 3, 1, 1));
        assert_eq!(TemplateModule::approved(1, (1, 1)).len(), 2);
        assert_eq!(
            TemplateModule::approved(1, (1, 1))[0],
            ApprovePermissions {
                approved: 2,
                amount: 100000000
            }
        );

        assert_ok!(TemplateModule::transfer_from(
            origin2.clone(),
            1,
            3,
            1,
            1,
            100
        ));
        assert_eq!(TemplateModule::balance_count(1, 1), 900);
        assert_eq!(TemplateModule::balance_count(1, 3), 100);
        assert_eq!(TemplateModule::address_tokens(1, 1), [1]);
        assert_eq!(TemplateModule::address_tokens(1, 3), [1]);

        assert_eq!(TemplateModule::approved(1, (1, 1)).len(), 1);
        assert_eq!(
            TemplateModule::approved(1, (1, 1))[0],
            ApprovePermissions {
                approved: 3,
                amount: 100000000
            }
        );
    });
}

#[test]
fn fungible_approve_and_transfer_from() {
    new_test_ext().execute_with(|| {
        default_limits();
        
        let collection_id = create_test_collection(&CollectionMode::Fungible(3), 1);
        
        let data = default_fungible_data();
        create_test_item(collection_id, &data.into());

        let origin1 = Origin::signed(1);
        let origin2 = Origin::signed(2);

        assert_eq!(TemplateModule::balance_count(1, 1), 1000);
        assert_eq!(TemplateModule::address_tokens(1, 1), [1]);

        assert_ok!(TemplateModule::set_mint_permission(
            origin1.clone(),
            1,
            true
        ));
        assert_ok!(TemplateModule::set_public_access_mode(
            origin1.clone(),
            1,
            AccessMode::WhiteList
        ));
        assert_ok!(TemplateModule::add_to_white_list(origin1.clone(), 1, 1));
        assert_ok!(TemplateModule::add_to_white_list(origin1.clone(), 1, 2));
        assert_ok!(TemplateModule::add_to_white_list(origin1.clone(), 1, 3));

        // do approve
        assert_ok!(TemplateModule::approve(origin1.clone(), 2, 1, 1));
        assert_eq!(TemplateModule::approved(1, (1, 1)).len(), 1);
        assert_ok!(TemplateModule::approve(origin1.clone(), 3, 1, 1));
        assert_eq!(TemplateModule::approved(1, (1, 1)).len(), 2);
        assert_eq!(
            TemplateModule::approved(1, (1, 1))[0],
            ApprovePermissions {
                approved: 2,
                amount: 100000000
            }
        );

        assert_ok!(TemplateModule::transfer_from(
            origin2.clone(),
            1,
            3,
            1,
            1,
            100
        ));
        assert_eq!(TemplateModule::balance_count(1, 1), 900);
        assert_eq!(TemplateModule::balance_count(1, 3), 100);
        assert_eq!(TemplateModule::address_tokens(1, 1), [1]);
        assert_eq!(TemplateModule::address_tokens(1, 3), [2]);

        assert_eq!(TemplateModule::approved(1, (1, 1)).len(), 1);
        assert_eq!(
            TemplateModule::approved(1, (1, 1))[0],
            ApprovePermissions {
                approved: 3,
                amount: 100000000
            }
        );

        assert_ok!(TemplateModule::approve(origin1.clone(), 2, 1, 1));
        assert_ok!(TemplateModule::transfer_from(
            origin2.clone(),
            1,
            3,
            1,
            1,
            900
        ));
        assert_eq!(TemplateModule::balance_count(1, 1), 0);
        assert_eq!(TemplateModule::balance_count(1, 3), 1000);
        // assert_eq!(TemplateModule::address_tokens(1, 1), []);
        assert_eq!(TemplateModule::address_tokens(1, 3), [2]);

        assert_eq!(TemplateModule::approved(1, (1, 1)).len(), 0);
    });
}

#[test]
fn change_collection_owner() {
    new_test_ext().execute_with(|| {
        default_limits();
        
        let collection_id = create_test_collection(&CollectionMode::NFT, 1);
        
        let origin1 = Origin::signed(1);
        assert_ok!(TemplateModule::change_collection_owner(
            origin1.clone(),
            collection_id,
            2
        ));
        assert_eq!(TemplateModule::collection(collection_id).owner, 2);
    });
}

#[test]
fn destroy_collection() {
    new_test_ext().execute_with(|| {
        default_limits();
        
        let collection_id = create_test_collection(&CollectionMode::NFT, 1);
        
        let origin1 = Origin::signed(1);
        assert_ok!(TemplateModule::destroy_collection(origin1.clone(), collection_id));
    });
}

#[test]
fn burn_nft_item() {
    new_test_ext().execute_with(|| {
        default_limits();
        
        let collection_id = create_test_collection(&CollectionMode::NFT, 1);

        let origin1 = Origin::signed(1);
        assert_ok!(TemplateModule::add_collection_admin(origin1.clone(), collection_id, 2));
        
        let data = default_nft_data();
        create_test_item(collection_id, &data.into());

        // check balance (collection with id = 1, user id = 1)
        assert_eq!(TemplateModule::balance_count(1, 1), 1);

        // burn item
        assert_ok!(TemplateModule::burn_item(origin1.clone(), 1, 1));
        assert_noop!(
            TemplateModule::burn_item(origin1.clone(), 1, 1),
            Error::<Test>::TokenNotFound
        );

        assert_eq!(TemplateModule::balance_count(1, 1), 0);
    });
}

#[test]
fn burn_fungible_item() {
    new_test_ext().execute_with(|| {
        default_limits();
        
        let collection_id = create_test_collection(&CollectionMode::Fungible(3), 1);
        
        let origin1 = Origin::signed(1);
        assert_ok!(TemplateModule::add_collection_admin(origin1.clone(), collection_id, 2));
        
        let data = default_fungible_data();
        create_test_item(collection_id, &data.into());

        // check balance (collection with id = 1, user id = 1)
        assert_eq!(TemplateModule::balance_count(1, 1), 1000);

        // burn item
        assert_ok!(TemplateModule::burn_item(origin1.clone(), 1, 1));
        assert_noop!(
            TemplateModule::burn_item(origin1.clone(), 1, 1),
            Error::<Test>::TokenNotFound
        );

        assert_eq!(TemplateModule::balance_count(1, 1), 0);
    });
}

#[test]
fn burn_refungible_item() {
    new_test_ext().execute_with(|| {
        default_limits();
        
        let collection_id = create_test_collection(&CollectionMode::ReFungible(3), 1);
        let origin1 = Origin::signed(1);

        assert_ok!(TemplateModule::set_mint_permission(
            origin1.clone(),
            collection_id,
            true
        ));
        assert_ok!(TemplateModule::set_public_access_mode(
            origin1.clone(),
            collection_id,
            AccessMode::WhiteList
        ));
        assert_ok!(TemplateModule::add_to_white_list(origin1.clone(), 1, 1));

        assert_ok!(TemplateModule::add_collection_admin(origin1.clone(), 1, 2));
        
        let data = default_re_fungible_data();
        create_test_item(collection_id, &data.into());

        // check balance (collection with id = 1, user id = 2)
        assert_eq!(TemplateModule::balance_count(1, 1), 1000);

        // burn item
        assert_ok!(TemplateModule::burn_item(origin1.clone(), 1, 1));
        assert_noop!(
            TemplateModule::burn_item(origin1.clone(), 1, 1),
            Error::<Test>::TokenNotFound
        );

        assert_eq!(TemplateModule::balance_count(1, 1), 0);
    });
}

#[test]
fn add_collection_admin() {
    new_test_ext().execute_with(|| {
        default_limits();
        
        let collection1_id = create_test_collection_for_owner(&CollectionMode::NFT, 1, 1);
        create_test_collection_for_owner(&CollectionMode::NFT, 2, 2);
        create_test_collection_for_owner(&CollectionMode::NFT, 3, 3);
        
        let origin1 = Origin::signed(1);

        // collection admin
        assert_ok!(TemplateModule::add_collection_admin(origin1.clone(), collection1_id, 2));
        assert_ok!(TemplateModule::add_collection_admin(origin1.clone(), collection1_id, 3));

        assert_eq!(TemplateModule::admin_list_collection(collection1_id).contains(&2), true);
        assert_eq!(TemplateModule::admin_list_collection(collection1_id).contains(&3), true);
    });
}

#[test]
fn remove_collection_admin() {
    new_test_ext().execute_with(|| {
        default_limits();
        
        let collection1_id = create_test_collection_for_owner(&CollectionMode::NFT, 1, 1);
        create_test_collection_for_owner(&CollectionMode::NFT, 2, 2);
        create_test_collection_for_owner(&CollectionMode::NFT, 3, 3);

        let origin1 = Origin::signed(1);
        let origin2 = Origin::signed(2);

        // collection admin
        assert_ok!(TemplateModule::add_collection_admin(origin1.clone(), collection1_id, 2));
        assert_ok!(TemplateModule::add_collection_admin(origin1.clone(), collection1_id, 3));

        assert_eq!(TemplateModule::admin_list_collection(1).contains(&2), true);
        assert_eq!(TemplateModule::admin_list_collection(1).contains(&3), true);

        // remove admin
        assert_ok!(TemplateModule::remove_collection_admin(
            origin2.clone(),
            1,
            3
        ));
        assert_eq!(TemplateModule::admin_list_collection(1).contains(&3), false);
    });
}

#[test]
fn balance_of() {
    new_test_ext().execute_with(|| {
        default_limits();
        
        let nft_collection_id = create_test_collection(&CollectionMode::NFT, 1);
        let fungible_collection_id = create_test_collection(&CollectionMode::Fungible(3), 2);
        let re_fungible_collection_id = create_test_collection(&CollectionMode::ReFungible(3), 3);
        
        // check balance before
        assert_eq!(TemplateModule::balance_count(nft_collection_id, 1), 0);
        assert_eq!(TemplateModule::balance_count(fungible_collection_id, 1), 0);
        assert_eq!(TemplateModule::balance_count(re_fungible_collection_id, 1), 0);

        let nft_data = default_nft_data();
        create_test_item(nft_collection_id, &nft_data.into());
        
        let fungible_data = default_fungible_data();
        create_test_item(fungible_collection_id, &fungible_data.into());
        
        let re_fungible_data = default_re_fungible_data();
        create_test_item(re_fungible_collection_id, &re_fungible_data.into());

        // check balance (collection with id = 1, user id = 1)
        assert_eq!(TemplateModule::balance_count(nft_collection_id, 1), 1);
        assert_eq!(TemplateModule::balance_count(fungible_collection_id, 1), 1000);
        assert_eq!(TemplateModule::balance_count(re_fungible_collection_id, 1), 1000);
        assert_eq!(TemplateModule::nft_item_id(nft_collection_id, 1).owner, 1);
        assert_eq!(TemplateModule::fungible_item_id(fungible_collection_id, 1).owner, 1);
        assert_eq!(TemplateModule::refungible_item_id(re_fungible_collection_id, 1).owner[0].owner, 1);
    });
}

#[test]
fn approve() {
    new_test_ext().execute_with(|| {
        default_limits();
        
        let collection_id = create_test_collection(&CollectionMode::NFT, 1);
        
        let data = default_nft_data();
        create_test_item(collection_id, &data.into());

        let origin1 = Origin::signed(1);
        
        // approve
        assert_ok!(TemplateModule::approve(origin1.clone(), 2, 1, 1));
        assert_eq!(TemplateModule::approved(1, (1, 1))[0].approved, 2);
    });
}

#[test]
fn transfer_from() {
    new_test_ext().execute_with(|| {
        default_limits();
        
        let collection_id = create_test_collection(&CollectionMode::NFT, 1);
        let origin1 = Origin::signed(1);
        let origin2 = Origin::signed(2);

        let data = default_nft_data();
        create_test_item(collection_id, &data.into());

        // approve
        assert_ok!(TemplateModule::approve(origin1.clone(), 2, 1, 1));
        assert_eq!(TemplateModule::approved(1, (1, 1))[0].approved, 2);

        assert_ok!(TemplateModule::set_mint_permission(
            origin1.clone(),
            1,
            true
        ));
        assert_ok!(TemplateModule::set_public_access_mode(
            origin1.clone(),
            1,
            AccessMode::WhiteList
        ));
        assert_ok!(TemplateModule::add_to_white_list(origin1.clone(), 1, 1));
        assert_ok!(TemplateModule::add_to_white_list(origin1.clone(), 1, 2));
        assert_ok!(TemplateModule::add_to_white_list(origin1.clone(), 1, 3));

        assert_ok!(TemplateModule::transfer_from(
            origin2.clone(),
            1,
            2,
            1,
            1,
            1
        ));

        // after transfer
        assert_eq!(TemplateModule::balance_count(1, 1), 0);
        assert_eq!(TemplateModule::balance_count(1, 2), 1);
    });
}

// #endregion

// Coverage tests region
// #region

#[test]
fn owner_can_add_address_to_white_list() {
    new_test_ext().execute_with(|| {
        default_limits();
        
        let collection_id = create_test_collection(&CollectionMode::NFT, 1);

        let origin1 = Origin::signed(1);
        assert_ok!(TemplateModule::add_to_white_list(origin1.clone(), collection_id, 2));
        assert_eq!(TemplateModule::white_list(collection_id, 2), true);
    });
}

#[test]
fn admin_can_add_address_to_white_list() {
    new_test_ext().execute_with(|| {
        default_limits();
        
        let collection_id = create_test_collection(&CollectionMode::NFT, 1);
        let origin1 = Origin::signed(1);
        let origin2 = Origin::signed(2);

        assert_ok!(TemplateModule::add_collection_admin(origin1.clone(), collection_id, 2));
        assert_ok!(TemplateModule::add_to_white_list(origin2.clone(), collection_id, 3));
        assert_eq!(TemplateModule::white_list(collection_id, 3), true);
    });
}

#[test]
fn nonprivileged_user_cannot_add_address_to_white_list() {
    new_test_ext().execute_with(|| {
        default_limits();
        
        let collection_id = create_test_collection(&CollectionMode::NFT, 1);

        let origin2 = Origin::signed(2);
        assert_noop!(
            TemplateModule::add_to_white_list(origin2.clone(), collection_id, 3),
            Error::<Test>::NoPermission
        );
    });
}

#[test]
fn nobody_can_add_address_to_white_list_of_nonexisting_collection() {
    new_test_ext().execute_with(|| {
        default_limits();

        let origin1 = Origin::signed(1);

        assert_noop!(
            TemplateModule::add_to_white_list(origin1.clone(), 1, 2),
            Error::<Test>::CollectionNotFound
        );
    });
}

#[test]
fn nobody_can_add_address_to_white_list_of_deleted_collection() {
    new_test_ext().execute_with(|| {
        default_limits();
        
        let collection_id = create_test_collection(&CollectionMode::NFT, 1);

        let origin1 = Origin::signed(1);
        assert_ok!(TemplateModule::destroy_collection(origin1.clone(), collection_id));
        assert_noop!(
            TemplateModule::add_to_white_list(origin1.clone(), collection_id, 2),
            Error::<Test>::CollectionNotFound
        );
    });
}

// If address is already added to white list, nothing happens
#[test]
fn address_is_already_added_to_white_list() {
    new_test_ext().execute_with(|| {
        default_limits();
        
        let collection_id = create_test_collection(&CollectionMode::NFT, 1);
        let origin1 = Origin::signed(1);
        
        assert_ok!(TemplateModule::add_to_white_list(origin1.clone(), collection_id, 2));
        assert_ok!(TemplateModule::add_to_white_list(origin1.clone(), collection_id, 2));
        assert_eq!(TemplateModule::white_list(collection_id, 2), true);
    });
}

#[test]
fn owner_can_remove_address_from_white_list() {
    new_test_ext().execute_with(|| {
        default_limits();
        
        let collection_id = create_test_collection(&CollectionMode::NFT, 1);

        let origin1 = Origin::signed(1);
        assert_ok!(TemplateModule::add_to_white_list(origin1.clone(), collection_id, 2));
        assert_ok!(TemplateModule::remove_from_white_list(
            origin1.clone(),
            collection_id,
            2
        ));
        assert_eq!(TemplateModule::white_list(collection_id, 2), false);
    });
}

#[test]
fn admin_can_remove_address_from_white_list() {
    new_test_ext().execute_with(|| {
        default_limits();
        
        let collection_id = create_test_collection(&CollectionMode::NFT, 1);
        let origin1 = Origin::signed(1);
        let origin2 = Origin::signed(2);

        assert_ok!(TemplateModule::add_collection_admin(origin1.clone(), collection_id, 2));

        assert_ok!(TemplateModule::add_to_white_list(origin1.clone(), collection_id, 3));
        assert_ok!(TemplateModule::remove_from_white_list(
            origin2.clone(),
            collection_id,
            3
        ));
        assert_eq!(TemplateModule::white_list(collection_id, 3), false);
    });
}

#[test]
fn nonprivileged_user_cannot_remove_address_from_white_list() {
    new_test_ext().execute_with(|| {
        default_limits();
        
        let collection_id = create_test_collection(&CollectionMode::NFT, 1);
        let origin1 = Origin::signed(1);
        let origin2 = Origin::signed(2);

        assert_ok!(TemplateModule::add_to_white_list(origin1.clone(), collection_id, 2));
        assert_noop!(
            TemplateModule::remove_from_white_list(origin2.clone(), collection_id, 2),
            Error::<Test>::NoPermission
        );
        assert_eq!(TemplateModule::white_list(collection_id, 2), true);
    });
}

#[test]
fn nobody_can_remove_address_from_white_list_of_nonexisting_collection() {
    new_test_ext().execute_with(|| {
        default_limits();
        let origin1 = Origin::signed(1);

        assert_noop!(
            TemplateModule::remove_from_white_list(origin1.clone(), 1, 2),
            Error::<Test>::CollectionNotFound
        );
    });
}

#[test]
fn nobody_can_remove_address_from_white_list_of_deleted_collection() {
    new_test_ext().execute_with(|| {
        default_limits();
        
        let collection_id = create_test_collection(&CollectionMode::NFT, 1);
        let origin1 = Origin::signed(1);
        let origin2 = Origin::signed(2);

        assert_ok!(TemplateModule::add_to_white_list(origin1.clone(), collection_id, 2));
        assert_ok!(TemplateModule::destroy_collection(origin1.clone(), collection_id));
        assert_noop!(
            TemplateModule::remove_from_white_list(origin2.clone(), collection_id, 2),
            Error::<Test>::CollectionNotFound
        );
        assert_eq!(TemplateModule::white_list(collection_id, 2), false);
    });
}

// If address is already removed from white list, nothing happens
#[test]
fn address_is_already_removed_from_white_list() {
    new_test_ext().execute_with(|| {
        default_limits();
        
        let collection_id = create_test_collection(&CollectionMode::NFT, 1);
        let origin1 = Origin::signed(1);

        assert_ok!(TemplateModule::add_to_white_list(origin1.clone(), collection_id, 2));
        assert_ok!(TemplateModule::remove_from_white_list(
            origin1.clone(),
            collection_id,
            2
        ));
        assert_ok!(TemplateModule::remove_from_white_list(
            origin1.clone(),
            collection_id,
            2
        ));
        assert_eq!(TemplateModule::white_list(collection_id, 2), false);
    });
}

// If Public Access mode is set to WhiteList, tokens can’t be transferred from a non-whitelisted address with transfer or transferFrom (2 tests)
#[test]
fn white_list_test_1() {
    new_test_ext().execute_with(|| {
        default_limits();
        
        let collection_id = create_test_collection(&CollectionMode::NFT, 1);

        let origin1 = Origin::signed(1);
        
        let data = default_nft_data();
        create_test_item(collection_id, &data.into());

        assert_ok!(TemplateModule::set_public_access_mode(
            origin1.clone(),
            collection_id,
            AccessMode::WhiteList
        ));
        assert_ok!(TemplateModule::add_to_white_list(origin1.clone(), collection_id, 2));

        assert_noop!(
            TemplateModule::transfer(origin1.clone(), 3, 1, 1, 1),
            Error::<Test>::AddresNotInWhiteList
        );
    });
}

#[test]
fn white_list_test_2() {
    new_test_ext().execute_with(|| {
        default_limits();
        
        let collection_id = create_test_collection(&CollectionMode::NFT, 1);
        let origin1 = Origin::signed(1);
        
        let data = default_nft_data();
        create_test_item(collection_id, &data.into());

        assert_ok!(TemplateModule::set_public_access_mode(
            origin1.clone(),
            collection_id,
            AccessMode::WhiteList
        ));
        assert_ok!(TemplateModule::add_to_white_list(origin1.clone(), 1, 1));
        assert_ok!(TemplateModule::add_to_white_list(origin1.clone(), 1, 2));

        // do approve
        assert_ok!(TemplateModule::approve(origin1.clone(), 1, 1, 1));
        assert_eq!(TemplateModule::approved(1, (1, 1)).len(), 1);

        assert_ok!(TemplateModule::remove_from_white_list(
            origin1.clone(),
            1,
            1
        ));

        assert_noop!(
            TemplateModule::transfer_from(origin1.clone(), 1, 3, 1, 1, 1),
            Error::<Test>::AddresNotInWhiteList
        );
    });
}

// If Public Access mode is set to WhiteList, tokens can’t be transferred to a non-whitelisted address with transfer or transferFrom (2 tests)
#[test]
fn white_list_test_3() {
    new_test_ext().execute_with(|| {
        default_limits();
        
        let collection_id = create_test_collection(&CollectionMode::NFT, 1);

        let origin1 = Origin::signed(1);
        
        let data = default_nft_data();
        create_test_item(collection_id, &data.into());

        assert_ok!(TemplateModule::set_public_access_mode(
            origin1.clone(),
            collection_id,
            AccessMode::WhiteList
        ));
        assert_ok!(TemplateModule::add_to_white_list(origin1.clone(), 1, 1));

        assert_noop!(
            TemplateModule::transfer(origin1.clone(), 3, 1, 1, 1),
            Error::<Test>::AddresNotInWhiteList
        );
    });
}

#[test]
fn white_list_test_4() {
    new_test_ext().execute_with(|| {
        default_limits();
        
        let collection_id = create_test_collection(&CollectionMode::NFT, 1);

        let origin1 = Origin::signed(1);

        let data = default_nft_data();
        create_test_item(collection_id, &data.into());

        assert_ok!(TemplateModule::set_public_access_mode(
            origin1.clone(),
            collection_id,
            AccessMode::WhiteList
        ));
        assert_ok!(TemplateModule::add_to_white_list(origin1.clone(), collection_id, 1));
        assert_ok!(TemplateModule::add_to_white_list(origin1.clone(), collection_id, 2));

        // do approve
        assert_ok!(TemplateModule::approve(origin1.clone(), 1, 1, 1));
        assert_eq!(TemplateModule::approved(1, (1, 1)).len(), 1);

        assert_ok!(TemplateModule::remove_from_white_list(
            origin1.clone(),
            collection_id,
            2
        ));

        assert_noop!(
            TemplateModule::transfer_from(origin1.clone(), 1, 3, 1, 1, 1),
            Error::<Test>::AddresNotInWhiteList
        );
    });
}

// If Public Access mode is set to WhiteList, tokens can’t be destroyed by a non-whitelisted address (even if it owned them before enabling WhiteList mode)
#[test]
fn white_list_test_5() {
    new_test_ext().execute_with(|| {
        default_limits();
        
        let collection_id = create_test_collection(&CollectionMode::NFT, 1);

        let origin1 = Origin::signed(1);

        let data = default_nft_data();
        create_test_item(collection_id, &data.into());

        assert_ok!(TemplateModule::set_public_access_mode(
            origin1.clone(),
            collection_id,
            AccessMode::WhiteList
        ));
        assert_noop!(
            TemplateModule::burn_item(origin1.clone(), 1, 1),
            Error::<Test>::AddresNotInWhiteList
        );
    });
}

// If Public Access mode is set to WhiteList, oken transfers can’t be Approved by a non-whitelisted address (see Approve method).
#[test]
fn white_list_test_6() {
    new_test_ext().execute_with(|| {
        default_limits();
        
        let collection_id = create_test_collection(&CollectionMode::NFT, 1);

        let origin1 = Origin::signed(1);
        assert_ok!(TemplateModule::set_public_access_mode(
            origin1.clone(),
            collection_id,
            AccessMode::WhiteList
        ));

        // do approve
        assert_noop!(
            TemplateModule::approve(origin1.clone(), 1, 1, 1),
            Error::<Test>::AddresNotInWhiteList
        );
    });
}

// If Public Access mode is set to WhiteList, tokens can be transferred from a whitelisted address with transfer or transferFrom (2 tests) and
//          tokens can be transferred from a whitelisted address with transfer or transferFrom (2 tests)
#[test]
fn white_list_test_7() {
    new_test_ext().execute_with(|| {
        default_limits();
        
        let collection_id = create_test_collection(&CollectionMode::NFT, 1);

        let data = default_nft_data();
        create_test_item(collection_id, &data.into());
        
        let origin1 = Origin::signed(1);

        assert_ok!(TemplateModule::set_public_access_mode(
            origin1.clone(),
            collection_id,
            AccessMode::WhiteList
        ));
        assert_ok!(TemplateModule::add_to_white_list(origin1.clone(), collection_id, 1));
        assert_ok!(TemplateModule::add_to_white_list(origin1.clone(), collection_id, 2));

        assert_ok!(TemplateModule::transfer(origin1.clone(), 2, 1, 1, 1));
    });
}

#[test]
fn white_list_test_8() {
    new_test_ext().execute_with(|| {
        default_limits();
        
        let collection_id = create_test_collection(&CollectionMode::NFT, 1);

        let data = default_nft_data();
        create_test_item(collection_id, &data.into());
        
        let origin1 = Origin::signed(1);

        assert_ok!(TemplateModule::set_public_access_mode(
            origin1.clone(),
            collection_id,
            AccessMode::WhiteList
        ));
        assert_ok!(TemplateModule::add_to_white_list(origin1.clone(), collection_id, 1));
        assert_ok!(TemplateModule::add_to_white_list(origin1.clone(), collection_id, 2));

        // do approve
        assert_ok!(TemplateModule::approve(origin1.clone(), 1, 1, 1));
        assert_eq!(TemplateModule::approved(1, (1, 1)).len(), 1);

        assert_ok!(TemplateModule::transfer_from(
            origin1.clone(),
            1,
            2,
            1,
            1,
            1
        ));
    });
}

// If Public Access mode is set to WhiteList, and Mint Permission is set to false, tokens can be created by owner.
#[test]
fn white_list_test_9() {
    new_test_ext().execute_with(|| {
        default_limits();
        
        let collection_id = create_test_collection(&CollectionMode::NFT, 1);
        let origin1 = Origin::signed(1);

        assert_ok!(TemplateModule::set_public_access_mode(
            origin1.clone(),
            collection_id,
            AccessMode::WhiteList
        ));
        assert_ok!(TemplateModule::set_mint_permission(
            origin1.clone(),
            collection_id,
            false
        ));

        let data = default_nft_data();
        create_test_item(collection_id, &data.into());
    });
}

// If Public Access mode is set to WhiteList, and Mint Permission is set to false, tokens can be created by admin.
#[test]
fn white_list_test_10() {
    new_test_ext().execute_with(|| {
        default_limits();
        
        let collection_id = create_test_collection(&CollectionMode::NFT, 1);

        let origin1 = Origin::signed(1);
        let origin2 = Origin::signed(2);

        assert_ok!(TemplateModule::set_public_access_mode(
            origin1.clone(),
            collection_id,
            AccessMode::WhiteList
        ));
        assert_ok!(TemplateModule::set_mint_permission(
            origin1.clone(),
            collection_id,
            false
        ));

        assert_ok!(TemplateModule::add_collection_admin(origin1.clone(), collection_id, 2));

        assert_ok!(TemplateModule::create_item(
            origin2.clone(),
            collection_id,
            2,
            default_nft_data().into()
        ));
    });
}

// If Public Access mode is set to WhiteList, and Mint Permission is set to false, tokens cannot be created by non-privileged and white listed address.
#[test]
fn white_list_test_11() {
    new_test_ext().execute_with(|| {
        default_limits();
        
        let collection_id = create_test_collection(&CollectionMode::NFT, 1);

        let origin1 = Origin::signed(1);
        let origin2 = Origin::signed(2);

        assert_ok!(TemplateModule::set_public_access_mode(
            origin1.clone(),
            collection_id,
            AccessMode::WhiteList
        ));
        assert_ok!(TemplateModule::set_mint_permission(
            origin1.clone(),
            collection_id,
            false
        ));
        assert_ok!(TemplateModule::add_to_white_list(origin1.clone(), collection_id, 2));

        assert_noop!(
            TemplateModule::create_item(origin2.clone(), 1, 2, default_nft_data().into()),
            Error::<Test>::PublicMintingNotAllowed
        );
    });
}

// If Public Access mode is set to WhiteList, and Mint Permission is set to false, tokens cannot be created by non-privileged and non-white listed address.
#[test]
fn white_list_test_12() {
    new_test_ext().execute_with(|| {
        default_limits();
        
        let collection_id = create_test_collection(&CollectionMode::NFT, 1);

        let origin1 = Origin::signed(1);
        let origin2 = Origin::signed(2);

        assert_ok!(TemplateModule::set_public_access_mode(
            origin1.clone(),
            collection_id,
            AccessMode::WhiteList
        ));
        assert_ok!(TemplateModule::set_mint_permission(
            origin1.clone(),
            collection_id,
            false
        ));

        assert_noop!(
            TemplateModule::create_item(origin2.clone(), 1, 2, default_nft_data().into()),
            Error::<Test>::PublicMintingNotAllowed
        );
    });
}

// If Public Access mode is set to WhiteList, and Mint Permission is set to true, tokens can be created by owner.
#[test]
fn white_list_test_13() {
    new_test_ext().execute_with(|| {
        default_limits();
        
        let collection_id = create_test_collection(&CollectionMode::NFT, 1);

        let origin1 = Origin::signed(1);

        assert_ok!(TemplateModule::set_public_access_mode(
            origin1.clone(),
            collection_id,
            AccessMode::WhiteList
        ));
        assert_ok!(TemplateModule::set_mint_permission(
            origin1.clone(),
            collection_id,
            true
        ));

        let data = default_nft_data();
        create_test_item(collection_id, &data.into());
    });
}

// If Public Access mode is set to WhiteList, and Mint Permission is set to true, tokens can be created by admin.
#[test]
fn white_list_test_14() {
    new_test_ext().execute_with(|| {
        default_limits();
        
        let collection_id = create_test_collection(&CollectionMode::NFT, 1);

        let origin1 = Origin::signed(1);
        let origin2 = Origin::signed(2);

        assert_ok!(TemplateModule::set_public_access_mode(
            origin1.clone(),
            collection_id,
            AccessMode::WhiteList
        ));
        assert_ok!(TemplateModule::set_mint_permission(
            origin1.clone(),
            collection_id,
            true
        ));

        assert_ok!(TemplateModule::add_collection_admin(origin1.clone(), collection_id, 2));

        assert_ok!(TemplateModule::create_item(
            origin2.clone(),
            1,
            2,
            default_nft_data().into()
        ));
    });
}

// If Public Access mode is set to WhiteList, and Mint Permission is set to true, tokens cannot be created by non-privileged and non-white listed address.
#[test]
fn white_list_test_15() {
    new_test_ext().execute_with(|| {
        default_limits();
        
        let collection_id = create_test_collection(&CollectionMode::NFT, 1);

        let origin1 = Origin::signed(1);
        let origin2 = Origin::signed(2);

        assert_ok!(TemplateModule::set_public_access_mode(
            origin1.clone(),
            collection_id,
            AccessMode::WhiteList
        ));
        assert_ok!(TemplateModule::set_mint_permission(
            origin1.clone(),
            collection_id,
            true
        ));

        assert_noop!(
            TemplateModule::create_item(origin2.clone(), 1, 2, default_nft_data().into()),
            Error::<Test>::AddresNotInWhiteList
        );
    });
}

// If Public Access mode is set to WhiteList, and Mint Permission is set to true, tokens can be created by non-privileged and white listed address.
#[test]
fn white_list_test_16() {
    new_test_ext().execute_with(|| {
        default_limits();
        
        let collection_id = create_test_collection(&CollectionMode::NFT, 1);

        let origin1 = Origin::signed(1);
        let origin2 = Origin::signed(2);

        assert_ok!(TemplateModule::set_public_access_mode(
            origin1.clone(),
            collection_id,
            AccessMode::WhiteList
        ));
        assert_ok!(TemplateModule::set_mint_permission(
            origin1.clone(),
            collection_id,
            true
        ));
        assert_ok!(TemplateModule::add_to_white_list(origin1.clone(), collection_id, 2));

        assert_ok!(TemplateModule::create_item(
            origin2.clone(),
            1,
            2,
            default_nft_data().into()
        ));
    });
}

// Total number of collections. Positive test
#[test]
fn total_number_collections_bound() {
    new_test_ext().execute_with(|| {
        default_limits();
        
        create_test_collection(&CollectionMode::NFT, 1);
    });
}

// Total number of collections. Negotive test
#[test]
fn total_number_collections_bound_neg() {
    new_test_ext().execute_with(|| {
        default_limits();

        let origin1 = Origin::signed(1);

        for i in 0..default_collection_numbers_limit() {
            create_test_collection(&CollectionMode::NFT, i + 1);
        }

        let col_name1: Vec<u16> = "Test1\0".encode_utf16().collect::<Vec<u16>>();
        let col_desc1: Vec<u16> = "TestDescription1\0".encode_utf16().collect::<Vec<u16>>();
        let token_prefix1: Vec<u8> = b"token_prefix1\0".to_vec();

        // 11-th collection in chain. Expects error
        assert_noop!(TemplateModule::create_collection(
            origin1.clone(),
            col_name1.clone(),
            col_desc1.clone(),
            token_prefix1.clone(),
            CollectionMode::NFT
        ), Error::<Test>::TotalCollectionsLimitExceeded);
    });
}

// Owned tokens by a single address. Positive test
#[test]
fn owned_tokens_bound() {
    new_test_ext().execute_with(|| {
        default_limits();
        
        let collection_id = create_test_collection(&CollectionMode::NFT, 1);

        let data = default_nft_data();
        create_test_item(collection_id, &data.clone().into());
        create_test_item(collection_id, &data.into());
    });
}

// Owned tokens by a single address. Negotive test
#[test]
fn owned_tokens_bound_neg() {
    new_test_ext().execute_with(|| {
        assert_ok!(TemplateModule::set_chain_limits(RawOrigin::Root.into(), ChainLimits { 
            collection_numbers_limit: 10,
            account_token_ownership_limit: 1,
            collections_admins_limit: 5,
            custom_data_limit: 2048,
            nft_sponsor_transfer_timeout: 15,
            fungible_sponsor_transfer_timeout: 15,
            refungible_sponsor_transfer_timeout: 15,          
        }));
        
        let collection_id = create_test_collection(&CollectionMode::NFT, 1);

        let origin1 = Origin::signed(1);
        let data = default_nft_data();
        create_test_item(collection_id, &data.clone().into());

        assert_noop!(TemplateModule::create_item(
            origin1.clone(),
            1,
            1,
            data.into()
        ),  Error::<Test>::AddressOwnershipLimitExceeded);
    });
}

// Number of collection admins. Positive test
#[test]
fn collection_admins_bound() {
    new_test_ext().execute_with(|| {
        assert_ok!(TemplateModule::set_chain_limits(RawOrigin::Root.into(), ChainLimits { 
            collection_numbers_limit: 10,
            account_token_ownership_limit: 10,
            collections_admins_limit: 2,
            custom_data_limit: 2048,
            nft_sponsor_transfer_timeout: 15,
            fungible_sponsor_transfer_timeout: 15,
            refungible_sponsor_transfer_timeout: 15,          
        }));
        
        let collection_id = create_test_collection(&CollectionMode::NFT, 1);

        let origin1 = Origin::signed(1);
        
        assert_ok!(TemplateModule::add_collection_admin(origin1.clone(), collection_id, 2));
        assert_ok!(TemplateModule::add_collection_admin(origin1.clone(), collection_id, 3));
    });
}

// Number of collection admins. Negotive test
#[test]
fn collection_admins_bound_neg() {
    new_test_ext().execute_with(|| {
        assert_ok!(TemplateModule::set_chain_limits(RawOrigin::Root.into(), ChainLimits { 
            collection_numbers_limit: 10,
            account_token_ownership_limit: 1,
            collections_admins_limit: 1,
            custom_data_limit: 2048,
            nft_sponsor_transfer_timeout: 15,
            fungible_sponsor_transfer_timeout: 15,
            refungible_sponsor_transfer_timeout: 15,          
        }));
        
        let collection_id = create_test_collection(&CollectionMode::NFT, 1);

        let origin1 = Origin::signed(1);

        assert_ok!(TemplateModule::add_collection_admin(origin1.clone(), collection_id, 2));
        assert_noop!(TemplateModule::add_collection_admin(origin1.clone(), collection_id, 3), Error::<Test>::CollectionAdminsLimitExceeded);
    });
}

// NFT custom data size. Negative test const_data.
#[test]
fn custom_data_size_nft_const_data_bound_neg() {
    new_test_ext().execute_with(|| {
        assert_ok!(TemplateModule::set_chain_limits(RawOrigin::Root.into(), ChainLimits { 
            collection_numbers_limit: 10,
            account_token_ownership_limit: 10,
            collections_admins_limit: 5,
            custom_data_limit: 2,
            nft_sponsor_transfer_timeout: 15,
            fungible_sponsor_transfer_timeout: 15,
            refungible_sponsor_transfer_timeout: 15,          
        }));
        
        let collection_id = create_test_collection(&CollectionMode::NFT, 1);

        let origin1 = Origin::signed(1);
        let too_big_const_data = CreateItemData::NFT(CreateNftData{
            const_data: vec![1, 2, 3, 4],
            variable_data: vec![]
        });

        assert_noop!(TemplateModule::create_item(
            origin1.clone(),
            collection_id,
            1,
            too_big_const_data
        ), Error::<Test>::TokenConstDataLimitExceeded);
    });
}

// NFT custom data size. Negative test variable_data.
#[test]
fn custom_data_size_nft_variable_data_bound_neg() {
    new_test_ext().execute_with(|| {
        assert_ok!(TemplateModule::set_chain_limits(RawOrigin::Root.into(), ChainLimits { 
            collection_numbers_limit: 10,
            account_token_ownership_limit: 10,
            collections_admins_limit: 5,
            custom_data_limit: 2,
            nft_sponsor_transfer_timeout: 15,
            fungible_sponsor_transfer_timeout: 15,
            refungible_sponsor_transfer_timeout: 15,          
        }));

        let collection_id = create_test_collection(&CollectionMode::NFT, 1);

        let origin1 = Origin::signed(1);
        let too_big_const_data = CreateItemData::NFT(CreateNftData{
            const_data: vec![],
            variable_data: vec![1, 2, 3, 4]
        });

        assert_noop!(TemplateModule::create_item(
            origin1.clone(),
            collection_id,
            1,
            too_big_const_data
        ), Error::<Test>::TokenVariableDataLimitExceeded);
    });
}

// Re fungible custom data size. Negative test const_data.
#[test]
fn custom_data_size_re_fungible_const_data_bound_neg() {
    new_test_ext().execute_with(|| {
        assert_ok!(TemplateModule::set_chain_limits(RawOrigin::Root.into(), ChainLimits { 
            collection_numbers_limit: 10,
            account_token_ownership_limit: 10,
            collections_admins_limit: 5,
            custom_data_limit: 2,
            nft_sponsor_transfer_timeout: 15,
            fungible_sponsor_transfer_timeout: 15,
            refungible_sponsor_transfer_timeout: 15,          
        }));

        let collection_id = create_test_collection(&CollectionMode::NFT, 1);

        let origin1 = Origin::signed(1);
        let too_big_const_data = CreateItemData::NFT(CreateNftData{
            const_data: vec![1, 2, 3, 4],
            variable_data: vec![]
        });

        assert_noop!(TemplateModule::create_item(
            origin1.clone(),
            collection_id,
            1,
            too_big_const_data
        ), Error::<Test>::TokenConstDataLimitExceeded);
    });
}

// Re fungible custom data size. Negative test variable_data.
#[test]
fn custom_data_size_re_fungible_variable_data_bound_neg() {
    new_test_ext().execute_with(|| {
        assert_ok!(TemplateModule::set_chain_limits(RawOrigin::Root.into(), ChainLimits { 
            collection_numbers_limit: 10,
            account_token_ownership_limit: 10,
            collections_admins_limit: 5,
            custom_data_limit: 2,
            nft_sponsor_transfer_timeout: 15,
            fungible_sponsor_transfer_timeout: 15,
            refungible_sponsor_transfer_timeout: 15,          
        }));

        let collection_id = create_test_collection(&CollectionMode::NFT, 1);

        let origin1 = Origin::signed(1);
        let too_big_const_data = CreateItemData::NFT(CreateNftData{
            const_data: vec![],
            variable_data: vec![1, 2, 3, 4]
        });

        assert_noop!(TemplateModule::create_item(
            origin1.clone(),
            collection_id,
            1,
            too_big_const_data
        ), Error::<Test>::TokenVariableDataLimitExceeded);
    });
}
// #endregion

#[test]
fn set_const_on_chain_schema() {
    new_test_ext().execute_with(|| {
        default_limits();

        let collection_id = create_test_collection(&CollectionMode::NFT, 1);

        let origin1 = Origin::signed(1);
        assert_ok!(TemplateModule::set_const_on_chain_schema(origin1, collection_id, b"test const on chain schema".to_vec()));

        assert_eq!(TemplateModule::collection(collection_id).const_on_chain_schema, b"test const on chain schema".to_vec());
        assert_eq!(TemplateModule::collection(collection_id).variable_on_chain_schema, b"".to_vec());
    });
}

#[test]
fn set_variable_on_chain_schema() {
    new_test_ext().execute_with(|| {
        default_limits();
        
        let collection_id = create_test_collection(&CollectionMode::NFT, 1);

        let origin1 = Origin::signed(1);
        assert_ok!(TemplateModule::set_variable_on_chain_schema(origin1, collection_id, b"test variable on chain schema".to_vec()));

        assert_eq!(TemplateModule::collection(collection_id).const_on_chain_schema, b"".to_vec());
        assert_eq!(TemplateModule::collection(collection_id).variable_on_chain_schema, b"test variable on chain schema".to_vec());
    });
}

#[test]
fn set_variable_meta_data_on_nft_token_stores_variable_meta_data() {
    new_test_ext().execute_with(|| {
        default_limits();

        let collection_id = create_test_collection(&CollectionMode::NFT, 1);

        let origin1 = Origin::signed(1);
        
        let data = default_nft_data();
        create_test_item(1, &data.into());
        
        let variable_data = b"test set_variable_meta_data method.".to_vec();
        assert_ok!(TemplateModule::set_variable_meta_data(origin1, collection_id, 1, variable_data.clone()));

        assert_eq!(TemplateModule::nft_item_id(collection_id, 1).variable_data, variable_data);
    });
}

#[test]
fn set_variable_meta_data_on_re_fungible_token_stores_variable_meta_data() {
    new_test_ext().execute_with(|| {
        default_limits();

        let collection_id = create_test_collection(&CollectionMode::ReFungible(3), 1);

        let origin1 = Origin::signed(1);

        let data = default_re_fungible_data();
        create_test_item(1, &data.into());

        let variable_data = b"test set_variable_meta_data method.".to_vec();
        assert_ok!(TemplateModule::set_variable_meta_data(origin1, collection_id, 1, variable_data.clone()));

        assert_eq!(TemplateModule::refungible_item_id(collection_id, 1).variable_data, variable_data);
    });
}


#[test]
fn set_variable_meta_data_on_fungible_token_fails() {
    new_test_ext().execute_with(|| {
        default_limits();

        let collection_id = create_test_collection(&CollectionMode::Fungible(3), 1);

        let origin1 = Origin::signed(1);

        let data = default_fungible_data();
        create_test_item(1, &data.into());

        let variable_data = b"test set_variable_meta_data method.".to_vec();
        assert_noop!(TemplateModule::set_variable_meta_data(origin1, collection_id, 1, variable_data.clone()), Error::<Test>::CantStoreMetadataInFungibleTokens);
    });
}

#[test]
fn set_variable_meta_data_on_nft_token_fails_for_big_data() {
    new_test_ext().execute_with(|| {
        assert_ok!(TemplateModule::set_chain_limits(RawOrigin::Root.into(), ChainLimits { 
            collection_numbers_limit: default_collection_numbers_limit(),
            account_token_ownership_limit: 10,
            collections_admins_limit: 5,
            custom_data_limit: 10,
            nft_sponsor_transfer_timeout: 15,
            fungible_sponsor_transfer_timeout: 15,
            refungible_sponsor_transfer_timeout: 15,          
        }));

        let collection_id = create_test_collection(&CollectionMode::NFT, 1);

        let origin1 = Origin::signed(1);

        let data = default_nft_data();
        create_test_item(1, &data.into());

        let variable_data = b"test set_variable_meta_data method, bigger than limits.".to_vec();
        assert_noop!(TemplateModule::set_variable_meta_data(origin1, collection_id, 1, variable_data), Error::<Test>::TokenVariableDataLimitExceeded);
    });
}

#[test]
fn set_variable_meta_data_on_re_fungible_token_fails_for_big_data() {
    new_test_ext().execute_with(|| {
        assert_ok!(TemplateModule::set_chain_limits(RawOrigin::Root.into(), ChainLimits { 
            collection_numbers_limit: default_collection_numbers_limit(),
            account_token_ownership_limit: 10,
            collections_admins_limit: 5,
            custom_data_limit: 10,
            nft_sponsor_transfer_timeout: 15,
            fungible_sponsor_transfer_timeout: 15,
            refungible_sponsor_transfer_timeout: 15,          
        }));


        let collection_id = create_test_collection(&CollectionMode::ReFungible(3), 1);

        let origin1 = Origin::signed(1);

        let data = default_re_fungible_data();
        create_test_item(1, &data.into());

        let variable_data = b"test set_variable_meta_data method, bigger than limits.".to_vec();
        assert_noop!(TemplateModule::set_variable_meta_data(origin1, collection_id, 1, variable_data), Error::<Test>::TokenVariableDataLimitExceeded);
    });
}
