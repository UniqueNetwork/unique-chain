cp launch-config-full-karura.json ../polkadot-launch/launch-config-full-karura.json

cd ../polkadot-launch
yarn install
yarn build
yarn start launch-config-full-karura.json
