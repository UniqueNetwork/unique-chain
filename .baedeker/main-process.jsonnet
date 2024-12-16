local
m = import 'baedeker-library/mixin/spec.libsonnet',
rm = import 'baedeker-library/mixin/raw-spec.libsonnet',
;

function(relay_spec, forked_spec, dump_spec)

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
                                    validation_upgrade_cooldown: 400,
                                    validation_upgrade_delay: 200,
                                    minimum_validation_upgrade_delay: 15,
                                    minimum_backing_votes: 2,
                                    needed_approvals: 2,
                                    scheduler_params+: {
                                      lookahead: 1,
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
					top: import "dump.json",
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
				'-laura=debug',
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
