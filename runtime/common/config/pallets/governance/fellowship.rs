use crate::{
	Preimage, Treasury, RuntimeCall, RuntimeEvent, GovScheduler as Scheduler, FellowshipReferenda,
};
use super::*;
use origins::Origin as FellowshipOrigin;
use pallet_ranked_collective::{Config as RankedConfig, Rank, TallyOf};

pub const FELLOWSHIP_MODULE_ID: PalletId = PalletId(*b"flowship");
pub const DEMOCRACY_TRACK_ID: u16 = 10;

parameter_types! {
	pub AlarmInterval: BlockNumber = gov_conf_get!(alarm_interval);
	pub SubmissionDeposit: Balance = gov_conf_get!(submission_deposit);
	pub UndecidingTimeout: BlockNumber = gov_conf_get!(undeciding_timeout);
}

impl pallet_referenda::Config for Runtime {
	type WeightInfo = pallet_referenda::weights::SubstrateWeight<Self>;
	type RuntimeCall = RuntimeCall;
	type RuntimeEvent = RuntimeEvent;
	type Scheduler = Scheduler;
	type Currency = Balances;
	type SubmitOrigin = pallet_ranked_collective::EnsureMember<Runtime, (), 1>;
	type CancelOrigin = AllTechnicalCommittee;
	type KillOrigin = AllTechnicalCommittee;
	type Slash = Treasury;
	type Votes = pallet_ranked_collective::Votes;
	type Tally = pallet_ranked_collective::TallyOf<Runtime>;
	type SubmissionDeposit = SubmissionDeposit;
	type MaxQueued = ConstU32<100>;
	type UndecidingTimeout = UndecidingTimeout;
	type AlarmInterval = AlarmInterval;
	type Tracks = TracksInfo;
	type Preimages = Preimage;
}

impl RankedConfig for Runtime {
	type WeightInfo = pallet_ranked_collective::weights::SubstrateWeight<Self>;
	type RuntimeEvent = RuntimeEvent;
	// Promotion is by any of:
	// - Council member.
	// - Technical committee member.
	type PromoteOrigin = FellowshipPromoteDemoteOrigin<Self::AccountId>;
	// Demotion is by any of:
	// - Council member.
	// - Technical committee member.
	type DemoteOrigin = FellowshipPromoteDemoteOrigin<Self::AccountId>;
	type Polls = FellowshipReferenda;
	type MinRankOfClass = ClassToRankMapper<Self, ()>;
	type VoteWeight = pallet_ranked_collective::Geometric;
}

pub struct FellowshipProposition;
impl<O> EnsureOrigin<O> for FellowshipProposition
where
	O: Into<Result<FellowshipOrigin, O>> + From<FellowshipOrigin>,
{
	type Success = AccountId;

	fn try_origin(o: O) -> Result<Self::Success, O> {
		o.into().and_then(|o| match o {
			FellowshipOrigin::FellowshipProposition => {
				Ok(FELLOWSHIP_MODULE_ID.into_account_truncating())
			}
			o => Err(O::from(o)),
		})
	}

	#[cfg(feature = "runtime-benchmarks")]
	fn try_successful_origin() -> Result<O, ()> {
		Ok(O::from(FellowshipOrigin::FellowshipProposition))
	}
}

pub type FellowshipPromoteDemoteOrigin<AccountId> = EitherOf<
	MapSuccess<EnsureRoot<AccountId>, Replace<ConstU16<65535>>>,
	MapSuccess<CouncilMember, Replace<ConstU16<9>>>,
>;

pub struct TracksInfo;
impl pallet_referenda::TracksInfo<Balance, BlockNumber> for TracksInfo {
	type Id = u16;
	type RuntimeOrigin = <RuntimeOrigin as frame_support::traits::OriginTrait>::PalletsOrigin;
	fn tracks() -> &'static [(Self::Id, pallet_referenda::TrackInfo<Balance, BlockNumber>)] {
		static DATA: [(u16, pallet_referenda::TrackInfo<Balance, BlockNumber>); 1] = [(
			DEMOCRACY_TRACK_ID,
			pallet_referenda::TrackInfo {
				name: "democracy-proposals",
				max_deciding: 10,
				decision_deposit: 10 * UNIQUE,
				prepare_period: 30 * MINUTES,
				decision_period: 7 * DAYS,
				confirm_period: 30 * MINUTES,
				min_enactment_period: 1 * MINUTES,
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

		match FellowshipOrigin::try_from(id.clone()) {
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
			other => sp_runtime::traits::Identity::convert(other),
		}
	}
}
