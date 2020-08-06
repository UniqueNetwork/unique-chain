// Tests to be written here
use crate::mock::*;
use crate::{CollectionMode, Ownership, ApprovePermissions};
use frame_support::{assert_noop, assert_ok};

#[test]
fn create_nft_item() {
    new_test_ext().execute_with(|| {
        let col_name1: Vec<u16> = "Test1\0".encode_utf16().collect::<Vec<u16>>();
        let col_desc1: Vec<u16> = "TestDescription1\0".encode_utf16().collect::<Vec<u16>>();
        let token_prefix1: Vec<u8> = b"token_prefix1\0".to_vec();
        let mode: CollectionMode = CollectionMode::NFT(2000);

        let origin1 = Origin::signed(1);
        assert_ok!(TemplateModule::create_collection(
            origin1.clone(),
            col_name1.clone(),
            col_desc1.clone(),
            token_prefix1.clone(),
            mode
        ));
        assert_eq!(TemplateModule::collection(1).owner, 1);


        assert_ok!(TemplateModule::create_item(origin1.clone(), 1, [1,2,3].to_vec(), 1));
        assert_eq!(TemplateModule::nft_item_id(1,1).data, [1,2,3].to_vec());
    });
}

#[test]
fn create_refungible_item() {
    new_test_ext().execute_with(|| {
        let col_name1: Vec<u16> = "Test1\0".encode_utf16().collect::<Vec<u16>>();
        let col_desc1: Vec<u16> = "TestDescription1\0".encode_utf16().collect::<Vec<u16>>();
        let token_prefix1: Vec<u8> = b"token_prefix1\0".to_vec();
        let mode: CollectionMode = CollectionMode::ReFungible(2000, 3);

        let origin1 = Origin::signed(1);
        assert_ok!(TemplateModule::create_collection(
            origin1.clone(),
            col_name1.clone(),
            col_desc1.clone(),
            token_prefix1.clone(),
            mode
        ));
        assert_eq!(TemplateModule::collection(1).owner, 1);


        assert_ok!(TemplateModule::create_item(origin1.clone(), 1, [1,2,3].to_vec(), 1));
        assert_eq!(TemplateModule::refungible_item_id(1,1).data, [1,2,3].to_vec());
        assert_eq!(TemplateModule::refungible_item_id(1,1).owner[0], Ownership { owner: 1, fraction: 1000 });
    });
}

#[test]
fn create_fungible_item() {
    new_test_ext().execute_with(|| {
        let col_name1: Vec<u16> = "Test1\0".encode_utf16().collect::<Vec<u16>>();
        let col_desc1: Vec<u16> = "TestDescription1\0".encode_utf16().collect::<Vec<u16>>();
        let token_prefix1: Vec<u8> = b"token_prefix1\0".to_vec();
        let mode: CollectionMode = CollectionMode::Fungible(3);

        let origin1 = Origin::signed(1);
        assert_ok!(TemplateModule::create_collection(
            origin1.clone(),
            col_name1.clone(),
            col_desc1.clone(),
            token_prefix1.clone(),
            mode
        ));
        assert_eq!(TemplateModule::collection(1).owner, 1);

        assert_ok!(TemplateModule::create_item(origin1.clone(), 1, [].to_vec(), 1));
        assert_eq!(TemplateModule::fungible_item_id(1,1).owner, 1);
        assert_eq!(TemplateModule::balance_count(1,1), 1000);
        assert_eq!(TemplateModule::address_tokens(1,1), [1]);
    });
}

