## Stakers Data Loading

Set the environment variable (WS_RPC). For example, ws://localhost:9944. Execute the following command:

chainql --tla-str=chainUrl=<WS_RPC> stakersParser.jsonnet > output.json

    where <WS_RPC> - is the network address.

Example for Opal:
:

chainql --tla-str=chainUrl=wss://eu-ws-opal.unique.network:443 stakersParser.jsonnet > output.json

To install chainql, execute the following command:


cargo install chainql

## Execute offchain migration

To run, you need to add an environment variable (SUPERUSER_SEED) with the sudo key seed.

Run the script by executing the following command:

npx ts-node lockedToFreeze.ts