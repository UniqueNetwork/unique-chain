BOOTNODES="--bootnodes /ip4/212.248.19.53/tcp/30334/p2p/12D3KooWHQDopuFB5krJGPQYn8Pg8i6toMeZFHGMs6sUPPmv4RhP";

./target/debug/nft \
  --base-path ./chain-data \
  --chain ./nftTestnetSpecRaw.json \
  -lruntime \
  $BOOTNODES;
