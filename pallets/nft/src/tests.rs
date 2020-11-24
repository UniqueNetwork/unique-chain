// Tests to be written here
use crate::mock::*;
use crate::{AccessMode, ApprovePermissions, CollectionMode, Ownership, ChainLimits};
use frame_support::{assert_noop, assert_ok};
use frame_system::{ RawOrigin };

// Use cases tests region
// #region
#[test]
fn create_nft_item() {
    new_test_ext().execute_with(|| {
        let col_name1: Vec<u16> = "Test1\0".encode_utf16().collect::<Vec<u16>>();
        let col_desc1: Vec<u16> = "TestDescription1\0".encode_utf16().collect::<Vec<u16>>();
        let token_prefix1: Vec<u8> = b"token_prefix1\0".to_vec();
        let mode: CollectionMode = CollectionMode::NFT(2000);

        assert_ok!(TemplateModule::set_chain_limits(RawOrigin::Root.into(), ChainLimits { 
            collection_numbers_limit: 10,
            account_token_ownership_limit: 10,
            collections_admins_limit: 5,
            custom_data_limit: 2048,
            nft_sponsor_transfer_timeout: 15,
            fungible_sponsor_transfer_timeout: 15,
            refungible_sponsor_transfer_timeout: 15,          
        }));

        let origin1 = Origin::signed(1);
        assert_ok!(TemplateModule::create_collection(
            origin1.clone(),
            col_name1.clone(),
            col_desc1.clone(),
            token_prefix1.clone(),
            mode
        ));
        assert_eq!(TemplateModule::collection(1).owner, 1);

        assert_ok!(TemplateModule::create_item(
            origin1.clone(),
            1,
            [1, 2, 3].to_vec(),
            1
        ));
        assert_eq!(TemplateModule::nft_item_id(1, 1).data, [1, 2, 3].to_vec());
    });
}

// Use cases tests region
// #region
#[test]
fn create_nft_multiple_items() {
    new_test_ext().execute_with(|| {
        let col_name1: Vec<u16> = "Test1\0".encode_utf16().collect::<Vec<u16>>();
        let col_desc1: Vec<u16> = "TestDescription1\0".encode_utf16().collect::<Vec<u16>>();
        let token_prefix1: Vec<u8> = b"token_prefix1\0".to_vec();
        let mode: CollectionMode = CollectionMode::NFT(2000);

        assert_ok!(TemplateModule::set_chain_limits(RawOrigin::Root.into(), ChainLimits { 
            collection_numbers_limit: 10,
            account_token_ownership_limit: 10,
            collections_admins_limit: 5,
            custom_data_limit: 2048,
            nft_sponsor_transfer_timeout: 15,
            fungible_sponsor_transfer_timeout: 15,
            refungible_sponsor_transfer_timeout: 15,          
        }));

        let origin1 = Origin::signed(1);
        assert_ok!(TemplateModule::create_collection(
            origin1.clone(),
            col_name1.clone(),
            col_desc1.clone(),
            token_prefix1.clone(),
            mode
        ));
        assert_eq!(TemplateModule::collection(1).owner, 1);

        let properties = [[1, 2, 3].to_vec(), [3, 2, 1].to_vec(), [3, 3, 3].to_vec()].to_vec();

        assert_ok!(TemplateModule::create_multiple_items(
            origin1.clone(),
            1,
            properties.clone(),
            1
        ));
        for (index, data) in properties.iter().enumerate() {
            assert_eq!(TemplateModule::nft_item_id(1, (index + 1) as u64).data, *data);
        }
    });
}

