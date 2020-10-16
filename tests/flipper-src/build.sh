rustup component add rust-src --toolchain nightly
cargo +nightly contract build
cargo +nightly contract generate-metadata
