#!/bin/bash 
curl http://127.0.0.1:9933 -H "Content-Type:application/json;charset=utf-8" -d "@/opt/usetech/nft-westend-alice-aura-key.json"
curl http://127.0.0.1:9953 -H "Content-Type:application/json;charset=utf-8" -d "@/opt/usetech/nft-westend-bob-aura-key.json"
curl http://127.0.0.1:9963 -H "Content-Type:application/json;charset=utf-8" -d "@/opt/usetech/nft-westend-charlie-aura-key.json"
curl http://127.0.0.1:9973 -H "Content-Type:application/json;charset=utf-8" -d "@/opt/usetech/nft-westend-dave-aura-key.json"
curl http://127.0.0.1:9983 -H "Content-Type:application/json;charset=utf-8" -d "@/opt/usetech/nft-westend-eve-aura-key.json"
curl http://127.0.0.1:9993 -H "Content-Type:application/json;charset=utf-8" -d "@/opt/usetech/nft-westend-ferdie-aura-key.json"
curl http://127.0.0.1:9903 -H "Content-Type:application/json;charset=utf-8" -d "@/opt/usetech/nft-westend-greg-aura-key.json"

service parachain-westend-alice restart
service parachain-westend-bob restart
service parachain-westend-charlie restart
service parachain-westend-dave restart
service parachain-westend-eve restart
service parachain-westend-ferdie restart
service parachain-westend-greg restart
