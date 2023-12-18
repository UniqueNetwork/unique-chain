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
      'bin/polkadot': { dockerImage: 'uniquenetwork/builder-polkadot:%s' % dotenv.POLKADOT_MAINNET_BRANCH },
      'bin/acala': { dockerImage: 'uniquenetwork/builder-acala:%s' % dotenv.ACALA_BUILD_BRANCH },
      'bin/moonbeam': { dockerImage: 'uniquenetwork/builder-moonbeam:%s' % dotenv.MOONBEAM_BUILD_BRANCH },
      'bin/cumulus': { dockerImage: 'uniquenetwork/builder-cumulus:%s' % dotenv.STATEMINE_BUILD_BRANCH },
      'bin/astar': { dockerImage: 'uniquenetwork/builder-astar:%s' % dotenv.ASTAR_BUILD_BRANCH },
      'bin/polkadex': { dockerImage: 'uniquenetwork/builder-polkadex:%s' % dotenv.POLKADEX_BUILD_BRANCH },
      'bin/hydradx': { dockerImage: 'uniquenetwork/builder-hydraDx:%s' % dotenv.HYDRADX_BUILD_BRANCH },
    },
    extra_node_mixin={
      extraArgs: [
        '-lxcm=trace',
      ],
    },
  )(prev)
