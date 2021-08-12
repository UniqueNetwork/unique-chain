_bench:
	cargo run --release --features runtime-benchmarks -- \
	benchmark --pallet pallet-$(PALLET) \
	--wasm-execution compiled --extrinsic '*' \
	--template .maintain/frame-weight-template.hbs --steps=50 --repeat=20 \
	--output=./pallets/$(PALLET)/src/weights.rs

bench-evm-migration:
	make _bench PALLET=evm-migration

bench: bench-evm-migration