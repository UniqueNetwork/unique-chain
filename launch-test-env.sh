cp launch-config.json ../polkadot-launch/launch-config.json

cd ../polkadot-launch
yarn install
yarn build
yarn start launch-config.json