#[test]
fn transfer_fungible_item() {
    new_test_ext().execute_with(|| {
        let col_name1: Vec<u16> = "Test1\0".encode_utf16().collect::<Vec<u16>>();
        let col_desc1: Vec<u16> = "TestDescription1\0".encode_utf16().collect::<Vec<u16>>();
        let token_prefix1: Vec<u8> = b"token_prefix1\0".to_vec();
        let mode: CollectionMode = CollectionMode::Fungible(3);

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

        assert_ok!(TemplateModule::create_item(origin1.clone(), 1, [].to_vec(), 1));
        assert_eq!(TemplateModule::fungible_item_id(1,1).owner, 1);
        assert_eq!(TemplateModule::balance_count(1,1), 1000);
        assert_eq!(TemplateModule::address_tokens(1,1), [1]);

        // change owner scenario
        assert_ok!(TemplateModule::transfer(origin1.clone(), 2, 1, 1, 1000));
        assert_eq!(TemplateModule::fungible_item_id(1,1).owner, 2);
        assert_eq!(TemplateModule::fungible_item_id(1,1).value, 1000);
        assert_eq!(TemplateModule::balance_count(1,1), 0);
        assert_eq!(TemplateModule::balance_count(1,2), 1000);
        assert_eq!(TemplateModule::address_tokens(1,1), []);
        assert_eq!(TemplateModule::address_tokens(1,2), [1]);

        // split item scenario
        assert_ok!(TemplateModule::transfer(origin2.clone(), 3, 1, 1, 500));
        assert_eq!(TemplateModule::fungible_item_id(1,1).owner, 2);
        assert_eq!(TemplateModule::fungible_item_id(1,2).owner, 3);
        assert_eq!(TemplateModule::balance_count(1,2), 500);
        assert_eq!(TemplateModule::balance_count(1,3), 500);
        assert_eq!(TemplateModule::address_tokens(1,2), [1]);
        assert_eq!(TemplateModule::address_tokens(1,3), [2]);

        // split item and new owner has account scenario
        assert_ok!(TemplateModule::transfer(origin2.clone(), 3, 1, 1, 200));
        assert_eq!(TemplateModule::fungible_item_id(1,1).value, 300);
        assert_eq!(TemplateModule::fungible_item_id(1,2).value, 700);
        assert_eq!(TemplateModule::balance_count(1,2), 300);
        assert_eq!(TemplateModule::balance_count(1,3), 700);
        assert_eq!(TemplateModule::address_tokens(1,2), [1]);
        assert_eq!(TemplateModule::address_tokens(1,3), [2]);
    });
}

#[test]
fn transfer_refungible_item() {
    new_test_ext().execute_with(|| {
        let col_name1: Vec<u16> = "Test1\0".encode_utf16().collect::<Vec<u16>>();
        let col_desc1: Vec<u16> = "TestDescription1\0".encode_utf16().collect::<Vec<u16>>();
        let token_prefix1: Vec<u8> = b"token_prefix1\0".to_vec();
        let mode: CollectionMode = CollectionMode::ReFungible(2000, 3);

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

        assert_ok!(TemplateModule::create_item(origin1.clone(), 1, [1,2,3].to_vec(), 1));
        assert_eq!(TemplateModule::refungible_item_id(1,1).data, [1,2,3].to_vec());
        assert_eq!(TemplateModule::refungible_item_id(1,1).owner[0], Ownership { owner: 1, fraction: 1000 });
        assert_eq!(TemplateModule::balance_count(1,1), 1000);
        assert_eq!(TemplateModule::address_tokens(1,1), [1]);

        // change owner scenario
        assert_ok!(TemplateModule::transfer(origin1.clone(), 2, 1, 1, 1000));
        assert_eq!(TemplateModule::refungible_item_id(1,1).owner[0], Ownership { owner: 2, fraction: 1000 });
        assert_eq!(TemplateModule::balance_count(1,1), 0);
        assert_eq!(TemplateModule::balance_count(1,2), 1000);
        assert_eq!(TemplateModule::address_tokens(1,1), []);
        assert_eq!(TemplateModule::address_tokens(1,2), [1]);

        // split item scenario
        assert_ok!(TemplateModule::transfer(origin2.clone(), 3, 1, 1, 500));
        assert_eq!(TemplateModule::refungible_item_id(1,1).owner[0], Ownership { owner: 2, fraction: 500 });
        assert_eq!(TemplateModule::refungible_item_id(1,1).owner[1], Ownership { owner: 3, fraction: 500 });
        assert_eq!(TemplateModule::balance_count(1,2), 500);
        assert_eq!(TemplateModule::balance_count(1,3), 500);
        assert_eq!(TemplateModule::address_tokens(1,2), [1]);
        assert_eq!(TemplateModule::address_tokens(1,3), [1]);

        // split item and new owner has account scenario
        assert_ok!(TemplateModule::transfer(origin2.clone(), 3, 1, 1, 200));
        assert_eq!(TemplateModule::refungible_item_id(1,1).owner[0], Ownership { owner: 2, fraction: 300 });
        assert_eq!(TemplateModule::refungible_item_id(1,1).owner[1], Ownership { owner: 3, fraction: 700 });
        assert_eq!(TemplateModule::balance_count(1,2), 300);
        assert_eq!(TemplateModule::balance_count(1,3), 700);
        assert_eq!(TemplateModule::address_tokens(1,2), [1]);
        assert_eq!(TemplateModule::address_tokens(1,3), [1]);
    });
}


