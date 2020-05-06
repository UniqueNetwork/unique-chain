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
        let origin2 = Origin::signed(2);

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

// #[test]
// fn burn_item() {
// 	new_test_ext().execute_with(|| {
//         let size = 1024;
//         let origin1 = Origin::signed(1);
//         let origin2 = Origin::signed(2);

//         assert_ok!(TemplateModule::create_collection(origin1.clone(), size));
//         assert_ok!(TemplateModule::add_collection_admin(origin1.clone(), 1, 2));
//         assert_ok!(TemplateModule::create_item(origin2.clone(), 1, [1,1,1].to_vec()));

//         // check balance (collection with id = 1, user id = 2)
//         assert_eq!(TemplateModule::balance_count((1, 2)), 1);

//         // burn item
//         assert_ok!(TemplateModule::burn_item(origin1.clone(), 1, 1));
//         assert_noop!(TemplateModule::burn_item(origin1.clone(), 1, 1), "Item does not exists");
// 	});
// }

// #[test]
// fn correct_error_for_none_value() {
// 	new_test_ext().execute_with(|| {
// 		// Ensure the correct error is thrown on None value
// 		assert_noop!(
// 			TemplateModule::cause_error(Origin::signed(1)),
// 			Error::<Test>::NoneValue
// 		);
// 	});
// }
