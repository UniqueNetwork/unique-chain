local dotenv = {
  [std.splitLimit(line, '=', 2)[0]]: std.splitLimit(line, '=', 2)[1]
  for line in std.split(importstr '../.env', '\n')
  if line != ''
  if std.member(line, '=')
};

function(prev, repoDir)
  (import 'baedeker-library/ops/rewrites.libsonnet').rewriteNodePaths(
    {
      'bin/unique': '%s/target/release/unique-collator' % repoDir,
      'bin/polkadot': { dockerImage: 'parity/polkadot:%s' % dotenv.POLKADOT_MAINNET_BRANCH },
      'bin/acala': { dockerImage: 'acala/acala-node:%s' % dotenv.ACALA_BUILD_BRANCH },
      'bin/moonbeam': { dockerImage: 'moonbeamfoundation/moonbeam:%s' % dotenv.MOONBEAM_BUILD_BRANCH },
      'bin/assethub': { dockerImage: 'parity/polkadot-parachain:%s' % dotenv.ASSET_HUB_POLKADOT_BUILD_BRANCH },
      'bin/astar': { dockerImage: 'staketechnologies/astar-collator:%s' % dotenv.ASTAR_BUILD_BRANCH },
      'bin/polkadex': { dockerImage: 'polkadex/mainnet:%s' % dotenv.POLKADEX_BUILD_BRANCH },
      'bin/hydradx': { dockerImage: 'galacticcouncil/hydra-dx:%s' % dotenv.HYDRADX_BUILD_BRANCH },
    },
    extra_node_mixin={
      extraArgs+: [
        '-lxcm=trace',
      ],
    },
  )(prev)