#[test]
fn transfer_nft_item() {
    new_test_ext().execute_with(|| {
        let col_name1: Vec<u16> = "Test1\0".encode_utf16().collect::<Vec<u16>>();
        let col_desc1: Vec<u16> = "TestDescription1\0".encode_utf16().collect::<Vec<u16>>();
        let token_prefix1: Vec<u8> = b"token_prefix1\0".to_vec();
        let mode: CollectionMode = CollectionMode::NFT(2000);

        let origin1 = Origin::signed(1);
        assert_ok!(TemplateModule::create_collection(
            origin1.clone(),
            col_name1.clone(),
            col_desc1.clone(),
            token_prefix1.clone(),
            mode
        ));
        assert_eq!(TemplateModule::collection(1).owner, 1);


        assert_ok!(TemplateModule::create_item(origin1.clone(), 1, [1,2,3].to_vec(), 1));
        assert_eq!(TemplateModule::nft_item_id(1,1).data, [1,2,3].to_vec());
        assert_eq!(TemplateModule::balance_count(1,1), 1);
        assert_eq!(TemplateModule::address_tokens(1,1), [1]);

        // default scenario
        assert_ok!(TemplateModule::transfer(origin1.clone(), 2, 1, 1, 1000));
        assert_eq!(TemplateModule::nft_item_id(1,1).owner, 2);
        assert_eq!(TemplateModule::balance_count(1,1), 0);
        assert_eq!(TemplateModule::balance_count(1,2), 1);
        assert_eq!(TemplateModule::address_tokens(1,1), []);
        assert_eq!(TemplateModule::address_tokens(1,2), [1]); 
    });
}

#[test]
fn nft_approve_and_transfer_from() {
    new_test_ext().execute_with(|| {
        let col_name1: Vec<u16> = "Test1\0".encode_utf16().collect::<Vec<u16>>();
        let col_desc1: Vec<u16> = "TestDescription1\0".encode_utf16().collect::<Vec<u16>>();
        let token_prefix1: Vec<u8> = b"token_prefix1\0".to_vec();
        let mode: CollectionMode = CollectionMode::NFT(2000);

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


        assert_ok!(TemplateModule::create_item(origin1.clone(), 1, [1,2,3].to_vec(), 1));
        assert_eq!(TemplateModule::nft_item_id(1,1).data, [1,2,3].to_vec());
        assert_eq!(TemplateModule::balance_count(1,1), 1);
        assert_eq!(TemplateModule::address_tokens(1,1), [1]);

        assert_noop!(
            TemplateModule::transfer_from(origin2.clone(), 1, 3, 1, 1, 1),
            "You do not have permissions to modify this collection"
        );

        // do approve
        assert_ok!(TemplateModule::approve(origin1.clone(), 2, 1, 1));
        assert_eq!(TemplateModule::approved(1,(1,1)).len(), 1);
        assert_ok!(TemplateModule::approve(origin1.clone(), 10, 1, 1));
        assert_eq!(TemplateModule::approved(1,(1,1)).len(), 2);
        assert_eq!(TemplateModule::approved(1,(1,1))[0], ApprovePermissions { approved: 2, amount: 100000000});

        assert_ok!(TemplateModule::transfer_from(origin2.clone(), 1, 3, 1, 1, 1));
        assert_eq!(TemplateModule::approved(1,(1,1)).len(), 0);
    });
}

#[test]
fn refungible_approve_and_transfer_from() {
    new_test_ext().execute_with(|| {
        let col_name1: Vec<u16> = "Test1\0".encode_utf16().collect::<Vec<u16>>();
        let col_desc1: Vec<u16> = "TestDescription1\0".encode_utf16().collect::<Vec<u16>>();
        let token_prefix1: Vec<u8> = b"token_prefix1\0".to_vec();
        let mode: CollectionMode = CollectionMode::ReFungible(2000, 3);

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

        assert_ok!(TemplateModule::create_item(origin1.clone(), 1, [1,2,3].to_vec(), 1));
        assert_eq!(TemplateModule::refungible_item_id(1,1).data, [1,2,3].to_vec());
        assert_eq!(TemplateModule::refungible_item_id(1,1).owner[0], Ownership { owner: 1, fraction: 1000 });
        assert_eq!(TemplateModule::balance_count(1,1), 1000);
        assert_eq!(TemplateModule::address_tokens(1,1), [1]);

        assert_noop!(
            TemplateModule::transfer_from(origin2.clone(), 1, 3, 1, 1, 1),
            "You do not have permissions to modify this collection"
        );

        // do approve
        assert_ok!(TemplateModule::approve(origin1.clone(), 2, 1, 1));
        assert_eq!(TemplateModule::approved(1,(1,1)).len(), 1);
        assert_ok!(TemplateModule::approve(origin1.clone(), 10, 1, 1));
        assert_eq!(TemplateModule::approved(1,(1,1)).len(), 2);
        assert_eq!(TemplateModule::approved(1,(1,1))[0], ApprovePermissions { approved: 2, amount: 100000000});

        assert_ok!(TemplateModule::transfer_from(origin2.clone(), 1, 3, 1, 1, 100));
        assert_eq!(TemplateModule::balance_count(1,1), 900);
        assert_eq!(TemplateModule::balance_count(1,3), 100);
        assert_eq!(TemplateModule::address_tokens(1,1), [1]);
        assert_eq!(TemplateModule::address_tokens(1,3), [1]);

        assert_eq!(TemplateModule::approved(1,(1,1)).len(), 1);
        assert_eq!(TemplateModule::approved(1,(1,1))[0], ApprovePermissions { approved: 10, amount: 100000000});
    });
}

