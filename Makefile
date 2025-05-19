.PHONY: _help
_help:
	@echo "regenerate_solidity - generate stubs/interfaces for contracts defined in native (via evm-coder)"
	@echo "evm_stubs - recompile contract stubs and ABI"
	@echo "bench - run frame-benchmarking"
	@echo "  bench-evm-migration"
	@echo "  bench-unique"
	@echo "BUILD:"
	@echo "  make unique - build with unique-runtime feature"
	@echo "  make quartz - build with quartz-runtime feature"
	@echo "  make opal  - build with opal-runtime feature"

PROFILE := production

MAKEFLAGS := --jobs=$(shell nproc) --output-sync=none

NATIVE_FUNGIBLE_EVM_STUBS=./pallets/balances-adapter/src/stubs
NATIVE_FUNGIBLE_EVM_ABI=./js-packages/evm-abi/abi/nativeFungible.json

FUNGIBLE_EVM_STUBS=./pallets/fungible/src/stubs
FUNGIBLE_EVM_ABI=./js-packages/evm-abi/abi/fungible.json

NONFUNGIBLE_EVM_STUBS=./pallets/nonfungible/src/stubs
NONFUNGIBLE_EVM_ABI=./js-packages/evm-abi/abi/nonFungible.json

REFUNGIBLE_EVM_STUBS=./pallets/refungible/src/stubs
REFUNGIBLE_EVM_ABI=./js-packages/evm-abi/abi/reFungible.json
REFUNGIBLE_TOKEN_EVM_ABI=./js-packages/evm-abi/abi/reFungibleToken.json

CONTRACT_HELPERS_STUBS=./pallets/evm-contract-helpers/src/stubs/
CONTRACT_HELPERS_ABI=./js-packages/evm-abi/abi/contractHelpers.json

COLLECTION_HELPER_STUBS=./pallets/unique/src/eth/stubs/
COLLECTION_HELPER_ABI=./js-packages/evm-abi/abi/collectionHelpers.json

TESTS_API=./js-packages/evm-abi/api/

# BUILDS
unique:
    @echo "Build with unique-runtime feature"
	cargo build --profile=$(PROFILE) --features=unique-runtime

quartz:
    @echo "Build with quartz-runtime feature"
	cargo build --profile=$(PROFILE) --features=quartz-runtime

opal:
    @echo "Build with opal-runtime feature"
	cargo build --profile=$(PROFILE) --features=opal-runtime

.PHONY: unique quartz opal

.PHONY: regenerate_solidity
regenerate_solidity: UniqueFungible.sol UniqueNFT.sol UniqueRefungible.sol UniqueRefungibleToken.sol ContractHelpers.sol CollectionHelpers.sol

UniqueNativeFungible.sol:
	PACKAGE=pallet-balances-adapter NAME=erc::gen_iface OUTPUT=$(TESTS_API)/$@ ./.maintain/scripts/generate_sol.sh
	PACKAGE=pallet-balances-adapter NAME=erc::gen_impl OUTPUT=$(NATIVE_FUNGIBLE_EVM_STUBS)/$@ ./.maintain/scripts/generate_sol.sh
	
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

UniqueNativeFungible: UniqueNativeFungible.sol
	INPUT=$(NATIVE_FUNGIBLE_EVM_STUBS)/$< OUTPUT=$(NATIVE_FUNGIBLE_EVM_STUBS)/UniqueNativeFungible.raw ./.maintain/scripts/compile_stub.sh
	INPUT=$(NATIVE_FUNGIBLE_EVM_STUBS)/$< OUTPUT=$(NATIVE_FUNGIBLE_EVM_ABI) ./.maintain/scripts/generate_abi.sh
	
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

# TODO: Create benchmarking profile, make it a proper dependency
.PHONY: benchmarking-node
benchmarking-node:
	cargo build --profile production --features runtime-benchmarks

define _bench =
.PHONY: bench-$(1)
bench-$(1): benchmarking-node
	./target/production/unique-collator \
	benchmark pallet --pallet pallet-$(1) \
	--wasm-execution compiled --extrinsic '*' \
	$(if $(4),$(4),--template=.maintain/frame-weight-template.hbs) --steps=50 --repeat=80 --heap-pages=4096 \
	--output=$$(if $(3),$(3),./pallets/$(if $(2),$(2),$(1))/src/weights.rs)
endef

# _bench,pallet,(pallet_dir|),(output|),(extra|)
$(eval $(call _bench,evm-migration))
$(eval $(call _bench,configuration))
$(eval $(call _bench,common))
$(eval $(call _bench,unique))
$(eval $(call _bench,fungible))
$(eval $(call _bench,refungible))
$(eval $(call _bench,nonfungible))
$(eval $(call _bench,structure))
$(eval $(call _bench,foreign-assets))
$(eval $(call _bench,collator-selection))
$(eval $(call _bench,identity))
$(eval $(call _bench,app-promotion))
$(eval $(call _bench,maintenance))
$(eval $(call _bench,xcm,,./runtime/common/weights/xcm.rs,"--template=.maintain/external-weight-template.hbs"))
$(eval $(call _bench,scheduler,,./runtime/common/weights/scheduler.rs,"--template=.maintain/external-weight-template.hbs"))

.PHONY: bench
bench: bench-app-promotion bench-common bench-evm-migration bench-unique bench-structure bench-fungible bench-refungible bench-nonfungible bench-configuration bench-foreign-assets bench-maintenance bench-xcm bench-collator-selection bench-identity bench-scheduler

.PHONY: check
check:
	SKIP_WASM_BUILD=1 cargo check --features=quartz-runtime,unique-runtime,try-runtime,runtime-benchmarks --tests

.PHONY: clippy
clippy:
	cargo clippy --features=quartz-runtime,unique-runtime,try-runtime,runtime-benchmarks --tests

.PHONY: git-hooks
git-hooks:
	cp .githooks/pre-commit .git/hooks/pre-commit

.PHONY: git-blame
git-blame:
	git config blame.ignoreRevsFile .git-blame-ignore-revs

.PHONY: init
init:
	make git-hooks
	cd tests
	yarn install
