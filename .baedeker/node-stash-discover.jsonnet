local {flattenNodes, flattenChains, ...} = import 'baedeker-library/util/mixin.libsonnet';

function(prev, final)
prev + {
	_output+:: {
		dockerComposeDiscover+: std.join('\n', [
			'%s_STASH=%s' % [std.strReplace(std.asciiUpper(node.hostname), '-', '_'), node.wallets.stash]
			for chain in flattenChains(prev)
			if 'paraId' in chain
			for node in flattenNodes(chain)
		] + ['']),
	},
}