#[test]
fn fungible_approve_and_transfer_from() {
    new_test_ext().execute_with(|| {
        let col_name1: Vec<u16> = "Test1\0".encode_utf16().collect::<Vec<u16>>();
        let col_desc1: Vec<u16> = "TestDescription1\0".encode_utf16().collect::<Vec<u16>>();
        let token_prefix1: Vec<u8> = b"token_prefix1\0".to_vec();
        let mode: CollectionMode = CollectionMode::Fungible(3);

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

        assert_ok!(TemplateModule::create_item(origin1.clone(), 1, [].to_vec(), 1));
        assert_eq!(TemplateModule::fungible_item_id(1,1).owner, 1);
        assert_eq!(TemplateModule::balance_count(1,1), 1000);
        assert_eq!(TemplateModule::address_tokens(1,1), [1]);

        assert_noop!(
            TemplateModule::transfer_from(origin2.clone(), 1, 3, 1, 1, 1),
            "You do not have permissions to modify this collection"
        );

        // do approve
        assert_ok!(TemplateModule::approve(origin1.clone(), 2, 1, 1));
        assert_eq!(TemplateModule::approved(1,(1,1)).len(), 1);
        assert_ok!(TemplateModule::approve(origin1.clone(), 10, 1, 1));
        assert_eq!(TemplateModule::approved(1,(1,1)).len(), 2);
        assert_eq!(TemplateModule::approved(1,(1,1))[0], ApprovePermissions { approved: 2, amount: 100000000});

        assert_ok!(TemplateModule::transfer_from(origin2.clone(), 1, 3, 1, 1, 100));
        assert_eq!(TemplateModule::balance_count(1,1), 900);
        assert_eq!(TemplateModule::balance_count(1,3), 100);
        assert_eq!(TemplateModule::address_tokens(1,1), [1]);
        assert_eq!(TemplateModule::address_tokens(1,3), [2]);

        assert_eq!(TemplateModule::approved(1,(1,1)).len(), 1);
        assert_eq!(TemplateModule::approved(1,(1,1))[0], ApprovePermissions { approved: 10, amount: 100000000});

        assert_ok!(TemplateModule::approve(origin1.clone(), 2, 1, 1));
        assert_ok!(TemplateModule::transfer_from(origin2.clone(), 1, 3, 1, 1, 900));
        assert_eq!(TemplateModule::balance_count(1,1), 0);
        assert_eq!(TemplateModule::balance_count(1,3), 1000);
        assert_eq!(TemplateModule::address_tokens(1,1), []);
        assert_eq!(TemplateModule::address_tokens(1,3), [2]);

        assert_eq!(TemplateModule::approved(1,(1,1)).len(), 0);
    });
}
















// #[test]
// fn create_collection_test() {
//     new_test_ext().execute_with(|| {
//         let col_name1: Vec<u16> = "Test1\0".encode_utf16().collect::<Vec<u16>>();
//         let col_desc1: Vec<u16> = "TestDescription1\0".encode_utf16().collect::<Vec<u16>>();
//         let token_prefix1: Vec<u8> = b"token_prefix1\0".to_vec();

//         let size = 1024;
//         let origin1 = Origin::signed(1);
//         assert_ok!(TemplateModule::create_collection(
//             origin1.clone(),
//             col_name1.clone(),
//             col_desc1.clone(),
//             token_prefix1.clone(),
//             size
//         ));
//         assert_eq!(TemplateModule::collection(1).owner, 1);
//     });
// }

// #[test]
// fn change_collection_owner() {
//     new_test_ext().execute_with(|| {
//         let col_name1: Vec<u16> = "Test1\0".encode_utf16().collect::<Vec<u16>>();
//         let col_desc1: Vec<u16> = "TestDescription1\0".encode_utf16().collect::<Vec<u16>>();
//         let token_prefix1: Vec<u8> = b"token_prefix1\0".to_vec();

//         let size = 1024;
//         let origin1 = Origin::signed(1);

//         assert_ok!(TemplateModule::create_collection(
//             origin1.clone(),
//             col_name1.clone(),
//             col_desc1.clone(),
//             token_prefix1.clone(),
//             size
//         ));
//         assert_ok!(TemplateModule::change_collection_owner(
//             origin1.clone(),
//             1,
//             2
//         ));
//         assert_eq!(TemplateModule::collection(1).owner, 2);
//     });
// }

