cp launch-config-statemine.json ../polkadot-launch/launch-config-statemine.json

cd ../polkadot-launch
yarn install
yarn build
yarn start launch-config-statemine.json
