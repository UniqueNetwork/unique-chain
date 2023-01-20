.PHONY: _help
_help:
	@echo "regenerate_solidity - generate stubs/interfaces for contracts defined in native (via evm-coder)"
	@echo "evm_stubs - recompile contract stubs and ABI"
	@echo "bench - run frame-benchmarking"
	@echo "  bench-evm-migration"
	@echo "  bench-unique"

FUNGIBLE_EVM_STUBS=./pallets/fungible/src/stubs
FUNGIBLE_EVM_ABI=./tests/src/eth/abi/fungible.json

NONFUNGIBLE_EVM_STUBS=./pallets/nonfungible/src/stubs
NONFUNGIBLE_EVM_ABI=./tests/src/eth/abi/nonFungible.json

REFUNGIBLE_EVM_STUBS=./pallets/refungible/src/stubs
REFUNGIBLE_EVM_ABI=./tests/src/eth/abi/reFungible.json
REFUNGIBLE_TOKEN_EVM_ABI=./tests/src/eth/abi/reFungibleToken.json

CONTRACT_HELPERS_STUBS=./pallets/evm-contract-helpers/src/stubs/
CONTRACT_HELPERS_ABI=./tests/src/eth/abi/contractHelpers.json

COLLECTION_HELPER_STUBS=./pallets/unique/src/eth/stubs/
COLLECTION_HELPER_ABI=./tests/src/eth/abi/collectionHelpers.json

TESTS_API=./tests/src/eth/api/

.PHONY: regenerate_solidity
regenerate_solidity: UniqueFungible.sol UniqueNFT.sol UniqueRefungible.sol UniqueRefungibleToken.sol ContractHelpers.sol CollectionHelpers.sol

UniqueFungible.sol:
	PACKAGE=pallet-fungible NAME=erc::gen_iface OUTPUT=$(TESTS_API)/$@ ./.maintain/scripts/generate_sol.sh
	PACKAGE=pallet-fungible NAME=erc::gen_impl OUTPUT=$(FUNGIBLE_EVM_STUBS)/$@ ./.maintain/scripts/generate_sol.sh

UniqueNFT.sol:
	PACKAGE=pallet-nonfungible NAME=erc::gen_iface OUTPUT=$(TESTS_API)/$@ ./.maintain/scripts/generate_sol.sh
	PACKAGE=pallet-nonfungible NAME=erc::gen_impl OUTPUT=$(NONFUNGIBLE_EVM_STUBS)/$@ ./.maintain/scripts/generate_sol.sh

UniqueRefungible.sol:
	PACKAGE=pallet-refungible NAME=erc::gen_iface OUTPUT=$(TESTS_API)/$@ ./.maintain/scripts/generate_sol.sh
	PACKAGE=pallet-refungible NAME=erc::gen_impl OUTPUT=$(REFUNGIBLE_EVM_STUBS)/$@ ./.maintain/scripts/generate_sol.sh

UniqueRefungibleToken.sol:
	PACKAGE=pallet-refungible NAME=erc_token::gen_iface OUTPUT=$(TESTS_API)/$@ ./.maintain/scripts/generate_sol.sh
	PACKAGE=pallet-refungible NAME=erc_token::gen_impl OUTPUT=$(REFUNGIBLE_EVM_STUBS)/$@ ./.maintain/scripts/generate_sol.sh

ContractHelpers.sol:
	PACKAGE=pallet-evm-contract-helpers NAME=eth::contract_helpers_iface OUTPUT=$(TESTS_API)/$@ ./.maintain/scripts/generate_sol.sh
	PACKAGE=pallet-evm-contract-helpers NAME=eth::contract_helpers_impl OUTPUT=$(CONTRACT_HELPERS_STUBS)/$@ ./.maintain/scripts/generate_sol.sh

CollectionHelpers.sol:
	PACKAGE=pallet-unique NAME=eth::collection_helper_iface OUTPUT=$(TESTS_API)/$@ ./.maintain/scripts/generate_sol.sh
	PACKAGE=pallet-unique NAME=eth::collection_helper_impl OUTPUT=$(COLLECTION_HELPER_STUBS)/$@ ./.maintain/scripts/generate_sol.sh

UniqueFungible: UniqueFungible.sol
	INPUT=$(FUNGIBLE_EVM_STUBS)/$< OUTPUT=$(FUNGIBLE_EVM_STUBS)/UniqueFungible.raw ./.maintain/scripts/compile_stub.sh
	INPUT=$(FUNGIBLE_EVM_STUBS)/$< OUTPUT=$(FUNGIBLE_EVM_ABI) ./.maintain/scripts/generate_abi.sh

UniqueNFT: UniqueNFT.sol
	INPUT=$(NONFUNGIBLE_EVM_STUBS)/$< OUTPUT=$(NONFUNGIBLE_EVM_STUBS)/UniqueNFT.raw ./.maintain/scripts/compile_stub.sh
	INPUT=$(NONFUNGIBLE_EVM_STUBS)/$< OUTPUT=$(NONFUNGIBLE_EVM_ABI) ./.maintain/scripts/generate_abi.sh

