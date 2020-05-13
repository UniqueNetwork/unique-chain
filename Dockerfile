FROM rust:latest

EXPOSE 9944

# Install build tools
RUN apt-get update && apt-get -y install -y cmake pkg-config libssl-dev git gcc build-essential clang libclang-dev curl
RUN curl https://getsubstrate.io -sSf | bash -s -- --fast
RUN rustup update nightly
RUN rustup target add wasm32-unknown-unknown --toolchain nightly
RUN rustup update

# Get project and run it
RUN git clone https://github.com/usetech-llc/nft_parachain
WORKDIR /nft_parachain
RUN cargo build
RUN cargo test --all

# Copy and run start script
COPY ["./run.sh", "./run.sh"]
RUN chmod +x ./run.sh
CMD ["bash", "-c", "./run.sh"]