#[test]
fn create_refungible_item() {
    new_test_ext().execute_with(|| {
        let col_name1: Vec<u16> = "Test1\0".encode_utf16().collect::<Vec<u16>>();
        let col_desc1: Vec<u16> = "TestDescription1\0".encode_utf16().collect::<Vec<u16>>();
        let token_prefix1: Vec<u8> = b"token_prefix1\0".to_vec();
        let mode: CollectionMode = CollectionMode::ReFungible(2000, 3);

        assert_ok!(TemplateModule::set_chain_limits(RawOrigin::Root.into(), ChainLimits { 
            collection_numbers_limit: 10,
            account_token_ownership_limit: 10,
            collections_admins_limit: 5,
            custom_data_limit: 2048,
            nft_sponsor_transfer_timeout: 15,
            fungible_sponsor_transfer_timeout: 15,
            refungible_sponsor_transfer_timeout: 15,          
        }));

        let origin1 = Origin::signed(1);
        assert_ok!(TemplateModule::create_collection(
            origin1.clone(),
            col_name1.clone(),
            col_desc1.clone(),
            token_prefix1.clone(),
            mode
        ));
        assert_eq!(TemplateModule::collection(1).owner, 1);

        assert_ok!(TemplateModule::create_item(
            origin1.clone(),
            1,
            [1, 2, 3].to_vec(),
            1
        ));
        assert_eq!(
            TemplateModule::refungible_item_id(1, 1).data,
            [1, 2, 3].to_vec()
        );
        assert_eq!(
            TemplateModule::refungible_item_id(1, 1).owner[0],
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
        let col_name1: Vec<u16> = "Test1\0".encode_utf16().collect::<Vec<u16>>();
        let col_desc1: Vec<u16> = "TestDescription1\0".encode_utf16().collect::<Vec<u16>>();
        let token_prefix1: Vec<u8> = b"token_prefix1\0".to_vec();
        let mode: CollectionMode = CollectionMode::ReFungible(2000, 3);

        assert_ok!(TemplateModule::set_chain_limits(RawOrigin::Root.into(), ChainLimits { 
            collection_numbers_limit: 10,
            account_token_ownership_limit: 10,
            collections_admins_limit: 5,
            custom_data_limit: 2048,
            nft_sponsor_transfer_timeout: 15,
            fungible_sponsor_transfer_timeout: 15,
            refungible_sponsor_transfer_timeout: 15,          
        }));

        let origin1 = Origin::signed(1);
        assert_ok!(TemplateModule::create_collection(
            origin1.clone(),
            col_name1.clone(),
            col_desc1.clone(),
            token_prefix1.clone(),
            mode
        ));
        assert_eq!(TemplateModule::collection(1).owner, 1);

        let properties = [[1, 2, 3].to_vec(), [3, 2, 1].to_vec(), [3, 3, 3].to_vec()].to_vec();

        assert_ok!(TemplateModule::create_multiple_items(
            origin1.clone(),
            1,
            properties.clone(),
            1
        ));
        for (index, data) in properties.iter().enumerate() {

            let item = TemplateModule::refungible_item_id(1, (index + 1) as u64);
            assert_eq!(item.data, *data);
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
        let col_name1: Vec<u16> = "Test1\0".encode_utf16().collect::<Vec<u16>>();
        let col_desc1: Vec<u16> = "TestDescription1\0".encode_utf16().collect::<Vec<u16>>();
        let token_prefix1: Vec<u8> = b"token_prefix1\0".to_vec();
        let mode: CollectionMode = CollectionMode::Fungible(3);

        assert_ok!(TemplateModule::set_chain_limits(RawOrigin::Root.into(), ChainLimits { 
            collection_numbers_limit: 10,
            account_token_ownership_limit: 10,
            collections_admins_limit: 5,
            custom_data_limit: 2048,
            nft_sponsor_transfer_timeout: 15,
            fungible_sponsor_transfer_timeout: 15,
            refungible_sponsor_transfer_timeout: 15,          
        }));

        let origin1 = Origin::signed(1);
        assert_ok!(TemplateModule::create_collection(
            origin1.clone(),
            col_name1.clone(),
            col_desc1.clone(),
            token_prefix1.clone(),
            mode
        ));
        assert_eq!(TemplateModule::collection(1).owner, 1);

        assert_ok!(TemplateModule::create_item(
            origin1.clone(),
            1,
            [].to_vec(),
            1
        ));
        assert_eq!(TemplateModule::fungible_item_id(1, 1).owner, 1);
    });
}

#[test]
fn create_multiple_fungible_items() {
    new_test_ext().execute_with(|| {
        let col_name1: Vec<u16> = "Test1\0".encode_utf16().collect::<Vec<u16>>();
        let col_desc1: Vec<u16> = "TestDescription1\0".encode_utf16().collect::<Vec<u16>>();
        let token_prefix1: Vec<u8> = b"token_prefix1\0".to_vec();
        let mode: CollectionMode = CollectionMode::Fungible(3);

        assert_ok!(TemplateModule::set_chain_limits(RawOrigin::Root.into(), ChainLimits { 
            collection_numbers_limit: 10,
            account_token_ownership_limit: 10,
            collections_admins_limit: 5,
            custom_data_limit: 2048,
            nft_sponsor_transfer_timeout: 15,
            fungible_sponsor_transfer_timeout: 15,
            refungible_sponsor_transfer_timeout: 15,          
        }));

        let origin1 = Origin::signed(1);
        assert_ok!(TemplateModule::create_collection(
            origin1.clone(),
            col_name1.clone(),
            col_desc1.clone(),
            token_prefix1.clone(),
            mode
        ));
        assert_eq!(TemplateModule::collection(1).owner, 1);

        let properties = [[].to_vec(), [].to_vec(), [].to_vec()].to_vec();

        assert_ok!(TemplateModule::create_multiple_items(
            origin1.clone(),
            1,
            properties.clone(),
            1
        ));
        
        for (index, _) in properties.iter().enumerate() {
            assert_eq!(TemplateModule::fungible_item_id(1, (index + 1) as u64).owner, 1);
        }
        assert_eq!(TemplateModule::balance_count(1, 1), 3000);
        assert_eq!(TemplateModule::address_tokens(1, 1), [1, 2, 3]);
    });
}

#[test]
fn transfer_fungible_item() {
    new_test_ext().execute_with(|| {
        let col_name1: Vec<u16> = "Test1\0".encode_utf16().collect::<Vec<u16>>();
        let col_desc1: Vec<u16> = "TestDescription1\0".encode_utf16().collect::<Vec<u16>>();
        let token_prefix1: Vec<u8> = b"token_prefix1\0".to_vec();
        let mode: CollectionMode = CollectionMode::Fungible(3);

        assert_ok!(TemplateModule::set_chain_limits(RawOrigin::Root.into(), ChainLimits { 
            collection_numbers_limit: 10,
            account_token_ownership_limit: 10,
            collections_admins_limit: 5,
            custom_data_limit: 2048,
            nft_sponsor_transfer_timeout: 15,
            fungible_sponsor_transfer_timeout: 15,
            refungible_sponsor_transfer_timeout: 15,          
        }));

        let origin1 = Origin::signed(1);
        let origin2 = Origin::signed(2);
        assert_ok!(TemplateModule::create_collection(
            origin1.clone(),
            col_name1.clone(),
            col_desc1.clone(),
            token_prefix1.clone(),
            mode
        ));
        assert_eq!(TemplateModule::collection(1).owner, 1);

        assert_ok!(TemplateModule::create_item(
            origin1.clone(),
            1,
            [].to_vec(),
            1
        ));
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
        let col_name1: Vec<u16> = "Test1\0".encode_utf16().collect::<Vec<u16>>();
        let col_desc1: Vec<u16> = "TestDescription1\0".encode_utf16().collect::<Vec<u16>>();
        let token_prefix1: Vec<u8> = b"token_prefix1\0".to_vec();
        let mode: CollectionMode = CollectionMode::ReFungible(2000, 3);

        assert_ok!(TemplateModule::set_chain_limits(RawOrigin::Root.into(), ChainLimits { 
            collection_numbers_limit: 10,
            account_token_ownership_limit: 10,
            collections_admins_limit: 5,
            custom_data_limit: 2048,
            nft_sponsor_transfer_timeout: 15,
            fungible_sponsor_transfer_timeout: 15,
            refungible_sponsor_transfer_timeout: 15,          
        }));

        let origin1 = Origin::signed(1);
        let origin2 = Origin::signed(2);
        assert_ok!(TemplateModule::create_collection(
            origin1.clone(),
            col_name1.clone(),
            col_desc1.clone(),
            token_prefix1.clone(),
            mode
        ));
        assert_eq!(TemplateModule::collection(1).owner, 1);

        assert_ok!(TemplateModule::create_item(
            origin1.clone(),
            1,
            [1, 2, 3].to_vec(),
            1
        ));
        assert_eq!(
            TemplateModule::refungible_item_id(1, 1).data,
            [1, 2, 3].to_vec()
        );
        assert_eq!(
            TemplateModule::refungible_item_id(1, 1).owner[0],
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
        let col_name1: Vec<u16> = "Test1\0".encode_utf16().collect::<Vec<u16>>();
        let col_desc1: Vec<u16> = "TestDescription1\0".encode_utf16().collect::<Vec<u16>>();
        let token_prefix1: Vec<u8> = b"token_prefix1\0".to_vec();
        let mode: CollectionMode = CollectionMode::NFT(2000);

        assert_ok!(TemplateModule::set_chain_limits(RawOrigin::Root.into(), ChainLimits { 
            collection_numbers_limit: 10,
            account_token_ownership_limit: 10,
            collections_admins_limit: 5,
            custom_data_limit: 2048,
            nft_sponsor_transfer_timeout: 15,
            fungible_sponsor_transfer_timeout: 15,
            refungible_sponsor_transfer_timeout: 15,          
        }));

        let origin1 = Origin::signed(1);
        assert_ok!(TemplateModule::create_collection(
            origin1.clone(),
            col_name1.clone(),
            col_desc1.clone(),
            token_prefix1.clone(),
            mode
        ));
        assert_eq!(TemplateModule::collection(1).owner, 1);

        assert_ok!(TemplateModule::create_item(
            origin1.clone(),
            1,
            [1, 2, 3].to_vec(),
            1
        ));
        assert_eq!(TemplateModule::nft_item_id(1, 1).data, [1, 2, 3].to_vec());
        assert_eq!(TemplateModule::balance_count(1, 1), 1);
        assert_eq!(TemplateModule::address_tokens(1, 1), [1]);

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
        let col_name1: Vec<u16> = "Test1\0".encode_utf16().collect::<Vec<u16>>();
        let col_desc1: Vec<u16> = "TestDescription1\0".encode_utf16().collect::<Vec<u16>>();
        let token_prefix1: Vec<u8> = b"token_prefix1\0".to_vec();
        let mode: CollectionMode = CollectionMode::NFT(2000);

        assert_ok!(TemplateModule::set_chain_limits(RawOrigin::Root.into(), ChainLimits { 
            collection_numbers_limit: 10,
            account_token_ownership_limit: 10,
            collections_admins_limit: 5,
            custom_data_limit: 2048,
            nft_sponsor_transfer_timeout: 15,
            fungible_sponsor_transfer_timeout: 15,
            refungible_sponsor_transfer_timeout: 15,          
        }));

        let origin1 = Origin::signed(1);
        let origin2 = Origin::signed(2);
        assert_ok!(TemplateModule::create_collection(
            origin1.clone(),
            col_name1.clone(),
            col_desc1.clone(),
            token_prefix1.clone(),
            mode
        ));
        assert_eq!(TemplateModule::collection(1).owner, 1);

        assert_ok!(TemplateModule::create_item(
            origin1.clone(),
            1,
            [1, 2, 3].to_vec(),
            1
        ));
        assert_eq!(TemplateModule::nft_item_id(1, 1).data, [1, 2, 3].to_vec());
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
        let col_name1: Vec<u16> = "Test1\0".encode_utf16().collect::<Vec<u16>>();
        let col_desc1: Vec<u16> = "TestDescription1\0".encode_utf16().collect::<Vec<u16>>();
        let token_prefix1: Vec<u8> = b"token_prefix1\0".to_vec();
        let mode: CollectionMode = CollectionMode::ReFungible(2000, 3);

        assert_ok!(TemplateModule::set_chain_limits(RawOrigin::Root.into(), ChainLimits { 
            collection_numbers_limit: 10,
            account_token_ownership_limit: 10,
            collections_admins_limit: 5,
            custom_data_limit: 2048,
            nft_sponsor_transfer_timeout: 15,
            fungible_sponsor_transfer_timeout: 15,
            refungible_sponsor_transfer_timeout: 15,          
        }));

        let origin1 = Origin::signed(1);
        let origin2 = Origin::signed(2);
        assert_ok!(TemplateModule::create_collection(
            origin1.clone(),
            col_name1.clone(),
            col_desc1.clone(),
            token_prefix1.clone(),
            mode
        ));
        assert_eq!(TemplateModule::collection(1).owner, 1);

        assert_ok!(TemplateModule::create_item(
            origin1.clone(),
            1,
            [1, 2, 3].to_vec(),
            1
        ));
        assert_eq!(
            TemplateModule::refungible_item_id(1, 1).data,
            [1, 2, 3].to_vec()
        );
        assert_eq!(
            TemplateModule::refungible_item_id(1, 1).owner[0],
            Ownership {
                owner: 1,
                fraction: 1000
            }
        );
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
        let col_name1: Vec<u16> = "Test1\0".encode_utf16().collect::<Vec<u16>>();
        let col_desc1: Vec<u16> = "TestDescription1\0".encode_utf16().collect::<Vec<u16>>();
        let token_prefix1: Vec<u8> = b"token_prefix1\0".to_vec();
        let mode: CollectionMode = CollectionMode::Fungible(3);

        assert_ok!(TemplateModule::set_chain_limits(RawOrigin::Root.into(), ChainLimits { 
            collection_numbers_limit: 10,
            account_token_ownership_limit: 10,
            collections_admins_limit: 5,
            custom_data_limit: 2048,
            nft_sponsor_transfer_timeout: 15,
            fungible_sponsor_transfer_timeout: 15,
            refungible_sponsor_transfer_timeout: 15,          
        }));

        let origin1 = Origin::signed(1);
        let origin2 = Origin::signed(2);
        assert_ok!(TemplateModule::create_collection(
            origin1.clone(),
            col_name1.clone(),
            col_desc1.clone(),
            token_prefix1.clone(),
            mode
        ));
        assert_eq!(TemplateModule::collection(1).owner, 1);

        assert_ok!(TemplateModule::create_item(
            origin1.clone(),
            1,
            [].to_vec(),
            1
        ));
        assert_eq!(TemplateModule::fungible_item_id(1, 1).owner, 1);
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
        let col_name1: Vec<u16> = "Test1\0".encode_utf16().collect::<Vec<u16>>();
        let col_desc1: Vec<u16> = "TestDescription1\0".encode_utf16().collect::<Vec<u16>>();
        let token_prefix1: Vec<u8> = b"token_prefix1\0".to_vec();
        let mode: CollectionMode = CollectionMode::NFT(2000);

        assert_ok!(TemplateModule::set_chain_limits(RawOrigin::Root.into(), ChainLimits { 
            collection_numbers_limit: 10,
            account_token_ownership_limit: 10,
            collections_admins_limit: 5,
            custom_data_limit: 2048,
            nft_sponsor_transfer_timeout: 15,
            fungible_sponsor_transfer_timeout: 15,
            refungible_sponsor_transfer_timeout: 15,          
        }));

        let origin1 = Origin::signed(1);
        assert_ok!(TemplateModule::create_collection(
            origin1.clone(),
            col_name1.clone(),
            col_desc1.clone(),
            token_prefix1.clone(),
            mode
        ));
        assert_ok!(TemplateModule::change_collection_owner(
            origin1.clone(),
            1,
            2
        ));
        assert_eq!(TemplateModule::collection(1).owner, 2);
    });
}

#[test]
fn destroy_collection() {
    new_test_ext().execute_with(|| {
        let col_name1: Vec<u16> = "Test1\0".encode_utf16().collect::<Vec<u16>>();
        let col_desc1: Vec<u16> = "TestDescription1\0".encode_utf16().collect::<Vec<u16>>();
        let token_prefix1: Vec<u8> = b"token_prefix1\0".to_vec();
        let mode: CollectionMode = CollectionMode::NFT(2000);

        assert_ok!(TemplateModule::set_chain_limits(RawOrigin::Root.into(), ChainLimits { 
            collection_numbers_limit: 10,
            account_token_ownership_limit: 10,
            collections_admins_limit: 5,
            custom_data_limit: 2048,
            nft_sponsor_transfer_timeout: 15,
            fungible_sponsor_transfer_timeout: 15,
            refungible_sponsor_transfer_timeout: 15,          
        }));

        let origin1 = Origin::signed(1);
        assert_ok!(TemplateModule::create_collection(
            origin1.clone(),
            col_name1.clone(),
            col_desc1.clone(),
            token_prefix1.clone(),
            mode
        ));
        assert_ok!(TemplateModule::destroy_collection(origin1.clone(), 1));
    });
}

#[test]
fn burn_nft_item() {
    new_test_ext().execute_with(|| {
        let col_name1: Vec<u16> = "Test1\0".encode_utf16().collect::<Vec<u16>>();
        let col_desc1: Vec<u16> = "TestDescription1\0".encode_utf16().collect::<Vec<u16>>();
        let token_prefix1: Vec<u8> = b"token_prefix1\0".to_vec();
        let mode: CollectionMode = CollectionMode::NFT(2000);

        assert_ok!(TemplateModule::set_chain_limits(RawOrigin::Root.into(), ChainLimits { 
            collection_numbers_limit: 10,
            account_token_ownership_limit: 10,
            collections_admins_limit: 5,
            custom_data_limit: 2048,
            nft_sponsor_transfer_timeout: 15,
            fungible_sponsor_transfer_timeout: 15,
            refungible_sponsor_transfer_timeout: 15,          
        }));

        let origin1 = Origin::signed(1);
        assert_ok!(TemplateModule::create_collection(
            origin1.clone(),
            col_name1.clone(),
            col_desc1.clone(),
            token_prefix1.clone(),
            mode
        ));
        assert_ok!(TemplateModule::add_collection_admin(origin1.clone(), 1, 2));
        assert_ok!(TemplateModule::create_item(
            origin1.clone(),
            1,
            [1, 2, 3].to_vec(),
            1
        ));

        assert_eq!(TemplateModule::nft_item_id(1, 1).data, [1, 2, 3].to_vec());

        // check balance (collection with id = 1, user id = 1)
        assert_eq!(TemplateModule::balance_count(1, 1), 1);

        // burn item
        assert_ok!(TemplateModule::burn_item(origin1.clone(), 1, 1));
        assert_noop!(
            TemplateModule::burn_item(origin1.clone(), 1, 1),
            "Item does not exists"
        );

        assert_eq!(TemplateModule::balance_count(1, 1), 0);
    });
}

#[test]
fn burn_fungible_item() {
    new_test_ext().execute_with(|| {
        let col_name1: Vec<u16> = "Test1\0".encode_utf16().collect::<Vec<u16>>();
        let col_desc1: Vec<u16> = "TestDescription1\0".encode_utf16().collect::<Vec<u16>>();
        let token_prefix1: Vec<u8> = b"token_prefix1\0".to_vec();
        let mode: CollectionMode = CollectionMode::Fungible(3);

        assert_ok!(TemplateModule::set_chain_limits(RawOrigin::Root.into(), ChainLimits { 
            collection_numbers_limit: 10,
            account_token_ownership_limit: 10,
            collections_admins_limit: 5,
            custom_data_limit: 2048,
            nft_sponsor_transfer_timeout: 15,
            fungible_sponsor_transfer_timeout: 15,
            refungible_sponsor_transfer_timeout: 15,          
        }));

        let origin1 = Origin::signed(1);
        assert_ok!(TemplateModule::create_collection(
            origin1.clone(),
            col_name1.clone(),
            col_desc1.clone(),
            token_prefix1.clone(),
            mode
        ));
        assert_ok!(TemplateModule::add_collection_admin(origin1.clone(), 1, 2));
        assert_ok!(TemplateModule::create_item(
            origin1.clone(),
            1,
            [].to_vec(),
            1
        ));

        // check balance (collection with id = 1, user id = 1)
        assert_eq!(TemplateModule::balance_count(1, 1), 1000);

        // burn item
        assert_ok!(TemplateModule::burn_item(origin1.clone(), 1, 1));
        assert_noop!(
            TemplateModule::burn_item(origin1.clone(), 1, 1),
            "Item does not exists"
        );

        assert_eq!(TemplateModule::balance_count(1, 1), 0);
    });
}

#[test]
fn burn_refungible_item() {
    new_test_ext().execute_with(|| {
        let col_name1: Vec<u16> = "Test1\0".encode_utf16().collect::<Vec<u16>>();
        let col_desc1: Vec<u16> = "TestDescription1\0".encode_utf16().collect::<Vec<u16>>();
        let token_prefix1: Vec<u8> = b"token_prefix1\0".to_vec();
        let mode: CollectionMode = CollectionMode::ReFungible(200, 3);

        assert_ok!(TemplateModule::set_chain_limits(RawOrigin::Root.into(), ChainLimits { 
            collection_numbers_limit: 10,
            account_token_ownership_limit: 10,
            collections_admins_limit: 5,
            custom_data_limit: 2048,
            nft_sponsor_transfer_timeout: 15,
            fungible_sponsor_transfer_timeout: 15,
            refungible_sponsor_transfer_timeout: 15,          
        }));

        let origin1 = Origin::signed(1);
        let origin2 = Origin::signed(2);
        assert_ok!(TemplateModule::create_collection(
            origin1.clone(),
            col_name1.clone(),
            col_desc1.clone(),
            token_prefix1.clone(),
            mode
        ));

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

        assert_ok!(TemplateModule::add_collection_admin(origin1.clone(), 1, 2));
        assert_ok!(TemplateModule::create_item(
            origin2.clone(),
            1,
            [1, 2, 3].to_vec(),
            1
        ));

        assert_eq!(
            TemplateModule::refungible_item_id(1, 1).data,
            [1, 2, 3].to_vec()
        );

        // check balance (collection with id = 1, user id = 2)
        assert_eq!(TemplateModule::balance_count(1, 1), 1000);

        // burn item
        assert_ok!(TemplateModule::burn_item(origin1.clone(), 1, 1));
        assert_noop!(
            TemplateModule::burn_item(origin1.clone(), 1, 1),
            "Item does not exists"
        );

        assert_eq!(TemplateModule::balance_count(1, 1), 0);
    });
}

#[test]
fn add_collection_admin() {
    new_test_ext().execute_with(|| {
        let col_name1: Vec<u16> = "Test1\0".encode_utf16().collect::<Vec<u16>>();
        let col_desc1: Vec<u16> = "TestDescription1\0".encode_utf16().collect::<Vec<u16>>();
        let token_prefix1: Vec<u8> = b"token_prefix1\0".to_vec();
        let mode: CollectionMode = CollectionMode::NFT(2000);

        assert_ok!(TemplateModule::set_chain_limits(RawOrigin::Root.into(), ChainLimits { 
            collection_numbers_limit: 10,
            account_token_ownership_limit: 10,
            collections_admins_limit: 5,
            custom_data_limit: 2048,
            nft_sponsor_transfer_timeout: 15,
            fungible_sponsor_transfer_timeout: 15,
            refungible_sponsor_transfer_timeout: 15,          
        }));

        let origin1 = Origin::signed(1);
        let origin2 = Origin::signed(2);
        let origin3 = Origin::signed(3);
        assert_ok!(TemplateModule::create_collection(
            origin1.clone(),
            col_name1.clone(),
            col_desc1.clone(),
            token_prefix1.clone(),
            mode.clone()
        ));
        assert_ok!(TemplateModule::create_collection(
            origin2.clone(),
            col_name1.clone(),
            col_desc1.clone(),
            token_prefix1.clone(),
            mode.clone()
        ));
        assert_ok!(TemplateModule::create_collection(
            origin3.clone(),
            col_name1.clone(),
            col_desc1.clone(),
            token_prefix1.clone(),
            mode.clone()
        ));

        assert_eq!(TemplateModule::collection(1).owner, 1);
        assert_eq!(TemplateModule::collection(2).owner, 2);
        assert_eq!(TemplateModule::collection(3).owner, 3);

        // collection admin
        assert_ok!(TemplateModule::add_collection_admin(origin1.clone(), 1, 2));
        assert_ok!(TemplateModule::add_collection_admin(origin1.clone(), 1, 3));

        assert_eq!(TemplateModule::admin_list_collection(1).contains(&2), true);
        assert_eq!(TemplateModule::admin_list_collection(1).contains(&3), true);
    });
}

#[test]
fn remove_collection_admin() {
    new_test_ext().execute_with(|| {
        let col_name1: Vec<u16> = "Test1\0".encode_utf16().collect::<Vec<u16>>();
        let col_desc1: Vec<u16> = "TestDescription1\0".encode_utf16().collect::<Vec<u16>>();
        let token_prefix1: Vec<u8> = b"token_prefix1\0".to_vec();
        let mode: CollectionMode = CollectionMode::NFT(2000);

        let origin1 = Origin::signed(1);
        let origin2 = Origin::signed(2);
        let origin3 = Origin::signed(3);

        assert_ok!(TemplateModule::set_chain_limits(RawOrigin::Root.into(), ChainLimits { 
            collection_numbers_limit: 10,
            account_token_ownership_limit: 10,
            collections_admins_limit: 5,
            custom_data_limit: 2048,
            nft_sponsor_transfer_timeout: 15,
            fungible_sponsor_transfer_timeout: 15,
            refungible_sponsor_transfer_timeout: 15,          
        }));

        assert_ok!(TemplateModule::create_collection(
            origin1.clone(),
            col_name1.clone(),
            col_desc1.clone(),
            token_prefix1.clone(),
            mode.clone()
        ));
        assert_ok!(TemplateModule::create_collection(
            origin2.clone(),
            col_name1.clone(),
            col_desc1.clone(),
            token_prefix1.clone(),
            mode.clone()
        ));
        assert_ok!(TemplateModule::create_collection(
            origin3.clone(),
            col_name1.clone(),
            col_desc1.clone(),
            token_prefix1.clone(),
            mode.clone()
        ));

        assert_eq!(TemplateModule::collection(1).owner, 1);
        assert_eq!(TemplateModule::collection(2).owner, 2);
        assert_eq!(TemplateModule::collection(3).owner, 3);

        // collection admin
        assert_ok!(TemplateModule::add_collection_admin(origin1.clone(), 1, 2));
        assert_ok!(TemplateModule::add_collection_admin(origin1.clone(), 1, 3));

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
        let col_name1: Vec<u16> = "Test1\0".encode_utf16().collect::<Vec<u16>>();
        let col_desc1: Vec<u16> = "TestDescription1\0".encode_utf16().collect::<Vec<u16>>();
        let token_prefix1: Vec<u8> = b"token_prefix1\0".to_vec();
        let nft_mode: CollectionMode = CollectionMode::NFT(2000);
        let furg_mode: CollectionMode = CollectionMode::Fungible(3);
        let refung_mode: CollectionMode = CollectionMode::ReFungible(2000, 3);

        let origin1 = Origin::signed(1);

        assert_ok!(TemplateModule::set_chain_limits(RawOrigin::Root.into(), ChainLimits { 
            collection_numbers_limit: 10,
            account_token_ownership_limit: 10,
            collections_admins_limit: 5,
            custom_data_limit: 2048,
            nft_sponsor_transfer_timeout: 15,
            fungible_sponsor_transfer_timeout: 15,
            refungible_sponsor_transfer_timeout: 15,          
        }));

        assert_ok!(TemplateModule::create_collection(
            origin1.clone(),
            col_name1.clone(),
            col_desc1.clone(),
            token_prefix1.clone(),
            nft_mode.clone()
        ));
        assert_ok!(TemplateModule::create_collection(
            origin1.clone(),
            col_name1.clone(),
            col_desc1.clone(),
            token_prefix1.clone(),
            furg_mode.clone()
        ));
        assert_ok!(TemplateModule::create_collection(
            origin1.clone(),
            col_name1.clone(),
            col_desc1.clone(),
            token_prefix1.clone(),
            refung_mode.clone()
        ));

        assert_eq!(TemplateModule::collection(1).owner, 1);
        assert_eq!(TemplateModule::collection(2).owner, 1);
        assert_eq!(TemplateModule::collection(3).owner, 1);

        // check balance before
        assert_eq!(TemplateModule::balance_count(1, 1), 0);
        assert_eq!(TemplateModule::balance_count(2, 1), 0);
        assert_eq!(TemplateModule::balance_count(3, 1), 0);

        // create item
        assert_ok!(TemplateModule::create_item(
            origin1.clone(),
            1,
            [1, 1, 1].to_vec(),
            1
        ));

        assert_ok!(TemplateModule::create_item(
            origin1.clone(),
            2,
            [].to_vec(),
            1
        ));

        assert_ok!(TemplateModule::create_item(
            origin1.clone(),
            3,
            [1, 1, 1].to_vec(),
            1
        ));

        // check balance (collection with id = 1, user id = 1)
        assert_eq!(TemplateModule::balance_count(1, 1), 1);
        assert_eq!(TemplateModule::balance_count(2, 1), 1000);
        assert_eq!(TemplateModule::balance_count(3, 1), 1000);
        assert_eq!(TemplateModule::nft_item_id(1, 1).owner, 1);
        assert_eq!(TemplateModule::fungible_item_id(2, 1).owner, 1);
        assert_eq!(TemplateModule::refungible_item_id(3, 1).owner[0].owner, 1);
    });
}

#[test]
fn approve() {
    new_test_ext().execute_with(|| {
        let col_name1: Vec<u16> = "Test1\0".encode_utf16().collect::<Vec<u16>>();
        let col_desc1: Vec<u16> = "TestDescription1\0".encode_utf16().collect::<Vec<u16>>();
        let token_prefix1: Vec<u8> = b"token_prefix1\0".to_vec();
        let nft_mode: CollectionMode = CollectionMode::NFT(2000);
        let origin1 = Origin::signed(1);

        assert_ok!(TemplateModule::set_chain_limits(RawOrigin::Root.into(), ChainLimits { 
            collection_numbers_limit: 10,
            account_token_ownership_limit: 10,
            collections_admins_limit: 5,
            custom_data_limit: 2048,
            nft_sponsor_transfer_timeout: 15,
            fungible_sponsor_transfer_timeout: 15,
            refungible_sponsor_transfer_timeout: 15,          
        }));

        assert_ok!(TemplateModule::create_collection(
            origin1.clone(),
            col_name1.clone(),
            col_desc1.clone(),
            token_prefix1.clone(),
            nft_mode.clone()
        ));

        assert_eq!(TemplateModule::collection(1).owner, 1);

        // create item
        assert_ok!(TemplateModule::create_item(
            origin1.clone(),
            1,
            [1, 1, 1].to_vec(),
            1
        ));

        // approve
        assert_ok!(TemplateModule::approve(origin1.clone(), 2, 1, 1));
        assert_eq!(TemplateModule::approved(1, (1, 1))[0].approved, 2);
    });
}

#[test]
fn transfer_from() {
    new_test_ext().execute_with(|| {
        let col_name1: Vec<u16> = "Test1\0".encode_utf16().collect::<Vec<u16>>();
        let col_desc1: Vec<u16> = "TestDescription1\0".encode_utf16().collect::<Vec<u16>>();
        let token_prefix1: Vec<u8> = b"token_prefix1\0".to_vec();
        let mode: CollectionMode = CollectionMode::NFT(2000);
        let origin1 = Origin::signed(1);
        let origin2 = Origin::signed(2);

        assert_ok!(TemplateModule::set_chain_limits(RawOrigin::Root.into(), ChainLimits { 
            collection_numbers_limit: 10,
            account_token_ownership_limit: 10,
            collections_admins_limit: 5,
            custom_data_limit: 2048,
            nft_sponsor_transfer_timeout: 15,
            fungible_sponsor_transfer_timeout: 15,
            refungible_sponsor_transfer_timeout: 15,          
        }));

        assert_ok!(TemplateModule::create_collection(
            origin1.clone(),
            col_name1.clone(),
            col_desc1.clone(),
            token_prefix1.clone(),
            mode
        ));

        assert_eq!(TemplateModule::collection(1).owner, 1);

        // create item
        assert_ok!(TemplateModule::create_item(
            origin1.clone(),
            1,
            [1, 1, 1].to_vec(),
            1
        ));

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
        let col_name1: Vec<u16> = "Test1\0".encode_utf16().collect::<Vec<u16>>();
        let col_desc1: Vec<u16> = "TestDescription1\0".encode_utf16().collect::<Vec<u16>>();
        let token_prefix1: Vec<u8> = b"token_prefix1\0".to_vec();
        let mode: CollectionMode = CollectionMode::NFT(2000);
        let origin1 = Origin::signed(1);

        assert_ok!(TemplateModule::set_chain_limits(RawOrigin::Root.into(), ChainLimits { 
            collection_numbers_limit: 10,
            account_token_ownership_limit: 10,
            collections_admins_limit: 5,
            custom_data_limit: 2048,
            nft_sponsor_transfer_timeout: 15,
            fungible_sponsor_transfer_timeout: 15,
            refungible_sponsor_transfer_timeout: 15,          
        }));

        assert_ok!(TemplateModule::create_collection(
            origin1.clone(),
            col_name1.clone(),
            col_desc1.clone(),
            token_prefix1.clone(),
            mode
        ));

        assert_ok!(TemplateModule::add_to_white_list(origin1.clone(), 1, 2));
        assert_eq!(TemplateModule::white_list(1)[0], 2);
    });
}

#[test]
fn admin_can_add_address_to_white_list() {
    new_test_ext().execute_with(|| {
        let col_name1: Vec<u16> = "Test1\0".encode_utf16().collect::<Vec<u16>>();
        let col_desc1: Vec<u16> = "TestDescription1\0".encode_utf16().collect::<Vec<u16>>();
        let token_prefix1: Vec<u8> = b"token_prefix1\0".to_vec();
        let mode: CollectionMode = CollectionMode::NFT(2000);
        let origin1 = Origin::signed(1);
        let origin2 = Origin::signed(2);

        assert_ok!(TemplateModule::set_chain_limits(RawOrigin::Root.into(), ChainLimits { 
            collection_numbers_limit: 10,
            account_token_ownership_limit: 10,
            collections_admins_limit: 5,
            custom_data_limit: 2048,
            nft_sponsor_transfer_timeout: 15,
            fungible_sponsor_transfer_timeout: 15,
            refungible_sponsor_transfer_timeout: 15,          
        }));

        assert_ok!(TemplateModule::create_collection(
            origin1.clone(),
            col_name1.clone(),
            col_desc1.clone(),
            token_prefix1.clone(),
            mode
        ));

        assert_ok!(TemplateModule::add_collection_admin(origin1.clone(), 1, 2));
        assert_ok!(TemplateModule::add_to_white_list(origin2.clone(), 1, 3));
        assert_eq!(TemplateModule::white_list(1)[0], 3);
    });
}

#[test]
fn nonprivileged_user_cannot_add_address_to_white_list() {
    new_test_ext().execute_with(|| {
        let col_name1: Vec<u16> = "Test1\0".encode_utf16().collect::<Vec<u16>>();
        let col_desc1: Vec<u16> = "TestDescription1\0".encode_utf16().collect::<Vec<u16>>();
        let token_prefix1: Vec<u8> = b"token_prefix1\0".to_vec();
        let mode: CollectionMode = CollectionMode::NFT(2000);
        let origin1 = Origin::signed(1);
        let origin2 = Origin::signed(2);

        assert_ok!(TemplateModule::set_chain_limits(RawOrigin::Root.into(), ChainLimits { 
            collection_numbers_limit: 10,
            account_token_ownership_limit: 10,
            collections_admins_limit: 5,
            custom_data_limit: 2048,
            nft_sponsor_transfer_timeout: 15,
            fungible_sponsor_transfer_timeout: 15,
            refungible_sponsor_transfer_timeout: 15,          
        }));

        assert_ok!(TemplateModule::create_collection(
            origin1.clone(),
            col_name1.clone(),
            col_desc1.clone(),
            token_prefix1.clone(),
            mode
        ));

        assert_noop!(
            TemplateModule::add_to_white_list(origin2.clone(), 1, 3),
            "You do not have permissions to modify this collection"
        );
    });
}

#[test]
fn nobody_can_add_address_to_white_list_of_nonexisting_collection() {
    new_test_ext().execute_with(|| {
        let origin1 = Origin::signed(1);

        assert_ok!(TemplateModule::set_chain_limits(RawOrigin::Root.into(), ChainLimits { 
            collection_numbers_limit: 10,
            account_token_ownership_limit: 10,
            collections_admins_limit: 5,
            custom_data_limit: 2048,
            nft_sponsor_transfer_timeout: 15,
            fungible_sponsor_transfer_timeout: 15,
            refungible_sponsor_transfer_timeout: 15,          
        }));

        assert_noop!(
            TemplateModule::add_to_white_list(origin1.clone(), 1, 2),
            "This collection does not exist"
        );
    });
}

#[test]
fn nobody_can_add_address_to_white_list_of_deleted_collection() {
    new_test_ext().execute_with(|| {
        let col_name1: Vec<u16> = "Test1\0".encode_utf16().collect::<Vec<u16>>();
        let col_desc1: Vec<u16> = "TestDescription1\0".encode_utf16().collect::<Vec<u16>>();
        let token_prefix1: Vec<u8> = b"token_prefix1\0".to_vec();
        let mode: CollectionMode = CollectionMode::NFT(2000);
        let origin1 = Origin::signed(1);

        assert_ok!(TemplateModule::set_chain_limits(RawOrigin::Root.into(), ChainLimits { 
            collection_numbers_limit: 10,
            account_token_ownership_limit: 10,
            collections_admins_limit: 5,
            custom_data_limit: 2048,
            nft_sponsor_transfer_timeout: 15,
            fungible_sponsor_transfer_timeout: 15,
            refungible_sponsor_transfer_timeout: 15,          
        }));

        assert_ok!(TemplateModule::create_collection(
            origin1.clone(),
            col_name1.clone(),
            col_desc1.clone(),
            token_prefix1.clone(),
            mode
        ));

        assert_ok!(TemplateModule::destroy_collection(origin1.clone(), 1));
        assert_noop!(
            TemplateModule::add_to_white_list(origin1.clone(), 1, 2),
            "This collection does not exist"
        );
    });
}

// If address is already added to white list, nothing happens
#[test]
fn address_is_already_added_to_white_list() {
    new_test_ext().execute_with(|| {
        let col_name1: Vec<u16> = "Test1\0".encode_utf16().collect::<Vec<u16>>();
        let col_desc1: Vec<u16> = "TestDescription1\0".encode_utf16().collect::<Vec<u16>>();
        let token_prefix1: Vec<u8> = b"token_prefix1\0".to_vec();
        let mode: CollectionMode = CollectionMode::NFT(2000);
        let origin1 = Origin::signed(1);

        assert_ok!(TemplateModule::set_chain_limits(RawOrigin::Root.into(), ChainLimits { 
            collection_numbers_limit: 10,
            account_token_ownership_limit: 10,
            collections_admins_limit: 5,
            custom_data_limit: 2048,
            nft_sponsor_transfer_timeout: 15,
            fungible_sponsor_transfer_timeout: 15,
            refungible_sponsor_transfer_timeout: 15,          
        }));

        assert_ok!(TemplateModule::create_collection(
            origin1.clone(),
            col_name1.clone(),
            col_desc1.clone(),
            token_prefix1.clone(),
            mode
        ));

        assert_ok!(TemplateModule::add_to_white_list(origin1.clone(), 1, 2));
        assert_ok!(TemplateModule::add_to_white_list(origin1.clone(), 1, 2));
        assert_eq!(TemplateModule::white_list(1)[0], 2);
        assert_eq!(TemplateModule::white_list(1).len(), 1);
    });
}

#[test]
fn owner_can_remove_address_from_white_list() {
    new_test_ext().execute_with(|| {
        let col_name1: Vec<u16> = "Test1\0".encode_utf16().collect::<Vec<u16>>();
        let col_desc1: Vec<u16> = "TestDescription1\0".encode_utf16().collect::<Vec<u16>>();
        let token_prefix1: Vec<u8> = b"token_prefix1\0".to_vec();
        let mode: CollectionMode = CollectionMode::NFT(2000);
        let origin1 = Origin::signed(1);

        assert_ok!(TemplateModule::set_chain_limits(RawOrigin::Root.into(), ChainLimits { 
            collection_numbers_limit: 10,
            account_token_ownership_limit: 10,
            collections_admins_limit: 5,
            custom_data_limit: 2048,
            nft_sponsor_transfer_timeout: 15,
            fungible_sponsor_transfer_timeout: 15,
            refungible_sponsor_transfer_timeout: 15,          
        }));

        assert_ok!(TemplateModule::create_collection(
            origin1.clone(),
            col_name1.clone(),
            col_desc1.clone(),
            token_prefix1.clone(),
            mode
        ));

        assert_ok!(TemplateModule::add_to_white_list(origin1.clone(), 1, 2));
        assert_ok!(TemplateModule::remove_from_white_list(
            origin1.clone(),
            1,
            2
        ));
        assert_eq!(TemplateModule::white_list(1).len(), 0);
    });
}

#[test]
fn admin_can_remove_address_from_white_list() {
    new_test_ext().execute_with(|| {
        let col_name1: Vec<u16> = "Test1\0".encode_utf16().collect::<Vec<u16>>();
        let col_desc1: Vec<u16> = "TestDescription1\0".encode_utf16().collect::<Vec<u16>>();
        let token_prefix1: Vec<u8> = b"token_prefix1\0".to_vec();
        let mode: CollectionMode = CollectionMode::NFT(2000);
        let origin1 = Origin::signed(1);
        let origin2 = Origin::signed(2);

        assert_ok!(TemplateModule::set_chain_limits(RawOrigin::Root.into(), ChainLimits { 
            collection_numbers_limit: 10,
            account_token_ownership_limit: 10,
            collections_admins_limit: 5,
            custom_data_limit: 2048,
            nft_sponsor_transfer_timeout: 15,
            fungible_sponsor_transfer_timeout: 15,
            refungible_sponsor_transfer_timeout: 15,          
        }));

        assert_ok!(TemplateModule::create_collection(
            origin1.clone(),
            col_name1.clone(),
            col_desc1.clone(),
            token_prefix1.clone(),
            mode
        ));

        assert_ok!(TemplateModule::add_collection_admin(origin1.clone(), 1, 2));

        assert_ok!(TemplateModule::add_to_white_list(origin1.clone(), 1, 3));
        assert_ok!(TemplateModule::remove_from_white_list(
            origin2.clone(),
            1,
            3
        ));
        assert_eq!(TemplateModule::white_list(1).len(), 0);
    });
}

#[test]
fn nonprivileged_user_cannot_remove_address_from_white_list() {
    new_test_ext().execute_with(|| {
        let col_name1: Vec<u16> = "Test1\0".encode_utf16().collect::<Vec<u16>>();
        let col_desc1: Vec<u16> = "TestDescription1\0".encode_utf16().collect::<Vec<u16>>();
        let token_prefix1: Vec<u8> = b"token_prefix1\0".to_vec();
        let mode: CollectionMode = CollectionMode::NFT(2000);
        let origin1 = Origin::signed(1);
        let origin2 = Origin::signed(2);

        assert_ok!(TemplateModule::set_chain_limits(RawOrigin::Root.into(), ChainLimits { 
            collection_numbers_limit: 10,
            account_token_ownership_limit: 10,
            collections_admins_limit: 5,
            custom_data_limit: 2048,
            nft_sponsor_transfer_timeout: 15,
            fungible_sponsor_transfer_timeout: 15,
            refungible_sponsor_transfer_timeout: 15,          
        }));

        assert_ok!(TemplateModule::create_collection(
            origin1.clone(),
            col_name1.clone(),
            col_desc1.clone(),
            token_prefix1.clone(),
            mode
        ));

        assert_ok!(TemplateModule::add_to_white_list(origin1.clone(), 1, 2));
        assert_noop!(
            TemplateModule::remove_from_white_list(origin2.clone(), 1, 2),
            "You do not have permissions to modify this collection"
        );
        assert_eq!(TemplateModule::white_list(1)[0], 2);
    });
}

#[test]
fn nobody_can_remove_address_from_white_list_of_nonexisting_collection() {
    new_test_ext().execute_with(|| {
        let origin1 = Origin::signed(1);

        assert_ok!(TemplateModule::set_chain_limits(RawOrigin::Root.into(), ChainLimits { 
            collection_numbers_limit: 10,
            account_token_ownership_limit: 10,
            collections_admins_limit: 5,
            custom_data_limit: 2048,
            nft_sponsor_transfer_timeout: 15,
            fungible_sponsor_transfer_timeout: 15,
            refungible_sponsor_transfer_timeout: 15,          
        }));

        assert_noop!(
            TemplateModule::remove_from_white_list(origin1.clone(), 1, 2),
            "This collection does not exist"
        );
    });
}

#[test]
fn nobody_can_remove_address_from_white_list_of_deleted_collection() {
    new_test_ext().execute_with(|| {
        let col_name1: Vec<u16> = "Test1\0".encode_utf16().collect::<Vec<u16>>();
        let col_desc1: Vec<u16> = "TestDescription1\0".encode_utf16().collect::<Vec<u16>>();
        let token_prefix1: Vec<u8> = b"token_prefix1\0".to_vec();
        let mode: CollectionMode = CollectionMode::NFT(2000);
        let origin1 = Origin::signed(1);
        let origin2 = Origin::signed(2);

        assert_ok!(TemplateModule::set_chain_limits(RawOrigin::Root.into(), ChainLimits { 
            collection_numbers_limit: 10,
            account_token_ownership_limit: 10,
            collections_admins_limit: 5,
            custom_data_limit: 2048,
            nft_sponsor_transfer_timeout: 15,
            fungible_sponsor_transfer_timeout: 15,
            refungible_sponsor_transfer_timeout: 15,          
        }));

        assert_ok!(TemplateModule::create_collection(
            origin1.clone(),
            col_name1.clone(),
            col_desc1.clone(),
            token_prefix1.clone(),
            mode
        ));

        assert_ok!(TemplateModule::add_to_white_list(origin1.clone(), 1, 2));
        assert_ok!(TemplateModule::destroy_collection(origin1.clone(), 1));
        assert_noop!(
            TemplateModule::remove_from_white_list(origin2.clone(), 1, 2),
            "This collection does not exist"
        );
        assert_eq!(TemplateModule::white_list(1).len(), 0);
    });
}

// If address is already removed from white list, nothing happens
#[test]
fn address_is_already_removed_from_white_list() {
    new_test_ext().execute_with(|| {
        let col_name1: Vec<u16> = "Test1\0".encode_utf16().collect::<Vec<u16>>();
        let col_desc1: Vec<u16> = "TestDescription1\0".encode_utf16().collect::<Vec<u16>>();
        let token_prefix1: Vec<u8> = b"token_prefix1\0".to_vec();
        let mode: CollectionMode = CollectionMode::NFT(2000);
        let origin1 = Origin::signed(1);

        assert_ok!(TemplateModule::set_chain_limits(RawOrigin::Root.into(), ChainLimits { 
            collection_numbers_limit: 10,
            account_token_ownership_limit: 10,
            collections_admins_limit: 5,
            custom_data_limit: 2048,
            nft_sponsor_transfer_timeout: 15,
            fungible_sponsor_transfer_timeout: 15,
            refungible_sponsor_transfer_timeout: 15,          
        }));

        assert_ok!(TemplateModule::create_collection(
            origin1.clone(),
            col_name1.clone(),
            col_desc1.clone(),
            token_prefix1.clone(),
            mode
        ));

        assert_ok!(TemplateModule::add_to_white_list(origin1.clone(), 1, 2));
        assert_ok!(TemplateModule::remove_from_white_list(
            origin1.clone(),
            1,
            2
        ));
        assert_ok!(TemplateModule::remove_from_white_list(
            origin1.clone(),
            1,
            2
        ));
        assert_eq!(TemplateModule::white_list(1).len(), 0);
    });
}

// If Public Access mode is set to WhiteList, tokens can’t be transferred from a non-whitelisted address with transfer or transferFrom (2 tests)
#[test]
fn white_list_test_1() {
    new_test_ext().execute_with(|| {
        let col_name1: Vec<u16> = "Test1\0".encode_utf16().collect::<Vec<u16>>();
        let col_desc1: Vec<u16> = "TestDescription1\0".encode_utf16().collect::<Vec<u16>>();
        let token_prefix1: Vec<u8> = b"token_prefix1\0".to_vec();
        let mode: CollectionMode = CollectionMode::NFT(2000);

        assert_ok!(TemplateModule::set_chain_limits(RawOrigin::Root.into(), ChainLimits { 
            collection_numbers_limit: 10,
            account_token_ownership_limit: 10,
            collections_admins_limit: 5,
            custom_data_limit: 2048,
            nft_sponsor_transfer_timeout: 15,
            fungible_sponsor_transfer_timeout: 15,
            refungible_sponsor_transfer_timeout: 15,          
        }));

        let origin1 = Origin::signed(1);
        assert_ok!(TemplateModule::create_collection(
            origin1.clone(),
            col_name1.clone(),
            col_desc1.clone(),
            token_prefix1.clone(),
            mode
        ));
        assert_eq!(TemplateModule::collection(1).owner, 1);

        assert_ok!(TemplateModule::create_item(
            origin1.clone(),
            1,
            [1, 2, 3].to_vec(),
            1
        ));

        assert_ok!(TemplateModule::set_public_access_mode(
            origin1.clone(),
            1,
            AccessMode::WhiteList
        ));
        assert_ok!(TemplateModule::add_to_white_list(origin1.clone(), 1, 2));

        assert_noop!(
            TemplateModule::transfer(origin1.clone(), 3, 1, 1, 1),
            "Address is not in white list"
        );
    });
}

#[test]
fn white_list_test_2() {
    new_test_ext().execute_with(|| {
        let col_name1: Vec<u16> = "Test1\0".encode_utf16().collect::<Vec<u16>>();
        let col_desc1: Vec<u16> = "TestDescription1\0".encode_utf16().collect::<Vec<u16>>();
        let token_prefix1: Vec<u8> = b"token_prefix1\0".to_vec();
        let mode: CollectionMode = CollectionMode::NFT(2000);

        assert_ok!(TemplateModule::set_chain_limits(RawOrigin::Root.into(), ChainLimits { 
            collection_numbers_limit: 10,
            account_token_ownership_limit: 10,
            collections_admins_limit: 5,
            custom_data_limit: 2048,
            nft_sponsor_transfer_timeout: 15,
            fungible_sponsor_transfer_timeout: 15,
            refungible_sponsor_transfer_timeout: 15,          
        }));

        let origin1 = Origin::signed(1);
        assert_ok!(TemplateModule::create_collection(
            origin1.clone(),
            col_name1.clone(),
            col_desc1.clone(),
            token_prefix1.clone(),
            mode
        ));
        assert_eq!(TemplateModule::collection(1).owner, 1);

        assert_ok!(TemplateModule::create_item(
            origin1.clone(),
            1,
            [1, 2, 3].to_vec(),
            1
        ));

        assert_ok!(TemplateModule::set_public_access_mode(
            origin1.clone(),
            1,
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
            "Address is not in white list"
        );
    });
}

// If Public Access mode is set to WhiteList, tokens can’t be transferred to a non-whitelisted address with transfer or transferFrom (2 tests)
#[test]
fn white_list_test_3() {
    new_test_ext().execute_with(|| {
        let col_name1: Vec<u16> = "Test1\0".encode_utf16().collect::<Vec<u16>>();
        let col_desc1: Vec<u16> = "TestDescription1\0".encode_utf16().collect::<Vec<u16>>();
        let token_prefix1: Vec<u8> = b"token_prefix1\0".to_vec();
        let mode: CollectionMode = CollectionMode::NFT(2000);

        assert_ok!(TemplateModule::set_chain_limits(RawOrigin::Root.into(), ChainLimits { 
            collection_numbers_limit: 10,
            account_token_ownership_limit: 10,
            collections_admins_limit: 5,
            custom_data_limit: 2048,
            nft_sponsor_transfer_timeout: 15,
            fungible_sponsor_transfer_timeout: 15,
            refungible_sponsor_transfer_timeout: 15,          
        }));

        let origin1 = Origin::signed(1);
        assert_ok!(TemplateModule::create_collection(
            origin1.clone(),
            col_name1.clone(),
            col_desc1.clone(),
            token_prefix1.clone(),
            mode
        ));
        assert_eq!(TemplateModule::collection(1).owner, 1);

        assert_ok!(TemplateModule::create_item(
            origin1.clone(),
            1,
            [1, 2, 3].to_vec(),
            1
        ));

        assert_ok!(TemplateModule::set_public_access_mode(
            origin1.clone(),
            1,
            AccessMode::WhiteList
        ));
        assert_ok!(TemplateModule::add_to_white_list(origin1.clone(), 1, 1));

        assert_noop!(
            TemplateModule::transfer(origin1.clone(), 3, 1, 1, 1),
            "Address is not in white list"
        );
    });
}

#[test]
fn white_list_test_4() {
    new_test_ext().execute_with(|| {
        let col_name1: Vec<u16> = "Test1\0".encode_utf16().collect::<Vec<u16>>();
        let col_desc1: Vec<u16> = "TestDescription1\0".encode_utf16().collect::<Vec<u16>>();
        let token_prefix1: Vec<u8> = b"token_prefix1\0".to_vec();
        let mode: CollectionMode = CollectionMode::NFT(2000);

        assert_ok!(TemplateModule::set_chain_limits(RawOrigin::Root.into(), ChainLimits { 
            collection_numbers_limit: 10,
            account_token_ownership_limit: 10,
            collections_admins_limit: 5,
            custom_data_limit: 2048,
            nft_sponsor_transfer_timeout: 15,
            fungible_sponsor_transfer_timeout: 15,
            refungible_sponsor_transfer_timeout: 15,          
        }));

        let origin1 = Origin::signed(1);
        assert_ok!(TemplateModule::create_collection(
            origin1.clone(),
            col_name1.clone(),
            col_desc1.clone(),
            token_prefix1.clone(),
            mode
        ));
        assert_eq!(TemplateModule::collection(1).owner, 1);

        assert_ok!(TemplateModule::create_item(
            origin1.clone(),
            1,
            [1, 2, 3].to_vec(),
            1
        ));

        assert_ok!(TemplateModule::set_public_access_mode(
            origin1.clone(),
            1,
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
            2
        ));

        assert_noop!(
            TemplateModule::transfer_from(origin1.clone(), 1, 3, 1, 1, 1),
            "Address is not in white list"
        );
    });
}

// If Public Access mode is set to WhiteList, tokens can’t be destroyed by a non-whitelisted address (even if it owned them before enabling WhiteList mode)
#[test]
fn white_list_test_5() {
    new_test_ext().execute_with(|| {
        let col_name1: Vec<u16> = "Test1\0".encode_utf16().collect::<Vec<u16>>();
        let col_desc1: Vec<u16> = "TestDescription1\0".encode_utf16().collect::<Vec<u16>>();
        let token_prefix1: Vec<u8> = b"token_prefix1\0".to_vec();
        let mode: CollectionMode = CollectionMode::NFT(2000);

        assert_ok!(TemplateModule::set_chain_limits(RawOrigin::Root.into(), ChainLimits { 
            collection_numbers_limit: 10,
            account_token_ownership_limit: 10,
            collections_admins_limit: 5,
            custom_data_limit: 2048,
            nft_sponsor_transfer_timeout: 15,
            fungible_sponsor_transfer_timeout: 15,
            refungible_sponsor_transfer_timeout: 15,          
        }));

        let origin1 = Origin::signed(1);
        assert_ok!(TemplateModule::create_collection(
            origin1.clone(),
            col_name1.clone(),
            col_desc1.clone(),
            token_prefix1.clone(),
            mode
        ));
        assert_eq!(TemplateModule::collection(1).owner, 1);

        assert_ok!(TemplateModule::create_item(
            origin1.clone(),
            1,
            [1, 2, 3].to_vec(),
            1
        ));

        assert_ok!(TemplateModule::set_public_access_mode(
            origin1.clone(),
            1,
            AccessMode::WhiteList
        ));
        assert_noop!(
            TemplateModule::burn_item(origin1.clone(), 1, 1),
            "Address is not in white list"
        );
    });
}

// If Public Access mode is set to WhiteList, oken transfers can’t be Approved by a non-whitelisted address (see Approve method).
#[test]
fn white_list_test_6() {
    new_test_ext().execute_with(|| {
        let col_name1: Vec<u16> = "Test1\0".encode_utf16().collect::<Vec<u16>>();
        let col_desc1: Vec<u16> = "TestDescription1\0".encode_utf16().collect::<Vec<u16>>();
        let token_prefix1: Vec<u8> = b"token_prefix1\0".to_vec();
        let mode: CollectionMode = CollectionMode::NFT(2000);

        assert_ok!(TemplateModule::set_chain_limits(RawOrigin::Root.into(), ChainLimits { 
            collection_numbers_limit: 10,
            account_token_ownership_limit: 10,
            collections_admins_limit: 5,
            custom_data_limit: 2048,
            nft_sponsor_transfer_timeout: 15,
            fungible_sponsor_transfer_timeout: 15,
            refungible_sponsor_transfer_timeout: 15,          
        }));

        let origin1 = Origin::signed(1);
        assert_ok!(TemplateModule::create_collection(
            origin1.clone(),
            col_name1.clone(),
            col_desc1.clone(),
            token_prefix1.clone(),
            mode
        ));
        assert_ok!(TemplateModule::set_public_access_mode(
            origin1.clone(),
            1,
            AccessMode::WhiteList
        ));

        // do approve
        assert_noop!(
            TemplateModule::approve(origin1.clone(), 1, 1, 1),
            "Address is not in white list"
        );
    });
}

// If Public Access mode is set to WhiteList, tokens can be transferred from a whitelisted address with transfer or transferFrom (2 tests) and
//          tokens can be transferred from a whitelisted address with transfer or transferFrom (2 tests)
#[test]
fn white_list_test_7() {
    new_test_ext().execute_with(|| {
        let col_name1: Vec<u16> = "Test1\0".encode_utf16().collect::<Vec<u16>>();
        let col_desc1: Vec<u16> = "TestDescription1\0".encode_utf16().collect::<Vec<u16>>();
        let token_prefix1: Vec<u8> = b"token_prefix1\0".to_vec();
        let mode: CollectionMode = CollectionMode::NFT(2000);

        assert_ok!(TemplateModule::set_chain_limits(RawOrigin::Root.into(), ChainLimits { 
            collection_numbers_limit: 10,
            account_token_ownership_limit: 10,
            collections_admins_limit: 5,
            custom_data_limit: 2048,
            nft_sponsor_transfer_timeout: 15,
            fungible_sponsor_transfer_timeout: 15,
            refungible_sponsor_transfer_timeout: 15,          
        }));

        let origin1 = Origin::signed(1);
        assert_ok!(TemplateModule::create_collection(
            origin1.clone(),
            col_name1.clone(),
            col_desc1.clone(),
            token_prefix1.clone(),
            mode
        ));
        assert_eq!(TemplateModule::collection(1).owner, 1);

        assert_ok!(TemplateModule::create_item(
            origin1.clone(),
            1,
            [1, 2, 3].to_vec(),
            1
        ));

        assert_ok!(TemplateModule::set_public_access_mode(
            origin1.clone(),
            1,
            AccessMode::WhiteList
        ));
        assert_ok!(TemplateModule::add_to_white_list(origin1.clone(), 1, 1));
        assert_ok!(TemplateModule::add_to_white_list(origin1.clone(), 1, 2));

        assert_ok!(TemplateModule::transfer(origin1.clone(), 2, 1, 1, 1));
    });
}

#[test]
fn white_list_test_8() {
    new_test_ext().execute_with(|| {
        let col_name1: Vec<u16> = "Test1\0".encode_utf16().collect::<Vec<u16>>();
        let col_desc1: Vec<u16> = "TestDescription1\0".encode_utf16().collect::<Vec<u16>>();
        let token_prefix1: Vec<u8> = b"token_prefix1\0".to_vec();
        let mode: CollectionMode = CollectionMode::NFT(2000);

        assert_ok!(TemplateModule::set_chain_limits(RawOrigin::Root.into(), ChainLimits { 
            collection_numbers_limit: 10,
            account_token_ownership_limit: 10,
            collections_admins_limit: 5,
            custom_data_limit: 2048,
            nft_sponsor_transfer_timeout: 15,
            fungible_sponsor_transfer_timeout: 15,
            refungible_sponsor_transfer_timeout: 15,          
        }));

        let origin1 = Origin::signed(1);
        assert_ok!(TemplateModule::create_collection(
            origin1.clone(),
            col_name1.clone(),
            col_desc1.clone(),
            token_prefix1.clone(),
            mode
        ));
        assert_eq!(TemplateModule::collection(1).owner, 1);

        assert_ok!(TemplateModule::create_item(
            origin1.clone(),
            1,
            [1, 2, 3].to_vec(),
            1
        ));

        assert_ok!(TemplateModule::set_public_access_mode(
            origin1.clone(),
            1,
            AccessMode::WhiteList
        ));
        assert_ok!(TemplateModule::add_to_white_list(origin1.clone(), 1, 1));
        assert_ok!(TemplateModule::add_to_white_list(origin1.clone(), 1, 2));

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
        let col_name1: Vec<u16> = "Test1\0".encode_utf16().collect::<Vec<u16>>();
        let col_desc1: Vec<u16> = "TestDescription1\0".encode_utf16().collect::<Vec<u16>>();
        let token_prefix1: Vec<u8> = b"token_prefix1\0".to_vec();
        let mode: CollectionMode = CollectionMode::NFT(2000);

        assert_ok!(TemplateModule::set_chain_limits(RawOrigin::Root.into(), ChainLimits { 
            collection_numbers_limit: 10,
            account_token_ownership_limit: 10,
            collections_admins_limit: 5,
            custom_data_limit: 2048,
            nft_sponsor_transfer_timeout: 15,
            fungible_sponsor_transfer_timeout: 15,
            refungible_sponsor_transfer_timeout: 15,          
        }));

        let origin1 = Origin::signed(1);
        assert_ok!(TemplateModule::create_collection(
            origin1.clone(),
            col_name1.clone(),
            col_desc1.clone(),
            token_prefix1.clone(),
            mode
        ));

        assert_ok!(TemplateModule::set_public_access_mode(
            origin1.clone(),
            1,
            AccessMode::WhiteList
        ));
        assert_ok!(TemplateModule::set_mint_permission(
            origin1.clone(),
            1,
            false
        ));

        assert_ok!(TemplateModule::create_item(
            origin1.clone(),
            1,
            [1, 2, 3].to_vec(),
            1
        ));
    });
}

// If Public Access mode is set to WhiteList, and Mint Permission is set to false, tokens can be created by admin.
#[test]
fn white_list_test_10() {
    new_test_ext().execute_with(|| {
        let col_name1: Vec<u16> = "Test1\0".encode_utf16().collect::<Vec<u16>>();
        let col_desc1: Vec<u16> = "TestDescription1\0".encode_utf16().collect::<Vec<u16>>();
        let token_prefix1: Vec<u8> = b"token_prefix1\0".to_vec();
        let mode: CollectionMode = CollectionMode::NFT(2000);

        assert_ok!(TemplateModule::set_chain_limits(RawOrigin::Root.into(), ChainLimits { 
            collection_numbers_limit: 10,
            account_token_ownership_limit: 10,
            collections_admins_limit: 5,
            custom_data_limit: 2048,
            nft_sponsor_transfer_timeout: 15,
            fungible_sponsor_transfer_timeout: 15,
            refungible_sponsor_transfer_timeout: 15,          
        }));

        let origin1 = Origin::signed(1);
        let origin2 = Origin::signed(2);
        assert_ok!(TemplateModule::create_collection(
            origin1.clone(),
            col_name1.clone(),
            col_desc1.clone(),
            token_prefix1.clone(),
            mode
        ));

        assert_ok!(TemplateModule::set_public_access_mode(
            origin1.clone(),
            1,
            AccessMode::WhiteList
        ));
        assert_ok!(TemplateModule::set_mint_permission(
            origin1.clone(),
            1,
            false
        ));

        assert_ok!(TemplateModule::add_collection_admin(origin1.clone(), 1, 2));

        assert_ok!(TemplateModule::create_item(
            origin2.clone(),
            1,
            [1, 2, 3].to_vec(),
            2
        ));
    });
}

// If Public Access mode is set to WhiteList, and Mint Permission is set to false, tokens cannot be created by non-privileged and white listed address.
#[test]
fn white_list_test_11() {
    new_test_ext().execute_with(|| {
        let col_name1: Vec<u16> = "Test1\0".encode_utf16().collect::<Vec<u16>>();
        let col_desc1: Vec<u16> = "TestDescription1\0".encode_utf16().collect::<Vec<u16>>();
        let token_prefix1: Vec<u8> = b"token_prefix1\0".to_vec();
        let mode: CollectionMode = CollectionMode::NFT(2000);

        assert_ok!(TemplateModule::set_chain_limits(RawOrigin::Root.into(), ChainLimits { 
            collection_numbers_limit: 10,
            account_token_ownership_limit: 10,
            collections_admins_limit: 5,
            custom_data_limit: 2048,
            nft_sponsor_transfer_timeout: 15,
            fungible_sponsor_transfer_timeout: 15,
            refungible_sponsor_transfer_timeout: 15,          
        }));

        let origin1 = Origin::signed(1);
        let origin2 = Origin::signed(2);
        assert_ok!(TemplateModule::create_collection(
            origin1.clone(),
            col_name1.clone(),
            col_desc1.clone(),
            token_prefix1.clone(),
            mode
        ));

        assert_ok!(TemplateModule::set_public_access_mode(
            origin1.clone(),
            1,
            AccessMode::WhiteList
        ));
        assert_ok!(TemplateModule::set_mint_permission(
            origin1.clone(),
            1,
            false
        ));
        assert_ok!(TemplateModule::add_to_white_list(origin1.clone(), 1, 2));

        assert_noop!(
            TemplateModule::create_item(origin2.clone(), 1, [1, 2, 3].to_vec(), 2),
            "Public minting is not allowed for this collection"
        );
    });
}

// If Public Access mode is set to WhiteList, and Mint Permission is set to false, tokens cannot be created by non-privileged and non-white listed address.
#[test]
fn white_list_test_12() {
    new_test_ext().execute_with(|| {
        let col_name1: Vec<u16> = "Test1\0".encode_utf16().collect::<Vec<u16>>();
        let col_desc1: Vec<u16> = "TestDescription1\0".encode_utf16().collect::<Vec<u16>>();
        let token_prefix1: Vec<u8> = b"token_prefix1\0".to_vec();
        let mode: CollectionMode = CollectionMode::NFT(2000);

        assert_ok!(TemplateModule::set_chain_limits(RawOrigin::Root.into(), ChainLimits { 
            collection_numbers_limit: 10,
            account_token_ownership_limit: 10,
            collections_admins_limit: 5,
            custom_data_limit: 2048,
            nft_sponsor_transfer_timeout: 15,
            fungible_sponsor_transfer_timeout: 15,
            refungible_sponsor_transfer_timeout: 15,          
        }));

        let origin1 = Origin::signed(1);
        let origin2 = Origin::signed(2);
        assert_ok!(TemplateModule::create_collection(
            origin1.clone(),
            col_name1.clone(),
            col_desc1.clone(),
            token_prefix1.clone(),
            mode
        ));

        assert_ok!(TemplateModule::set_public_access_mode(
            origin1.clone(),
            1,
            AccessMode::WhiteList
        ));
        assert_ok!(TemplateModule::set_mint_permission(
            origin1.clone(),
            1,
            false
        ));

        assert_noop!(
            TemplateModule::create_item(origin2.clone(), 1, [1, 2, 3].to_vec(), 2),
            "Public minting is not allowed for this collection"
        );
    });
}

// If Public Access mode is set to WhiteList, and Mint Permission is set to true, tokens can be created by owner.
#[test]
fn white_list_test_13() {
    new_test_ext().execute_with(|| {
        let col_name1: Vec<u16> = "Test1\0".encode_utf16().collect::<Vec<u16>>();
        let col_desc1: Vec<u16> = "TestDescription1\0".encode_utf16().collect::<Vec<u16>>();
        let token_prefix1: Vec<u8> = b"token_prefix1\0".to_vec();
        let mode: CollectionMode = CollectionMode::NFT(2000);

        assert_ok!(TemplateModule::set_chain_limits(RawOrigin::Root.into(), ChainLimits { 
            collection_numbers_limit: 10,
            account_token_ownership_limit: 10,
            collections_admins_limit: 5,
            custom_data_limit: 2048,
            nft_sponsor_transfer_timeout: 15,
            fungible_sponsor_transfer_timeout: 15,
            refungible_sponsor_transfer_timeout: 15,          
        }));

        let origin1 = Origin::signed(1);
        assert_ok!(TemplateModule::create_collection(
            origin1.clone(),
            col_name1.clone(),
            col_desc1.clone(),
            token_prefix1.clone(),
            mode
        ));

        assert_ok!(TemplateModule::set_public_access_mode(
            origin1.clone(),
            1,
            AccessMode::WhiteList
        ));
        assert_ok!(TemplateModule::set_mint_permission(
            origin1.clone(),
            1,
            true
        ));

        assert_ok!(TemplateModule::create_item(
            origin1.clone(),
            1,
            [1, 2, 3].to_vec(),
            1
        ));
    });
}

// If Public Access mode is set to WhiteList, and Mint Permission is set to true, tokens can be created by admin.
#[test]
fn white_list_test_14() {
    new_test_ext().execute_with(|| {
        let col_name1: Vec<u16> = "Test1\0".encode_utf16().collect::<Vec<u16>>();
        let col_desc1: Vec<u16> = "TestDescription1\0".encode_utf16().collect::<Vec<u16>>();
        let token_prefix1: Vec<u8> = b"token_prefix1\0".to_vec();
        let mode: CollectionMode = CollectionMode::NFT(2000);

        assert_ok!(TemplateModule::set_chain_limits(RawOrigin::Root.into(), ChainLimits { 
            collection_numbers_limit: 10,
            account_token_ownership_limit: 10,
            collections_admins_limit: 5,
            custom_data_limit: 2048,
            nft_sponsor_transfer_timeout: 15,
            fungible_sponsor_transfer_timeout: 15,
            refungible_sponsor_transfer_timeout: 15,          
        }));

        let origin1 = Origin::signed(1);
        let origin2 = Origin::signed(2);
        assert_ok!(TemplateModule::create_collection(
            origin1.clone(),
            col_name1.clone(),
            col_desc1.clone(),
            token_prefix1.clone(),
            mode
        ));

        assert_ok!(TemplateModule::set_public_access_mode(
            origin1.clone(),
            1,
            AccessMode::WhiteList
        ));
        assert_ok!(TemplateModule::set_mint_permission(
            origin1.clone(),
            1,
            true
        ));

        assert_ok!(TemplateModule::add_collection_admin(origin1.clone(), 1, 2));

        assert_ok!(TemplateModule::create_item(
            origin2.clone(),
            1,
            [1, 2, 3].to_vec(),
            2
        ));
    });
}

// If Public Access mode is set to WhiteList, and Mint Permission is set to true, tokens cannot be created by non-privileged and non-white listed address.
#[test]
fn white_list_test_15() {
    new_test_ext().execute_with(|| {
        let col_name1: Vec<u16> = "Test1\0".encode_utf16().collect::<Vec<u16>>();
        let col_desc1: Vec<u16> = "TestDescription1\0".encode_utf16().collect::<Vec<u16>>();
        let token_prefix1: Vec<u8> = b"token_prefix1\0".to_vec();
        let mode: CollectionMode = CollectionMode::NFT(2000);

        assert_ok!(TemplateModule::set_chain_limits(RawOrigin::Root.into(), ChainLimits { 
            collection_numbers_limit: 10,
            account_token_ownership_limit: 10,
            collections_admins_limit: 5,
            custom_data_limit: 2048,
            nft_sponsor_transfer_timeout: 15,
            fungible_sponsor_transfer_timeout: 15,
            refungible_sponsor_transfer_timeout: 15,          
        }));

        let origin1 = Origin::signed(1);
        let origin2 = Origin::signed(2);
        assert_ok!(TemplateModule::create_collection(
            origin1.clone(),
            col_name1.clone(),
            col_desc1.clone(),
            token_prefix1.clone(),
            mode
        ));

        assert_ok!(TemplateModule::set_public_access_mode(
            origin1.clone(),
            1,
            AccessMode::WhiteList
        ));
        assert_ok!(TemplateModule::set_mint_permission(
            origin1.clone(),
            1,
            true
        ));

        assert_noop!(
            TemplateModule::create_item(origin2.clone(), 1, [1, 2, 3].to_vec(), 2),
            "Address is not in white list"
        );
    });
}

// If Public Access mode is set to WhiteList, and Mint Permission is set to true, tokens can be created by non-privileged and white listed address.
#[test]
fn white_list_test_16() {
    new_test_ext().execute_with(|| {
        let col_name1: Vec<u16> = "Test1\0".encode_utf16().collect::<Vec<u16>>();
        let col_desc1: Vec<u16> = "TestDescription1\0".encode_utf16().collect::<Vec<u16>>();
        let token_prefix1: Vec<u8> = b"token_prefix1\0".to_vec();
        let mode: CollectionMode = CollectionMode::NFT(2000);

        assert_ok!(TemplateModule::set_chain_limits(RawOrigin::Root.into(), ChainLimits { 
            collection_numbers_limit: 10,
            account_token_ownership_limit: 10,
            collections_admins_limit: 5,
            custom_data_limit: 2048,
            nft_sponsor_transfer_timeout: 15,
            fungible_sponsor_transfer_timeout: 15,
            refungible_sponsor_transfer_timeout: 15,          
        }));

        let origin1 = Origin::signed(1);
        let origin2 = Origin::signed(2);
        assert_ok!(TemplateModule::create_collection(
            origin1.clone(),
            col_name1.clone(),
            col_desc1.clone(),
            token_prefix1.clone(),
            mode
        ));

        assert_ok!(TemplateModule::set_public_access_mode(
            origin1.clone(),
            1,
            AccessMode::WhiteList
        ));
        assert_ok!(TemplateModule::set_mint_permission(
            origin1.clone(),
            1,
            true
        ));
        assert_ok!(TemplateModule::add_to_white_list(origin1.clone(), 1, 2));

        assert_ok!(TemplateModule::create_item(
            origin2.clone(),
            1,
            [1, 2, 3].to_vec(),
            2
        ));
    });
}

// Total number of collections. Positive test
#[test]
fn total_number_collections_bound() {
    new_test_ext().execute_with(|| {
        let col_name1: Vec<u16> = "Test1\0".encode_utf16().collect::<Vec<u16>>();
        let col_desc1: Vec<u16> = "TestDescription1\0".encode_utf16().collect::<Vec<u16>>();
        let token_prefix1: Vec<u8> = b"token_prefix1\0".to_vec();
        let mode: CollectionMode = CollectionMode::NFT(2000);

        assert_ok!(TemplateModule::set_chain_limits(RawOrigin::Root.into(), ChainLimits { 
            collection_numbers_limit: 10,
            account_token_ownership_limit: 10,
            collections_admins_limit: 5,
            custom_data_limit: 2048,
            nft_sponsor_transfer_timeout: 15,
            fungible_sponsor_transfer_timeout: 15,
            refungible_sponsor_transfer_timeout: 15,          
        }));

        let origin1 = Origin::signed(1);
        assert_ok!(TemplateModule::create_collection(
            origin1.clone(),
            col_name1.clone(),
            col_desc1.clone(),
            token_prefix1.clone(),
            mode
        ));
    });
}

// Total number of collections. Negotive test
#[test]
fn total_number_collections_bound_neg() {
    new_test_ext().execute_with(|| {
        let col_name1: Vec<u16> = "Test1\0".encode_utf16().collect::<Vec<u16>>();
        let col_desc1: Vec<u16> = "TestDescription1\0".encode_utf16().collect::<Vec<u16>>();
        let token_prefix1: Vec<u8> = b"token_prefix1\0".to_vec();
        let mode: CollectionMode = CollectionMode::NFT(2000);

        assert_ok!(TemplateModule::set_chain_limits(RawOrigin::Root.into(), ChainLimits { 
            collection_numbers_limit: 10,
            account_token_ownership_limit: 10,
            collections_admins_limit: 5,
            custom_data_limit: 2048,
            nft_sponsor_transfer_timeout: 15,
            fungible_sponsor_transfer_timeout: 15,
            refungible_sponsor_transfer_timeout: 15,          
        }));

        let origin1 = Origin::signed(1);

        for _ in 0..10 {

            assert_ok!(TemplateModule::create_collection(
                origin1.clone(),
                col_name1.clone(),
                col_desc1.clone(),
                token_prefix1.clone(),
                mode.clone()
            ));
        }

        // 11-th collection in chain. Expects error
        assert_noop!(TemplateModule::create_collection(
            origin1.clone(),
            col_name1.clone(),
            col_desc1.clone(),
            token_prefix1.clone(),
            mode.clone()
        ), "Total collections bound exceeded");
    });
}

// Owned tokens by a single address. Positive test
#[test]
fn owned_tokens_bound() {
    new_test_ext().execute_with(|| {
        let col_name1: Vec<u16> = "Test1\0".encode_utf16().collect::<Vec<u16>>();
        let col_desc1: Vec<u16> = "TestDescription1\0".encode_utf16().collect::<Vec<u16>>();
        let token_prefix1: Vec<u8> = b"token_prefix1\0".to_vec();
        let mode: CollectionMode = CollectionMode::NFT(2000);

        assert_ok!(TemplateModule::set_chain_limits(RawOrigin::Root.into(), ChainLimits { 
            collection_numbers_limit: 10,
            account_token_ownership_limit: 10,
            collections_admins_limit: 5,
            custom_data_limit: 2048,
            nft_sponsor_transfer_timeout: 15,
            fungible_sponsor_transfer_timeout: 15,
            refungible_sponsor_transfer_timeout: 15,          
        }));

        let origin1 = Origin::signed(1);
        assert_ok!(TemplateModule::create_collection(
            origin1.clone(),
            col_name1.clone(),
            col_desc1.clone(),
            token_prefix1.clone(),
            mode
        ));

        assert_ok!(TemplateModule::create_item(
            origin1.clone(),
            1,
            [1, 2, 3].to_vec(),
            1
        ));

        assert_ok!(TemplateModule::create_item(
            origin1.clone(),
            1,
            [1, 2, 3].to_vec(),
            1
        ));
    });
}

// Owned tokens by a single address. Negotive test
#[test]
fn owned_tokens_bound_neg() {
    new_test_ext().execute_with(|| {
        let col_name1: Vec<u16> = "Test1\0".encode_utf16().collect::<Vec<u16>>();
        let col_desc1: Vec<u16> = "TestDescription1\0".encode_utf16().collect::<Vec<u16>>();
        let token_prefix1: Vec<u8> = b"token_prefix1\0".to_vec();
        let mode: CollectionMode = CollectionMode::NFT(2000);

        assert_ok!(TemplateModule::set_chain_limits(RawOrigin::Root.into(), ChainLimits { 
            collection_numbers_limit: 10,
            account_token_ownership_limit: 1,
            collections_admins_limit: 5,
            custom_data_limit: 2048,
            nft_sponsor_transfer_timeout: 15,
            fungible_sponsor_transfer_timeout: 15,
            refungible_sponsor_transfer_timeout: 15,          
        }));

        let origin1 = Origin::signed(1);
        assert_ok!(TemplateModule::create_collection(
            origin1.clone(),
            col_name1.clone(),
            col_desc1.clone(),
            token_prefix1.clone(),
            mode
        ));

        assert_ok!(TemplateModule::create_item(
            origin1.clone(),
            1,
            [1, 2, 3].to_vec(),
            1
        ));

        assert_noop!(TemplateModule::create_item(
            origin1.clone(),
            1,
            [1, 2, 3].to_vec(),
            1
        ), "Owned tokens by a single address bound exceeded");
    });
}

// Number of collection admins. Positive test
#[test]
fn collection_admins_bound() {
    new_test_ext().execute_with(|| {
        let col_name1: Vec<u16> = "Test1\0".encode_utf16().collect::<Vec<u16>>();
        let col_desc1: Vec<u16> = "TestDescription1\0".encode_utf16().collect::<Vec<u16>>();
        let token_prefix1: Vec<u8> = b"token_prefix1\0".to_vec();
        let mode: CollectionMode = CollectionMode::NFT(2000);

        assert_ok!(TemplateModule::set_chain_limits(RawOrigin::Root.into(), ChainLimits { 
            collection_numbers_limit: 10,
            account_token_ownership_limit: 10,
            collections_admins_limit: 2,
            custom_data_limit: 2048,
            nft_sponsor_transfer_timeout: 15,
            fungible_sponsor_transfer_timeout: 15,
            refungible_sponsor_transfer_timeout: 15,          
        }));

        let origin1 = Origin::signed(1);
        assert_ok!(TemplateModule::create_collection(
            origin1.clone(),
            col_name1.clone(),
            col_desc1.clone(),
            token_prefix1.clone(),
            mode
        ));

        assert_ok!(TemplateModule::add_collection_admin(origin1.clone(), 1, 2));
        assert_ok!(TemplateModule::add_collection_admin(origin1.clone(), 1, 3));
    });
}

// Number of collection admins. Negotive test
#[test]
fn collection_admins_bound_neg() {
    new_test_ext().execute_with(|| {
        let col_name1: Vec<u16> = "Test1\0".encode_utf16().collect::<Vec<u16>>();
        let col_desc1: Vec<u16> = "TestDescription1\0".encode_utf16().collect::<Vec<u16>>();
        let token_prefix1: Vec<u8> = b"token_prefix1\0".to_vec();
        let mode: CollectionMode = CollectionMode::NFT(2000);

        assert_ok!(TemplateModule::set_chain_limits(RawOrigin::Root.into(), ChainLimits { 
            collection_numbers_limit: 10,
            account_token_ownership_limit: 1,
            collections_admins_limit: 1,
            custom_data_limit: 2048,
            nft_sponsor_transfer_timeout: 15,
            fungible_sponsor_transfer_timeout: 15,
            refungible_sponsor_transfer_timeout: 15,          
        }));

        let origin1 = Origin::signed(1);
        assert_ok!(TemplateModule::create_collection(
            origin1.clone(),
            col_name1.clone(),
            col_desc1.clone(),
            token_prefix1.clone(),
            mode
        ));

        assert_ok!(TemplateModule::add_collection_admin(origin1.clone(), 1, 2));
        assert_noop!(TemplateModule::add_collection_admin(origin1.clone(), 1, 3), "Number of collection admins bound exceeded");
    });
}

// Custom data size. Positive test
#[test]
fn custom_data_size_bound() {
    new_test_ext().execute_with(|| {
        let col_name1: Vec<u16> = "Test1\0".encode_utf16().collect::<Vec<u16>>();
        let col_desc1: Vec<u16> = "TestDescription1\0".encode_utf16().collect::<Vec<u16>>();
        let token_prefix1: Vec<u8> = b"token_prefix1\0".to_vec();
        let mode: CollectionMode = CollectionMode::NFT(2000);

        assert_ok!(TemplateModule::set_chain_limits(RawOrigin::Root.into(), ChainLimits { 
            collection_numbers_limit: 10,
            account_token_ownership_limit: 10,
            collections_admins_limit: 5,
            custom_data_limit: 2048,
            nft_sponsor_transfer_timeout: 15,
            fungible_sponsor_transfer_timeout: 15,
            refungible_sponsor_transfer_timeout: 15,          
        }));

        let origin1 = Origin::signed(1);
        assert_ok!(TemplateModule::create_collection(
            origin1.clone(),
            col_name1.clone(),
            col_desc1.clone(),
            token_prefix1.clone(),
            mode
        ));
    });
}

// Custom data size. Negotive test
#[test]
fn custom_data_size_bound_neg() {
    new_test_ext().execute_with(|| {
        let col_name1: Vec<u16> = "Test1\0".encode_utf16().collect::<Vec<u16>>();
        let col_desc1: Vec<u16> = "TestDescription1\0".encode_utf16().collect::<Vec<u16>>();
        let token_prefix1: Vec<u8> = b"token_prefix1\0".to_vec();
        let mode: CollectionMode = CollectionMode::NFT(2000);

        assert_ok!(TemplateModule::set_chain_limits(RawOrigin::Root.into(), ChainLimits { 
            collection_numbers_limit: 10,
            account_token_ownership_limit: 10,
            collections_admins_limit: 5,
            custom_data_limit: 200,
            nft_sponsor_transfer_timeout: 15,
            fungible_sponsor_transfer_timeout: 15,
            refungible_sponsor_transfer_timeout: 15,          
        }));

        let origin1 = Origin::signed(1);
        assert_noop!(TemplateModule::create_collection(
            origin1.clone(),
            col_name1.clone(),
            col_desc1.clone(),
            token_prefix1.clone(),
            mode
        ), "Custom data size bound exceeded");
    });
}
// #endregion
