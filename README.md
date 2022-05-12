![Docker build](https://github.com/usetech-llc/nft_parachain/workflows/Docker%20build/badge.svg)

# Unique Parachain

## Project Description

The Unique Pallet is the core of NFT functionality. Like ERC-721 standard in Ethereum ecosystem, this pallet provides the
basement for creating collections of unique non-divisible things, also called Non Fungible Tokens (NFTs), minting NFT of
a given Collection, and managing their ownership.

The pallet also enables storing NFT properties. Though (according to ERC-721) NFT properties belong to logic of a
concrete application that operates a Collection, so purposefully the NFT Tracking Module does not have any knowledge
about properties except their byte size leaving application logic out to be controlled by Smart Contracts.

The Unique Chain also provides:

-   Smart Contracts Pallet and example smart contract that interacts with Unique Runtime
-   ERC-1155 Functionality (currently PoC as Re-Fungible tokens, i.e. items that are still unique, but that can be split
    between multiple users)
-   Variety of economic options for dapp producers to choose from to create freemium games and other ways to attract
    users. As a step one, we implemented an economic model when a collection sponsor can be set to pay for collection
    Transfer transactions.

Wider Unique Ecosystem (most of it was developed during Hackusama):

-   [SubstraPunks Game hosted on IPFS](https://github.com/usetech-llc/substrapunks)
-   [Unique Wallet and UI](https://uniqueapps.usetech.com/#/nft)
-   [NFT Asset for Unity Framework](https://github.com/usetech-llc/nft_unity)

Please see our [walk-through instructions](doc/hackusama_walk_through.md) to try everything out!

## Application Development

If you are building an application that operates NFT tokens, use [this document](doc/application_development.md).


## Building

Building Unique chain requires special versions of Rust and toolchain. We don't use the most recent versions of everything
so that we can keep the builds stable.

1. Install Rust:

```bash
sudo apt-get install git curl libssl-dev llvm pkg-config libclang-dev clang
curl https://sh.rustup.rs -sSf | sh
```

2. Remove all installed toolchains with `rustup toolchain list` and `rustup toolchain uninstall <toolchain>`.

3. Install install nightly 2021-11-11 and make it default:

```bash
rustup toolchain install nightly-2022-04-07
rustup default nightly-2022-04-07
```

4. Add wasm target for nightly toolchain:

```bash
rustup target add wasm32-unknown-unknown --toolchain nightly-2022-04-07
```

5. Build:
```bash
cargo build --features=unique-runtime,quartz-runtime --release
```

## Building as Parachain locally

Note: checkout this project and all related projects (see below) in the sibling folders (both under the same folder)

### Polkadot launch utility

```
git clone https://github.com/paritytech/polkadot-launch
```

### Build relay

```
git clone https://github.com/paritytech/polkadot.git
cd polkadot
git checkout release-v0.9.21
cargo build --release
```

### Build Unique parachain

Run in the root of this project:
```
cargo build --release
```

### Build Acala parachain (optional, full config only)

```
git clone https://github.com/AcalaNetwork/Acala
cd Acala
git checkout 54db3acd409a0b787f116f20e163a3b24101ce38
make build-release
```

## Running as Parachain locally

```
./launch-testnet.sh
```

Optional, full setup with Acala and Statemint
```
./launch-testnet-full.sh
```

## Run Integration Tests

1. Install all needed dependecies
```
cd tests
yarn install
```

2. Run tests
```
yarn test
```


## Code Formatting

### Apply formatting and clippy fixes
```bash
cargo clippy
cargo fmt
```

### Format tests
```bash
pushd tests && yarn fix ; popd
```

### Check code style in tests
```bash
cd tests && yarn eslint --ext .ts,.js src/
```


## Karura token transfer

To get started, you need to open inbound and outbound hrmp channels.

### Next, we need to register our asset at Karura.
```
assetRegistry -> registerForeignAsset(location, metadata)
location:
	V0(X2(Parent, Parachain(PARA_ID)))
metadata:
	name         OPL
	symbol       OPL
	decimals     18
minimalBalance	 1
```

### Next, we can send tokens from Opal to Karura:
```
polkadotXcm -> reserveTransferAssets
dest:
	V0(X2(Parent, Parachain(<KARURA_PARA_ID>)))
beneficiary:
	X1(AccountId(Any, <ACCOUNT>))
assets:
	V1(Concrete(0,Here), Fungible(<AMOUNT>))
feeAssetItem:
	0
weightLimit:
	<LIMIT>
```

The result will be displayed in ChainState
tokens -> accounts

### To send tokens from Karura to Opal:
```
xtokens -> transfer

currencyId:
	ForeingAsset
		<TOKEN_ID>

amount:
		<AMOUNT>
dest:
	V1
	(
		Parents:1,
		X2(Parachain(<KARURA_PARA_ID>), AccountId(Any, <ACCOUNT>)
	)
destWeight:
	<WEIGHT>
```
