# Manual Demos

Milestone 1 and 2 deliverables are marked by tag [release1](https://github.com/usetech-llc/nft_parachain/tree/release1)

## Milestone 1

### A running chain

**Substrate based blockchain node to host NFT Tracking Module created with substrate-up scripts (currently substrate-up only support Substrate 1.0)**

We have created chain based on both versions of substrate: 1 and 2. Nonetheless, the substrate 1 is not being widely used and we decided to obsolete this branch of code. The code still exists in [substrate1](https://github.com/usetech-llc/nft_parachain/tree/substrate1) branch, but this delivery document is based on substrate 2 version.

The node can be run using docker container:
```
TBD
```

#### NFT Tracking Module
Open extrinsics tab of the [standard UI](https://polkadot.js.org/apps/#/extrinsics) and find "nft" in the module list. This proves that NFT module is deployed.

#### Balances Module, Other modules included by default 
The [same UI](https://polkadot.js.org/apps/#/extrinsics) allows verification that all other modules are also installed as needed.

#### Configuration of runtime as needed (e.g. for hot module updates)

The `set_code` method worked out of the box and we did not need to perform any additional customizations to upload an updated WASM version of NFT palette.

### NFT Tracking Module

Before we continue, we need to do some preparations in the UI: Add NFT Data types so that the UI knows how to decode them. Go to [Settings-Developer Tab](https://polkadot.js.org/apps/#/settings/developer) and add following types to the JSON object in there:
```
{
  "NftItemType": {
    "Collection": "u64",
    "Owner": "AccountId",
    "Data": "Vec<u8>"
  },
  "CollectionType": {
    "Owner": "AccountId",
    "NextItemId": "u64",
    "CustomDataSize": "u32"
  },
  "Address": "AccountId",
  "LookupSource": "AccountId",
  "Weight": "u32"
}
```

**Note:** In the future we will likely switch to substrate "2.0.0-alpha.7", in which case Weight type should be `u64`.

#### CreateCollection

Before running test, open [chain state tab](https://polkadot.js.org/apps/#/chainstate) and read `nft`.`nextCollectionId` state variable, which shows how many collections were created so far. If you just started the chain, this should equal 0. 

Open extrinsics tab of the [standard UI](https://polkadot.js.org/apps/#/extrinsics) and select ALICE account. Select `nft` module and `createCollection` method. Put 1 in `custom_data_sz` and run the transaction. After it is finalized, read the `nft`.`nextCollectionId` state variable. It will be equal 1.

Also, read the state variable `nft`.`collection` with ID = 1 (Because everything in NFT Palette is numbered from 1, not from 0). You will see something like this:

```
nft.collection: CollectionType
{
  Owner: 5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY,
  NextItemId: 1,
  CustomDataSize: 1
}
```

### ChangeCollectionOwner

Open extrinsics tab of the [standard UI](https://polkadot.js.org/apps/#/extrinsics). Select `nft` module and `changeCollectionOwner` method. First, try to execute it to change owner to BOB for collection 1 from some different account than ALICE - FERDIE to see that it is not possible because ALICE owns collection 1 and FERDIE is not allowed to give it to BOB. Second, select ALICE as transaction signer and run it again. This time the collection owner changes, which will be reflected if you read the state variable `nft`.`collection` with ID = 1:

```
nft.collection: CollectionType
{
  Owner: 5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty,
  NextItemId: 1,
  CustomDataSize: 1
}
```

Change the ownership back to ALICE to continue with this demo.

### DestroyCollection

**Note: Before destroying collection, you can see Milestone 2 deliverables to avoid creating collection again**

Run `nft`.`destroyCollection` with collection ID = 1, and then read collection from state. The returned fields will have default values, which indicates that collection does not exsit anymore: 
```
nft.collection: CollectionType
{
  Owner: 5C4hrfjw9DjXZTzV3MwzrrAr9P1MJhSrvWGWqi1eSuyUpnhM,
  NextItemId: 0,
  CustomDataSize: 0
}
```

### End user documentation

See [application_development.md](application_development.md)

### Docker images for running deliverables for acceptance

**Substrate Node (in dev mode), Unit tests for NFT Module**

See above, the unit tests are run before the node starts within the same image.

### Acceptance instructions

**using Polkadot UI from https://substrate-ui.parity.io/**

This document, except we are using Substrate v2, so we can use the newer version of the UI: https://polkadot.js.org/apps/#

## Milestone 2
### NFT Tracking Module
**Note:** If you have destroyed collection, create it again using `nft`.`createCollection` method.

**Note 2:** The order of items in this section is different from the original spec to make the acceptance workflow more natural.

If you did not destroy collection while looking at Milestone 1 deliverables, use collection ID 1 in the further examples, otherwise use collection ID = 2.

#### CreateItem
Before creating an NFT item, let's read ALICE balance for your collection, which indicates how many NFT tokens ALICE owns in this collection. Read the chain state `nft`.`balance(<Collection ID>, ALICE)`, and it will be 0.

Execute extrinsic `nft`.`createItem` from ALICE account. Set properties to `0x01`. Now if you read the chain state `nft`.`balance(<Collection ID>, ALICE)`, it will be equal to 1. Also, you can read chain state `nft`.`itemList(<Collection ID>, 1)`, and it will return data for the token 1:

```
nft.itemList: NftItemType
{
  Collection: 1,
  Owner: 5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY,
  Data: 0x01
}
```

#### GetOwner
Reading the ownership is done by reading chainstate `nft`.`itemList(<Collection ID>, 1)`. One of the returned fields is Owner:
```
nft.itemList: NftItemType
{
  Collection: 1,
  Owner: 5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY,
  Data: 0x01
}
```

#### Transfer
Execute `nft`.`transfer` from ALICE address to transfer token 1 to BOB and check the ownership again:
```
nft.itemList: NftItemType
{
  Collection: 1,
  Owner: 5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty,
  Data: 0x01
}
```

Transfer the token 1 back to ALICE to enable further demo actions.

#### BalanceOf

Read the chain state `nft`.`balance` for ALICE address and see that she owns 1 token:
```
nft.balance: u64
1
```

#### AddCollectionAdmin
Execute `nft`.`AddCollectionAdmin` from ALICE account and let CHARLIE be an admin. Now you can see that CHARLIE can transfer ALICE's token from ALICE's account to EVE and back. Also, you can read admin list from chain state and see that it is not empty:

```
nft.adminList: Vec<AccountId>
[
  5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y
]
```

#### RemoveCollectionAdmin
Execute `nft`.`RemoveCollectionAdmin` from ALICE account to remove CHARLIE from admins. Now you can see that CHARLIE cannot transfer ALICE's tokens anymore. If you read the chan state `nft`.`adminList`, the response will be empty:

```
nft.adminList: Vec<AccountId>
[]
```

#### BurnItem
Execute `nft`.`burnItem` from ALICE account to burn token 1, and then read the chain state `nft`.`itemList(<Collection ID>, 1)`. This time the chain state returns default values in fields because token does not exist anymore. You can also check ALICE balance in chain state, now it is equal 0 again.
```
nft.itemList: NftItemType
{
  Collection: 0,
  Owner: 5C4hrfjw9DjXZTzV3MwzrrAr9P1MJhSrvWGWqi1eSuyUpnhM,
  Data: 0x
}
```

### Economic Model Specification
[Economic Model Specification](economic_model.md)

### Contracts Module Specification
https://docs.google.com/document/d/1gDtYjPR9C1VZChxEA-xAdQWQyEvMg245XrZR_MpE3cg/edit?usp=sharing

### Bonus goal

**Basic demo - Cryptopunks representation on the Substrate Chain.**

See this repo, it has running and playing instructions:
https://github.com/usetech-llc/substrapunks
