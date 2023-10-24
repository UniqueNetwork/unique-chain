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

-   [SubstraPunks Game hosted on IPFS](https://github.com/UniqueNetwork/substrapunks)
-   [Unique Wallet and UI](https://wallet.unique.network)
-   [NFT Asset for Unity Framework](https://github.com/usetech-llc/nft_unity)

Please see our [walk-through instructions](doc/hackusama_walk_through.md) to try everything out!

## Application Development

If you are building an application that operates NFT tokens, use [this document](doc/application_development.md).


## Building

Building Unique chain requires special versions of Rust and toolchain. We don't use the most recent versions of everything
so that we can keep the builds stable.

*Windows note: We do not provide support for Windows systems and don't test the Unique chain on them.
Nonetheless, the Unique chain node might work on Windows. To build it on Windows, you need to enable symlink support in Git:*
```
git config --global core.symlinks true
```

1. Install Rust:

```bash
sudo apt-get install git curl libssl-dev llvm pkg-config libclang-dev clang make cmake protobuf-compiler
curl https://sh.rustup.rs -sSf | sh
```

2. Remove all installed toolchains with `rustup toolchain list` and `rustup toolchain uninstall <toolchain>`.

3. Install toolchain nightly-2023-05-22 and make it default:

```bash
rustup toolchain install nightly-2023-05-22
rustup default nightly-2023-05-22
```

4. Add wasm target for nightly toolchain:

```bash
rustup target add wasm32-unknown-unknown --toolchain nightly-2023-05-22
```

5. Build:

Opal
```bash
cargo build --release
```
Quartz
```bash
cargo build --features=quartz-runtime --release
```
Unique
```bash
cargo build --features=unique-runtime --release
```

## Building as Parachain locally

Note: checkout this project and all related projects (see below) in the sibling folders (both under the same folder)

### Build relay

```
git clone https://github.com/paritytech/polkadot.git
cd polkadot
git checkout release-v0.9.43
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

### Dev mode

You can launch the node in the dev mode where blocks are sealed automatically each 500 ms or on each new transaction.

* Opal Runtime: `cargo run --release -- --dev`
* Quartz Runtime: `cargo run --release --features quartz-runtime -- --dev`
* Unique Runtime: `cargo run --release --features unique-runtime -- --dev`

 You can tweak the dev mode with the following CLI options:
 * --idle-autoseal-interval <IDLE_AUTOSEAL_INTERVAL>
          When running the node in the `--dev` mode, an empty block will be sealed automatically after the `<IDLE_AUTOSEAL_INTERVAL>` milliseconds.
 * --disable-autoseal-on-tx
          Disable auto-sealing blocks on new transactions in the `--dev` mode
 * --autoseal-finalization-delay <AUTOSEAL_FINALIZATION_DELAY>
          Finalization delay (in seconds) of auto-sealed blocks in the `--dev` mode.
          Disabled by default.

## Run Integration Tests

1. Install all needed dependencies
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

### Enable checking of code style on commits
```bash
make git-hooks
```


## Karura token transfer

To get started, you need to open inbound and outbound hrmp channels.

### Next, we need to register our asset at Karura.
```
assetRegistry -> registerForeignAsset(location, metadata)
location:
	V0(X2(Parent, Parachain(PARA_ID)))
metadata:
	name         QTZ
	symbol       QTZ
	decimals     18
minimalBalance	 1
```

### Next, we can send tokens from Quartz to Karura:
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

### To send tokens from Karura to Quartz:
```
xtokens -> transfer

currencyId:
	ForeignAsset
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
