#![no_std]

pub trait SponsorshipHandler<AccountId, Call> {
	fn get_sponsor(who: &AccountId, call: &Call) -> Option<AccountId>;
}

impl<A, C> SponsorshipHandler<A, C> for () {
	fn get_sponsor(_who: &A, _call: &C) -> Option<A> {
		None
	}
}

macro_rules! impl_tuples {
	($($ident:ident)+) => {
		impl<AccountId, Call, $($ident),+> SponsorshipHandler<AccountId, Call> for ($($ident,)+)
		where
			$(
				$ident: SponsorshipHandler<AccountId, Call>
			),+
		{
			fn get_sponsor(who: &AccountId, call: &Call) -> Option<AccountId> {
				$(
					if let Some(account) = $ident::get_sponsor(who, call) {
						return Some(account);
					}
				)+
				None
			}
		}
	}
}

impl_tuples! {A}
impl_tuples! {A B}
impl_tuples! {A B C}
impl_tuples! {A B C D}
impl_tuples! {A B C D E}
impl_tuples! {A B C D E F}
impl_tuples! {A B C D E F G}
impl_tuples! {A B C D E F G H}
impl_tuples! {A B C D E F G H I}
impl_tuples! {A B C D E F G H I J}
