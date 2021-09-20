#!/bin/bash 
curl http://127.0.0.1:9933 -H "Content-Type:application/json;charset=utf-8" -d "@/opt/usetech/keys/nft-rococo-alice-aura-key.json"
curl http://127.0.0.1:9953 -H "Content-Type:application/json;charset=utf-8" -d "@/opt/usetech/keys/nft-rococo-bob-aura-key.json"
curl http://127.0.0.1:9963 -H "Content-Type:application/json;charset=utf-8" -d "@/opt/usetech/keys/nft-rococo-charlie-aura-key.json"
curl http://127.0.0.1:9973 -H "Content-Type:application/json;charset=utf-8" -d "@/opt/usetech/keys/nft-rococo-dave-aura-key.json"
curl http://127.0.0.1:9983 -H "Content-Type:application/json;charset=utf-8" -d "@/opt/usetech/keys/nft-rococo-eve-aura-key.json"
curl http://127.0.0.1:9993 -H "Content-Type:application/json;charset=utf-8" -d "@/opt/usetech/keys/nft-rococo-ferdie-aura-key.json"
curl http://127.0.0.1:9903 -H "Content-Type:application/json;charset=utf-8" -d "@/opt/usetech/keys/nft-rococo-greg-aura-key.json"

service parachain-rococo-alice restart
service parachain-rococo-bob restart
service parachain-rococo-charlie restart
service parachain-rococo-dave restart
service parachain-rococo-eve restart
service parachain-rococo-ferdie restart
service parachain-rococo-greg restart
