# ls -la /nft_parachain/target/release

# /usr/local/bin/nft --dev --ws-external --rpc-external --base-path=/chain-data -lwarn,runtime

echo Running node $NODE

/usr/local/bin/nft \
  --base-path /chain-data \
  --chain ./customSpecRaw.json \
  --port 30334 \
  --ws-port 9945 \
  --rpc-port 9934 \
  --telemetry-url 'ws://telemetry.polkadot.io:1024 0' \
  --validator \
  --rpc-methods=Unsafe \
  --name MyNode02 \
  --bootnodes /ip4/<IP Address>/tcp/<Port>/p2p/<Peer ID>