// #[test]
// fn destroy_collection() {
//     new_test_ext().execute_with(|| {
//         let col_name1: Vec<u16> = "Test1\0".encode_utf16().collect::<Vec<u16>>();
//         let col_desc1: Vec<u16> = "TestDescription1\0".encode_utf16().collect::<Vec<u16>>();
//         let token_prefix1: Vec<u8> = b"token_prefix1\0".to_vec();

//         let size = 1024;
//         let origin1 = Origin::signed(1);

//         assert_ok!(TemplateModule::create_collection(
//             origin1.clone(),
//             col_name1.clone(),
//             col_desc1.clone(),
//             token_prefix1.clone(),
//             size
//         ));
//         assert_ok!(TemplateModule::destroy_collection(origin1.clone(), 1));
//     });
// }

// #[test]
// fn create_item() {
//     new_test_ext().execute_with(|| {
//         let col_name1: Vec<u16> = "Test1\0".encode_utf16().collect::<Vec<u16>>();
//         let col_desc1: Vec<u16> = "TestDescription1\0".encode_utf16().collect::<Vec<u16>>();
//         let token_prefix1: Vec<u8> = b"token_prefix1\0".to_vec();

//         let size = 1024;
//         let origin1 = Origin::signed(1);
//         let origin2 = Origin::signed(2);

//         assert_ok!(TemplateModule::create_collection(
//             origin1.clone(),
//             col_name1.clone(),
//             col_desc1.clone(),
//             token_prefix1.clone(),
//             size
//         ));
//         assert_ok!(TemplateModule::add_collection_admin(origin1.clone(), 1, 2));
//         assert_ok!(TemplateModule::create_item(
//             origin2.clone(),
//             1,
//             [1, 1, 1].to_vec()
//         ));

//         // check balance (collection with id = 1, user id = 2)
//         assert_eq!(TemplateModule::balance_count((1, 2)), 1);
//     });
// }

// #[test]
// fn burn_item() {
//     new_test_ext().execute_with(|| {
//         let col_name1: Vec<u16> = "Test1\0".encode_utf16().collect::<Vec<u16>>();
//         let col_desc1: Vec<u16> = "TestDescription1\0".encode_utf16().collect::<Vec<u16>>();
//         let token_prefix1: Vec<u8> = b"token_prefix1\0".to_vec();

//         let size = 1024;
//         let origin1 = Origin::signed(1);
//         let origin2 = Origin::signed(2);

//         assert_ok!(TemplateModule::create_collection(
//             origin1.clone(),
//             col_name1.clone(),
//             col_desc1.clone(),
//             token_prefix1.clone(),
//             size
//         ));
//         assert_ok!(TemplateModule::add_collection_admin(origin1.clone(), 1, 2));
//         assert_ok!(TemplateModule::create_item(
//             origin2.clone(),
//             1,
//             [1, 1, 1].to_vec()
//         ));

//         // check balance (collection with id = 1, user id = 2)
//         assert_eq!(TemplateModule::balance_count((1, 2)), 1);

//         // burn item
//         assert_ok!(TemplateModule::burn_item(origin1.clone(), 1, 1));
//         assert_noop!(
//             TemplateModule::burn_item(origin1.clone(), 1, 1),
//             "Item does not exists"
//         );

//         assert_eq!(TemplateModule::balance_count((1, 1)), 0);
//     });
// }

// #[test]
// fn add_collection_admin() {
//     new_test_ext().execute_with(|| {
//         let col_name1: Vec<u16> = "Test1\0".encode_utf16().collect::<Vec<u16>>();
//         let col_desc1: Vec<u16> = "TestDescription1\0".encode_utf16().collect::<Vec<u16>>();
//         let token_prefix1: Vec<u8> = b"token_prefix1\0".to_vec();

//         let size = 1024;
//         let origin1 = Origin::signed(1);
//         let origin2 = Origin::signed(2);
//         let origin3 = Origin::signed(3);

//         assert_ok!(TemplateModule::create_collection(
//             origin1.clone(),
//             col_name1.clone(),
//             col_desc1.clone(),
//             token_prefix1.clone(),
//             size
//         ));
//         assert_ok!(TemplateModule::create_collection(
//             origin2.clone(),
//             col_name1.clone(),
//             col_desc1.clone(),
//             token_prefix1.clone(),
//             size
//         ));
//         assert_ok!(TemplateModule::create_collection(
//             origin3.clone(),
//             col_name1.clone(),
//             col_desc1.clone(),
//             token_prefix1.clone(),
//             size
//         ));

