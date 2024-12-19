local
m = import 'baedeker-library/mixin/spec.libsonnet',
;

function(relay_spec)

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
		for name in ['alice', 'bob', 'charlie', 'dave', 'eve']
	},
};

local unique = {
	name: 'unique',
	bin: 'bin/unique',
	paraId: 1001,
	spec: {Genesis:{
		modify:: bdk.mixer([
			m.genericPara($),
		    m.simplifyGenesisName(),
		    {
			    _code: cql.toHex(importbin '../runtime.compact.compressed.wasm'),
		    },
		    m.unsimplifyGenesisName(),
		]),
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
		for name in ['alpha', 'beta', 'gamma', 'delta']
	},
};

relay + {
	parachains: {
		[para.name]: para,
		for para in [unique]
	},
}
