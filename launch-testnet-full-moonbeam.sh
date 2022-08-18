cp launch-config-full-moonbeam.json ../polkadot-launch/launch-config-full.json

cd ../polkadot-launch
yarn install
yarn build
yarn start launch-config-full.json

