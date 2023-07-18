//! Custom origins for governance interventions.

use super::*;
pub use pallet_custom_origins::*;

#[frame_support::pallet]
pub mod pallet_custom_origins {
	use super::*;
	#[pallet::config]
	pub trait Config: frame_system::Config {}

	#[pallet::pallet]
	pub struct Pallet<T>(_);

	#[derive(PartialEq, Eq, Clone, MaxEncodedLen, Encode, Decode, TypeInfo, RuntimeDebug)]
	#[pallet::origin]
	pub enum Origin {
		/// Origin commanded by rank 1 of the Polkadot Fellowship and with a success of 1.
		Fellowship1Dan,
		/// Origin commanded by rank 2 of the Polkadot Fellowship and with a success of 2.
		Fellowship2Dan,
		/// Origin commanded by rank 3 of the Polkadot Fellowship and with a success of 3.
		Fellowship3Dan,
		/// Origin commanded by rank 4 of the Polkadot Fellowship and with a success of 4.
		Fellowship4Dan,
		/// Origin commanded by rank 5 of the Polkadot Fellowship and with a success of 5.
		Fellowship5Dan,
		/// Origin commanded by rank 6 of the Polkadot Fellowship and with a success of 6.
		Fellowship6Dan,
		/// Origin commanded by rank 7 of the Polkadot Fellowship and with a success of 7.
		Fellowship7Dan,
		/// Origin commanded by rank 8 of the Polkadot Fellowship and with a success of 8.
		Fellowship8Dan,
		/// Origin commanded by rank 9 of the Polkadot Fellowship and with a success of 9.
		Fellowship9Dan,
		/// Origin able to send proposal from fellowship collective to democracy pallet.
		FellowshipProposition,
	}

	macro_rules! decl_ensure {
		(
			$vis:vis type $name:ident: EnsureOrigin<Success = $success_type:ty> {
				$( $item:ident = $success:expr, )*
			}
		) => {
			$vis struct $name;
			impl<O: Into<Result<Origin, O>> + From<Origin>>
				EnsureOrigin<O> for $name
			{
				type Success = $success_type;
				fn try_origin(o: O) -> Result<Self::Success, O> {
					o.into().and_then(|o| match o {
						$(
							Origin::$item => Ok($success),
						)*
						r => Err(O::from(r)),
					})
				}
				#[cfg(feature = "runtime-benchmarks")]
				fn try_successful_origin() -> Result<O, ()> {
					// By convention the more privileged origins go later, so for greatest chance
					// of success, we want the last one.
					let _result: Result<O, ()> = Err(());
					$(
						let _result: Result<O, ()> = Ok(O::from(Origin::$item));
					)*
					_result
				}
			}
		}
	}

	decl_ensure! {
		pub type EnsureFellowship: EnsureOrigin<Success = u16> {
			Fellowship1Dan = 1,
			Fellowship2Dan = 2,
			Fellowship3Dan = 3,
			Fellowship4Dan = 4,
			Fellowship5Dan = 5,
			Fellowship6Dan = 6,
			Fellowship7Dan = 7,
			Fellowship8Dan = 8,
			Fellowship9Dan = 9,
		}
	}
}
