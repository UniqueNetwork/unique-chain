# How not to break RPC

Let's discuss how to avoid the breaking of RPC with an example of how the `colection_by_id` RPC method was broken.

The `collection_by_id` was broken due to the change of the result type `RpcCollection`.
The new version of the `RpcCollection` was incompatible with the old one due to addition of the `flags` field:

```rust
// The new version of the `RpcCollection`
pub struct RpcCollection<AccountId> {
	/// Collection owner account.
	pub owner: AccountId,
	/// Collection mode.
	pub mode: CollectionMode,
	/// Collection name.
	pub name: Vec<u16>,
	/// Collection description.
	pub description: Vec<u16>,
	/// Token prefix.
	pub token_prefix: Vec<u8>,
	/// The state of sponsorship of the collection.
	pub sponsorship: SponsorshipState<AccountId>,
	/// Collection limits.
	pub limits: CollectionLimits,
	/// Collection permissions.
	pub permissions: CollectionPermissions,
	/// Token property permissions.
	pub token_property_permissions: Vec<PropertyKeyPermission>,
	/// Collection properties.
	pub properties: Vec<Property>,
	/// Is collection read only.
	pub read_only: bool,

	/// Extra collection flags
	pub flags: RpcCollectionFlags, // <-- THIS IS A NEW FIELD!
}
```

### Where exactly was RPC broken?

To answer this question, we need to describe the process of handling an RPC call.

1. A user calls an RPC method.
2. The node sees what method with what arguments should be executed.
3. Since the code of each RPC method is located inside the runtime, the node does the following:
    - The node encodes the RPC arguments into the [SCALE format](https://docs.substrate.io/reference/scale-codec/), and then it will call the corresponding method of the runtime API with the encoded arguments.
    - The runtime executes the RPC logic and then returns the SCALE-encoded result.
    - The node receives the result from the runtime and then decodes it. **It is the place where RPC could break!**

Point #3 describes a process implemented inside the [`pass_method`](https://github.com/UniqueNetwork/unique-chain/blob/1c7179877b5fb1eacf86c5ecf607317d11999675/client/rpc/src/lib.rs#L435-L472) macro.

Using the `pass_method` macro the node maps each RPC method onto the corresponding runtime API method.

See how [the node's RPC is implemented](https://github.com/UniqueNetwork/unique-chain/blob/1c7179877b5fb1eacf86c5ecf607317d11999675/client/rpc/src/lib.rs#L493-L569) and how [the runtime API is declared](https://github.com/UniqueNetwork/unique-chain/blob/1c7179877b5fb1eacf86c5ecf607317d11999675/primitives/rpc/src/lib.rs#L32-L129).

### How can the node use the old runtime API? 

As you can see from the previous section -- RPC breaks if the runtime API data format is incompatible with the node's RPC data format.

When the node is working with an old runtime and exposes the new version of RPC that contains some methods with a changed signature, the node should call only the old versions of these methods to avoid RPC failure.

The node should do the following to get an old runtime API method to run correctly:
* The node should convert all the RPC arguments into the old runtime API format.
* It should convert the result from the runtime to the new data format (it is the only action needed in the case of `collection_by_id`). 

The `pass_method` macro can call the old runtime API methods.
For instance, the correct implementation of the `collection_by_id` RPC method looks like this: 
```rust
pass_method!(
	/* line 1 */ collection_by_id(collection: CollectionId) -> Option<RpcCollection<AccountId>>, unique_api;
	/* line 2 */ changed_in 3, collection_by_id_before_version_3(collection) => |value| value.map(|coll| coll.into())
);
```

The first line describes the newest RPC signature.

The second line tells us what should be called in the case if we're dealing with an old runtime API.
* `collection_by_id_before_version_3` -- the name of the corresponding runtime API method with an old signature.
* `(collection)` -- what arguments should the node pass to the old method. In the case of `collection_by_id`, we pass the arguments as is since there were no changes to the arguments' types.
* `=> |value| value.map(|coll| coll.into())` -- describes how to transform the return value from the old runtime API data format into the new RPC data format.

### Runtime API backward compatibility support

Methods like `collection_by_id_before_version_3` doesn't appear automatically.

When changing the runtime API methods' signatures, we need to:
* Specify the number of the new version of the runtime API.
* Specify the old versions of the changed methods.

See the documentation of the `decl_runtime_apis` macro: [runtime api trait versioning](https://docs.rs/sp-api/latest/sp_api/macro.decl_runtime_apis.html#runtime-api-trait-versioning).

### How to easily implement the converting from the old structure into the new ones

To describe structures that can have some fields changing over different versions, we use the `#[struct_versioning::versioned]` attribute.

Let's take a look at the `RpcCollection` declaration.

```rust
/// Collection parameters, used in RPC calls (see [`Collection`] for the storage version).
#[struct_versioning::versioned(version = 2, upper)]
#[derive(Encode, Decode, Clone, PartialEq, TypeInfo)]
#[cfg_attr(feature = "serde1", derive(Serialize, Deserialize))]
pub struct RpcCollection<AccountId> {
	/// Collection owner account.
	pub owner: AccountId,

	/// Collection mode.
	pub mode: CollectionMode,

	/// Collection name.
	pub name: Vec<u16>,

	/// Collection description.
	pub description: Vec<u16>,

	/// Token prefix.
	pub token_prefix: Vec<u8>,

	/// The state of sponsorship of the collection.
	pub sponsorship: SponsorshipState<AccountId>,

	/// Collection limits.
	pub limits: CollectionLimits,

	/// Collection permissions.
	pub permissions: CollectionPermissions,

	/// Token property permissions.
	pub token_property_permissions: Vec<PropertyKeyPermission>,

	/// Collection properties.
	pub properties: Vec<Property>,

	/// Is collection read only.
	pub read_only: bool,

	/// Extra collection flags
	#[version(2.., upper(RpcCollectionFlags {foreign: false, erc721metadata: false}))]
	pub flags: RpcCollectionFlags,
}
```

The `#[struct_versioning::versioned]` will create 2 types for us: the `RpcCollectionVersion1` (the old version) and the `RpcCollection` (the new version).

This attribute automatically implements the `impl From<RpcCollectionVersion1> for RpcCollection`.

The attribute understands how to map the old fields to new ones with the help of the `#[version(...)]` field attribute, which should be placed right before the field in question.

There were no field `flags` in the `RpcCollectionVersion1` structure. The `#[version(2.., upper(<expr>))]` tells the attribute to assign the `flags` field to `<expr>` in the new version of the `RpcCollection` structure.

Given that we have the `From` trait implemented for the new version of the `RpcCollection`, we can use `.into()` to convert the old version to the new one as we did in the `pass_method` macro above.

Here is the description of the `struct_versioning` attribute:
```
Generate versioned variants of a struct

 `#[versioned(version = 1[, first_version = 1][, upper][, versions])]`
 - *version* - current version of a struct
 - *first_version* - allows to skip generation of structs, which predates first supported version
 - *upper* - generate From impls, which converts old version of structs to new
 - *versions* - generate enum, which contains all possible versions of struct

 Each field may have version attribute
 `#[version([1]..[2][, upper(old)])]`
 - *1* - version, on which this field is appeared
 - *2* - version, in which this field was removed
 (i.e if set to 2, this field was exist on version 1, and no longer exist on version 2)
 - *upper* - code, which should be executed to transform old value to new/create new value
```