//         assert_eq!(TemplateModule::collection(1).owner, 1);
//         assert_eq!(TemplateModule::collection(2).owner, 2);
//         assert_eq!(TemplateModule::collection(3).owner, 3);

//         // collection admin
//         assert_ok!(TemplateModule::add_collection_admin(origin1.clone(), 1, 2));
//         assert_ok!(TemplateModule::add_collection_admin(origin1.clone(), 1, 3));

//         assert_eq!(TemplateModule::admin_list_collection(1).contains(&2), true);
//         assert_eq!(TemplateModule::admin_list_collection(1).contains(&3), true);
//     });
// }

// #[test]
// fn remove_collection_admin() {
//     new_test_ext().execute_with(|| {
//         let col_name1: Vec<u16> = "Test1\0".encode_utf16().collect::<Vec<u16>>();
//         let col_desc1: Vec<u16> = "TestDescription1\0".encode_utf16().collect::<Vec<u16>>();
//         let token_prefix1: Vec<u8> = b"token_prefix1\0".to_vec();

//         let size = 1024;
//         let origin1 = Origin::signed(1);
//         let origin2 = Origin::signed(2);
//         let origin3 = Origin::signed(3);

//         assert_ok!(TemplateModule::create_collection(
//             origin1.clone(),
//             col_name1.clone(),
//             col_desc1.clone(),
//             token_prefix1.clone(),
//             size
//         ));
//         assert_ok!(TemplateModule::create_collection(
//             origin2.clone(),
//             col_name1.clone(),
//             col_desc1.clone(),
//             token_prefix1.clone(),
//             size
//         ));
//         assert_ok!(TemplateModule::create_collection(
//             origin3.clone(),
//             col_name1.clone(),
//             col_desc1.clone(),
//             token_prefix1.clone(),
//             size
//         ));

//         assert_eq!(TemplateModule::collection(1).owner, 1);
//         assert_eq!(TemplateModule::collection(2).owner, 2);
//         assert_eq!(TemplateModule::collection(3).owner, 3);

//         // collection admin
//         assert_ok!(TemplateModule::add_collection_admin(origin1.clone(), 1, 2));
//         assert_ok!(TemplateModule::add_collection_admin(origin1.clone(), 1, 3));

//         assert_eq!(TemplateModule::admin_list_collection(1).contains(&2), true);
//         assert_eq!(TemplateModule::admin_list_collection(1).contains(&3), true);

//         // remove admin
//         assert_ok!(TemplateModule::remove_collection_admin(
//             origin2.clone(),
//             1,
//             3
//         ));
//         assert_eq!(TemplateModule::admin_list_collection(1).contains(&3), false);
//     });
// }

// #[test]
// fn balance_of() {
//     new_test_ext().execute_with(|| {
//         let col_name1: Vec<u16> = "Test1\0".encode_utf16().collect::<Vec<u16>>();
//         let col_desc1: Vec<u16> = "TestDescription1\0".encode_utf16().collect::<Vec<u16>>();
//         let token_prefix1: Vec<u8> = b"token_prefix1\0".to_vec();

//         let size = 1024;
//         let origin1 = Origin::signed(1);
//         let origin2 = Origin::signed(2);
//         let origin3 = Origin::signed(3);

//         assert_ok!(TemplateModule::create_collection(
//             origin1.clone(),
//             col_name1.clone(),
//             col_desc1.clone(),
//             token_prefix1.clone(),
//             size
//         ));
//         assert_ok!(TemplateModule::create_collection(
//             origin2.clone(),
//             col_name1.clone(),
//             col_desc1.clone(),
//             token_prefix1.clone(),
//             size
//         ));
//         assert_ok!(TemplateModule::create_collection(
//             origin3.clone(),
//             col_name1.clone(),
//             col_desc1.clone(),
//             token_prefix1.clone(),
//             size
//         ));

//         assert_eq!(TemplateModule::collection(1).owner, 1);
//         assert_eq!(TemplateModule::collection(2).owner, 2);
//         assert_eq!(TemplateModule::collection(3).owner, 3);

//         // check balance before
//         assert_eq!(TemplateModule::balance_count((1, 1)), 0);

//         // create item
//         assert_ok!(TemplateModule::create_item(
//             origin1.clone(),
//             1,
//             [1, 1, 1].to_vec()
//         ));

//         // check balance (collection with id = 1, user id = 2)
//         assert_eq!(TemplateModule::balance_count((1, 1)), 1);
//         assert_eq!(TemplateModule::item_id((1, 1)).owner, 1);
//     });
// }

