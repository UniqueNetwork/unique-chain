FROM mcr.microsoft.com/vscode/devcontainers/rust:0-1

RUN apt-get update && export DEBIAN_FRONTEND=noninteractive && \
    apt-get -y install --no-install-recommends libssl-dev pkg-config libclang-dev clang

RUN curl -L -o- https://github.com/WebAssembly/binaryen/releases/download/version_101/binaryen-version_101-x86_64-linux.tar.gz | \
    tar xz --strip-components=1 -C /usr

USER vscode

RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.37.2/install.sh | bash && \
    export NVM_DIR="$([ -z "${XDG_CONFIG_HOME-}" ] && printf %s "${HOME}/.nvm" || printf %s "${XDG_CONFIG_HOME}/nvm")" && \
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" && \
    nvm install v16.2.0 && \
    npm install -g yarn && \
    rustup toolchain install nightly-2021-05-30 && \
    rustup default nightly-2021-05-30 && \
    rustup target add wasm32-unknown-unknown && \
    rustup component add rustfmt clippy && \
    cargo install cargo-expand cargo-edit cargo-contract
