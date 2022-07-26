cp launch-config-acala-unique.json ../polkadot-launch/launch-config-acala-unique.json

cd ../polkadot-launch
yarn install
yarn build
yarn start launch-config-acala-unique.json
