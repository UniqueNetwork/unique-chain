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

.PHONY: bench
bench: bench-evm-migration
