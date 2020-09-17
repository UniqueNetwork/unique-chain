# Economic Model

## Economy Goals

One of the goals of this specification is to find means to provide for network infrastructure (incentivisation of validators) and development support for NFT Parachain. Transaction fees will be used as the main source of funds. Fees will be distributed among network participants. The distribution of fees will depend on validator contribution to the network (similarly to Polkadot network) and the chosen fee structure (model).

## Summary

We are going to offer several fee models for our users. Some models will be implemented immediately, some will wait until there is a demand. 

The fee models can be setup by Collection and by Smart Contract address. Every Collection or Smart Contract has a fee model associated with it, which determines how transactions are paid. Network users can choose the fee model that better suits their application. The fee model can be changed later as well.

Initially we offer 4 models for consideration:

* User paid fees (conventional blockchain method)
* Sponsored (same as above, but paid by sponsor)
* Prepaid plan
* Resource purchase

## Token and Accounts

Network Tokens are tracked via standard Balances module, which is included in NFT Parachain.

User Account matches to user address in the network. Among other properties user Account has Balance, which will be used later on.

## Settings Economic Model

The dedicated pallet calls allow updating the fee structure for the collection or smart contract.

### SetCollectionSponsor

#### Description

Set the collection sponsor address. The sponsorship needs to be confirmed by sending a ConfirmSponsorship transaction from that address. Also, the protection measures need to be in place so that sponsor account cannot be depleted by malicious users. White listing is one of the measured. It can be enabled with SetPublicAccessMode method.

##### List of transactions
Transactions that can be sponsored:
* Transfer
* Approve
* TransferFrom
* TransferWithData
* TransferFromWithData
* BurnItem

##### Rate Limiting

This is a design proposal, actual implementation may change.

