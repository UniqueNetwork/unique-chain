//! Integration between bondrewd and parity scale codec
//! Maybe we can move it to scale-codec itself in future?

#[macro_export]
macro_rules! bondrewd_codec {
	($T:ty) => {
		impl Encode for $T {
			fn encode_to<O: codec::Output + ?Sized>(&self, dest: &mut O) {
				dest.write(&self.into_bytes())
			}
		}
		impl codec::Decode for $T {
			fn decode<I: codec::Input + ?Sized>(from: &mut I) -> Result<Self, codec::Error> {
				let mut bytes = [0; Self::BYTE_SIZE];
				from.read(&mut bytes)?;
				Ok(Self::from_bytes(bytes))
			}
		}
		impl MaxEncodedLen for $T {
			fn max_encoded_len() -> usize {
				Self::BYTE_SIZE
			}
		}
		impl TypeInfo for $T {
			type Identity = [u8; Self::BYTE_SIZE];
			fn type_info() -> scale_info::Type {
				<[u8; Self::BYTE_SIZE] as TypeInfo>::type_info()
			}
		}
	};
}