// #[test]
// fn transfer() {
//     new_test_ext().execute_with(|| {
//         let col_name1: Vec<u16> = "Test1\0".encode_utf16().collect::<Vec<u16>>();
//         let col_desc1: Vec<u16> = "TestDescription1\0".encode_utf16().collect::<Vec<u16>>();
//         let token_prefix1: Vec<u8> = b"token_prefix1\0".to_vec();

//         let size = 1024;
//         let origin1 = Origin::signed(1);
//         let origin2 = Origin::signed(2);
//         let origin3 = Origin::signed(3);

//         assert_ok!(TemplateModule::create_collection(
//             origin1.clone(),
//             col_name1.clone(),
//             col_desc1.clone(),
//             token_prefix1.clone(),
//             size
//         ));
//         assert_ok!(TemplateModule::create_collection(
//             origin2.clone(),
//             col_name1.clone(),
//             col_desc1.clone(),
//             token_prefix1.clone(),
//             size
//         ));
//         assert_ok!(TemplateModule::create_collection(
//             origin3.clone(),
//             col_name1.clone(),
//             col_desc1.clone(),
//             token_prefix1.clone(),
//             size
//         ));

//         assert_eq!(TemplateModule::collection(1).owner, 1);
//         assert_eq!(TemplateModule::collection(2).owner, 2);
//         assert_eq!(TemplateModule::collection(3).owner, 3);

//         // create item
//         assert_ok!(TemplateModule::create_item(
//             origin1.clone(),
//             1,
//             [1, 1, 1].to_vec()
//         ));

//         // transfer
//         assert_ok!(TemplateModule::transfer(origin1.clone(), 1, 1, 2));
//         assert_eq!(TemplateModule::item_id((1, 1)).owner, 2);

//         // balance_of check
//         assert_eq!(TemplateModule::balance_count((1, 1)), 0);
//         assert_eq!(TemplateModule::balance_count((1, 2)), 1);
//     });
// }

// #[test]
// fn approve() {
//     new_test_ext().execute_with(|| {
//         let col_name1: Vec<u16> = "Test1\0".encode_utf16().collect::<Vec<u16>>();
//         let col_desc1: Vec<u16> = "TestDescription1\0".encode_utf16().collect::<Vec<u16>>();
//         let token_prefix1: Vec<u8> = b"token_prefix1\0".to_vec();

//         let size = 1024;
//         let origin1 = Origin::signed(1);
//         let origin2 = Origin::signed(2);
//         let origin3 = Origin::signed(3);

//         assert_ok!(TemplateModule::create_collection(
//             origin1.clone(),
//             col_name1.clone(),
//             col_desc1.clone(),
//             token_prefix1.clone(),
//             size
//         ));
//         assert_ok!(TemplateModule::create_collection(
//             origin2.clone(),
//             col_name1.clone(),
//             col_desc1.clone(),
//             token_prefix1.clone(),
//             size
//         ));
//         assert_ok!(TemplateModule::create_collection(
//             origin3.clone(),
//             col_name1.clone(),
//             col_desc1.clone(),
//             token_prefix1.clone(),
//             size
//         ));

//         assert_eq!(TemplateModule::collection(1).owner, 1);
//         assert_eq!(TemplateModule::collection(2).owner, 2);
//         assert_eq!(TemplateModule::collection(3).owner, 3);

//         // create item
//         assert_ok!(TemplateModule::create_item(
//             origin1.clone(),
//             1,
//             [1, 1, 1].to_vec()
//         ));

//         // approve
//         assert_ok!(TemplateModule::approve(origin1.clone(), 2, 1, 1));
//         assert_eq!(TemplateModule::approved((1, 1)).contains(&2), true);
//     });
// }

// #[test]
// fn get_approved() {
//     new_test_ext().execute_with(|| {
//         let col_name1: Vec<u16> = "Test1\0".encode_utf16().collect::<Vec<u16>>();
//         let col_desc1: Vec<u16> = "TestDescription1\0".encode_utf16().collect::<Vec<u16>>();
//         let token_prefix1: Vec<u8> = b"token_prefix1\0".to_vec();

//         let size = 1024;
//         let origin1 = Origin::signed(1);
//         let origin2 = Origin::signed(2);
//         let origin3 = Origin::signed(3);

//         assert_ok!(TemplateModule::create_collection(
//             origin1.clone(),
//             col_name1.clone(),
//             col_desc1.clone(),
//             token_prefix1.clone(),
//             size
//         ));
//         assert_ok!(TemplateModule::create_collection(
//             origin2.clone(),
//             col_name1.clone(),
//             col_desc1.clone(),
//             token_prefix1.clone(),
//             size
//         ));
//         assert_ok!(TemplateModule::create_collection(
//             origin3.clone(),
//             col_name1.clone(),
//             col_desc1.clone(),
//             token_prefix1.clone(),
//             size
//         ));

