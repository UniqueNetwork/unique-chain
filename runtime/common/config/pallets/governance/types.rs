use super::*;

pub const FELLOWSHIP_MODULE_ID: PalletId = PalletId(*b"flowship");

parameter_types! {
	pub LaunchPeriod: BlockNumber = 7 * DAYS;
	pub VotingPeriod: BlockNumber = 7 * DAYS;
	pub FastTrackVotingPeriod: BlockNumber = 3 * HOURS;
	pub const MinimumDeposit: Balance = 100 * UNIQUE;
	pub EnactmentPeriod: BlockNumber = 8 * DAYS;
	pub CooloffPeriod: BlockNumber = 7 * DAYS;
	pub const InstantAllowed: bool = true;
	pub const MaxVotes: u32 = 100;
	pub const MaxProposals: u32 = 100;

	pub CouncilMotionDuration: BlockNumber = 3 * DAYS;
	pub const CouncilMaxProposals: u32 = 100;
	pub const CouncilMaxMembers: u32 = 100;

	pub FellowshipMotionDuration: BlockNumber = 3 * DAYS;
	pub const FellowshipMaxProposals: u32 = 100;
	pub const FellowshipMaxMembers: u32 = 100;

	pub TechnicalMotionDuration: BlockNumber = 3 * DAYS;
	pub const TechnicalMaxProposals: u32 = 100;
	pub const TechnicalMaxMembers: u32 = 100;

	pub MaximumSchedulerWeight: Weight = Perbill::from_percent(80) * <Runtime as frame_system::Config>::BlockWeights::get().max_block;
	pub MaxCollectivesProposalWeight: Weight = Perbill::from_percent(80) * <Runtime as frame_system::Config>::BlockWeights::get().max_block;

	pub const MaxScheduledPerBlock: u32 = 50;
	pub const AlarmInterval: BlockNumber = 1;
	pub const SubmissionDeposit: Balance = 0;
	pub const UndecidingTimeout: BlockNumber = 7 * DAYS;
}

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

pub type OneThirdsFellowship =
	pallet_collective::EnsureProportionAtLeast<AccountId, FellowshipCollective, 1, 3>;

pub struct FellowshipProposition;
impl<O> EnsureOrigin<O> for FellowshipProposition
where
	O: Into<Result<pallet_collective::RawOrigin<AccountId, FellowshipCollective>, O>>
		+ From<pallet_collective::RawOrigin<AccountId, FellowshipCollective>>,
{
	type Success = AccountId;

	fn try_origin(o: O) -> Result<Self::Success, O> {
		OneThirdsFellowship::try_origin(o).map(|_| FELLOWSHIP_MODULE_ID.into_account_truncating())
	}

	#[cfg(feature = "runtime-benchmarks")]
	fn try_successful_origin() -> Result<O, ()> {
		OneThirdsFellowship::try_successful_origin()
	}
}

pub type TechnicalCommitteeMember = pallet_collective::EnsureMember<AccountId, TechnicalCollective>;

pub type RootOrTechnicalCommitteeMember =
	EitherOfDiverse<EnsureRoot<AccountId>, TechnicalCommitteeMember>;

pub type AllTechnicalCommittee =
	pallet_collective::EnsureProportionAtLeast<AccountId, TechnicalCollective, 1, 1>;

pub type RootOrAllTechnicalCommittee =
	EitherOfDiverse<EnsureRoot<AccountId>, AllTechnicalCommittee>;