Features:
* Token transactions per day: The timestamp of last transaction performed on a token (NFT only) is associated with token ID in a dictionary. When a next transaction is run, the time is checked against this timestamp and, if less than allowed by rate limit, the fee is paid by caller account instead of the sponsor.
* Address transactions per day: The timestamp of last transaction performed by an address (only if transaction is in the [list of affected transactions](#list-of-transactions)) is associated with caller address in a dictionary. Further, the logic is similar to limiting by token as above. If only one of the limits (by token or by address) indicates that fee should be paid by the user, the fee is paid by the user.
* A pallet method (SetCollectionRateLimits) will be added to set these parameters and enable rate limiting.
* One idea to consider is deposits that must be made by an address in order to become white listed (instead of admin review).

#### Permissions

* Collection Owner

#### Parameters

* CollectionId: ID of the collection
* Sponsor: Sponsor address
* Fee Model ID: ID of selected economic model. Currently, only "Sponsored" mode is supported, which will be ID = 1.

### ConfirmSponsorship
#### Description
Confirm sponsorship of a collection. This call is needed to protect sponsor address from malicious collection creators.

#### Permissions
* Collection Sponsor only

#### Parameters
* CollectionId: ID of the collection

### RemoveCollectionSponsor
#### Description
Switch back to pay-per-own-transaction model.

#### Permissions
* Collection owner

#### Parameters
* collectionId: ID of the collection

### ClaimContract
#### Description
Claim the contract ownership for the purpose of sponsoring. Once the contract is claimed, only the contract owner can manage the contract sponsorship. Also, the contract may be claimed only once.

#### Permissions
* Anyone

#### Parameters
* ContractAddress: Address of the contract
* Sponsor: Sponsor address

### SetContractSponsor
#### Description
Set the contract sponsor address. The sponsorship needs to be confirmed by sending a ConfirmContractSponsorship transaction from that address. The spam protection measures are similar to collection sponsorship.

#### Permissions
* Contract Owner

#### Parameters
* ContractAddress: Address of the contract
* Sponsor: Sponsor address
* Fee Model ID: ID of selected economic model. Currently, only "Sponsored" mode is supported, which will be ID = 1.

### ConfirmContractSponsorship
#### Description
Confirm sponsorship of a contract. This call is needed to protect sponsor address from malicious sponsorship requests.

#### Permissions
* Contract Sponsor only

#### Parameters
* ContractAddress: Address of the contract

### RemoveContractSponsor
#### Description
Switch back to pay-per-own-transaction model.

#### Permissions
* Contract owner

#### Parameters
* contractAddress: Address of the contract

### SetPublicAccessMode
#### Description
Toggle between normal and white list access for the methods with access for “Anyone”. If White List mode is enabled, AddToWhiteList and RemoveFromWhiteList methods can be called to add to and remove addresses from the white list.

White list mode is the property of collection. If it is turned on, all public operations such as token transfers, for example, which normally have “Anyone” permission, become white listed, i.e. are only available to collection owner, admins, and addresses from the white list. White lists can be helpful for rate limiting of transfers when collection sponsoring is enabled.

#### Permissions
* Collection Owner

#### Parameters
* CollectionID: ID of the Collection to set access mode for
* Mode
    * 0 = Normal
    * 1 = White list

### AddToWhiteList
#### Description
Add an address to white list.

#### Permissions
* Collection Owner
* Collection Admin

#### Parameters
* CollectionID: ID of the Collection
* Address

### RemoveFromWhiteList
#### Description
Remove an address from white list.

#### Permissions
* Collection Owner
* Collection Admin

#### Parameters
* CollectionID: ID of the Collection
* Address

### SetCollectionRateLimits
#### Description
Enable or disable rate limits for a collection

#### Permissions
* Collection Owner
* Collection Admin

#### Parameters
* CollectionID: ID of the Collection
* TokenInterval: Number of seconds allowed between sponsored token trasnsactions. 0 means there is no limit.
* AddressInterval: Number of seconds allowed between sponsored address trasnsactions. 0 means there is no limit.


## User Paid Fees

This is conventional fee model, when every Account pais for the transactions they sign and send. Transaction fee will gradually increase if the network load is higher to prevent denial of service. The same type of transaction (with the same transaction weight) will result in higher fee if previous block's weight gets close to maximum block weight. The ratio for multiplying fees will be determined empirically. The multiplication will take place until the blocks stop overpopulating, but with certain saturation. If blocks underfill, i.e. block weight is under the certain threshold, then the next block will have lower fees. The lowering will continue until blocks stop underpopulating, with some saturation.

Each module call will have weight annotation that will determine the weight calculation for this call:

* CreateCollection: Fixed
* ChangeCollectionOwner: Fixed
* DestroyCollection: Linear of number of items (or owner addresses, depending on the collection type) multiplied by Collection Data Size
* CreateItem: Linear of Collection Data Size
* BurnItem: Linear of Collection Data Size
* AddCollectionAdmin: Fixed
* RemoveCollectionAdmin: Fixed
* Transfers and approvals: Fixed
* Transfers with data: Fixed + linear of data size
* All other: Fixed

This model is default and will be set for each collection until collection owner decides to change it to some other model.

### Fee Distribution

The fees will be burned. Incentivization is done through network token inflation, which will be designed in tokenomics.

## Sponsored

The only difference from User Paid Fees model is that collection owner will be paying for their users. The collection owner must have enough balance on his account in order to pay for user transactions.

### Fee Distribution

Same as in User Paid Fees.


## Prepaid Plan

Collection Owner makes regular payments to prepay for some planned network load, i.e. some fixed number of transactions, created items, etc.


### Fee Distribution

Same as in User Paid Fees.


## Resource Purchase

Collection Owner purchases some fixed amount of network resource, which can be measured in number of users and their monthly transactions, for example. This is a one time payment. If Collection Owner decides to switch to a different fee model, the resources may be sold back to the system (with some commission).

Received funds will be converted to DOTs and used in staking (nomination or validation), which will allow to receive the income that will pay for infrastructure and development support.

### Fee Distribution

Fixed percentage of staking income is distributed between validators proportionally to their contribution to the network. The rest is credited to the network owner.