//         assert_eq!(TemplateModule::collection(1).owner, 1);
//         assert_eq!(TemplateModule::collection(2).owner, 2);
//         assert_eq!(TemplateModule::collection(3).owner, 3);

//         // create item
//         assert_ok!(TemplateModule::create_item(
//             origin1.clone(),
//             1,
//             [1, 1, 1].to_vec()
//         ));

//         // approve
//         assert_ok!(TemplateModule::approve(origin1.clone(), 2, 1, 1));
//         assert_eq!(TemplateModule::approved((1, 1)).contains(&2), true);
//     });
// }

// #[test]
// fn transfer_from() {
//     new_test_ext().execute_with(|| {
//         let col_name1: Vec<u16> = "Test1\0".encode_utf16().collect::<Vec<u16>>();
//         let col_desc1: Vec<u16> = "TestDescription1\0".encode_utf16().collect::<Vec<u16>>();
//         let token_prefix1: Vec<u8> = b"token_prefix1\0".to_vec();

//         let size = 1024;
//         let origin1 = Origin::signed(1);
//         let origin2 = Origin::signed(2);
//         let origin3 = Origin::signed(3);

//         assert_ok!(TemplateModule::create_collection(
//             origin1.clone(),
//             col_name1.clone(),
//             col_desc1.clone(),
//             token_prefix1.clone(),
//             size
//         ));
//         assert_ok!(TemplateModule::create_collection(
//             origin2.clone(),
//             col_name1.clone(),
//             col_desc1.clone(),
//             token_prefix1.clone(),
//             size
//         ));
//         assert_ok!(TemplateModule::create_collection(
//             origin3.clone(),
//             col_name1.clone(),
//             col_desc1.clone(),
//             token_prefix1.clone(),
//             size
//         ));

//         assert_eq!(TemplateModule::collection(1).owner, 1);
//         assert_eq!(TemplateModule::collection(2).owner, 2);
//         assert_eq!(TemplateModule::collection(3).owner, 3);

//         // create item
//         assert_ok!(TemplateModule::create_item(
//             origin1.clone(),
//             1,
//             [1, 1, 1].to_vec()
//         ));

//         // approve
//         assert_ok!(TemplateModule::approve(origin1.clone(), 2, 1, 1));
//         assert_ok!(TemplateModule::transfer_from(origin1.clone(), 1, 1, 2));
//     });
// }

// #[test]
// fn index_list() {
//     new_test_ext().execute_with(|| {
//         let col_name1: Vec<u16> = "Test1\0".encode_utf16().collect::<Vec<u16>>();
//         let col_desc1: Vec<u16> = "TestDescription1\0".encode_utf16().collect::<Vec<u16>>();
//         let token_prefix1: Vec<u8> = b"token_prefix1\0".to_vec();

//         let size = 1024;
//         let origin1 = Origin::signed(1);
//         let origin2 = Origin::signed(2);
//         let origin3 = Origin::signed(3);

//         assert_ok!(TemplateModule::create_collection(
//             origin1.clone(),
//             col_name1.clone(),
//             col_desc1.clone(),
//             token_prefix1.clone(),
//             size
//         ));
//         assert_ok!(TemplateModule::create_collection(
//             origin2.clone(),
//             col_name1.clone(),
//             col_desc1.clone(),
//             token_prefix1.clone(),
//             size
//         ));
//         assert_ok!(TemplateModule::create_collection(
//             origin3.clone(),
//             col_name1.clone(),
//             col_desc1.clone(),
//             token_prefix1.clone(),
//             size
//         ));

//         assert_eq!(TemplateModule::collection(1).owner, 1);
//         assert_eq!(TemplateModule::collection(2).owner, 2);
//         assert_eq!(TemplateModule::collection(3).owner, 3);
//         // create items
//         assert_ok!(TemplateModule::create_item(
//             origin1.clone(),
//             1,
//             [1, 1, 1].to_vec()
//         ));
//         assert_ok!(TemplateModule::create_item(
//             origin1.clone(),
//             1,
//             [1, 1, 2].to_vec()
//         ));
//         assert_ok!(TemplateModule::create_item(
//             origin1.clone(),
//             1,
//             [1, 2, 3].to_vec()
//         ));
//         assert_eq!(TemplateModule::address_tokens((1, 1)).len(), 3);
//         // burn one
//         assert_ok!(TemplateModule::burn_item(origin1.clone(), 1, 2));
//         assert_eq!(TemplateModule::address_tokens((1, 1)).len(), 2);
//         // burn another one
//         assert_ok!(TemplateModule::burn_item(origin1.clone(), 1, 3));
//         assert_eq!(TemplateModule::address_tokens((1, 1))[0], 1);
//     });
// }
