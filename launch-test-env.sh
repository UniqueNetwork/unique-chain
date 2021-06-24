cp launch-config.json ../polkadot-launch/launch-config.json
cp runtime_types.json ../polkadot-launch/runtime_types.json

cd ../polkadot-launch
yarn install
yarn build
yarn start launch-config.json