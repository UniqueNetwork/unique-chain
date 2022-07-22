cp launch-config-full-acala.json ../polkadot-launch/launch-config-full-acala.json

cd ../polkadot-launch
yarn install
yarn build
yarn start launch-config-full-acala.json
