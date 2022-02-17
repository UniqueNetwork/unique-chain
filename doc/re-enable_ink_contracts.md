## Re-Enabling Ink! Contracts

Uncomment following lies:
1. In node/rpc/Cargo.toml
```
# pallet-contracts-rpc = { version = "3.0", git = 'https://github.com/paritytech/substrate.git', branch = 'polkadot-v0.9.9' }
```

2. In node/rpc/src/lib.rs
```
// C::Api: pallet_contracts_rpc::ContractsRuntimeApi<Block, AccountId, Balance, BlockNumber, Hash>,
...
// use pallet_contracts_rpc::{Contracts, ContractsApi};
...
// io.extend_with(ContractsApi::to_delegate(Contracts::new(client.clone())));

```

3. In runtime/Cargo.toml
```
    # 'pallet-contracts/std',
    # 'pallet-contracts-primitives/std',
    # 'pallet-contracts-rpc-runtime-api/std',
    # 'pallet-contract-helpers/std',
...
    # [dependencies.pallet-contracts]
    # git = 'https://github.com/paritytech/substrate.git'
    # default-features = false
    # branch = 'polkadot-v0.9.9'
    # version = '3.0.0'

    # [dependencies.pallet-contracts-primitives]
    # git = 'https://github.com/paritytech/substrate.git'
    # default-features = false
    # branch = 'polkadot-v0.9.9'
    # version = '3.0.0'

    # [dependencies.pallet-contracts-rpc-runtime-api]
    # git = 'https://github.com/paritytech/substrate.git'
    # default-features = false
    # branch = 'polkadot-v0.9.9'
    # version = '3.0.0'
...
    # pallet-contract-helpers = { path = '../pallets/contract-helpers', default-features = false, version = '0.1.0' }
```

4. runtime/src/lib.rs
```
// use pallet_contracts::weights::WeightInfo;
...
// pub use pallet_timestamp::Call as TimestampCall;
...
// mod chain_extension;
// use crate::chain_extension::{NFTExtension, Imbalance};
...
/*
parameter_types! {
	pub TombstoneDeposit: Balance = deposit(
  ...
}
*/
...
//pallet_contract_helpers::ContractSponsorshipHandler<Runtime>,
...
// impl pallet_contract_helpers::Config for Runtime {}
...
// Contracts: pallet_contracts::{Pallet, Call, Storage, Event<T>},
...
// ContractHelpers: pallet_contract_helpers::{Pallet, Call, Storage},
...
//pallet_contract_helpers::ContractHelpersExtension<Runtime>,
...
/*
	impl pallet_contracts_rpc_runtime_api::ContractsApi<Block, AccountId, Balance, BlockNumber, Hash>
		for Runtime
	{
    ...
	}
*/

```