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
	dispatch::{GetDispatchInfo, PostDispatchInfo, DispatchInfo},
};
use sp_runtime::{
	traits::{Dispatchable, Applyable, Member},
	generic::Era,
	transaction_validity::TransactionValidityError,
	DispatchErrorWithPostInfo,
};
use codec::Encode;
use crate::{Runtime, RuntimeCall, RuntimeOrigin, maintenance};
use up_common::types::AccountId;
use fp_self_contained::SelfContainedCall;
use pallet_unique_scheduler_v2::DispatchCall;
use pallet_transaction_payment::ChargeTransactionPayment;

/// The SignedExtension to the basic transaction logic.
pub type SignedExtraScheduler = (
	frame_system::CheckWeight<Runtime>,
	maintenance::CheckMaintenance,
	ChargeTransactionPayment<Runtime>,
);

fn get_signed_extras(from: <Runtime as frame_system::Config>::AccountId) -> SignedExtraScheduler {
	(
		frame_system::CheckWeight::<Runtime>::new(),
		maintenance::CheckMaintenance,
		ChargeTransactionPayment::<Runtime>::from(0),
	)
}

pub struct SchedulerPaymentExecutor;

impl<T: frame_system::Config + pallet_unique_scheduler_v2::Config, SelfContainedSignedInfo>
	DispatchCall<T, SelfContainedSignedInfo> for SchedulerPaymentExecutor
where
	<T as frame_system::Config>::RuntimeCall: Member
		+ Dispatchable<RuntimeOrigin = RuntimeOrigin, Info = DispatchInfo>
		+ SelfContainedCall<SignedInfo = SelfContainedSignedInfo>
		+ GetDispatchInfo
		+ From<frame_system::Call<Runtime>>,
	SelfContainedSignedInfo: Send + Sync + 'static,
	RuntimeCall: From<<T as frame_system::Config>::RuntimeCall>
		+ From<<T as pallet_unique_scheduler_v2::Config>::RuntimeCall>
		+ SelfContainedCall<SignedInfo = SelfContainedSignedInfo>,
	sp_runtime::AccountId32: From<<T as frame_system::Config>::AccountId>,
{
	fn dispatch_call(
		signer: Option<<T as frame_system::Config>::AccountId>,
		call: <T as pallet_unique_scheduler_v2::Config>::RuntimeCall,
	) -> Result<
		Result<PostDispatchInfo, DispatchErrorWithPostInfo<PostDispatchInfo>>,
		TransactionValidityError,
	> {
		let dispatch_info = call.get_dispatch_info();
		let len = call.encoded_size();

		let signed = match signer {
			Some(signer) => fp_self_contained::CheckedSignature::Signed(
				signer.clone().into(),
				get_signed_extras(signer.into()),
			),
			None => fp_self_contained::CheckedSignature::Unsigned,
		};

		let extrinsic = fp_self_contained::CheckedExtrinsic::<
			AccountId,
			RuntimeCall,
			SignedExtraScheduler,
			SelfContainedSignedInfo,
		> {
			signed,
			function: call.into(),
		};

		extrinsic.apply::<Runtime>(&dispatch_info, len)
	}
}
