#!/bin/sh
set -eu

tmp=$(mktemp)
cargo test --package $PACKAGE -- $NAME --exact --nocapture --ignored | tee $tmp
raw=$(mktemp --suffix .sol)
sed -n '/=== SNIP START ===/, /=== SNIP END ===/{ /=== SNIP START ===/! { /=== SNIP END ===/! p } }' $tmp > $raw
formatted=$(mktemp)
prettier --use-tabs $raw > $formatted
solhint --fix $formatted

mv $formatted $OUTPUT
