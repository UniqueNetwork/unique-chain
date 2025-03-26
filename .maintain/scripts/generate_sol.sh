#!/bin/sh
set -eu

PRETTIER_CONFIG="$(pwd)""/.prettierrc"

tmp=$(mktemp)
cargo test --package="$PACKAGE" --features=stubgen -- "$NAME" --exact --nocapture --ignored | tee "$tmp"
raw=$(mktemp --suffix .sol)
sed -n '/=== SNIP START ===/, /=== SNIP END ===/{ /=== SNIP START ===/! { /=== SNIP END ===/! p } }' "$tmp" > "$raw"

formatted=$(mktemp)
prettier --config "$PRETTIER_CONFIG" "$raw" > "$formatted"

sed -i -E -e "s/\s*\/\/ FORMATTING: FORCE NEWLINE//g" "$formatted"

mv "$formatted" "$OUTPUT"
