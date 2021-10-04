# Tests

## Prepare test environment

1. Checkout polkadot in sibling folder with this project
```bash
git clone https://github.com/paritytech/polkadot.git && cd polkadot
git checkout release-v0.9.9
```

2. Build with nightly-2021-06-28
```bash
cargo build --release
```

3. Build the project

4. Checkout polkadot-launch in the sibling folder:
```bash
git clone https://github.com/paritytech/polkadot-launch && cd polkadot-launch
```

5. Run launch-test-env.sh from the root of this project


## How to run tests

1. Run `yarn install`.
2. Optional step - configure tests with env variables or by editing [configuration file](src/config.ts).
3. Run `yarn test`.

