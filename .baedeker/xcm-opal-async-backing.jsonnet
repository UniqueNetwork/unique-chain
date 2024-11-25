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
			{
				genesis+: {
					runtimeGenesis+: {
						runtime+: {
							configuration+: {
								config+: {
									async_backing_params+: {
										allowed_ancestry_len: 3,
										max_candidate_depth: 4,
									},
									scheduling_lookahead:5,
									max_validators_per_core:1,
									minimum_backing_votes:1,
									needed_approvals:1,
									on_demand_cores:5,
								},
							},
						},
					},
				},
			},
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
    			'--pool-type=fork-aware'
			],
		},
		for name in ['alice', 'bob', 'charlie', 'dave', 'eve']
	},
};

relay + {
	parachains: {
		[para.name]: para,
		for para in [unique]
	},
}
