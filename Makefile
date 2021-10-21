.PHONY: _help
_help:
	@echo "regenerate_solidity - generate stubs/interfaces for contracts defined in native (via evm-coder)"
	@echo "evm_stubs - recompile contract stubs"
	@echo "bench - run frame-benchmarking"
	@echo "  bench-evm-migration"
	@echo "  bench-nft"

.PHONY: regenerate_solidity
regenerate_solidity:
	PACKAGE=pallet-nft NAME=eth::erc::fungible_iface OUTPUT=./tests/src/eth/api/UniqueFungible.sol ./.maintain/scripts/generate_api.sh
	PACKAGE=pallet-nft NAME=eth::erc::nft_iface OUTPUT=./tests/src/eth/api/UniqueNFT.sol ./.maintain/scripts/generate_api.sh
	PACKAGE=pallet-evm-contract-helpers NAME=eth::contract_helpers_iface OUTPUT=./tests/src/eth/api/ContractHelpers.sol ./.maintain/scripts/generate_api.sh

	PACKAGE=pallet-nft NAME=eth::erc::fungible_impl OUTPUT=./pallets/nft/src/eth/stubs/UniqueFungible.sol ./.maintain/scripts/generate_api.sh
	PACKAGE=pallet-nft NAME=eth::erc::nft_impl OUTPUT=./pallets/nft/src/eth/stubs/UniqueNFT.sol ./.maintain/scripts/generate_api.sh
	PACKAGE=pallet-evm-contract-helpers NAME=eth::contract_helpers_impl OUTPUT=./pallets/evm-contract-helpers/src/stubs/ContractHelpers.sol ./.maintain/scripts/generate_api.sh

NFT_EVM_STUBS=./pallets/nft/src/eth/stubs
CONTRACT_HELPERS_STUBS=./pallets/evm-contract-helpers/src/stubs/

$(NFT_EVM_STUBS)/UniqueFungible.raw: $(NFT_EVM_STUBS)/UniqueFungible.sol
	INPUT=$< OUTPUT=$@ ./.maintain/scripts/compile_stub.sh
$(NFT_EVM_STUBS)/UniqueNFT.raw: $(NFT_EVM_STUBS)/UniqueNFT.sol
	INPUT=$< OUTPUT=$@ ./.maintain/scripts/compile_stub.sh
$(CONTRACT_HELPERS_STUBS)/ContractHelpers.raw: $(CONTRACT_HELPERS_STUBS)/ContractHelpers.sol
	INPUT=$< OUTPUT=$@ ./.maintain/scripts/compile_stub.sh

evm_stubs: $(NFT_EVM_STUBS)/UniqueFungible.raw $(NFT_EVM_STUBS)/UniqueNFT.raw $(CONTRACT_HELPERS_STUBS)/ContractHelpers.raw

.PHONY: _bench
_bench:
	cargo run --release --features runtime-benchmarks -- \
	benchmark --pallet pallet-$(PALLET) \
	--wasm-execution compiled --extrinsic '*' \
	--template .maintain/frame-weight-template.hbs --steps=50 --repeat=20 \
	--output=./pallets/$(PALLET)/src/weights.rs

.PHONY: bench-evm-migration
bench-evm-migration:
	make _bench PALLET=evm-migration

.PHONY: bench-nft
bench-nft:
	make _bench PALLET=nft

.PHONY: bench-fungible
bench-fungible:
	make _bench PALLET=fungible

.PHONY: bench-refungible
bench-refungible:
	make _bench PALLET=refungible

.PHONY: bench-nonfungible
bench-nonfungible:
	make _bench PALLET=nonfungible

.PHONY: bench
bench: bench-evm-migration bench-nft bench-fungible bench-refungible bench-nonfungible
