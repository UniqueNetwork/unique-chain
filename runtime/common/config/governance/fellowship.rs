use pallet_gov_origins::Origin as GovOrigins;
use pallet_ranked_collective::{Config as RankedConfig, Rank, TallyOf};
use sp_runtime::traits::ReplaceWithDefault;

use super::*;
use crate::FellowshipReferenda;

pub const FELLOWSHIP_MODULE_ID: PalletId = PalletId(*b"flowship");
pub const DEMOCRACY_TRACK_ID: u16 = 10;

parameter_types! {
	pub FellowshipAccountId: <Runtime as frame_system::Config>::AccountId = FELLOWSHIP_MODULE_ID.into_account_truncating();
	pub AlarmInterval: BlockNumber = 1;
	pub SubmissionDeposit: Balance = 1000;
}

#[cfg(not(feature = "gov-test-timings"))]
use crate::governance_timings::fellowship as fellowship_timings;

#[cfg(feature = "gov-test-timings")]
pub mod fellowship_timings {
	use super::*;

	parameter_types! {
		pub UndecidingTimeout: BlockNumber = 35;
	}

	pub mod track {
		use super::*;

		pub mod democracy_proposals {
			use super::*;

			pub const PREPARE_PERIOD: BlockNumber = 3;
			pub const DECISION_PERIOD: BlockNumber = 35;
			pub const CONFIRM_PERIOD: BlockNumber = 3;
			pub const MIN_ENACTMENT_PERIOD: BlockNumber = 1;
		}
	}
}

impl pallet_referenda::Config for Runtime {
	type WeightInfo = pallet_referenda::weights::SubstrateWeight<Self>;
	type RuntimeCall = RuntimeCall;
	type RuntimeEvent = RuntimeEvent;
	type Scheduler = Scheduler;
	type Currency = Balances;
	type SubmitOrigin = pallet_ranked_collective::EnsureMember<Runtime, (), 1>;
	type CancelOrigin = RootOrAllTechnicalCommittee;
	type KillOrigin = RootOrAllTechnicalCommittee;
	type Slash = Treasury;
	type Votes = pallet_ranked_collective::Votes;
	type Tally = pallet_ranked_collective::TallyOf<Runtime>;
	type SubmissionDeposit = SubmissionDeposit;
	type MaxQueued = ConstU32<100>;
	type UndecidingTimeout = fellowship_timings::UndecidingTimeout;
	type AlarmInterval = AlarmInterval;
	type Tracks = TracksInfo;
	type Preimages = Preimage;
}

impl RankedConfig for Runtime {
	type WeightInfo = pallet_ranked_collective::weights::SubstrateWeight<Self>;
	type RuntimeEvent = RuntimeEvent;
	type AddOrigin = FellowshipAddOrigin<Self::AccountId>;
	type RemoveOrigin = FellowshipPromoteDemoteOrigin<Self::AccountId>;
	type ExchangeOrigin = FellowshipPromoteDemoteOrigin<Self::AccountId>;
	type MemberSwappedHandler = ();
	type MaxMemberCount = ();
	type PromoteOrigin = FellowshipPromoteDemoteOrigin<Self::AccountId>;
	type DemoteOrigin = FellowshipPromoteDemoteOrigin<Self::AccountId>;
	type Polls = FellowshipReferenda;
	type MinRankOfClass = ClassToRankMapper<Self, ()>;
	type VoteWeight = pallet_ranked_collective::Geometric;

	#[cfg(feature = "runtime-benchmarks")]
	type BenchmarkSetup = ();
}

pub struct EnsureFellowshipProposition;
impl<O> EnsureOrigin<O> for EnsureFellowshipProposition
where
	O: Into<Result<GovOrigins, O>> + From<GovOrigins>,
{
	type Success = AccountId;

	fn try_origin(o: O) -> Result<Self::Success, O> {
		o.into().and_then(|o| match o {
			GovOrigins::FellowshipProposition => Ok(FellowshipAccountId::get()),
			o => Err(O::from(o)),
		})
	}

	#[cfg(feature = "runtime-benchmarks")]
	fn try_successful_origin() -> Result<O, ()> {
		Ok(O::from(GovOrigins::FellowshipProposition))
	}
}

pub type FellowshipAddOrigin<AccountId> = EitherOf<
	EnsureRoot<AccountId>,
	EitherOf<
		MapSuccess<TechnicalCommitteeMember, ReplaceWithDefault<()>>,
		MapSuccess<CouncilMember, ReplaceWithDefault<()>>,
	>,
>;

pub type FellowshipPromoteDemoteOrigin<AccountId> = EitherOf<
	MapSuccess<EnsureRoot<AccountId>, Replace<ConstU16<65535>>>,
	MapSuccess<MoreThanHalfCouncil, Replace<ConstU16<9>>>,
>;

pub struct TracksInfo;
impl pallet_referenda::TracksInfo<Balance, BlockNumber> for TracksInfo {
	type Id = u16;
	type RuntimeOrigin = <RuntimeOrigin as frame_support::traits::OriginTrait>::PalletsOrigin;
	fn tracks() -> &'static [(Self::Id, pallet_referenda::TrackInfo<Balance, BlockNumber>)] {
		static DATA: [(u16, pallet_referenda::TrackInfo<Balance, BlockNumber>); 1] = [(
			DEMOCRACY_TRACK_ID,
			pallet_referenda::TrackInfo {
				name: "democracy_proposals",
				max_deciding: 10,
				decision_deposit: 10 * UNIQUE,
				prepare_period: fellowship_timings::track::democracy_proposals::PREPARE_PERIOD,
				decision_period: fellowship_timings::track::democracy_proposals::DECISION_PERIOD,
				confirm_period: fellowship_timings::track::democracy_proposals::CONFIRM_PERIOD,
				min_enactment_period:
					fellowship_timings::track::democracy_proposals::MIN_ENACTMENT_PERIOD,
				min_approval: pallet_referenda::Curve::LinearDecreasing {
					length: Perbill::from_percent(100),
					floor: Perbill::from_percent(50),
					ceil: Perbill::from_percent(100),
				},
				min_support: pallet_referenda::Curve::LinearDecreasing {
					length: Perbill::from_percent(100),
					floor: Perbill::from_percent(0),
					ceil: Perbill::from_percent(50),
				},
			},
		)];
		&DATA[..]
	}
	fn track_for(id: &Self::RuntimeOrigin) -> Result<Self::Id, ()> {
		#[cfg(feature = "runtime-benchmarks")]
		{
			// For benchmarks, we enable a root origin.
			// It is important that this is not available in production!
			let root: Self::RuntimeOrigin = frame_system::RawOrigin::Root.into();
			if &root == id {
				return Ok(9);
			}
		}

		match GovOrigins::try_from(id.clone()) {
			Ok(_) => Ok(DEMOCRACY_TRACK_ID),
			_ => Err(()),
		}
	}
}

pallet_referenda::impl_tracksinfo_get!(TracksInfo, Balance, BlockNumber);

pub struct ClassToRankMapper<T, I>(PhantomData<(T, I)>);

//TODO: Remove the type when it appears in the release.
pub type ClassOf<T, I = ()> = <<T as RankedConfig<I>>::Polls as Polling<TallyOf<T, I>>>::Class;

impl<T, I> Convert<ClassOf<T, I>, Rank> for ClassToRankMapper<T, I>
where
	T: RankedConfig<I>,
	ClassOf<T, I>: Into<Rank>,
{
	fn convert(track_id: ClassOf<T, I>) -> Rank {
		match track_id.into() {
			DEMOCRACY_TRACK_ID => 3,
			other => other,
		}
	}
}
