use core::cell::Cell;

pub trait Budget {
	/// Returns true while not exceeded
	fn consume(&self) -> bool {
		self.consume_custom(1)
	}
	/// Returns true while not exceeded
	/// Implementations should use interior mutabilitiy
	fn consume_custom(&self, calls: u32) -> bool;
}

pub struct Unlimited;
impl Budget for Unlimited {
	fn consume_custom(&self, _calls: u32) -> bool {
		true
	}
}

pub struct Value(Cell<u32>);
impl Value {
	pub fn new(v: u32) -> Self {
		Self(Cell::new(v))
	}
	pub fn refund(self) -> u32 {
		self.0.get()
	}
}
impl Budget for Value {
	fn consume_custom(&self, calls: u32) -> bool {
		let (result, overflown) = self.0.get().overflowing_sub(calls);
		if overflown {
			return false;
		}
		self.0.set(result);
		true
	}
}
