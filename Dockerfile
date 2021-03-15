# ===== BUILD ======

FROM phusion/baseimage:18.04-1.0.0 as builder
LABEL maintainer="UniqueNetwork.io"

ENV WASM_TOOLCHAIN=nightly-2021-03-01
# ENV NATIVE_TOOLCHAIN=1.50.0

ARG PROFILE=release

RUN apt-get update && \
	apt-get dist-upgrade -y -o Dpkg::Options::="--force-confold" && \
	apt-get install -y cmake pkg-config libssl-dev git clang

# Get project and run it
#RUN git clone https://github.com/usetech-llc/nft_parachain /nft_parachain
RUN mkdir nft_parachain
WORKDIR /nft_parachain
COPY . .

RUN export CARGO_HOME="/cargo-home" && curl https://sh.rustup.rs -sSf | sh -s -- -y
RUN export PATH="/cargo-home/bin:$PATH" && \
    export CARGO_HOME="/cargo-home" && \
	cargo fetch
RUN export PATH="/cargo-home/bin:$PATH" && \
    export CARGO_HOME="/cargo-home" && \
	rustup toolchain uninstall $(rustup toolchain list) && \
	# rustup toolchain install $NATIVE_TOOLCHAIN && \
	rustup toolchain install $WASM_TOOLCHAIN && \
	rustup target add wasm32-unknown-unknown --toolchain $WASM_TOOLCHAIN && \
	rustup default $WASM_TOOLCHAIN && \
    rustup target list --installed && \
    rustup show

RUN export PATH="/cargo-home/bin:$PATH" && \
    export CARGO_HOME="/cargo-home" && \
	cargo build "--$PROFILE"
	# && \
	# cargo test

# ===== RUN ======

FROM phusion/baseimage:18.04-1.0.0
ARG PROFILE=release

COPY --from=builder /nft_parachain/target/$PROFILE/nft /usr/local/bin

EXPOSE 9944
VOLUME ["/chain-data"]

# Copy and run start script
COPY ["./run.sh", "./run.sh"]
RUN chmod +x ./run.sh
CMD ["bash", "-c", "./run.sh"]
