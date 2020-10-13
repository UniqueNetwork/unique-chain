# Vesting

The goal of vesting feature is to provide the capability to freeze tokens until certain time.

In order to optimize storage used for chain state, as well as keep the rest of functionality simple and intact, vesting is provided via a separate dictionary and set of methods:

## VestedTransfer

### Description
This method transfers tokens to a vesting account with pre-defined vesting period. The token will not show up as owned by the recepient address, but will not be show as owned by the previous owner (sender) either. Instead, it will be shown as owned by a special value address - Vesting address (with unknown private key). After the vesting timestamp, token can be claimed using VestingClaim method, which will transfer the token to the recipient address.

### Permissions
* Collection Owner
* Collection Admin
* Current NFT Owner

### Parameters
* Recipient: Address of token recipient
* CollectionId: ID of the collection
* ItemId (Optional): ID of the item
    * Non-Fungible Mode: Required
    * Fungible Mode: Ignored
    * Re-Fungible Mode: Required
* Value (Optional): Amount to transfer
    * Non-Fungible Mode: Ignored
    * Fungible Mode: Must specify transferred amount
    * Re-Fungible Mode: Must specify transferred portion (between 0 and 1)
* VestingTime: The timestamp after which transfers will become available and token can be claimed

### Events
* VestedTransfer
    * CollectionID
    * ItemId: Identifier of NFT
    * Recipient
    * Value
    * VestingTimestamp

## VestedClaim

### Description
This method transfers tokens from the vesting account to the recipient, which was defined in VestingTrasnfer transaction. This method may be called by anyone, and it will only work after the vesting timestamp.

### Permissions
* Anyone

### Parameters
* Recipient: Address of token recipient
* CollectionId: ID of the collection

### Events
* VestedClaim
    * CollectionID
    * ItemId: Identifier of NFT
    * Recipient
    * Value

