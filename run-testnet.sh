# ls -la /nft_parachain/target/release

# /usr/local/bin/nft --dev --ws-external --rpc-external --base-path=/chain-data -lwarn,runtime

echo Running node $NODE
echo P2P Port        : $P2PPORT
echo WebSocket Port  : $WSPORT
echo RPC Port        : $RPCPORT

echo Boot = $BOOTNODE

if [ "$BOOTNODE" = True ]; 
then
echo This is a Bootnode;
BOOTNODES="";
else
echo Bootnode Port   : $BOOTPORT;
echo Bootnode PeerID : $BOOTID;
BOOTNODES="--bootnodes /dns4/node_einstein/tcp/$BOOTPORT/p2p/$BOOTID";
fi

if [ "VALIDATOR" = True ];
then
echo This is a Validator node;
/usr/local/bin/nft \
  --base-path /chain-data \
  --chain ./nftTestnetSpecRaw.json \
  --port $P2PPORT \
  --ws-port $WSPORT \
  --rpc-port $RPCPORT \
  --validator \
  --rpc-methods=Unsafe \
  --name $NODE \
  --ws-external \
  --rpc-external \
  -lruntime \
  $BOOTNODES;
else
echo This is a Gateway node;
/usr/local/bin/nft \
  --base-path /chain-data \
  --chain ./nftTestnetSpecRaw.json \
  --port $P2PPORT \
  --ws-port $WSPORT \
  --rpc-port $RPCPORT \
  --validator \
  --rpc-methods=Unsafe \
  --name $NODE \
  --ws-external \
  --rpc-external \
  --rpc-cors all \
  -lruntime \
  $BOOTNODES;
fi
