use super::*;
use origins::Origin as FellowshipOrigin;

use pallet_ranked_collective::Rank;
use sp_arithmetic::traits::CheckedSub;
use sp_runtime::{morph_types, traits::Convert};
use crate::gov_conf_get;

pub const FELLOWSHIP_MODULE_ID: PalletId = PalletId(*b"flowship");
pub const DEMOCRACY_TRACK_ID: u16 = 10;

parameter_types! {
	pub LaunchPeriod: BlockNumber = gov_conf_get!(launch_period);
	pub VotingPeriod: BlockNumber = gov_conf_get!(voting_period);
	pub FastTrackVotingPeriod: BlockNumber = gov_conf_get!(fast_track_voting_period);
	pub MinimumDeposit: Balance = gov_conf_get!(minimum_deposit);
	pub EnactmentPeriod: BlockNumber = gov_conf_get!(enactment_period);
	pub CooloffPeriod: BlockNumber = gov_conf_get!(cooloof_period);
	pub InstantAllowed: bool = gov_conf_get!(instant_allowed);
	pub MaxVotes: u32 = gov_conf_get!(max_votes);
	pub MaxProposals: u32 = gov_conf_get!(max_proposals);

	pub CouncilMotionDuration: BlockNumber = gov_conf_get!(council_motion_duration);
	pub CouncilMaxProposals: u32 = gov_conf_get!(council_max_proposals);
	pub CouncilMaxMembers: u32 = gov_conf_get!(council_max_members);

	pub TechnicalMotionDuration: BlockNumber =gov_conf_get!(technical_motion_duration);
	pub TechnicalMaxProposals: u32 = gov_conf_get!(technical_max_proposals);
	pub TechnicalMaxMembers: u32 = gov_conf_get!(technical_max_members);

	pub MaximumSchedulerWeight: Weight = Perbill::from_percent(80) * <Runtime as frame_system::Config>::BlockWeights::get().max_block;
	pub MaxCollectivesProposalWeight: Weight = Perbill::from_percent(80) * <Runtime as frame_system::Config>::BlockWeights::get().max_block;

	pub MaxScheduledPerBlock: u32 = gov_conf_get!(max_scheduled_per_block);
	pub AlarmInterval: BlockNumber = gov_conf_get!(alarm_interval);
	pub SubmissionDeposit: Balance = gov_conf_get!(submission_deposit);
	pub UndecidingTimeout: BlockNumber = gov_conf_get!(undeciding_timeout);
}

#[macro_export]
macro_rules! gov_conf_get {
	($param:ident) => {
		<pallet_configuration::GovernanceConfigurationOverride<Runtime>>::get().$param
	};
}

pub type CouncilMember = pallet_collective::EnsureMember<AccountId, CouncilCollective>;

pub type OneThirdsCouncil =
	pallet_collective::EnsureProportionAtLeast<AccountId, CouncilCollective, 1, 3>;

pub type HalfCouncil =
	pallet_collective::EnsureProportionAtLeast<AccountId, CouncilCollective, 1, 2>;

pub type ThreeFourthsCouncil = EnsureProportionAtLeast<AccountId, CouncilCollective, 3, 4>;

pub type RootOrHalfCouncil = EitherOfDiverse<EnsureRoot<AccountId>, HalfCouncil>;

pub type RootOrThreeFourthsCouncil = EitherOfDiverse<EnsureRoot<AccountId>, ThreeFourthsCouncil>;

pub type RootOrAllCouncil = EitherOfDiverse<
	EnsureRoot<AccountId>,
	EnsureProportionAtLeast<AccountId, CouncilCollective, 1, 1>,
>;

pub type TechnicalCommitteeMember = pallet_collective::EnsureMember<AccountId, TechnicalCollective>;

pub type RootOrTechnicalCommitteeMember =
	EitherOfDiverse<EnsureRoot<AccountId>, TechnicalCommitteeMember>;

pub type AllTechnicalCommittee =
	pallet_collective::EnsureProportionAtLeast<AccountId, TechnicalCollective, 1, 1>;

pub type RootOrAllTechnicalCommittee =
	EitherOfDiverse<EnsureRoot<AccountId>, AllTechnicalCommittee>;

pub type FellowshipCollective = pallet_ranked_collective::Pallet<Runtime>;

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

pub type FellowshipPromoteDemoteOrigin<T, I = ()> = EitherOf<
	MapSuccess<EitherOf<CouncilMember, TechnicalCommitteeMember>, Replace<ConstU16<65535>>>,
	TryMapSuccess<pallet_ranked_collective::EnsureRanked<T, I, 5>, CheckedReduceBy<ConstU16<1>>>,
>;

morph_types! {
	/// A `TryMorph` implementation to reduce a scalar by a particular amount, checking for
	/// underflow.
	pub type CheckedReduceBy<N: TypedGet>: TryMorph = |r: N::Type| -> Result<N::Type, ()> {
		r.checked_sub(&N::get()).ok_or(())
	} where N::Type: CheckedSub;
}

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
			Ok(_) => Ok(1),
			_ => Err(()),
		}
	}
}

pallet_referenda::impl_tracksinfo_get!(TracksInfo, Balance, BlockNumber);

pub struct ClassToRankMapper<T, B, M>(PhantomData<T>, PhantomData<B>, PhantomData<M>);
pub type ClassOf<T, B = Balance, M = BlockNumber> = <T as pallet_referenda::TracksInfo<B, M>>::Id;

impl<T, B, M> Convert<ClassOf<T, B, M>, Rank> for ClassToRankMapper<T, B, M>
where
	T: pallet_referenda::TracksInfo<B, M, Id = u16>,
{
	fn convert(track_id: ClassOf<TracksInfo>) -> Rank {
		match track_id {
			DEMOCRACY_TRACK_ID => 3,
			other => sp_runtime::traits::Identity::convert(other),
		}
	}
}
