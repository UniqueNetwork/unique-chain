## Milestone 1

**User Paid Fees and Sponsored. Finish/Debug allow listing and spam/DOS protection**

Implementation of two models 
If collection sponsor is set and confirmed for collection instance that means Sponsored Economic Model has chosen. Otherwise default economic model User Paid Fees is set.
For Sponsored Economic Model exists timeouts for token transactions. For every NFT type timeouts defined separately. Timeouts and allow list limits together prevented spam and malicious actions.

Set sponsor
`nft`.`set_collection_sponsor`
Confirm sponsor
`nft`.`confirm_sponsorship`

A allow list mode presented by collection property `access` and can be enabled with `set_public_access_mode`. Rules provide spam/DOS protection
While collection in the allow list mode rules below are active:
Owner can add address to allow list
Admin can add address to allow list
Non-privileged user cannot add address to allow list
Owner can remove address from allow list
Admin can remove address from allow list
Non-privileged user cannot remove address from allow list
If Public Access mode is set to AllowList, tokens can’t be transferred from a non-allowlisted address with transfer or transferFrom
If Public Access mode is set to AllowList, tokens can’t be transferred to a non-allowlisted address with transfer or transferFrom
If Public Access mode is set to AllowList, tokens can’t be destroyed by a non-allowlisted address (even if it owned them before enabling AllowList mode)
If Public Access mode is set to AllowList, token transfers can’t be Approved by a non-allowlisted address (see Approve method).
If Public Access mode is set to AllowList, tokens can be transferred to a allowlisted address with transfer or transferFrom
If Public Access mode is set to AllowList, tokens can be transferred from a allowlisted address with transfer or transferFrom 
If Public Access mode is set to AllowList, and Mint Permission is set to false, tokens can be created by owner.
If Public Access mode is set to AllowList, and Mint Permission is set to false, tokens can be created by admin.
If Public Access mode is set to AllowList, and Mint Permission is set to false, tokens cannot be created by non-privileged and allow listed address.
If Public Access mode is set to AllowList, and Mint Permission is set to false, tokens cannot be created by non-privileged and non-allow listed address.
If Public Access mode is set to AllowList, and Mint Permission is set to true, tokens can be created by owner.
If Public Access mode is set to AllowList, and Mint Permission is set to true, tokens can be created by admin.
If Public Access mode is set to AllowList, and Mint Permission is set to true, tokens cannot be created by non-privileged and non-allow listed address.
If Public Access mode is set to AllowList, and Mint Permission is set to true, tokens can be created by non-privileged and allow listed address.

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