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
	traits::{Everything, Get},
	parameter_types,
};
use frame_system::EnsureRoot;
use pallet_xcm::XcmPassthrough;
use polkadot_parachain::primitives::Sibling;
use xcm::v1::{Junction::*, MultiLocation, NetworkId};
use xcm::latest::{prelude::*, Weight};
use xcm_builder::{
	AccountId32Aliases, EnsureXcmOrigin, FixedWeightBounds, LocationInverter, ParentAsSuperuser,
	RelayChainAsNative, SiblingParachainAsNative, SiblingParachainConvertsVia,
	SignedAccountId32AsNative, SignedToAccountId32, SovereignSignedViaLocation, ParentIsPreset,
};
use xcm_executor::{Config, XcmExecutor, traits::ShouldExecute};
use sp_std::{marker::PhantomData, vec::Vec};
use crate::{
	Runtime, RuntimeCall, RuntimeEvent, RuntimeOrigin, ParachainInfo, ParachainSystem, PolkadotXcm,
	XcmpQueue, xcm_barrier::Barrier,
};

use up_common::types::AccountId;

#[cfg(feature = "foreign-assets")]
pub mod foreignassets;

#[cfg(not(feature = "foreign-assets"))]
pub mod nativeassets;

#[cfg(feature = "foreign-assets")]
pub use foreignassets as xcm_assets;

#[cfg(not(feature = "foreign-assets"))]
pub use nativeassets as xcm_assets;

use xcm_assets::{AssetTransactors, IsReserve, Trader};

parameter_types! {
	pub const RelayLocation: MultiLocation = MultiLocation::parent();
	pub const RelayNetwork: NetworkId = NetworkId::Polkadot;
	pub RelayOrigin: RuntimeOrigin = cumulus_pallet_xcm::Origin::Relay.into();
	pub Ancestry: MultiLocation = Parachain(ParachainInfo::parachain_id().into()).into();
	pub SelfLocation: MultiLocation = MultiLocation::new(1, X1(Parachain(ParachainInfo::get().into())));

	// One XCM operation is 1_000_000 weight - almost certainly a conservative estimate.
	pub UnitWeightCost: Weight = 1_000_000;
	pub const MaxInstructions: u32 = 100;
}

/// Type for specifying how a `MultiLocation` can be converted into an `AccountId`. This is used
/// when determining ownership of accounts for asset transacting and when attempting to use XCM
/// `Transact` in order to determine the dispatch Origin.
pub type LocationToAccountId = (
	// The parent (Relay-chain) origin converts to the default `AccountId`.
	ParentIsPreset<AccountId>,
	// Sibling parachain origins convert to AccountId via the `ParaId::into`.
	SiblingParachainConvertsVia<Sibling, AccountId>,
	// Straight up local `AccountId32` origins just alias directly to `AccountId`.
	AccountId32Aliases<RelayNetwork, AccountId>,
);

/// No local origins on this chain are allowed to dispatch XCM sends/executions.
pub type LocalOriginToLocation = (SignedToAccountId32<RuntimeOrigin, AccountId, RelayNetwork>,);

/// The means for routing XCM messages which are not for local execution into the right message
/// queues.
pub type XcmRouter = (
	// Two routers - use UMP to communicate with the relay chain:
	cumulus_primitives_utility::ParentAsUmp<ParachainSystem, ()>,
	// ..and XCMP to communicate with the sibling chains.
	XcmpQueue,
);

/// This is the type we use to convert an (incoming) XCM origin into a local `Origin` instance,
/// ready for dispatching a transaction with Xcm's `Transact`. There is an `OriginKind` which can
/// biases the kind of local `Origin` it will become.
pub type XcmOriginToTransactDispatchOrigin = (
	// Sovereign account converter; this attempts to derive an `AccountId` from the origin location
	// using `LocationToAccountId` and then turn that into the usual `Signed` origin. Useful for
	// foreign chains who want to have a local sovereign account on this chain which they control.
	SovereignSignedViaLocation<LocationToAccountId, RuntimeOrigin>,
	// Native converter for Relay-chain (Parent) location; will converts to a `Relay` origin when
	// recognised.
	RelayChainAsNative<RelayOrigin, RuntimeOrigin>,
	// Native converter for sibling Parachains; will convert to a `SiblingPara` origin when
	// recognised.
	SiblingParachainAsNative<cumulus_pallet_xcm::Origin, RuntimeOrigin>,
	// Superuser converter for the Relay-chain (Parent) location. This will allow it to issue a
	// transaction from the Root origin.
	ParentAsSuperuser<RuntimeOrigin>,
	// Native signed account converter; this just converts an `AccountId32` origin into a normal
	// `Origin::Signed` origin of the same 32-byte value.
	SignedAccountId32AsNative<RelayNetwork, RuntimeOrigin>,
	// Xcm origins can be represented natively under the Xcm pallet's Xcm origin.
	XcmPassthrough<RuntimeOrigin>,
);

pub trait TryPass {
	fn try_pass<Call>(origin: &MultiLocation, message: &mut Xcm<Call>) -> Result<(), ()>;
}

#[impl_trait_for_tuples::impl_for_tuples(30)]
impl TryPass for Tuple {
	fn try_pass<Call>(origin: &MultiLocation, message: &mut Xcm<Call>) -> Result<(), ()> {
		for_tuples!( #(
			Tuple::try_pass(origin, message)?;
		)* );

		Ok(())
	}
}

