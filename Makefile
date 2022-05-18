.PHONY: _help
_help:
	@echo "regenerate_solidity - generate stubs/interfaces for contracts defined in native (via evm-coder)"
	@echo "evm_stubs - recompile contract stubs and ABI"
	@echo "bench - run frame-benchmarking"
	@echo "  bench-evm-migration"
	@echo "  bench-unique"

FUNGIBLE_EVM_STUBS=./pallets/fungible/src/stubs
FUNGIBLE_EVM_ABI=./tests/src/eth/fungibleAbi.json

NONFUNGIBLE_EVM_STUBS=./pallets/nonfungible/src/stubs
NONFUNGIBLE_EVM_ABI=./tests/src/eth/nonFungibleAbi.json

CONTRACT_HELPERS_STUBS=./pallets/evm-contract-helpers/src/stubs/
CONTRACT_HELPERS_ABI=./tests/src/eth/util/contractHelpersAbi.json

COLLECTION_STUBS=./pallets/unique/src/eth/stubs/
COLLECTION_ABI=./tests/src/eth/collectionAbi.json

COLLECTION_HELPER_STUBS=$(COLLECTION_STUBS)
COLLECTION_HELPER_ABI=./tests/src/eth/collectionHelperAbi.json

TESTS_API=./tests/src/eth/api/

.PHONY: regenerate_solidity
regenerate_solidity: UniqueFungible.sol UniqueNFT.sol ContractHelpers.sol Collection.sol

UniqueFungible.sol:
	PACKAGE=pallet-fungible NAME=erc::gen_iface OUTPUT=$(TESTS_API)/$@ ./.maintain/scripts/generate_sol.sh
	PACKAGE=pallet-fungible NAME=erc::gen_impl OUTPUT=$(FUNGIBLE_EVM_STUBS)/$@ ./.maintain/scripts/generate_sol.sh

UniqueNFT.sol:
	PACKAGE=pallet-nonfungible NAME=erc::gen_iface OUTPUT=$(TESTS_API)/$@ ./.maintain/scripts/generate_sol.sh
	PACKAGE=pallet-nonfungible NAME=erc::gen_impl OUTPUT=$(NONFUNGIBLE_EVM_STUBS)/$@ ./.maintain/scripts/generate_sol.sh

ContractHelpers.sol:
	PACKAGE=pallet-evm-contract-helpers NAME=eth::contract_helpers_iface OUTPUT=$(TESTS_API)/$@ ./.maintain/scripts/generate_sol.sh
	PACKAGE=pallet-evm-contract-helpers NAME=eth::contract_helpers_impl OUTPUT=$(CONTRACT_HELPERS_STUBS)/$@ ./.maintain/scripts/generate_sol.sh

Collection.sol:
	PACKAGE=pallet-unique NAME=eth::evm_collection::collection_iface OUTPUT=$(TESTS_API)/$@ ./.maintain/scripts/generate_sol.sh
	PACKAGE=pallet-unique NAME=eth::evm_collection::collection_impl OUTPUT=$(COLLECTION_STUBS)/$@ ./.maintain/scripts/generate_sol.sh

CollectionHelper.sol:
	PACKAGE=pallet-unique NAME=eth::evm_collection::collection_helper_iface OUTPUT=$(TESTS_API)/$@ ./.maintain/scripts/generate_sol.sh
	PACKAGE=pallet-unique NAME=eth::evm_collection::collection_helper_impl OUTPUT=$(COLLECTION_HELPER_STUBS)/$@ ./.maintain/scripts/generate_sol.sh

UniqueFungible: UniqueFungible.sol
	INPUT=$(FUNGIBLE_EVM_STUBS)/$< OUTPUT=$(FUNGIBLE_EVM_STUBS)/UniqueFungible.raw ./.maintain/scripts/compile_stub.sh
	INPUT=$(FUNGIBLE_EVM_STUBS)/$< OUTPUT=$(FUNGIBLE_EVM_ABI) ./.maintain/scripts/generate_abi.sh

UniqueNFT: UniqueNFT.sol
	INPUT=$(NONFUNGIBLE_EVM_STUBS)/$< OUTPUT=$(NONFUNGIBLE_EVM_STUBS)/UniqueNFT.raw ./.maintain/scripts/compile_stub.sh
	INPUT=$(NONFUNGIBLE_EVM_STUBS)/$< OUTPUT=$(NONFUNGIBLE_EVM_ABI) ./.maintain/scripts/generate_abi.sh

ContractHelpers: ContractHelpers.sol
	INPUT=$(CONTRACT_HELPERS_STUBS)/$< OUTPUT=$(CONTRACT_HELPERS_STUBS)/ContractHelpers.raw ./.maintain/scripts/compile_stub.sh
	INPUT=$(CONTRACT_HELPERS_STUBS)/$< OUTPUT=$(CONTRACT_HELPERS_ABI) ./.maintain/scripts/generate_abi.sh

Collection: Collection.sol
	INPUT=$(COLLECTION_STUBS)/$< OUTPUT=$(COLLECTION_STUBS)/Collection.raw ./.maintain/scripts/compile_stub.sh
	INPUT=$(COLLECTION_STUBS)/$< OUTPUT=$(COLLECTION_ABI) ./.maintain/scripts/generate_abi.sh

CollectionHelper: CollectionHelper.sol
	INPUT=$(COLLECTION_HELPER_STUBS)/$< OUTPUT=$(COLLECTION_HELPER_STUBS)/CollectionHelper.raw ./.maintain/scripts/compile_stub.sh
	INPUT=$(COLLECTION_HELPER_STUBS)/$< OUTPUT=$(COLLECTION_HELPER_ABI) ./.maintain/scripts/generate_abi.sh

evm_stubs: UniqueFungible UniqueNFT ContractHelpers Collection CollectionHelper

.PHONY: _bench
_bench:
	cargo run --release --features runtime-benchmarks,unique-runtime -- \
	benchmark pallet --pallet pallet-$(PALLET) \
	--wasm-execution compiled --extrinsic '*' \
	--template .maintain/frame-weight-template.hbs --steps=50 --repeat=200 --heap-pages=4096 \
	--output=./pallets/$(PALLET)/src/weights.rs

.PHONY: bench-evm-migration
bench-evm-migration:
	make _bench PALLET=evm-migration

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

.PHONY: bench
bench: bench-evm-migration bench-unique bench-structure bench-fungible bench-refungible bench-nonfungible
