local
m = import 'baedeker-library/mixin/spec.libsonnet',
rm = import 'baedeker-library/mixin/raw-spec.libsonnet',
;

function(relay_spec, forked_spec, dump_spec, token_symbol)

local relay = {
	name: 'relay',
	bin: 'bin/polkadot',
	validatorIdAssignment: 'staking',
	spec: {Genesis:{
		chain: relay_spec,
		modify:: bdk.mixer([
			m.genericRelay($),
			m.simplifyGenesisName(),
			{
				_genesis+: {
					configuration+: {
						config+: {
							async_backing_params+: {
								allowed_ancestry_len: 3,
								max_candidate_depth: 4,
							},
							validation_upgrade_cooldown: 200,
							validation_upgrade_delay: 100,
							minimum_validation_upgrade_delay: 15,
							minimum_backing_votes: 2,
							needed_approvals: 2,
							scheduler_params+: {
								lookahead: 3,
							},
						},
					},
				},
			},
			m.unsimplifyGenesisName(),
		]),
	}},
	nodes: {
		[name]: {
			bin: $.bin,
			wantedKeys: 'relay',
			expectedDataPath: '/parity',
		},
		for name in ['alice', 'bob', 'charlie', 'dave', 'eve', 'ferdie']
	},
};

local unique = {
	name: 'unique',
	bin: 'bin/unique',
	paraId: 1001,
	spec: {Raw:{
		local modifyRaw = bdk.mixer([
			rm.resetNetworking($),
			rm.decodeSpec(),
			rm.polkaLaunchPara($),
			{
				properties: {
					tokenDecimals: 18,
					tokenSymbol: token_symbol,
				},
			},
			rm.reencodeSpec(),
		]),
		raw_spec: modifyRaw({
			name: "Unused",
			id: "%s_local" % forked_spec,
			bootNodes: error "override me",
			chainType: error "override me",
			telemetryEndpoints: error "override me",
			codeSubstitutes: error "override me",
			para_id: error "override me",
			relay_chain: "unused",
			genesis: {
				raw: {
					top: dump_spec,
					childrenDefault: {},
				},
			},
		}),
	}},
	nodes: {
		[name]: {
			bin: $.bin,
			wantedKeys: 'para',
			extraArgs: [
				'--increase-future-pool',
				'--pool-type=fork-aware',
			],
		},
		for name in ['alice', 'bob', 'charlie']
	},
};

relay + {
	parachains: {
		[para.name]: para,
		for para in [unique]
	},
}
