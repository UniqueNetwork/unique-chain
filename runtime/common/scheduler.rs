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

use frame_support::{
    traits::NamedReservableCurrency,
    weights::{GetDispatchInfo, PostDispatchInfo, DispatchInfo},
};
use sp_runtime::{
    traits::{Dispatchable, Applyable, Member},
	generic::Era,
    transaction_validity::TransactionValidityError,
	DispatchErrorWithPostInfo, DispatchError,
};
use crate::{
    Runtime, Call, Origin, Balances,
    ChargeTransactionPayment,
};
use common_types::{AccountId, Balance};
use fp_self_contained::SelfContainedCall;
use pallet_unique_scheduler::DispatchCall;

/// The SignedExtension to the basic transaction logic.
pub type SignedExtraScheduler = (
	frame_system::CheckSpecVersion<Runtime>,
	frame_system::CheckGenesis<Runtime>,
	frame_system::CheckEra<Runtime>,
	frame_system::CheckNonce<Runtime>,
	frame_system::CheckWeight<Runtime>,
);

fn get_signed_extras(from: <Runtime as frame_system::Config>::AccountId) -> SignedExtraScheduler {
	(
		frame_system::CheckSpecVersion::<Runtime>::new(),
		frame_system::CheckGenesis::<Runtime>::new(),
		frame_system::CheckEra::<Runtime>::from(Era::Immortal),
		frame_system::CheckNonce::<Runtime>::from(frame_system::Pallet::<Runtime>::account_nonce(
			from,
		)),
		frame_system::CheckWeight::<Runtime>::new(),
		// sponsoring transaction logic
		// pallet_charge_transaction::ChargeTransactionPayment::<Runtime>::new(0),
	)
}

pub struct SchedulerPaymentExecutor;

impl<T: frame_system::Config + pallet_unique_scheduler::Config, SelfContainedSignedInfo>
	DispatchCall<T, SelfContainedSignedInfo> for SchedulerPaymentExecutor
where
	<T as frame_system::Config>::Call: Member
		+ Dispatchable<Origin = Origin, Info = DispatchInfo>
		+ SelfContainedCall<SignedInfo = SelfContainedSignedInfo>
		+ GetDispatchInfo
		+ From<frame_system::Call<Runtime>>,
	SelfContainedSignedInfo: Send + Sync + 'static,
	Call: From<<T as frame_system::Config>::Call>
		+ From<<T as pallet_unique_scheduler::Config>::Call>
		+ SelfContainedCall<SignedInfo = SelfContainedSignedInfo>,
	sp_runtime::AccountId32: From<<T as frame_system::Config>::AccountId>,
{
	fn dispatch_call(
		signer: <T as frame_system::Config>::AccountId,
		call: <T as pallet_unique_scheduler::Config>::Call,
	) -> Result<
		Result<PostDispatchInfo, DispatchErrorWithPostInfo<PostDispatchInfo>>,
		TransactionValidityError,
	> {
		let dispatch_info = call.get_dispatch_info();
		let extrinsic = fp_self_contained::CheckedExtrinsic::<
			AccountId,
			Call,
			SignedExtraScheduler,
			SelfContainedSignedInfo,
		> {
			signed:
                fp_self_contained::CheckedSignature::<AccountId, SignedExtraScheduler, SelfContainedSignedInfo>::Signed(
					signer.clone().into(),
					get_signed_extras(signer.into()),
				),
			function: call.into(),
		};

		extrinsic.apply::<Runtime>(&dispatch_info, 0)
	}

	fn reserve_balance(
		id: [u8; 16],
		sponsor: <T as frame_system::Config>::AccountId,
		call: <T as pallet_unique_scheduler::Config>::Call,
		count: u32,
	) -> Result<(), DispatchError> {
		let dispatch_info = call.get_dispatch_info();
		let weight: Balance = ChargeTransactionPayment::traditional_fee(0, &dispatch_info, 0)
			.saturating_mul(count.into());

		<Balances as NamedReservableCurrency<AccountId>>::reserve_named(
			&id,
			&(sponsor.into()),
			weight,
		)
	}

	fn pay_for_call(
		id: [u8; 16],
		sponsor: <T as frame_system::Config>::AccountId,
		call: <T as pallet_unique_scheduler::Config>::Call,
	) -> Result<u128, DispatchError> {
		let dispatch_info = call.get_dispatch_info();
		let weight: Balance = ChargeTransactionPayment::traditional_fee(0, &dispatch_info, 0);
		Ok(
			<Balances as NamedReservableCurrency<AccountId>>::unreserve_named(
				&id,
				&(sponsor.into()),
				weight,
			),
		)
	}

	fn cancel_reserve(
		id: [u8; 16],
		sponsor: <T as frame_system::Config>::AccountId,
	) -> Result<u128, DispatchError> {
		Ok(
			<Balances as NamedReservableCurrency<AccountId>>::unreserve_named(
				&id,
				&(sponsor.into()),
				u128::MAX,
			),
		)
	}
}
