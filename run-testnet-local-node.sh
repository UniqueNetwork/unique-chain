BOOTNODES="--bootnodes /ip4/212.248.19.53/tcp/30334/p2p/12D3KooWRLrjXxByPkSCzcsRyf6652brnJT9s4AQHR3uujJ35mxz";

./target/debug/nft \
  --base-path /chain-data \
  --chain ./nftTestnetSpecRaw.json \
  --ws-external \
  --rpc-cors all \
  -lruntime \
  $BOOTNODES;
