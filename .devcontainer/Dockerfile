FROM mcr.microsoft.com/vscode/devcontainers/rust:0-1

RUN apt-get update && export DEBIAN_FRONTEND=noninteractive && \
    apt-get -y install --no-install-recommends libssl-dev pkg-config libclang-dev clang

USER vscode

RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.37.2/install.sh | bash && \
    export NVM_DIR="$([ -z "${XDG_CONFIG_HOME-}" ] && printf %s "${HOME}/.nvm" || printf %s "${XDG_CONFIG_HOME}/nvm")" && \
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" && \
    nvm install v12.20.1 && \
    rustup toolchain install nightly-2021-03-01 && \
    rustup default nightly-2021-03-01 && \
    rustup target add wasm32-unknown-unknown