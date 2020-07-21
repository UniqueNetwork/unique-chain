#######################################################
#
# Deployng process:
#
#   1. Git pull the nft_parachain on the server
#   2. SCP secret files in the root folder of nft_parachain
#      - einstein_store_key.json
#      - newton_store_key.json
#      - einstein_key_file
#   3. Run this script
#

### Build and run Einstein node (bootnode) and Newton node
docker-compose -f docker-compose-testnet.yml up -d --build

### Deploy store keys
# Einstein
curl http://localhost:9935 -H "Content-Type:application/json;charset=utf-8" -d "@./einstein_store_key.json"

# Newton
curl http://localhost:9936 -H "Content-Type:application/json;charset=utf-8" -d "@./newton_store_key.json"

### Stop and restart nodes so that they start finalizing
docker-compose -f docker-compose-testnet.yml down
docker-compose -f docker-compose-testnet.yml up -d

### Cleanup

# Delete key file used to set bootnode peer ID
rm einstein_key_file

# Delete store key files
rm ./einstein_store_key.json
rm ./newton_store_key.json
