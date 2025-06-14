#!/usr/bin/env bash

DIR=$(dirname "$0")

. "$DIR/generate_types/functions.sh"

last_block_id=0
block_id=0
counter=0
function get_block {
    chain_header=$(do_rpc chain_getHeader)
    block_id_hex=$(echo $chain_header | jq -r .result.number)
    if [ $? -ne 0 ]; then
        echo "Bad chain_getHeader response: " $chain_header
    fi
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

while ! had_new_block ; do
    echo "Waiting for another block..."
    counter=$((counter+1))
    echo "counter="$counter
    sleep 6
    if [ $counter -gt 700 ]; then
        exit 1;
    fi
done

reset_check

echo "Chain is running, but lets wait for another block after a minute, to avoid startup flakiness."
sleep 60

while ! had_new_block ; do
    echo "Waiting for another block..."
    counter=$((counter+1))
    echo "counter="$counter
    sleep 6
    if [ $counter -gt 400 ]; then
        exit 1;
    fi
done


echo "Chain is running!"
