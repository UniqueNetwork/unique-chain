use xcm::{
	VersionedXcm,
	latest::{prelude::*, Error},
};
use codec::Encode;
use crate::{Runtime, RuntimeCall, RuntimeOrigin, RuntimeEvent, PolkadotXcm};
use super::{new_test_ext, last_events, AccountId};
use frame_support::{pallet_prelude::Weight};

const ALICE: AccountId = AccountId::new([0u8; 32]);
const BOB: AccountId = AccountId::new([1u8; 32]);

const INITIAL_BALANCE: u128 = 1000000000000000000_0000; // 1000 UNQ

#[test]
pub fn xcm_transact_is_forbidden() {
	new_test_ext(vec![(ALICE, INITIAL_BALANCE)]).execute_with(|| {
		PolkadotXcm::execute(
			RuntimeOrigin::signed(ALICE),
			Box::new(VersionedXcm::from(Xcm(vec![Transact {
				origin_kind: OriginKind::Native,
				require_weight_at_most: Weight::from_parts(1000, 1000),
				call: RuntimeCall::Balances(pallet_balances::Call::<Runtime>::transfer {
					dest: BOB.into(),
					value: INITIAL_BALANCE / 2,
				})
				.encode()
				.into(),
			}]))),
			Weight::from_parts(1001000, 2000),
		)
		.expect(
			"XCM execute must succeed, the error should be in the `PolkadotXcm::Attempted` event",
		);

		let xcm_event = &last_events(1)[0];
		match xcm_event {
			RuntimeEvent::PolkadotXcm(pallet_xcm::Event::<Runtime>::Attempted(
				Outcome::Incomplete(_weight, Error::NoPermission),
			)) => { /* Pass */ }
			_ => panic!(
				"Expected PolkadotXcm.Attempted(Incomplete(_weight, NoPermission)),\
				found: {xcm_event:#?}"
			),
		}
	});
}
