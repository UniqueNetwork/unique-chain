## Milestone 1

**User Paid Fees and Sponsored. Finish/Debug white listing and spam/DOS protection**

Implementation of two models 
If collection sponsor is set and confirmed for collection instance that means Sponsored Economic Model has chosen. Otherwise default economic model User Paid Fees is set.
For Sponsored Economic Model exists timeouts for token transactions. For every NFT type timeouts defined separately. Timeouts and white list limits together prevented spam and malicious actions.

Set sponsor
`nft`.`set_collection_sponsor`
Confirm sponsor
`nft`.`confirm_sponsorship`

A white list mode presented by collection property `access` and can be enabled with `set_public_access_mode`. Rules provide spam/DOS protection
While collection in the white list mode rules below are active:
Owner can add address to white list
Admin can add address to white list
Non-privileged user cannot add address to white list
Owner can remove address from white list
Admin can remove address from white list
Non-privileged user cannot remove address from white list
If Public Access mode is set to WhiteList, tokens can’t be transferred from a non-whitelisted address with transfer or transferFrom
If Public Access mode is set to WhiteList, tokens can’t be transferred to a non-whitelisted address with transfer or transferFrom
If Public Access mode is set to WhiteList, tokens can’t be destroyed by a non-whitelisted address (even if it owned them before enabling WhiteList mode)
If Public Access mode is set to WhiteList, token transfers can’t be Approved by a non-whitelisted address (see Approve method).
If Public Access mode is set to WhiteList, tokens can be transferred to a whitelisted address with transfer or transferFrom
If Public Access mode is set to WhiteList, tokens can be transferred from a whitelisted address with transfer or transferFrom 
If Public Access mode is set to WhiteList, and Mint Permission is set to false, tokens can be created by owner.
If Public Access mode is set to WhiteList, and Mint Permission is set to false, tokens can be created by admin.
If Public Access mode is set to WhiteList, and Mint Permission is set to false, tokens cannot be created by non-privileged and white listed address.
If Public Access mode is set to WhiteList, and Mint Permission is set to false, tokens cannot be created by non-privileged and non-white listed address.
If Public Access mode is set to WhiteList, and Mint Permission is set to true, tokens can be created by owner.
If Public Access mode is set to WhiteList, and Mint Permission is set to true, tokens can be created by admin.
If Public Access mode is set to WhiteList, and Mint Permission is set to true, tokens cannot be created by non-privileged and non-white listed address.
If Public Access mode is set to WhiteList, and Mint Permission is set to true, tokens can be created by non-privileged and white listed address.

**Add missing custom types (CollectionMode, FungibleItemType, ReFungibleItemType)**

Follow types defined
```
pub struct NftItemType<AccountId> {
    pub collection: u64,
    pub owner: AccountId,
    pub data: Vec<u8>,
}
pub struct FungibleItemType<AccountId> {
    pub collection: u64,
    pub owner: AccountId,
    pub value: u128,
}
pub struct ReFungibleItemType<AccountId> {
    pub collection: u64,
    pub owner: Vec<Ownership<AccountId>>,
    pub data: Vec<u8>,
}
```

**Add substrate bounds for number of collections, owned tokens, and number of collection admins.**

Bounds defined in chain specification and can be set with 'sudo' privileges `nft`.`set_chain_limits`.

**Add/document extra genesis**

Extra genesis defined in `node/src/chain_spec.rs` file. Configuration consist from 5 items:
Collection list,  Nft items list, Fungible items list, Refungible items list, Chain limits