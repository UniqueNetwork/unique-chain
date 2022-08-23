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

use cumulus_pallet_xcm;
use frame_support::{
    {match_types, parameter_types, weights::Weight},
    pallet_prelude::Get,
    traits::{Contains, Everything, fungibles},
};
use frame_system::EnsureRoot;
use orml_traits::{location::AbsoluteReserveProvider, parameter_type_with_key};
use pallet_xcm::XcmPassthrough;
use polkadot_parachain::primitives::Sibling;
use sp_runtime::traits::{AccountIdConversion, CheckedConversion, Convert, Zero};
use sp_std::{borrow::Borrow, marker::PhantomData, vec, vec::Vec};
use xcm::{
    latest::{MultiAsset, Xcm},
    prelude::{Concrete, Fungible as XcmFungible},
    v1::{BodyId, Junction::*, Junctions::*, MultiLocation, NetworkId},
};
use xcm_builder::{
    AccountId32Aliases, AllowTopLevelPaidExecutionFrom, AllowUnpaidExecutionFrom,
    EnsureXcmOrigin, FixedWeightBounds, FungiblesAdapter, LocationInverter, ParentAsSuperuser,
    ParentIsPreset, RelayChainAsNative, SiblingParachainAsNative, SiblingParachainConvertsVia,
    SignedAccountId32AsNative, SignedToAccountId32, SovereignSignedViaLocation, TakeWeightCredit,
    ConvertedConcreteAssetId,
};
use xcm_executor::{
    {Config, XcmExecutor},
    traits::{Convert as ConvertXcm, FilterAssetLocation, JustTry, MatchesFungible, ShouldExecute},
};

use up_common::{
    constants::{MAXIMUM_BLOCK_WEIGHT, UNIQUE},
    types::{AccountId, Balance},
};

use crate::{
    Balances, Call, DmpQueue, Event, Origin, ParachainInfo,
    ParachainSystem, PolkadotXcm, Runtime, XcmpQueue,
};
use crate::runtime_common::config::substrate::{TreasuryModuleId, MaxLocks, MaxReserves};
use crate::runtime_common::config::pallets::TreasuryAccountId;
use crate::runtime_common::config::xcm::*;
use crate::*;

// Signed version of balance
pub type Amount = i128;

match_types! {
	pub type ParentOrParentsExecutivePlurality: impl Contains<MultiLocation> = {
		MultiLocation { parents: 1, interior: Here } |
		MultiLocation { parents: 1, interior: X1(Plurality { id: BodyId::Executive, .. }) }
	};
	pub type ParentOrSiblings: impl Contains<MultiLocation> = {
		MultiLocation { parents: 1, interior: Here } |
		MultiLocation { parents: 1, interior: X1(_) }
	};
}

/// Deny executing the XCM if it matches any of the Deny filter regardless of anything else.
/// If it passes the Deny, and matches one of the Allow cases then it is let through.
pub struct DenyThenTry<Deny, Allow>(PhantomData<Deny>, PhantomData<Allow>)
    where
        Deny: ShouldExecute,
        Allow: ShouldExecute;

impl<Deny, Allow> ShouldExecute for DenyThenTry<Deny, Allow>
    where
        Deny: ShouldExecute,
        Allow: ShouldExecute,
{
    fn should_execute<Call>(
        origin: &MultiLocation,
        message: &mut Xcm<Call>,
        max_weight: Weight,
        weight_credit: &mut Weight,
    ) -> Result<(), ()> {
        Deny::should_execute(origin, message, max_weight, weight_credit)?;
        Allow::should_execute(origin, message, max_weight, weight_credit)
    }
}

pub type Barrier = DenyThenTry<
    DenyExchangeWithUnknownLocation,
    (
        TakeWeightCredit,
        AllowTopLevelPaidExecutionFrom<Everything>,
        // Parent and its exec plurality get free execution
        AllowUnpaidExecutionFrom<ParentOrParentsExecutivePlurality>,
        // Expected responses are OK.
        AllowKnownQueryResponses<PolkadotXcm>,
        // Subscriptions for version tracking are OK.
        AllowSubscriptionsFrom<ParentOrSiblings>,
    ),
>;