UniqueRefungible: UniqueRefungible.sol
	INPUT=$(REFUNGIBLE_EVM_STUBS)/$< OUTPUT=$(REFUNGIBLE_EVM_STUBS)/UniqueRefungible.raw ./.maintain/scripts/compile_stub.sh
	INPUT=$(REFUNGIBLE_EVM_STUBS)/$< OUTPUT=$(REFUNGIBLE_EVM_ABI) ./.maintain/scripts/generate_abi.sh

UniqueRefungibleToken: UniqueRefungibleToken.sol
	INPUT=$(REFUNGIBLE_EVM_STUBS)/$< OUTPUT=$(REFUNGIBLE_EVM_STUBS)/UniqueRefungibleToken.raw ./.maintain/scripts/compile_stub.sh
	INPUT=$(REFUNGIBLE_EVM_STUBS)/$< OUTPUT=$(REFUNGIBLE_TOKEN_EVM_ABI) ./.maintain/scripts/generate_abi.sh

ContractHelpers: ContractHelpers.sol
	INPUT=$(CONTRACT_HELPERS_STUBS)/$< OUTPUT=$(CONTRACT_HELPERS_STUBS)/ContractHelpers.raw ./.maintain/scripts/compile_stub.sh
	INPUT=$(CONTRACT_HELPERS_STUBS)/$< OUTPUT=$(CONTRACT_HELPERS_ABI) ./.maintain/scripts/generate_abi.sh

CollectionHelpers: CollectionHelpers.sol
	INPUT=$(COLLECTION_HELPER_STUBS)/$< OUTPUT=$(COLLECTION_HELPER_STUBS)/CollectionHelpers.raw ./.maintain/scripts/compile_stub.sh
	INPUT=$(COLLECTION_HELPER_STUBS)/$< OUTPUT=$(COLLECTION_HELPER_ABI) ./.maintain/scripts/generate_abi.sh

evm_stubs: UniqueFungible UniqueNFT UniqueRefungible UniqueRefungibleToken ContractHelpers CollectionHelpers

.PHONY: _bench
_bench:
	cargo run --release --features runtime-benchmarks,$(RUNTIME) -- \
	benchmark pallet --pallet pallet-$(if $(PALLET),$(PALLET),$(error Must set PALLET)) \
	--wasm-execution compiled --extrinsic '*' \
	--template .maintain/frame-weight-template.hbs --steps=50 --repeat=80 --heap-pages=4096 \
	--output=./pallets/$(if $(PALLET_DIR),$(PALLET_DIR),$(PALLET))/src/weights.rs

.PHONY: bench-evm-migration
bench-evm-migration:
	make _bench PALLET=evm-migration

.PHONY: bench-configuration
bench-configuration:
	make _bench PALLET=configuration

.PHONY: bench-common
bench-common:
	make _bench PALLET=common

.PHONY: bench-unique
bench-unique:
	make _bench PALLET=unique

.PHONY: bench-fungible
bench-fungible:
	make _bench PALLET=fungible

.PHONY: bench-refungible
bench-refungible:
	make _bench PALLET=refungible

.PHONY: bench-nonfungible
bench-nonfungible:
	make _bench PALLET=nonfungible

.PHONY: bench-structure
bench-structure:
	make _bench PALLET=structure

.PHONY: bench-scheduler
bench-scheduler:
	make _bench PALLET=unique-scheduler-v2 PALLET_DIR=scheduler-v2

.PHONY: bench-rmrk-core
bench-rmrk-core:
	make _bench PALLET=proxy-rmrk-core

.PHONY: bench-rmrk-equip
bench-rmrk-equip:
	make _bench PALLET=proxy-rmrk-equip

.PHONY: bench-foreign-assets
bench-foreign-assets:
	make _bench PALLET=foreign-assets

.PHONY: bench-collator-selection
bench-collator-selection:
	make _bench PALLET=collator-selection

.PHONY: bench-identity
bench-identity:
	make _bench PALLET=identity

.PHONY: bench-app-promotion
bench-app-promotion:
	make _bench PALLET=app-promotion PALLET_DIR=app-promotion

.PHONY: bench
# Disabled: bench-scheduler, bench-collator-selection, bench-identity, bench-rmrk-core, bench-rmrk-equip
bench: bench-evm-migration bench-unique bench-structure bench-fungible bench-refungible bench-nonfungible bench-configuration bench-foreign-assets

.PHONY: check
check:
	SKIP_WASM_BUILD=1 cargo check --features=quartz-runtime,unique-runtime,try-runtime,runtime-benchmarks --tests

.PHONY: clippy
clippy:
	SKIP_WASM_BUILD=1 cargo clippy --features=quartz-runtime,unique-runtime,try-runtime,runtime-benchmarks --tests
