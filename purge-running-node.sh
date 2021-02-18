docker-compose exec node nft purge-chain --dev --base-path=/chain-data -y
docker-compose down
docker-compose up -d
