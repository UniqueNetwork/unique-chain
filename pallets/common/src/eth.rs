use nft_data_structs::{CollectionId, TokenId};
use sp_core::H160;

// 0x17c4e6453Cc49AAAaEACA894e6D9683e00000001 - collection 1
// TODO: Unhardcode prefix
const ETH_ACCOUNT_PREFIX: [u8; 16] = [
	0x17, 0xc4, 0xe6, 0x45, 0x3c, 0xc4, 0x9a, 0xaa, 0xae, 0xac, 0xa8, 0x94, 0xe6, 0xd9, 0x68, 0x3e,
];

// 0xf8238ccfff8ed887463fd5e00000000100000002  - collection 1, token 2
// TODO: Unhardcode prefix
const ETH_ACCOUNT_TOKEN_PREFIX: [u8; 12] = [
	0xf8, 0x23, 0x8c, 0xcf, 0xff, 0x8e, 0xd8, 0x87, 0x46, 0x3f, 0xd5, 0xe0,
];

pub fn map_eth_to_id(eth: &H160) -> Option<CollectionId> {
	if eth[0..16] != ETH_ACCOUNT_PREFIX {
		return None;
	}
	let mut id_bytes = [0; 4];
	id_bytes.copy_from_slice(&eth[16..20]);
	Some(CollectionId(u32::from_be_bytes(id_bytes)))
}
pub fn collection_id_to_address(id: CollectionId) -> H160 {
	let mut out = [0; 20];
	out[0..16].copy_from_slice(&ETH_ACCOUNT_PREFIX);
	out[16..20].copy_from_slice(&u32::to_be_bytes(id.0));
	H160(out)
}

pub fn map_eth_to_token_id(eth: &H160) -> Option<(CollectionId, TokenId)> {
	if eth[0..12] != ETH_ACCOUNT_TOKEN_PREFIX {
		return None;
	}
	let mut id_bytes = [0; 4];
	let mut token_id_bytes = [0; 4];
	id_bytes.copy_from_slice(&eth[12..16]);
	token_id_bytes.copy_from_slice(&eth[16..20]);
	Some((
		CollectionId(u32::from_be_bytes(id_bytes)),
		TokenId(u32::from_be_bytes(token_id_bytes)),
	))
}
pub fn collection_token_id_to_address(id: CollectionId, token: TokenId) -> H160 {
	let mut out = [0; 20];
	out[0..12].copy_from_slice(&ETH_ACCOUNT_TOKEN_PREFIX);
	out[12..16].copy_from_slice(&u32::to_be_bytes(id.0));
	out[16..20].copy_from_slice(&u32::to_be_bytes(token.0));
	H160(out)
}
