cp launch-config-full-statemine.json ../polkadot-launch/launch-config-full-statemine.json

cd ../polkadot-launch
yarn install
yarn build
yarn start launch-config-full-statemine.json
