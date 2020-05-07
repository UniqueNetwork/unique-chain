// Tests to be written here
use crate::{ mock::*};
use frame_support::{assert_ok, assert_noop};

#[test]
fn create_collection_test() {
    new_test_ext().execute_with(|| {
        let size = 1024;
        let origin1 = Origin::signed(1);
        assert_ok!(TemplateModule::create_collection(origin1.clone(), size));
        assert_eq!(TemplateModule::collection(1).owner, 1);
    });
}

#[test]
fn change_collection_owner() {
	new_test_ext().execute_with(|| {
        let size = 1024;
        let origin1 = Origin::signed(1);

        assert_ok!(TemplateModule::create_collection(origin1.clone(), size));
        assert_ok!(TemplateModule::change_collection_owner(origin1.clone(), 1, 2));
        assert_eq!(TemplateModule::collection(1).owner, 2);
	});
}

#[test]
fn destroy_collection() {
	new_test_ext().execute_with(|| {
        let size = 1024;
        let origin1 = Origin::signed(1);

        assert_ok!(TemplateModule::create_collection(origin1.clone(), size));
        assert_ok!(TemplateModule::destroy_collection(origin1.clone(), 1));
	});
}

#[test]
fn create_item() {
	new_test_ext().execute_with(|| {
        let size = 1024;
        let origin1 = Origin::signed(1);
        let origin2 = Origin::signed(2);

        assert_ok!(TemplateModule::create_collection(origin1.clone(), size));
        assert_ok!(TemplateModule::add_collection_admin(origin1.clone(), 1, 2));
        assert_ok!(TemplateModule::create_item(origin2.clone(), 1, [1,1,1].to_vec()));

        // check balance (collection with id = 1, user id = 2)
        assert_eq!(TemplateModule::balance_count((1, 2)), 1);
	});
}

#[test]
fn burn_item() {
	new_test_ext().execute_with(|| {
        let size = 1024;
        let origin1 = Origin::signed(1);
        let origin2 = Origin::signed(2);

        assert_ok!(TemplateModule::create_collection(origin1.clone(), size));
        assert_ok!(TemplateModule::add_collection_admin(origin1.clone(), 1, 2));
        assert_ok!(TemplateModule::create_item(origin2.clone(), 1, [1,1,1].to_vec()));

        // check balance (collection with id = 1, user id = 2)
        assert_eq!(TemplateModule::balance_count((1, 2)), 1);

        // burn item
        assert_ok!(TemplateModule::burn_item(origin1.clone(), 1, 1));
        assert_noop!(TemplateModule::burn_item(origin1.clone(), 1, 1), "Item does not exists");

        assert_eq!(TemplateModule::balance_count((1, 1)), 0);
	});
}


#[test]
fn add_collection_admin() {
	new_test_ext().execute_with(|| {
        let size = 1024;
        let origin1 = Origin::signed(1);
        let origin2 = Origin::signed(2);
        let origin3 = Origin::signed(3);

        assert_ok!(TemplateModule::create_collection(origin1.clone(), size));
        assert_ok!(TemplateModule::create_collection(origin2.clone(), size));
        assert_ok!(TemplateModule::create_collection(origin3.clone(), size));

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
        let size = 1024;
        let origin1 = Origin::signed(1);
        let origin2 = Origin::signed(2);
        let origin3 = Origin::signed(3);

        assert_ok!(TemplateModule::create_collection(origin1.clone(), size));
        assert_ok!(TemplateModule::create_collection(origin2.clone(), size));
        assert_ok!(TemplateModule::create_collection(origin3.clone(), size));

        assert_eq!(TemplateModule::collection(1).owner, 1);
        assert_eq!(TemplateModule::collection(2).owner, 2);
        assert_eq!(TemplateModule::collection(3).owner, 3);

        // collection admin
        assert_ok!(TemplateModule::add_collection_admin(origin1.clone(), 1, 2));
        assert_ok!(TemplateModule::add_collection_admin(origin1.clone(), 1, 3));

        assert_eq!(TemplateModule::admin_list_collection(1).contains(&2), true);
        assert_eq!(TemplateModule::admin_list_collection(1).contains(&3), true);

        // remove admin
        assert_ok!(TemplateModule::remove_collection_admin(origin2.clone(), 1, 3));
        assert_eq!(TemplateModule::admin_list_collection(1).contains(&3), false);
        });
}

#[test]
fn balance_of() {
	new_test_ext().execute_with(|| {
        let size = 1024;
        let origin1 = Origin::signed(1);
        let origin2 = Origin::signed(2);
        let origin3 = Origin::signed(3);

        assert_ok!(TemplateModule::create_collection(origin1.clone(), size));
        assert_ok!(TemplateModule::create_collection(origin2.clone(), size));
        assert_ok!(TemplateModule::create_collection(origin3.clone(), size));

        assert_eq!(TemplateModule::collection(1).owner, 1);
        assert_eq!(TemplateModule::collection(2).owner, 2);
        assert_eq!(TemplateModule::collection(3).owner, 3);

        // check balance before
        assert_eq!(TemplateModule::balance_count((1, 1)), 0);

        // create item
        assert_ok!(TemplateModule::create_item(origin1.clone(), 1, [1,1,1].to_vec()));
 
        // check balance (collection with id = 1, user id = 2)
        assert_eq!(TemplateModule::balance_count((1, 1)), 1);
        assert_eq!(TemplateModule::item_id((1,1)).owner, 1);
        });
}

#[test]
fn transfer() {
	new_test_ext().execute_with(|| {
        let size = 1024;
        let origin1 = Origin::signed(1);
        let origin2 = Origin::signed(2);
        let origin3 = Origin::signed(3);

        assert_ok!(TemplateModule::create_collection(origin1.clone(), size));
        assert_ok!(TemplateModule::create_collection(origin2.clone(), size));
        assert_ok!(TemplateModule::create_collection(origin3.clone(), size));

        assert_eq!(TemplateModule::collection(1).owner, 1);
        assert_eq!(TemplateModule::collection(2).owner, 2);
        assert_eq!(TemplateModule::collection(3).owner, 3);

        // create item
        assert_ok!(TemplateModule::create_item(origin1.clone(), 1, [1,1,1].to_vec()));

        // transfer
        assert_ok!(TemplateModule::transfer(origin1.clone(), 1, 1, 2));
        assert_eq!(TemplateModule::item_id((1,1)).owner, 2);

        // balance_of check
        assert_eq!(TemplateModule::balance_count((1, 1)), 0);
        assert_eq!(TemplateModule::balance_count((1, 2)), 1);
        });
}
