#!/usr/bin/env bash

# 2001 - cat file | cmd is fancier than cmd < file in most cases
# 2002 - bash replacement patterns are awful
# shellcheck disable=SC2001,SC2002
set -eux

DIR=$(realpath "$(dirname "$0")")
TEMPLATE=$DIR/types_template
GIT_REPO=git@github.com:UniqueNetwork/unique-types-js.git

. "$DIR/functions.sh"

usage() {
	echo "Usage: [RPC_URL=http://localhost:9944] $0 <--rc|--release> [--force] [--push] [--rpc-url=http://localhost:9944]" 1>&2
	exit 1
}

rc=
release=
force=
push=

for i in "$@"; do
case $i in
	--rc)
		rc=1
		if test "$release"; then usage; fi
		;;
	--release)
		release=1
		if test "$rc"; then usage; fi
		;;
	--force)
		force=1
		;;
	--push)
		push=1
		;;
	--rpc-url=*)
		RPC_URL=${i#*=}
		;;
	*)
		usage
		;;
esac
done

if test \( ! \( "$rc" -o "$release" \) \) -o \( "${RPC_URL=}" = "" \); then
	usage
elif test "$rc"; then
	echo "Rc build"
else
	echo "Release build"
fi

cd "$DIR/../../"
yarn polkadot-types

version=$(do_rpc state_getRuntimeVersion "")
spec_version=$(echo "$version" | jq -r .result.specVersion)
spec_name=$(echo "$version" | jq -r .result.specName)
echo "Spec version: $spec_version, name: $spec_name"

case $spec_name in
	opal)
		package_name=@unique-nft/opal-testnet-types
		repo_branch=opal-testnet
		repo_tag=$repo_branch
		;;
	sapphire)
		package_name=@unique-nft/sapphire-mainnet-types
		repo_branch=sapphire-mainnet
		repo_tag=$repo_branch
		;;
	quartz)
		package_name=@unique-nft/quartz-mainnet-types
		repo_branch=quartz-mainnet
		repo_tag=$repo_branch
		;;
	unique)
		package_name=@unique-nft/unique-mainnet-types
		repo_branch=master
		repo_tag=unique-mainnet
		;;
	*)
		echo "unknown spec name: $spec_name"
		exit 1
		;;
esac

if test "$rc" = 1; then
	if test "$spec_name" != "opal"; then
		echo "rc types can only be based on opal spec"
		exit 1
	fi
	package_name=@unique-nft/rc-types
	repo_branch=rc
	repo_tag=$repo_branch
fi

package_version=${spec_version:0:4}.$(echo "${spec_version:4:4}" | sed 's/^0*//').
last_patch=NEVER
for tag in $(git ls-remote -t --refs $GIT_REPO | cut -f 2 | sort -r); do
	tag_prefix=refs/tags/$repo_tag-v$package_version
	if [[ $tag == $tag_prefix* ]]; then
		last_patch=${tag#"$tag_prefix"}
		break;
	fi
done
echo "Package version: ${package_version}X, name: $package_name"
echo "Last published: $package_version$last_patch"

if test "$last_patch" = "NEVER"; then
	new_package_version=${package_version}0
else
	new_package_version=${package_version}$((last_patch+1))
fi
package_version=${package_version}$last_patch
echo "New package version: $new_package_version"

pjsapi_ver=^$(cat "$DIR/../../package.json" | jq -r '.dependencies."@polkadot/api"' | sed -e "s/^\^//")
tsnode_ver=^$(cat "$DIR/../../package.json" | jq -r '.devDependencies."ts-node"' | sed -e "s/^\^//")
ts_ver=^$(cat "$DIR/../../package.json" | jq -r '.devDependencies."typescript"' | sed -e "s/^\^//")

gen=$(mktemp -d)
pushd "$gen"
git clone $GIT_REPO -b $repo_branch --depth 1 .
if test "$last_patch" != "NEVER"; then
	git reset --hard "$repo_tag-v$package_version"
fi
git rm -r "*"
popd

# Using old package_version here, becaue we first check if
# there is any difference between generated and already uplaoded types
cat "$TEMPLATE/package.json" \
| jq '.private = false' - \
| jq ".name = \"$package_name\"" - \
| jq ".version = \"$package_version\"" - \
| jq ".peerDependencies.\"@polkadot/api\" = \"$pjsapi_ver\"" - \
| jq ".peerDependencies.\"@polkadot/types\" = \"$pjsapi_ver\"" - \
| jq ".devDependencies.\"@polkadot/api\" = \"$pjsapi_ver\"" - \
| jq ".devDependencies.\"@polkadot/types\" = \"$pjsapi_ver\"" - \
| jq ".devDependencies.\"ts-node\" = \"$tsnode_ver\"" - \
| jq ".devDependencies.\"typescript\" = \"$ts_ver\"" - \
> "$gen/package.json"
for file in .gitignore .npmignore README.md tsconfig.json; do
	cp "$TEMPLATE/$file" "$gen/"
done
package_name_replacement=$(printf '%s\n' "$package_name" | sed -e 's/[\/&]/\\&/g')
sed -i "s/PKGNAME/$package_name_replacement/" "$gen/README.md"

rsync -ar --exclude .gitignore types/ "$gen"
for file in "$gen"/augment-* "$gen"/**/types.ts; do
	sed -i '1s;^;//@ts-nocheck\n;' "$file"
done

pushd "$gen"
git add .
popd

pushd "$gen"
if git diff --quiet HEAD && test ! "$force"; then
	echo "no changes detected"
	exit 0
fi
popd

mv "$gen/package.json" "$gen/package.old.json"
cat "$gen/package.old.json" \
| jq ".version = \"$new_package_version\"" - \
> "$gen/package.json"
rm "$gen/package.old.json"
pushd "$gen"
git add package.json
popd

echo "package.json contents:"
cat "$gen/package.json"
echo "overall diff:"
pushd "$gen"
git status
git diff HEAD || true
popd

# This check is only active if running in interactive terminal
if [ -t 0 ]; then
	read -p "Is everything ok at $gen [y/n]? " -n 1 -r
	echo
	if [[ ! $REPLY =~ ^[Yy]$ ]]; then
		echo "Aborting!"
		exit 1
	fi
fi

pushd "$gen"
yarn
yarn prepublish
git commit -m "chore: upgrade types to v$new_package_version"
git tag --force "$repo_tag-v$new_package_version"
if test "$push" = 1; then
	git push --tags --force -u origin HEAD
else
	echo "--push not given, origin repo left intact"
	echo "To publish manually, go to $gen, and run \"git push --tags --force -u origin HEAD\""
fi
popd
