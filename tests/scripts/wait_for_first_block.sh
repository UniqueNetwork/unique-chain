#!/usr/bin/env bash

DIR=$(dirname "$0")

. $DIR/functions.sh

function is_started {
	block_id_hex=$(do_rpc chain_getHeader | jq -r .result.number)
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
echo "Chain is running, but lets wait for another block after a minute, to avoid startup flakiness."
sleep 120
while ! is_started; do
	echo "Waiting for second block..."
	sleep 12
done
echo "Chain is running!"
