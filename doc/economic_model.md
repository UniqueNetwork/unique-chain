# Economic Model

## Economy Goals

One of the goals of this specification is to find means to provide for network infrastructure (incentivisation of validators) and development support for NFT Parachain. Transaction fees will be used as the main source of funds. Fees will be distributed among network participants. The distribution of fees will depend on validator contribution to the network (similarly to Polkadot network) and the chosen fee structure (model).

## Summary

We are going to offer several fee models for our users. Some models will be implemented immediately, some will wait until there is a demand. 

The fee models are setup by Collection. Every Collection has a fee model assigned to it, which determines how collection transactions are paid. Network users can choose the fee model that better suits their application. The Collection fee model can be changed later as well.

Initially we offer 4 models for consideration:

* User paid fees
* Pay as you go
* Prepaid plan
* Resource purchase

## Token and Accounts

Network Tokens are tracked via standard Balances module, which is included in NFT Parachain.

User Account matches to user address in the network. Among other properties user Account has Balance, which will be used later on.

## Changing Fee Model

The dedicated module call will be added to allow updating fee structure for the collection.

### SelectFeeModel Call

#### Description

Select fee model for a given collection.

#### Permissions

* Collection Owner
* Collection Admin

#### Parameters

* Collection ID
* Fee Model ID

## User Paid Fees

This is conventional fee model, when every Account pais for the transactions they sign and send. Transaction fee will gradually increase if the network load is higher to prevent denial of service. The same type of transaction (with the same transaction weight) will result in higher fee if previous block's weight gets close to maximum block weight. The ratio for multiplying fees will be determined empirically. The multiplication will take place until the blocks stop overpopulating, but with certain saturation. If blocks underfill, i.e. block weight is under the certain threshold, then the next block will have lower fees. The lowering will continue until blocks stop underpopulating, with some saturation.

Each module call will have weight annotation that will determine the weight calculation for this call:

* CreateCollection: Fixed
* ChangeCollectionOwner: Fixed
* DestroyCollection: Linear of number of items multiplied by Collection Data Size
* CreateItem: Linear of Collection Data Size
* BurnItem: Linear of Collection Data Size
* AddCollectionAdmin: Fixed
* RemoveCollectionAdmin: Fixed
* GetOwner: None
* BalanceOf: None
* Transfer: Fixed

This model is default and will be set for each collection until collection owner decides to change it to some other model.


### Fee Distribution

The network owner will reserve some fixed percentage of fees, and the rest will be distributed among validators proportionally to their contribution to the network.


## Pay As You Go

The only difference from User Paid Fees model is that collection owner will be paying for their users. The collection owner must have enough balance on his account in order to pay for user transactions. If balances goes lower than needed, the model is temporarily switched to "User Paid Fees".


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

