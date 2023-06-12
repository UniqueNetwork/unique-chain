# Update Procedure

- Enable maintenance mode
- [Collect migration data using ChainQL](#stakers-data-loading)
- ❗️❗️❗️ Initiate the runtime upgrade only at this point ❗️❗️❗️
- Wait for the upgrade to complete
- [Execute offchain migration](#execute-offchain-migration)
- Disable maintenance mode

## Stakers Data Loading

Set the environment variable (WS_RPC). For example, ws://localhost:9944. Execute the following command:

```sh
chainql --tla-str=chainUrl=<WS_RPC> stakersParser.jsonnet > output.json
```

where `<WS_RPC>` - is the network address.

Example for Opal:

```sh
chainql --tla-str=chainUrl=wss://eu-ws-opal.unique.network:443 stakersParser.jsonnet > output.json
```

To install chainql, execute the following command:

```sh
cargo install chainql
```

## Execute offchain migration

To run, you need to add an environment variable (`SUPERUSER_SEED`) with the sudo key seed.

Run the script by executing the following command:

```sh
npx ts-node --esm lockedToFreeze.ts
```