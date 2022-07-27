#!/usr/bin/env bash

CONT_ID="node-o"
TEMPLATE_STR='Imported #1'


function is_started {
  OUTPUT=$(docker logs $CONT_ID 2>&1 | grep -i "$TEMPLATE_STR")

  if [[ -z ${OUTPUT} ]];
  then
    echo "variable OUTPUT is not set"
    return 1
  else
    echo "variable named OUTPUT is already set"
    echo "Container ID: $CONT_ID"
    echo "Template for lookup: $TEMPLATE_STR"
    return 0
  fi
    echo "not match"
    return 1

}

while ! is_started;
do
  echo "Waiting for first block..."
  sleep 12
done

echo "Chain is running!"
exit 0
