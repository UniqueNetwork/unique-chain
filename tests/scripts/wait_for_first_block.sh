#!/usr/bin/env bash

function do_rpc {
	curl -s --header "Content-Type: application/json" -XPOST --data "{\"id\":1,\"jsonrpc\":\"2.0\",\"method\":\"$1\",\"params\":[$2]}" $RPC_URL
}

function is_started {
    block_hash_rpc=$(do_rpc chain_getFinalizedHead)
    echo Rpc response = $block_hash_rpc
	block_hash=$(echo $block_hash_rpc | jq -r .result)
	echo Head = $block_hash
	block_id_hex=$(do_rpc chain_getHeader "\"$block_hash\"" | jq -r .result.number)
	block_id=$((${block_id_hex}))
	echo Id = $block_id
	if (( $block_id > 1 )); then
		return 0
	fi
	return 1
}

while ! is_started; do
	echo "Waiting for first block..."
	sleep 12
done
echo "Chain is running!"