pub struct DenyTransact;
impl TryPass for DenyTransact {
	fn try_pass<Call>(_origin: &MultiLocation, message: &mut Xcm<Call>) -> Result<(), ()> {
		let transact_inst = message
			.0
			.iter()
			.find(|inst| matches![inst, Instruction::Transact { .. }]);

		if transact_inst.is_some() {
			log::warn!(
				target: "xcm::barrier",
				"transact XCM rejected"
			);

			Err(())
		} else {
			Ok(())
		}
	}
}

/// Deny executing the XCM if it matches any of the Deny filter regardless of anything else.
/// If it passes the Deny, and matches one of the Allow cases then it is let through.
pub struct DenyThenTry<Deny, Allow>(PhantomData<Deny>, PhantomData<Allow>)
where
	Deny: TryPass,
	Allow: ShouldExecute;

impl<Deny, Allow> ShouldExecute for DenyThenTry<Deny, Allow>
where
	Deny: TryPass,
	Allow: ShouldExecute,
{
	fn should_execute<Call>(
		origin: &MultiLocation,
		message: &mut Xcm<Call>,
		max_weight: Weight,
		weight_credit: &mut Weight,
	) -> Result<(), ()> {
		Deny::try_pass(origin, message)?;
		Allow::should_execute(origin, message, max_weight, weight_credit)
	}
}

// Allow xcm exchange only with locations in list
pub struct DenyExchangeWithUnknownLocation<T>(PhantomData<T>);
impl<T: Get<Vec<MultiLocation>>> TryPass for DenyExchangeWithUnknownLocation<T> {
	fn try_pass<Call>(origin: &MultiLocation, message: &mut Xcm<Call>) -> Result<(), ()> {
		let allowed_locations = T::get();

		// Check if deposit or transfer belongs to allowed parachains
		let mut allowed = allowed_locations.contains(origin);

		message.0.iter().for_each(|inst| match inst {
			DepositReserveAsset { dest: dst, .. } => {
				allowed |= allowed_locations.contains(dst);
			}
			TransferReserveAsset { dest: dst, .. } => {
				allowed |= allowed_locations.contains(dst);
			}
			InitiateReserveWithdraw { reserve: dst, .. } => {
				allowed |= allowed_locations.contains(dst);
			}
			_ => {}
		});

		if allowed {
			return Ok(());
		}

		log::warn!(
			target: "xcm::barrier",
			"Unexpected deposit or transfer location"
		);
		// Deny
		Err(())
	}
}

pub type Weigher = FixedWeightBounds<UnitWeightCost, RuntimeCall, MaxInstructions>;

pub struct XcmConfig<T>(PhantomData<T>);
impl<T> Config for XcmConfig<T>
where
	T: pallet_configuration::Config,
{
	type RuntimeCall = RuntimeCall;
	type XcmSender = XcmRouter;
	// How to withdraw and deposit an asset.
	type AssetTransactor = AssetTransactors;
	type OriginConverter = XcmOriginToTransactDispatchOrigin;
	type IsReserve = IsReserve;
	type IsTeleporter = (); // Teleportation is disabled
	type LocationInverter = LocationInverter<Ancestry>;
	type Barrier = Barrier;
	type Weigher = Weigher;
	type Trader = Trader<T>;
	type ResponseHandler = (); // Don't handle responses for now.
	type SubscriptionService = PolkadotXcm;

	type AssetTrap = PolkadotXcm;
	type AssetClaims = PolkadotXcm;
}

impl pallet_xcm::Config for Runtime {
	type RuntimeEvent = RuntimeEvent;
	type SendXcmOrigin = EnsureXcmOrigin<RuntimeOrigin, LocalOriginToLocation>;
	type XcmRouter = XcmRouter;
	type ExecuteXcmOrigin = EnsureXcmOrigin<RuntimeOrigin, LocalOriginToLocation>;
	type XcmExecuteFilter = Everything;
	type XcmExecutor = XcmExecutor<XcmConfig<Self>>;
	type XcmTeleportFilter = Everything;
	type XcmReserveTransferFilter = Everything;
	type Weigher = FixedWeightBounds<UnitWeightCost, RuntimeCall, MaxInstructions>;
	type LocationInverter = LocationInverter<Ancestry>;
	type RuntimeOrigin = RuntimeOrigin;
	type RuntimeCall = RuntimeCall;
	const VERSION_DISCOVERY_QUEUE_SIZE: u32 = 100;
	type AdvertisedXcmVersion = pallet_xcm::CurrentXcmVersion;
}

impl cumulus_pallet_xcm::Config for Runtime {
	type RuntimeEvent = RuntimeEvent;
	type XcmExecutor = XcmExecutor<XcmConfig<Self>>;
}

impl cumulus_pallet_xcmp_queue::Config for Runtime {
	type WeightInfo = ();
	type RuntimeEvent = RuntimeEvent;
	type XcmExecutor = XcmExecutor<XcmConfig<Self>>;
	type ChannelInfo = ParachainSystem;
	type VersionWrapper = ();
	type ExecuteOverweightOrigin = frame_system::EnsureRoot<AccountId>;
	type ControllerOrigin = EnsureRoot<AccountId>;
	type ControllerOriginConverter = XcmOriginToTransactDispatchOrigin;
}

impl cumulus_pallet_dmp_queue::Config for Runtime {
	type RuntimeEvent = RuntimeEvent;
	type XcmExecutor = XcmExecutor<XcmConfig<Self>>;
	type ExecuteOverweightOrigin = frame_system::EnsureRoot<AccountId>;
}
