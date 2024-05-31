#!/usr/bin/env bash

DIR=$(dirname "$0")

. "$DIR/functions.sh"

last_block_id=0
block_id=0
counter=0
function get_block {
    block_id_hex=$(do_rpc chain_getHeader | jq -r .result.number)
    block_id=$((block_id_hex))
    echo Id = $block_id
}

function had_new_block {
    last_block_id=$block_id
    get_block
    if (( last_block_id != 0 && block_id > last_block_id )); then
        return 0
    fi
    return 1
}

function reset_check {
    last_block_id=0
    block_id=0
    counter=0
}

while [ ! had_new_block ] && [ $counter -lt 100 ]; do
    echo "Waiting for next block..."
    counter=$((counter+1))
    sleep 12
done

reset_check

echo "Chain is running, but lets wait for another block after a minute, to avoid startup flakiness."
sleep 60

while ! had_new_block; do
    echo "Waiting for another block..."
    sleep 12
done

echo "Chain is running!"
